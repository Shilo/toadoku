# Responsive board and solving controls

> Research record: original proposals may be superseded. Read the [design handoff](../design-handoff.md) and [current UI/UX](../ui-ux.md) for selected decisions; this record does not approve implementation.

Research checked October 31, 2026. Recommendations below remain proposals. Current discussion selects Quiet Flat CSS, removes frogs from gameplay while retaining them in the menu, puts number entry at the bottom, and retains the top overflow for now. The remaining decisions are board proportions and access to solving tools.

## Recommendation for visual comparison

Compare a square board with a modestly taller portrait board using identical digits, notes, borders and controls. Include an unrestricted remaining-space rectangle as a stress case so the benefit and cost of filling the screen are visible. Do not declare a numerical aspect-ratio limit before comparing these layouts. In landscape, compare the requested bottom keypad first; if cell height becomes too small, discuss relocating number entry rather than silently changing the requirement.

Use one bottom Actions disclosure for Notes, Undo, Erase and Hint. Let the tray stay open during a solving sequence, and keep notes mode active across number entries and cell changes. A tray that closes after every action would add avoidable repeated taps. If frequent pen/notes switching still feels slow, compare one persistent pen/notes switch within the number-entry area before adding other permanent controls.

This is design judgment informed by the sources below. The sources establish existing controls and accessibility requirements. They do not establish an optimal Sudoku cell aspect ratio or prove that one layout improves solving speed.

## What existing games actually provide

