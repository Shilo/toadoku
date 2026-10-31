# Toadodu

## Product

Toadodu is a cute, polished, frog-themed Sudoku game for browsers on mobile and desktop. Its name combines "toad" and "Sudoku". The experience should feel like entering a quiet little pond: immersive, playful, minimal, and focused on solving a real Sudoku puzzle. Standard digits 1 through 9, familiar row and column rules, and readable 3 by 3 regions remain the foundation. Keep the frog identity in the menu; omit the decorative gameplay frog for now so board and input use the space. Artwork must preserve clear numbers, notes, selection, conflicts, and region boundaries.

The game should feel like a colorful, immersive, full-screen and exceptionally cute frog environment. Start with C, Quiet Flat, using mostly HTML/CSS color and sparse organic shapes, with selected soft-raised buttons. Preserve B, Layered Pond, and A, Expressive Gradient, behind the same components. Use a few human-made menu sprites; optional human-made PNG/JPEG/WebP backgrounds use an independent layer with CSS fallback. Default the board to Fill space and offer a persistent Square setting independent of theme. Preserve the logical grid and upright glyphs. Portrait uses a two-row/five-column bottom input dock; landscape uses a five-row/two-column right dock, remeasured for the actual viewport and safe areas rather than literally rotating pixels. Keep the same selected cell and game state. Do not introduce headers, decorative sidebars, dashboards, promotional copy or gameplay mascots. The reviewed proposal uses exactly nine digits plus one More key, replacing top overflow and Tools; it exposes solving tools directly and Settings one level deeper. Popup overlays are acceptable and need not shrink the board. Notes remains active after dismissal. A brief nonblocking start notice and persistent completion result are recommended instead of an always-visible progress HUD or compulsory timed splashes; exact popup/status behavior and key order still need review. The main menu shows both modes directly, with lower primary choices. Mode selection changes choices in the same scene: difficulty for Quick Play, existing/new save for Progression, with Back returning to modes. Save slots remain deferred. Touch, mouse and keyboard must all work, with restrained motion and an equivalent reduced-motion presentation.

Frogs remain the identity in every theme. The everyday theme is cute and welcoming. Halloween uses recognizable pumpkin orange, near-black and vivid purple while retaining the same menu sprites. Themes change UI colors, backgrounds, button finish, font roles and suitable motion parameters. Frog and lily-pad artwork keeps its geometry, palette, identity and available frames: no themed replacements, recolors, costumes or accessories. Keep the board opaque and calm, with legible digits and notes. Use semantic tokens and a small authored background model so solid fields, flat layers, gradients and optional images do not require rewriting game components. Theme choice and light/dark/system appearance are independent persistent preferences; explicit themes stay fixed. Exact palettes, fonts, finishes, image assets and event dates remain open. Do not add a theme editor, plugin system or every possible style selector merely to make the system modular.

English, German, and Spanish are required throughout the interface. Language, theme, appearance, and current puzzle progress must persist locally. The intended delivery is a static, JavaScript-based application for GitHub Pages, with responsive layouts and installable PWA support. There is no required backend or WebAssembly runtime. Sudoku logic, presentation, themes, localization, and persistence have separate responsibilities so visual changes cannot alter puzzle correctness.

The approved stack is Svelte, TypeScript, and Vite, hosted on GitHub Pages as a PWA with offline play. Initial modes are Quick Play and Progression only, retaining traditional Sudoku's basic functionality. Progression uses randomized puzzles from a bundled, pre-rated collection. Completing the final level increments Metamorphosis, returns Leap to 1 and difficulty to easiest, with another puzzle. Previously completed Leaps can be revisited with a fresh board. Both modes earn a score and Dewdrops reflecting difficulty, speed and efficiency. Currency and puzzle-use history survive repeats. These names require no frog transformation or extra system. Scoring balance, loop length, difficulty schedule, catalog selection and remaining visual details require discussion before implementation. No store, spending, purchases or upgrades are in scope. Earlier prototype code remains an ignored experiment.

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
