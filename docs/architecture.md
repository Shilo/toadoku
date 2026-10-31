# Proposed architecture

The approved stack is Svelte + TypeScript + Vite, hosted on GitHub Pages as a PWA with offline play. The two initial modes are Quick Play and Progression, sharing traditional Sudoku's board and functionality. Progression details and visual design remain open. The initial experiment lives in ignored `prototypes/initial-web-ui/`; its code, tests, interface, and deployment workflow are not approved production work.

## Module boundaries

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

More is disabled in the current milestone, so exposing the Square setting is deferred with Settings. Selected inward pad faces sit inside the same full rectangular logical cell buttons; decorative geometry never owns hit testing or rules. Future procedural cutouts belong to that noninteractive visual mask, while future slow pond motion belongs to the background renderer. Their code must not move cells, change region identity, resize the dock or mutate session/puzzle state. A shader is not a selected dependency. See [future visual research](future-visual-research.md).

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
