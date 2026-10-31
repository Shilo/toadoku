# Production UI progress and acceptance

Implemented 2026-10-31 after explicit activation of the production UI phase. This record applies to fresh tracked source, not to the completed prototype's tests. The prototype remains unchanged under ignored `prototypes/pond-visual-v1/`.

Follow-up, 2026-10-31: the user requested the missing frog/lily-pad sketch and a commit. The current rough transparent PNG is restored in the existing fixed art slot using contain sizing and localized alt text. This explicit temporary exception supersedes the original neutral text fallback described in the phase record below. Two targeted browser tests pass: nine allocations from 320x568 to 1920x1080 with fixed submenu anchors, and the built repository-subpath asset/hash audit. Type checks and the production build pass; the Svelte autofixer reports no issues. Removing the obsolete centering grid prevents the square image's intrinsic minimum height from overflowing a shorter art slot. Codex browser screenshots confirm portrait, landscape and desktop fit. [Provenance and final-art boundary](production-assets.md#artwork-boundary) remain explicit.

## Scope and structure

The root app uses Svelte 5.57.3, TypeScript 6.0.3, Vite 8.3.5 and official Vite plugin 7.3.1 with a committed lockfile. TypeScript 7 was rejected because the installed Svelte checker supports TypeScript 5/6. Vitest 4.1.12 was chosen for compatibility with the available Node 25 runtime. Node 24 is the recommended maintained baseline. No SvelteKit or prototype imports are present.

| Module | Responsibility |
| --- | --- |
| `src/App.svelte` | Composition, static menu/board views, selection, input and native dialog integration |
| `src/lib/navigation.ts` | Typed hash/history adapter, duplicate-action guard and consumed overlay entries |
| `src/lib/layout.ts` | Authoritative full allocation, safe-area-independent coordinates, exact gaps and inward square anchors |
| `src/lib/fixture.ts` | Frozen example digits/notes and logical selection movement, with no rule checking |
| `src/lib/i18n.ts` | Complete English/German/Spanish copy, locale resolution independent of theme/navigation |
| `src/lib/theme/` | Typed semantic Pond tokens and explicit CSS mapping, local font declarations |
| `src/lib/scene/` | Shared cubic water partition and static shore/cove, consuming supplied layout |
| `src/lib/leaves/`, `src/lib/motion/` | Deterministic silhouettes, protected text boxes, selected/focus cues and one active-time clock |

Themes supply semantic presentation roles. Navigation never owns selection or seeds. Locale, overlays and rotation do not regenerate logical cell IDs, fixture data or leaf seeds. No generic router, engine/session/save framework, store, service worker or deployment pipeline was introduced.

The maximum localized menu allocation is computed from three action rows, one heading line/padding and three gaps before choosing a menu state. At representative phone sizes this is 237.3px, compared with the prototype's 240.8px reservation. Shared title/art/shore anchors stay fixed between states. The authoritative geometry contract also supplies title and art rectangles, so decoration can protect the full title float envelope. Menu More remains unavailable; gameplay More is the enabled tenth key.

## Specialist decisions and lead review

The lead owned package/configuration, geometry contracts, app/navigation/input, integration, Codex browser and acceptance. Three specialists worked in disjoint files in the shared checkout, with explicit sources, contracts, forbidden edits and checks. Each researched official/primary sources and submitted a proposal before implementation.

| Specialist ownership | Proposal challenged | Reviewed revision and acceptance |
| --- | --- | --- |
| Theme: `src/lib/theme/**`, fonts, asset record, theme tests | Avoid a configurable token framework; verify active contrast, focus roles, tiny-note limits and immutable upstream font provenance | Explicit role mapping accepted after inspecting code/hash tests. Fonts independently downloaded at pinned upstream revision; notices copied into distribution. Inactive palette stays exclusively on disabled controls. |
| Scene: `src/lib/scene/**`, scene tests | A nominal 14px bank cannot blindly fit an 8px gap. Rounded tiles and distance fields do not satisfy shared curves with less complexity | All shore controls are clamped to actual leaf/dock corridors. Lead browser review rejected visible menu-edge ledges; tangent extensions fixed them. Tests now inspect every wet/dry cubic control and full panel/dock coverage, rather than an incomplete string-coordinate subset. Current screenshots accepted. |
| Leaves/motion: owned leaf/clock modules and tests | Full glyph boxes, independent float/lip/lift extrema and stale callbacks must be protected, not just sampled centers | Full candidate and digit paint boxes fit the protected disk. Focus beads consume semantic physical-size tokens. Browser review found a runtime media-change ordering bug; frame stop now publishes the static pose before stopping. Revised clock and browser tests pass. |
| Independent review by theme specialist | Actual App/navigation source, delayed history traversal, disabled affordance and focus ownership | Lead fixed leaf beads persisting after focus left the board, active-looking disabled numeric keys and stale async focus. Three independent delayed-history tests added. |

