import { expect, it } from 'vitest';
import { releaseBuildId } from '../../tools/pwa/build';

it('binds app version and source commit even when all emitted application files are unchanged', () => {
  const content = { files: [['index.html', 'identical']], marker: '' };
  const app = { version: '0.0.47', commit: 'a'.repeat(40) };
  const first = releaseBuildId(app, content);
  expect(releaseBuildId({ ...app }, structuredClone(content))).toBe(first);
  expect(releaseBuildId({ ...app, commit: 'b'.repeat(40) }, content)).not.toBe(first);
  expect(releaseBuildId({ ...app, version: '0.0.48' }, content)).not.toBe(first);
  expect(releaseBuildId(app, { ...content, marker: 'new-release' })).not.toBe(first);
});
