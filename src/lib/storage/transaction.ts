import type { StorageResult } from '../gameplay/contracts';
export type { StorageResult } from '../gameplay/contracts';
type StorageIssue = Exclude<StorageResult<never>, { kind: 'committed' }>;

export class StorageFailure extends Error {
  readonly issue: StorageIssue;
  constructor(issue: StorageIssue, options?: ErrorOptions) {
    super(issue.reason, options);
    this.name = 'StorageFailure';
    this.issue = issue;
  }
}

export function storageFailure(error: unknown): StorageFailure {
  if (error instanceof StorageFailure) return error;
  const name = error instanceof Error ? error.name : 'UnknownError';
  const reason = name === 'QuotaExceededError' ? 'quota'
    : ['SecurityError', 'NotAllowedError'].includes(name) ? 'denied'
    : ['InvalidStateError', 'TransactionInactiveError'].includes(name) ? 'closed' : 'abort';
  return new StorageFailure({ kind: 'unavailable', reason, detail: name }, { cause: error });
}

export interface TransactionContext<T> {
  store(name: string): IDBObjectStore;
  request<V>(request: IDBRequest<V>, accept: (value: V) => void): void;
  result(value: T): void;
  abort(reason: StorageFailure): void;
}

/** A result is delivered only by `complete`, including after a request's success. */
export function transact<T>(
  database: IDBDatabase,
  stores: readonly string[],
  mode: IDBTransactionMode,
  queue: (context: TransactionContext<T>) => void,
  strict = false,
): Promise<StorageResult<T>> {
  return new Promise(resolve => {
    let transaction: IDBTransaction;
    try {
      try {
        transaction = strict && mode === 'readwrite'
          ? database.transaction([...stores], mode, { durability: 'strict' })
          : database.transaction([...stores], mode);
      } catch (error) {
        // Older implementations may reject the standard options overload.
        if (!(strict && mode === 'readwrite' && error instanceof TypeError)) throw error;
        transaction = database.transaction([...stores], mode);
      }
    } catch (error) {
      const failure = storageFailure(error);
      resolve(failure.issue);
      return;
    }
    let failure: StorageFailure | undefined;
    let hasResult = false;
    let value: T;
    const abort = (reason: StorageFailure) => {
      failure ??= reason;
      try { transaction.abort(); } catch { /* It may already have aborted. */ }
    };
    transaction.onabort = () => {
      const reason = failure ?? storageFailure(transaction.error ?? new DOMException('Aborted', 'AbortError'));
      resolve(reason.issue);
    };
    transaction.onerror = () => {
      failure ??= storageFailure(transaction.error ?? new DOMException('Request failed', 'UnknownError'));
    };
    transaction.oncomplete = () => {
      if (failure) resolve(failure.issue);
      else if (!hasResult) resolve({ kind: 'corrupt', reason: 'missing-transaction-result' });
      else resolve({ kind: 'committed', value });
    };
    const context: TransactionContext<T> = {
      store: name => transaction.objectStore(name),
      request(request, accept) {
        request.onerror = () => { failure ??= storageFailure(request.error); };
        request.onsuccess = () => {
          if (failure) return;
          try { accept(request.result); } catch (error) { abort(storageFailure(error)); }
        };
      },
      result(result) {
        if (hasResult) throw new StorageFailure({ kind: 'corrupt', reason: 'duplicate-transaction-result' });
        value = result; hasResult = true;
      },
      abort,
    };
    try { queue(context); } catch (error) { abort(storageFailure(error)); }
  });
}
