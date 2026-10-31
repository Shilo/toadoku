# Requirements and open decisions

Next milestone: a theme-focused visual prototype with menu/gameplay navigation, static numbers, pad selection and animated Pond backgrounds. Full Sudoku logic, modes, rewards, saves and production/PWA work are excluded. Requirements below describe the eventual product, not authorization to implement everything. More functionality, Halloween and sprite-pack acquisition remain deferred. See [prototype scope](design-handoff.md#next-session-visual-prototype-only).

## Accepted requirements

- Name: Toadodu. Classic numbered Sudoku with frogs in every theme.
- Immersive, colorful, minimal gameplay; large board and one consolidated secondary entry point, with exact More-menu behavior under review.
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
- Retain classic Sudoku rules and solving functionality. Inward circular-derived pads over B, Winding shallows, are selected; structure must still communicate rows, columns and all 3 by 3 regions.
- ImageGen mockups before interface prototypes. Temporary work stays ignored.
- Production artwork must be human-made with suitable licensing and provenance. Free or paid assets are allowed. AI-generated graphics are restricted to temporary mockups/prototypes and must not ship.
- Visual implementation must prioritize a flat, full-screen, minimal, super-cute frog environment built mainly from HTML/CSS colors, gradients and soft shapes, with only a few human-made sprites.
- Frog and lily-pad sprites stay unchanged between basic and Halloween themes. Theme changes affect UI colors, gradients, background styling, buttons and font roles, not sprite artwork or accessories.
- Selected initial visual direction: C, Quiet Flat. Preserve B, Layered Pond, and A, Expressive Gradient, as modular future treatments.
- Accepted board direction: top-down CSS pond with procedural 1:1 circular lily-pad faces, full stretched rectangular cell buttons, no conventional drawn grid/frame, and spatial 3 by 3 grouping. Circle diameter follows the shorter cell dimension; use 50% radius and keep lip/highlight inside the silhouette.
- Keep input/action keys a distinct warm cream/ivory color family against green board pads.
- Water stays flat but expressive: exactly three solid colors shared unchanged by menu/gameplay, arranged in broad organic pond/shallows shapes. No extra background tint/blend, large ripple rings or reflective/gradient scene. Control fills, lips, ink and art are separate from the three water colors.
- Preserve soft-raised green circles and unchanged cream menu/input buttons. The new full-circle request supersedes the stretched notched silhouette, not the tactile styling.
- Every group's visible circles, lips and labels stay in one water fill. Selected B needs broad winding contours, not slightly wavy rectangular panels. Curves may use unused water inside stretched cells while every cell remains a full rectangular button; background color never reassigns logical regions.
- Selected board design B, Winding shallows: whole-region arrangement `A B C / B C A / C A B`, for a more natural pond. Preserve A, Connected bays (`A B A / C A C / A B A`), as a documented alternative. These board names are independent of the earlier A/B/C scene treatments; Quiet Flat C remains selected.
- Inward placement is selected: group rows align bottom/center/top and columns right/center/left; labels follow the pad. Preserve full rectangular button bounds. Centered is an archived comparison, not a new setting.
- Future pad refinement: research procedural splits/cutouts and optional irregular perimeter within the 1:1 envelope, preserving colors, raised styling, readable center and full hitbox. Exact generator and cuts are not selected or implemented.
- Future motion requirement: slowly animate menu/gameplay water while preserving the selected three-color flat design and stable controls. Simple shape drift/deformation and a shader require comparison; no renderer is selected or implementation/performance claimed. Reduced motion remains static.
- Exactly two authored spacing tokens: 4px between cell rectangles/action buttons and 8px at scene edges, group gutters and board/dock separation. Extra water around circular faces is an effect of their aspect ratio/alignment, not another padding token. Same constants in menus and both orientations; system safe areas are additional.
- Region recognition must survive loss of hue through shape, spacing and lightness. Subtle alternating pad greens were ineffective; rectangular water panels undermined immersion. Neither comparison is selected.
- Themes must support optional human-made PNG/JPEG/WebP backgrounds with CSS fallback; no background image is selected.
- Number entry uses a bottom two-row/five-column dock in portrait and a right five-row/two-column dock in landscape. Keep digits upright; recalculate usable bounds rather than assuming literal pixel transposition.
- Selected control finish: soft-raised pastilles. Selected default board shape: Fill space, with a persistent Square option available through Settings.
- More stays in the menu/tenth gameplay-key position but is disabled for now. No replacement top overflow or active placeholder menu.
- Fill space fills the entire rectangle remaining after the single 8px scene inset, dock and 8px board/dock gap. No extra board margins, wrapper padding or reserved header. Dock keys sit at the bottom/right inside the same scene inset.
- In both orientations, main-menu modes form a bottom-left block: Quick Play above Progression. More is bottom-right, vertically aligned with Progression. Title and combined placeholder remain higher in the scene.
- Use one intentionally rough black-and-white frog-plus-lily-pad template image with a question mark, replaceable as one file. Final art remains human-made; current asset sourcing is deferred.
- Brief nonblocking start status and persistent completion information until Continue are selected in principle; exact presentation remains open.
- Remove the decorative frog from gameplay for now, retaining the menu's frog identity and maximizing board space.
- Main menu shows both modes directly. Quick Play selection reveals difficulty choices in the same scene. Progression selection reveals existing-save/new-game choices. Back returns to mode choices.
- Keep personal context out of project artifacts.

## Open proposals

| Topic | Proposal requiring discussion |
| --- | --- |
| Visual details | Quiet Flat selected; exact colors/fonts, control finish and layout details remain open. Preserve [all three treatments](visual-directions.md) |
| Button details | Soft raised selected; exact lip, highlight, colors, focus and pressed treatments need visual refinement |
| Board preference | Fill space default and Square selected; final setting wording, dock sizing and actual-size note readability need review |
| Key details | Ascending row-major order is selected in both orientations; final accessibility/interaction validation remains open |
| Tool access | Deferred: menu More regular options; gameplay More regular options plus tools alongside, subject to responsive review. Earlier popup structures are alternatives |
| Status presentation | Nonblocking start and persistent completion accepted; exact timing and future non-timed recovery surface remain open |
| Human-made artwork | One provisional composite menu image now; final human-made replacement and rights later. No pack acquisition in the current milestone |
| Save slots | Deferred: three slots is only a suggestion; count and replacement behavior are not selected |
| PWA install entry | Optional overflow placement when installation is available; visibility and browser fallback remain proposals |
| Halloween | Deferred until basic Pond gameplay is settled; earlier palette/event proposals are preserved |
| Controls | Number entry plus overflow; decide contextual access to essential solving tools |
| Seasonal dates | October 24 through November 7 inclusive, using local dates |
| Repeat schedule and display | Metamorphosis and Leap selected. Initial numbering convention, loop length, band schedule and display placement remain open |
| Currency and scoring | Dewdrops selected; formula, reward bands, assistance treatment, speed targets and conversion rate await discussion. See [proposal](scoring.md) |
| Level revisits | Fresh randomized puzzle required. Preserve furthest advancement; cross-reset unlock access and exact return-to-active-game behavior need confirmation |
| Difficulty | Human solving techniques; clue counts alone are insufficient |
| Puzzle supply | Bundled pre-rated bank approach approved; specific catalog source, size and imported subset remain open |
| Region details | B, Winding shallows, selected; A preserved. Exact contour tuning, palette and accessibility checks remain open. Preserve uniform soft-raised pads, fixed spacing and no outlined/raised region cards |
| Pad cutouts | Research actual leaf references, splits/cutout masks and restrained edge irregularity. Silhouette refinement only; method/parameters and note readability need review |
| Water motion | Research CSS-led shape movement against a shader only if justified. Preserve three fills, inward pad containment, static reduced motion and target-device performance; implementation remains future work |

## Rejected prototype direction

The first experiment looked too much like a conventional web application: top bar, excessive actions, text and spacing, and an insufficiently Halloween-colored palette. It does not establish the production direction.
