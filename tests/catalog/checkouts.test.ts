import { describe, expect, it } from 'vitest';
import { withinWorkspace } from '../../tools/catalog/checkouts';
import { resolve } from 'node:path';
describe('clean-checkout evidence boundary', () => {
  it('keeps isolated fixture clones and static server paths inside their declared root', () => {
    const root = resolve('prototypes/gameplay-validation');
    expect(withinWorkspace(root, resolve(root, 'checkouts/test'))).toBe(true);
    expect(withinWorkspace(root, root)).toBe(false);
    expect(withinWorkspace(root, resolve(root, '../user-data'))).toBe(false);
    expect(withinWorkspace(root, `${root}-other`)).toBe(false);
  });
});
