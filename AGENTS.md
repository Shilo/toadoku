# Toadodu

## Product

Toadodu is a cute, polished, frog-themed Sudoku game for browsers on mobile and desktop. Its name combines "toad" and "Sudoku". The experience should feel like entering a quiet little pond: immersive, playful, minimal, and focused on solving a real Sudoku puzzle. Standard digits 1 through 9, familiar row and column rules, and readable 3 by 3 regions remain the foundation. Keep the frog identity in the menu; omit the decorative gameplay frog for now so board and input use the space. Artwork must preserve clear numbers, notes, selection, conflicts, and region boundaries.

The game should feel like a colorful, immersive, full-screen and exceptionally cute frog environment. Start with basic Pond only, Quiet Flat CSS and soft-raised controls; preserve B/A treatments for later. Use only two authored spacing tokens across scenes/orientations: 4px between pads/buttons, 8px at scene edges, group boundaries and board/dock separation. Fill all remaining space without extra wrappers, scenery strips or a header; add necessary system safe-area protection separately. Keys align to the bottom in portrait or right edge in landscape within the same 8px inset. Keep nine digits plus disabled More: two rows of five in portrait, five rows of two in landscape. Recalculate actual viewport/safe areas without rotating logical data or glyphs. Square remains a planned independent preference; its settings access is deferred with More. Do not introduce dashboards, promotional copy, gameplay mascots or permanent status strips. Keep brief nonblocking start information and completion results until Continue. Main-menu Quick Play and Progression form a bottom-left block in both orientations, with disabled More at bottom-right aligned with Progression. Title and art stay higher. Mode selection changes choices in the same scene: difficulty for Quick Play, existing/new save for Progression, with Back returning to modes. Save slots and More functionality are deferred in TODO.md. The proposed future More overlay exposes regular options, with gameplay tools alongside, rather than an extra Tools step; it is not current functionality. Touch, mouse and keyboard must work with equivalent reduced-motion presentation.

Use one intentionally rough black-and-white frog-plus-lily-pad menu placeholder with a conspicuous question mark, replaceable as one composite image. Keep it provisional alongside polished UI. Asset acquisition is deferred; final art remains human-made, with no personal context recorded. The accepted scene is top-down CSS pond water: exactly three solid water colors shared unchanged by menu/gameplay, arranged in broad organic curves suggesting water/shallows, not a blank field, large ripple rings, gradients or reflections. Apply that water style to both scenes. The accepted board uses broad procedural lily-pad faces inside full rectangular hitboxes, without drawn grid borders. Preserve soft-raised green pad faces with a small notch, shallow lip and restrained highlight, plus cream/ivory action/menu buttons; water experiments must not flatten or restyle them. Subtle pad tones and rectangular water panels were ineffective. Board design B, Winding shallows, is selected; preserve A, Connected bays, as an alternative in docs/ui-ux.md. These board names are separate from the earlier scene treatments. Keep each full group's pads, lips and immediate water surround inside one fill; bends stay in existing group channels without extra scenery space. Control/art colors are outside the three-water-color limit. Require shape, spatial group gutters and lightness to work without hue; validate grayscale and color-vision simulations. Retain recognizable rows, columns and regions, upright high-contrast digits and fixed-position notes. Keep pad interiors quiet and opaque; never warp raster artwork to fit stretched cells. Theme boundaries stay modular, but Halloween and seasonal switching are deferred. Do not add a theme editor or plugin framework.

Review Motorola G31/G32 with representative 360x800 and 800x360 CSS viewports at DPR 3; label these as emulation, not observed hardware dimensions. English, German, and Spanish are required throughout the interface. Language, theme, appearance, and current puzzle progress must persist locally. The intended delivery is a static, JavaScript-based application for GitHub Pages, with responsive layouts and installable PWA support. There is no required backend or WebAssembly runtime. Sudoku logic, presentation, themes, localization, and persistence have separate responsibilities so visual changes cannot alter puzzle correctness.

The approved stack is Svelte, TypeScript, and Vite, hosted on GitHub Pages as a PWA with offline play. Initial modes are Quick Play and Progression only, retaining traditional Sudoku's basic functionality. Progression uses randomized puzzles from a bundled, pre-rated collection. Completing the final level increments Metamorphosis, returns Leap to 1 and difficulty to easiest, with another puzzle. Previously completed Leaps can be revisited with a fresh board. Both modes earn a score and Dewdrops reflecting difficulty, speed and efficiency. Currency and puzzle-use history survive repeats. These names require no frog transformation or extra system. Scoring balance, loop length, difficulty schedule, catalog selection and remaining visual details require discussion before implementation. No store, spending, purchases or upgrades are in scope. Earlier prototype code remains an ignored experiment.

## Start here

- Project status and reading order: [README.md](README.md).
- Deferred work and disabled features: [TODO.md](TODO.md).
- Visual constraints: [docs/design.md](docs/design.md).
- Current UI, UX, board and control proposals: [docs/ui-ux.md](docs/ui-ux.md).
- Flat theme comparison and recommendation: [docs/visual-directions.md](docs/visual-directions.md).
- Discussion and prototyping workflow: [docs/process.md](docs/process.md).
- Accepted requirements and open decisions: [docs/decisions.md](docs/decisions.md).
- Progression and repeat behavior: [docs/progression.md](docs/progression.md).
- Score and currency proposal: [docs/scoring.md](docs/scoring.md).
- Architecture, stack, boundaries, and validation: [docs/architecture.md](docs/architecture.md).
- Theme tokens, seasonal selection, and customization: [docs/themes.md](docs/themes.md).
- Read the relevant research document under `docs/research/` when changing design or technology decisions.

## Rules

- KISS and YAGNI and DRY: no feature, dependency, option or abstraction without a real need.
- Follow the Git Conventional Commits standard for every commit.
- Do not use em dashes in text.
- Keep personal context out of source code, documentation, interface copy, and assets.
- Discuss one decision at a time. Keep user-facing text extremely concise and use visual comparisons.
- Use ImageGen for main-menu and gameplay mockups before writing interface prototypes.
- Production art must be human-made, free or paid, with creator provenance and a suitable license. AI-generated art, including SVG illustrations, is allowed only in clearly marked temporary mockups/prototypes under ignored `/prototypes/`; never ship it. See [art policy](docs/design.md#artwork-policy).
- Keep the combined menu illustration deliberately provisional. Do not buy sprites or polish that placeholder during the current milestone.
- Keep temporary prototypes, mockups, builds, dependencies, and test artifacts under ignored `/prototypes/`. Never commit them or promote them to production without discussion.
