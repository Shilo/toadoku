# More menu and transient status audit

Research date: October 31, 2026. This is an independent design challenge, not interface implementation or approval of unresolved tool behavior, scoring, or layout proportions.

## Direction under review

Use exactly ten permanent gameplay controls: digits 1 through 9 and one three-dot **More** button. Portrait uses two rows of five; landscape uses two columns of five in a right-side dock. Remove the floating top overflow. The board and dock use the available space without a permanent HUD, tool row, or decorative gameplay frog.

More opens one compact overlay containing **Notes, Undo, Erase, Hint**, and **Settings**. Settings opens its own view. Covering part of the board or keypad temporarily is acceptable in this proposal. This supersedes the earlier research assumption that every key must remain exposed while tools are open; it does not require shrinking or reflowing the board.

## Findings and recommendation

| Choice | Benefit | Challenge | Recommendation |
| --- | --- | --- | --- |
| Tools directly in More, Settings one level deeper | Common actions are exposed together; infrequent preferences stay separate | More is one activation to expose tools, then another to perform an action | Preferred starting point. Do not describe tool execution itself as one tap |
| Every setting in More | All options are exposed in one place | Longer scanning and scrolling compete with frequent tools, especially in landscape and translated text | Keep language, theme and appearance in Settings |
| Modal tool sheet | Clear temporary task boundary | Notes activation can strand the player away from number entry; repeated tools require repeated dismissals | Prefer a compact popover with explicit dismissal and a direct return to entry |
| Brief status at puzzle start and finish | Preserves board space during solving | Timed text can be missed; compulsory waits become friction | Nonblocking start status, persistent completion result until Continue |

The ten-control constraint is reasonable, but it does not make hidden tools as fast as permanent controls. Measure Notes switching and repeated undo before adding another interaction system. Do not add an eleventh key, long-press requirement, gesture-only shortcut, or auto-cycling menu to compensate speculatively.

## Keep Notes usable

Recommend closing More immediately after toggling Notes, leaving Notes active across cells and digit entries. Show the active state within the existing input area, for example a small pen indicator on More and visibly marked digit keys. Do not use color alone or replace the digit glyphs with ambiguous symbols. Give the Notes toggle a programmatically exposed state and a clear localized name.

For the initial comparison, close More after Undo, Erase or Hint as well, returning to the same selection. Consistent dismissal avoids covering the next entry target. Repeated undo is the strongest challenge to this simple rule; if testing shows excessive reopening, compare leaving the popover open after Undo. Do not select that exception without checking touch, keyboard and screen-reader workflows. Hint meaning and any confirmation remain separate decisions.

The popover must have named controls, visible focus, Enter/Space operation, an expanded state on More, Escape dismissal and a predictable focus return. Outside dismissal must not also enter a digit or modify a cell underneath. Hover and long press can never be the only access. A disclosure with ordinary buttons is a valid simpler candidate; using ARIA menu roles instead entails the complete menu keyboard model. These recommendations follow the [W3C disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) and [menu button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/).

Settings can be a true modal: close the tools popover first, move focus into Settings, provide an explicit Close/Resume control, contain keyboard focus while open and restore focus on exit. Do not label a popover modal while letting other users interact outside it. See the [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

## Show status without a permanent HUD

At the start of a Progression puzzle, a brief nonblocking status can show **Metamorphosis**, **Leap**, and the **Dewdrops** balance. Quick Play should show only information relevant to that mode. Do not steal focus, disable entry, reserve permanent board space, or require waiting through an introduction. Keep the same information available without a time limit in the Settings/session view reached through More. Announce an appropriate status message politely without moving focus; avoid reading a whole dashboard after every digit. [W3C status message guidance](https://www.w3.org/WAI/WCAG21/Understanding/status-messages) supports announcements that preserve the current task.

A few seconds is not a universally readable duration. W3C's timing guidance explicitly permits a temporary notification when the same information is available through a non-timed alternative. It does not make inaccessible disappearing text acceptable merely because it is short. See [W3C Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html).

At completion, stop time, award the result once, and keep the completed board and result available until **Continue**. Include earned Dewdrops and a concise result; a celebratory effect may finish quickly while the information persists. Do not automatically replace the puzzle or hide rewards after a few seconds. This agrees with the existing [progression behavior](../progression.md). Score details and numerical rewards remain proposals under [scoring](../scoring.md).

## Timing rule

Start measuring active play when the board is revealed and interactive, not at page paint and not only after the first entered digit. The latter would grant unlimited untimed study of a visible board. A nonblocking start message does not pause time. More and ordinary tools are active gameplay, so their time counts.

When Settings or an explicit pause stops time, conceal the puzzle and notes until Resume. A dim but readable board still permits untimed solving. Backgrounding follows the same active-time rule. Do not add a separate permanent pause control to satisfy the ten-control layout; route pausing through the existing secondary surface if selected.

## Check in the next comparison

Show More closed and open in both orientations; inspect Notes on, keyboard focus, safe-area insets, zoomed/localized labels and the return to entry. Confirm that the landscape dock leaves sufficiently large targets and that the popover remains reachable on short screens. A static mockup can compare composition, but cannot validate dismissal, accessibility or solving speed. Keep all mockups temporary and ignored.
