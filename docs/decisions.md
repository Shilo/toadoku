# Requirements and open decisions

## Accepted requirements

- Name: Toadodu. Classic numbered Sudoku with frogs in every theme.
- Immersive, colorful, minimal gameplay; large board and one floating overflow entry point.
- Mobile and desktop, portrait and landscape; Motorola G31/G32 targets.
- Persistent English, German, and Spanish.
- Automatic and explicit seasonal themes, separate light/dark appearance.
- Customizable theme colors, backgrounds, motion, and localized text.
- Separate Sudoku, session, theme, localization, storage, and presentation responsibilities.
- GitHub Pages hosting, JavaScript delivery, no required WebAssembly.
- Approved stack: Svelte + TypeScript + Vite, delivered as a PWA with offline play.
- Initial modes: Quick Play and Progression only. Daily challenges and additional rule variants are outside the initial scope.
- Progression uses randomized selection from a bundled, pre-rated puzzle collection.
- Progression loops: completing the final level increments a repeat counter, resets the level to 1, and returns to easiest difficulty with another puzzle. Preserve puzzle-use history and currency across repeats. The label Cycle was rejected.
- Previously completed levels can be revisited, drawing a fresh randomized puzzle for the chosen level.
- Both modes award a performance score and persistent currency based on difficulty, speed and efficiency. No store, spending, purchases or upgrades are in scope.
- Approved names: Metamorphosis for the repeat counter, Leap for a level, and Dewdrops for the single earned currency. These names add no transformation mechanic or extra progression system.
- Retain traditional Sudoku's basic layout and functionality. Visual themes must preserve familiar solving interactions.
- ImageGen mockups before interface prototypes. Temporary work stays ignored.
- Keep personal context out of project artifacts.

## Open proposals

| Topic | Proposal requiring discussion |
| --- | --- |
| Visual direction | Compare immersive pond, pumpkin habitat, and frog-cell treatments |
| Halloween palette | Pumpkin orange, near-black, purple, and frog green; select exact swatches visually |
| Controls | Number entry plus overflow; decide contextual access to essential solving tools |
| Seasonal dates | October 24 through November 7 inclusive, using local dates |
| Repeat schedule and display | Metamorphosis and Leap selected. Initial numbering convention, loop length, band schedule and display placement remain open |
| Currency and scoring | Dewdrops selected; formula, reward bands, assistance treatment, speed targets and conversion rate await discussion. See [proposal](scoring.md) |
| Level revisits | Fresh randomized puzzle required. Preserve furthest advancement; cross-reset unlock access and exact return-to-active-game behavior need confirmation |
| Difficulty | Human solving techniques; clue counts alone are insufficient |
| Puzzle supply | Bundled pre-rated bank approach approved; specific catalog source, size and imported subset remain open |

## Rejected prototype direction

The first experiment looked too much like a conventional web application: top bar, excessive actions, text and spacing, and an insufficiently Halloween-colored palette. It does not establish the production direction.
