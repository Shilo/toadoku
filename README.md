# Toadodu

A colorful, immersive frog Sudoku game planned for mobile and desktop browsers, hosted on GitHub Pages.

**Prototype complete; production UI handoff prepared.** The current task installs project-local official Svelte skills and documents the next phase only. No production application is implemented yet. The receiving agent should start with the [production UI handoff](docs/production-ui-handoff.md): fresh **Svelte framework + TypeScript + Vite**, responsive theme/presentation, screen transitions and enabled gameplay More with Resume/Back to menu. No SvelteKit or Sudoku logic.

The ignored `prototypes/pond-visual-v1/` remains the selected visual reference: menu/gameplay, static digits, two-color shore, smooth animated water, subtle organic floating leaves, natural selection and fixed menu identity. Read its [findings and measured progress](docs/prototype-progress.md). The implementation phase must be activated separately; this handoff task does not scaffold it.

The baseline was built fresh without copying old demo code and is now preserved as reference for the production UI handoff. Concept/ImageGen, pond geometry and pad/motion sub-agents had separate ownership from screens/integration; independent browser-image review compared the result with the generated guideline.

**Selected design:** basic flat Pond, three shared water colors plus wet/dry ground behind controls, B Winding shallows, inward near-circular procedural leaves, cream soft-raised keys and 4px/8px spacing. Fill space, bottom/right ten-key docks and disabled More remain. The scribbly combined menu image is provisional. Natural leaf selection has no cell/pad outline; bounded leaf/title/art float becomes static under reduced motion. No store is in scope. Halloween, More functionality and alternative scene treatments remain deferred.

Production artwork must be human-made. AI-generated art is permitted only for temporary mockups and prototypes.
Build/type, layout/input, shore coverage, leaf/water envelopes and motion lifecycle checks pass in the prototype. Motorola CSS emulation and labeled 3x renders were visually reviewed; native DPR-3 and physical-device performance remain pending. These results are not production art, typography or renderer approval.

## Start here

- [Resume here: complete design handoff](docs/design-handoff.md)
- [Next phase: production UI implementation handoff](docs/production-ui-handoff.md)
- [Project-local official Svelte agent skills](docs/svelte-agent-skills.md)
- [Current prototype progress, findings and ImageGen comparison](docs/prototype-progress.md)
- [Saved visual artifact registry](docs/design-artifacts.json)
- [Visual refinement and acceptance plan](docs/future-visual-research.md)
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

The current local prototype and its README are in `prototypes/pond-visual-v1/`; current screenshots and browser measurements are in its `refinement/` directory. The initial exploratory implementation remains in `prototypes/initial-web-ui/` as history. The entire `prototypes/` directory, including code, dependencies, builds, AI concepts and test artifacts, is ignored by Git.

This repository tracks documentation and project guidance. The old prototype's top bar, sparse board layout, action row, copy, and muted Halloween palette were rejected as a direction.
