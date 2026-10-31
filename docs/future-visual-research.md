# Visual refinement and acceptance plan

Status: 2026-10-31. The fresh ignored baseline in `prototypes/pond-visual-v1/` implements menu/game navigation, static digits, cell selection and SVG water motion. The current authorized refinement adds shore, varied near-round notched leaves, natural selection, stable menu anchors and subtle floating pond objects. The [progress record](prototype-progress.md) owns final implementation/test results. No production adoption or hardware validation follows from this plan alone.

The latest user directions supersede earlier stationary perfect-circle pads, full-cell selection outlines, all-water control backgrounds and title/art reflow. Older demos remain visual references only. Refining the current fresh baseline is authorized; keep code/assets/dependencies/builds/evidence ignored.

## Procedural lily-pad splits and perimeter

Implement restrained stable per-cell silhouette variation inside the same 1:1 circular-derived envelope: a nearly round perimeter and one shallow real notch with varied angle/depth. Preserve inward anchors, the green raised finish, inset lip/highlight and a broad quiet opaque center for digits/notes. This is not approval for stretched botanical art, busy veins, deep star-like cuts or random text motion.

Botanical/reference work should distinguish true openings from surface markings. Procedural variation must be seeded and stable across selection, rendering and rotation, not regenerated every frame. The notch exposes the actual underlying water rather than a painted fake dark hole. Final human-made artwork policy still applies to illustrations; these are temporary procedural presentation studies.

Acceptance:

- The leaf and full floating/lift envelope fit the fixed logical cell allocation without overlapping another pad or crossing group water/ground boundaries.
- Inward anchors, all 81 full rectangular button bounds, 4px/8px gaps and logical arrow navigation remain unchanged.
- Clicking a notch or water selects the same cell. Visual masks/layers ignore pointer input.
- Quiet opaque text zones contain digits and all candidate positions over the whole movement range. Tiny nine-note specimens remain unapproved production typography.
- Lip/highlight follows the leaf silhouette without filling the notch or leaving a rectangular surface.
- Near-round perimeter variation is subtle at actual phone size; notches remain varied without distracting from recognition.

## Natural selection and keyboard focus

Replace rectangular cell outlines and encircling pad rings with a brighter leaf face, 0.9px raised pose, 0.95px lip and one cream-edged dew drop. This selection treatment belongs to the decorative leaf, not the rectangular target. Keyboard focus is distinct through two dew beads. Check keyboard discoverability and non-color recognition without adding a permanent cell grid. Later entry/error/conflict solving states remain separate future work.

## Two-color ground and fixed menu identity

Three solid water roles remain `#0D6267`, `#329D9A`, `#7ED1B8`. Add wet reed `#6D9F81` and dry sage `#B6BA86` as two solid land roles. Dry ground covers all menu controls and gameplay dock keys. Its wet bank merges into the pond through broad abstract curves, with no straight divider, individual tray or rectangular dock card.

Portrait shore bleeds beyond left/right edges. Landscape dock shore bleeds beyond top/bottom edges. The landscape menu retains left modes/right More on a connected cove bank, continuing land to vertical edges. Shore crests cannot cover pad motion bounds or reduce full board allocation.

Reserve the largest Progression submenu height, including its label plus three buttons, for every menu state. Title/art anchors and shore height must remain identical when switching modes and submenus. Only bounded floating is allowed. Chewy is the local licensed title-only prototype font; Outfit remains the readable UI/digit font. The one combined scribbly black-and-white question-mark/TEMP asset remains deliberately provisional.

Acceptance:

- Every point behind each menu/dock button rectangle is dry land, in both orientations and every menu state.
- Both ground roles are visible as one connected abstract shore/cove rather than a straight bar.
- Switching main/Quick Play/Progression menus preserves title/art anchor bounds and maximum action/shore allocation.
- No extra gameplay strip, header, dock key or spacing value is introduced.

## Animated pond water and floating objects

The baseline compared CSS transform drift, SVG deformation, Canvas2D and a small shader. A small shared SVG path renderer was chosen for the prototype. The current contour refinement should remove rigid panel-like corners and tiny hooks, using smooth broad winding S curves. There is no need for a game engine or shader dependency merely to copy generated gradients.

Water movement and floating-object movement are separate presentation layers. One shared token marks pond objects: pad faces/labels, title and menu art. Stable per-object seeds vary phase, duration and direction. Current float targets are at most 0.48 CSS px for pads and 1.8 CSS px for title/art, separate from subtle selected-leaf lift. Final measured envelopes belong in the progress record. Hitboxes, layout anchors, dock, land and UI controls remain fixed. Motion should feel like very gentle floating, with readability taking priority over amplitude.

Acceptance:

- Exactly three solid authored water fills remain shared by menu/gameplay. The two ground fills are separate; no gradients, translucent water layers, reflective highlights, texture or large ripple rings.
- Every moving leaf/lip/label remains in its assigned group fill over the combined water/object motion envelope.
- Verify analytical maximum envelopes as well as sampled phases. A finite sample sweep alone does not prove every instant of independent seeded cycles.
- The current pad construction uses normalized base radius 44.1 and maximum Bezier control radius 44.87. Its conservative visual union `0.4487D + 1.43px` stays within the fixed half-diameter for `D >= 28px`; water clearance reserves the larger nominal circle plus 1.5px. Recheck that bound if float, selected lift, lip or silhouette parameters change.
- Adjacent water shapes share smooth boundaries without cracks, overlap flicker, tiny unexpected hooks or tray-like rectangular corners.
- Reduced motion yields a usable stable static composition, including water, leaves, title and art. Check initial preference and runtime changes.
- Hidden/background work pauses and resumes without counting hidden elapsed time or snapping between seeds.
- Selection, keyboard movement, resize and rotation preserve fixed cell bounds and object seeds. The floating layer never owns rules, sessions or storage.
- Compare native-size browser images with the ImageGen guideline. Match fluid curve rhythm, shore composition and gentle leaf character while rejecting wrong cell counts, giant scenic voids, gradients and inaccurate spacing. Record better/worse/intentional differences.

## Validation and implementation limits

Use Codex browser checks at representative Motorola 360x800 and 800x360 CSS px, plus 393x873 and its transpose and desktop. Label emulation. The earlier baseline browser exposed native DPR 1 and dimensions-only viewport control; its 3x screenshots are rendering simulations, not native DPR-3 or hardware. Retain that distinction in new evidence.

Actual G31/G32 testing remains pending: native viewport/DPR, browser chrome, safe areas, Android text scaling, sustained frame pacing, dropped frames, responsiveness, energy, thermals and installed-PWA behavior. Offline/PWA infrastructure is outside this prototype. Desktop path-update counts exclude paint/compositing and cannot establish phone performance.

Keep final production palette/font/art approval, full solving states and grayscale/color-vision accessibility as explicit remaining work. Current scope still excludes Sudoku logic, number entry, scoring, progression logic, saves, stores and production delivery.

## Implementation order

1. Use a sub-agent for bounded concept/ImageGen work and background refinements, with explicit separate screen/integration ownership.
2. Review the guideline's useful visual qualities and reject its geometry/spacing errors.
3. Implement only the authorized presentation refinements in the existing current ignored prototype.
4. Check geometry, containment, input, fixed menu anchors, ground coverage, reduced motion, hidden-page behavior and both orientations.
5. Compare screenshots against the mockup and record findings, progress and limits in [prototype progress](prototype-progress.md).
6. Commit durable documentation with Conventional Commits. Keep prototype code, AI assets and test artifacts ignored.
