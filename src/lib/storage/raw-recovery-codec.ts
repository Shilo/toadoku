import { StorageFailure } from './transaction';

export interface RecoveryLimits { bytes: number; nodes: number; depth: number; string: number; records: number; stores: number; indexes: number }
export const RECOVERY_LIMITS: Readonly<RecoveryLimits> = Object.freeze({
  bytes: 256 * 1024 * 1024, nodes: 5_000_000, depth: 64, string: 1024 * 1024, records: 1_000_000, stores: 256, indexes: 256,
});
export function recoveryLimit(reason: string): never { throw new StorageFailure({ kind: 'unavailable', reason: 'abort', detail: `raw-recovery-limit-${reason}` }); }
function unsupported(reason: string): never { throw new StorageFailure({ kind: 'unsupported-future', reason: `raw-recovery-type-${reason}` }); }
export function recoveryLimits(input: Partial<RecoveryLimits> = {}): RecoveryLimits {
  const limits = { ...RECOVERY_LIMITS, ...input };
  for (const name of Object.keys(limits) as (keyof RecoveryLimits)[]) if (!Object.hasOwn(RECOVERY_LIMITS, name)
    || !Number.isSafeInteger(limits[name]) || limits[name] < 0 || limits[name] > RECOVERY_LIMITS[name]) recoveryLimit('configuration');
  return limits;
}

/** JSON preserves lone UTF-16 surrogates as escapes; TextEncoder(raw) would replace them. */
export function escapedStringBytes(value: string, stopAfter = Number.MAX_SAFE_INTEGER): number {
  let bytes = 2;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code === 34 || code === 92 || [8, 9, 10, 12, 13].includes(code)) bytes += 2;
    else if (code < 32) bytes += 6;
    else if (code < 128) bytes++;
    else if (code < 2048) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) { bytes += 4; index++; } else bytes += 6;
    } else bytes += code >= 0xdc00 && code <= 0xdfff ? 6 : 3;
    if (bytes > stopAfter) return bytes;
  }
  return bytes;
}

class Output {
  private encoder = new TextEncoder();
  private chunks: Uint8Array[] = [];
  private buffer = new Uint8Array(64 * 1024);
  private offset = 0;
  bytes = 0;
  constructor(private maximum: number) {}
  get remaining() { return this.maximum - this.bytes; }
  text(value: string): void {
    // Controlled JSON fragments only. All raw scalar strings are preflighted before escaping.
    const encoded = this.encoder.encode(value);
    if (encoded.byteLength > this.remaining) recoveryLimit('bytes');
    this.bytes += encoded.byteLength;
    let start = 0;
    while (start < encoded.length) {
      const count = Math.min(this.buffer.length - this.offset, encoded.length - start);
      this.buffer.set(encoded.subarray(start, start + count), this.offset); start += count; this.offset += count;
      if (this.offset === this.buffer.length) { this.chunks.push(this.buffer); this.buffer = new Uint8Array(64 * 1024); this.offset = 0; }
    }
  }
  string(value: string, maximum?: number): void {
    if ((maximum !== undefined && value.length > maximum) || value.length > this.remaining || escapedStringBytes(value, this.remaining) > this.remaining) recoveryLimit('string');
    this.text(JSON.stringify(value));
  }
  binary(bytes: Uint8Array): void {
    if (Math.ceil(bytes.byteLength / 3) * 4 + 2 > this.remaining) recoveryLimit('binary');
    this.text('"');
    // A multiple of three keeps every intermediate base64 chunk free of padding.
    for (let offset = 0; offset < bytes.length; offset += 24 * 1024) {
      const part = bytes.subarray(offset, offset + 24 * 1024);
      this.text(btoa(String.fromCharCode(...part)));
    }
    this.text('"');
  }
  finish(): Uint8Array<ArrayBuffer> {
    const result = new Uint8Array(this.bytes); let offset = 0;
    for (const chunk of this.chunks) { result.set(chunk, offset); offset += chunk.length; }
    result.set(this.buffer.subarray(0, this.offset), offset); return result;
  }
}

type Token = null | string | boolean | number | { ref: number } | { special: 'undefined' | 'NaN' | 'Infinity' | '-Infinity' | '-0' } | { bigint: string };
export interface EncodedRecovery { bytes: Uint8Array<ArrayBuffer>; nodes: number; visits: number }

