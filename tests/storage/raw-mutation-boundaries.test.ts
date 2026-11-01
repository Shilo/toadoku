import { expect, it } from 'vitest';
import { encodeRawRecovery, escapedStringBytes } from '../../src/lib/storage/raw-recovery-codec';
import { inspectRecovery } from './recovery-reader';

const utf8 = new TextEncoder();
const decoded = async (value: unknown, limits = {}) => inspectRecovery(new TextDecoder().decode((await encodeRawRecovery(value, limits)).bytes));

it('counts Unicode encoding thresholds and surrogate endpoints independently', () => {
  const cases = ['\u001f', ' ', '\u007f', '\u0080', '\u07ff', '\u0800', '\ud7ff', '\ud800', '\udbff', '\udc00', '\udfff', '\ue000',
    '\ud800\udc00', '\udbff\udfff', '\ud800\ue000', '\udc00\udc00', '\ud800\udbff'];
  for (const value of cases) expect(escapedStringBytes(value)).toBe(utf8.encode(JSON.stringify(value)).length);
  // Equality at a partial prefix must not conceal a subsequent over-budget byte.
  expect(escapedStringBytes('ab', 3)).toBeGreaterThan(3);
});

it('allows inclusive string and visit limits and rejects the next value', async () => {
  expect(await decoded('frog', { string: 4 })).toBe('frog');
  await expect(encodeRawRecovery('frogs', { string: 4 })).rejects.toMatchObject({ issue: { kind: 'unavailable', reason: 'abort' } });
  const root = { child: 1 }, exact = await encodeRawRecovery(root);
  expect(exact.visits).toBe(2);
  expect(await decoded(root, { nodes: exact.visits })).toEqual(root);
  await expect(encodeRawRecovery(root, { nodes: exact.visits - 1 })).rejects.toMatchObject({ issue: { kind: 'unavailable', reason: 'abort' } });
  await expect(encodeRawRecovery(() => 1)).rejects.toMatchObject({ issue: { kind: 'unsupported-future' } });
  const callable = () => 1;
  Object.setPrototypeOf(callable, Object.prototype);
  expect(typeof callable).toBe('function');
  await expect(encodeRawRecovery(callable)).rejects.toMatchObject({ issue: { kind: 'unsupported-future' } });
});

it('bounds each first-discovered container child without rejecting the inclusive depth', async () => {
  const lastIndex = /frog/g; lastIndex.lastIndex = {} as number;
  const cases: unknown[] = [new Map([[{}, 1]]), new Map([[1, {}]]), new Set([{}]), lastIndex, new Uint8Array(1)];
  for (const value of cases) {
    await expect(encodeRawRecovery(value, { depth: 0 })).rejects.toMatchObject({ issue: { kind: 'unavailable', reason: 'abort' } });
    await expect(encodeRawRecovery(value, { depth: 1 })).resolves.toHaveProperty('bytes');
  }
});

it('preflights Blob bytes before the intrinsic read and preserves legal binary boundaries', async () => {
  const blob = new Blob([new Uint8Array([1, 2, 3, 4])]);
  const complete = await encodeRawRecovery(blob), source = new TextDecoder().decode(complete.bytes);
  const prefix = source.slice(0, source.indexOf('"base64":') + '"base64":'.length);
  const budget = utf8.encode(prefix).length + Math.ceil(blob.size / 3) * 4 + 2 - 1;
  expect(budget).toBeGreaterThan(utf8.encode(prefix).length);
  const original = Blob.prototype.arrayBuffer;
  let reads = 0;
  Blob.prototype.arrayBuffer = function () { reads++; return original.call(this); };
  try {
    await expect(encodeRawRecovery(blob, { bytes: budget })).rejects.toMatchObject({ issue: { kind: 'unavailable', reason: 'abort' } });
    expect(reads).toBe(0);
    const valid = await encodeRawRecovery(blob, { bytes: complete.bytes.length });
    expect(valid.bytes).toEqual(complete.bytes);
    expect(reads).toBe(1); // Proves this spy observes the intrinsic actually used by the codec.
  } finally { Blob.prototype.arrayBuffer = original; }
  for (const length of [0, 1, 2, 3]) {
    const bytes = Uint8Array.from({ length }, (_, i) => 255 - i);
    const artifact = await encodeRawRecovery(bytes.buffer);
    const restored = inspectRecovery(new TextDecoder().decode(artifact.bytes));
    expect(new Uint8Array(restored)).toEqual(bytes);
    await expect(encodeRawRecovery(bytes.buffer, { bytes: artifact.bytes.length })).resolves.toMatchObject({ bytes: artifact.bytes });
  }
});

