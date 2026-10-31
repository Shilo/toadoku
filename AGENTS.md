# Toadodu

## Product

Toadodu is a cute, polished, frog-themed Sudoku game for browsers on mobile and desktop. Its name combines "toad" and "Sudoku". The experience should feel like entering a quiet little pond: immersive, playful, minimal, and focused on solving a real Sudoku puzzle. Standard digits 1 through 9, familiar row and column rules, and readable 3 by 3 regions remain the foundation. Keep the frog identity in the menu; omit the decorative gameplay frog for now so board and input use the space. Artwork must preserve clear numbers, notes, selection, conflicts, and region boundaries.

The game should feel like a colorful, immersive, full-screen and exceptionally cute frog environment. Start with C, Quiet Flat, using mostly HTML/CSS color and sparse organic shapes. Preserve B, Layered Pond, and A, Expressive Gradient, as future treatments behind the same components. Use a few human-made sprites in menus; optional human-made PNG/JPEG/WebP backgrounds must work through a separate decorative layer with CSS fallback. Avoid clutter and heavy blur. Shallow raised, candy, jelly or lily-pad-inspired CSS buttons are candidates, not selected finishes. The board occupies as much usable space as practical on mobile and desktop, portrait and landscape. Square versus modest rectangular cells is still open; preserve the logical grid and never stretch digit glyphs. Do not introduce a top bar, sidebar, dashboard cards, promotional copy, or decorative spacing that reduces the board. Put number entry and frequent actions in the bottom interaction area. Keep one floating top overflow for now, allowing later relocation. Avoid permanent rows of tool buttons; discuss the proposed bottom Tools disclosure before implementation. The main menu shows the two modes directly, with primary choices toward the bottom. Selecting a mode changes choices within the same scene: Quick Play offers difficulty selection; Progression offers an existing save or a new game. Back returns to mode choices. Save-slot count and replacement policy are deferred. Touch, mouse and keyboard must support comfortable play. Motion is restrained and has an equivalent reduced-motion presentation.

Frogs remain the identity in every theme. The everyday theme is cute and welcoming. Halloween uses recognizable pumpkin orange, near-black and vivid purple while retaining the same menu sprites. Themes change UI colors, backgrounds, button finish, font roles and suitable motion parameters. Frog and lily-pad artwork keeps its geometry, palette, identity and available frames: no themed replacements, recolors, costumes or accessories. Keep the board opaque and calm, with legible digits and notes. Use semantic tokens and a small authored background model so solid fields, flat layers, gradients and optional images do not require rewriting game components. Theme choice and light/dark/system appearance are independent persistent preferences; explicit themes stay fixed. Exact palettes, fonts, finishes, image assets and event dates remain open. Do not add a theme editor, plugin system or every possible style selector merely to make the system modular.

English, German, and Spanish are required throughout the interface. Language, theme, appearance, and current puzzle progress must persist locally. The intended delivery is a static, JavaScript-based application for GitHub Pages, with responsive layouts and installable PWA support. There is no required backend or WebAssembly runtime. Sudoku logic, presentation, themes, localization, and persistence have separate responsibilities so visual changes cannot alter puzzle correctness.

The approved stack is Svelte, TypeScript, and Vite, hosted on GitHub Pages as a PWA with offline play. Initial modes are Quick Play and Progression only, retaining traditional Sudoku's basic layout and functionality. Progression uses randomized puzzles from a bundled, pre-rated collection. After the final level, a repeat counter increases, the level returns to 1, and difficulty returns to easiest with another puzzle. The approved names are Metamorphosis for that repeat counter, Leap for a level, and Dewdrops for the single earned currency. Previously completed Leaps can be revisited with a fresh randomized board. Both modes earn a performance score and Dewdrops reflecting difficulty, speed and efficiency. Currency and puzzle-use history survive automatic repeats. These names do not require frog transformation or an additional system. Scoring details await discussion. No store, spending, purchases or upgrades are in scope. Exact loop length, difficulty schedule, catalog selection, control access, artwork, and themes still require discussion before implementation. These approvals do not approve the initial web-style prototype, which remains an ignored experiment.

## Start here

- Project status and reading order: [README.md](README.md).
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
- Keep temporary prototypes, mockups, builds, dependencies, and test artifacts under ignored `/prototypes/`. Never commit them or promote them to production without discussion.
