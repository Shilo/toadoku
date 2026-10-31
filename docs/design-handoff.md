# Design handoff: resume here

Status: 2026-10-31. **Basic Pond, inward near-circular lily pads and B, Winding shallows, remain selected.** The latest authorized refinement adds two ground colors, varied pad edges/notches, natural selection and subtle floating pond objects. It supersedes the earlier perfect-circle, stationary-pad and full-cell selection-outline rules.

## Authority and project state

Current user decisions override historical research and incidental generated-image details. Read [current UI/UX](ui-ux.md), [visual constraints](design.md), [decisions](decisions.md) and [prototype progress and findings](prototype-progress.md). The progress record owns final implementation/test status; a requirement or concept is not evidence that it passes.

The repository tracks documentation and guidance. Code, dependencies, builds, test evidence and AI concepts remain under ignored `prototypes/`. No prototype has been promoted to production. The fresh baseline was built in `prototypes/pond-visual-v1/` without copying old prototype code. Refining that current prototype is explicitly authorized. Older demos remain visual references only.

## Next session: visual prototype only

Continue the existing current prototype. Allowed interaction remains menu/game navigation, a minimal return path, static example digits/notes, full rectangular cell selection and visible feedback. Mode choices can open the same specimen; number/action keys remain inert and More stays disabled in its tenth position.

The latest authorized visual work is:

- Exactly three solid water colors, plus two abstract ground colors behind menu actions and the gameplay dock.
- Flowing shared water contours, with broad natural S curves instead of rigid group corners or nine wavy panels.
- Subtly varied near-circular procedural pad silhouettes with shallow real notches and a protected opaque text area.
- Natural selected-leaf brightness/lift, without rectangular cell outlines or an encircling pad ring. One cream-edged dew drop marks selection; two dew beads distinguish keyboard focus.
- Fixed menu title/art anchors and a shore reservation based on the largest Progression submenu, so submenu changes do not reflow the identity.
- A playful title-only display font. Chewy is the licensed local prototype choice; Outfit remains the UI/digit font.
- One shared floating-object token for pad faces/labels, menu title and art. Current prototype float targets are at most 0.48 CSS px for pads and 1.8 CSS px for title/art, separate from the subtle selected-leaf lift. Stable per-object seeds vary phase/direction; layout and hitboxes never move. Reduced motion is static and hidden-page animation pauses.

Use bounded sub-agents for concept/background work with explicit ownership separate from screens/integration. Use ImageGen before new UI experiments and compare actual browser screenshots against its guideline. Record what is better, worse and an acceptable intentional difference. Reject generated spacing, missing cells, excess scenic voids, gradients and polished replacement artwork.

Excluded: puzzle generation/validation/solving, number entry, functional tools, scoring, currency, progression logic, saves, stores, PWA/offline production work and deployment. No current visual request authorizes the eventual product roadmap.

## Product and delivery

**Toadodu** is a full-screen, cute top-down frog Sudoku game with classic 9x9 rules and familiar upright digits. There is no conventional grid/frame, dashboard, permanent gameplay HUD or decorative gameplay frog. Quick Play and randomized Progression are the planned initial modes.

The approved eventual stack is Svelte, TypeScript and Vite, JavaScript delivery on GitHub Pages with installable PWA/offline play and no required backend or WebAssembly. Separate rules, sessions, themes, localization, persistence and presentation. English, German, Spanish and local preferences/progress are eventual requirements, not implemented by this visual prototype.

Metamorphosis means repeat counter, Leap means level and Dewdrops means earned currency. Save-slot policy, scoring, reward values and progression details remain open. No store, purchases, upgrades or spending are approved. See [progression](progression.md) and [scoring](scoring.md).

## Two naming systems: do not confuse them

| Category | Selected | Preserved |
| --- | --- | --- |
| Overall scene | C, Quiet Flat, developed into an abstract pond/shore | B, Layered Pond; A, Expressive Gradient |
| Board water | B, Winding shallows | A, Connected bays |
| Pad placement | Inward within each 3x3 group | Centered |

Board B does not select the older scene treatment B.

## Shared pond background

