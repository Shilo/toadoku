# Current UI and UX direction

## Locked direction

Use C, Quiet Flat, soft-raised controls, and the basic Pond theme only for the current milestone. Keep B/A and background-image capability documented for later. Halloween and More functionality are deferred in [TODO.md](../TODO.md).

Background experiments must preserve the approved controls: green broad lily-pad faces with the small off-center notch, shallow lower lip and restrained top highlight; cream/ivory menu and input buttons with the same soft-raised finish. Do not replace them with flat plain pills, remove their notches/lips, change their color families or restyle their typography while comparing water. The disabled More treatment remains muted. See [button study](research/tactile-buttons.md) for interaction states; the older opaque classic-board recommendation there is historical.

Keep Fill space as the default board allocation, with Square retained as a modular preference. Its user-facing setting is deferred with the disabled More/Settings entry. Portrait has two rows of five input keys at the bottom; landscape has five rows of two at the right. Preserve upright glyphs, logical cell identity and game state when remeasuring viewport/safe areas.

The ten-key order follows the agreed mockup: portrait `1 2 3 4 5 / 6 7 8 9 More`; landscape `1 2 / 3 4 / 5 6 / 7 8 / 9 More`. The More key remains in its tenth position but is disabled. No top overflow or substitute Tools button is added.

## Exact space use

- Fill space reaches the available scene edges after necessary safe-area insets. No decorative outer board margin, frame, reserved header/status strip or empty spacer belongs in the board allocation.
- Dock keys align to the bottom in portrait or right edge in landscape. Use only consistent inter-key spacing and the small board/dock separation needed to prevent accidental activation.
- Board padding, logical cell size, visible pad-face inset and safe-area protection are different concepts. Internal leaf/water gaps do not justify adding outer page padding.
- If square mode is eventually selected, center the largest square within the same board allocation and keep the dock fixed. That mode intentionally leaves background visible.
- Generated mockup whitespace is not a spacing specification. Actual layout must be measured against its available rectangle and device insets.

## Main menu

Show both modes directly. Place Quick Play above Progression in a bottom-left action block. Put the disabled More button at bottom-right, aligned with Progression's vertical center and lower edge. Use this same action relationship in portrait and landscape, rather than moving the mode block to the right in landscape. Title and combined art placeholder stay higher in the scene with responsive positioning.

Quick Play switches to difficulty choices in the same scene; Progression switches to existing/new-save choices. Back returns to mode selection. Save-slot count and replacement policy remain deferred. Do not add an initial Play-only screen.

## Deliberately temporary art

Use one replaceable **combined frog-and-lily-pad menu image**, not two independently positioned sprites. It is intentionally rough, black and white, with a conspicuous question mark or template marker. It must look provisional alongside polished UI and background styling. Do not source paid/free sprite packs for this milestone or turn the placeholder into a polished character design.

Final illustration will be supplied by a human author, with the existing provenance/license rules. Keep replacement simple: one local asset reference, a stable display box and contain sizing. A different compatible art style must not require UI reconstruction. Existing AI concept art remains temporary and ignored. The placeholder is not evidence of approved final art.

Gameplay still has no decorative frog mascot. Proposed lily-pad cells below are functional presentation surfaces, separate from the replaceable menu image.

## More menu: deferred idea, not implemented

Keep More disabled in menus and gameplay for now. Later, main-menu More could expose regular options. In gameplay, one shared overlay could expose those regular options with Sudoku tools to the right, without a nested More > Tools step. This is a recorded idea, not a selected popup layout. On narrow screens it may need stacking rather than side-by-side columns.

The earlier direct-tools-plus-Settings proposal remains research, not current functionality. Notes, Undo, Erase and Hint are the common shortlist. Restore accessible access before claiming that the mockup demonstrates the full solving workflow. Do not invent hidden gestures to compensate for a disabled menu.

## Progress information

Retain the agreed nonblocking start notice and persistent completion results until Continue, rather than a permanent HUD. Do not force timed waits or auto-dismiss earned rewards. Exact duration/presentation remains open. A non-timed session-information surface is required when More/Settings is implemented. Start active timing when the board is visible and interactive, not at the first digit.

## Accepted pond-board direction; region tones under review

