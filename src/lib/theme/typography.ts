/** Shared fallback and solving typography; themes own at most one optional UI face. */
export const SYSTEM_UI_FONT = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export interface Wordmark {
  readonly path: string;
  readonly viewBox: string;
  readonly width: number;
  readonly height: number;
  readonly advanceWidth: number;
  readonly unitsPerEm: number;
}
