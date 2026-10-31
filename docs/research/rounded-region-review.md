# Rounded regions on continuous pond water

Date: 2026-10-31. Status: proposed geometry under visual review, not implementation approval.

## Direction

The subtle alternating pad greens were ineffective; nine rectangular water backings looked like UI panels. Keep flat styling but restore broad organic curving water/shallows from the earlier abstract theme. Flat means solid color shapes, not an empty background. Avoid rings, reflections, textures and environment gradients. The menu may show more curves than gameplay, where they must not confuse the Sudoku regions.

Use this water-underlay mask, with regions numbered row-major:

```text
Base     Rounded  Base
Rounded  Base     Rounded
Base     Rounded  Base
```

Base is one continuous layer, not five square containers. Only regions 2, 4, 6 and 8 have lighter filled patches with rounded corners. No yellow outlines from the annotation, borders, shadows or raised trays. Keep pad faces uniform and cream input keys distinct. Rounding applies to the region underlay, not the 3 by 3 hitbox collection. Preserve all 81 complete rectangular hitboxes and fixed note positions.

Recommendation: explore this proposal because it replaces the nine-panel appearance with four shapes over connected negative space. Challenge: corners alone cannot reliably identify all nine boxes, and pads obscure much of the background. Preserve wider gutters after rows/columns 3 and 6. Do not increase gaps or reserve scenery bands at the expense of board space. A patch must stay aligned to its exact region when changing orientation or switching Fill space/Square. Keep the underlying logical board and accessible reading order unchanged; a noninteractive CSS underlay is sufficient, without a game engine or new asset system.

## Naming

Use **rounded checkerboard on a continuous background** as a descriptive working name, not a claim of a standardized pattern. Interlocking rounded checkerboard communicates the intent, though the four patches are not literally interlocking tiles. Flush-fit capsule grid is less precise because these are rounded rectangles rather than full capsules.

Truchet tiling is a related visual reference for continuous geometry from repeated decorated tiles, but it does not precisely describe this four-patch mask. Avoid naming the implementation Truchet solely because it has curves. [Open University, Making Patterns](https://www.open.edu/openlearn/mod/oucontent/view.php?id=159219&section=7).

## Accessibility and review

Require regions to remain recognizable without hue: combine shape, spatial gutters and lightness. Do not assume a particular kind of color vision or declare a design accessible from one simulation. Example proposed opaque water fills `#183F43` and `#4D9994` have approximately 3.44:1 sRGB contrast; those values are starting tokens, not measured colors from the generated picture. Check actual rendered boundaries and pad/ink contrast as well. [W3C, Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [W3C, Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Review the nine regions in grayscale, color-vision simulations and at target phone CSS sizes in both orientations. Test a nine-note cell, blank pads, selection, focus, conflicts and entry/given distinctions independently. Neither blue entries in a generated image nor rounded shapes certify those states. If boxes remain unclear, strengthen geometry or spacing before adding decoration. Exact radius, fills and gutter sizes remain open.

Temporary ImageGen concept and exact prompts: ignored `prototypes/rounded-water-regions/`. The initial image reserved unwanted scenery bands; the correction expands gameplay toward the full allocation. Both remain illustrative: generated texture, color, notes, lost notches or incidental spacing are not approved specifications. No production art or interface code is added. Retain the existing rough single composite menu placeholder; no extra decorative sprites are selected.
