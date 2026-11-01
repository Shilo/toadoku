/// <reference lib="webworker" />
import { computeHint } from '../hints/index.ts';
import type { HintInput } from '../hints/index.ts';
self.onmessage = (event: MessageEvent<{ id: string; input: HintInput }>) => {
  const { id, input } = event.data;
  self.postMessage({ id, result: computeHint(input, { nodeBudget: 1_000_000 }) });
};