The lead reviewed actual code and integrated behavior, not only specialist summaries. Additional adverse browser tests found native dialog focus cycling and Forward reopening a modal dismissed by Back. The dialog now explicitly cycles its two actions; the adapter invalidates dismissed overlay IDs and normalizes traversed stale entries. A double Quit click could activate an exposed menu choice; a slower double Resume could move focus to an underlying cell. A cleaned-up capture attachment now suppresses the second mouse-down/click in one multi-click sequence. The regression includes an 80ms double-click interval. Keyboard activation remains available.

Final contrast review found cream title lettering over shallow water in both orientations. The lead retained cream Chewy and the selected palette, made title/art rectangles authoritative, and requested a bounded scene revision rather than an outline or new tint. Shallow curves protect the full title rectangle plus 1.8px float, with smooth joins. The landscape left bank also clamps to that envelope so it cannot cross the title at 360px height. The neutral art fallback uses dark text on an opaque cream backing without button interaction or raised styling.

The lead rejected the first contrast revision after desktop raster review: a tiny near-top handle was reused for lower joins, producing long diagonals and angular turns despite matching derivatives. Independent join lengths and separate exterior continuation restored broad lower curves. A remaining top-right beak came from an excessive horizontal taper in only 2.2px of vertical room; bounding that taper removed it. The revised raster was reviewed again before acceptance. Geometry tests now assert meaningful handle lengths and pre-title taper bounds, not just derivative equality.

## Fresh validation

| Check | Production result |
| --- | --- |
| Official Svelte workflow | Local writing/best-practices skills and relevant bundled references loaded; official CLI documentation retrieved. Autofixer reports no issues for all three Svelte components. App's three generic `bind:this` suggestions were reviewed; reactive DOM references are retained for explicit focus targets. Modal and capture listeners use attachments with cleanup. No external feedback report submitted. |
| Type/build | `npm run check`: zero errors/warnings. Clean `npm run build`: passed. No application dependencies resolve from the ignored prototype. |
| Unit/state/geometry/lifecycle | 26 tests across seven files pass. Includes direct modal links, synchronous/delayed traversal, duplicate actions, listener cleanup, frozen fixture, logical arrows, locale completeness, token/contrast/hash checks, water ownership, title clearance, shore hulls and motion lifecycle. |
| Water/shore | Fresh tests protect nominal leaf circles plus independent 1.5px reserve over 24 phases in 11 allocations, including D=28 and square board cases. Three unstroked compound fills preserve one color per group. Every actual wet/dry control hull is checked; maximum menu panel and dock coverage are tested in 13 allocations. Numerical probes supplement the convex-hull/triangle-inequality argument and actual raster review. |
| Leaf/text envelopes | All 81 shapes are stable and unique. Full note and digit paint boxes fit the opaque radius 0.36D. The conservative face/lip/float union is `0.4487D + 1.43px`, inside D/2 for D >= 28. Focus cues fit that union too. Digit containment clips paint rather than promising arbitrary fallback-font metrics. Actual Outfit digits 1-9 were visually reviewed. |
| Browser regression suite | 15 Playwright tests pass: seven allocations, all 81 water-corner targets in each, exact 4px/8px gaps, inward anchors, ten-key order, logical keys, actual-focus dew cues, popup history/focus/rotation, all locales, runtime reduced motion, touch/notch input, simulated safe areas, enlarged UI text and built subpath asset audit. |
| Codex browser review | Main/menu, maximum submenu, game and More reviewed in 360x800, 800x360, 393x873 and 873x393 CSS px plus flexible desktop. Saved screenshots are independent production evidence. Native browser DPR was 1. |
| Safe areas/input/text | Chromium CDP overrides top/right/bottom/left system insets to 24/12/20/16px; the content retains exactly one additional 8px inset and uses remaining board space. Touch notch selection and Resume preserve selection. Spanish menu/dialog controls remain reachable with a 32px UI-text fixture. These are simulations, not Android hardware measurements. |
| Motion/lifecycle | Initial/runtime reduced motion uses time zero for water/leaves/identity. Hidden pause/resume and no hidden elapsed jump are independently tested through an injected environment. Cleanup prevents captured stale RAF callbacks from rescheduling. Rendered hitboxes/anchors remain fixed during live movement. |
| Asset/subpath audit | Built app runs at `/toadoku/`, including deep-link reload normalization, local fonts, both exact font notices and bundled Svelte/clsx MIT notices. Production assets contain no AI art, images, prototype runtime imports, WASM or service-worker registration. All 57 registered files from the preserved prototype match their original hashes. `npm audit --omit=dev`: zero vulnerabilities. Full dev audit reports eight low/moderate transitive tool advisories with no automatic fix; no production runtime exposure is asserted from those tools. |

