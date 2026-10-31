/** Presentation inputs only. Theme identity never owns layout or navigation state. */
export interface ThemeTokens {
  readonly id: string;
  readonly water: { readonly deep: string; readonly middle: string; readonly shallow: string };
  readonly ground: { readonly wet: string; readonly dry: string };
  readonly leaf: {
    readonly face: string; readonly lip: string; readonly highlight: string; readonly ink: string;
    readonly selectedFace: string; readonly selectedLip: string; readonly selectedDew: string;
    readonly focus: string; readonly dew: string;
  };
  readonly control: {
    readonly face: string; readonly lip: string; readonly highlight: string; readonly ink: string;
    readonly disabledFace: string; readonly disabledInk: string; readonly disabledLip: string;
    readonly focus: string;
  };
  readonly typography: {
    readonly ui: string; readonly title: string; readonly titleInk: string;
    readonly controlMin: number; readonly controlMax: number;
    readonly digitMin: number; readonly digitMax: number; readonly noteMin: number; readonly noteMax: number;
    readonly titleMin: number; readonly titleMax: number;
    readonly uiWeight: number; readonly digitWeight: number; readonly noteWeight: number;
    readonly uiLineHeight: number; readonly titleLineHeight: number; readonly numberLineHeight: number;
  };
  readonly spacing: { readonly small: number; readonly large: number };
  readonly surface: {
    readonly controlRadius: number; readonly controlDepth: number; readonly controlHighlight: number;
    readonly leafSelectedLift: number; readonly leafDefaultLipDepth: number; readonly leafLipDepth: number;
    readonly focusBeadSize: number; readonly focusEdge: string; readonly focusWidth: number;
    readonly dialogRadius: number; readonly artFallbackInk: string;
  };
  readonly geometry: {
    readonly leafRadius: number; readonly leafControlRadius: number; readonly opaqueRadius: number;
    readonly cleftMinDepth: number; readonly cleftMaxDepth: number;
    readonly waterClearance: number; readonly shorelineBank: number;
    readonly menuShoreAmplitude: number; readonly gameShoreAmplitude: number; readonly backgroundBleed: number;
    readonly seed: number;
  };
  readonly motion: {
    readonly leafTravel: number; readonly identityTravel: number;
    readonly floatMinPeriod: number; readonly floatMaxPeriod: number;
    readonly waterPeriod: number; readonly updateRate: number;
  };
  readonly layer: {
    readonly water: number; readonly shore: number; readonly objects: number; readonly controls: number;
    readonly dialog: number;
  };
  readonly dialog: { readonly surface: string; readonly edge: string; readonly ink: string; readonly backdrop: string };
  readonly transition: { readonly duration: number; readonly easing: string; readonly reducedDuration: number };
}

