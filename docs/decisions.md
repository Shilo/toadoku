# Requirements and open decisions

## Implemented production UI phase, 2026-10-31

The user explicitly activated the fresh Svelte framework + TypeScript + Vite presentation/navigation implementation. It is complete with no SvelteKit, Sudoku logic or later product systems. See [production results and specialist decisions](production-ui-progress.md) and [asset provenance](production-assets.md). Root production source, tests and locked configuration are tracked; the completed ignored prototype remains unchanged.

The enabled tenth gameplay More key opens a native modal with Resume and Back to main menu. Explicit focus cycling/restoration and consumed overlay history prevent stale popup resurrection. Selection and decorative seeds remain independent. Numeric entry and tools are disabled and visibly inactive; main-menu More stays disabled.

One complete Pond preset, deterministic scene/leaves, shared active-time motion and English/German/Spanish inputs are implemented. The maximum localized menu panel is computed from production sizing rather than copied as a prototype pixel constant. Original fonts were independently obtained from pinned official upstream files with licenses shipped in build output. The user subsequently requested the current rough frog/lily-pad sketch in the built UI, replacing the initial neutral text fallback. This one provisional image is explicitly authorized while final human-made artwork remains pending; its source/hash and responsive contain treatment are recorded in [asset provenance](production-assets.md#artwork-boundary).

Physical Motorola/native DPR3 testing, tiny-note typography, final art and final region-recognition evaluation remain open. Current browser and geometry results are production-specific, with no inherited prototype certification. Historical authorization text below records earlier tasks.

Current milestone: the visual prototype is complete and the [production UI handoff](production-ui-handoff.md) is prepared. The latest task installs project-local official Svelte skills and documents a future fresh Svelte framework + TypeScript + Vite application; it implements no production app. Future scope is presentation/navigation with enabled gameplay More, not Sudoku logic, modes, rewards, saves or PWA delivery. Earlier prototype refinements and measured findings remain in [prototype progress](prototype-progress.md).

The baseline was built fresh without copying old prototype code, then refined and completed; older demos remain visual references only. Preserve experimental code/images/evidence as ignored reference. Project-local official skills and durable documentation are tracked; fresh production source will be tracked when its implementation phase is activated. Follow the bounded team workflow in the new handoff rather than continuing prototype experiments.

## Latest visual refinement authorization

The subsequent user direction closes prototype work and requests a production UI implementation handoff. Svelte means the Svelte framework, not SvelteKit. Official published Svelte skills are installed project-locally with pinned provenance. The next activated phase rewrites maintained source from scratch, preserves the selected design and adds gameplay More navigation with Resume/Close and Back to main menu. No Sudoku logic is authorized. The final instruction makes the current task handoff-only, superseding the earlier implementation wording in that same request.

The receiving agent must orchestrate efficiently as project manager, senior engineer and senior UI/UX designer. It implements the core foundation/basic app and owns contracts/integration while delegating bounded specialist modules. Specialists research and challenge each brief; the lead challenges material decisions until agreement and reviews/challenges every implementation before integrating it. Follow [the explicit team workflow](production-ui-handoff.md#12-lead-orchestration-and-efficient-specialist-teamwork), with shared-workspace ownership and evidence-based acceptance rather than unbounded delegation or automatic acceptance of reports.

The 2026-10-31 user refinement explicitly replaces earlier stationary perfect-circle pads, selection outlines, all-water control backgrounds and submenu-driven identity movement. It requests two abstract ground colors, smoother more fluid gameplay water, subtle varied pad clefts/perimeters, natural leaf selection, title-only stylistic lettering, fixed title/art anchors and subtle floating pond objects. The title-only local prototype font is Chewy; readable Outfit UI/digits and the deliberately scribbly black-and-white single placeholder remain.

The continuous wet/dry bank supports all menu/dock controls and bleeds across orientation edges without a rectangular card. Reserve maximum Progression menu height. Keep all cell targets, layout anchors and 4px/8px spacing fixed. Current implementation parameters are prototype choices under these requests, not production typography/palette/hardware approval. Review generated concepts against measured browser screenshots and record intentional differences in [prototype progress](prototype-progress.md).

## Accepted requirements

- Name: Toadodu. Classic numbered Sudoku with frogs in every theme.
- Immersive, colorful, minimal gameplay; large board and one consolidated secondary entry point, with exact More-menu behavior under review.
- Mobile and desktop, portrait and landscape; Motorola G31/G32 targets.
- Persistent English, German, and Spanish.
- Automatic and explicit seasonal themes, separate light/dark appearance.
- Customizable theme colors, backgrounds, motion, and localized text.
- Separate Sudoku, session, theme, localization, storage, and presentation responsibilities.
- GitHub Pages hosting, JavaScript delivery, no required WebAssembly.
- Approved stack: Svelte + TypeScript + Vite, delivered as a PWA with offline play.
- Initial modes: Quick Play and Progression only. Daily challenges and additional rule variants are outside the initial scope.
- Progression uses randomized selection from a bundled, pre-rated puzzle collection.
- Progression loops: completing the final level increments a repeat counter, resets the level to 1, and returns to easiest difficulty with another puzzle. Preserve puzzle-use history and currency across repeats. The label Cycle was rejected.
- Previously completed levels can be revisited, drawing a fresh randomized puzzle for the chosen level.
- Both modes award a performance score and persistent currency based on difficulty, speed and efficiency. No store, spending, purchases or upgrades are in scope.
- Approved names: Metamorphosis for the repeat counter, Leap for a level, and Dewdrops for the single earned currency. These names add no transformation mechanic or extra progression system.
- Retain classic Sudoku rules and solving functionality. Inward circular-derived pads over B, Winding shallows, are selected; structure must still communicate rows, columns and all 3 by 3 regions.
- ImageGen mockups before interface prototypes. Temporary work stays ignored.
- Production artwork must be human-made with suitable licensing and provenance. Free or paid assets are allowed. AI-generated graphics are restricted to temporary mockups/prototypes and must not ship.
- Visual implementation must prioritize a flat, full-screen, minimal, super-cute frog environment built mainly from HTML/CSS colors, gradients and soft shapes, with only a few human-made sprites.
- Frog and lily-pad sprites stay unchanged between basic and Halloween themes. Theme changes affect UI colors, gradients, background styling, buttons and font roles, not sprite artwork or accessories.
- Selected initial visual direction: C, Quiet Flat. Preserve B, Layered Pond, and A, Expressive Gradient, as modular future treatments.
- Accepted board direction: top-down pond with inward near-circular procedural lily-pad faces in 1:1 envelopes, full fixed rectangular cell buttons, no conventional grid/frame and spatial 3x3 grouping. The latest refinement adds stable subtle perimeter variation and shallow real notches, preserving an opaque text zone and inset lip/highlight.
- Keep input/action keys a distinct warm cream/ivory color family against green board pads.
- Water stays flat but expressive: exactly three solid roles shared by menu/gameplay, #0D6267/#329D9A/#7ED1B8, with broad flowing shared contours. No fourth water tint/blend, large ripple rings or reflective/gradient water. Ground adds wet reed #6D9F81 and dry sage #B6BA86 under all non-gameplay controls. Controls/lips, ink and art are outside the water limit.
- Preserve the soft-raised green leaf family and unchanged cream menu/input buttons. Near-round irregular edges and shallow varied notches now supersede perfect circles; earlier stretched notched pastilles remain historical.
- Every group's visible circles, lips and labels stay in one water fill. Selected B needs broad winding contours, not slightly wavy rectangular panels. Curves may use unused water inside stretched cells while every cell remains a full rectangular button; background color never reassigns logical regions.
- Selected board design B, Winding shallows: whole-region arrangement `A B C / B C A / C A B`, for a more natural pond. Preserve A, Connected bays (`A B A / C A C / A B A`), as a documented alternative. These board names are independent of the earlier A/B/C scene treatments; Quiet Flat C remains selected.
- Inward placement is selected: group rows align bottom/center/top and columns right/center/left; labels follow the pad. Preserve full rectangular button bounds. Centered is an archived comparison, not a new setting.
- Current pad refinement: stable procedural variation within the 1:1 nearly circular envelope, with shallow true notches, protected readable center and unchanged full rectangular hitbox. Natural selection brightens/lifts the leaf without cell/pad outlines; two dew beads identify keyboard focus. Final full solving-state accessibility remains open.
- Current motion direction: the ignored baseline selected SVG after a CSS/SVG/canvas/shader comparison. The latest refinement adds one seeded floating-object token for pad faces/labels and title/art, with float targets at most 0.48px and 1.8px respectively. Hitboxes, layout, controls and ground remain fixed. Reduced motion is static and hidden rendering pauses. Final evidence is prototype-only; no Motorola performance claim.
- Exactly two authored spacing tokens: 4px between cell rectangles/action buttons and 8px at scene edges, group gutters and board/dock separation. Extra water around circular faces is an effect of their aspect ratio/alignment, not another padding token. Same constants in menus and both orientations; system safe areas are additional.
- Region recognition must survive loss of hue through shape, spacing and lightness. Subtle alternating pad greens were ineffective; rectangular water panels undermined immersion. Neither comparison is selected.
- Themes must support optional human-made PNG/JPEG/WebP backgrounds with CSS fallback; no background image is selected.
- Number entry uses a bottom two-row/five-column dock in portrait and a right five-row/two-column dock in landscape. Keep digits upright; recalculate usable bounds rather than assuming literal pixel transposition.
- Selected control finish: soft-raised pastilles. Selected default board shape: Fill space, with a persistent Square option available through Settings.
- More stays in the menu/tenth gameplay-key position but is disabled for now. No replacement top overflow or active placeholder menu.
- Fill space fills the entire rectangle remaining after the single 8px scene inset, dock and 8px board/dock gap. No extra board margins, wrapper padding or reserved header. Dock keys sit at the bottom/right inside the same scene inset.
- In both orientations, main-menu modes form a bottom-left block: Quick Play above Progression. More remains bottom-right aligned with the lower row. The largest Progression label-plus-three-button height reserves a fixed shore/action allocation, so title/art anchors do not shift between menu states. In landscape one connected cove supports left modes and right More; pond objects alone float inside their anchors.
- Use one intentionally rough black-and-white frog-plus-lily-pad template image with a question mark, replaceable as one file. Final art remains human-made; current asset sourcing is deferred.
- Brief nonblocking start status and persistent completion information until Continue are selected in principle; exact presentation remains open.
- Remove the decorative frog from gameplay for now, retaining the menu's frog identity and maximizing board space.
- Main menu shows both modes directly. Quick Play selection reveals difficulty choices in the same scene. Progression selection reveals existing-save/new-game choices. Back returns to mode choices.
- Keep personal context out of project artifacts.

## Open proposals

| Topic | Proposal requiring discussion |
| --- | --- |
| Visual details | Quiet Flat selected; exact colors/fonts, control finish and layout details remain open. Preserve [all three treatments](visual-directions.md) |
| Button details | Soft raised selected; exact lip, highlight, colors, focus and pressed treatments need visual refinement |
| Board preference | Fill space default and Square selected; final setting wording, dock sizing and actual-size note readability need review |
| Key details | Ascending row-major order is selected in both orientations; final accessibility/interaction validation remains open |
| Tool access | Deferred: menu More regular options; gameplay More regular options plus tools alongside, subject to responsive review. Earlier popup structures are alternatives |
| Status presentation | Nonblocking start and persistent completion accepted; exact timing and future non-timed recovery surface remain open |
| Human-made artwork | One provisional composite menu image now; final human-made replacement and rights later. No pack acquisition in the current milestone |
| Save slots | Deferred: three slots is only a suggestion; count and replacement behavior are not selected |
| PWA install entry | Optional overflow placement when installation is available; visibility and browser fallback remain proposals |
| Halloween | Deferred until basic Pond gameplay is settled; earlier palette/event proposals are preserved |
| Controls | Number entry plus overflow; decide contextual access to essential solving tools |
| Seasonal dates | October 24 through November 7 inclusive, using local dates |
| Repeat schedule and display | Metamorphosis and Leap selected. Initial numbering convention, loop length, band schedule and display placement remain open |
| Currency and scoring | Dewdrops selected; formula, reward bands, assistance treatment, speed targets and conversion rate await discussion. See [proposal](scoring.md) |
| Level revisits | Fresh randomized puzzle required. Preserve furthest advancement; cross-reset unlock access and exact return-to-active-game behavior need confirmation |
| Difficulty | Human solving techniques; clue counts alone are insufficient |
| Puzzle supply | Bundled pre-rated bank approach approved; specific catalog source, size and imported subset remain open |
| Region details | B, Winding shallows, selected; A preserved. Exact contour tuning, palette and accessibility checks remain open. Preserve uniform soft-raised pads, fixed spacing and no outlined/raised region cards |
| Pad cutouts | Shallow stable varied notches and subtle near-round perimeter are authorized in the prototype. Final silhouette/readability and full solving-state validation remain open |
| Water/object motion | SVG is the prototype choice. Validate fluid shared curves and combined bounded floating envelopes, reduced/hidden behavior and hardware performance before production adoption |

## Rejected prototype direction

The first experiment looked too much like a conventional web application: top bar, excessive actions, text and spacing, and an insufficiently Halloween-colored palette. It does not establish the production direction.
