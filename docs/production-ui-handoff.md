# Production UI implementation handoff

Next-phase handoff, 2026-10-31: the [autonomous gameplay brief](gameplay-implementation-handoff.md) now specifies the subsequent complete rules/modes/storage phase, with researched/challenged plans and independent acceptance. Its preparation is documentation-only. This file remains the completed UI phase's historical brief; do not restart the app or apply its gameplay exclusion to a later explicitly activated gameplay task.

Implementation update, 2026-10-31: the user activated this brief and the first maintained presentation/navigation phase is complete. See [fresh production results and limits](production-ui-progress.md). The preparation-only statements below describe the historical handoff task, not the current tracked root application.

Artwork follow-up, 2026-10-31: the user subsequently requested restoring the current rough frog/lily-pad sketch to the built UI. That narrow temporary-placeholder authorization supersedes this historical handoff's neutral-text-only requirement. See [current asset provenance](production-assets.md#artwork-boundary); final artwork still requires human authorship and suitable rights.

Prepared: 2026-10-31. Prototype review is complete. This task installs project-local official Svelte skills and prepares documentation only. **No production application, root package manifest, UI component, router or infrastructure is implemented by this handoff.** Activate the implementation phase in a subsequent task.

## 1. Objective, authority and phase boundary

Build the first production UI from scratch using the **Svelte framework + TypeScript + Vite**. Do not use SvelteKit. The result should be a maintained application source tree, with modular theme tokens, responsive pond presentation, accessible navigation and a working gameplay More popup. It remains a visual/navigation shell using static example data, not a Sudoku implementation.

This handoff records the latest phase requirements. When implementation is activated, it supersedes the older prototype-only prohibitions on production source and the disabled gameplay More button. The approved visual design remains in force. Earlier screenshots, experiments, generated mockups and roadmap proposals do not override current requirements.

The previous design/prototype record was committed as `e78b025` (`docs: record living pond prototype refinements`). Git tracks documentation and a local artifact registry; ignored prototype assets/source are not backed up by that commit. Verify their presence before relying on them.

### Required in the next implementation phase

- A fresh tracked production source tree, normal project-local dependencies/lockfile and a small reproducible development/build/check workflow.
- A modular Pond theme and shared semantic tokens for every current color, spacing, typography, surface, geometry, motion and overlay role.
- Responsive main-menu and gameplay screens matching the selected design at mobile/desktop sizes and both orientations.
- Same-scene menu choices, screen transitions, static 9x9 example digits/notes, fixed full-cell selection and natural selected-leaf feedback.
- Enabled gameplay More in the existing tenth dock position, opening a popup with Resume/Close and Back to main menu. Return must work on touch without depending on a transient notice or hidden gesture.
- Keyboard/mouse/touch operation, stable browser history, safe areas, static reduced motion, hidden-page pause and appropriate focus management.
- A localization boundary for English, German and Spanish, with the layout tested against those labels rather than only English.
- Fresh production validation, including browser screenshots compared with the accepted prototype and the ImageGen guideline.

### Excluded from this phase

No puzzle generation, validation, solving, editable digits, functional candidates/notes, hints, undo, erase, timing, scoring, currency, progression logic, save slots or puzzle persistence. Do not implement a game engine just to animate the pond. No store, purchases, upgrades, backend or required WebAssembly. Do not add service workers, PWA installation/offline caching, deployment or a hosting pipeline merely because they are on the eventual roadmap.

Quick Play/Progression may both lead to the same immutable example board. Difficulty choices carry presentation/navigation context only; they do not grade or generate puzzles. A static nine-note specimen is not a working notes tool. Keep unavailable numeric/tool actions visibly and semantically honest.

## 2. Read order and evidence map

Read these before scaffolding or changing the design:

1. [AGENTS.md](../AGENTS.md), this handoff and [local official Svelte skills](svelte-agent-skills.md).
2. [Design handoff](design-handoff.md), [UI/UX](ui-ux.md), [visual constraints](design.md), [themes](themes.md) and [menu](menu.md).
3. [Prototype progress, findings and comparison](prototype-progress.md), [visual acceptance](future-visual-research.md) and [architecture](architecture.md).
4. [Decisions](decisions.md), [TODO](../TODO.md) and [process](process.md). Read [progression](progression.md) and [scoring](scoring.md) only to preserve future boundaries, not to implement them now.
5. [Artifact registry](design-artifacts.json), then the current local prototype and images below. Historical alternatives are preserved for context, not active design choices.

