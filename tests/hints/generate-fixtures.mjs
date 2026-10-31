import { mkdirSync, writeFileSync } from 'node:fs';
import { findDeduction } from '../../src/lib/hints/detect.ts';
const techniques = ['naked-single', 'hidden-single', 'pointing', 'claiming', 'naked-pair', 'hidden-pair', 'naked-triple', 'hidden-triple', 'x-wing'];
const solved = Array.from({ length: 81 }, (_, cell) => (Math.floor(cell / 9) * 3 + Math.floor(cell / 27) + cell % 9) % 9 + 1);
let state = 0x2101;
const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
const fixtures = [];
for (let sample = 0; sample < 20000; sample++) {
  const blankRate = 0.35 + sample % 50 / 100;
  const values = solved.map(digit => next() < blankRate ? 0 : digit);
  for (const technique of techniques) {
    const existing = fixtures.filter(fixture => fixture.technique === technique);
    if (existing.length >= 3) continue;
    const deduction = findDeduction(values, 0, technique);
    if (!deduction) continue;
    const category = deduction.witness.units[0] === undefined ? 'cell' : deduction.witness.units[0] < 9 ? 'row' : deduction.witness.units[0] < 18 ? 'column' : 'box';
    if (existing.some(fixture => fixture.category === category)) continue;
    fixtures.push({ technique, category, seed: 0x2101, sample, values: values.join(''), deduction });
  }
  if (techniques.every(technique => fixtures.some(fixture => fixture.technique === technique)) && sample >= 1000) break;
}
for (const technique of techniques) if (!fixtures.some(fixture => fixture.technique === technique)) throw new Error(`Missing ${technique}`);
mkdirSync('tests/fixtures/techniques', { recursive: true });
writeFileSync('tests/fixtures/techniques/original.v1.json', JSON.stringify({ schemaVersion: 1, authorship: 'Original algebraic solved-grid subsets. Deterministic generator retained; no external puzzle/diagram/prose copied.', fixtures }, null, 2) + '\n');
process.stdout.write(JSON.stringify(fixtures.map(({ technique, category, sample }) => ({ technique, category, sample }))) + '\n');
