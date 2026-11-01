# Toadoku

## Product

A cute, full-screen frog Sudoku game for mobile and desktop browsers. Keep classic 9x9 rules, familiar digits and readable 3x3 groups. The experience is minimal, colorful and focused on solving puzzles in a top-down pond.

## Tech stack

- Svelte framework, TypeScript, Vite.
- GitHub Pages; installable PWA with offline play.
- JavaScript delivery; no required backend or WebAssembly.

## Architecture

- Separate Sudoku logic, sessions, presentation, themes, localization and persistence.
- Themes and decorative geometry never change rules, hitboxes or saved progress.
- Persist language, theme/appearance and puzzle progress. Support English, German and Spanish.

## Current task and next phase

- Gameplay implementation and available-environment acceptance are complete. The maintained source includes 100,000 independently certified puzzles, Sudoku/session/hint modules, Quick Play/Progression/replays, direct Dewdrops rewards and transactional IndexedDB storage. [Gameplay acceptance](docs/gameplay-acceptance.md) records actual gates and external hardware/release limits; [progress](docs/gameplay-progress.md) retains the challenged decisions and historical failures. Presentation-only statements below describe completed history.
- Theme implementation and reviewed main integration are complete. The merged feature branch/worktree were safely removed after acceptance. Preserve accepted gameplay, concurrent documentation and the reviewed PWA integration. [Theme progress](docs/theme-progress.md) records implementation; [integration](docs/theme-integration.md) records validation, ancestry, preview rehosting and cleanup. UI/dock fonts are Almendra for Pond and Germania One for Cauldron; all grid/notes/enlarged editor figures use shared Outfit. Further theme changes need fresh user instructions.
- PWA implementation, simplicity review, maintainer/icon documentation and tested theme/PWA integration into main are complete. The original gameplay chat independently reviewed merged source; its three accepted findings were fixed, reciprocally reviewed and tested. Read [PWA acceptance](docs/pwa-acceptance.md), [system walkthrough](docs/pwa-system.md), [icon recipe](docs/pwa-icons.md) and [phase specification](docs/pwa-implementation-handoff.md). No push or publication is authorized.
- Theme visual boundary: preserve the established Quiet Flat C design and Winding shallows B within all themes. The first isolated ImageGen comparison was rejected by the user as a heavy redesign. Use maintained screens and current design documentation as authority; seasonal adaptation must retain the established composition, soft controls and fixed geometry.
- Accepted theme scope adds orange Cauldron stew, dedicated simmer motion, pale squash faces, one concave pot curve, a narrow third ground lip, complete control boundaries and Auto status/countdown. Preserve the gameplay grid design. Landscape retains the right 5x2 dock; existing bottom-dock allocations may use one row only with 596px usable width for ten 56px keys. Main-menu actions share one responsive height, capped at 64px, while submenu/identity/shore reservations stay fixed. Current theme contracts supersede historical two-ground-color/exact-row wording below.

- Historical preparation produced the [autonomous gameplay handoff](docs/gameplay-implementation-handoff.md), its data/state/validation specifications and receiving-agent prompt. That brief now governs the explicitly activated gameplay phase and supersedes historical UI-only restrictions.
- Every plan in the activated gameplay phase must be researched online and challenged before execution, including the lead's own overall/architecture/integration plans, each specialist plan, test plans and every proposed fix or material revision. Assign a named specialist to challenge lead-authored plans. Record evidence-supported agreement, review actual implementations reciprocally, test integrated journeys personally with Codex browser, and commit accepted green slices periodically. See the [mandatory research/challenge loop](docs/gameplay-implementation-handoff.md#6-mandatory-research-and-reciprocal-challenge-loop).
- The prototype and first production UI phase are complete. Read [production UI progress](docs/production-ui-progress.md) for implementation, acceptance and remaining limits.
- The tracked root application uses the Svelte framework, TypeScript and Vite. The ignored prototype remains unchanged as a design reference; the [production UI handoff](docs/production-ui-handoff.md) records its implementation brief.
- Gameplay More separates solving tools on the left from other menu actions on the right. Small secondary choices use a popover; larger tasks use a mobile bottom sheet or centered desktop dialog. Every individual window/popover has the same radius on all four corners. Keep player-facing text concise and human-readable.
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
- More stays disabled in the completed prototype reference. The accepted tracked gameplay has functional tools/Settings, modes, storage and rewards with three active roles rather than arbitrary save slots. External hardware/release limits remain explicit. Current theme integration follows the fresh authorization above.
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
- Follow **simplicity-first design**: strong defaults, no setup for ordinary play, and minimal necessary features/settings. Keep frequent actions easy to reach; use progressive disclosure for necessary infrequent options through clear secondary access. Preserve accessibility, timely feedback/recovery and consequential disclosures. Use concise, familiar labels. Read the short [usability guide](docs/usability-principles.md) when changing features, settings, navigation or copy. Its linked usability research is optional.
- Use Conventional Commits.
- Use unit tests for logic/state; reserve browser tests for critical flows and visual validation. Batch actions; avoid redundant screenshots and reruns.
- No em dashes or personal context in project files.
- Discuss one decision at a time; keep replies extremely concise.
- Use ImageGen before new UI experiments.
- Keep prototypes, AI mockups, dependencies, builds and test artifacts in ignored `prototypes/`. Do not promote them without discussion.
- Production source, tests and package/lock configuration are tracked normally; experimental source/assets remain ignored. The completed UI phase does not authorize later game systems.
- Final production art must be human-made with provenance and suitable licensing. The user explicitly authorized the current rough frog/lily-pad sketch as a temporary built-UI placeholder; see [asset provenance](docs/production-assets.md#artwork-boundary). Other AI illustrations remain unapproved. Keep this exception provisional.
- Keep vendored official skill payloads verbatim. Project-authored wording/punctuation rules do not require rewriting upstream files.

## Read as needed

For gameplay, start with the [autonomous gameplay handoff](docs/gameplay-implementation-handoff.md) and all its specifications. For the preserved UI, use [production UI handoff](docs/production-ui-handoff.md) and [design handoff](docs/design-handoff.md). Current phase instructions override completed-prototype scope restrictions; approved visual decisions override historical research. Open the relevant details before changing that area.

| Task | Read |
| --- | --- |
| Layout, pads, controls, menus | [UI/UX](docs/ui-ux.md), [menu flow](docs/menu.md) |
| Visual constraints and artwork | [Design](docs/design.md) |
| Tokens, backgrounds, appearance, future themes | [Theme authoring](docs/theme-authoring.md), [themes](docs/themes.md) |
| Pad cutouts or animated water | [Future visual research](docs/future-visual-research.md) |
| Stack, modules, validation | [Architecture](docs/architecture.md) |
| Rules, catalogs, deduction patterns | [Data/correctness](docs/gameplay-data-and-correctness.md), [source audit](docs/research/gameplay-readiness-audit.md) |
| Sessions, modes, storage, backups | [State/persistence](docs/gameplay-state-and-persistence.md), [validation gates](docs/gameplay-validation-matrix.md) |
| Installation, offline reserves, app updates | [PWA handoff](docs/pwa-implementation-handoff.md), [source audit](docs/research/pwa-readiness-audit.md), [PWA gates](docs/pwa-validation-matrix.md) |
| Progression or rewards | [Progression](docs/progression.md), [scoring](docs/scoring.md) |
| Decisions, deferred work, workflow | [Decisions](docs/decisions.md), [TODO](TODO.md), [process](docs/process.md) |

The handoff indexes selected mockups, preserved alternatives, research and test evidence.