/** Opaque diagnostic output only. There is deliberately no gameplay importer for this format. */
export async function encodeRawRecovery(input: unknown, overrides: Partial<RecoveryLimits> = {}): Promise<EncodedRecovery> {
  const limits = recoveryLimits(overrides), output = new Output(limits.bytes);
  const seen = new WeakMap<object, number>(), queue: ({ value: object; depth: number } | undefined)[] = [];
  let visits = 0;
  const token = (value: unknown, depth: number): Token => {
    if (++visits > limits.nodes) return recoveryLimit('nodes');
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
    if (value === undefined) return { special: 'undefined' };
    if (typeof value === 'number') return Number.isNaN(value) ? { special: 'NaN' } : value === Infinity ? { special: 'Infinity' }
      : value === -Infinity ? { special: '-Infinity' } : Object.is(value, -0) ? { special: '-0' } : value;
    if (typeof value === 'bigint') {
      // Conservative decimal bound before formatting an arbitrary native BigInt.
      if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < -BigInt(Number.MAX_SAFE_INTEGER)) {
        if ((value >> BigInt(limits.string * 4)) !== (value < 0n ? -1n : 0n)) return recoveryLimit('bigint');
      }
      const text = value.toString(); if (text.length > limits.string) return recoveryLimit('bigint'); return { bigint: text };
    }
    if (typeof value !== 'object') return unsupported(typeof value);
    const previous = seen.get(value); if (previous !== undefined) return { ref: previous };
    if (depth > limits.depth) return recoveryLimit('depth');
    const id = queue.length; seen.set(value, id); queue.push({ value, depth }); return { ref: id };
  };
  const writeToken = (value: Token) => {
    if (typeof value === 'string') output.string(value, limits.string); else output.text(JSON.stringify(value));
  };
  const pairEntries = (value: object, names: string[], depth: number) => {
    output.text('[');
    for (let index = 0; index < names.length; index++) {
      if (index) output.text(','); output.text('['); output.string(names[index], limits.string); output.text(',');
      writeToken(token((value as Record<string, unknown>)[names[index]], depth + 1)); output.text(']');
    }
    output.text(']');
  };
  output.text('{"application":"toadodu-raw-recovery","recoveryVersion":1,"importable":false,"encoding":"node-table-v1","root":');
  writeToken(token(input, 0)); output.text(',"nodes":[');
  for (let index = 0; index < queue.length; index++) {
    const { value, depth } = queue[index]!; if (index) output.text(',');
    if (Array.isArray(value)) {
      output.text(`{"type":"array","length":${value.length},"entries":`); pairEntries(value, Object.keys(value), depth); output.text('}');
    } else if (value instanceof Map) {
      output.text('{"type":"map","entries":['); let first = true;
      for (const [key, item] of Map.prototype.entries.call(value)) {
        if (!first) output.text(','); first = false; output.text('['); writeToken(token(key, depth + 1)); output.text(','); writeToken(token(item, depth + 1)); output.text(']');
      } output.text(']}');
    } else if (value instanceof Set) {
      output.text('{"type":"set","values":['); let first = true;
      for (const item of Set.prototype.values.call(value)) { if (!first) output.text(','); first = false; writeToken(token(item, depth + 1)); } output.text(']}');
    } else if (value instanceof Date) {
      output.text('{"type":"date","value":'); writeToken(token(Date.prototype.getTime.call(value), depth)); output.text('}');
    } else if (value instanceof RegExp) {
      output.text('{"type":"regexp","source":'); output.string(value.source, limits.string); output.text(',"flags":'); output.string(value.flags, limits.string);
      output.text(',"lastIndex":'); writeToken(token(value.lastIndex, depth + 1)); output.text('}');
    } else if (value instanceof Error || (typeof DOMException !== 'undefined' && value instanceof DOMException)) {
      const dom = typeof DOMException !== 'undefined' && value instanceof DOMException;
      output.text('{"type":'); output.string(dom ? 'dom-exception' : 'error'); output.text(',"name":');
      if (typeof value.name !== 'string') unsupported('Error-name'); output.string(value.name, limits.string);
      output.text(',"message":'); output.string(value.message, limits.string);
      if (dom) output.text(`,"code":${value.code}`);
      output.text(',"entries":'); pairEntries(value, Object.getOwnPropertyNames(value), depth); output.text('}');
    } else if (value instanceof ArrayBuffer) {
      if ('resizable' in value && value.resizable === true) unsupported('ResizableArrayBuffer');
      output.text('{"type":"array-buffer","base64":'); output.binary(new Uint8Array(value)); output.text('}');
    } else if (ArrayBuffer.isView(value)) {
      const name = Object.prototype.toString.call(value).slice(8, -1);
      output.text('{"type":"view","name":'); output.string(name, limits.string); output.text(',"buffer":'); writeToken(token(value.buffer, depth + 1));
      output.text(`,"byteOffset":${value.byteOffset},"byteLength":${value.byteLength},"length":${value instanceof DataView ? 'null' : (value as unknown as { length: number }).length}}`);
    } else if (typeof Blob !== 'undefined' && value instanceof Blob) {
      const file = typeof File !== 'undefined' && value instanceof File;
      output.text(`{"type":"${file ? 'file' : 'blob'}","mediaType":`); output.string(value.type, limits.string);
      if (file) { output.text(',"name":'); output.string(value.name, limits.string); output.text(`,"lastModified":${value.lastModified}`); }
      output.text(',"base64":');
      if (Math.ceil(value.size / 3) * 4 + 2 > output.remaining) recoveryLimit('binary');
      output.binary(new Uint8Array(await Blob.prototype.arrayBuffer.call(value))); output.text('}');
    } else if (typeof FileList !== 'undefined' && value instanceof FileList) {
      output.text('{"type":"file-list","files":[');
      for (let item = 0; item < value.length; item++) { if (item) output.text(','); writeToken(token(FileList.prototype.item.call(value, item), depth + 1)); } output.text(']}');
    } else if (value instanceof Number || value instanceof Boolean || value instanceof String || Object.getPrototypeOf(value) === BigInt.prototype) {
      const primitive = value instanceof Number ? Number.prototype.valueOf.call(value) : value instanceof Boolean ? Boolean.prototype.valueOf.call(value)
        : value instanceof String ? String.prototype.valueOf.call(value) : BigInt.prototype.valueOf.call(value);
      output.text('{"type":"boxed","value":'); writeToken(token(primitive, depth)); output.text('}');
    } else {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) unsupported(Object.prototype.toString.call(value).slice(8, -1));
      output.text(`{"type":"object","nullPrototype":${prototype === null},"entries":`); pairEntries(value, Object.keys(value), depth); output.text('}');
    }
    queue[index] = undefined;
  }
  output.text(']}'); return { bytes: output.finish(), nodes: queue.length, visits };
}
