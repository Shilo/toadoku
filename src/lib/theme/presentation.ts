/** Fixed safety/layout budgets. Theme implementations must preserve these invariants. */
export const presentation = {
  spacing: { small: 4, large: 8 },
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
  typography: {
    controlMin: 16, controlMax: 22, uiLineHeight: 1.15, titleMax: 80, titleMin: 44, titleLineHeight: 1.05,
    noteMax: 11,
    gridDigitScale: .68, gridDigitMax: 36,
  },
  surface: { leafDefaultLipDepth: 0.8, leafSelectedLift: 0.9, leafLipDepth: 0.95, focusBeadSize: 3 },
} as const;
