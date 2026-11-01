import { test, expect } from '@playwright/test';
import { openNativeHarness } from './harness';
import { writeFileSync } from 'node:fs';
import type { MetadataOutcome } from './metadata-native';

test('native essential metadata values match their actual role pool and generation keys', async ({ page }) => {
  await openNativeHarness(page);
  const report: MetadataOutcome[] = await page.evaluate(async () => { const url = '/tests/storage/metadata-native.ts'; return (await import(url)).nativeMetadataKeyBindings(); });
  console.log(JSON.stringify(report)); expect(report).toHaveLength(12);
  expect(report.every(result => result.kind === 'corrupt')).toBe(true);
  expect(report.every(result => !('preferencesKind' in result) || result.preferencesKind === 'corrupt')).toBe(true);
});

test('native metadata key rejection preserves writes and accepts absent legacy physical tags', async ({ page }) => {
  await openNativeHarness(page);
  const report = await page.evaluate(async () => { const url = '/tests/storage/metadata-native.ts'; const cases = await import(url);
    return { tags: await cases.nativeOptionalGenerationTags(), writes: await cases.nativeMetadataWriteBindings() }; });
  expect(report.tags).toEqual({ untagged: 2, rejectedPresentTags: 24 }); expect(report.writes.checked).toBe(24); console.log(JSON.stringify(report));
});

test('native normal backup rejects physically swapped role keys while raw recovery preserves them', async ({ page }) => {
  await openNativeHarness(page);
  const report: { normalKind: string; rawPreserved: boolean }[] = await page.evaluate(async () => { const url = '/tests/storage/metadata-native.ts'; return (await import(url)).nativeMetadataExportBindings(); });
  console.log(JSON.stringify(report)); expect(report.every(row => row.rawPreserved)).toBe(true); expect(report.every(row => row.normalKind === 'corrupt')).toBe(true);
});

test('native keyed export matrix preserves corruption and valid legacy roundtrips', async ({ page, browser }, testInfo) => {
  await openNativeHarness(page);
  const report = await page.evaluate(async () => {
    const metadataUrl = '/tests/storage/metadata-native.ts', casesUrl = '/tests/storage/native-cases.ts';
    const metadata = await import(metadataUrl), cases = await import(casesUrl);
    return { swapped: await metadata.nativeMetadataExportBindings(), prefix: await metadata.nativeGenerationPrefixBindings(),
      legacy: await cases.nativeLegacyUpgradeCase(), roundtrip: await cases.nativeRepositoryCases() };
  });
  expect(report.prefix).toEqual({ metadata: 4, history: 5, quarantine: 3, boundaryKeys: 8 });
  expect(report.roundtrip).toContain('backup round-trip');
  writeFileSync(`prototypes/gameplay-validation/storage/keyed-export-${testInfo.project.name}-${Date.now()}.json`,
    JSON.stringify({ browser: testInfo.project.name, browserVersion: browser.version(), recordedAt: new Date().toISOString(), ...report }, null, 2));
  console.log(JSON.stringify(report));
});

test('native raw recovery preserves future corrupt graphs without writes or creation', async ({ page, browser }, testInfo) => {
  page.on('console', message => { if (message.text().startsWith('RECOVERY_NATIVE')) console.log(message.text()); });
  await openNativeHarness(page);
  const report = await page.evaluate(async () => { const url = '/tests/storage/recovery-native.ts'; return (await import(url)).nativeRawRecoveryCase(); });
  expect(report.noCreate).toBe(true); expect(report.cancellation).toBe(true); console.log(JSON.stringify(report));
  writeFileSync(`prototypes/gameplay-validation/storage/raw-native-${testInfo.project.name}-${Date.now()}.json`,
    JSON.stringify({ browser: testInfo.project.name, browserVersion: browser.version(), recordedAt: new Date().toISOString(), ...report }, null, 2));
});

test('native raw recovery capacity includes one and two retained full histories', async ({ page, browser }, testInfo) => {
  test.setTimeout(240_000); await openNativeHarness(page);
  page.on('console', message => { if (message.text().startsWith('RECOVERY_SCALE')) console.log(message.text()); });
  const report = await page.evaluate(async () => { const url = '/tests/storage/recovery-native.ts'; return (await import(url)).nativeRawRecoveryCapacity(); });
  const recorded = JSON.stringify({ browser: testInfo.project.name, browserVersion: browser.version(), recordedAt: new Date().toISOString(), ...report }, null, 2);
  writeFileSync(`prototypes/gameplay-validation/storage/raw-capacity-${testInfo.project.name}-${Date.now()}.json`, recorded);
  console.log(recorded);
});
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

test('native legacy v1 upgrade retains row writes and samebucket completion serializes', async ({ page }) => {
  await openNativeHarness(page);
  const evidence = await page.evaluate(async () => {
    const moduleUrl = '/tests/storage/native-cases.ts'; const cases = await import(moduleUrl);
    const legacy = await cases.nativeLegacyUpgradeCase(); await cases.nativeSameBucketCompletionCase(); return legacy;
  });
  expect(evidence).toContain('legacy save allocation completion export remain rowlayout'); console.log(JSON.stringify(evidence));
});

test('native colliding receipt overflow roundtrips and rejects duplicate physical copies', async ({ page }) => {
  await openNativeHarness(page);
  await page.evaluate(async () => { const moduleUrl = '/tests/storage/native-cases.ts'; const cases = await import(moduleUrl); await cases.nativeOverflowHistoryCase(); });
});

test('native missing or future physical layout never hides issued history', async ({ page }) => {
  await openNativeHarness(page);
  await page.evaluate(async () => { const moduleUrl = '/tests/storage/native-cases.ts'; const cases = await import(moduleUrl); await cases.nativeMissingLayoutCase(); });
});

test('native cleanup quanta permit active checkpoints and recheck protection after each batch', async ({ page }) => {
  await openNativeHarness(page);
  const result = await page.evaluate(async () => { const moduleUrl = '/tests/storage/native-cases.ts'; const cases = await import(moduleUrl); return cases.nativeCleanupQuantumCase(); });
  expect(result.maxDeletes).toBe(8); expect(result.failuresPreserved).toBe(true); console.log(JSON.stringify(result));
});
test('native capacity preserves 100000 issued groups and10000 receipts', async ({ page, browser }, testInfo) => {
  test.setTimeout(240_000);
  page.on('console', message => { if (message.text().startsWith('STORAGE_SCALE')) console.log(message.text()); });
  await openNativeHarness(page);
  const report = await page.evaluate(async batchSize => {
    const moduleUrl = '/tests/storage/native-cases.ts'; const cases = await import(moduleUrl); return cases.nativeCapacityCase(batchSize);
  }, process.env.STORAGE_STAGE_BATCH === '1024' ? 1024 : 256);
  expect(report.issued).toBe(100_000); expect(report.receipts).toBe(10_000);
  expect(Number(report.bytes)).toBeLessThan(128 * 1024 * 1024);
  const recorded = JSON.stringify({ browser: testInfo.project.name, browserVersion: browser.version(), recordedAt: new Date().toISOString(), ...report }, null, 2);
  writeFileSync(testInfo.outputPath('capacity.json'), recorded);
  writeFileSync(`prototypes/gameplay-validation/storage/capacity-${testInfo.project.name}-${Date.now()}.json`, recorded);
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
