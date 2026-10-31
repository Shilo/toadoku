# Toadodu

## Product

Toadodu is a cute, polished, frog-themed Sudoku game for browsers on mobile and desktop. Its name combines "toad" and "Sudoku". The experience should feel like entering a quiet little pond: immersive, animated, playful, minimal, and focused on solving a real Sudoku puzzle. Standard digits 1 through 9, familiar row and column rules, and readable 3 by 3 boxes remain the foundation. Frogs may hold numbers, perch around the board, or inspire cell shapes, but artwork must preserve clear numbers, notes, selection, conflicts, and box boundaries.

The game should feel like a colorful, immersive game. The board occupies as much of the available screen as practical, with readable digits and usable touch targets on mobile and desktop, portrait and landscape. Do not introduce a top bar, sidebar, dashboard cards, promotional headings, slogans, explanatory paragraphs, or generous decorative spacing into gameplay. A single floating overflow button near the top provides secondary actions. Keep essential number entry close to the board. Avoid rows of action buttons; discuss contextual access to notes, undo, erase, and hints before exposing controls. Decoration belongs in the game world and must not shrink the board. The main menu is equally minimal, with artwork and very few actions. Touch, mouse, and keyboard should all support comfortable play. Motion adds character through frog movements, transitions, and celebrations, with an equivalent reduced-motion experience.

Frogs remain the identity in every theme. The everyday theme is cute and welcoming. Halloween must use recognizable, colorful Halloween cues: pumpkin orange, near-black, vivid purple, and green frog accents. A muted aubergine and beige palette alone does not satisfy the requested direction. Seasonal scenery and accessories retain the frogs and standard Sudoku rules. Theme selection offers Automatic and explicit themes; explicit selections remain fixed. Theme and light, dark, or system appearance are independent preferences. Colors, backgrounds, animation, and localized text belong to separate theme definitions. The precise palettes and automatic event dates remain proposals for discussion.

English, German, and Spanish are required throughout the interface. Language, theme, appearance, and current puzzle progress must persist locally. The intended delivery is a static, JavaScript-based application for GitHub Pages, with responsive layouts and installable PWA support. There is no required backend or WebAssembly runtime. Sudoku logic, presentation, themes, localization, and persistence have separate responsibilities so visual changes cannot alter puzzle correctness.

The approved stack is Svelte, TypeScript, and Vite, hosted on GitHub Pages as a PWA with offline play. Artwork, layouts, theme details, gameplay controls, and game modes still require discussion before implementation. Stack approval does not approve the initial web-style prototype, which remains an ignored experiment.

## Start here

- Project status and reading order: [README.md](README.md).
- Visual constraints: [docs/design.md](docs/design.md).
- Discussion and prototyping workflow: [docs/process.md](docs/process.md).
- Accepted requirements and open decisions: [docs/decisions.md](docs/decisions.md).
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
- Keep temporary prototypes, mockups, builds, dependencies, and test artifacts under ignored `/prototypes/`. Never commit them or promote them to production without discussion.
