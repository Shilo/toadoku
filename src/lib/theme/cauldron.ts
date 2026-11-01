import type { ThemeTokens } from './tokens';
import type { ThemeDefinition } from './runtime';
import { presentation } from './presentation';
import creepsterUrl from '../../assets/fonts/Creepster-Regular.ttf?url';
import { medallionShape } from '../leaves/medallion';
import { cauldronVessel as vessel } from '../scene/cauldron';

/** Authored functional geometry and colors, with no illustrated production assets. */
export const cauldron: ThemeTokens = {
  id: 'cauldron',
  water: { deep: '#230C39', middle: '#8A4DBB', shallow: '#E1BDF6' },
  ground: { wet: '#171B22', dry: '#303744' },
  leaf: {
    face: '#F5BB65', lip: '#AF6A30', highlight: '#FFE0A0', ink: '#291B33',
    selectedFace: '#FFE0A0', selectedLip: '#845028', selectedDew: '#FFF1DB',
    focus: '#FFF1DB', dew: '#E1BDF6', entryInk: '#49305F', noteInk: '#291B33', conflictInk: '#79271F',
  },
  control: {
    face: '#E9D9C5', lip: '#C6B29C', highlight: '#FFF1DB', ink: '#291B33',
    hoverFace: '#FFF1DB', pressedFace: '#D9C2A9', selectedFace: '#49305F', selectedInk: '#FFF1DB',
    disabledFace: '#45434B', disabledInk: '#A49BA8', disabledLip: '#30303A', focus: '#291B33',
  },
  typography: {
    ...presentation.typography,
    ui: '"Outfit", system-ui, sans-serif', title: '"Creepster", "Outfit", system-ui, sans-serif',
    titleInk: '#FFF1DB', digitMin: 17, digitMax: 32, noteMin: 4.5, noteMax: 11,
    uiWeight: 600, digitWeight: 600, noteWeight: 500, numberLineHeight: 1,
  },
  spacing: presentation.spacing,
  surface: {
    ...presentation.surface,
    controlRadius: 12, controlDepth: 2, controlHighlight: 1,
    focusBeadSize: 3, focusEdge: '#291B33', focusWidth: 2,
    dialogRadius: 24, artFallbackInk: '#291B33', buttonRadius: 10,
    windowShadow: '0 8px 0 #171B22',
  },
  geometry: presentation.geometry,
  motion: presentation.motion,
  layer: { water: 0, shore: 1, objects: 2, controls: 3, dialog: 4 },
  dialog: { surface: '#E9D9C5', edge: '#8B6C9D', ink: '#291B33', backdrop: 'rgb(16 10 24 / 45%)' },
  transition: { duration: 140, easing: 'ease-out', reducedDuration: 0 },
};
export const cauldronDark: ThemeTokens = {
  ...cauldron,
  control: { ...cauldron.control, face: '#303744', lip: '#485263', highlight: '#616D7E', ink: '#FFF1DB',
    hoverFace: '#485263', pressedFace: '#171B22', selectedFace: '#FFE0A0', selectedInk: '#291B33', focus: '#FFF1DB' },
  dialog: { surface: '#303744', edge: '#616D7E', ink: '#FFF1DB', backdrop: 'rgb(16 10 24 / 55%)' },
};
export const definition: ThemeDefinition = {
  light: cauldron, dark: cauldronDark,
  font: { family: 'Creepster', url: creepsterUrl },
  cellPath: id => medallionShape(id).path, vessel,
};
