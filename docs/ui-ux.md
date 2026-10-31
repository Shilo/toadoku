# Current UI and UX direction

## Locked direction

Use C, Quiet Flat, soft-raised controls, and the basic Pond theme only for the current milestone. Keep B/A and background-image capability documented for later. Halloween and More functionality are deferred in [TODO.md](../TODO.md).

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

The top-down pond and broad procedural pad-board presentation are accepted as the visual direction. Both scenes use a flat CSS water field with only sparse abstract marks, not large ripple rings, gradients, highlights, reflective water or a painted horizon. Apply the same simplified water treatment to menus and gameplay. The menu's combined placeholder remains an overhead/slightly oblique provisional game image, not a commitment to pixel-art rendering or a game engine.

The board removes the traditional outer panel and drawn grid lines. Each of the 81 logical rectangular cells shows a lily-pad-like face; its complete rectangle remains selectable, including surrounding water. Rows, columns and all nine 3 by 3 regions remain classic Sudoku. Changing presentation does not change rules or remove notes. Keep the numeric/action keys a distinct warm cream/ivory family against the green pad faces; this separation was explicitly preferred.

**Reviewed recommendation:** use subtly separated 3 by 3 groups and broad procedural CSS pad-button faces with a small off-center notch. Wider internal water gutters identify regions without drawn lines. Do not rely on alternating colors alone. The face adapts to the cell; upright text uses a quiet, opaque, generous central area.

Do not stretch bitmap/SVG botanical illustrations to fit long cells. If illustrated pads are selected later, contain their proportions; this leaves more visible water and limits notes. Procedural control surfaces are the stronger first comparison for Fill space and require no additional illustration asset. They must not become detailed AI-authored production leaf drawings.

Implementation-format options for later: CSS control geometry is the simplest adaptive approach; a human-made SVG gives a scalable recognizable leaf with preserved aspect ratio; a human-made PNG/WebP with transparency gives a fixed sprite but needs suitable source resolution and contain sizing. These are presentation alternatives, not a new game-engine decision. A single shared leaf asset can be reused across 81 cells if that route is selected.

Solid high-contrast digits are preferable to outlined text over a busy leaf. Keep candidate positions fixed and inspect all nine notes at phone size. Selection/focus/conflict states need non-color cues without permanent grid borders. Board geometry stays stable while solving; no eighty-one independently bobbing pads.

The overall visual direction is accepted; exact region tones, dimensions, contrast and actual-size interaction still need review before implementation. Reject or revise details if regions cannot be identified, notes become unreadable, or pad shapes mislead touch selection. See [independent redesign review](research/top-down-pond-board.md).

The latest four-view image and exact ImageGen prompts are under ignored `prototypes/top-down-pond/`. They show the reviewed procedural-pad/region-spacing approach in both orientations, with the rough composite placeholder confined to menus. The render is not an exact spacing or input specification.

## Region-tone comparison

Two proposed cues alternate across whole 3 by 3 regions, never individual cells. Their pattern is `A B A / B A B / A B A` across the nine regions. Preserve the existing wider internal water gutters so color is not the only grouping cue.

- **Recommended: pad tones.** Use two close greens for the region's nine pad faces. Keep the water flat and uniform. This reinforces the objects the player reads without introducing nine background panels.
- **Alternative: water tones.** Keep every pad the same green and use two quiet water undertones behind the groups. Avoid outlined rectangular panels, separate raised cards, lighting and large ripples. This cue can be weaker because pad faces cover much of it.

Selection, keyboard focus, player entries, givens, notes and conflicts must remain distinguishable on both base tones. Region parity is derived from the existing board regions, not a new Sudoku rule. The chosen tone method is not yet a user setting or an approved theme preference.

The new temporary comparison is `prototypes/flat-water-regions/region-tone-comparison.png`. The separate `flat-water-main-menu.png` shows only the simplified menu background to avoid regenerating all orientations. Its quiet field and sparse abstract marks also apply to gameplay. Exact prompts are alongside. See [region-tone review](research/region-tone-review.md).

## Preserved comparisons

Earlier square/gentle/full studies, candy/jelly/lily-pad finishes, and More popup audits remain under `docs/research/` and ignored `prototypes/`. The current menu, disabled More, placeholder, Pond-only scope and spacing rules supersede their conflicting details. No production UI implementation is authorized by these design notes.