The top-down pond and broad procedural pad-board presentation are accepted as the visual direction. Flat does not mean a blank field: use a few broad organic curves suggesting connected water and shallows, inspired by the earlier abstract theme. Use exactly three solid background colors, shared unchanged by menu and gameplay. No fourth water tint, opacity blend, large ripple rings, gradients, highlights, reflective water or painted horizon. The three-color limit applies to water/background shapes, not control fills, lips, ink or placeholder art. Keep gameplay contours from obscuring region boundaries. The menu's combined placeholder remains an overhead/slightly oblique provisional game image, not a commitment to pixel-art rendering or a game engine.

The board removes the traditional outer panel and drawn grid lines. Each of the 81 logical rectangular cells shows a lily-pad-like face; its complete rectangle remains selectable, including surrounding water. Rows, columns and all nine 3 by 3 regions remain classic Sudoku. Changing presentation does not change rules or remove notes. Keep the numeric/action keys a distinct warm cream/ivory family against the green pad faces; this separation was explicitly preferred.

**Reviewed recommendation:** use subtly separated 3 by 3 groups and broad procedural CSS pad-button faces with a small off-center notch. Wider internal water gutters identify regions without drawn lines. Do not rely on alternating colors alone. The face adapts to the cell; upright text uses a quiet, opaque, generous central area.

Do not stretch bitmap/SVG botanical illustrations to fit long cells. If illustrated pads are selected later, contain their proportions; this leaves more visible water and limits notes. Procedural control surfaces are the stronger first comparison for Fill space and require no additional illustration asset. They must not become detailed AI-authored production leaf drawings.

Implementation-format options for later: CSS control geometry is the simplest adaptive approach; a human-made SVG gives a scalable recognizable leaf with preserved aspect ratio; a human-made PNG/WebP with transparency gives a fixed sprite but needs suitable source resolution and contain sizing. These are presentation alternatives, not a new game-engine decision. A single shared leaf asset can be reused across 81 cells if that route is selected.

Solid high-contrast digits are preferable to outlined text over a busy leaf. Keep candidate positions fixed and inspect all nine notes at phone size. Selection/focus/conflict states need non-color cues without permanent grid borders. Board geometry stays stable while solving; no eighty-one independently bobbing pads.

The overall visual direction is accepted; exact region tones, dimensions, contrast and actual-size interaction still need review before implementation. Reject or revise details if regions cannot be identified, notes become unreadable, or pad shapes mislead touch selection. See [independent redesign review](research/top-down-pond-board.md).

The latest four-view image and exact ImageGen prompts are under ignored `prototypes/top-down-pond/`. They show the reviewed procedural-pad/region-spacing approach in both orientations, with the rough composite placeholder confined to menus. The render is not an exact spacing or input specification.

## Three-color organic regions: current comparison

Use the same three water fills as the curving menu, with uniform soft-raised green pads. Each complete 3 by 3 group, including all pad faces, lips and immediate water surround, stays inside one water color. Curves belong in the channels between groups; do not cross a pad, bisect the group's internal water or move cell centers. Make boundaries gently asymmetric and winding rather than straight panels or repeated perfect radii. The latest yellow annotations mark selective transitions at the top/bottom group seams; they are not proposed outlines.

Two temporary alternatives are compared in `prototypes/organic-three-color-pond/menu-and-gameplay.png`, with exact initial/correction prompts alongside:

- **A, Connected bays:** one continuous deep-water ground with four organic patches at regions 2, 4, 6, 8. Fill arrangement `A B A / C A C / A B A`. This preserves the selective-patch idea and a connected base, but retains some four-island repetition.
- **B, Winding shallows:** whole-region three-color arrangement `A B C / B C A / C A B`, with gently winding shared boundaries rather than nine separate cards. Recommended next direction for immersion, provided the nine boxes remain recognizable without hue.

Neither geometry is approved yet. Waviness must fit the existing gutter budget; do not enlarge gaps or add scenery headers/spacers to display it. Stable pad/hitbox geometry takes priority. Validate grayscale, color-vision simulations, notes, focus and selection at target phone sizes in both orientations. The generated images are background studies, not measured layout, exact palette or interaction specifications. Their residual spacing/texture is not an approved change. No public region-style selector or production implementation is added.

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
