# Similar tones for 3 by 3 regions

Research date: 2026-10-31. Status: recommendation for visual comparison, not implementation approval. This review follows the broad CSS pad-face proposal in [the board review](top-down-pond-board.md). It adds no interface or production artwork.

## Recommendation

Compare two similar opaque green pad tones first, alternating by whole 3 by 3 region. Keep the wider water gutters after rows and columns 3 and 6 as the independent spatial cue. This reinforces the Sudoku structure directly while leaving the pond background quiet. It is a design inference requiring actual-size review, not a proven usability result.

Use this arrangement of nine regions, each containing nine same-tone pads:

```text
A B A
B A B
A B A
```

Do not alternate individual cells. Both tones mean ordinary playable cells; neither means selection, validity, difficulty or a different rule. Keep the same given/entry distinction, fixed candidate positions, selection, keyboard focus and conflict cues on both tones.

| Comparison | Advantage | Risk | Constraint for the mockup |
| --- | --- | --- | --- |
| A. Two similar pad tones | The large opaque faces carry the grouping cue where the player looks; water can remain one calm field | Strong light/dark differences become a checkerboard of interface tiles; varying hue alone may disappear for some viewers | Similar greens, identical geometry and finish, whole-region alternation, gutters retained |
| B. One pad tone with water undertones | Preserves a uniform family of pads; broad patches can suggest a flat pond environment | Water is a smaller visible area, so the cue can be weak; nine sharp rectangular backings read as cards; loose patches may imply incorrect region boundaries | Flat, low-detail, broad patches beneath the nine groups; no outlines, raised trays or competing shapes; gutters retained |

For B, the useful compromise is soft irregular patch edges within the correct region footprint. They must not cross gutters in a way that groups cells from adjacent regions. If the patches must become rectangular, brighter, outlined or highly textured to make the boxes understandable, prefer A. Background decoration should not compete with the puzzle's actual grouping.

## Flat water direction

Use a mostly uniform CSS water color with very few large abstract shapes. Avoid detailed ripples, repeated rings around every pad, translucent aquarium lighting, glows, caustics, realistic waves, large gradients and visible depth effects. A flat irregular color patch is sufficient. The menu can reuse that same restrained water language without a Sudoku-region pattern.

Preserve broad rounded pad faces inside full rectangular hitboxes, the small board/dock safety gap, cream soft-raised input keys, the disabled tenth More key, and the existing portrait/landscape dock layouts. This comparison adds no grid lines, outer frame, gameplay mascot or status strip.

## Example colors and contrast limits

These are starting values for a CSS comparison, not a selected palette or measurements from generated imagery. Ratios use the WCAG sRGB relative-luminance calculation on opaque fills.

| Role | Example | Contrast |
| --- | --- | --- |
| Pad A | `#A8CC86` | Dark ink below: approximately 6.56:1 |
| Pad B | `#93BB79` | Dark ink below: approximately 5.42:1 |
| Shared digit/note ink | `#173E34` | Both ordinary pad fills exceed 4.5:1 |
| Water | `#2D6265` | Pad A: approximately 3.82:1; pad B: approximately 3.16:1 |
| Difference between pad tones | A against B | Approximately 1.21:1, intentionally subtle |

These values show that similar region fills can retain readable dark digits and notes. Text normally requires 4.5:1 contrast; qualifying large text has an exception, but small notes do not. Check every selected, focused, conflicting and entered state against its actual background. A passing fill pair does not prove readable type size or weight. [W3C, Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Do not demand 3:1 between the two decorative region tones when spacing independently communicates the boxes. If tone becomes necessary to recognize a region, it is functional information and requires a different assessment. Required control/state graphics need adequate contrast against adjacent colors. Check blank pad faces too, since empty cells lack digit content that could identify them as controls. [W3C, Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Color must not be the only region, selection or conflict cue. Spatial gutters provide another visual cue for regions; focus and conflict still need their own stable non-color treatment. [W3C, Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

## Comparison checks

Show the same board, values, notes and active states in both versions at the same scale. Review region recognition in grayscale as well as color, including edge regions and a nine-note cell. Compare actual portrait and landscape allocation later without interpreting incidental ImageGen spacing as a specification.

Favor A if it makes boxes easier to recognize without producing an overpowering checkerboard. Favor B only if its quiet patches remain perceptible and correctly aligned without becoming nine cards. If neither remains clear without color, revisit gutter geometry first. Keep any ImageGen comparisons clearly temporary under ignored `/prototypes/`; production illustration remains human-made under the [artwork policy](../design.md#artwork-policy).
