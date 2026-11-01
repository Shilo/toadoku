import balooUrl from '../../assets/fonts/Baloo2-UI.woff2?url';
import type { ThemeDefinition } from './runtime';
import type { ThemeTokens } from './tokens';
import { themeStyle as mapThemeStyle } from './tokens';
import { pondLiquid, shore } from '../scene/geometry';
import { leafShape } from '../leaves/shape';
import { wordmark } from './wordmarks/pond';
export type { ThemeTokens } from './tokens';

export const pond = {
  id: 'pond',
  water: { deep: '#0D6267', middle: '#329D9A', shallow: '#7ED1B8' },
  ground: { wet: '#6D9F81', dry: '#B6BA86', rim: '#4D7E68', ink: '#173F35' },
  decoration: { bubble: '#EFF7AC', bubbleEdge: '#173F35' },
  leaf: {
    face: '#D0F2A0', lip: '#87BB69', highlight: '#EFF7AC', ink: '#173F35',
    selectedFace: '#EFF7AC', selectedLip: '#5D8B4E', selectedDew: '#FFF5D9',
    focus: '#FFFDF1', dew: '#7ED1B8',
    entryInk: '#173F35', noteInk: '#173F35', conflictInk: '#173F35', rind: '#87BB69',
  },
  control: {
    face: '#FFF5D9', lip: '#D0D4AD', highlight: '#FFFDF1', ink: '#173F35',
    disabledFace: '#B6C9C7', disabledInk: '#6D9491', disabledLip: '#A6BDB8', focus: '#173F35',
    hoverFace: '#FFFDF1', pressedFace: '#FFF5D9', selectedFace: '#173F35', selectedInk: '#FFF5D9',
    edge: '#6D9F81', selectedEdge: '#A7C4B4', disabledEdge: '#A6BDB8',
  },
  typography: {
    titleInk: '#FFF5D9', controlMin: 16, controlMax: 22,
    digitMin: 17, digitMax: 32, noteMin: 4.5, noteMax: 11, titleMin: 44, titleMax: 80,
    uiWeight: 600, digitWeight: 600, noteWeight: 500,
    uiLineHeight: 1.15, titleLineHeight: 1.05, numberLineHeight: 1,
  },
  spacing: { small: 4, large: 8 },
  surface: {
    controlRadius: 20, controlDepth: 4, controlHighlight: 1, controlEdgeWidth: 0,
    leafSelectedLift: 0.9, leafDefaultLipDepth: 0.8, leafLipDepth: 0.95,
    focusBeadSize: 3, focusEdge: '#173F35', focusWidth: 2,
    dialogRadius: 28, artFallbackInk: '#173F35',
    buttonRadius: 12, windowShadow: '0 8px 0 #6D9F81',
  },
  geometry: {
    leafRadius: 0.441, leafControlRadius: 0.4487, opaqueRadius: 0.36,
    cleftMinDepth: 0.04, cleftMaxDepth: 0.06,
    waterClearance: 1.5, shorelineBank: 14, menuShoreAmplitude: 24, gameShoreAmplitude: 18,
    backgroundBleed: 64, seed: 1807,
  },
  motion: {
    leafTravel: 0.48, identityTravel: 1.8, floatMinPeriod: 12000, floatMaxPeriod: 20000,
    waterPeriod: 24000, updateRate: 30,
  },
  layer: { water: 0, shore: 1, objects: 2, controls: 3, dialog: 4 },
  dialog: { surface: '#FFF5D9', edge: '#6D9F81', ink: '#173F35', backdrop: 'rgb(23 63 53 / 18%)' },
  transition: { duration: 140, easing: 'ease-out', reducedDuration: 0 },
} as const satisfies ThemeTokens;

/** Compatibility entry point; runtime consumers import the eager mapper directly. */
export const themeStyle = (theme: ThemeTokens = pond): string => mapThemeStyle(theme);

/** Appearance changes surfaces only; the maintained Pond scene and cells stay exact. */
export const pondDark: ThemeTokens = {
  ...pond,
  control: { ...pond.control, face: '#203D36', lip: '#35574C', highlight: '#466A5B', ink: '#FFF5D9',
    hoverFace: '#35574C', pressedFace: '#172D28', selectedFace: '#FFF5D9', selectedInk: '#173F35',
    focus: '#FFF5D9', edge: '#A7C4B4', selectedEdge: '#173F35', disabledEdge: '#7D9189', disabledFace: '#30433F', disabledInk: '#7D9189', disabledLip: '#243832' },
  surface: { ...pond.surface, controlEdgeWidth: 1.5, windowShadow: '0 8px 0 #172D28' },
  dialog: { surface: '#203D36', edge: '#A7C4B4', ink: '#FFF5D9', backdrop: 'rgb(12 28 24 / 45%)' },
};
export const definition: ThemeDefinition = {
  light: pond, dark: pondDark, font: { family: 'ToadokuPondUI', url: balooUrl, weight: '400 700' }, wordmark,
  liquid: pondLiquid, vessel: shore,
  cellPath: id => leafShape(id).path,
};
