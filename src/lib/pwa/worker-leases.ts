import { validateShellState } from './worker-compat';
import type { ShellState } from './worker-compat';

/** Only disposable compatibility-store failures permit ordinary network degradation. */
export class ShellMetadataError extends Error {
  constructor(readonly kind: 'missing' | 'invalid' | 'unavailable', message: string) { super(message); this.name = 'ShellMetadataError'; }
}
function unavailable(problem: unknown): ShellMetadataError {
  return problem instanceof ShellMetadataError ? problem : new ShellMetadataError('unavailable', 'Application file metadata is unavailable');
}

/** One small record makes pins and deletion gates atomic across old/new worker globals. */
export function shellMetadata(scope: string, prefix: string) {
  const name = `toadoku:pwa:compat:2:${encodeURIComponent(new URL(scope).pathname)}`;
  let opening: Promise<IDBDatabase> | undefined;
  function open(): Promise<IDBDatabase> {
    opening ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      let abandoned = false;
      const fail = (problem: unknown) => { abandoned = true; clearTimeout(timer); reject(problem); };
      const timer = setTimeout(() => fail(new Error('Shell metadata open timed out')), 10_000);
      request.onupgradeneeded = () => request.result.createObjectStore('state');
      request.onsuccess = () => {
        clearTimeout(timer);
        if (abandoned) { request.result.close(); return; }
        request.result.onversionchange = () => { request.result.close(); opening = undefined; };
        resolve(request.result);
      };
      request.onerror = () => fail(request.error);
      request.onblocked = () => fail(new Error('Shell metadata is blocked'));
    }).catch(error => { opening = undefined; throw unavailable(error); });
    return opening;
  }
  async function transact<T>(mutate: (state: ShellState) => T, write = true, replacement?: ShellState, replaceEmpty = false): Promise<T> {
    const database = await open();
    return new Promise<T>((resolve, reject) => {
      let transaction: IDBTransaction;
      try { transaction = database.transaction('state', write ? 'readwrite' : 'readonly'); }
      catch (error) { reject(unavailable(error)); return; }
      const store = transaction.objectStore('state');
      const request = store.get('compatibility');
      let result: T, problem: unknown;
      request.onsuccess = () => {
        try {
          let state: ShellState;
          try {
            if (request.result === undefined) throw new ShellMetadataError('missing', 'Application file metadata is missing');
            try { state = validateShellState(request.result, prefix); }
            catch { throw new ShellMetadataError('invalid', 'Application file metadata is damaged'); }
            if (replacement && replaceEmpty && !Object.keys(state.snapshots).length && !Object.keys(state.leases).length && !Object.keys(state.overflow).length) state = validateShellState(replacement, prefix);
          } catch (error) {
            if (!replacement) throw error;
            state = validateShellState(replacement, prefix);
            // Keep one bounded diagnostic. Never copy an unbounded corrupt value or touch saves.
            if (request.result !== undefined) store.put({ at: Date.now(), reason: 'damaged-compatibility-metadata' }, 'quarantine');
          }
          result = mutate(state);
          if (write) store.put(validateShellState(state, prefix), 'compatibility');
        } catch (error) { problem = error instanceof DOMException ? unavailable(error) : error; transaction.abort(); }
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(problem ?? unavailable(transaction.error));
      transaction.onerror = () => { /* Abort supplies the final failure. */ };
    });
  }
  return { transact, read: () => transact(state => state, false), recover: (replacement: ShellState, replaceEmpty = false) => transact(() => undefined, true, replacement, replaceEmpty) };
}
