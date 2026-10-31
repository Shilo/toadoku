# Pond prototype progress and findings

Status: 2026-10-31. This records the local visual prototype, its authorized refinement and the evidence needed to resume work. It is not production acceptance or a working Sudoku game.

## Scope and source of truth

The fresh baseline lives at `prototypes/pond-visual-v1/`. It was authored from scratch; older demo screenshots were visual references, and their code was not copied or extended. The latest request explicitly authorizes refining this current prototype. All prototype source, dependencies, builds, images and test evidence remain ignored. This document, the handoff, decisions and artifact registry are the durable tracked record.

The refinement supersedes perfect-circle stationary pads, rectangular selection outlines, water behind every control, and menu identity movement between submenus. The three water colors, inward anchors, fixed rectangular hitboxes, readable digits, 4px/8px layout spacing, ten-key dock and disabled More remain in force. No engine, number entry, scoring, economy, progression logic, save policy, store, PWA infrastructure or deployment was added.

## Implementation progress

| Area | Implemented direction |
| --- | --- |
| Ground | Wet reed `#6D9F81` and dry sage `#B6BA86`; continuous organic shore underneath the menu controls and gameplay dock. The bank uses spare outer-cell water without reducing the board allocation. |
| Menu composition | One permanent reservation equals the maximum Progression panel: label plus three controls and their gaps. At 360x800/800x360 CSS emulation this is 240.8px inside the scene. Main, Quick Play and Progression share fixed title/art anchors and the same shore geometry. |
| Landscape menu | A connected cove supports bottom-left modes and bottom-right More, with the right bank bleeding above/below the viewport. The title and replaceable art occupy the water side. |
| Typography | Chewy is the local title-only display font. Outfit remains the number, note and control font. The title is text, with no generated lettering bitmap. Font license/source records stay with the prototype. |
| Water | Three flat water colors and B's whole-group arrangement remain. Shared cubic geometry, curved junction pockets and three compound fills replace the earlier rigid-looking corners and separately stroked overlays. |
| Pad silhouettes | Stable per-cell procedural near-circles with extremely restrained perimeter variation and one shallow true cleft. The opaque central text zone remains intact. No detailed botanical illustration or random regeneration on selection/rotation. |
| Selection and focus | A warmer fresh-green face, deeper lower lip, 0.9px selected-face lift and one tiny edge drop replace all cell/pad selection outlines. Two localized dew beads distinguish keyboard focus. |
| Floating objects | A shared `floatOnPond` action applies seeded, independent slow translation, capped at 0.48 CSS px for pads and 1.8px for title/art. Layout anchors/hitboxes stay fixed. Pads remain upright, with no scaling or rotation of the digits. Static reduced motion and hidden-page pause apply to water and floating objects. |
| Navigation | Same-scene menu choices, static example board, browser Back, Escape and a brief Return notice. The notice now overlays the grounded dock, so it does not introduce floating non-gameplay UI over the pond. Number keys remain inert and More stays disabled. |

The original scribbly black-and-white frog/pad placeholder remains deliberately provisional. It is one contain-sized replaceable asset. Human-made final illustration and suitable rights remain required; AI images must not ship as production art.

## Why the previous water looked rigid

The first renderer protected an entire group rectangle, including water that did not contain pad faces. It therefore left long nearly straight spans and concentrated curvature into group corners. Separately painted junction overlays also closed across hidden edges. Exterior bleed moved some shared endpoints far outside the viewport without moving adjacent controls, changing the visible tangents.

The refinement preserves interior curves when extending them offscreen, uses generous curved junctions, and checks pad motion clearance. A browser review still found faint hairlines after the first geometry fix. A regression reproduced folded pocket geometry, but fixing those folds did not eliminate every raster seam: separate same-color stroked overlays retained antialiased fragments of an old contrasting edge. The painter now combines each color into one nonzero-winding fill and subtracts displaced pockets using reversed winding, without stroking canceled internal boundaries.

Independent visual review then identified pointed beaks caused by highly unequal physical trim lengths at joins. Matching endpoint tangents alone does not guarantee a pleasing radius. Balanced physical trims and broader shared curves address that finding. Numerical geometry tests and actual browser screenshots are separate acceptance steps; passing one does not establish the other.

## ImageGen comparison

The initial user reference and new guideline are saved locally under `prototypes/pond-visual-v1/refinement/`. The new concept was generated by a sub-agent before UI changes. Its exact prompt and critique are in `research/concept-v2.md`.

| Comparison | Finding and response |
| --- | --- |
| Better in the generated guideline | Broad uninterrupted S curves, rounded junctions, playful title lettering and an obvious wet-bank-to-ground transition. These are the visual targets for the refinement. |
| Better in the measured prototype | All 81 logical cells and ten keys exist; real 4px/8px spacing, inward allocation, keyboard/touch targets, fixed menu anchors and interaction state can be measured. Silhouette seeds and motion bounds are stable, unlike incidental generated geometry. |
| Intentional difference | The generated board has large scenic voids and extra spacing. Fill-space allocation keeps more area interactive and therefore constrains broad curves, especially where opposite pad faces leave only a narrow channel. Relatively straight short-axis spans are acceptable; sharp corner events, pinched wedges and interior seams are not. |
| Intentional difference | The mockup contains gradients, lighting and illustrated surface polish. The selected three solid water roles are retained. The two ground colors are separate roles, not extra water tints. |
| Intentional difference | The actual menu reserves the tallest submenu even when the main menu uses less height. This leaves more visible ground in its simpler states and keeps title/art fixed. A responsive connected cove accommodates the landscape menu rather than copying a portrait poster. |
| Matching margin | Match the composition, smooth-curve language, title character and natural leaf feedback. Exact generated pixels, spacing errors, incorrect digits and polished replacement art are not a similarity target. No arbitrary percentage similarity is claimed. |