Menu and gameplay share deep teal `#0D6267`, middle teal `#329D9A` and pale mint `#7ED1B8` as three solid water roles. No fourth water tint, gradient, translucent blend, texture, reflective lighting or large ripple rings. Controls, ink, pad lips, art and the two ground roles are outside this water limit.

B assigns whole-group fills:

```text
A B C
B C A
C A B
```

All visible pad faces, lips and labels of a group remain within its assigned water fill throughout combined water/object motion. Use smooth shared contours with broad winding turns and selective junctions in unused cell water. Avoid straight panels, tiny hooks, abrupt corners, per-cell wiggles and nine separate trays. Color boundaries never change logical cell identity.

The parent reviewed a CSS/SVG/canvas/shader comparison for the baseline and selected a small SVG path renderer. Its restrained water deformation is a prototype implementation, not a production renderer/performance approval. The latest refinement targets improved contour continuity without adding a game engine or shader dependency. See [visual acceptance](future-visual-research.md).

## Ground and shore

Add wet reed `#6D9F81` and dry sage `#B6BA86` as two solid ground roles. Dry ground covers all non-gameplay controls; the wet bank forms an abstract organic transition into water. Land is one continuous shore/cove, not a panel or individual raised tray.

In portrait the shore bleeds beyond left/right edges. The gameplay landscape bank bleeds beyond top/bottom edges behind the right dock. The landscape menu keeps modes at lower-left and More at lower-right on one connected cove shore, with its land also continuing to the vertical scene edges. No straight separator or rectangular background card.

The menu ground and identity allocation reserve the maximum Progression label plus three buttons, shared across menu states. CSS establishes that reservation from the first layout, rather than waiting for a JavaScript resize measurement. The representative phone reservation is 240.8 CSS px. Gameplay land follows the existing dock allocation; its crest uses the board/dock water gap without reducing the board or covering pad motion bounds.

## Gameplay layout and input

Fill space fills the entire remaining rectangle after a single 8px scene inset, fixed dock and 8px board/dock gap. There is no extra wrapper padding, scenic strip, header or aspect-ratio cap. Real safe areas are additional system constraints.

Exactly ten dock keys:

```text
Portrait, bottom             Landscape, right
1 2 3 4 5                    1 2
6 7 8 9 More                 3 4
                             5 6
                             7 8
                             9 More
```

More remains disabled. Tools, Settings and access to the planned Square preference stay deferred. Do not replace More with a top overflow or invent gestures.

Every logical cell is a full stretched rectangular native button, including surrounding water and any pad notch. Moving decorative leaves never move, shrink or clip those hitboxes. Keyboard movement follows logical rows/columns. Selection is a brighter/lifted leaf treatment without cell/pad outlines; keyboard focus has two dew beads. Browser Back and Escape provide the minimal return route after the initial dock-ground return notice is dismissed.

## Two spacing values only

| Location | CSS px |
| --- | --- |
| Neighboring full cell buttons and action buttons | 4 |
| Scene edges, 3x3 groups and board/dock separation | 8 |

Share these constants across scenes/orientations. Additional water around inward near-circular pads comes from cell aspect ratio, not another padding token. Shape dimensions, lip depth, font sizes, shoreline amplitude and motion travel are not spacing tokens.

## Pads: selected inward geometry

Pad anchors remain inward: group row 1/2/3 aligns bottom/center/top; group column 1/2/3 aligns right/center/left. Labels and fixed candidate positions belong to the pad. Centered is preserved as history, not a setting.

The face remains within a 1:1 circular-derived envelope fitted to the cell's shorter axis. Its silhouette is nearly round with restrained stable procedural perimeter variation and a shallow real notch whose angle/depth varies per cell. Preserve the soft-raised green family, inset lip/highlight, readable opaque central zone and full rectangular hitbox. Do not stretch leaves/glyphs, paint fake dark holes or generate busy veins over digits. Tiny floating travel is bounded inside the fixed cell allocation.

Subtle independent floating is now explicitly requested and replaces the stationary-pad rule. Keep the complete motion envelope clear of other cells, ground, labels and water-color boundaries. Readability takes priority over amplitude. Reduced motion uses a stable static pose.

