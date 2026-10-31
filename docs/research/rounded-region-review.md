# Rounded regions on continuous pond water

Date: 2026-10-31. Status: B, Winding shallows, selected as the board direction; A preserved. No production implementation approval.

## Latest refinement: three-color organic pond

Menu and gameplay must share exactly three flat water colors, with broad abstract pond curves. Keep green notched pad faces and cream menu/input buttons in the approved soft-raised finish. The preceding image's flattened pads or lost notches were rendering errors, not a design decision. Background-only changes must preserve faces, lips, highlights and typography. Water cannot gain extra shades through opacity/gradient/texture; the three-color limit excludes controls, ink and placeholder art.

The annotation asks for selective natural curves at top/bottom group seams, not yellow outlines. **A, Connected bays**, `A B A / C A C / A B A`, preserves four patches over connected ground; retain it as an alternative. **B, Winding shallows**, `A B C / B C A / C A B`, distributes the three fills among all regions with winding shared edges; it is selected for the more natural appearance. Visual preference is not proof of usability. The older two-color four-radius mask below is preserved history.

Keep each full 3 by 3 pad group inside one color, including its lips and immediate surrounding water. Irregular contours belong only in the existing inter-region channels and perimeter seams. They must not bisect pads or intragroup spaces, change cell positions/hitboxes, or require extra scenery gaps. Use a few restrained asymmetric bends, not nine highly wobbly outlines. Geometry and spacing must still communicate boxes when hues disappear. Review both orientations and nine-note readability before selecting the mask; image generation alone cannot prove this.

Temporary comparison and exact built-in ImageGen prompts: ignored `prototypes/organic-three-color-pond/`. Three proposed water tokens for this study are `#0D6267`, `#329D9A`, `#7ED1B8`, shared by both scenes; these are proposals, not certified measurements from generated pixels. The corrected sheet remains a background study: its residual outer/group gaps, texture and typography are not a replacement layout specification. No implementation or production artwork is added.

## Selected spacing and measured follow-up

Use only small 4px and large 8px authored spacing. Small separates pads/buttons; large applies at scene edges, between groups and between board/dock. The latest edge inset supersedes earlier zero-padding descriptions. Keep the board filling all remaining space. Winding contours must fit these fixed channels, so their amplitude is subtler than in broad-gutter image concepts. Do not enlarge the gaps to reproduce a generated curve.

The ignored `prototypes/motorola-spacing/` study follows the ImageGen selection with measured HTML/CSS geometry. Menu/gameplay screenshots use 360x800 and 800x360 CSS px at DPR 3, producing 1080x2400 and 2400x1080 PNGs. Spacing, bounds, control count, overflow, three-color consistency and sampled group containment checks pass. Real hardware, browser chrome, system insets, notes and accessible states still need review. See [current UI/UX](../ui-ux.md#motorola-g31g32-layout-study).

## Earlier two-color direction

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
