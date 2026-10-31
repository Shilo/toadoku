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
- ImageGen mockups before interface prototypes. Temporary work stays ignored.
- Keep personal context out of project artifacts.

## Open proposals

| Topic | Proposal requiring discussion |
| --- | --- |
| Visual direction | Compare immersive pond, pumpkin habitat, and frog-cell treatments |
| Halloween palette | Pumpkin orange, near-black, purple, and frog green; select exact swatches visually |
| Controls | Number entry plus overflow; decide contextual access to essential solving tools |
| Seasonal dates | October 24 through November 7 inclusive, using local dates |
| Stack | Svelte + TypeScript + Vite; compare vanilla TypeScript and Phaser tradeoffs |
| Modes | Quick Play plus an optional Pond Journey |
| Difficulty | Human solving techniques; clue counts alone are insufficient |
| Journey supply | Reviewed stages with randomized practice within difficulty bands |

## Rejected prototype direction

The first experiment looked too much like a conventional web application: top bar, excessive actions, text and spacing, and an insufficiently Halloween-colored palette. It does not establish the production direction.