export const pond = {
  id: 'pond',
  water: { deep: '#0D6267', middle: '#329D9A', shallow: '#7ED1B8' },
  ground: { wet: '#6D9F81', dry: '#B6BA86' },
  leaf: {
    face: '#D0F2A0', lip: '#87BB69', highlight: '#EFF7AC', ink: '#173F35',
    selectedFace: '#EFF7AC', selectedLip: '#5D8B4E', selectedDew: '#FFF5D9',
    focus: '#FFFDF1', dew: '#7ED1B8',
  },
  control: {
    face: '#FFF5D9', lip: '#D0D4AD', highlight: '#FFFDF1', ink: '#173F35',
    disabledFace: '#B6C9C7', disabledInk: '#6D9491', disabledLip: '#A6BDB8', focus: '#173F35',
  },
  typography: {
    ui: '"Outfit", system-ui, sans-serif', title: '"Chewy", "Outfit", system-ui, sans-serif',
    titleInk: '#FFF5D9', controlMin: 16, controlMax: 22,
    digitMin: 17, digitMax: 32, noteMin: 4.5, noteMax: 11, titleMin: 44, titleMax: 80,
    uiWeight: 600, digitWeight: 600, noteWeight: 500,
    uiLineHeight: 1.15, titleLineHeight: 1.05, numberLineHeight: 1,
  },
  spacing: { small: 4, large: 8 },
  surface: {
    controlRadius: 20, controlDepth: 4, controlHighlight: 1,
    leafSelectedLift: 0.9, leafDefaultLipDepth: 0.8, leafLipDepth: 0.95,
    focusBeadSize: 3, focusEdge: '#173F35', focusWidth: 2,
    dialogRadius: 28, artFallbackInk: '#173F35',
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
  dialog: { surface: '#B6BA86', edge: '#6D9F81', ink: '#173F35', backdrop: 'rgb(23 63 53 / 35%)' },
  transition: { duration: 140, easing: 'ease-out', reducedDuration: 0 },
} as const satisfies ThemeTokens;

/** Explicit unit mapping keeps ratios, lengths, timing and stacking unambiguous. */
export function themeStyle(theme: ThemeTokens = pond): string {
  const roles: Record<string, string | number> = {
    'water-deep': theme.water.deep, 'water-middle': theme.water.middle, 'water-shallow': theme.water.shallow,
    'ground-wet': theme.ground.wet, 'ground-dry': theme.ground.dry,
    'leaf-face': theme.leaf.face, 'leaf-lip': theme.leaf.lip, 'leaf-highlight': theme.leaf.highlight,
    'leaf-ink': theme.leaf.ink, 'leaf-selected-face': theme.leaf.selectedFace,
    'leaf-selected-lip': theme.leaf.selectedLip, 'leaf-selected-dew': theme.leaf.selectedDew,
    'leaf-focus': theme.leaf.focus, 'leaf-dew': theme.leaf.dew,
    'control-face': theme.control.face, 'control-lip': theme.control.lip,
    'control-highlight': theme.control.highlight, 'control-ink': theme.control.ink,
    'control-disabled-face': theme.control.disabledFace, 'control-disabled-ink': theme.control.disabledInk,
    'control-disabled-lip': theme.control.disabledLip, 'control-focus': theme.control.focus,
    'font-ui': theme.typography.ui, 'font-title': theme.typography.title, 'title-ink': theme.typography.titleInk,
    'type-control-min': `${theme.typography.controlMin}px`, 'type-control-max': `${theme.typography.controlMax}px`,
    'type-digit-min': `${theme.typography.digitMin}px`, 'type-digit-max': `${theme.typography.digitMax}px`,
    'type-note-min': `${theme.typography.noteMin}px`, 'type-note-max': `${theme.typography.noteMax}px`,
    'type-title-min': `${theme.typography.titleMin}px`, 'type-title-max': `${theme.typography.titleMax}px`,
    'weight-ui': theme.typography.uiWeight, 'weight-digit': theme.typography.digitWeight,
    'weight-note': theme.typography.noteWeight, 'line-ui': theme.typography.uiLineHeight,
    'line-title': theme.typography.titleLineHeight, 'line-number': theme.typography.numberLineHeight,
    'space-small': `${theme.spacing.small}px`, 'space-large': `${theme.spacing.large}px`,
    'control-radius': `${theme.surface.controlRadius}px`, 'control-depth': `${theme.surface.controlDepth}px`,
    'control-highlight-width': `${theme.surface.controlHighlight}px`,
    'leaf-selected-lift': `${theme.surface.leafSelectedLift}px`,
    'leaf-default-lip-depth': `${theme.surface.leafDefaultLipDepth}px`, 'leaf-lip-depth': `${theme.surface.leafLipDepth}px`,
    'focus-bead-size': `${theme.surface.focusBeadSize}px`, 'focus-edge': theme.surface.focusEdge,
    'focus-width': `${theme.surface.focusWidth}px`, 'dialog-radius': `${theme.surface.dialogRadius}px`,
    'art-fallback-ink': theme.surface.artFallbackInk,
    'leaf-radius': theme.geometry.leafRadius, 'leaf-control-radius': theme.geometry.leafControlRadius,
    'leaf-opaque-radius': theme.geometry.opaqueRadius, 'cleft-min-depth': theme.geometry.cleftMinDepth,
    'cleft-max-depth': theme.geometry.cleftMaxDepth, 'water-clearance': `${theme.geometry.waterClearance}px`,
    'shoreline-bank': `${theme.geometry.shorelineBank}px`,
    'menu-shore-amplitude': `${theme.geometry.menuShoreAmplitude}px`,
    'game-shore-amplitude': `${theme.geometry.gameShoreAmplitude}px`, 'background-bleed': `${theme.geometry.backgroundBleed}px`,
    'motion-leaf-travel': `${theme.motion.leafTravel}px`, 'motion-identity-travel': `${theme.motion.identityTravel}px`,
    'motion-float-min-period': `${theme.motion.floatMinPeriod}ms`, 'motion-float-max-period': `${theme.motion.floatMaxPeriod}ms`,
    'motion-water-period': `${theme.motion.waterPeriod}ms`, 'motion-update-rate': theme.motion.updateRate,
    'layer-water': theme.layer.water, 'layer-shore': theme.layer.shore, 'layer-objects': theme.layer.objects,
    'layer-controls': theme.layer.controls, 'layer-dialog': theme.layer.dialog,
    'dialog-surface': theme.dialog.surface, 'dialog-edge': theme.dialog.edge,
    'dialog-ink': theme.dialog.ink, 'dialog-backdrop': theme.dialog.backdrop,
    'transition-duration': `${theme.transition.duration}ms`, 'transition-easing': theme.transition.easing,
    'transition-reduced-duration': `${theme.transition.reducedDuration}ms`,
  };
  return Object.entries(roles).map(([role, value]) => `--${role}:${value}`).join(';');
}
