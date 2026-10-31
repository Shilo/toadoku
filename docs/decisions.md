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
- Production artwork must be human-made with suitable licensing and provenance. Free or paid assets are allowed. AI-generated graphics are restricted to temporary mockups/prototypes and must not ship.
- Visual implementation must prioritize a flat, full-screen, minimal, super-cute frog environment built mainly from HTML/CSS colors, gradients and soft shapes, with only a few human-made sprites.
- Frog and lily-pad sprites stay unchanged between basic and Halloween themes. Theme changes affect UI colors, gradients, background styling, buttons and font roles, not sprite artwork or accessories.
- Selected initial visual direction: C, Quiet Flat. Preserve B, Layered Pond, and A, Expressive Gradient, as modular future treatments.
- Themes must support optional human-made PNG/JPEG/WebP backgrounds with CSS fallback; no background image is selected.
- Number entry and frequent actions belong toward the bottom; the overflow stays at the top for now, with future relocation possible.
- Remove the decorative frog from gameplay for now, retaining the menu's frog identity and maximizing board space.
- Main menu shows both modes directly. Quick Play selection reveals difficulty choices in the same scene. Progression selection reveals existing-save/new-game choices. Back returns to mode choices.
- Keep personal context out of project artifacts.

## Open proposals

| Topic | Proposal requiring discussion |
| --- | --- |
| Visual details | Quiet Flat selected; exact colors/fonts, control finish and layout details remain open. Preserve [all three treatments](visual-directions.md) |
| Buttons | Compare soft raised pastille, restrained jelly and lily-pad-inspired CSS finishes; no finish selected |
| Board proportions | Compare square, gentle fit and full stretch; no aspect ratio selected. Landscape lower-right input is an alternative requiring approval |
| Tool access | Proposed one bottom Tools disclosure for Notes/Undo/Erase/Hint, with sticky Notes and stable open-tray behavior; not yet selected |
| Human-made artwork | Creator, asset sources, license/attribution, art direction and budget remain open |
| Save slots | Deferred: three slots is only a suggestion; count and replacement behavior are not selected |
| PWA install entry | Optional overflow placement when installation is available; visibility and browser fallback remain proposals |
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