| Primary source | Observed or documented behavior | Implication for Toadoku |
| --- | --- | --- |
| [Sudoku.com live web interface](https://sudoku.com/) | Lists Undo, Erase, Notes, Hint and digits 1 through 9 | These four tools are recognizable reference actions, not an obligation to copy its action row |
| [Apple News sudoku help](https://support.apple.com/en-lamr/guide/iphone/iph9b53d2906/27/ios/27) | Pen and Notes input, Eraser, Undo, hints and checks; additional options and settings in menus | Input mode matters during solving; help and settings can occupy separate layers |
| [Arkadium sudoku support](https://support.arkadium.com/support/solutions/articles/44002863192--sudoku-how-to-play-menu-tips-scoring) | Direct undo, pencil and eraser icons; menu includes notes behavior, timer, errors, reveal and other options | Common functionality can have both direct and menu access; copying the whole menu would add unnecessary scope |

Notes, undo, erase and hints are a sensible initial tool set. Check, pause, automatic notes, matching-digit highlighting, redo and timer visibility vary by product. Their presence elsewhere does not approve them here. In particular, checking a solution differs from marking a duplicate in a row, column or box; assistance behavior and scoring still need agreement.

The extraction confirms available controls, not their exact responsive placement or current hit-box sizes. Publisher screenshots and descriptions are references, not usability studies.

## Square versus rectangular cells

The Sudoku rule concerns membership: nine rows, nine columns and nine regions containing three rows by three columns, with digits 1 through 9 exactly once in each unit. [Sudoku.com's rules](https://sudoku.com/) describe those constraints. Pixel aspect ratio does not change unit membership. A rectangular region can still contain three rows by three columns, and a rectangular cell is still one cell. This is a mathematical inference from the rules, not evidence that every proportion is equally comfortable.

If board width is W and height is H, each cell measures approximately W/9 by H/9. Its aspect ratio is therefore W:H. Borders reduce the usable interior slightly. Stretching the board vertically increases height while leaving the narrow dimension unchanged. Text should retain its normal proportions; stretching the entire rendered board with a transform would distort digits and notes.

| Layout | Potential benefit | Cost to examine visually |
| --- | --- | --- |
| Square | Familiar visual geometry; equal row and column spacing | Leaves some remaining space unused on a tall screen |
| Mildly taller portrait cells | Uses more height and enlarges vertical touch area without changing the rules | Longer vertical scanning distance; digit and note sizes still limited by cell width |
| Fill all remaining portrait space | Largest board area under fixed bottom controls | Can make very tall cells, spread note positions and separate rows without making digits wider |
| Mildly wider landscape cells | Uses some spare width | Does not solve limited cell height; note layout needs inspection |
| Fill all remaining landscape space | Occupies almost all horizontal room | Can create very wide, shallow cells; horizontal scanning distance grows while notes remain constrained vertically |

The scanning concerns above are geometric hypotheses. No controlled comparison of these aspect ratios was found in the consulted primary sources. Square is not mandatory, and a rectangle is not automatically more readable merely because its area is larger.

Keep candidate notes in fixed three-by-three positions, with the same digit always occupying the same position. Do not reflow candidates into two columns on one orientation or enlarge their glyphs independently of the available width and height. Both square and rectangular boards need tests with all nine candidates, several sparse candidate patterns, selection and conflict markings, and strong region boundaries.

### Illustrative geometry, not a device specification

The following assumes an already available board area, after browser chrome, safe areas, controls and gaps have been accounted for. It is not a claim about the actual usable area on any phone.

| Available board area | Board choice | Approximate cell size |
| --- | --- | --- |
| 360 by 640 CSS pixels, portrait | Square, 360 by 360 | 40 by 40 |
| Same area | Modest rectangle, 360 by 432 | 40 by 48 |
| Same area | Fill, 360 by 640 | 40 by 71 |
| 800 by 240 CSS pixels, landscape | Square, 240 by 240 | 27 by 27 |
| Same area | Fill, 800 by 240 | 89 by 27 |

The landscape fill version increases width but leaves only about nine CSS pixels of height per candidate-note row before padding and borders. A taller keypad or expanded tray makes this constraint tighter. The numbers show why board area alone is an incomplete sizing objective.

## A compact bottom input area

A single nine-digit row is only 40 CSS pixels per key at 360 CSS pixels wide before gaps. Adding an Actions key to the same row reduces that to 36. These can exceed WCAG's minimum while falling short of a more comfortable target goal. Compare two rows containing digits 1 through 9 plus Actions; this gives ten controls without an additional action-button row. The cost is extra height, which must be included in the board comparison. Key order and row grouping remain proposals.

The Actions tray should expand from the bottom input area and have an explicit close affordance using the same disclosure button. Keep all digits available while entering notes. Do not cover editable cells, shrink and expand the board on every number entry, or dismiss the tray when the player selects another cell. If the tray requires board space, show the resulting reduced board once when it opens and keep that layout stable until it closes. Compare this with reserving tray space only if the unused space is acceptable.

Suggested behavior for review:

- Notes is a sticky toggle, visibly and accessibly announced even when the tray closes. Repeated note digits toggle individual candidates. It must not require reopening the tray for each candidate.
- Undo reverses an entry or erase, including any note changes belonging to that move. Erase clears only an editable selected cell and is undoable; original clues cannot be erased. These are proposed semantics, not an approved history implementation.
- Hint opens assistance deliberately; avoid accidental one-tap answer reveals or changes to notes. Hint content and its scoring consequences remain separate decisions.
- Top overflow retains session and preference actions. Avoid duplicating every bottom tool there unless there is a demonstrated accessibility need.

A bottom position can reduce travel for some grips, but thumb reach depends on device, hand, handedness and one-handed or two-handed use. It is not a universal rule that every point at the bottom is reachable. Test actual grips and both orientations. On short landscape screens, a side keypad could preserve more board height, but that conflicts with the present bottom-entry direction and needs discussion before adoption.

## Accessibility and validation constraints

[WCAG 2.2 target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) specifies 24 by 24 CSS pixels or applicable exceptions, including a spacing alternative. [Enhanced target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) uses 44 by 44 CSS pixels at Level AAA. [Android guidance](https://support.google.com/accessibility/android/answer/7101858?hl=en) recommends at least 48 by 48 dp and describes extending hit regions without overlapping neighboring targets. Android dp and browser CSS pixels are separate units; do not present 48 CSS pixels as a WCAG requirement.

Aim for generous number keys and Actions targets, then measure board cells separately. Nine adjacent 44 CSS pixel cells require 396 CSS pixels before borders, so a full-width board on a 360 CSS pixel viewport cannot meet that enhanced size for every cell. Taller cells do not fix the width constraint. Do not claim a target exception automatically applies to Sudoku or enlarge hit areas into neighboring cells.

[WCAG keyboard access](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) requires operable functionality through a keyboard interface. Propose arrow-key cell navigation, digits for entry, Delete/Backspace for erase, and documented undo and notes shortcuts. Keep shortcuts scoped to gameplay focus. A long press may be an optional shortcut, never the sole access to a required tool. All visible controls need localized accessible names, visible focus, and a mode state conveyed beyond color. The [WAI disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) provides button semantics, Enter/Space operation and an expanded state for Actions. An interactive board can follow the [WAI grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), with managed focus and directional navigation; adding a grid role alone does not implement that behavior.

[WCAG orientation](https://www.w3.org/WAI/WCAG22/Understanding/orientation.html) supports both orientations unless a particular orientation is essential. Validate portrait and landscape with browser controls visible, installed PWA, safe-area insets, text enlargement and an open tray. Check the existing 360 by 800 and 393 by 873 CSS pixel targets and their landscape equivalents. Measure digit readability, all-nine-candidate readability, precise selection and tool switching on actual hardware. A successful mockup does not establish those results.
