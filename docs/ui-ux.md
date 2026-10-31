# Current UI and UX direction

## Selected foundation

Use **C, Quiet Flat**, with **soft-raised pastille buttons**. Keep the world calm and flat while the controls have a shallow lower lip and small highlight. Preserve B, Layered Pond, and A, Expressive Gradient, behind the same components. Human-made production artwork and temporary-only AI concepts remain strict requirements.

The board preference is **Fill space** by default, with **Square** selectable in Settings. These choices do not authorize interface implementation. The unified More menu, transient start status and exact key order below are reviewed recommendations for the current mockup.

## Main menu

Show Quick Play and Progression directly. Quick Play changes to difficulty selection in the same scene; Progression changes to saved/new-game choices. Back returns to modes. Keep main choices in the lower reachable region, with the shared human-made frog/lily-pad artwork confined to the menu. In landscape the menu can recompose title/art and mode choices without a dashboard or header bar.

Save slots, replacement behavior and final mode names remain deferred. A small More affordance can expose settings without requiring PWA installation before play.

## Board and orientation

- Gameplay has no decorative frog, header, persistent score dashboard or reserved status strip.
- Fill space uses the available board allocation after dock, gaps, browser chrome and safe-area insets. Square uses the largest centered square inside that same allocation. Changing the preference leaves the dock in place.
- Persist board shape globally, separately from theme and puzzle saves. Apply it in both modes and orientations. Do not reset selection, notes, input mode, timer history or progress when it changes.
- Portrait uses a bottom dock, two rows by five keys. Landscape uses a right dock, five rows by two keys. This is a functional input area, not a decorative sidebar.
- Recalculate the current usable bounds on rotation. Ideal rectangles transpose, but real browser bars and cutouts mean exact pixel equality is not guaranteed. Do not rotate a rendered board image or distort glyphs.
- Keep nine rows, nine columns and nine regions of three rows by three columns. Rectangular cells preserve those rules. Size upright text and fixed-position notes against the shortest cell dimension.

Recommended setting label: **Board shape: Fill space / Square**. Stable internal preference identifiers should not depend on localized labels. No ratio slider, per-orientation shape preference or automatic override is requested.

The mockup uses ascending row-major order:

```text
Portrait                  Landscape
1 2 3 4 5                 1 2
6 7 8 9 More              3 4
                          5 6
                          7 8
                          9 More
```

That order is a proposal. Preserving portrait groups as landscape columns, `1 6; 2 7; 3 8; 4 9; 5 More`, is a defensible alternative. Literal clockwise rotation would start with `6 1`, making sequence scanning less direct. No study establishes an optimal order; do not claim that any arrangement automatically preserves muscle memory.

## Reviewed More-menu recommendation

Exactly ten permanent gameplay controls: **digits 1 through 9 plus one three-dot More key**. Replace the separate top overflow and old Tools key with this single affordance in the current proposal. It opens Notes, Undo, Erase, Hint and a Settings entry together. Do not introduce a More > Tools > action hierarchy. Opening More and selecting a tool remains two activations; Settings is intentionally one further level because it is infrequent.

The popup may overlay the board or keys temporarily. It does not reserve space or reflow the board. Give it readable localized labels, visible focus, an expanded state, Escape/outside dismissal and predictable focus return. Dismissing must not also activate a concealed key or cell.

Close the popup after a tool is chosen to return to play. **Notes stays active** across cell and number entry, with a small pen-mode indicator within the existing ten-control area and an accessible state. No eleventh mode key is approved. Repeated Undo may make reopening tedious; evaluate that before adding a stay-open exception. Hint content and scoring treatment remain open.

Full Settings can pause and conceal the puzzle. The ordinary More/tool popup is active gameplay and does not stop the scoring clock. Closing an overlay must restore the same logical focus and selected cell.

## Progress information without a permanent HUD

User suggestion: briefly show Metamorphosis, Leap and Dewdrops at puzzle start and end. The reviewed recommendation adjusts it:

- **Start:** an optional brief, nonblocking notice; no mandatory countdown, focus theft, permanent layout reservation or input lock. It may disappear quickly because the information is also available without a time limit in Settings/session information. Dismissible-on-interaction behavior and exact duration need review.
- **During play:** no always-visible counters. More > Settings can recover the current session information. Quick Play shows only relevant information rather than invented progression counters.
- **Completion:** stop active time and award once, then retain the completed puzzle/result and earned Dewdrops until Continue. An effect can end quickly; the information must not auto-disappear.

Announce meaningful status politely without moving focus. Keep reduced-motion behavior equivalent. Time starts when the board is revealed and interactive, not after the first digit. A visible-board start notice or More popup does not create untimed solving time. If a future blocking intro is chosen, keep the board concealed until it ends and allow immediate skipping; that is not the current recommendation.

## Challenges retained

Full stretch uses area but does not enlarge the short cell dimension, so nine-candidate notes need actual-size checks. Right-side controls may be less comfortable for a left-handed landscape grip; do not invent a handedness setting before testing. A desktop-height five-row dock needs sensible visual sizing rather than enormous buttons. Hiding tools preserves the screen but cannot match direct controls for activation count. Required timed splashes create friction and can be missed. The names Metamorphosis and Dewdrops need room in secondary/result views, not a cramped permanent header.

## Evidence and temporary views

See [responsive audit](research/responsive-dock-audit.md) and [menu/status audit](research/menu-and-status-audit.md). Earlier [board research](research/board-and-controls.md) and [button research](research/tactile-buttons.md) remain comparisons, not current settings. The three [visual treatments](visual-directions.md) and [theme system](themes.md) remain independent of layout.

The current ImageGen sheet under ignored `prototypes/fill-space-dock/` shows only portrait/landscape main menu and gameplay. It uses More closed and no permanent HUD. Its proportions are illustrative, not measured phone viewports, accessibility evidence, production artwork or verified Sudoku. No UI code is implemented.
