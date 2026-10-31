# Top-down pond and lily-pad board review

Research date: 2026-10-31. Status: recommendation for discussion, not implementation approval. The newer direction is a basic Pond theme on flat CSS water, viewed from above. The 81-pad board proposal still needs review. Halloween and More functionality are deferred.

## Recommendation

Compare **B grouping with C geometry**, first: nine quietly grouped 3×3 rafts of broad, rounded CSS pad-button faces that adapt to each rectangular cell. Use a small notch outside the central text-safe area, upright digits and a stable rectangular touch target. Separate regions through slightly wider water gutters and a restrained shared backdrop. Use spacing as well as tone so recognizing a region does not depend on color perception. Do not draw conventional cell borders or grid lines.

This is the strongest starting point for the requested world because it makes the pads part of the pond while preserving the three Sudoku structures a player must scan. It is a design inference, not a finding that this particular layout is proven usable. The hybrid is preferable to contained circles for the selected Fill space default: round pad artwork uses only the shortest cell dimension, so a large board allocation would not necessarily make its pads or notes larger. The visible shape and the region treatment remain proposals for review.

## Locked context and scope

- Build the environment from a flat CSS water field and sparse, quiet water shapes. There is no horizon, shore-facing scene, entire illustrated background or gameplay frog.
- Menu art is one combined frog-and-lily-pad placeholder, higher in the composition with the title. Its intentionally rough black-and-white silhouette and question mark communicate replacement work, not a finished visual style. A human author will eventually supply one composite asset. Depict it as a top-down or oblique top-down 2D game sprite, not a front-facing scene illustration.
- Keep the two mode buttons at bottom left, with More at bottom right aligned to the Progression baseline, in both orientations. This research does not change the approved menu spacing.
- Gameplay fills the available area up to safe-area insets, apart from the needed touch-safety gap beside the dock. No outer board card, decorative margin, heading or permanent HUD is introduced. Internal water gaps belong to the board presentation.
- Keep exactly ten input keys: digits 1 through 9 and a disabled More key. Portrait is two rows of five; landscape is five rows of two. More functionality remains deferred. No additional tools are implied by the redesigned board.
- Fill space remains the default; the independent persistent Square option is planned. Orientation changes remeasure layout while preserving the selected logical cell and game state.

## Three board treatments

| Treatment | Visual structure | Strength | Main problem | Assessment |
| --- | --- | --- | --- | --- |
| A. Independent circular pads | Eighty-one separate rounded pads on water with similar gaps everywhere | Clearest lily-pad identity; least panel-like | Regions disappear into a field of dots; much of a tall or wide cell becomes water; nine-note clusters become cramped | Attractive concept, weak default unless a second region cue survives actual-size testing |
| B. Grouped 3×3 rafts | Separate pads, grouped by a very quiet shared backing and wider water gaps after every third row and column | Region structure survives without drawn lines; retains visible water and pad identity | Too much backing becomes nine cards; too little grouping becomes A; gutters consume some space; circles retain A's geometry limit | Recommended grouping, combined with C's adaptable faces |
| C. Near-rectangular squircles | Closely packed soft cells with small gaps and distinct spacing between 3×3 groups | Best use of rectangular Fill space cells; more room for digits and notes | Can read as ordinary tiles rather than lily pads; a botanical raster silhouette cannot simply be stretched to fit | Recommended shape family, combined with B's region grouping |

For B, a raft is a visual grouping cue, not another decorative sprite, raised tray, permanent outline or extra Sudoku constraint. Keep the backings nearly flat and use the same nine-cell organization everywhere. Wider gutters establish grouping spatially even in grayscale. Subtle hue differences may reinforce it but must not be its only signal. Do not add diagonal patterns, flowers, irregular region shapes or pad arrangements that suggest new rules.

Each row and column still contains nine aligned cell centers. Avoid random jitter, arbitrary pad rotations, overlapping leaves and staggered positions. Those choices would undermine scanning for little benefit. Any small notch must stay away from the common text area; it is not a place to hide or separate a candidate. The recommended CSS face is a simple control surface with a broad safe interior, not a generated botanical illustration or a bitmap stretched into a different shape. No additional production illustration asset is needed for that option.

## Preserve the puzzle beneath the surface