## Validation and evidence

Final refinement browser review and checks passed. Independent concept review accepted the smooth joins, grounded controls, title composition and natural selection. The final board is still more columnar than ImageGen, an explicit full-allocation/group-containment tradeoff. The earlier baseline's 3,732,480 stationary-pad samples are historical; the following results apply to the refinement.

| Check | Result and local evidence |
| --- | --- |
| Svelte/TypeScript and build | `npm run check`: zero errors/warnings. `npm run build`: passed. No additional production infrastructure was introduced. |
| Exact Motorola CSS layouts | 360x800 and 800x360, native browser DPR 1. 81 full-cell targets, 81 fixed 1:1 anchors, ten dock keys, measured 4px/8px gaps and no overflow. Board dimensions 344x640.8125px and the transpose; anchor diameter about 33.77px. `refinement/layout-results.json`. |
| Ground coverage | 666 button samples and 12,960 conservative pad-envelope samples across 11 menu/game/layout cases pass. Controls are on dry ground; leaf motion reserves remain off the wet bank. `evidence/shore-geometry.json`. |
| Combined water envelope | 4,976,640 conservative pad-circle-plus-1.5px reserve samples over 240 phases at eight allocations pass, along with 144,680 compound interior color-ownership samples. Fillet tangency, no-fold and exterior-bleed invariance checks pass. `evidence/water-geometry.json`. |
| Rounded junctions | Phone junction radii range from 13.21 to 20.39 CSS px. Full-loop contour displacement from phase zero reaches 18.549px; restrained short-axis bow is at most 1.2px. These are geometry measures, not frame-performance claims. |
| Leaf geometry | 81 unique stable silhouettes and motion profiles, 5,913 rim points, 5,184 protected-center probes, true cleft openings and intact flanking leaf checks pass. Normalized protected radius is 36; the smallest cleft tip radius is about 37.33. `evidence/pads-geometry.json`. |
| Full leaf envelope | Max serialized rim/control radius is 44.87 in a 100-unit box. The whole painted union is bounded by `0.4487 * D + 1.43px`, inside the stationary 1:1 wrapper at tested diameters from 28 through 300px. This includes drift, selected lift and lower lip; raster/hardware limits remain separate. |
| Menu stability | All three menu states have identical title/art layout anchors and shore edge in each orientation. The visual float continues independently within those anchors. `refinement/menu-anchor-results.json`. |
| Input regression | Water-corner selection, logical arrows, fixed selection after rotation, inert number typing/dock and disabled More pass. Selected cells/pads have no outline or rectangular pseudo-element. `refinement/interaction-results.json`. |
| Motion lifecycle | Water and all 81 leaves move while cell/anchor rectangles stay fixed. Initial and runtime reduced motion are fully static. Hidden water/leaf animations freeze and resume; title/art share the same reduced/hidden behavior. The fixture also confirms Chewy on the title and Outfit on controls. `refinement/motion-results.json`. |
| Additional allocations | 393x873, 873x393 and 1280x800: no overflow or water-corner target failures. `refinement/additional-layouts.json`. |
| Visual evidence | Final portrait/landscape menu/gameplay, maximum-submenu views and selected-leaf detail are saved under `refinement/`. `refinement/visual-review.jpg` is the four-view proof. Complete 1080x2400 and 2400x1080 captures are labeled 3x rendering simulations, not native DPR-3 testing. |

The screenshot API's clip option did not honor its origin in this session. The selected-leaf detail was therefore cropped from the actual saved full-screen capture with a deterministic image operation; no design pixels were regenerated or retouched. The saved selected-face center is visibly cream-green, distinct from its green neighbor, and the browser confirmed the selected fill/lift/drop state before capture.

Current checks include `checks/assert-layout.mjs`, `checks/shore-check.mjs`, `checks/pads-check.mjs` and `checks/water-check.mjs`. Browser measurements and screenshots for the refinement use `refinement/`; pure geometry results use `evidence/`. The artifact registry indexes selected local evidence and source hashes without tracking the ignored files themselves.

## Remaining limits

Motorola G31/G32 hardware checks remain pending: actual CSS viewport and native DPR, browser chrome/safe areas, Android text scaling, sustained frame pacing, responsiveness, energy and thermals. The Codex browser exposes viewport dimensions but not native DPR override. Density captures are explicitly labeled 3x rendering simulations, not native DPR-3 or physical-device tests. Reduced-motion/page-hidden lifecycle fixtures simulate environment signals without changing OS settings.

The tiny nine-note specimen is not approved production typography. Grayscale/color-vision region recognition, complete solving states and full accessibility still require evaluation. The prototype does not establish production renderer, final fonts/palette/art, offline behavior or any future game system.