The refined prototype caps pad float at 0.48 CSS px, with a separate selected-leaf lift of 0.9px and lip of 0.95px. Its normalized base radius is 44.1 and maximum Bezier control radius is 44.87 on a 100-unit face. A conservative visible union bound is `0.4487D + 1.43px`, within the fixed 1:1 cell envelope for diameter `D >= 28px`. Water clearance reserves the full nominal circle plus 1.5px, rather than only the smaller visible silhouette. Final regression evidence and limits remain in [prototype progress](prototype-progress.md).

## Main menu and feedback

Quick Play sits above Progression in the bottom-left block. Disabled More stays bottom-right aligned with the lower action row in both orientations. Quick Play reveals same-scene difficulty choices; Progression reveals new/existing-game choices without a separate difficulty picker. The prototype uses New game and unavailable Continue, without implementing save slots.

Title and one combined art asset remain over water at fixed anchors regardless of submenu height. Their floating visual wrappers do not alter layout. Use Chewy only for the prototype title, preserving readable consistent Outfit UI and digits.

The art remains one deliberately childish, scribbly black-and-white top-down frog-plus-pad placeholder with a question mark/TEMP. It must look provisional. Keep one replaceable local asset and contain sizing. Production illustration must be human-made with verified provenance/license. Do not promote AI art.

Brief nonblocking start information and persistent completion results remain eventual feedback decisions. The prototype has no timing, completion, currency or progression system.

## Saved visual references

The complete local registry is [design-artifacts.json](design-artifacts.json). Ignored artifacts survive locally but are not backed up by Git.

| Purpose | File |
| --- | --- |
| Current prototype source, instructions and local evidence | [prototype README](../prototypes/pond-visual-v1/README.md) |
| Shore/floating refinement guideline | [concept-shore-v2.png](../prototypes/pond-visual-v1/refinement/concept-shore-v2.png), [prompt/critique](../prototypes/pond-visual-v1/research/concept-v2.md) |
| Durable implementation/findings/test status | [prototype progress](prototype-progress.md) |
| Historical perfect-circle inward gameplay | [portrait](../prototypes/circular-pond/portrait-inward.png), [landscape](../prototypes/circular-pond/landscape-inward.png) |
| Historical inward/centered comparison | [comparison](../prototypes/circular-pond/centered-inward-review.png) |
| Historical measured menu | [portrait](../prototypes/motorola-spacing/portrait-menu.png), [landscape](../prototypes/motorola-spacing/landscape-menu.png) |
| Broad organic B and preserved A reference | [comparison](../prototypes/organic-three-color-pond/menu-and-gameplay.png), [B reference](../prototypes/circular-pond/reference-winding-shallows.png) |
| Earlier scene alternatives | [prompts](../prototypes/flat-theme-study/prompts.md), [visual directions](visual-directions.md) |
| Soft-raised control reference | [button study](../prototypes/quiet-flat-controls/button-style-comparison.png) |

Historical screenshots retain their original measurements/assumptions. Their perfect circles, stationary faces, outlines, water-only control background or moving menu layout do not override current decisions. Generated images guide curve rhythm and composition, not exact spacing, correctness or production art.

## Verification and remaining work

Use representative 360x800 and 800x360 CSS px Motorola G31/G32 layouts, plus 393x873 and its transpose. The baseline Codex browser exposed native DPR 1 and viewport sizing only. Its 1080x2400 / 2400x1080 evidence used explicitly labeled 3x rendering simulation, not native DPR-3 or hardware. Do not relabel those captures.

The original fresh baseline passed type/build checks, measured layout/input checks, reduced/hidden motion fixture checks and 3,732,480 stationary-pad rim samples. Those old checks do not prove new floating/notched pad or shore behavior. Current refinement checks, comparisons and limitations belong in [prototype progress](prototype-progress.md).

Actual Motorola viewport/DPR, browser chrome, safe areas, Android text scaling, sustained frame pacing, energy and thermals remain pending. Tiny nine-note samples are not approved production typography. Full solving states, grayscale/color-vision validation, final art/fonts/palette and the eventual product systems remain in [TODO](../TODO.md).

## Resume after clearing chat

Start here, then read [prototype progress](prototype-progress.md). Continue the authorized ignored visual prototype and its measured review. Do not restart older design votes, treat generated mockups as exact layouts, promote AI art/code or implement the full game without further authorization.