Browser test binaries/caches and screenshots are intentionally ignored. `tools/test.mjs` uses stable project-local temporary/browser directories because the restricted Windows environment gives separate shell calls different temporary profiles. A missing browser executable was a tooling failure, not an application result; after installing to the stable ignored path, the suite passed.

## Visual comparison

Compared actual production screenshots with the preserved portrait/landscape menu, board and Progression references and `refinement/concept-shore-v2.png`. No new visual experiment or ImageGen illustration was introduced.

| Better, worse or different | Observation |
| --- | --- |
| Better | Gameplay now has explicit touch/keyboard return navigation with a labeled grounded popup, reliable Back/Forward, focus containment/restoration and unchanged board allocation. Source is maintained and independently tested. |
| Better | Logical hitboxes, stable seeds, local translations and safe-area geometry are reproducible contracts. Menu water no longer has the first production iteration's edge ledges. |
| Worse / incomplete | The menu intentionally lacks the frog identity while human-made artwork is pending. Its neutral text fallback is visually quieter and less characterful than the prototype illustration. |
| Intentional accessibility fix | Menu shallow lobes narrow around the fixed title, then broaden below it. Cream title contrast is 6.53:1 over deep water and 3.006:1 over middle; shallow water at 1.65:1 is excluded from its complete motion envelope. The selected palette and lettering remain intact. |
| Intentional | Disabled numeric keys use the inactive palette rather than the prototype's active cream appearance. Enabled More remains cream, making the only functional dock action visible. Control and dock type sizes were increased during review to recover the reference's readable scale. |
| Intentional | Full allocation and group-color protection keep short-axis water more columnar than the ImageGen guideline. Broad rounded junctions are preserved; generated scenic voids, gradients, inaccurate digits and excessive spacing are rejected. |
| Intentional | Flat water has exactly three solid roles; wet/dry ground and the transient modal backdrop are separate surface roles. No illustrative production asset was created or promoted. |

## Evidence and remaining limits

Local ignored evidence: `prototypes/production-ui-evidence/`. `codex-{width}x{height}-{menu,game,more}.jpg` records Codex browser captures. Playwright PNGs include localized Progression/dialog views, grayscale and deuteranopia fixtures. The final screenshot manifest records dimensions and hashes. Prototype screenshots/test numbers have not been relabeled as production results.

Physical Motorola G31/G32 validation remains pending, including native DPR3, browser chrome, real cutouts/safe areas, Android scaling, sustained paint/frame pacing, energy and thermals. There are no new 3x rendering simulations and no hardware/performance certification. Hidden lifecycle tests use explicit simulated environment signals.

The nine-note specimen uses proportional 0.165D text, about 5.57px at the representative 33.77px anchor. Its full boxes fit geometrically; final optical readability is unapproved. Very small allocations below the tested D=28 envelope are not typography or motion acceptance targets. Grayscale/color-vision fixtures preserve inward grouping and 8px logical group gaps, but the selected water pairs have only 2.17:1 and 1.82:1 adjacent contrast. Final region-recognition/user accessibility evaluation remains open. No silent palette change was made.

One approved human-made menu illustration, with provenance and rights, is still required. The stable contain-sized art slot now uses the user-authorized rough sketch described in the follow-up above. Final art, full solving-state accessibility and later Sudoku/PWA/product systems remain outside this phase.
