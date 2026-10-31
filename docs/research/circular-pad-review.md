# Circular pads within stretched cell buttons

Date: 2026-10-31. Full-circle faces and full-cell buttons are requested requirements. Alignment remains a visual decision, with inward recommended for the next review.

## Geometry and input

Keep the board's existing stretched cell rectangles and 4px/8px spacing. Each full rectangle is a native button, including areas showing water. The visible pad is a square of side `min(cell width, cell height)` with 50% radius; use inset lip/highlight to preserve a circular silhouette. Green raised styling stays; cream dock/menu controls keep their previous shape and finish. The circular silhouette supersedes stretched notched pastilles.

The decorative circle ignores pointer events. Numbers/notes move with that circle, not independently. Keyboard movement follows logical row/column identity. A transient rectangular selection/focus cue can clarify the full hitbox without permanent grid lines. Do not make only the circle clickable or infer region identity from the background color under a tap.

## Alignment comparison

| Option | Placement | Benefit | Cost |
| --- | --- | --- | --- |
| Centered | Center in both cell axes | Consistent digit-center spacing supports row/column scanning | Circles in stretched slots can look widely scattered |
| Inward | Group rows: bottom, center, top; group columns: right, center, left; combine axes | Clusters the nine pads and frees more water around groups for B contours | Distances between digits become uneven across groups; an off-center face makes the water portion of a hitbox less obvious |

Both options retain straight row and column lines because a given global row/column receives the same offset. Inward does not jitter the grid or rotate its data. Group top-left aligns bottom-right, top-right bottom-left, bottom-left top-right, bottom-right top-left. Only the central circle is centered on both axes. No alignment selector is approved.

On a cell axis already equal to the circle diameter, all alignment positions coincide. Thus this portrait study visibly changes vertical placement, while landscape changes horizontal placement.

Recommend reviewing inward first for group recognition and pond atmosphere, with centered preserved. Treat that recommendation as a design judgment, not a usability finding. At the representative phone sizes, circles are about 33.77 CSS px in either orientation. The largest inscribed square is only about 23.88px, so nine notes require very small type. The study displays a compact example but does not approve that text size for production. If notes are uncomfortable, revisit presentation before accepting the solving interface.

## Restore selected B

The earlier measured preview reduced the source's natural shallows to nearly rectangular patches. That is not an approved replacement for B. Keep exactly the same three water fills, `A B C / B C A / C A B`, with flowing shared contours and selective curved junctions. Empty parts of stretched cells now provide room for curves without enlarging logical gutters. All visible circles/lips/labels of a group must stay within its assigned fill; unused water in a rectangular button may contain a color transition. This supersedes full-rectangle color-containment checks, but never full-rectangle hit testing.

Avoid nine panels, detailed ripples, gradients, per-cell scallops or contour motion while solving. Circle containment must constrain the water geometry, rather than water squeezing or moving the circles. Geometry remains presentation-only and does not alter Sudoku regions.

## Evidence and limits

ImageGen exploration and exact prompt: ignored `prototypes/circular-pond/imagegen-concept.png` and `README.md`. That image is illustrative; generated inward placement, cell count, pixel ratios and notes are not geometry evidence.

Measured follow-up: `centered-inward-review.png`, four full-resolution PNGs and `measurements.json` in the same ignored folder. Both alignments pass at 360x800 and 800x360 CSS px, representative DPR 3: 81 rectangular native buttons, maximal 1:1 circle bounds, exact alignment formulas, 4px/8px slot gaps, no overflow, three shared background fills, sampled circular-edge color containment, corner/center hit testing, selection by clicking water and logical arrow navigation. Background paths are tested in paint order so a later decorative junction cannot silently recolor a circle.

These are temporary layout/selection demos. They do not implement Sudoku solving, approve tiny note text, prove complete keyboard/assistive-technology support or certify a physical Motorola device. Final artwork policy and deferred More/Halloween scope are unchanged.
