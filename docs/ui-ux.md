# Current UI and UX direction

For continuation, read [design handoff](design-handoff.md) and [prototype progress](prototype-progress.md). The current ignored prototype is `prototypes/pond-visual-v1/`; latest authorized refinements replace perfect circles, stationary pad faces, cell selection outlines and menu identity reflow.

## Locked direction

Basic Quiet Flat Pond uses fluid three-color Winding shallows B, two-color abstract ground, inward near-circular notched green pads and soft-raised cream controls. More stays disabled. The world should feel like an animated pond; clean consistency belongs to readable digits and UI controls. No conventional board frame, permanent gameplay HUD or gameplay frog.

The board remains Fill space with the Square preference deferred behind unavailable Settings. Portrait dock: `1 2 3 4 5 / 6 7 8 9 More`. Landscape dock: `1 2 / 3 4 / 5 6 / 7 8 / 9 More`. Keep upright glyphs, fixed logical identity and exactly ten keys.

## Exact space use

| Placement | Token |
| --- | --- |
| Neighboring full rectangular cell buttons and action/menu buttons | Small, 4px |
| Scene edges, 3x3 group gaps and board/dock separation | Large, 8px |
| Other authored padding/gaps | Reuse small or large |

Apply the single scene inset once, plus actual system safe areas. Fill every remaining board pixel after dock/gap allocation. No wrapper padding, scenic strip or artificial aspect-ratio cap. Shape sizes, fonts, lip depth and tiny motion travel are not spacing tokens. Water around near-circular faces is an aspect-ratio effect.

## Main menu

Place Quick Play above Progression in a bottom-left action block and disabled More bottom-right aligned with the lower row in both orientations. Quick Play shows same-scene difficulty choices; Progression shows new/existing-game choices with no separate difficulty picker. The visual prototype opens the same fixed specimen and exposes no save policy.

Reserve the largest Progression label-plus-three-button allocation for every menu state. The title, art anchor and ground/shore height stay fixed when switching mode, Quick Play and Progression choices. Only bounded visual float moves title/art. In landscape retain the left mode/right More relationship on one connected cove shore; do not move modes to the right.

## Ground behind controls

Water uses `#0D6267`, `#329D9A`, `#7ED1B8`. Ground adds dry sage `#B6BA86` plus wet reed `#6D9F81` as a transition bank. All menu actions and gameplay dock keys rest over dry ground, with an organic wet-bank curve merging into the pond. No straight separators, rectangular cards or per-button ground trays.

Shore geometry bleeds through left/right edges in portrait. In landscape the dock bank bleeds through top/bottom edges; the menu's connected cove supports both lower action blocks and continues to its vertical edges. Gameplay land uses the existing dock allocation/gap and never reduces the board or crosses pad motion bounds.

## Deliberately temporary art

Use one replaceable combined frog-and-pad image. It remains intentionally childish and scribbly, black and white, with a conspicuous question mark/TEMP marker. Keep its stable display anchor and contain sizing. No polished mascot or sprite-pack sourcing. Final production illustration must be human-made with verified provenance/license.

Chewy is the local licensed title-only prototype font, giving plump playful lettering. Outfit remains the consistent UI/digit face. Title and art are pond objects and float subtly; neither participates in submenu reflow. Gameplay has no decorative frog.

## More menu: deferred idea, not implemented

More remains disabled in both scenes. Future regular options plus adjacent gameplay tools are a recorded proposal, with narrow-screen stacking unresolved. Notes, Undo, Erase and Hint remain future tools. No top overflow, extra dock key or invented gesture replaces unavailable controls.

## Progress information

A brief nonblocking start notice and persistent completion results remain eventual feedback decisions. The prototype's temporary return/dismiss notice overlays the ground-backed dock without adding a permanent key. Browser Back and Escape provide a minimal return path; after dismissing the notice touch users use browser Back. There is no scoring, timing, reward or completion implementation.

## Accepted pond-board direction; region tones under review

Keep classic 9x9 logical structure and separated 3x3 groups without a drawn grid/frame. Every cell is a fixed full rectangular native button, including water and pad cutouts. Decorative geometry is noninteractive and cannot resize or clip the target.

Water has exactly three solid fills shared by both scenes; the two land roles are separate. No water gradients, fourth tints, opacity blend, texture, reflective lighting or large ripple rings. Broad smooth S curves and shared junctions must feel fluid rather than like nine wavy rectangles or small hooked corners. Every group's complete moving pad/label envelope stays in its assigned fill.

## Circular-pad alignment: selected inward

Inward anchors remain selected: group rows align bottom/center/top and columns right/center/left. Centered placement remains a historical comparison, not a setting.

The decorative envelope remains 1:1 and fits the cell's shorter axis, but its edge is nearly circular rather than a perfect circle. Use subtle deterministic per-cell perimeter variation and a true shallow notch with varied angle/depth. Preserve the soft-raised green finish, inset lip/highlight and quiet opaque number/note area. Never stretch leaves or glyphs, paint fake holes or add distracting veins. Variation must not regenerate on selection, rerender or rotation.

