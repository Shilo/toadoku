# Technology research

> Svelte is a research recommendation. The stack remains undecided pending discussion. The temporary implementation is ignored and does not establish approval.

Research date: 2026-10-30. This document records recommendations, not completed implementation or device testing.

## Recommendation

Use **Svelte + TypeScript + Vite**, semantic HTML for controls and the Sudoku board, SVG for frog artwork, and CSS for short transitions and ambient motion. Ship a static PWA on GitHub Pages. Start without SvelteKit, a game engine, a backend, or an animation library. This is a design judgment for a game whose main interactions are selecting cells, entering digits, changing notes, and opening lightweight menus.

Svelte compiles UI components into JavaScript and supports component styles. Its built-in transitions cover the menu, screen, and celebration effects needed here. Keep game rules in ordinary TypeScript modules so the framework remains replaceable. [Svelte introduction](https://svelte.dev/tutorial/svelte/welcome-to-svelte), [Svelte transitions](https://svelte.dev/docs/svelte/svelte-transition).

## Options compared

| Option | Fit for this game | Tradeoff | Decision |
| --- | --- | --- | --- |
| Vanilla TypeScript + Vite | Small runtime, full DOM/SVG/CSS access, easy static hosting | Manual DOM updates and event cleanup become repetitive across board, notes, settings, localization, saved games, and animation states | Good fallback when avoiding all UI frameworks is the priority |
| Svelte + TypeScript + Vite | Components match board, cell, keypad, frog, settings, and screen boundaries; declarative state and transitions | Adds a framework and compiler conventions to learn | Recommended balance |
| Flutter web | Consistent custom rendering and strong animation tools | Dart and Flutter increase toolchain scope; current supported web renderer choices use CanvasKit or Skwasm, so JavaScript application output alone does not establish a WASM-free app | Reject for the strict no-WASM requirement |
| Phaser + TypeScript | WebGL/Canvas scenes, sprites, input, and game animation | An accessible text-heavy grid, responsive menus, and localization need additional care around canvas; scene and engine facilities exceed the current game needs | Revisit only if free-moving gameplay becomes a core mechanic |

Vite supports vanilla TypeScript and framework integrations; the deployment output is static. Phaser supports JavaScript/TypeScript and desktop/mobile browser graphics. Flutter supports JavaScript and WebAssembly application compilation, but its current initialization API exposes CanvasKit and Skwasm renderers. [Vite static deployment](https://vite.dev/guide/static-deploy), [Phaser overview](https://phaser.io/oss/docs/phaser/getting-started/what-is-phaser), [Flutter web support](https://docs.flutter.dev/platform-integration/web), [Flutter initialization](https://docs.flutter.dev/platform-integration/web/initialization).

## Module boundaries

The following is a proposed structure. Prefer small concrete files and add a directory only when it holds more than one responsibility.

| Area | Owns | Must not depend on |
| --- | --- | --- |
| `sudoku` | Board representation, peers, candidates, rule validation, solution counting, puzzle creation or loading | DOM, Svelte, theme, translated strings, local storage |
| `game` | Current game state, immutable givens, entries, notes, undo history, elapsed time, pause and completion | Artwork or seasonal colors |
| `themes` | Theme definitions, semantic tokens, seasonal date selection, appearance preference resolution | Sudoku correctness or difficulty |
| `i18n` | Typed translation keys and English, German, Spanish dictionaries | Puzzle rules |
| `storage` | Versioned settings and saved-game serialization, validation, graceful failure | Component rendering |
| `components` | Board, cells, keypad, frog, menus, dialogs and input adaptation | Puzzle generation details |

Expose operations such as `getCandidates(board, index)`, `getConflicts(board)`, `countSolutions(board, limit)`, and `isComplete(board)` from Sudoku. Do not expose mutable framework state from the rules module. Keep date resolution a pure function accepting a `Date` so seasonal boundaries are easy to test.

Use a single versioned local-storage record for settings and a separate one for the active game. Validate restored arrays, digits, locale and enums before use. Catch denied storage and malformed JSON so the game remains playable. Avoid a general plugin system, an event bus, and global state libraries until a concrete need appears.

## Themes and languages

Separate `themePreference: auto | pond | halloween` from `appearance: system | light | dark`. Each visual theme provides a token map, background treatment, frog accessories, motion settings and localized flavor text. Frogs and conventional digits remain part of the product identity in every theme.

Recommended Halloween window: October 24 through November 7 inclusive, using the device's local calendar. This is seven days before and seven days after October 31, plus the event day, making 15 calendar days. Explicit Pond or Halloween selection never changes automatically. Re-evaluate Auto at launch, when returning to the app, and across local midnight. Do not change or reset the puzzle when the appearance changes.

English, German, and Spanish are complete first-class dictionaries. Persist an explicit language choice; use browser language only before a choice exists, then fall back to English. Translate controls, accessibility labels, hints, empty states, errors, and seasonal copy. Keep Sudoku digits 1 through 9 unchanged. Use translation keys in themes instead of embedding English in artwork.

## GitHub Pages and PWA

For a project URL such as `https://owner.github.io/toadoku/`, Vite needs `base: '/toadoku/'`; a user site or custom domain uses `/`. The public name Toadodu need not rename the existing repository. Use the configured base for images, manifest links, and service-worker registration. Deploy the built `dist` folder through GitHub Actions. [Vite GitHub Pages instructions](https://vite.dev/guide/static-deploy).

Keep menu/game/settings as in-app state, or use hash navigation if shareable screens become necessary. This avoids depending on server rewrites for direct links. Test the production build beneath the repository subpath, not only the development server root.

Provide a manifest with name, short name, 192px and 512px icons, start URL, scope and standalone display. Installation is progressive enhancement and varies by browser. For Chromium's expected manifest fields, follow [MDN installability guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable). Keep start URL and scope inside the repository path; manifest scope and service-worker scope are separate settings. [Manifest scope](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope).

Add offline caching for the built application shell, local fonts, artwork and puzzle data. Service workers require HTTPS or a trusted local origin. Version caches and remove only this application's obsolete caches; avoid deleting caches belonging to other projects on the same GitHub origin. Offer an update when safe and preserve the current saved game. Verify a fully offline reload after the first successful online load. [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API), [MDN service-worker tutorial](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/CycleTracker/Service_workers).

## Motorola G31/G32 targets

Both devices have **1080 x 2400 physical pixels** with a 20:9 aspect ratio. Moto G31 has a 6.4-inch OLED display at 60Hz. Moto G32 has a 6.5-inch LCD at 90Hz. [Motorola G31 specifications](https://ru.motorola.com/smartphones-moto-g-31/p), [Motorola G32 specifications](https://www.motorola.com.br/smartphone-moto-g32/p?idsku=1374), [Lenovo/Motorola G32 specifications](https://www.lenovo.com/es/es/p/phones/moto/moto-g-series/xt2235-2/pauu0010ro).

Physical resolution is not the browser's CSS viewport. Browser chrome, Android display scaling, device pixel ratio and zoom alter the available layout. Do not claim an exact CSS viewport for either phone without observing that device. `devicePixelRatio` relates physical and CSS pixels, and mobile layout requires a viewport meta tag. [MDN devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio), [MDN viewport](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport).

Use the following representative emulation matrix, clearly labeled as emulation:

| Context | CSS viewport examples | What to verify |
| --- | --- | --- |
| Narrow phone portrait | 360 x 800, 360 x 720 | Grid width, keypad targets, readable notes, no horizontal scroll |
| Alternate Android scaling | 393 x 873, 412 x 915 | Flexible spacing and clear digits |
| Phone landscape | 800 x 360, 873 x 393, 915 x 412 | Board beside controls, no clipped overflow menu |
| Small phone stress test | 320 x 568 | Graceful scrolling rather than inaccessible controls |
| Tablet | 768 x 1024 and 1024 x 768 | Comfortable grid size and balanced composition |
| Desktop | 1280 x 720, 1440 x 900 | Keyboard play, focused board, restrained scene size |

Emulate 1080 x 2400 physical rendering with a representative CSS viewport/DPR combination, such as 360 x 800 at DPR 3, but label that combination as an assumption. On hardware, record `innerWidth`, `innerHeight`, `visualViewport` and DPR in browser and installed modes, portrait and landscape, with default and larger Android text/display sizes. Browser emulation cannot certify touch comfort, refresh-rate behavior or performance on the actual device.

## Verification priorities

1. Unit tests: row/column/box conflicts; givens protected; unique solutions for supplied puzzles; valid candidates; notes and undo; completion; malformed save recovery.
2. Theme tests: October 23/24, October 31, November 7/8; local timezone boundaries; explicit overrides; visual changes leave game state untouched.
3. Localization checks: all keys exist in all three dictionaries; persisted language survives reload; long German labels fit portrait and landscape.
4. Browser flows: start every difficulty, enter/erase digits, toggle notes, undo, pause/resume, return to menu, restore after reload, change settings and complete a puzzle.
5. Accessibility: visible focus, keyboard arrows and digits, named controls, non-color conflict signals, reduced motion, adequate contrast and zoom support.
6. Production/PWA: GitHub subpath assets, manifest/icons, offline launch, cache update with saved progress, no runtime WASM requests.
7. Animation: short transform/opacity effects, no ambient animation in hidden tabs, no motion when reduced motion is selected, no continuous movement of digit positions during play.

Difficulty should reflect actual solving complexity where possible. If the first version uses clue counts or a small verified puzzle bank, state that limitation rather than promising expert-grade puzzle rating.
