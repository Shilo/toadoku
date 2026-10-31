import { StorageFailure } from './transaction';

export interface JsonLimits {
  bytes: number;
  depth: number;
  nodes: number;
  array: number;
  string: number;
  keys: number;
}

// Large enough for the required full issued history and 10,000 compact receipts.
export const BACKUP_LIMITS: Readonly<JsonLimits> = Object.freeze({
  bytes: 128 * 1024 * 1024, depth: 32, nodes: 5_000_000,
  array: 200_000, string: 1024 * 1024, keys: 128,
});

/** Structural limit checking is separate from the game's semantic backup decoder. */
export function parseBoundedJson(text: string, limits: Readonly<JsonLimits> = BACKUP_LIMITS): unknown {
  const fail = (reason: string): never => { throw new StorageFailure({ kind: 'corrupt', reason: `backup-${reason}` }); };
  // The cheap code-unit bound rejects oversized ASCII before allocating UTF-8 bytes.
  if (text.length > limits.bytes || new TextEncoder().encode(text).byteLength > limits.bytes) fail('bytes');
  let value: unknown;
  try { value = JSON.parse(text); } catch { return fail('json'); }
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  while (pending.length) {
    const next = pending.pop()!;
    if (++nodes > limits.nodes || next.depth > limits.depth) fail('complexity');
    const item = next.value;
    if (typeof item === 'string') {
      if (item.length > limits.string) fail('string');
    } else if (typeof item === 'number') {
      if (!Number.isFinite(item)) fail('number');
    } else if (Array.isArray(item)) {
      if (item.length > limits.array) fail('array');
      for (const child of item) pending.push({ value: child, depth: next.depth + 1 });
    } else if (item !== null && typeof item === 'object') {
      const keys = Object.keys(item);
      if (keys.length > limits.keys) fail('keys');
      for (const key of keys) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) fail('prototype-key');
        if (key.length > limits.string) fail('string');
        pending.push({ value: (item as Record<string, unknown>)[key], depth: next.depth + 1 });
      }
    }
  }
  return value;
}
