import { describe, expect, it } from 'vitest';
import { exactCover, independentlyValidSolution } from '../../tools/catalog/oracle-exact-cover';
import { canonicalGivens, d4, groupId, normalizeDigits, puzzleId } from '../../tools/catalog/identity';
import { parseSource } from '../../tools/catalog/source';
import { createHash } from 'node:crypto';
const puzzle = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solved = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
describe('independent exact cover', () => {
  it('certifies original unique fixture, every unit, and clue preservation', () => {
    const result = exactCover(puzzle);
    expect(result).toMatchObject({ kind: 'complete', count: 1, solution: solved });
    expect(independentlyValidSolution(puzzle, solved)).toBe(true);
    expect(independentlyValidSolution(puzzle, solved.slice(0, 80) + '8')).toBe(false);
    expect(independentlyValidSolution('1' + puzzle.slice(1), solved)).toBe(false);
  });
  it('caps multiplicity, preserves cancellation/budget as unknown and is call independent', () => {
    expect(exactCover('0'.repeat(81))).toMatchObject({ kind: 'complete', count: 2 });
    expect(exactCover(puzzle, { nodeBudget: 0 })).toEqual({ kind: 'unknown', nodes: 0 });
    expect(exactCover(puzzle, { shouldAbort: () => true })).toEqual({ kind: 'aborted', nodes: 0 });
    expect(exactCover(puzzle, { shouldAbort: () => { throw new Error('callback failed'); } })).toEqual({ kind: 'unknown', nodes: 0 });
    let calls = 0;
    expect(exactCover(puzzle, { shouldAbort: () => { if (calls++ > 5) throw new Error('callback failed later'); return false; } }).kind).toBe('unknown');
    expect(exactCover(puzzle)).toMatchObject({ kind: 'complete', count: 1, solution: solved });
  });
  it('rejects malformed and duplicate givens independently', () => {
    for (const value of [null, [], puzzle + '0', '.' + puzzle.slice(1), '０'.repeat(81)]) expect(exactCover(value).kind).toBe('invalid');
    expect(exactCover('55' + puzzle.slice(2)).kind).toBe('invalid');
    for (const budget of [-1, 0.5, Infinity, NaN]) expect(exactCover(puzzle, { nodeBudget: budget }).kind).toBe('invalid');
    expect(exactCover(solved)).toMatchObject({ kind: 'complete', count: 1, solution: solved });
  });
  it('proves all D4 transforms and digit relabels retain multiplicity and mapped answer', () => {
    for (let t = 0; t < 8; t++) {
      expect(exactCover(d4(puzzle, t))).toMatchObject({ kind: 'complete', count: 1, solution: d4(solved, t) });
      expect(exactCover([...d4(puzzle, t)].map(x => x === '0' ? x : String(10 - Number(x))).join(''))).toMatchObject({ kind: 'complete', count: 1 });
    }
  });
});
describe('content/equivalence identity', () => {
  it('uses all eight distinct square isometries with inverses and stable normalization', () => {
    const labels = Array.from({ length: 81 }, (_, i) => String.fromCharCode(32 + i)).join('');
    expect(new Set(Array.from({ length: 8 }, (_, t) => d4(labels, t))).size).toBe(8);
    expect(d4(d4(d4(d4(labels, 1), 1), 1), 1)).toBe(labels);
    expect(d4(d4(labels, 4), 4)).toBe(labels);
    expect(normalizeDigits('099088077')).toBe('011022033');
    for (let t = 0; t < 8; t++) expect(canonicalGivens(d4(puzzle, t))).toBe(canonicalGivens(puzzle));
    expect(canonicalGivens(canonicalGivens(puzzle))).toBe(canonicalGivens(puzzle));
    expect(groupId([...puzzle].map(x => x === '0' ? x : String(10 - Number(x))).join(''))).toBe(groupId(puzzle));
    expect(puzzleId(puzzle)).not.toBe(puzzleId(d4(puzzle, 1)));
  });
});
describe('strict pinned source parser', () => {
  const id = createHash('sha1').update(puzzle).digest('hex').slice(0, 12);
  const row = `${id} ${puzzle}  1.2\n`;
  it('preserves complete provenance and exact decimal', () => {
    expect(parseSource(new TextEncoder().encode(row), 'easy.txt')).toEqual([{ sourceId: id, givens: puzzle, ratingTenths: 12, sourceFile: 'easy.txt', line: 1, pool: 'easy' }]);
  });
  it('rejects forgiving whitespace, modified IDs, noncanonical bytes and unsupported data', () => {
    for (const invalid of [row.replace('\n', '\r\n'), row.trim(), row + '\n', 'a' + row.slice(1), row.replace('1.2', '5.0'), row.replace('1.2', '1.25')]) {
      expect(() => parseSource(new TextEncoder().encode(invalid), 'easy.txt')).toThrow();
    }
  });
});
