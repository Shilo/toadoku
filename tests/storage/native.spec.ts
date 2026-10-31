import { test, expect } from '@playwright/test';
import { openNativeHarness } from './harness';
import { writeFileSync } from 'node:fs';
test('native IndexedDB atomic storage, recovery and ownership', async ({ page }) => {
  await openNativeHarness(page);
  const outcomes = await page.evaluate(async () => {
    const moduleUrl = '/tests/storage/native-cases.ts';
    const cases = await import(moduleUrl);
    return { transaction: await cases.nativeTransactionCases(), repository: await cases.nativeRepositoryCases(),
      proofs: await cases.nativeDisclosureProofCases(), aborts: await cases.nativeCompletionAbortCases() };
  });
  expect(outcomes.repository).toContain('restore concurrent edit CAS');
  expect(outcomes.aborts.injected).toBeGreaterThan(5);
  console.log(JSON.stringify(outcomes));
});
test('native allocation and disclosure abort at every request acknowledgement', async ({ page }) => {
  await openNativeHarness(page);
  const counts = await page.evaluate(async () => {
    const moduleUrl = '/tests/storage/native-cases.ts'; const cases = await import(moduleUrl);
    return cases.nativeAllocationDisclosureAborts();
  });
  expect(counts.allocation).toBeGreaterThan(5); expect(counts.disclosure).toBeGreaterThan(2);
  console.log(JSON.stringify(counts));
});
test('native failures preserve recovery data across independent connections', async ({ page }) => {
  await openNativeHarness(page);
  const evidence = await page.evaluate(async () => {
    const moduleUrl = '/tests/storage/native-cases.ts'; const cases = await import(moduleUrl); return cases.nativeEnvironmentCases();
  });
  expect(evidence).toContain('future database preserved'); console.log(JSON.stringify(evidence));
});
test('native corrupt issued records never count as unseen supply', async ({ page }) => {
  await openNativeHarness(page);
  const count = await page.evaluate(async () => {
    const moduleUrl = '/tests/storage/native-cases.ts'; const cases = await import(moduleUrl); return cases.nativeCorruptHistoryCases();
  });
  expect(count).toBe(5);
});
test('native restore retention protects active recovery and pending generations', async ({ page }) => {
  await openNativeHarness(page);
  const evidence = await page.evaluate(async () => {
    const moduleUrl = '/tests/storage/native-cases.ts'; const cases = await import(moduleUrl);
    const result = await cases.nativeRetentionCases(); await cases.nativeCancelledValidationCase(); return result;
  });
  expect(evidence).toContain('cancelled stage pruned'); console.log(JSON.stringify(evidence));
});
test('native capacity preserves 100000 issued groups and10000 receipts', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  page.on('console', message => { if (message.text().startsWith('STORAGE_SCALE')) console.log(message.text()); });
  await openNativeHarness(page);
  const report = await page.evaluate(async batchSize => {
    const moduleUrl = '/tests/storage/native-cases.ts'; const cases = await import(moduleUrl); return cases.nativeCapacityCase(batchSize);
  }, process.env.STORAGE_STAGE_BATCH === '1024' ? 1024 : 256);
  expect(report.issued).toBe(100_000); expect(report.receipts).toBe(10_000);
  expect(Number(report.bytes)).toBeLessThan(128 * 1024 * 1024);
  writeFileSync(testInfo.outputPath('capacity.json'), JSON.stringify({ browser: testInfo.project.name, ...report }, null, 2));
  console.log(JSON.stringify(report));
});
test('native generation index throughput diagnostic', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await openNativeHarness(page);
  const report = await page.evaluate(async count => {
    const moduleUrl = '/tests/storage/native-cases.ts'; const cases = await import(moduleUrl); return cases.nativeIndexBenchmark(count);
  }, Number(process.env.STORAGE_INDEX_COUNT ?? 1000));
  writeFileSync(testInfo.outputPath('index-benchmark.json'), JSON.stringify({ browser: testInfo.project.name, ...report }, null, 2));
  console.log(JSON.stringify(report));
});
