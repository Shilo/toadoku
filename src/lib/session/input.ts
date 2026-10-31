import type { SessionCommand } from './reducer.ts';

export interface KeyInput {
  key: string;
  repeat?: boolean;
  isComposing?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}
export interface InputScope {
  active: boolean;
  modal: boolean;
  editable: boolean;
  platform: 'mac' | 'other';
  selection: number;
}

/** The controller supplies scope; no DOM/global shortcuts live in the pure input mapping. */
export function commandForKey(event: KeyInput, scope: InputScope): SessionCommand | undefined {
  if (!scope.active || scope.modal || scope.editable || event.isComposing || event.altKey) return;
  const undoModifier = scope.platform === 'mac' ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (event.ctrlKey || event.metaKey) return undoModifier && !event.shiftKey && !event.repeat && event.key.toLowerCase() === 'z' ? { type: 'undo' } : undefined;
  if (event.shiftKey) return;
  const cell = scope.selection;
  if (!Number.isInteger(cell) || cell < 0 || cell > 80) return;
  const row = Math.floor(cell / 9), col = cell % 9;
  switch (event.key) {
    case 'ArrowLeft': return { type: 'select', cell: row * 9 + Math.max(0, col - 1) };
    case 'ArrowRight': return { type: 'select', cell: row * 9 + Math.min(8, col + 1) };
    case 'ArrowUp': return { type: 'select', cell: Math.max(0, row - 1) * 9 + col };
    case 'ArrowDown': return { type: 'select', cell: Math.min(8, row + 1) * 9 + col };
    case 'Home': return { type: 'select', cell: row * 9 };
    case 'End': return { type: 'select', cell: row * 9 + 8 };
  }
  if (event.repeat) return;
  if (/^[1-9]$/.test(event.key)) return { type: 'enter', digit: Number(event.key) };
  if (event.key === 'Backspace' || event.key === 'Delete') return { type: 'erase' };
  if (event.key.toLowerCase() === 'n') return { type: 'toggle-notes' };
}
