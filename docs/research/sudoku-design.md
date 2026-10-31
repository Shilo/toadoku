# Sudoku interaction and frog art research

> Research record: original proposals may be superseded. Read the [design handoff](../design-handoff.md) and [current UI/UX](../ui-ux.md) for selected decisions; this record does not approve implementation.

> Historical research. The initial top bar, action row, spacious web layout and muted palette recommendations are superseded by [current design constraints](../design.md). Artwork formats and visual concepts remain proposals; use ImageGen mockups before implementation.

> Current direction selects Quiet Flat C, removes the gameplay frog and puts primary input at the bottom. Earlier mascot/frog-cell and seasonal-accessory ideas below are not the selected gameplay approach. See [UI and UX](../ui-ux.md).

Research date: October 30, 2026. The observations below come from publisher pages and official web standards. Proposed Toadodu designs are recommendations, not claims about those products.

## The reference and the rules

The verified [Meowdoku publisher listing](https://play.google.com/store/apps/details?id=com.oakever.meowdoku) describes colored territories, one cat per region, row and column, and a no-touch rule. It uses double taps to place cats, offers offline play and daily puzzles, and presents a minimalist character-led identity. It is a different puzzle from classic number Sudoku. Many similarly named browser sites are independent fan implementations, so their behavior should not be attributed to the original app.

Toadodu should borrow its friendly characters, focused play surface and satisfying feedback while preserving the classic 9 by 9 number puzzle. Each row, column and 3 by 3 box contains digits 1 through 9 once. Given clues remain fixed. Digits stay visible; a frog never replaces a digit or introduces a new rule. The [Sudoku.com rules](https://sudoku.com/how-to-play/sudoku-rules-for-complete-beginners/) confirm this familiar structure.

## Common Sudoku patterns and the first release

The live [Sudoku.com interface](https://sudoku.com/) provides difficulty selection, cell-then-number entry, undo, erase, notes, hints and a timer. [Arkadium's player documentation](https://support.arkadium.com/support/solutions/articles/44002863192--sudoku-how-to-play-menu-tips-scoring) similarly exposes undo, notes and erase near the board, placing less frequent settings in an upper-right menu. These overlapping patterns are a strong baseline.

| Interaction | Toadodu recommendation | Reason |
| --- | --- | --- |
| Entry | Select a cell, then tap a digit, or type 1 to 9 | Familiar and predictable on both inputs |
| Selection | Outline selected cell; softly highlight row, column, box and matching digits | Helps scanning without altering puzzle logic |
| Notes | Visible toggle, miniature 3 by 3 digit arrangement | Supports genuine deduction |
| Undo | One action per step, including related note changes | Makes experimentation reversible |
| Erase | Clear editable value or notes, never a clue | Reliable recovery |
| Hint | Prefer a logical explanation; label simple reveals honestly | Avoid pretending a reveal teaches a method |
| Errors | Mark direct row, column and box conflicts; keep play possible | Feedback without a punitive lives system |
| Save | Automatically save board, notes, elapsed time and settings locally | Resume without an account |
| Difficulty | Easy, medium and hard before starting | Small and understandable choice set |
| Timing | Subtle elapsed time, pause when hidden or paused | Preserves a calm experience |
| Completion | Explicit validated success, small frog celebration, next game action | Clear closure and reward |

Avoid an initial feature expansion into streaks, currencies, leaderboards, ads or collections. A hint that reveals a correct solution digit should be called a reveal unless a human-solving explanation exists. Difficulty should eventually reflect required solving techniques, not only the number of clues. A unique solution alone does not prove a puzzle can be solved with a supported set of human techniques.

## Three visual concepts

| Concept | Board and frog treatment | Halloween expression | Tradeoff |
| --- | --- | --- | --- |
| Lily Ledger | Continuous crisp grid, lily-pad selected cell, one frog perched at its edge | Lanterns, moonlit water and a witch hat on the same mascot | Cleanest and easiest to read, least literal frog-cell treatment |
| Frog Chorus | Cells have restrained rounded frog silhouettes; digits sit on clear bellies; selected cell gains eyes or paws | Aubergine pond, sage frogs, pumpkin focus accents | Strongest identity; full frog faces on all 81 cells can make notes and box boundaries noisy |
| Moonlit Field Notes | Warm notebook board floating in a softly illustrated pond; frogs hold number cards near controls | Autumn reeds, pumpkin lantern and small ghost fireflies | Most atmospheric; illustration must shrink or disappear on short screens |

Recommended prototype: Frog Chorus with the restraint of Lily Ledger. Use a continuous rectangular grid with decisive 3 by 3 divisions. Add small vector frog accents to the selected or freshly entered cell, and a larger mascot outside the board. Keep other cells quiet. This retains the playful idea without forcing every digit into a tiny face. If every cell is frog-shaped later, keep that decoration behind digits and verify candidate legibility at the smallest supported width first.

Do not make tapping a frog necessary to reveal an already-entered digit. Sudoku depends on comparing many visible values at once. A tap can produce a short blink, tiny squash or ripple while the number remains legible.

## Original frog artwork direction

[Kamaeru's official publisher page](https://armorgamesstudios.com/games/kamaeru-a-frog-refuge) places frogs within a cozy, decorated wetland habitat. [Frogsong's official site](https://frogsonggame.com/) presents an adventurous world of frogs, bugs and oversized plants. These support two useful reference directions: a welcoming pond habitat, and a recognizable character silhouette framed by natural shapes. They are inspiration sources, not an asset license or a reason to copy a character.

Create an original squat, rounded toad with two prominent eye bumps, a cream belly, short paws, a small curved mouth and restrained cheek marks. Use two or three solid body colors and consistent rounded strokes. Keep its face readable in silhouette. The same frog anatomy and sage body remain across every theme; seasonal hats, lanterns and scenery are separate layers.

| Asset | Preferred format | Notes |
| --- | --- | --- |
| Cell eye bumps, paws and lily motif | Small SVG or CSS shapes | Reusable, sharp at all sizes, recolorable by tokens |
| Main frog mascot | Layered original SVG for first version | Independently animate eyes, body and hat; consistent shape across themes |
| Rich promotional or atmospheric illustration | Optional optimized raster | Best for painted texture, but separate from interactive numbers and controls |
| Digit and candidate content | Real text | Scales, localizes and remains accessible |

[MDN's SVG documentation](https://developer.mozilla.org/en-US/docs/Web/SVG) explains that SVG scales without bitmap quality loss and integrates with CSS and the DOM. Inline SVG layers are therefore useful for a token-colored mascot. This does not mean complex SVG is always cheaper than raster: keep paths and filters simple, and measure on a lower-powered Android device. A detailed painted pond may be more economical as one compressed image than hundreds of vector elements.

Minimum useful mascot states: idle, attentive, pleased and celebration. A slow blink and tiny body breath are enough for idle. Use one brief response to entry, one restrained response to a conflict, and one completion hop. Do not animate all 81 cells continuously. Themes can set duration and ambient density, but reduced-motion preferences take precedence. [CSS keyframes](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animations/Using) cover these small transitions without a game engine.

## Color and seasonal atmosphere

The baseline pond theme should use warm cream surfaces, deep green text, sage frogs and soft water blue. Halloween should feel like the same pond after sunset: deep aubergine background, warm cream board, pumpkin orange actions, muted lavender surfaces and unchanged sage frogs. Decorative pumpkins and a hat establish the season. Avoid using orange for both primary selection and errors without an additional symbol or treatment.

Separate decorative colors from semantic tokens: page, surface, board, grid, text, muted text, accent, selected, peer highlight, matching digit, editable digit, conflict, focus ring, frog body and frog belly. A background token must not determine digit contrast. Every theme also needs light and dark variants rather than treating Halloween as synonymous with dark mode.

Suggested automatic event rule: October 24 through November 7 inclusive in the user's local calendar, with October 31 as the anchor date. This is seven days before, the day itself and seven days after, totaling fifteen dates. Call it a seasonal window rather than an exact two-week interval. Explicit Pond and Halloween choices remain fixed. Automatic resolves the event theme within the window and Pond outside it. Store the selection, not only its currently resolved theme. Re-evaluate when returning to the app and at local midnight.

## Layout and accessibility

Portrait: slim header, compact difficulty/time row, square board, tools, then a large numeric keypad. Landscape: board on the left, tools and keypad on the right. Desktop: constrain board width rather than stretching cells to fill the monitor; mascot and subtle scenery can occupy the surrounding area. Keep menu actions reachable above the board. A vertical three-dot overflow can contain appearance, language, motion, help and return to menu. Exiting to the menu preserves the active save; starting a replacement game requires a clear confirmation.

Use a browser-filling layout rather than requiring the Fullscreen API. Account for safe areas and changing browser chrome. On unusually short screens allow normal vertical scrolling rather than clipping controls or shrinking digits past readability. All decorative layers ignore pointer input.

Target 44 by 44 CSS pixel buttons for keypad, tools and menu where feasible. [W3C's enhanced target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) supports this usability goal. A nine-column board on a 360 CSS pixel viewport cannot fit 44-pixel cells, so do not claim every cell meets that enhanced size. Keep the entire cell tappable, show clear selection feedback, and verify touch accuracy. If necessary, offer a separate enlarged entry interaction later based on observed need.

Implement the [WAI-ARIA grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/): one tab stop into the board, arrow-key cell navigation, and programmatic row and column identification. Include cell value, clue/editable status, candidates and conflict state in accessible names. Support digits, Delete/Backspace, notes toggle and undo using documented shortcuts. Menus must close on Escape and restore focus. Do not announce elapsed time every second to screen readers.

Aim for at least 4.5:1 contrast for ordinary text and notes, with visible focus and non-color conflict indicators. The [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) defines text thresholds. Decorative cuteness must not lower candidate contrast. Respect system reduced motion and offer a persistent app motion setting, following [W3C animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html). Disable ambient movement and celebratory hops when motion is reduced.

## Visual acceptance checks

- Verify all digits and all nine candidate positions remain legible on the narrowest viewport.
- Verify selected, clue, editable, peer, matching and conflict states in both themes and both color modes.
- Verify phone portrait and landscape, desktop, browser zoom, safe areas and open menus without clipped actions.
- Check English, German and Spanish labels in the actual layout, including longer settings labels.
- Verify animation never blocks entry, moves a hit target or hides a number.
- Verify keyboard-only play, screen-reader labels, focus restoration and reduced motion.
- Keep actual hardware verification distinct from viewport simulation; physical screen pixels are not browser CSS pixels.