it('preflights ArrayBuffer output before base64 encoding rather than failing after allocation', async () => {
  const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
  const complete = await encodeRawRecovery(buffer), source = new TextDecoder().decode(complete.bytes);
  const prefix = source.slice(0, source.indexOf('"base64":') + '"base64":'.length);
  const prefixBytes = utf8.encode(prefix).length, budget = prefixBytes + Math.ceil(buffer.byteLength / 3) * 4 + 1;
  expect(budget).toBeGreaterThan(prefixBytes);
  const original = globalThis.btoa;
  let calls = 0;
  globalThis.btoa = value => { calls++; return original(value); };
  try {
    await expect(encodeRawRecovery(buffer, { bytes: budget })).rejects.toMatchObject({ issue: { kind: 'unavailable', reason: 'abort' } });
    expect(calls).toBe(0);
    expect((await encodeRawRecovery(buffer, { bytes: complete.bytes.length })).bytes).toEqual(complete.bytes);
    expect(calls).toBe(1);
  } finally { globalThis.btoa = original; }
});

it('preflights escaped string allocation after the header and raw-length checks', async () => {
  const value = '\0'.repeat(32), complete = await encodeRawRecovery(value);
  const source = new TextDecoder().decode(complete.bytes);
  const prefix = source.slice(0, source.indexOf('"root":') + '"root":'.length);
  const remaining = value.length + 4, budget = utf8.encode(prefix).length + remaining;
  expect(value.length).toBeLessThan(remaining);
  expect(utf8.encode(JSON.stringify(value)).length).toBeGreaterThan(remaining);
  const original = JSON.stringify;
  let calls = 0;
  JSON.stringify = ((...args: Parameters<typeof JSON.stringify>) => {
    if (args[0] === value) calls++;
    return Reflect.apply(original, JSON, args);
  }) as typeof JSON.stringify;
  try {
    await expect(encodeRawRecovery(value, { bytes: budget })).rejects.toMatchObject({ issue: { kind: 'unavailable', reason: 'abort' } });
    expect(calls).toBe(0);
    expect((await encodeRawRecovery(value, { bytes: complete.bytes.length })).bytes).toEqual(complete.bytes);
    expect(calls).toBe(1);
  } finally { JSON.stringify = original; }
});

it('rejects oversized BigInt before decimal formatting while observing a valid formatting call', async () => {
  const original = BigInt.prototype.toString;
  let calls = 0;
  BigInt.prototype.toString = function (radix?: number) { calls++; return original.call(this, radix); };
  try {
    for (const value of [1n << 256n, -(1n << 256n)]) {
      await expect(encodeRawRecovery(value, { string: 8 })).rejects.toMatchObject({ issue: { kind: 'unavailable', reason: 'abort' } });
      expect(calls).toBe(0);
    }
    expect(await decoded(1n << 50n, { string: 16 })).toBe(1n << 50n);
    expect(calls).toBe(1);
  } finally { BigInt.prototype.toString = original; }
});

it('records undefined scalar tags and DOMException metadata explicitly', async () => {
  const undefinedArtifact = JSON.parse(new TextDecoder().decode((await encodeRawRecovery(undefined)).bytes));
  expect(undefinedArtifact.root).toEqual({ special: 'undefined' });
  const input = new DOMException('denied', 'SecurityError');
  const artifact = JSON.parse(new TextDecoder().decode((await encodeRawRecovery(input)).bytes));
  expect(artifact.nodes[0]).toMatchObject({ type: 'dom-exception', name: input.name, message: input.message, code: input.code });
  expect(Object.hasOwn(artifact.nodes[0], 'code')).toBe(true);
});

it('handles absent optional native constructors without a ReferenceError', async () => {
  for (const name of ['DOMException', 'Blob'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Reflect.deleteProperty(globalThis, name);
    try {
      expect(await decoded({ valid: true })).toEqual({ valid: true });
      expect((await decoded(new TypeError('retained'))).message).toBe('retained');
      await expect(encodeRawRecovery(new (class Unsupported {})())).rejects.toMatchObject({ issue: { kind: 'unsupported-future' } });
    } finally { if (descriptor) Object.defineProperty(globalThis, name, descriptor); }
  }
});

it('bounds FileList child discovery in the pure algorithm shim, separately from native browser proof', async () => {
  class FileListShim {
    constructor(private readonly files: File[]) {}
    get length() { return this.files.length; }
    item(index: number) { return this.files[index] ?? null; }
  }
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'FileList');
  Object.defineProperty(globalThis, 'FileList', { value: FileListShim, configurable: true });
  try {
    const files = new FileListShim([new File(['frog'], 'frog.txt')]);
    await expect(encodeRawRecovery(files, { depth: 0 })).rejects.toMatchObject({ issue: { kind: 'unavailable', reason: 'abort' } });
    expect((await decoded(files, { depth: 1 }))[0].name).toBe('frog.txt');
  } finally { if (descriptor) Object.defineProperty(globalThis, 'FileList', descriptor); else Reflect.deleteProperty(globalThis, 'FileList'); }
});
