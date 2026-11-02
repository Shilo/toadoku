# Toadoku

**Hop into a calmer kind of Sudoku.** A frog-themed puzzle game with 100,000 certified puzzles, saved progress and offline play. · [Play Toadoku](https://shilo.github.io/toadoku/)

Play Quick Play or Progression with 100,000 independently certified puzzles, notes, undo, hints, saved progress and Dewdrops rewards. Settings remember language, board shape, motion, appearance and theme. English, German and Spanish are supported. Pond and Cauldron share the same game; Auto follows the seasonal schedule.

See [gameplay acceptance](docs/gameplay-acceptance.md), [theme authoring](docs/theme-authoring.md) and [PWA acceptance](docs/pwa-acceptance.md) for actual checks and remaining device/hosting limits. Historical handoffs preserve the earlier specifications and challenged decisions.

## Installation, offline play and updates

Ordinary online play needs no setup. Both three-dot menus contain Settings and a Version link to the source repository. Installation is optional: open More → Settings → Install and offline, and use the browser's installation option when available.

Before a trip, choose Prepare offline play for 3 upcoming puzzles per difficulty. More offline options contains the longer-trip target of 25 per difficulty and storage cleanup. Packs do not refill automatically; prepare again online when needed. Cancel keeps completed puzzles. Once app files and puzzle counts are verified, offline play is ready. Keep a backup of important progress because browsers can remove local data. See the [practical offline checklist](docs/pwa-system.md#player-workflow) for readiness, downloads and partial preparation.

Updates download automatically. The idle main menu updates safely by itself. During a game, More shows Update; choose it when convenient to save, check your progress and return to the updated main menu. Other windows can stay open. A page already open in 0.0.46 needs one ordinary refresh to gain this new behavior.

Maintainers: [how the PWA works](docs/pwa-system.md), [make or replace installation icons](docs/pwa-icons.md), [integration and review](docs/pwa-integration.md). [PWA acceptance](docs/pwa-acceptance.md) records the remaining physical-device and hosting checks.

For GitHub hosting, follow [Pages setup and conditional publication](docs/pwa-ci.md). Relevant pushes to main build and publish after checks; documentation-only and test-only pushes skip production. A manual run supports deliberate retries.

## Local workflow

Use Node >=24.11. The locked toolchain was verified with Node 25.0.0 and npm 11.16.0.

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

For local language review use `?lang=en`, `?lang=de` or `?lang=es`. Saved preferences take precedence after loading. Arrow keys, Home and End move the logical selection; Tab reaches More. Gameplay More keeps solving tools beside menu actions, without an extra dock key.

Vite defaults to relative assets; `TOADOKU_BASE` configures the deployed base. Offline support runs in production builds, not the development server. After building, run `node tools/pwa/validate.mjs dist`; use the focused PWA browser journeys for real installation, offline and update checks. The workflow in `.github/workflows/pages.yml` validates and retains supported release assets before deployment.

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
