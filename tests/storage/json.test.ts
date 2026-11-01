import { describe, expect, it } from 'vitest';
import { BACKUP_LIMITS, parseBoundedJson } from '../../src/lib/storage/json';
import type { JsonLimits } from '../../src/lib/storage/json';
import { databaseName, recoveryDatabaseName } from '../../src/lib/storage/namespace';
import { storageFailure } from '../../src/lib/storage/transaction';

describe('bounded backup structural parsing', () => {
  it('accepts data without coercing it', () => {
    expect(parseBoundedJson('{"a":[1,null,true,"ñ"]}')).toEqual({ a: [1, null, true, 'ñ'] });
  });
  it('rejects malformed and nonfinite JSON and dangerous object keys', () => {
    for (const text of ['{', '1e999', '{"__proto__":{}}', '[{"constructor":1}]', '{"a":{"prototype":[]}}']) {
      expect(() => parseBoundedJson(text)).toThrow();
    }
  });
  it('bounds bytes, depth, node count, strings, arrays and keys independently', () => {
    const examples = [
      ['"ññ"', { bytes: 5 }],
      ['[[[1]]]', { depth: 2 }],
      ['[1,2,3]', { nodes: 3 }],
      ['"long"', { string: 3 }],
      ['[1,2]', { array: 1 }],
      ['{"a":1,"b":2}', { keys: 1 }],
    ] as const;
    for (const [text, overrides] of examples) {
      expect(() => parseBoundedJson(text, { ...BACKUP_LIMITS, ...overrides })).toThrow();
    }
  });
  it('accepts inclusive resource maxima and rejects one unit beyond each independent budget', () => {
    const cases: { budget: keyof JsonLimits; maximum: number; text: string; expected: unknown }[] = [
      { budget: 'bytes', maximum: 6, text: '"ññ"', expected: 'ññ' },
      // Root depth is zero; three nesting edges and the scalar form four value nodes.
      { budget: 'depth', maximum: 3, text: '[[[1]]]', expected: [[[1]]] },
      { budget: 'nodes', maximum: 4, text: '[[[1]]]', expected: [[[1]]] },
      { budget: 'array', maximum: 2, text: '[1,2]', expected: [1, 2] },
      { budget: 'string', maximum: 4, text: '"frog"', expected: 'frog' },
      { budget: 'string', maximum: 4, text: '{"frog":1}', expected: { frog: 1 } },
      { budget: 'keys', maximum: 2, text: '{"a":1,"b":2}', expected: { a: 1, b: 2 } },
    ];
    for (const { budget, maximum, text, expected } of cases) {
      expect(parseBoundedJson(text, { ...BACKUP_LIMITS, [budget]: maximum })).toEqual(expected);
      let rejected: unknown;
      try { parseBoundedJson(text, { ...BACKUP_LIMITS, [budget]: maximum - 1 }); } catch (error) { rejected = error; }
      expect(rejected).toMatchObject({ issue: { kind: 'corrupt' } });
    }
    for (const [text, overrides, expected] of [
      ['0', { depth: 0, nodes: 1, bytes: 1 }, 0],
      ['[]', { array: 0 }, []], ['{}', { keys: 0 }, {}],
      ['""', { string: 0 }, ''], ['{"":1}', { string: 0 }, { '': 1 }],
    ] as const) expect(parseBoundedJson(text, { ...BACKUP_LIMITS, ...overrides })).toEqual(expected);
  });
  it('enforces the default depth on nested object paths as well as arrays', () => {
    const nested = (depth: number) => '{"a":'.repeat(depth) + '0' + '}'.repeat(depth);
    expect(parseBoundedJson(nested(32))).toEqual(JSON.parse(nested(32)));
    let rejected: unknown;
    try { parseBoundedJson(nested(33)); } catch (error) { rejected = error; }
    expect(rejected).toMatchObject({ issue: { kind: 'corrupt' } });
  });
  it('rejects an oversized code-unit input before allocating its UTF8 encoding', () => {
    const original = TextEncoder.prototype.encode; let allocations = 0;
    TextEncoder.prototype.encode = function (input) { allocations++; return original.call(this, input); };
    try {
      let rejected: unknown;
      try { parseBoundedJson('"oversized-ascii"', { ...BACKUP_LIMITS, bytes: 1 }); } catch (error) { rejected = error; }
      expect(rejected).toMatchObject({ issue: { kind: 'corrupt' } }); expect(allocations).toBe(0);
    } finally { TextEncoder.prototype.encode = original; }
  });
  it('uses application base paths independent of fragments and catalog versions', () => {
    expect(databaseName('https://example.test/toadoku/')).toBe('toadodu:%2Ftoadoku%2F');
    expect(databaseName('http://localhost:5179/')).toBe('toadodu:%2F');
    expect(databaseName('https://example.test/other/')).not.toBe(databaseName('https://example.test/toadoku/'));
    for (const url of ['./', 'file:///tmp/', 'https://example.test/game', 'https://example.test/#board']) {
      expect(() => databaseName(url)).toThrow();
    }
  });
  it('maps native storage failures to actionable typed results', () => {
    const cases = [
      ['SecurityError', 'denied'], ['NotAllowedError', 'denied'],
      ['QuotaExceededError', 'quota'], ['InvalidStateError', 'closed'],
      ['TransactionInactiveError', 'closed'], ['AbortError', 'abort'], ['UnknownError', 'abort'],
    ];
    for (const [name, reason] of cases) {
      expect(storageFailure(new DOMException(name, name)).issue).toEqual({ kind: 'unavailable', reason, detail: name });
    }
  });
  it('accepts only canonical recovery namespaces', () => {
    for (const path of ['/', '/toadoku/', '/ñ/']) { const name = databaseName(`https://example.test${path}`); expect(recoveryDatabaseName(name)).toBe(name); }
    for (const name of ['other:%2F', 'toadodu:%', 'toadodu:relative%2F', 'toadodu:%2Fmissing', 'toadodu:%2f', 'toadodu:/']) expect(() => recoveryDatabaseName(name)).toThrow('raw-recovery-namespace');
  });
});
