import { expect, it } from 'vitest';
import { assertCachedShellBudget, MAX_RESOURCE_BYTES, MAX_SHELL_BYTES } from '../../tools/pwa/build';
it('counts exact serialized release metadata before declaring an installable closure', () => {
  const metadata = Buffer.byteLength(JSON.stringify({ protocol: 1, buildId: 'a'.repeat(64), bytes: MAX_SHELL_BYTES - 1, files: [] }));
  const resourceOnlyPass = MAX_SHELL_BYTES - metadata + 1;
  expect(resourceOnlyPass).toBeLessThan(MAX_SHELL_BYTES);
  expect(() => assertCachedShellBudget(resourceOnlyPass, metadata)).toThrow();
  expect(assertCachedShellBudget(MAX_SHELL_BYTES - metadata, metadata)).toBe(MAX_SHELL_BYTES);
  expect(() => assertCachedShellBudget(0, MAX_RESOURCE_BYTES + 1)).toThrow();
  expect(() => assertCachedShellBudget(-1, 1)).toThrow();
});
