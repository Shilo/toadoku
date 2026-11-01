import { SYSTEM_UI_FONT } from './typography';

/** Presentation inputs only. Theme identity never owns layout or navigation state. */
export interface ThemeTokens {
  readonly id: string;
  readonly water: { readonly deep: string; readonly middle: string; readonly shallow: string };
  readonly ground: { readonly wet: string; readonly dry: string; readonly rim: string; readonly ink: string };
  readonly decoration: { readonly bubble: string; readonly bubbleEdge: string };
  readonly leaf: {
    readonly face: string; readonly lip: string; readonly highlight: string; readonly ink: string;
    readonly selectedFace: string; readonly selectedLip: string; readonly selectedDew: string;
    readonly focus: string; readonly dew: string;
    readonly entryInk: string; readonly noteInk: string; readonly conflictInk: string; readonly rind: string;
  };
  readonly control: {
    readonly face: string; readonly lip: string; readonly highlight: string; readonly ink: string;
    readonly disabledFace: string; readonly disabledInk: string; readonly disabledLip: string;
    readonly focus: string;
    readonly edge: string; readonly selectedEdge: string; readonly disabledEdge: string;
    readonly hoverFace: string; readonly pressedFace: string; readonly selectedFace: string; readonly selectedInk: string;
  };
  readonly typography: {
    readonly titleInk: string;
    readonly controlMin: number; readonly controlMax: number;
    readonly bodySize: number; readonly summarySize: number; readonly smallLabelSize: number;
    readonly summaryLineHeight: number;
    /** Upward ink adjustment in em, without moving or enlarging the fixed paint box. */
    readonly digitBaselineShift: number;
    readonly digitUnderlineStyle: 'solid' | 'wavy'; readonly digitUnderlineOffset: number;
    readonly digitMin: number; readonly digitMax: number; readonly noteMin: number; readonly noteMax: number;
    readonly titleMin: number; readonly titleMax: number;
    readonly uiWeight: number; readonly digitWeight: number; readonly noteWeight: number;
    readonly uiLineHeight: number; readonly titleLineHeight: number; readonly numberLineHeight: number;
  };
  readonly spacing: { readonly small: number; readonly large: number };
  readonly surface: {
    readonly controlRadius: number; readonly controlDepth: number; readonly controlHighlight: number; readonly controlEdgeWidth: number;
    readonly leafSelectedLift: number; readonly leafDefaultLipDepth: number; readonly leafLipDepth: number;
    readonly focusBeadSize: number; readonly focusEdge: string; readonly focusWidth: number;
    readonly dialogRadius: number; readonly artFallbackInk: string;
    readonly buttonRadius: number; readonly windowShadow: string;
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

/** Explicit unit mapping keeps ratios, lengths, timing and stacking unambiguous. */
export function themeStyle(theme: ThemeTokens, uiFontFamily = SYSTEM_UI_FONT, themeFontLoaded = false): string {
  const roles: Record<string, string | number> = {
    'water-deep': theme.water.deep, 'water-middle': theme.water.middle, 'water-shallow': theme.water.shallow,
    'ground-wet': theme.ground.wet, 'ground-dry': theme.ground.dry, 'ground-rim': theme.ground.rim, 'ground-ink': theme.ground.ink,
    'bubble-color': theme.decoration.bubble, 'bubble-edge': theme.decoration.bubbleEdge,
    'leaf-face': theme.leaf.face, 'leaf-lip': theme.leaf.lip, 'leaf-highlight': theme.leaf.highlight,
    'leaf-ink': theme.leaf.ink, 'entry-ink': theme.leaf.entryInk,
    'note-ink': theme.leaf.noteInk, 'conflict-ink': theme.leaf.conflictInk, 'leaf-selected-face': theme.leaf.selectedFace,
    'leaf-selected-lip': theme.leaf.selectedLip, 'leaf-selected-dew': theme.leaf.selectedDew,
    'leaf-focus': theme.leaf.focus, 'leaf-dew': theme.leaf.dew, 'leaf-rind': theme.leaf.rind,
    'control-face': theme.control.face, 'control-lip': theme.control.lip,
    'control-hover-face': theme.control.hoverFace, 'control-pressed-face': theme.control.pressedFace,
    'control-selected-face': theme.control.selectedFace, 'control-selected-ink': theme.control.selectedInk,
    'control-highlight': theme.control.highlight, 'control-ink': theme.control.ink,
    'control-disabled-face': theme.control.disabledFace, 'control-disabled-ink': theme.control.disabledInk,
    'control-disabled-lip': theme.control.disabledLip, 'control-focus': theme.control.focus,
    'control-edge': theme.control.edge, 'control-selected-edge': theme.control.selectedEdge, 'control-disabled-edge': theme.control.disabledEdge,
    'control-edge-width': `${theme.surface.controlEdgeWidth}px`,
    'font-ui': uiFontFamily, 'font-solving': uiFontFamily, 'title-ink': theme.typography.titleInk,
    'type-body': `${theme.typography.bodySize}px`, 'type-summary': `${theme.typography.summarySize}px`,
    'type-small-label': `${theme.typography.smallLabelSize}px`, 'line-summary': theme.typography.summaryLineHeight,
    'digit-baseline-shift': `${themeFontLoaded ? theme.typography.digitBaselineShift : 0}em`,
    'digit-underline-style': themeFontLoaded ? theme.typography.digitUnderlineStyle : 'wavy',
    'digit-underline-offset': `${themeFontLoaded ? theme.typography.digitUnderlineOffset : .1}em`,
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
    'art-fallback-ink': theme.surface.artFallbackInk, 'button-radius': `${theme.surface.buttonRadius}px`,
    'window-shadow': theme.surface.windowShadow,
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
