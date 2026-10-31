import { describe, expect, it } from 'vitest';
import { BACKUP_LIMITS, parseBoundedJson } from '../../src/lib/storage/json';
import { databaseName } from '../../src/lib/storage/namespace';
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
});
