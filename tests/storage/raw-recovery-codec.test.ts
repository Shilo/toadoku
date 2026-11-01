import { expect, it } from 'vitest';
import { encodeRawRecovery, escapedStringBytes, RECOVERY_LIMITS, recoveryLimits } from '../../src/lib/storage/raw-recovery-codec';
import { inspectRecovery } from './recovery-reader';

const text = async (value: unknown, limits = {}) => new TextDecoder().decode((await encodeRawRecovery(value, limits)).bytes);
it('preserves primitive distinctions, aliasing, cycles, tag-like user keys and sparse arrays', async () => {
  const shared = { special: 'NaN', ref: 2, bigint: 'fake', toJSON: 'data' };
  Object.defineProperty(shared, '__proto__', { value: 'literal', enumerable: true });
  const source: any = { undefined, number: NaN, positive: Infinity, negative: -Infinity, zero: -0, bigint: 2n ** 80n, smallBigint: -3n, null: null, true: true, shared, alias: shared, string: '\0\b\t\n\f\r"\\\ud800\udfff🐸é界' };
  source.self = source; source.array = new Array(1_000_000_000); source.array[999_999_999] = shared; source.array.extra = 'tail';
  const restored = inspectRecovery(await text(source));
  expect(restored).toMatchObject({ shared, alias: shared, null: null, true: true });
  expect(restored.self).toBe(restored); expect(restored.shared).toBe(restored.alias); expect(Object.hasOwn(restored, 'undefined')).toBe(true); expect(restored.undefined).toBeUndefined();
  expect(Number.isNaN(restored.number)).toBe(true); expect(restored.positive).toBe(Infinity); expect(restored.negative).toBe(-Infinity); expect(Object.is(restored.zero, -0)).toBe(true);
  expect(restored.bigint).toBe(2n ** 80n); expect(restored.smallBigint).toBe(-3n); expect(restored.string).toBe(source.string);
  expect(restored.array.length).toBe(1_000_000_000); expect(0 in restored.array).toBe(false); expect(restored.array[999_999_999]).toBe(restored.shared); expect(restored.array.extra).toBe('tail');
  expect(restored.shared.__proto__).toBe('literal'); expect(Object.getPrototypeOf(restored.shared)).toBe(Object.prototype);
});
it('preserves maps, sets, dates, regexps, errors and shared binary view boundaries', async () => {
  const buffer = new ArrayBuffer(16), key = { id: 'key' }, map = new Map<any, any>(), set = new Set<any>();
  new Uint8Array(buffer).set([1, 2, 3, 255]); map.set(key, set); map.set(map, key); set.add(set); set.add(map);
  const error = new TypeError('broken', { cause: key }); const regexp = /frog\s+/giy; regexp.lastIndex = 3;
  const source = { key, map, set, date: new Date(123), invalidDate: new Date(NaN), regexp, error, dom: new DOMException('denied', 'SecurityError'),
    buffer, uint: new Uint8Array(buffer, 1, 3), view: new DataView(buffer, 4, 8), boxed: [new Number(NaN), new Boolean(false), new String('frog'), Object(55n)], nullObject: Object.assign(Object.create(null), { x: 1 }) };
  const restored = inspectRecovery(await text(source));
  expect(restored.map.get(restored.key)).toBe(restored.set); expect(restored.map.get(restored.map)).toBe(restored.key); expect(restored.set.has(restored.set)).toBe(true); expect(restored.set.has(restored.map)).toBe(true);
  expect(restored.date.getTime()).toBe(123); expect(Number.isNaN(restored.invalidDate.getTime())).toBe(true); expect(restored.regexp.source).toBe(regexp.source); expect(restored.regexp.flags).toBe(regexp.flags); expect(restored.regexp.lastIndex).toBe(3);
  expect(restored.error.message).toBe(error.message); expect(restored.error.name).toBe('TypeError'); expect(restored.error.cause).toBe(restored.key); expect(restored.error.stack).toBe(error.stack); expect(restored.dom.name).toBe('SecurityError'); expect(restored.dom.code).toBe(source.dom.code);
  expect(restored.uint.buffer).toBe(restored.buffer); expect(restored.view.buffer).toBe(restored.buffer); expect(restored.uint.byteOffset).toBe(1); expect(restored.uint.length).toBe(3); expect(restored.view.byteOffset).toBe(4); expect(restored.view.byteLength).toBe(8); expect([...restored.uint]).toEqual([2, 3, 255]);
  expect(Number.isNaN(restored.boxed[0].valueOf())).toBe(true); expect(restored.boxed[1].valueOf()).toBe(false); expect(restored.boxed[2].valueOf()).toBe('frog'); expect(restored.boxed[3].valueOf()).toBe(55n); expect(Object.getPrototypeOf(restored.nullObject)).toBe(null);
});
it('preserves blob/file bytes and metadata including multiple base64 chunks', async () => {
  const data = Uint8Array.from({ length: 30_001 }, (_, index) => index % 256), blob = new Blob([data], { type: 'application/octet-stream' }), file = new File([data], 'frog.bin', { type: 'x/frog', lastModified: 1234 });
  const restored = inspectRecovery(await text({ blob, file }));
  expect(new Uint8Array(await restored.blob.arrayBuffer())).toEqual(data); expect(new Uint8Array(await restored.file.arrayBuffer())).toEqual(data); expect(restored.file.name).toBe('frog.bin'); expect(restored.file.lastModified).toBe(1234); expect(restored.file.type).toBe('x/frog');
});
it('counts exact escaped UTF8 and rejects byte limit plus one without a partial result', async () => {
  for (const value of ['', 'a', '\0\u0001\b\t\n\f\r"\\', '\ud800', '\udfff', '🐸é界', '\ud800a']) expect(escapedStringBytes(value)).toBe(new TextEncoder().encode(JSON.stringify(value)).byteLength);
  expect(escapedStringBytes('abc', 1)).toBeGreaterThan(1);
  const source = { text: '\0\ud800"🐸' }, encoded = await encodeRawRecovery(source);
  await expect(encodeRawRecovery(source, { bytes: encoded.bytes.length })).resolves.toMatchObject({ bytes: encoded.bytes });
  await expect(encodeRawRecovery(source, { bytes: encoded.bytes.length - 1 })).rejects.toThrow();
  await expect(encodeRawRecovery('aaaa', { string: 3 })).rejects.toThrow();
  await expect(encodeRawRecovery('\0'.repeat(100), { bytes: 200 })).rejects.toThrow();
  await expect(encodeRawRecovery(111n, { string: 2 })).rejects.toThrow();
  await expect(encodeRawRecovery(2n ** 100n, { string: 8 })).rejects.toThrow();
});
it('bounds configuration, visits and first-discovery depth while allowing cyclic references', async () => {
  expect(recoveryLimits()).toEqual(RECOVERY_LIMITS);
  for (const overrides of [{ bytes: -1 }, { bytes: NaN }, { bytes: Infinity }, { bytes: 1.5 }, { bytes: Number.MAX_SAFE_INTEGER + 1 }, { bytes: RECOVERY_LIMITS.bytes + 1 }, { extra: 1 }]) expect(() => recoveryLimits(overrides)).toThrow();
  await expect(encodeRawRecovery({ x: 1 }, { nodes: 1 })).rejects.toThrow();
  await expect(encodeRawRecovery({ x: {} }, { depth: 0 })).rejects.toThrow();
  const cycle: any = {}; cycle.self = cycle; expect(inspectRecovery(await text(cycle, { depth: 0 })).self).toBeDefined();
});
it('bounds BigInt allocation without excluding legal decimal widths and counts a negative sign', async () => {
  for (const value of [99_999_999_999_999_999n, 999_999_999_999_999_999n, -99_999_999_999_999_999n]) {
    expect(inspectRecovery(await text(value, { string: 18 }))).toBe(value);
  }
  for (const value of [1_000_000_000_000_000_000n, -999_999_999_999_999_999n, 1n << 1000n]) await expect(encodeRawRecovery(value, { string: 18 })).rejects.toMatchObject({ issue: { detail: 'raw-recovery-limit-bigint' } });
  await expect(encodeRawRecovery(0n, { string: 0 })).rejects.toMatchObject({ issue: { detail: 'raw-recovery-limit-bigint' } });
  for (const value of [0n, 1n, 9n]) expect(inspectRecovery(await text(value, { string: 1 }))).toBe(value);
  for (const value of [-1n, 10n]) await expect(encodeRawRecovery(value, { string: 1 })).rejects.toMatchObject({ issue: { detail: 'raw-recovery-limit-bigint' } });
  for (const value of [1n << 72n, -(1n << 72n), -(1n << 72n) - 1n]) await expect(encodeRawRecovery(value, { string: 18 })).rejects.toMatchObject({ issue: { detail: 'raw-recovery-limit-bigint' } });
});
it('never invokes raw toJSON and fails explicitly on unsupported native/platform values', async () => {
  let calls = 0; const value = { toJSON() { calls++; throw new Error('raw toJSON ran'); } };
  await expect(encodeRawRecovery(value)).rejects.toThrow(); expect(calls).toBe(0);
  await expect(encodeRawRecovery(Symbol('x'))).rejects.toThrow();
  class Unknown {} await expect(encodeRawRecovery(new Unknown())).rejects.toThrow();
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 128 }, false, ['encrypt']);
  await expect(encodeRawRecovery(key)).rejects.toMatchObject({ issue: { kind: 'unsupported-future', reason: 'raw-recovery-type-CryptoKey' } });
  const ModernBuffer = ArrayBuffer as unknown as new (length: number, options: { maxByteLength: number }) => ArrayBuffer;
  const resizable = new ModernBuffer(8, { maxByteLength: 16 }); await expect(encodeRawRecovery(resizable)).rejects.toThrow();
  const error = new Error('bad'); error.name = 1 as unknown as string; await expect(encodeRawRecovery(error)).rejects.toThrow('Error-name');
  await expect(encodeRawRecovery(new ArrayBuffer(1000), { bytes: 220 })).rejects.toThrow();
  const originalRead = Blob.prototype.arrayBuffer; let reads = 0;
  Blob.prototype.arrayBuffer = function () { reads++; return originalRead.call(this); };
  try { await expect(encodeRawRecovery(new Blob([new Uint8Array(1000)]), { bytes: 220 })).rejects.toThrow(); expect(reads).toBe(0); }
  finally { Blob.prototype.arrayBuffer = originalRead; }
});
it('tests the FileList algorithm in Node separately from required actual browser FileList proof', async () => {
  class FileListShim {
    constructor(private files: File[]) {} get length() { return this.files.length; }
    item(index: number) { return this.files[index] ?? null; }
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'FileList');
  Object.defineProperty(globalThis, 'FileList', { value: FileListShim, configurable: true });
  try {
    const files = [new File(['frog'], 'a.txt'), new File(['pond'], 'b.txt')];
    const restored = inspectRecovery(await text(new FileListShim(files)));
    expect(restored.map((file: File) => file.name)).toEqual(['a.txt', 'b.txt']); expect(await restored[1].text()).toBe('pond');
    expect(inspectRecovery(await text(new FileListShim([])))).toEqual([]);
  } finally { if (original) Object.defineProperty(globalThis, 'FileList', original); else Reflect.deleteProperty(globalThis, 'FileList'); }
});
it('handles feature absence without requiring newer global constructors or ArrayBuffer libraries', async () => {
  const file = Object.getOwnPropertyDescriptor(globalThis, 'File'), resizable = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable');
  Reflect.deleteProperty(globalThis, 'File'); Reflect.deleteProperty(ArrayBuffer.prototype, 'resizable');
  try { expect(inspectRecovery(await text(new Blob(['frog'])))).toBeInstanceOf(Blob); expect(new Uint8Array(inspectRecovery(await text(new ArrayBuffer(3))))).toEqual(new Uint8Array(3)); }
  finally { if (file) Object.defineProperty(globalThis, 'File', file); if (resizable) Object.defineProperty(ArrayBuffer.prototype, 'resizable', resizable); }
});
