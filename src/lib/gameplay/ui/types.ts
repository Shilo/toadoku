import type { Attempt, Band, CompletionReceipt, HintPayload, Preferences, Profile } from '../contracts';
import type { SessionCommand } from '../../session';
export type DialogView = 'more' | 'settings' | 'notes' | 'hint' | 'result' | 'pause' | 'replay' | 'backup' | 'restart' | 'replace' | 'recover';
export type CloseReason = 'dismiss' | 'tool' | 'undo' | 'menu';
export type DialogSaveState = 'saved' | 'saving' | 'unsaved' | 'conflict' | 'unavailable';
export interface RestoreSummary { replaceWallet: number; importedWallet: number; activeAttempts: number; receipts: number; issued: number }
type Action = void | Promise<void>;
export interface GameDialogProps {
  view: DialogView;
  locale: 'en' | 'de' | 'es';
  attempt?: Attempt;
  replayAttempt?: Attempt;
  profile?: Profile;
  preferences: Preferences;
  preferencesAvailable?: boolean;
  receipt?: CompletionReceipt;
  /** Explicit transient Quick choice, bound by the parent to the retained completed attempt. */
  continueBand?: Band;
  /** Only a durably acknowledged payload can be supplied here. */
  hint?: HintPayload;
  hintProblem?: 'no-step' | 'no-target' | 'unavailable';
  busy?: boolean;
  /** Short noncancellable commit/history transitions; hint computation remains cancellable. */
  closingBlocked?: boolean;
  saveState?: DialogSaveState;
  restorePreview?: RestoreSummary;
  restoreError?: boolean;
  exportError?: boolean;
  recoveryProblem?: 'partial' | 'unavailable';
  recoveryBusy?: boolean;
  /** Fixed viewport-relative dock coordinates; the dialog never changes board geometry. */
  anchor?: { left: number; top: number; width: number; height: number; landscape: boolean };
  onCommand: (command: SessionCommand) => Action;
  onNavigate: (view: DialogView) => Action;
  onClose: (reason: CloseReason) => Action;
  onPreference: (preferences: Preferences) => Action;
  onHint: (choice: 'logical' | 'reveal') => Action;
  onContinue: () => Action;
  onReplay: (leap: number, replace: boolean) => Action;
  onRestart: (confirm: boolean) => Action;
  onReplace?: (confirm: boolean) => Action;
  onExport: () => Action;
  /** Nonimportable local-state artifact, distinct from a validated normal backup. */
  onRecovery?: () => Action;
  onResumeSaved?: (confirm: boolean) => Action;
  onRestore: (text: string, confirm: boolean) => Action;
  /** Invalidate root preview/work before any new file read, including clearing the picker. */
  onRestoreInput?: () => void;
  onRetry?: () => Action;
}
