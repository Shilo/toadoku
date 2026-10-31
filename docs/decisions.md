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
| Progression structure | Fixed replayable stages, an ongoing fresh-puzzle sequence, or a small combination; no story or map is approved |
| Difficulty | Human solving techniques; clue counts alone are insufficient |
| Puzzle supply | Reviewed fixed stages versus generated or pregraded fresh puzzles; choose before implementation |

## Rejected prototype direction

The first experiment looked too much like a conventional web application: top bar, excessive actions, text and spacing, and an insufficiently Halloween-colored palette. It does not establish the production direction.
