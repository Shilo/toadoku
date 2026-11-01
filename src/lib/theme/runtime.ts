import { resolveAppearance, resolveTheme, type AppearanceId, type ThemeId } from './policy';
import type { ThemeTokens } from './tokens';
import type { Layout } from '../layout';
import type { LiquidFrame, SceneBubble, VesselRenderer } from '../scene/types';
import { SYSTEM_UI_FONT, type Wordmark } from './typography';

export interface ThemeFont { readonly family: string; readonly url: string; readonly weight?: string }
export interface ThemeDefinition {
  readonly light: ThemeTokens;
  readonly dark: ThemeTokens;
  /** One optional UI font. Solving numerals remain shared; branding is baked vector data. */
  readonly font?: ThemeFont;
  readonly wordmark: Wordmark;
  readonly cellPath: (id: number) => string;
  readonly cellDetail?: (id: number) => string;
  readonly liquid: (layout: Layout, screen: 'menu' | 'game', time: number) => LiquidFrame;
  readonly bubbles?: (layout: Layout, screen: 'menu' | 'game', time: number) => readonly SceneBubble[];
  readonly vessel: VesselRenderer;
}
export interface AppliedTheme {
  readonly id: ThemeId;
  readonly appearance: AppearanceId;
  readonly tokens: ThemeTokens;
  readonly fontFallback: boolean;
  readonly uiFontFamily: string;
  readonly definition: ThemeDefinition;
}
/** Registration is delayed until the winning request; timed-out/stale faces cannot swap later. */
export type ThemeFontLoader = (font: ThemeFont) => Promise<void | (() => void)>;
export interface ThemeRuntimeOptions {
  load?: (id: ThemeId) => Promise<ThemeDefinition>;
  loadFont?: ThemeFontLoader;
  onChange: (theme: AppliedTheme) => void;
  onError?: (error: unknown) => void;
}

export const loadThemeDefinition = async (id: ThemeId): Promise<ThemeDefinition> =>
  id === 'cauldron' ? (await import('./cauldron')).definition : (await import('./pond')).definition;

const FONT_WAIT_MS = 5000;
/** Font failures are supported fallback typography, while chunk failures retain the old theme. */
export async function loadThemeFont(font: ThemeFont): Promise<() => void> {
  const face = new FontFace(font.family, `url("${font.url}")`, { weight: font.weight ?? '400', display: 'swap' });
  await face.load();
  return () => { document.fonts.add(face); };
}

function boundedFont(font: ThemeFont, load: ThemeFontLoader): Promise<void | (() => void)> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    Promise.resolve().then(() => load(font)),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('theme-font-timeout')), FONT_WAIT_MS); }),
  ]).finally(() => clearTimeout(timer));
}

/** One atomic publication after both awaits. No theme module writes CSS or gameplay state. */
export function createThemeRuntime(options: ThemeRuntimeOptions) {
  const load = options.load ?? loadThemeDefinition, loadFont = options.loadFont ?? loadThemeFont;
  let generation = 0, disposed = false, appliedKey: string | undefined;
  let pendingKey: string | undefined, pending: Promise<void> | undefined;
  const fonts = new Map<string, Promise<void | (() => void)>>();
  function readyFont(font: ThemeFont) {
    const key = `${font.family}:${font.url}:${font.weight ?? '400'}`;
    let ready = fonts.get(key);
    if (!ready) {
      ready = boundedFont(font, loadFont).catch(error => { fonts.delete(key); throw error; });
      fonts.set(key, ready);
    }
    return ready;
  }
  return {
    request(choice: string, appearanceChoice: string, date = new Date(), systemDark = false): Promise<void> {
      if (disposed) return Promise.resolve();
      const id = resolveTheme(choice, date), appearance = resolveAppearance(appearanceChoice, systemDark);
      const key = `${id}:${appearance}`;
      if (key === pendingKey && pending) return pending;
      const request = ++generation;
      pendingKey = undefined;
      pending = undefined;
      if (key === appliedKey) return Promise.resolve();
      const current = () => !disposed && request === generation;
      pendingKey = key;
      pending = (async () => {
        try {
          const definition = await load(id);
          if (!current()) return;
          let fontFallback = false, register: void | (() => void) = undefined;
          if (definition.font) {
            try { register = await readyFont(definition.font); }
            catch { fontFallback = true; }
          }
          if (!current()) return;
          register?.();
          const tokens = definition[appearance];
          appliedKey = fontFallback ? undefined : key;
          const uiFontFamily = definition.font && !fontFallback
            ? `${JSON.stringify(definition.font.family)}, ${SYSTEM_UI_FONT}` : SYSTEM_UI_FONT;
          options.onChange({ id, appearance, tokens, fontFallback, uiFontFamily, definition });
        } catch (error) {
          if (current()) options.onError?.(error);
        } finally {
          if (current()) { pendingKey = undefined; pending = undefined; }
        }
      })();
      return pending;
    },
    dispose() { disposed = true; generation++; pendingKey = undefined; pending = undefined; },
  };
}
