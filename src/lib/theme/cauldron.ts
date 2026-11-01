import type { ThemeTokens } from './tokens';
import type { ThemeDefinition } from './runtime';
import { presentation } from './presentation';
import creepsterUrl from '../../assets/fonts/Creepster-Regular.ttf?url';
import { medallionShape, squashRindPath } from '../leaves/medallion';
import { cauldronVessel as vessel, cauldronLiquid, cauldronBubbles, cauldronLiquidProfile } from '../scene/cauldron';

/** Authored functional geometry and colors, with no illustrated production assets. */
export const cauldron: ThemeTokens = {
  id: 'cauldron',
  water: { deep: '#4D190A', middle: '#BC5B1E', shallow: '#FFD08A' },
  ground: { wet: '#1A1D22', dry: '#30363D', rim: '#899398', ink: '#FFF0CA' },
  decoration: { bubble: '#FFF0CA', bubbleEdge: '#4D190A' },
  leaf: {
    face: '#FFF0CA', lip: '#B66B25', highlight: '#FFF6DF', ink: '#301A13',
    selectedFace: '#FFE09B', selectedLip: '#8B491F', selectedDew: '#5A2C16',
    focus: '#FFF6DF', dew: '#FFD08A', entryInk: '#50331E', noteInk: '#301A13', conflictInk: '#8A241D', rind: '#B66B25',
  },
  control: {
    face: '#FFF0CA', lip: '#FFEAC6', highlight: '#FFF6DF', ink: '#301A13',
    hoverFace: '#FFF6DF', pressedFace: '#FFEAC6', selectedFace: '#50331E', selectedInk: '#FFF0CA',
    edge: '#9E784D', selectedEdge: '#D1B88B', disabledEdge: '#9DA7AB',
    disabledFace: '#454A50', disabledInk: '#BEC2C0', disabledLip: '#30363D', focus: '#50331E',
  },
  typography: {
    ...presentation.typography,
    ui: '"Outfit", system-ui, sans-serif', title: '"Creepster", "Outfit", system-ui, sans-serif',
    titleInk: '#FFF0CA', digitMin: 17, digitMax: 32, noteMin: 4.5, noteMax: 11,
    titleWeight: 400, uiWeight: 600, digitWeight: 600, noteWeight: 500, numberLineHeight: 1,
  },
  spacing: presentation.spacing,
  surface: {
    ...presentation.surface,
    controlRadius: 20, controlDepth: 2, controlHighlight: 1, controlEdgeWidth: 1.5,
    focusBeadSize: 3, focusEdge: '#301A13', focusWidth: 2,
    dialogRadius: 28, artFallbackInk: '#301A13', buttonRadius: 12,
    windowShadow: '0 8px 0 #1A1D22',
  },
  geometry: presentation.geometry,
  motion: { ...presentation.motion, waterPeriod: cauldronLiquidProfile.period * 1000 },
  layer: { water: 0, shore: 1, objects: 2, controls: 3, dialog: 4 },
  dialog: { surface: '#FFF0CA', edge: '#9E784D', ink: '#301A13', backdrop: 'rgb(26 29 34 / 45%)' },
  transition: { duration: 140, easing: 'ease-out', reducedDuration: 0 },
};
export const cauldronDark: ThemeTokens = {
  ...cauldron,
  control: { ...cauldron.control, face: '#30363D', lip: '#41474E', highlight: '#61696D', ink: '#FFF0CA',
    hoverFace: '#41474E', pressedFace: '#252B31', selectedFace: '#FFE09B', selectedInk: '#301A13', focus: '#FFD08A',
    edge: '#9DA7AB', selectedEdge: '#6B3D1C' },
  dialog: { surface: '#252B31', edge: '#9DA7AB', ink: '#FFF0CA', backdrop: 'rgb(26 29 34 / 55%)' },
};
export const definition: ThemeDefinition = {
  light: cauldron, dark: cauldronDark,
  font: { family: 'Creepster', url: creepsterUrl },
  cellPath: id => medallionShape(id).path, cellDetail: squashRindPath, vessel,
  liquid: cauldronLiquid, bubbles: cauldronBubbles,
};