| Evidence | Local reference and use |
| --- | --- |
| Current prototype instructions | [README](../prototypes/pond-visual-v1/README.md); run it separately to inspect the reference, without changing or extending it. |
| Final four-view proof | [visual-review.jpg](../prototypes/pond-visual-v1/refinement/visual-review.jpg), [browser gallery](../prototypes/pond-visual-v1/refinement/gallery.html). |
| Actual menu | [portrait](../prototypes/pond-visual-v1/refinement/portrait-menu.jpg), [landscape](../prototypes/pond-visual-v1/refinement/landscape-menu.jpg). |
| Maximum menu state | [portrait Progression](../prototypes/pond-visual-v1/refinement/portrait-progression.jpg), [landscape Progression](../prototypes/pond-visual-v1/refinement/landscape-progression.jpg). |
| Actual board | [portrait](../prototypes/pond-visual-v1/refinement/portrait-game.jpg), [landscape](../prototypes/pond-visual-v1/refinement/landscape-game.jpg), [selected leaf detail](../prototypes/pond-visual-v1/refinement/selection-detail.jpg). |
| Guideline and critique | [ImageGen concept](../prototypes/pond-visual-v1/refinement/concept-shore-v2.png), [user reference](../prototypes/pond-visual-v1/refinement/user-reference.png), [prompt and critique](../prototypes/pond-visual-v1/research/concept-v2.md). These are temporary AI images. |
| Water implementation lessons | [research/water-v2.md](../prototypes/pond-visual-v1/research/water-v2.md); inspect [geometry.ts](../prototypes/pond-visual-v1/src/lib/pond/geometry.ts) to understand the approach, not as production source to copy wholesale. |
| Leaf and float lessons | [research/pads-v2.md](../prototypes/pond-visual-v1/research/pads-v2.md), [leaf geometry](../prototypes/pond-visual-v1/src/lib/pads/shape.ts), [float module](../prototypes/pond-visual-v1/src/lib/motion/float.ts). Rewrite framework integration using current Svelte practices. |
| Geometry/input measurements | [refinement layout results](../prototypes/pond-visual-v1/refinement/layout-results.json), [interaction results](../prototypes/pond-visual-v1/refinement/interaction-results.json), [menu anchors](../prototypes/pond-visual-v1/refinement/menu-anchor-results.json). |
| Motion evidence | [motion-results.json](../prototypes/pond-visual-v1/refinement/motion-results.json); distinguishes moving visuals from fixed targets and simulated environment signals. |
| Envelope evidence | [water](../prototypes/pond-visual-v1/evidence/water-geometry.json), [pads](../prototypes/pond-visual-v1/evidence/pads-geometry.json), [shore](../prototypes/pond-visual-v1/evidence/shore-geometry.json). |

The reference dev server is not guaranteed to be running. From `prototypes/pond-visual-v1/`, use `npm install` if needed, then `npm run dev -- --port 5178`. Its example route is `#pond`. Do not mistake a cached browser tab or running prototype URL for a production app. Keep the reference server distinct from the future production dev server and stop owned test servers when finished.

## 3. Official Svelte skills and stack

All three canonical published skills from `sveltejs/ai-tools/tools/skills` are installed locally at pinned revision `75a688cd090b7b8326bfc988cf4ed69d5abd38fd`:

- [svelte-code-writer](../.agents/skills/svelte-code-writer/SKILL.md).
- [svelte-core-bestpractices](../.agents/skills/svelte-core-bestpractices/SKILL.md), including all nine reference files.
- [svelte-mcp-feedback](../.agents/skills/svelte-mcp-feedback/SKILL.md), for applicable feedback work only.

See [provenance/integrity](svelte-agent-skills.md) and [lock record](svelte-skills.lock.json). Load code-writer/best-practices when working on Svelte components/modules. Use official documentation and the autofixer for the installed Svelte version, then run the project checks. Feedback installation does not authorize sending issues or project material externally.

Use stable Svelte 5 with TypeScript, Vite and the compatible official Vite plugin. Verify supported Node/package versions when implementation starts and commit a reproducible lockfile. Use modern runes, derived state, typed props, snippets, ordinary event attributes and attachments where appropriate. Do not carry prototype `use:` actions or other older idioms forward automatically. Avoid experimental async features unless a real requirement emerges.

This is a browser application using the Svelte framework. No SvelteKit dependency, Kit starter, filesystem routing, `+page`/`+layout` conventions, server routes or Kit adapters. Do not replace the agreed stack with a larger framework or add a CSS/component framework without a concrete need. Vite with a small browser navigation layer is sufficient.

## 4. Fresh source and module boundaries

Scaffold production into a normal tracked root application when the next phase is activated. Do not import runtime files from `prototypes/`, copy its dependency tree, promote its generated illustrations or rename the prototype as production. Preserve the prototype unchanged as reference. Read its math and findings, then reimplement clear, tested interfaces with shared theme/layout inputs.

A suggested small structure follows; adapt names to actual needs rather than creating empty abstractions:

| Area | Responsibility |
| --- | --- |
| App composition | Scene mounting, providers and the shared overlay host. No Sudoku rules. |
| Navigation | Typed screen/submenu/overlay state; browser Back/Forward; idempotent close/quit operations. |
| Menu feature | Mode choices and same-scene submenus, maximum panel reservation and stable identity anchors. |
| Board presentation | Immutable example view model, cell selection, logical keyboard movement and dock layout. |
| Shared controls | Cream raised buttons, disabled semantics and the accessible More dialog. |
| Theme | A typed Pond definition and semantic CSS variables; no literal palette checks in feature components. |
| Layout geometry | One source for usable viewport, 4px/8px gaps, dock allocation, cells, inward anchors and safe envelopes. Water/shore and presentation must not independently drift apart. |
| Scene graphics | Decorative water, shore and procedural leaf silhouettes; receive geometry/tokens, ignore pointer input. |
| Motion | Shared seeded floating-object attachment and water clock/lifecycle policy, with cleanup and static fallbacks. |
| Localization | Typed English/German/Spanish strings and a locale input/default. No new Settings UI or persistence system merely to expose it. |
| Assets | Licensed local fonts, asset-slot metadata, documented provenance and a safe no-illustration fallback. |

