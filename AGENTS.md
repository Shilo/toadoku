# Toadodu

## Product

A cute, full-screen frog Sudoku game for mobile and desktop browsers. Keep classic 9x9 rules, familiar digits and readable 3x3 groups. The experience is minimal, colorful and focused on solving puzzles in a top-down pond.

## Tech stack

- Svelte framework, TypeScript, Vite. Do not use SvelteKit.
- GitHub Pages; installable PWA with offline play.
- JavaScript delivery; no required backend or WebAssembly.

## Architecture

- Separate Sudoku logic, sessions, presentation, themes, localization and persistence.
- Themes and decorative geometry never change rules, hitboxes or saved progress.
- Persist language, theme/appearance and puzzle progress. Support English, German and Spanish.

## Current task and next phase

- The prototype and first production UI phase are complete. Read [production UI progress](docs/production-ui-progress.md) for implementation, acceptance and remaining limits.
- The tracked root application uses the Svelte framework, TypeScript and Vite. The ignored prototype remains unchanged as a design reference; the [production UI handoff](docs/production-ui-handoff.md) records its implementation brief.
- Gameplay More provides Resume and Back to main menu. This application remains presentation/navigation with immutable example data; Sudoku logic and later product systems require a subsequent task.
- In that implementation phase, the lead acts as project manager, senior engineer and senior UI/UX designer: own the core foundation, contracts and integration; delegate bounded specialist modules efficiently. Specialists research/challenge their briefs, the lead challenges proposals until direction is agreed, and the lead reviews/challenges each implementation before acceptance. Follow the [team workflow](docs/production-ui-handoff.md#12-lead-orchestration-and-efficient-specialist-teamwork).
- Official Svelte skills are installed for this project only in `.agents/skills/`. Read [provenance and usage](docs/svelte-agent-skills.md), then load the local code-writer and best-practices skills for Svelte component/module work. Upstream SvelteKit examples do not change this project's stack. Installing the feedback skill does not authorize unsolicited external reports.

## Completed visual prototype reference

- Focus on visual design, Pond theming and animated top-down water in both screens.
- Allow menu/game navigation, static example numbers and full-cell pad selection. Most controls are inert or disabled.
- No Sudoku engine, number entry, scoring, progression, saves or production/PWA implementation.
- The completed baseline is under ignored `prototypes/pond-visual-v1/`. Preserve it as a production design reference. Older demos remain visual references only; do not copy their code.
- Use sub-agents for bounded concept/background work, with screens and integration separately owned. Compare the implementation visually with ImageGen guidelines.
- Current refinements: two-color ground behind controls, fluid water, varied near-circular notched pads, natural selection, fixed menu identity anchors, title-only display lettering and subtle floating pond objects. Reduced motion stays static; hitboxes stay fixed.

## Product scope

- Basic Pond theme; Quick Play and randomized Progression.
- Metamorphosis: repeat counter. Leap: level. Dewdrops: currency.
- More stays disabled in the completed prototype reference. The next production UI phase enables gameplay More for navigation. Settings, Halloween and save-slot policy remain deferred.
- The tracked UI integrates fresh water, pads, shore and floating modules. Physical hardware validation remains deferred. See [production progress](docs/production-ui-progress.md) and the separate [prototype record](docs/prototype-progress.md).
- No store, purchases or upgrades.

## Design

- Quiet Flat scene; Winding shallows B; inward 1:1 pad faces.
- Three shared water colors plus wet reed `#6D9F81` and dry sage `#B6BA86` ground; soft-raised green pads and cream controls.
- Full stretched fixed cell buttons, including water. Near-circular pad faces have stable procedural variation and a shallow real notch, with readable opaque centers.
- Subtle seeded float moves pad faces/labels and menu title/art only. Prototype float targets are at most 0.48px for pads and 1.8px for title/art; reduced motion is static and hidden work pauses.
- Selected pads use a brighter, slightly lifted leaf treatment with no cell or pad outline. Keyboard focus uses two dew beads.
- Keep title/art anchors and the menu shore fixed across menu states, reserving the largest Progression submenu height. Use Chewy only for the prototype title; UI/digits retain Outfit.
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
- Production source, tests and package/lock configuration are tracked normally; experimental source/assets remain ignored. The completed UI phase does not authorize later game systems.
- Production art must be human-made with provenance and suitable licensing. Never ship AI illustrations. Keep the menu placeholder provisional.
- Keep vendored official skill payloads verbatim. Project-authored wording/punctuation rules do not require rewriting upstream files.

## Read as needed

Start with [production UI handoff](docs/production-ui-handoff.md), then [design handoff](docs/design-handoff.md). Current phase instructions override completed-prototype scope restrictions; approved visual decisions override historical research. Open the relevant details before changing that area.

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
