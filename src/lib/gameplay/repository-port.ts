import type { Repository } from '../storage/repository.ts';

/** The coordinator has one concrete durable repository and an explicit unscored RAM alternative. */
export type GameRepositoryPort = Pick<Repository,
  'readCurrent' | 'readIssued' | 'acquireWriter' | 'saveSnapshot' | 'savePreferences' |
  'disclose' | 'allocate' | 'complete' | 'exportBackup' | 'previewRestore' | 'stageRestore' |
  'activateRestore' | 'close'> & { readonly durability: 'durable' | 'ephemeral'; saveTime?: Repository['saveTime']; cancelBackupWork?: () => void; exportRecovery?: Repository['exportRecovery'] };
