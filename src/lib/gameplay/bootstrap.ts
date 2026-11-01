import type { Locale } from '../i18n.ts';
import { CATALOG_TRUST } from '../catalog/trust.v1.ts';
import { CatalogLoader } from '../catalog/load.ts';
import { verifyAttestedRecord } from '../catalog/attestation.ts';
import { POOLS } from '../catalog/types.ts';
import { openRepository } from '../storage/repository.ts';
import type { RepositoryOptions } from '../storage/repository.ts';
import { createHintComputer } from './hint-client.ts';
import { GameController } from './game.ts';
import type { StorageResult } from './contracts.ts';

function defaults(locale: Locale): RepositoryOptions['initial'] {
  const trusted = Object.values(CATALOG_TRUST).find(item => item.catalogVersion === '1' && item.certificationVersion === '1');
  if (!trusted) throw new Error('missing-catalog-certification');
  return {
      preferences: { schemaVersion: 1, language: locale, motion: 'system', boardShape: 'fill', theme: 'pond', appearance: 'light' },
      profile: { revision: 0, wallet: 0, lifetimeEarned: 0, frontier: { runId: crypto.randomUUID(), metamorphosis: 1, leap: 1, scheduleVersion: 1 }, highestCompletedLeap: 0 },
      pools: POOLS.map(pool => ({ selectionVersion: '1', catalogVersion: trusted.catalogVersion, pool, revision: 0,
        seed: crypto.getRandomValues(new Uint32Array(1))[0], epoch: 0, cursor: 0, lifetimeIssued: 0, count: trusted.pools[pool] })),
  };
}
export async function bootstrap(base: URL, locale: Locale): Promise<StorageResult<GameController>> {
  const opened = await openRepository({ baseUrl: base, verifyDefinition: verifyAttestedRecord, initial: defaults(locale) });
  if (opened.kind !== 'committed') return opened;
  const controller = new GameController(opened.value, new CatalogLoader(new URL('catalog/v1/', base), { cache: opened.value.cache }), createHintComputer());
  await controller.initialize();
  return { kind: 'committed', value: controller };
}

/** Explicitly selected recovery play starts a separate, permanently unscored Quick lineage. */
export async function bootstrapEphemeral(base: URL, locale: Locale, forbiddenPuzzleIds: readonly string[] = []): Promise<GameController> {
  const { EphemeralRepository } = await import('../storage/ephemeral.ts');
  const repository = new EphemeralRepository({ ...defaults(locale), forbiddenPuzzleIds });
  const controller = new GameController(repository, new CatalogLoader(new URL('catalog/v1/', base)), createHintComputer());
  await controller.initialize();
  return controller;
}
