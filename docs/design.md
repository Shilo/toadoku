# Visual constraints

Current isolated theme direction: the [theme authoring guide](theme-authoring.md) records accepted extensions to the historical Pond milestone below. Preserve Quiet Flat C and the gameplay grid. Theme-specific cell materials/liquid motion, a narrow third ground lip and bounded shared control rows are accepted; the old Pond-only deferral, identical seasonal cell treatment and two-ground-color limit do not restrict `codex/themes`. Gameplay integration remains separate.

These requirements override earlier visual recommendations in the research notes.

The complete restart record and selected screenshots are in [design handoff](design-handoff.md).

Current milestone is Pond-only with disabled More and one deliberately rough composite menu-art placeholder. Board design B, Winding shallows, is selected; A, Connected bays, remains a documented alternative. Quiet Flat C is still the overall scene style. See [current UI/UX](ui-ux.md) and [TODO.md](../TODO.md).

- Feel like an immersive, colorful animated pond game. Keep controls and digits clean, consistent and readable; the environment and decorative leaves remain organic.
- Start with C, Quiet Flat, and preserve B/A as modular alternatives. Build most of the world using HTML/CSS color and sparse organic shapes. Optional human-made PNG/JPEG/WebP backgrounds are a supported theme capability, not a selected asset. Avoid clutter and heavy glass/blur effects.
- Make the Sudoku board fill the available play area within practical limits.
- Use only 4px and 8px authored spacing: 4px between rectangular cell buttons/action keys, 8px at scene edges, between groups and between board/dock. Circular faces leave additional water within stretched slots; that is not a third padding value. Fill every remaining board pixel with no extra wrapper padding or scenic spacer; add necessary system safe-area protection separately.
- No gameplay top bar, sidebar, card layout, marketing copy, or decorative whitespace that reduces board size.
- Use a bottom portrait dock and right landscape dock with the same ten-key structure. Keep More disabled in its position, with no top overflow. Future regular-options-plus-tools layout is deferred.
- Keep number entry accessible. Discuss notes, undo, erase, and hint access before adding visible controls; avoid an action-button row.
- Main menu: integrated artwork, minimal text, direct mode choices and same-scene submenus. Reserve the largest Progression label-plus-three-button height for every state so title/art anchors and shore do not shift. Keep modes left and More right in landscape on one connected cove bank. See [menu flow](menu.md).
- Keep frogs in the main-menu identity, but remove the decorative gameplay frog for now to maximize board space. Frog-shaped cells and number-holding mascots are not the current gameplay direction.
- Halloween is deferred. Preserve earlier palette research for later rather than designing or implementing it during the basic Pond milestone.
- Reuse exactly the same frog and lily-pad artwork across themes. No sprite recoloring, costumes, seasonal replacements or accessories. Themes change UI colors, gradients, fonts, buttons and background styling.
- Keep digits and notes over quiet opaque surfaces, with water visible between leaves. Use licensed local Chewy only for the prototype title; Outfit remains the UI/digit font. Final production typography remains open.
- Green pad faces have 1:1 circular-derived bounds inside stretched rectangular cell buttons, with inward alignment selected by group position. Keep soft-raised finish, inset lip/highlight and unchanged cream action/menu controls. Entire rectangles remain clickable, including water. Centered is preserved as history. See [alignment rules](ui-ux.md#circular-pad-alignment-selected-inward).
- Procedural pad refinement is now authorized: stable per-cell near-circular perimeter variation and a shallow real notch with varied angle/depth. Preserve a 1:1 envelope, readable opaque center, inset lip/highlight and full rectangular hitbox. Do not stretch leaves or add distracting veins. See [acceptance tasks](future-visual-research.md).
- Flat water uses exactly three solid colors shared unchanged by both scenes: #0D6267, #329D9A and #7ED1B8. No fourth water tint, opacity blends, textures, realistic/gradient water or large ripple rings. Two separate ground roles, wet reed #6D9F81 and dry sage #B6BA86, form an abstract bank beneath every menu action and gameplay dock key. Controls/lips, ink and placeholder art are also outside the water-color limit.
- Use selected B with fluid broad S curves and smooth shared junctions; preserve A as history. The complete moving leaf/lip/label envelope of each group stays inside one assigned water fill. Curves can use empty cell water while hitboxes stay fixed. Avoid rigid group corners, small unexpected hooks, nine wavy panels, per-cell water wiggles and extra scenic spacing. Test shape/lightness without hue. See [both designs](ui-ux.md#three-color-organic-regions-current-comparison).
- Default to Fill space and offer Square as a persistent setting. Never stretch glyphs or rotate the logical puzzle; preserve the nine-row, nine-column and three-by-three-region structure.
- Use selected soft-raised CSS buttons while keeping the world quiet and flat. Jelly and lily-pad studies remain alternatives, not additional required styles.
- No permanent progress HUD is needed. Review brief start status and persistent completion feedback, with information recoverable in a non-timed secondary view.
- Selected leaves use a brighter face and subtle raised pose/lip rather than a full-cell outline or encircling pad ring. Two dew beads distinguish keyboard focus. Preserve full rectangular targets through notches and movement.
- The continuous abstract shore bleeds through left/right edges in portrait and top/bottom edges around the landscape dock. The landscape menu uses one connected cove bank under lower-left modes and lower-right More. Ground never reduces board allocation or crosses any pad motion envelope.
- The ignored baseline implements restrained SVG water deformation after comparison with CSS drift, canvas and a small shader. Current refinement also uses one floating-object token on decorative leaf faces/labels, title and menu art, with seeded phase/direction, pad float targets at most 0.48px and title/art float targets about 1.8px. Logical cells, hitboxes, dock, ground and layout anchors remain fixed. Reduced motion is static and hidden work pauses. Implementation/test results live in [prototype progress](prototype-progress.md), not in requirements alone.
- Design for desktop and mobile, both orientations. Check representative 360 by 800 and 393 by 873 CSS-pixel layouts and their landscape equivalents. Physical Motorola testing remains outstanding.

## Artwork policy

2026-10-31 follow-up: the user explicitly requested the current rough frog/lily-pad sketch in the tracked and built UI. This is a narrow temporary-placeholder exception to the earlier no-promotion rule below. Preserve its rough TEMP treatment and contain sizing; final artwork still requires human authorship and suitable rights. See [current asset provenance](production-assets.md#artwork-boundary).

- Production artwork must be handmade by humans. Free and paid assets are both acceptable; verify the creator, human-authorship evidence, usage license and required attribution before adoption.
- AI-generated images and illustrations are temporary concept material only. This includes AI-authored SVG illustrations, sprites, icons, backgrounds and textures; vector format is not an exception.
- Use ImageGen for clearly marked mockups under ignored `/prototypes/`. Those images are references, not production assets or proof of a human-made art style's availability.
- Existing prototype frog artwork and generated mockups have no production approval and must not ship. A paid listing or an AI image traced into another format does not establish human authorship.
- Defer asset-pack sourcing now. Use one combined, intentionally provisional black-and-white frog/lily-pad question-mark placeholder. Final artwork is a later human-made replacement; no personal motivation belongs in project artifacts.

## Visual review

Use ImageGen to compare main-menu and gameplay mockups before interface code. Clearly label generated images as concepts; generated grids do not establish Sudoku correctness or interactive usability.

Review board size, control count, text, color, frog treatment, touch access and both orientations. Compare actual screenshots with ImageGen for fluid curves, shore rhythm, leaf silhouettes and title character. Record better/worse/intentional differences in [prototype progress](prototype-progress.md), while retaining exact measured hitboxes, allocation and spacing instead of generated mistakes.

See [flat visual directions](visual-directions.md) for the current comparison and research synthesis. Procedural CSS theme styling supplies the environment; it does not authorize AI-created production illustrations or sprites.
See [current UI and UX](ui-ux.md) for approved placement requirements and unselected board/control proposals.