Classic Sudoku requires digits 1 through 9 once in each row, column and 3×3 box. Those relationships remain unchanged. The visual skin must never change cell membership, given values or input order. [Conceptis, Sudoku rules](https://www.conceptispuzzles.com/index.aspx?uri=puzzle/sudoku/rules).

The research supports retaining the logical 9×9 structure. It does not establish that browser cell boxes must have equal physical width and height, or that drawn borders are compulsory. Rectangular hitboxes are a presentation choice that leaves the mathematical rules intact. W3C explicitly permits controls without a drawn hit-area boundary when other visible content identifies them; visible keyboard focus is still needed. [W3C, Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Keep givens immutable and distinguish them from player entries using a visible typographic difference, such as weight, alongside restrained color. Give both sufficient text contrast. Distinguish selection through a localized, stable shape cue, for example a water ring immediately around that pad, rather than recoloring a large area alone. Keyboard focus and selection need distinguishable treatments when they are on different cells. A conflict needs a visible non-color cue as well as color and an accessible state; its exact treatment remains a later review. None of these states should move digits or resize the board.

Use a fixed 3×3 candidate position map within a calm central area. Do not distribute notes around a pad's circumference or change their positions as candidates disappear. Small pencilmarks record possibilities and support solving, including keyboard-based play; they are functional content. [Conceptis, Sudoku tips](https://www.conceptispuzzles.com/index.aspx?uri=puzzle/sudoku/tips).

The visual grouping must also exist in accessible names and logical relationships. Provide localized row, column, region, value/given, selection and notes information. Keyboard traversal follows rows and columns, never decorative object order. The exact semantic implementation remains outside this research.

## Fill space exposes a genuine geometry limit

Let a cell have width `w` and height `h`, and let `p` be the visual inset. A circular pad can have diameter at most `min(w, h) - 2p`. Increasing the longer cell dimension adds surrounding water; it does not enlarge the pad. An undistorted oblique pad can use less area still. A circle also contains a square only about `diameter / √2` wide, which limits a rectangular nine-note cluster that must remain entirely on the pad.

For illustration only, a 360 CSS-pixel board with no horizontal insets or gutters has cells 40 pixels wide. A round pad with a two-pixel inset has diameter 36 pixels and an inscribed square about 25.5 pixels wide. That leaves about 8.5 pixels per candidate column before further padding. These are geometric bounds, not approved dimensions, a claimed readable font size or a measured phone layout. Real safe areas, region gaps and leaf notches reduce the usable area further.

The honest alternatives are:

| Choice | What stays intact | Cost |
| --- | --- | --- |
| Contain human-made pad imagery | Natural silhouette and aspect ratio; full rectangular cell remains selectable | Water occupies the leftover area; notes are limited by the pad's central safe area |
| Use simple procedural squircle control surfaces, recommended | Surface adapts to cell proportions; upright text can use more of the cell | Less literal lily-pad identity; this needs an explicit visual decision |
| Use Square when chosen | More balanced pad spacing and predictable visual proportions | Some usable viewport space remains outside the board |

For raster artwork, preserve aspect ratio using contain sizing rather than stretching or cropping. CSS `object-fit: contain` has precisely that behavior. [W3C, CSS Images Level 3](https://www.w3.org/TR/css-images-3/#the-object-fit).

Do not silently override Fill space, stretch a raster leaf, shrink notes until they technically fit, or let candidates spill onto patterned water. If dense notes fail, revisit the visible surface geometry with the user. No design can maximize literal circular pads, tight tiling, highly rectangular Fill space cells and generous nine-note typography simultaneously.

## Touch, contrast and quiet material

The entire assigned rectangle selects its cell, including water around the visible pad. Adjacent hitboxes must not overlap. Visual separation does not require shrinking the touch target to the leaf outline. Decide deterministically which cell owns a boundary or whether a real region gutter is inactive; do not let decoration change hit testing. The dock safety gap must prevent accidental digit entry while selecting the nearest cell.

WCAG 2.2 AA specifies a 24 by 24 CSS-pixel pointer target, subject to listed exceptions. This is a minimum, not evidence that 24 pixels is comfortable for a dense touch puzzle. Measure full rectangular cell targets and dock targets at actual viewport sizes, and test physical touch accuracy. A larger visual gap does not compensate for overlapping or tiny targets. [W3C, Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Prefer solid, high-contrast digits and notes on flat, opaque, quiet pad interiors. Use 4.5:1 text contrast as the default target; qualifying large text has a 3:1 exception, but tiny notes do not. Thin outlined digits are a poor first solution to a busy surface. If a stroke is needed later, it supplements a legible solid glyph rather than becoming the numeral. [W3C, Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Indicators required to identify a control or its state need 3:1 contrast against adjacent colors. Meaningful region graphics need adequate contrast as well. A quiet raft tint can remain decorative if spacing already identifies the region; if the tint is necessary to perceive it, it must be evaluated as information. Color cannot carry selection, conflicts or region membership alone. [W3C, Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [W3C, Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

Use selected soft-raised CSS treatment on the input buttons: a shallow lower lip, restrained highlight and short press feedback. Sparse simple water rings and shallow shadows can integrate controls with the water without an illustrated background. Eighty-one animated bobbing pads would make scanning unstable; keep board geometry still. Reduced motion must preserve every state cue without movement.

Simple CSS control surfaces, flat fields and water rings are styling. They do not authorize AI-authored botanical illustrations, SVG artwork or production sprites. The combined menu sprite requires human authorship, provenance and an appropriate license under the [artwork policy](../design.md#artwork-policy). If illustrated pad imagery is later selected instead of CSS faces, it has the same requirements and must retain its aspect ratio. No asset purchase or production art selection is proposed here.

## Review before implementation

Compare A, B and C, including the recommended B+C hybrid, on the same valid puzzle at real display size, including a cell with nine notes, givens, entries, selection, keyboard focus and a conflict. Check 360×800 and 393×873 CSS-pixel viewports and landscape equivalents, plus a wide desktop. Include safe areas and the actual dock rather than comparing isolated square boards. Generated mockups are not proof of correct puzzles, accessible contrast or touch performance.

The decision to settle next is **how to preserve 3×3 regions without grid lines**. Review B's spacing and backing with C's broad adaptable pad faces before adjusting leaf ornament, button finish or motion. Reject the treatment if a region cannot be identified immediately in grayscale, notes cannot be read, or the pad display makes the touch target misleading. Record actual-size findings before writing an interface prototype. More behavior, Halloween and additional visual treatments remain deferred.
