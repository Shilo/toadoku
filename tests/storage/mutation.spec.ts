import { test, expect } from '@playwright/test';
import { openNativeHarness } from './harness';

// Deliberate boundary mutants supplement the broad pure-module mutation runner.
// Production files and the native IndexedDB engine remain unchanged on disk.
const mutants = [
  { id: 'ST-GENERATION', module: 'repository', from: 'if (active.generation !== generation) issue("generation");', to: 'if (false) issue("generation");', run: 'nativeRepositoryCases', failure: 'old generation wrote after restore' },
  { id: 'ST-OWNER', module: 'repository', from: 'if (!same(attempt.writer, guard.writer)) issue("owner");', to: 'if (false) issue("owner");', run: 'nativeRepositoryCases', failure: 'stale owner disclosed information' },
  { id: 'ST-RECEIPT', module: 'repository', from: 'if (receiptSlot.value !== undefined) {', to: 'if (false) {', run: 'nativeRepositoryCases', failure: 'repeated completion did not return retained receipt' },
  { id: 'ST-WALLET', module: 'repository', from: 'safeAdd(profile.wallet, result.dewdrops)', to: 'result.dewdrops', run: 'nativeRepositoryCases', failure: 'concurrent wallet delta/frontier failed' },
  { id: 'ST-EXPOSURE', module: 'repository', from: 'exposed: [...new Set([...attempt.assistance.exposed, ...disclosure.exposed])].sort((a, b) => a - b)', to: 'exposed: [...attempt.assistance.exposed]', run: 'nativeRepositoryCases', failure: 'pending-disclosure' },
  { id: 'ST-ACKNOWLEDGEMENT', module: 'transaction', from: 'value = result;', to: 'value = result; resolve({ kind: "committed", value: result });', run: 'nativeTransactionCases', failure: 'request success must not acknowledge aborted tx' },
  { id: 'ST-ROLE-KEY', module: 'repository', from: 'if (record.generation !== generation || record.role !== expectedRole) corrupt("role-key-binding");', to: 'if (false) corrupt("role-key-binding");', cases: 'metadata-native', run: 'nativeMetadataKeyBindings', failure: 'metadata role-name accepted' },
  { id: 'ST-POOL-KEY', module: 'repository', from: 'if (record.pool !== expectedPool) corrupt("pool-key-binding");', to: 'if (false) corrupt("pool-key-binding");', cases: 'metadata-native', run: 'nativeMetadataKeyBindings', failure: 'metadata pool-name accepted' },
  { id: 'ST-PHYSICAL-GENERATION', module: 'repository', from: 'if (Object.hasOwn(record, "generation") && record.generation !== generation) corrupt("physical-generation-key");', to: 'if (false) corrupt("physical-generation-key");', cases: 'metadata-native', run: 'nativeMetadataKeyBindings', failure: 'metadata pool-generation accepted' },
  { id: 'ST-ATTEMPT-KEY', module: 'repository', from: 'if (record.generation !== generation || record.id !== expectedId || expectedRole !== undefined && record.role !== expectedRole) corrupt("attempt-key-binding");', to: 'if (false) corrupt("attempt-key-binding");', cases: 'metadata-native', run: 'nativeMetadataWriteBindings', failure: 'metadata write acquire/attempt-id accepted' },
  { id: 'ST-INTENT-KEY', module: 'repository', from: 'if (priorIntent && (priorIntent.id !== intent.id || priorIntent.generation !== generation || priorIntent.role !== intent.role)) corrupt("intent-key-binding");', to: 'if (false) corrupt("intent-key-binding");', cases: 'metadata-native', run: 'nativeMetadataWriteBindings', failure: 'metadata write duplicate/intent-id accepted' },
] as const;

for (const mutant of mutants) test(`native invariant kills ${mutant.id}`, async ({ page }) => {
  let replacements = 0;
  await page.route(new RegExp(`/src/lib/storage/${mutant.module}\\.ts(?:\\?.*)?$`), async route => {
    const response = await route.fetch(); const original = await response.text();
    const occurrences = original.split(mutant.from).length - 1;
    expect(occurrences, `${mutant.id} exact transformed source fragment`).toBe(1);
    replacements++;
    await route.fulfill({ response, body: original.replace(mutant.from, mutant.to), contentType: 'text/javascript' });
  });
  await openNativeHarness(page);
  const outcome = await page.evaluate(async ({ run, casesModule }) => {
    try {
      const moduleUrl = `/tests/storage/${casesModule}.ts`; const cases = await import(moduleUrl);
      await cases[run](); return { survived: true, error: '' };
    } catch (error) { return { survived: false, error: error instanceof Error ? error.message : String(error) }; }
  }, { run: mutant.run, casesModule: 'cases' in mutant ? mutant.cases : 'native-cases' });
  expect(replacements, 'mutant module was actually loaded').toBeGreaterThan(0);
  expect(outcome.survived, `${mutant.id} must be killed by its native invariant`).toBe(false);
  // A syntax/import/network crash is not a killed semantic mutant.
  expect(outcome.error).toContain(mutant.failure);
});