Keep navigation, decorative geometry and selection independent. Theme changes, resize, locale changes and overlays cannot change logical cell IDs, fixture digits, hitboxes or stable visual seeds. Do not create placeholder engine, economy or save frameworks in this phase. Preserve architectural room for them through simple inputs/events, not speculative implementations.

## 5. Modular theme and token contract

Define semantic roles centrally and map them into CSS custom properties at the app/theme boundary. Components consume roles, not duplicate hex values or check theme names. Start with one complete Pond preset. Future theme identity and light/dark appearance stay conceptually separate; do not invent Halloween or unreviewed appearance palettes now.

| Token family | Required roles / baseline |
| --- | --- |
| Water | `water.deep #0D6267`, `water.middle #329D9A`, `water.shallow #7ED1B8`; exactly three solid authored water fills in both scenes. |
| Ground | `ground.wet #6D9F81`, `ground.dry #B6BA86`; two additional roles, outside the water-color limit. |
| Leaf | Default face `#D0F2A0`, lip `#87BB69`; selected face `#EFF7AC`, selected lip `#5D8B4E`; leaf/dew focus roles. |
| Controls | Cream face `#FFF5D9`, lower lip `#D0D4AD`, top highlight `#FFFDF1`, ink `#173F35`; disabled face `#B6C9C7`, ink `#6D9491`, lip `#A6BDB8`. Validate accessibility before declaring final production approval. |
| Typography | Title display role using licensed local Chewy; readable UI/digit roles using Outfit with sensible fallbacks. Keep title styling out of controls/numbers. Centralize scale, weight and line-height roles. |
| Spacing | Small 4 CSS px; large 8 CSS px. Cell/action gaps use small; edges/group/board-dock gaps use large. Do not add an arbitrary padding scale. Real system safe-area insets are separate. |
| Surface/shape | Control radii, leaf lip/highlight, selected lift, cleft/perimeter limits, opaque text radius and overlay surface/edge treatment. Geometry dimensions are not new spacing tokens. |
| Motion | Water period 24s and a prototype update cap of 30/s; leaf travel cap 0.48px; identity travel cap 1.8px; seeded float periods approximately 12-20s; selected lift 0.9px and lip 0.95px. Revalidate if changed. |
| Scene geometry | Stable seed inputs, protected envelopes, shoreline amplitude, background bleed and inward alignment policy. Keep logical board structure outside theme-specific decoration. |
| Overlay/transitions | Dialog surface, ink, backdrop, focus, elevation and bounded transition duration/easing; explicit static reduced-motion values. A modal backdrop must not add permanent extra pond tints. |
| Layering | Explicit background, shore, game objects, grounded controls and modal/top-layer roles. No dependence on accidental SVG overflow paint order. |

Use semantic mappings for defaults and selected/disabled/focus states. Do not make every incidental constant a user setting or build a theme editor/plugin system. Production tokens are centralized design inputs, not permission to change rules or layout per theme.

## 6. Layout and selected visual direction

The product is Toadoku, a cute full-screen top-down pond. Quiet Flat is the overall scene treatment. B, Winding shallows, is the board composition; this does not select the older overall scene treatment also named B. Keep alternatives as history, with no public A/B selector.

### Board and dock

- Nine logical 3x3 regions, nine cells each, with classic upright digits and readable group structure. Region water assignment is `A B C / B C A / C A B`.
- Fill the remaining rectangle after one 8px scene inset, safe areas, the fixed dock and an 8px board/dock gap. No square cap, extra wrapper inset, scenic header strip, outer board card, permanent HUD or gameplay frog.
- Use fixed full rectangular cell buttons including water and clefts. Decoration is not hit testing. Preserve 4px cell gaps and 8px group gaps.
- Fit each leaf's stable 1:1 anchor to the cell's shorter axis. Within a group, row 1/2/3 aligns bottom/center/top and column 1/2/3 aligns right/center/left. Move only the decorative face/label inside that allocation.
- Portrait dock: `1 2 3 4 5 / 6 7 8 9 More`. Landscape right dock: `1 2 / 3 4 / 5 6 / 7 8 / 9 More`. More is tenth and enabled in the new gameplay phase; do not add an eleventh key or top overflow.
- Prototype phone dock keys were about 65.6px, board 344x640.8125px or the transpose, and leaf anchors about 33.77px. These are measured examples, not hard-coded viewport sizes.

### Menu, shore and identity

Quick Play is above Progression in a bottom-left block in both orientations. Main-menu More remains in the bottom-right position. Keep the title and one combined art slot higher over water. Reserve the actual largest submenu allocation from the first CSS layout; do not measure the current submenu after paint and shift the identity. The prototype's 240.8px phone reservation includes the Progression label, three controls and gaps. Recompute the appropriate reservation for the production control sizing and localized labels, keeping it stable between states.

All non-gameplay controls sit on dry ground with a wet-bank transition. Use abstract shore curves, not a rectangular dock backing or straight divider. Portrait shore bleeds left/right. The gameplay landscape shore bleeds above/below the right dock. The landscape menu uses a connected cove supporting left modes and right More without relocating the mode block. Shore may use spare outer-cell water, never cover moving leaves or reduce the board allocation.

