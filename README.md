# Toadodu

A colorful, immersive frog Sudoku game for mobile and desktop browsers. GitHub Pages and offline PWA delivery remain later work.

Maintained Pond presentation/navigation shell using Svelte 5, TypeScript and Vite. This phase contains an immutable example board, selection and accessible navigation. It contains no Sudoku rules, editable numbers, saves, economy, PWA or deployment infrastructure.

## Local workflow

Use Node 24 or newer compatible Node release. The locked toolchain was verified with Node 25.0.0 and npm 11.16.0.

```powershell
npm ci
npm run dev
npm run check
npm test
npm run test:browser:install
npm run test:browser
npm run build
npm run preview
```

The browser tests start their own development server on port 5179 when needed. Browser binaries, temporary runner caches, screenshots and test output stay under ignored `prototypes/production-ui-evidence/`. The preserved `prototypes/pond-visual-v1/` is never a runtime dependency. Unit tests do not require a browser download.

The app takes an independent locale input, defaulting to the browser language. For local review use `?lang=en`, `?lang=de` or `?lang=es`. No Settings or preference persistence is implemented. Main-menu More and unavailable actions remain disabled. Gameplay More provides Resume and Back to main menu. Arrow keys, Home and End move the logical selection; Tab reaches More.

Vite emits relative asset references for repository-subpath hosting. The browser suite independently serves `dist/` at `/toadoku/`, exercises navigation and verifies local fonts/licenses. No hosting/deployment configuration is included.

See [production progress and acceptance](docs/production-ui-progress.md), [asset provenance](docs/production-assets.md) and the [original implementation handoff](docs/production-ui-handoff.md). Final human-made artwork, physical-device validation and final tiny-note typography remain open.

The menu uses the existing rough frog/lily-pad sketch, restored at the user's request as a temporary placeholder. Its fixed responsive slot contains the full image without stretching or cropping. It is not final human-made artwork.

## Design and product references

- [Complete design handoff](docs/design-handoff.md)
- [Project-local official Svelte skills](docs/svelte-agent-skills.md)
- [Preserved prototype findings](docs/prototype-progress.md)
- [Saved visual artifact registry](docs/design-artifacts.json)
- [Visual acceptance plan](docs/future-visual-research.md)
- [Design constraints](docs/design.md) and [UI/UX direction](docs/ui-ux.md)
- [Deferred work](TODO.md), [decisions](docs/decisions.md) and [team workflow](docs/process.md)
- [Main-menu flow](docs/menu.md), [architecture](docs/architecture.md) and [theme requirements](docs/themes.md)
- [Preserved visual alternatives](docs/visual-directions.md)
- [Progression](docs/progression.md), [scoring](docs/scoring.md) and [terminology research](docs/research/terminology.md)
- [Sudoku/artwork research](docs/research/sudoku-design.md) and [game-mode research](docs/research/game-modes.md)
- [Independent progression assessment](docs/research/progression-audit.md)
- [Earlier prototype findings](docs/research/prototype-findings.md) and [technology comparison](docs/research/technology.md)

Temporary experiments, AI concepts, dependencies and test artifacts stay ignored under `prototypes/`. Production artwork must be human-made with suitable provenance and rights. The old demo's top bar, sparse board, extra action row and muted Halloween palette remain rejected directions.
