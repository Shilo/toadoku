# Application architecture

Current gameplay implementation supersedes the historical preparation notes below. The full phase is still undergoing the [required validation](gameplay-validation-matrix.md); [actual progress](gameplay-progress.md) distinguishes accepted source slices from unfinished acceptance.

| Maintained module | Responsibility |
| --- | --- |
| `src/lib/sudoku/` | Strict classic rules, topology, candidates, conflicts, capped exact solver |
| `tools/catalog/`, `src/lib/catalog/`, `public/catalog/v1/` | Reproducible licensed import, independent Algorithm X, certification/membership, bounded progressive loading/cache |
| `src/lib/session/` | Immutable clues, entries/manual notes, compound bounded undo, monotone assistance and independent active-play clock |
| `src/lib/hints/` | Typed technique detector and separately implemented witness verification |
| `src/lib/modes/`, `src/lib/rewards/` | Five shared difficulty pools, frontier/replay policy, direct Dewdrops arithmetic under pinned policy 2 |
| `src/lib/storage/` | Validated IndexedDB generations, writer/revision authority, exactly-once receipts, physical history buckets, worker backup/restore and explicit unscored recovery play |
| `src/lib/gameplay/` | Save coalescing and asynchronous gameplay/disclosure/completion/navigation integration; lazy bootstrap, hint worker and dialog |
| `src/lib/gameplay/ui/` | Concise English/German/Spanish tools, Settings, enlarged notes, results and recovery presentation |
| `src/lib/layout.ts`, `src/lib/scene/`, `src/lib/leaves/`, `src/lib/theme/` | Shared geometry, noninteractive decoration and maintained Pond styling; no gameplay authority |

The application uses Svelte, TypeScript and Vite without SvelteKit, a required backend or WebAssembly. There is no runtime puzzle generation. Current active and retained-result roles preserve verified puzzle/policy snapshots for local resume; after Continue or replacement, compact receipts retain pinned definition/policy while obsolete full attempts are removed. Missing next shards fail recoverably. Service-worker application-shell caching, installability and deployment are separate work, so cold offline launch is not claimed.

The current Pond system is preserved while gameplay acceptance finishes. The separately authorized Auto/Pond/Cauldron theme task is queued afterwards. Themes never own Sudoku rules, hitboxes, state or rewards.

## Historical preparation context

Gameplay handoff update, 2026-10-31: the [complete autonomous implementation brief](gameplay-implementation-handoff.md) now defines the next activated phase, with separate pure rules, certified progressive catalog, hints, sessions, modes/rewards and transactional persistence. Read its [data contracts](gameplay-data-and-correctness.md), [state/storage contracts](gameplay-state-and-persistence.md) and [validation gates](gameplay-validation-matrix.md). This preparation adds no application code. Runtime generation is unnecessary; old generators and two-localStorage-record saves are not production foundations. IndexedDB transactions, active-generation/revision/owner checks and immutable receipts govern persistence. Historical UI/prototype-only statements below do not restrict that later activated gameplay scope.