### Water, leaves and motion

Keep three solid water fills, broad smooth shared curves and natural rounded junctions. No gradients, extra water tint, texture, reflected-light layer or giant ripple rings. Avoid nine trays, sharp hooks, pointed caps and internal hairline seams. The final reference uses three unstroked compound color fills with reversed-winding subtraction for displaced junction pockets. Equal physical trim lengths produced phone junction radii around 13-20px; matching derivatives alone did not prevent ugly pointed corners.

Leaves are nearly round with extremely subtle stable irregularity and a shallow true notch. The notch reveals water; do not paint a fake dark slit. Keep the central number/note surface opaque and calm. Seeds remain stable across selection, re-rendering and rotation. Selected leaves use warmer color, a small lift, deeper lip and one dew cue. No selected cell rectangle or encircling pad outline. Keyboard focus has two localized dew beads and must remain discoverable without relying on color alone.

Apply a shared pond-object token to leaves/labels and menu title/art. Use independent slow seeded float profiles, not new random positions every frame. Grounded controls and hitboxes stay fixed. Keep glyphs upright and unstretched. Reduced motion makes water, leaves, title, art and transitions static; hidden pages pause unnecessary work and resume without hidden elapsed-time jumps. Clean up listeners, observers and animation work on unmount, including after repeated More/menu navigation.

## 7. Screen states, More and navigation behavior

| State / event | Required result |
| --- | --- |
| Initial main menu | Show both modes directly, with fixed identity/shore; no extra Play landing page. |
| Quick Play | Reveal difficulty choices in the same scene. A choice opens the static example board without implementing difficulty logic. |
| Progression | Reveal the agreed new/existing-game presentation. With no saves implemented, New game opens the static board and Continue stays unavailable. Do not fabricate slots or overwrite behavior. |
| Submenu Back | Return to mode choices; preserve anchors, shore and motion seeds. |
| Gameplay More | Open a properly labeled popup/dialog over the current board. Board/dock allocation and selected cell must not change. |
| Resume / Close | Dismiss More, restore focus to its trigger and leave the same board/selection intact. |
| Back to main menu | Close the popup and navigate to mode selection. Do not use ambiguous browser-history subtraction or silently reopen an old popup. No save/discard confirmation is needed for an immutable fixture. |
| Escape while More is open | Close More first; do not also exit gameplay from the same key event. |
| Browser/mobile Back with More open | Dismiss the popup as the first navigation step. Keep URL/history and rendered overlay state synchronized. |
| Browser Back/Forward across screens | Restore the appropriate screen/submenu predictably, with no duplicate entries, stale modal or app exit on the first intended overlay-back action. |
| Resize/rotate with More open | Keep dialog reachable, its actions visible, the underlying logical selection stable and all geometry correctly recomputed. |

The minimum authorized More change is gameplay navigation. Main-menu More retains its visual location; its detailed contents were not specified. It can remain unavailable until there is a meaningful in-scope action, or use the shared dialog for explicitly justified navigation. Do not use this request to implement Settings, language/theme editors or tools.

Prefer an accessible native modal dialog where suitable, with an explicit heading, Close/Resume, Back to main menu, keyboard containment, focus restoration and background interaction protection. Reference [MDN dialog guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog). Style it as part of the cream/ground control family without changing the pond palette or introducing a gameplay HUD. Keep backdrop-dismiss behavior explicit and testable; provide a visible close control regardless. Do not rely on a new browser attribute without verifying target support.

Honor the ground convention for the new popup actions: place them on a deliberate opaque themed surface, grounded visually in the existing shore/control language, rather than bare controls floating over water. The popup may overlay the board without reallocating it; this does not introduce a permanent board frame or dock tray.

A small hash-based navigation adapter is a reasonable static-hosting choice, not a mandatory URL spelling. Use one typed state boundary and explicit events. A modal history entry must be removed/consumed correctly on Close and Quit so Forward/Back cannot resurrect an orphaned overlay. Test rapid repeated open/close and double activation. Avoid a routing library if two screens/submenus do not need it.

## 8. Production assets, localization and delivery boundaries

Production illustration must be human-made with documented creator/source/license and appropriate rights. **Do not put the prototype's AI frog/pad bitmap, ImageGen contact sheets or AI-authored illustration SVGs into production assets or the default production bundle.** The prototype image is a style/placement reference only. Procedural presentation geometry does not authorize shipping generated character illustration.

No approved human-made replacement is currently supplied. Keep one stable contain-sized art slot with a deliberate neutral, non-illustrated fallback in production. An isolated development-only reference hook may use the ignored provisional image if it is excluded from production output. This must not block shell/navigation work or become an accidental shipped placeholder. Report missing final art as an explicit visual-delivery limitation. Do not generate a polished replacement or source sprite packs without a separate request.