A shared floating token moves each pad face and its text together, with seeded phase/direction and at most 0.48 CSS px of float travel in this prototype. Title/art target about 1.8 CSS px. Logical cells, hitboxes, dock, land and menu anchors remain fixed. Reduced motion renders a static pose and hidden-page work pauses.

Selection naturally brightens and lifts the leaf by 0.9px with a 0.95px lip and one cream-edged dew drop. No rectangular selection outline or encircling pad ring. Two dew beads provide distinct keyboard focus. Keep readable text and clear non-color cues; final full solving-state accessibility still needs validation.

Tiny nine-note examples at phone size remain unapproved production typography. Inward placement and restrained motion do not waive that limitation.

## Three-color organic regions: current comparison

Selected B uses `A B C / B C A / C A B`. Preserve A, Connected bays, with `A B A / C A C / A B A`, as an archived alternative. These names do not change the selected overall scene C, Quiet Flat. Do not add public A/B selectors.

Current curve work improves the baseline's rigid corners while preserving group-fill containment over both water and pad motion. Use available empty cell water, not extra group spacing or scenic voids. Compare screenshots against the [new ImageGen guideline](../prototypes/pond-visual-v1/refinement/concept-shore-v2.png): match fluid rhythm, near-round leaves, shore composition and playful title. Reject generated gradients, exaggerated cuts, wrong digits/cell counts and oversized gaps. Record better/worse/intentional differences in [prototype progress](prototype-progress.md).

## Motorola G31/G32 layout study

Current checks target 360x800 and 800x360 CSS px, with 393x873 and its transpose as additional layouts. Native DPR-3 and hardware testing remain pending. Baseline Codex captures used native DPR 1, plus explicitly labeled 3x rendering simulation for 1080x2400 and 2400x1080 outputs. Browser chrome, safe areas, Android text scaling and sustained device performance require hardware.

Earlier `prototypes/motorola-spacing/` and `prototypes/circular-pond/` measurements are historical evidence for the fixed cell/dock allocation, not proof of new shore, notch or floating behavior. Their scripts and images remain preserved. Current test state lives in [prototype progress](prototype-progress.md).

## Earlier rounded alternate regions: preserved proposal

The subtle pad-tone comparison did not provide an effective grouping cue, and nine rectangular water backings looked like interface panels. Neither is selected. Do not solve this by introducing another small hue difference.

The new suggestion is a rounded checkerboard on a continuous ground. Number the regions row-major, 1 through 9. Regions 1, 3, 5, 7 and 9 share one uninterrupted base-water layer with no individual container or corner radius. Only regions 2, 4, 6 and 8 receive a second, clearly lighter water fill with rounded corners. This creates four patches rather than nine cards. No strokes, yellow annotation outlines, raised trays or underlay shadows. Keep pad faces uniform for this comparison.

Retain wider water gutters at third/sixth rows and columns, since rounded patches alone may not identify all nine boxes. Corner curves must expose the continuous ground without clipping cell content or changing rectangular hitboxes. Use shape, spacing and a meaningful light/dark difference, not hue alone. Validate region recognition in grayscale and with color-vision simulations; no particular type of color vision is assumed. Selection, focus, givens, entries, notes and conflicts also need independent readable cues.

The two-screen temporary concept is `prototypes/rounded-water-regions/menu-and-gameplay.png`, with exact initial/correction prompts alongside. It pairs an abstract curving menu pond with the new board mask. Generated geometry, notes, color values, texture and incidental spacing are illustrative, not approved measurements. No scenery header or dock spacer is permitted. Region shape, exact colors and actual-size usability remain under review; no user-facing region-style setting is approved. See [rounded-region review](research/rounded-region-review.md).

## Earlier region-tone comparison: superseded recommendation

Two proposed cues alternate across whole 3 by 3 regions, never individual cells. Their pattern is `A B A / B A B / A B A` across the nine regions. Preserve the existing wider internal water gutters so color is not the only grouping cue.

- **Earlier pad-tone proposal.** Two close greens for the region's nine pad faces were too subtle to serve this design.
- **Earlier water-tone proposal.** Uniform pads with quiet rectangular water undertones made groups read as panels. The current rounded/continuous-ground proposal above replaces this comparison.

Selection, keyboard focus, player entries, givens, notes and conflicts must remain distinguishable on both base tones. Region parity is derived from the existing board regions, not a new Sudoku rule. The chosen tone method is not yet a user setting or an approved theme preference.

The earlier temporary comparison is `prototypes/flat-water-regions/region-tone-comparison.png`. Its `flat-water-main-menu.png` was too plain; use the newer broad curving pond direction instead. Preserve these images and prompts as history, not current approval. See [earlier region-tone review](research/region-tone-review.md).

## Preserved comparisons

Earlier square/gentle/full studies, candy/jelly/lily-pad finishes, and More popup audits remain under `docs/research/` and ignored `prototypes/`. The current menu, disabled More, placeholder, Pond-only scope and spacing rules supersede their conflicting details. No production UI implementation is authorized by these design notes.