Production update, 2026-10-31: maintained root source now implements presentation/navigation only. [Production progress](production-ui-progress.md#scope-and-structure) maps the actual modules and validation. The prototype-only/preparation restrictions below are historical; gameplay More is now functional. Rules, sessions, persistence and PWA remain unimplemented.

Current phase update: [production UI handoff](production-ui-handoff.md) defines the next maintained application using the **Svelte framework, TypeScript and Vite**, without SvelteKit. This task only prepares documentation/local skills. Future implementation starts fresh, enables gameplay More navigation and keeps all Sudoku/product logic out of scope. The older prototype-specific restrictions below describe the reference snapshot.

The approved eventual stack is Svelte + TypeScript + Vite, hosted on GitHub Pages as a PWA with offline play. The two initial modes are Quick Play and Progression, sharing traditional Sudoku's board and functionality. Progression details and visual design remain open. The initial experiment lives in ignored `prototypes/initial-web-ui/`; its code, tests, interface, and deployment workflow are not approved production work.

## Module boundaries

Current implementation is only the ignored visual prototype in `prototypes/pond-visual-v1/`. It has menu navigation, static numbers/notes and cell selection, plus decorative water. Shore, notches, natural selection and bounded floating are authorized refinements. No Sudoku/session/persistence/product infrastructure is implied by the eventual module table below. Final findings and checks are in [prototype progress](prototype-progress.md).

| Module | Responsibility |
| --- | --- |
| Sudoku | Validity, candidates, unique solutions, puzzle generation and difficulty assessment |
| Session | Entries, notes, undo, pause, completion and progress |
| Themes | UI color tokens, CSS backgrounds and shapes, font roles, motion and localized copy references; shared sprites stay unchanged |
| Localization | Complete English, German and Spanish messages |
| Persistence | Validated, versioned local settings and game saves |
| Presentation | Responsive game world, board, input and contextual controls |

The Sudoku API uses plain data and has no dependency on artwork, themes, browser storage, or UI framework. Theme changes preserve the puzzle and progress. Avoid a plugin framework, generic event bus, backend, or other abstractions without a demonstrated need.

Use a small independent decorative-background renderer and semantic style roles so C can later become B/A without a second board implementation. Optional local PNG/JPEG/WebP backgrounds need CSS fallbacks and offline asset handling. Button finish and backdrop do not own board proportions, hit targets or Sudoku state. See [theme model](research/theme-structure.md) and [UI/UX](ui-ux.md).

Persist a theme-independent board-shape preference: Fill space by default, Square on request. The presentation measures the current usable viewport and uses a bottom portrait dock or right landscape dock. Relayout preserves logical cell/control identity and state, without rotating board data or stretching glyphs. More overlays do not own layout space or game rules.

More is disabled, so Square access stays deferred with Settings. Inward pad anchors sit inside fixed full rectangular native cell buttons. Procedural near-round silhouettes/notches belong to a noninteractive leaf-mask layer. SVG water/shore geometry belongs to the decorative background. A small shared floating-object token applies seeded visual drift to leaves/labels and title/art; controls on land, hitboxes and layout anchors do not move. Selection styling belongs to the leaf surface, with two dew beads for keyboard focus. These layers cannot change rules, logical region identity, dock sizing or session state. There is no shader/game-engine dependency. See [visual acceptance](future-visual-research.md).

One composite menu-art reference supports replacing the provisional art with one human-made file. No new sprite framework is needed. Use [design handoff](design-handoff.md) for the selected spacing, scene composition and saved visual references.

## Correctness and usability

- Keep givens immutable and require a unique solution.
- Measure human solving difficulty through techniques. The temporary generator's 40/34/28 clue targets are not reliable difficulty grades.
- Preserve familiar digits, 3 by 3 regions, pencil marks, and reversible entry.
- Save settings separately from game state. Malformed or unavailable storage must not prevent play.
- Support touch, mouse, keyboard, visible focus, named dialogs, completion announcements, and reduced motion.
- Keep the board prominent. Apply [visual constraints](design.md) before choosing components or controls.

## Delivery and validation

GitHub Pages, PWA, offline play, JavaScript delivery, and no required WebAssembly are approved. Verify relative asset paths and offline behavior under a repository subpath. The first visit requires a connection to cache the app.

Validate engine rules and unique puzzles, session transitions, saved-state recovery, language completeness, theme independence, keyboard operation and responsive layouts. Motorola G31/G32 screens have 1080 by 2400 physical pixels; browser CSS dimensions require measurement. Desktop emulation is not physical-device testing.

Implementation begins after the relevant decisions and ImageGen mockups have been discussed. See [workflow](process.md).

## Implemented PWA boundary

The isolated PWA phase adds `src/lib/pwa` for installation, verified complete app caching and waiting updates; `src/lib/offline` for bounded disposable attested records; and `tools/pwa` for complete artifact validation and guarded Pages retention/rollback. The certified exact catalog allocator remains authoritative. Foreground online misses bypass optional download limits. Essential sessions, wallet, receipts and recovery retain their existing database and transaction authority.

`injectManifest` emits an application-owned worker and raw browser lifecycle bridge. App files and puzzle records have separate readiness checks and budgets. No forced activation or application reload is available. Finish saving or export recovery, close every window, and reopen to use a waiting release. See [actual acceptance, measurements and external release gates](pwa-acceptance.md); this implementation does not integrate the separate theme branch or publish Pages.