Licensed fonts can be independently obtained from their official upstreams with notices retained: [Chewy](https://github.com/google/fonts/tree/main/apache/chewy), [Outfit](https://github.com/google/fonts/tree/main/ofl/outfit). The prototype contains license records for reference. Verify versions, rights, local asset paths and fallback rendering rather than blindly promoting its asset directory. Chewy is title-only; Outfit is UI/digits. Final small-note readability is still open.

Prepare complete visible English/German/Spanish navigation/dialog copy through typed dictionaries. Test longer labels and translated accessible names. Keep language/theme identity/appearance independent in module inputs. Do not build a persistence/save subsystem or Settings UI merely because eventual preferences are documented. Unsupported browser locale can fall back to English; future explicit persisted choices belong to the later preference flow.

The eventual destination remains GitHub Pages, with installable/offline PWA work later. Make the Vite build compatible with a repository subpath, local assets and client navigation without a required backend. Verify build base/path behavior during this phase, but do not deploy or add offline/install infrastructure now. “Production” here means maintained production-quality UI source, not authorization to publish an unfinished product.

## 9. Known findings and regression traps

- Protecting entire group rectangles made the original water look rigid. Preserve all leaf/label envelopes while exploiting genuine empty water for broader curves.
- Moving bleed endpoints far away without their handles distorted interior tangents. Extend contours offscreen without changing visible geometry.
- Correct tangency and sampled pad containment did not catch painter seams. Separate stroked overlays retained antialiased old edges. Inspect the actual raster output as well as testing mathematical paths.
- Highly unequal trim lengths made pointed beaks despite continuous tangents. Use balanced physical lengths and a meaningful rounding radius in available water.
- Overflowing SVG water once painted over the dock. Use deliberate stacking/paint order and verify visible controls as well as pointer hits.
- Float, selected lift and lip must be budgeted together. A leaf that fits at rest can bleed into cell gaps when selected. The final prototype's conservative union is `0.4487D + 1.43px`, inside half-diameter for tested `D >= 28px`; any parameter change requires a new proof/test.
- Menu identity used to move when submenu height changed. Reserve maximum content from the first CSS layout, including translations, rather than correcting it after observation.
- Keep all numeric labels opaque/readable and layer pointer-events correctly. Clicking water or a true notch must select the same rectangular cell.
- The screenshot clip API ignored its origin in the previous browser session. Verify evidence content, dimensions and selected state instead of trusting filenames or a successful screenshot call.
- The final water remains more columnar than ImageGen under full-allocation/group-fill constraints. Match smooth curve language, shore, title and natural leaves; do not copy scenic voids, wrong digits, gradients or inaccurate spacing to chase an arbitrary similarity percentage.

## 10. Validation plan and definition of done

The new implementation is done only after its own checks pass. Prototype results are regression references, not production certification.

1. Run relevant official Svelte documentation/autofixer workflow, type checks and a clean production build. Use a stable locked toolchain; no app dependencies should be resolved from the ignored prototype.
2. Test the small real state boundary: main/submenu/board transitions, More open/close, Quit, browser Back/Forward, Escape precedence, double activation, focus return and cleanup. Keep selection/fixture data independent of overlays.
3. Measure all 81 cell rectangles, inward 1:1 anchors, exact 4px/8px spacing, ten-key order, safe-area layout and full board allocation. Test water/notch hit areas, logical arrows, touch and mouse.
4. Test layout at 360x800 and 800x360 CSS px, plus 393x873, 873x393, desktop and flexible/intermediate sizes. Test rotation with selection/dialog open, longer translated labels, browser zoom/text enlargement and real safe-area constraints. Controls/dialog must remain reachable without accidental page overflow.
5. Validate shared water boundaries, all leaf/lip/label motion envelopes, shore coverage beneath controls, deterministic seeds and static fallbacks. Combine analytical bounds with phase/seed samples and independent rendered evidence; samples alone do not prove all independent animation phases.
6. Verify initial and runtime reduced motion, hidden pause/resume and repeated mounting. Confirm fixed hitboxes/anchors while visuals float. Check that theme/locale changes do not reseed decoration or alter logical IDs.
7. Use Codex browser for interaction and visual review. Capture both screens/orientations and the More popup. Compare with the actual prototype, maximum-menu views and ImageGen guideline; write down better/worse/intentional differences and fix visible seams, pinches, focus problems or clipping before declaring completion.
8. Audit keyboard focus, dialog names/containment, Escape/Back behavior, disabled semantics, readable contrast and non-color selected/focus cues. Tiny nine-note samples and grayscale/color-vision region recognition remain specific tests, not assumed approvals.
9. Check production output for AI artwork, references/imports into `prototypes/`, missing licenses, wrong base paths, test-only environment shims and accidental runtime/hosting infrastructure.
10. Record results, screenshots, source/asset provenance and remaining limits; commit production code and updated documentation with Conventional Commits. Keep dependencies/builds/screenshots/test outputs ignored. Test source and production code are normal tracked files; the old ignore rule for experimental source does not prohibit tracked production source once this phase is activated.

The prototype passed type/build/input/layout checks, 4,976,640 conservative water-envelope samples, 144,680 compound ownership probes, 5,913 leaf-rim points, 5,184 protected-center probes, 666 button-ground samples and 12,960 pad/shore probes. Those exact numbers describe the reference only; do not relabel them as results for freshly written production code.

Representative Motorola G31/G32 CSS testing was performed in a browser with native DPR 1. Its 1080x2400 and 2400x1080 images were 3x scaled rendering simulations, not native DPR-3 emulation or physical hardware. Actual viewport/DPR, browser chrome, Android scaling, sustained paint/frame pacing, energy, thermals and hardware usability remain pending. Do not invent device-performance guarantees. If hardware is unavailable, finish feasible browser checks and state the limit honestly.

## 11. Implementation sequence for the receiving agent

1. Read this handoff, local skills and current design/evidence. Confirm the user has activated implementation; this handoff-preparation task itself must stop at documentation/tooling.
2. Inspect the checkout and preserve existing user work. Establish fresh root Svelte/TypeScript/Vite source and compatible local tooling. No SvelteKit, prototype code promotion or engine scaffolding.
3. Implement central theme roles, localization inputs, geometry and clean background/leaf/motion modules. Maintain a usable static scene first.
4. Build main-menu/submenu composition with the largest-panel reservation and one stable art slot/fallback. Reproduce the selected title/shore/control relationships.
5. Build the static 81-cell board and ten-key dock with inward anchors, natural selection and full-cell hitboxes.
6. Implement the typed navigation boundary and accessible gameplay More dialog, including Resume/Close, Back to main menu and browser/keyboard precedence. Keep numeric/game systems inert.
7. Add restrained scene/object motion, cleanup, hidden pause and static reduced motion, then validate combined geometry and layout across sizes/locales.
8. Perform browser interactions and screenshot comparisons, fix observed issues, update findings and commit the production UI phase. Report remaining asset/hardware/accessibility limits without silently implementing later game phases.

Use KISS, YAGNI and DRY. Apply the mandatory orchestration/review workflow below. Do not add framework layers simply because this is a production source tree. Preserve the approved design while improving implementation quality.

## 12. Lead orchestration and efficient specialist teamwork

The receiving agent is the lead project manager, senior engineer and senior UI/UX designer. It must orchestrate a small specialist team, not merely dispatch tasks and concatenate their answers. The lead remains accountable for scope, priorities, architectural contracts, accessibility, visual consistency, integration and final evidence. It should actively implement the core foundation and basic application while delegating bounded specialist modules such as theme design and scene rendering.

Every specialist must research and challenge its assignment before implementation. Every material proposal must be challenged by the lead until they agree on an evidence-supported direction. Every specialist implementation must then be reviewed and challenged by the lead, with concrete revisions where needed. Agent confidence or a passing self-check is not acceptance. Challenge should resolve uncertainty and improve the result, not become an endless debate about already-settled product choices.

### Ownership and sequencing

| Owner | Responsibility and boundary |
| --- | --- |
| Lead | Read/translate requirements; break down the dependency graph; create the fresh root Svelte/TypeScript/Vite project; define module/token/layout/navigation contracts; implement app composition, basic shared control semantics, screen integration and the navigation/More foundation; own browser integration and final acceptance. |
| Theme specialist | Research semantic token structure, current palette roles, control/overlay states, typography and contrast. Implement the agreed Pond preset/CSS mappings behind the lead's interface. Do not change screen layout or add themes/settings. |
| Pond/shore specialist | Research and reimplement smooth shared water/shore geometry, winding/paint behavior and combined motion clearance. Own its renderer/math module and focused geometry tests. Do not move hitboxes or change dock allocation. |
| Leaf/motion specialist | Research near-circular procedural silhouettes, true clefts, seeded drift, selected/focus feedback and lifecycle cleanup. Own its decorative modules and envelope checks. Do not add game state or number entry. |
| Additional bounded specialist, when needed | Localization fit, independent accessibility/code review or validation. Reuse a suitable agent in a later wave rather than creating an unbounded parallel team. |

This is a practical decomposition, not a requirement for one agent per file. Adapt the number of active agents to available slots, module dependencies and complexity. Keep a slot for the lead and useful integration work. Do not spawn agents that will only wait on unfinished contracts or duplicate another agent's research. Sequence dependent work; run genuinely independent research/implementation in parallel. When useful, reuse an existing specialist for related follow-up work.

The lead establishes foundation/contracts first, then specialists implement behind them while the lead continues app/navigation/screens. Theme interfaces are shared contracts owned by the lead; the theme specialist owns the concrete preset and role mapping after agreement. Likewise, layout geometry has one authoritative input contract; separate workers cannot invent incompatible cell/dock calculations. Define exact filenames after scaffolding, before source edits begin.

### Required task brief

Each delegated task must state:

- The concrete product problem, desired user-visible outcome and its dependency on the accepted design.
- Exact owned files/modules, integration contract, forbidden edits and the lead's ownership of shared files.
- Which current documents, screenshots, local official Svelte skills and primary technical sources to inspect.
- Non-negotiable constraints, known failure cases and the questions the specialist is expected to challenge.
- Required proposal/research output, implementation evidence, targeted checks and acceptance criteria.
- That the workspace is shared, others' edits must be preserved, and contract changes must be proposed to the lead before altering other modules.

Workers should not independently modify shared root configuration, navigation, theme interfaces or global styles outside their assigned scope. They should not commit unrelated/shared changes unless explicitly assigned that responsibility. The lead coordinates integration and coherent Conventional Commits. Use isolated worktrees only when justified; do not add setup overhead by default.

### Research and decision loop before coding

1. The specialist reads the brief and the selected evidence, consults the installed Svelte skills where applicable, and researches current official/primary documentation. Reuse established project findings rather than rediscovering them without a reason.
2. It challenges assumptions: is this responsibility in the correct module, is the proposed design feasible at actual phone sizes, what could break under rotation/reduced motion/localization, and is there a simpler option?
3. It returns a concise proposal with sources, evidence vs inference, a recommended direction, meaningful alternatives/tradeoffs, interface needs, performance/accessibility risks and a validation plan. When there is no meaningful alternative, explain why rather than manufacturing choices.
4. The lead critically reviews every material decision. Ask for a counterexample, failure mode or integration implication; compare against selected visuals and scope. Challenge unnecessary dependencies, unbounded abstractions, unverifiable claims, hidden layout changes and unsupported performance assumptions.
5. The specialist answers with evidence or revises the proposal. Continue until the lead and specialist agree on the direction, interfaces, constraints and acceptance checks. Record the settled decision and why. Do not treat the first research recommendation as implementation approval.
6. If a new finding invalidates the agreed direction during coding, pause the dependent design choice, report the specific conflict and repeat the bounded decision loop. Continue independent work that is still valid. Resolve routine engineering choices within the authorized phase; escalate to the user only for an actual product/scope decision that existing requirements do not answer.

Challenge material decisions rather than mechanically interrogating each class name or line of code. The approved visual choices, framework and phase exclusions are constraints, not votes to reopen. A challenge can confirm an existing choice once evidence resolves it; it does not require inventing a different design.

### Implementation and acceptance loop

1. The specialist implements only the settled module inside its ownership boundary, keeping code small and modular. It reports changed files, implementation rationale, relevant tests/autofixer results, observed limitations and specific integration instructions.
2. The lead reviews the actual implementation, not just the summary. Check contract compliance, code quality, source/provenance, state ownership, cleanup, accessibility, responsive behavior and design consistency. Compare the result with the approved direction and reference images.
3. Challenge the implementation with targeted adverse cases: independent float phases plus selected lift/lip; 28px leaf bounds; long translated labels; narrow/rotated viewports; repeated More open/close; browser Back/Forward; static/hidden lifecycle; compound-fill seams; and production asset exclusions, as relevant to that module.
4. Ask for concrete fixes when evidence or behavior fails. Send actionable defects with locations, screenshots/reproductions and the expected outcome. The specialist revises and reruns affected checks; the lead reviews the revision. Do not accept merely because a geometric sample count or build passed.
5. Integrate reviewed modules progressively and run checks of their interaction. A locally correct shore, leaf, theme or dialog can still fail when combined. The lead owns combined motion bounds, stacking, screen transitions, theme consistency and the actual user journey.
6. Perform an independent review where useful and available, especially after a specialist has iterated on its own design. The lead still makes the final engineering/UI/UX acceptance decision and verifies reported evidence before committing.

The lead should remain the single owner of the shared Codex browser integration session unless a separate browser responsibility is explicitly arranged. Specialists can review saved images or their own isolated test artifacts; do not race several agents against one tab or viewport override. Capture stable final code/state, verify selected/focus styles and dimensions, and distinguish hot-reload/stale evidence from the current renderer. This avoids false acceptance and unnecessary rework.

### Efficiency, progress and completion

Maintain a compact task/dependency list with owner, agreed contract, current decision, outstanding findings and acceptance status. Prefer small focused proposals and evidence summaries over repeated full reports. Share new facts promptly when they affect another module. Avoid duplicate scans/tests unless new changes, failures or unresolved concerns justify repeating them.

The lead should make useful progress on foundation and integration while specialists research and implement. It must also reserve time for substantive review; dispatching every task and waiting is not professional orchestration. Report meaningful progress and decisions to the user concisely, keeping the full evidence in project documentation.

Complete the phase only when the integrated application meets section 10, specialist findings are resolved or honestly recorded as external limits, and the production source/documentation are committed coherently. Do not claim production readiness based on agent agreement alone, delegate accountability away, or extend into Sudoku logic to make the UI appear functional.

## 13. Copy-ready receiving-agent brief

Use this brief in the subsequent implementation task. It is not an instruction to implement during the handoff-preparation task.

```text
Work from this repository's root directory.

Implement the next production UI phase from scratch. The prototype is finished.
Use the Svelte framework + TypeScript + Vite. Do not use SvelteKit.
Build maintained production presentation/navigation, not another prototype.
Do not implement Sudoku logic or later game systems.

Read first:
- AGENTS.md
- docs/production-ui-handoff.md, including section 12's team workflow
- docs/svelte-agent-skills.md and docs/svelte-skills.lock.json
- docs/design-handoff.md, docs/ui-ux.md, docs/design.md
- docs/themes.md, docs/menu.md, docs/architecture.md
- docs/prototype-progress.md, docs/future-visual-research.md
- docs/decisions.md, TODO.md and docs/process.md

The official project-local skills are already installed in .agents/skills/:
svelte-code-writer, svelte-core-bestpractices and svelte-mcp-feedback.
Load the relevant writing/best-practices instructions and bundled references.
Use official Svelte documentation/autofixer and project checks. Do not install
skills globally or treat upstream SvelteKit examples as this project's stack.
Do not submit feedback/issues or project material without task authorization.

Act as project manager, senior engineer and senior UI/UX designer. Own the
core project foundation, contracts, basic app, navigation, overall design,
integration, browser review and final acceptance. Delegate bounded specialist
modules such as theme/tokens, pond/shore geometry and leaf/motion behavior.
Use available concurrency efficiently; do useful core work while specialists
research and implement. Do not delegate accountability or create idle agents.

For every delegated task, define exact file ownership, dependencies, contract,
design constraints, sources and acceptance checks. Tell workers they share
the workspace and must preserve others' changes. Each specialist must heavily
research relevant official/primary sources and challenge the brief, assumptions
and simpler alternatives BEFORE coding. Review and challenge every material
proposal until you agree on an evidence-supported direction. Then critically
review and challenge the implementation, request concrete revisions, integrate
progressively and verify cross-module behavior. Agent reports/test counts are
not acceptance by themselves. Keep the discussion bounded and record decisions.

Use the selected prototype and design as heavy guidelines:
- prototypes/pond-visual-v1/README.md
- prototypes/pond-visual-v1/refinement/visual-review.jpg
- refinement/portrait-menu.jpg, landscape-menu.jpg, portrait-game.jpg and
  landscape-game.jpg under that prototype
- refinement/portrait-progression.jpg and landscape-progression.jpg
- refinement/concept-shore-v2.png and research/concept-v2.md
- research/water-v2.md and research/pads-v2.md
- docs/design-artifacts.json for pinned local evidence/source hashes

Do not copy/promote the prototype into production or import its runtime files.
Create fresh tracked production source and a compatible local locked toolchain.
Keep historical experiments and AI mockups ignored. Reimplement clear modules
using the documented math, findings, visual references and modern Svelte APIs.

Preserve the immersive flat top-down Pond:
- Three solid water roles: #0D6267, #329D9A, #7ED1B8.
- Two ground roles: wet #6D9F81 and dry #B6BA86 beneath non-gameplay controls.
- B Winding shallows group pattern A B C / B C A / C A B, fluid shared curves,
  broad rounded joins, no internal seams, sharp beaks, trays or water gradients.
- Full rectangular fixed cell hitboxes, inward 1:1 leaf anchors, 4px cell/key
  gaps and 8px scene/group/board-dock gaps; account for safe areas separately.
- Fill all remaining board space. Ten keys: bottom 2x5 portrait, right 5x2
  landscape. No top bar, eleventh key, decorative board card or gameplay frog.
- Subtle stable procedural leaf variation and true shallow notches, opaque
  readable centers, natural warmer/lifted selection without cell/pad outlines,
  and localized dew cues for keyboard focus.
- Shared seeded float for leaves/labels and menu title/art. Reference caps are
  0.48px for leaves and 1.8px for identity. Layout/hitboxes/ground UI never move.
  Reduced motion is static; hidden pages pause. Validate combined motion bounds.
- Cream raised controls with readable Outfit UI/digits; Chewy only for the title.
- Fixed menu title/art/shore anchors across submenus, reserving the largest
  localized panel from the first layout. Quick Play remains above Progression
  at bottom-left; More remains bottom-right. Match the landscape cove layout.

Centralize typed semantic theme tokens for water, ground, leaves, controls,
ink, disabled/selected/focus states, fonts, spacing, shapes, motion, layering,
dialog and transitions. Components consume roles rather than duplicated hexes.
Implement one Pond preset, simple localization inputs for English/German/Spanish
and clean layout/navigation/scene boundaries. Do not build theme editors or
speculative engine/session/persistence frameworks.

Main menu and its same-scene Quick Play/Progression choices must navigate to an
immutable example board with static digits/notes and working full-cell selection.
Keep numeric entry/tools inert. ENABLE the existing gameplay More key to open
an accessible popup with Resume/Close and Back to main menu. Closing restores
focus/selection; quitting returns to mode selection without stale modal history.
Escape and browser/mobile Back close the popup first. Test Back/Forward, repeated
open/close, keyboard containment, focus restoration and rotation with it open.
Do not implement functional Settings, Sudoku rules, generation, solving, hints,
undo, scoring, currency, progression, saves, stores or PWA/deployment work.

Never ship the prototype's AI illustration or generated mockups in production.
Use one stable contain-sized art slot with a neutral non-illustrated fallback
until approved human-made art exists. Keep any provisional development reference
out of the production bundle. Obtain fonts with their licenses/provenance.

Validate this new implementation independently: type/build/autofixer, meaningful
state/geometry tests, exact spacing/targets, seeded variation and combined leaf/
water/shore bounds, translated label fit, reduced/hidden lifecycle and modal
accessibility. Use Codex browser for interaction and visual comparison in both
orientations at 360x800, 800x360, 393x873, 873x393 and flexible desktop sizes.
Compare actual screens and the More popup with the prototype and ImageGen;
document better/worse/intentional differences and fix visible defects.

Do not relabel prototype test results as production tests. Previous native DPR
was 1; 3x screenshots were rendering simulations, not Motorola/DPR3 hardware.
Record real hardware, tiny-note typography and asset limitations honestly.
Update findings/progress and commit the integrated production UI with
Conventional Commits. Stop before implementing the later Sudoku phase.
```
