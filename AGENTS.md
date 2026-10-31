# Toadodu

## Product

A cute, full-screen frog Sudoku game for mobile and desktop browsers. Keep classic 9x9 rules, familiar digits and readable 3x3 groups. The experience is minimal, colorful and focused on solving puzzles in a top-down pond.

## Tech stack

- Svelte, TypeScript, Vite.
- GitHub Pages; installable PWA with offline play.
- JavaScript delivery; no required backend or WebAssembly.

## Architecture

- Separate Sudoku logic, sessions, presentation, themes, localization and persistence.
- Themes and decorative geometry never change rules, hitboxes or saved progress.
- Persist language, theme/appearance and puzzle progress. Support English, German and Spanish.

## Scope

- Basic Pond theme; Quick Play and randomized Progression.
- Metamorphosis: repeat counter. Leap: level. Dewdrops: currency.
- More stays disabled. Settings, Halloween and save-slot policy are deferred.
- Pad cutouts and water animation need future research and testing; neither is implemented.
- No store, purchases or upgrades.

## Design

- Quiet Flat scene; Winding shallows B; inward 1:1 pad faces.
- Three shared water colors; soft-raised green pads and cream controls.
- Full stretched cell buttons, including water; stationary, readable digits and notes.
- Spacing: 4px between cells/buttons; 8px at edges, groups and board/dock.
- Ten dock keys: bottom 2x5 in portrait, right 5x2 in landscape.
- No top bar, permanent HUD or gameplay mascot. Use one rough combined menu-art placeholder.
- Support touch, mouse, keyboard, reduced motion and safe areas.
- Check Motorola G31/G32 at representative 360x800 and 800x360 CSS px, DPR 3. Label emulation; hardware testing remains pending.

## Working rules

- KISS, YAGNI, DRY. Add only what the task needs.
- Use Conventional Commits.
- No em dashes or personal context in project files.
- Discuss one decision at a time; keep replies extremely concise.
- Use ImageGen before new UI experiments.
- Keep prototypes, AI mockups, dependencies, builds and test artifacts in ignored `prototypes/`. Do not promote them without discussion.
- Production art must be human-made with provenance and suitable licensing. Never ship AI illustrations. Keep the menu placeholder provisional.

## Read as needed

Start with [design handoff](docs/design-handoff.md). Current decisions override historical research. Open the relevant details before changing that area.

| Task | Read |
| --- | --- |
| Layout, pads, controls, menus | [UI/UX](docs/ui-ux.md), [menu flow](docs/menu.md) |
| Visual constraints and artwork | [Design](docs/design.md) |
| Tokens, backgrounds, appearance | [Themes](docs/themes.md) |
| Pad cutouts or animated water | [Future visual research](docs/future-visual-research.md) |
| Stack, modules, validation | [Architecture](docs/architecture.md) |
| Progression or rewards | [Progression](docs/progression.md), [scoring](docs/scoring.md) |
| Decisions, deferred work, workflow | [Decisions](docs/decisions.md), [TODO](TODO.md), [process](docs/process.md) |

The handoff indexes selected mockups, preserved alternatives, research and test evidence.
