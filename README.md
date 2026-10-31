# Toadodu

A colorful, immersive frog Sudoku game planned for mobile and desktop browsers, hosted on GitHub Pages.

**Next task: visual prototype only.** Connect main menu/gameplay, show static digits, allow pad selection, and implement/test dynamic top-down Pond water. Most controls remain inert/disabled. Full gameplay, scoring, progression, saves and production/PWA delivery are outside this task. Read the [bounded handoff](docs/design-handoff.md#next-session-visual-prototype-only).

**Status: design discussion. Current milestone: basic flat Pond, procedural lily-pad board, cream soft-raised keys, Fill space within the shared 8px edge inset, bottom/right docks, disabled More and one rough combined menu-art placeholder. Menu/gameplay share three flat pond colors; B, Winding shallows, is selected; A, Connected bays, is preserved. Use soft-raised 1:1 circular pad faces inside full stretched rectangular buttons; inward placement is selected; centered is preserved. Preserve cream controls. Use only 4px/8px spacing; region cues must work without hue. Halloween and More functionality are deferred. Layered Pond/Expressive Gradient remain future scene treatments. No store is in scope.**

Production artwork must be human-made. AI-generated art is permitted only for temporary mockups and prototypes.
The current world is flat and minimal, with exactly three shared pond colors, inward 1:1 pad faces and one rough combined menu placeholder. Procedural pad cutouts and slow water animation are future research/implementation tasks; their shape, colors, input and motion constraints are recorded in the handoff.

## Start here

- [Resume here: complete design handoff](docs/design-handoff.md)
- [Saved visual artifact registry](docs/design-artifacts.json)
- [Future pad cutouts and water animation](docs/future-visual-research.md)
- [Design constraints](docs/design.md)
- [Current UI and UX direction](docs/ui-ux.md)
- [Deferred work](TODO.md)
- [Three flat visual directions and recommendation](docs/visual-directions.md)
- [Main-menu flow and deferred saves](docs/menu.md)
- [Discussion workflow](docs/process.md)
- [Open decisions](docs/decisions.md)
- [Randomized progression and cycles](docs/progression.md)
- [Score and currency proposal](docs/scoring.md)
- [Ranked terminology research](docs/research/terminology.md)
- [Sudoku and artwork research](docs/research/sudoku-design.md)
- [Game modes research](docs/research/game-modes.md)
- [Independent progression assessment](docs/research/progression-audit.md)
- [Prototype findings](docs/research/prototype-findings.md)
- [Technology comparison](docs/research/technology.md)
- [Module boundaries](docs/architecture.md)
- [Theme requirements](docs/themes.md)

## Temporary work

The initial exploratory implementation, dependencies, builds, tests, screenshots, and deployment experiments are in `prototypes/initial-web-ui/`. The entire `prototypes/` directory is ignored by Git. Its README records how that experiment ran; it is not a production specification.

This repository tracks documentation and project guidance. The old prototype's top bar, sparse board layout, action row, copy, and muted Halloween palette were rejected as a direction.
