import type { HintInput, HintResult } from '../hints/index.ts';

/** One bounded worker per request. Cancellation never publishes an informative payload. */
export function createHintComputer() {
  let cancel: (() => void) | undefined;
  return {
    cancel() { cancel?.(); },
    compute(input: HintInput): Promise<HintResult> {
      cancel?.();
      return new Promise(resolve => {
        const worker = new Worker(new URL('./hint.worker.ts', import.meta.url), { type: 'module' });
        const id = crypto.randomUUID();
        let done = false;
        const finish = (result: HintResult) => {
          if (done) return; done = true; worker.terminate();
          if (cancel === abort) cancel = undefined;
          resolve(result);
        };
        const abort = () => finish({ kind: 'unavailable', reason: 'aborted' });
        cancel = abort;
        worker.onmessage = event => { if (event.data.id === id) finish(event.data.result); };
        worker.onerror = () => finish({ kind: 'unavailable', reason: 'invalid' });
        worker.postMessage({ id, input });
      });
    },
  };
}
