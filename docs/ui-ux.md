# Current UI and UX direction

## Selected foundation

Start with **C, Quiet Flat**: a full-screen, calm, colorful frog-world identity built mostly from flat CSS fields and sparse organic shapes. Preserve B, Layered Pond, and A, Expressive Gradient, as documented future treatments behind the same board and controls. They are not additional modes or mandatory user settings.

Keep the world flat while exploring shallow tactile button styling. No interface implementation, final button finish or board aspect ratio is approved by this document.

## Main menu

- Show both modes directly, with the main choices toward the lower, reachable part of the scene.
- Quick Play changes to difficulty selection in that same scene. Progression changes to saved/new-game choices. Back belongs with the lower interaction area when practical.
- Keep the cute shared human-made frog/lily-pad artwork in menus, with the same source artwork across themes.
- Save-slot count and replacement behavior remain deferred. Installation remains an optional secondary action, not a prerequisite to play.

## Gameplay

- Remove the decorative frog for now. Use the available space for board and input rather than adding a mascot area.
- Keep number entry and frequent actions in the bottom interaction area. The top overflow stays for now; moving it later remains possible without changing gameplay logic.
- No gameplay header, score dashboard, explanatory paragraph, permanent action row or decorative sidebar.
- The board stays opaque, clearly divided into nine regions, with plain upright digits, fixed three-by-three note positions, visible selection and keyboard focus.
- Prefer large usable input targets over filling every empty pixel. Safe-area insets and browser chrome reduce the actual available space.

## Board proportions: still open

Sudoku requires nine rows, nine columns and nine regions of three rows by three columns. It does not require square screen pixels. Rectangular cells preserve those rules if all grid membership and boundaries remain intact. Resize layout geometry, never stretch digit or note glyphs.

Compare square, gentle fit and full remaining-space stretch using the same puzzle, font, notes, controls and board width/height constraints. A taller portrait cell gains height without gaining width; a wider landscape cell gains width without gaining height. More area alone does not establish better readability or touch accuracy.

**Recommendation:** retain square as the reference and evaluate modest rectangular cells. Avoid unrestricted stretching as the initial default. No numerical aspect-ratio cap is selected. Portrait input can use two rows; landscape can use a single bottom row, or a proposed lower-right cluster that leaves a taller board. The lower-right alternative needs approval because the requested baseline is bottom entry.

## Minimal tool-access proposal

Compare one additional bottom **Tools** disclosure with four common actions: **Notes, Undo, Erase, Hint**. This is a proposed access pattern and shortlist, not approval of additional scoring or hint behavior.

- Keep Notes active across digit entries and selected cells. Closing the tray does not turn Notes off; communicate its state visibly and accessibly from the input area.
- Let the tray stay open for a solving sequence. Do not force reopening it for each candidate or undo.
- Keep all digits available with the tray open. Do not cover playable cells or resize the board on each move. If opening requires a different layout, change it once and keep it stable until closing.
- Do not make long press the only access to any tool. Provide named controls, keyboard operation, visible focus and a clear expanded state.
- An ordinary tool tray is active gameplay, not automatically a timer pause. Existing pause/menu rules still apply when play is deliberately paused and the board is concealed.

The mockup places a thin tray in available portrait space; it does not prove that the same gap exists on shorter screens. Landscape, zoomed text and open-tray composition need separate review. A persistent pen/notes switch can be considered only if the single-disclosure approach proves too slow.

## Button finish: still open

1. **Soft raised pastille:** shallow lower lip and a small highlight. Recommended balance of cuteness and legibility.
2. **Restrained jelly:** same stable geometry, with a small static shine and simple gradient. More playful, potentially busier.
3. **Lily-pad inspired:** broad face and small decorative notch. Strong frog-world character, but keep an intact generous hit area and readable center.

These are CSS control surfaces, not changes to the shared lily-pad sprite. Keep digits flat and high contrast. The visual face may depress inside a stable hit box; it must not move neighboring keys. No heavy glass, realistic 3D assets or constant wobbling is needed.

## Challenges to retain

Bottom placement is a reasonable direction, not a guarantee of thumb reach for every hand, grip or orientation. Test both hands and orientations. Hiding tools reduces clutter but adds a tap. Strictly placing a tall keypad under a landscape board can make cells too short. Elaborate jelly shines and lily-pad cutouts can reduce clarity. Choose through comparison rather than assuming one arrangement solves all cases.

See [board and controls research](research/board-and-controls.md), [button research](research/tactile-buttons.md), [theme structure](research/theme-structure.md) and [visual alternatives](visual-directions.md). Temporary ImageGen studies and exact prompts are under ignored `prototypes/quiet-flat-controls/`. They are illustrative, not measured UI or validated Sudoku.
