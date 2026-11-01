import { defineConfig } from 'vitest/config';
import { BaseSequencer } from 'vitest/node';
import type { TestSpecification } from 'vitest/node';

/** QA001-F4: retain every test, run quick boundary failures before expensive full models. */
class BoundaryFirst extends BaseSequencer {
  override async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
    const rank = (file: TestSpecification) => {
      const path = file.moduleId.replaceAll('\\', '/');
      if (path.endsWith('/session/model.test.ts')) return 4;
      if (path.endsWith('/storage/capacity.test.ts')) return 3;
      if (path.endsWith('/catalog/select.test.ts')) return 2;
      if (path.endsWith('/rewards/score.test.ts')) return 1;
      return 0;
    };
    return [...files].sort((a, b) => rank(a) - rank(b) || a.moduleId.localeCompare(b.moduleId));
  }
}
export default defineConfig({ test: {
  include: ['tests/**/*.test.ts'],
  sequence: { sequencer: BoundaryFirst },
} });
