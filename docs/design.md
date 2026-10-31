# Visual constraints

These requirements override earlier visual recommendations in the research notes.

Current milestone is Pond-only with disabled More and one deliberately rough composite menu-art placeholder. The top-down pond and broad procedural pad-board direction are accepted; region-tone method and exact dimensions remain under review. See [current UI/UX](ui-ux.md) and [TODO.md](../TODO.md).

- Feel like an immersive, colorful game.
- Start with C, Quiet Flat, and preserve B/A as modular alternatives. Build most of the world using HTML/CSS color and sparse organic shapes. Optional human-made PNG/JPEG/WebP backgrounds are a supported theme capability, not a selected asset. Avoid clutter and heavy glass/blur effects.
- Make the Sudoku board fill the available play area within practical limits.
- Fill space reaches available edges with no decorative outer padding. Respect actual safe areas, keep key gaps consistent and use only a small board/dock safety gap.
- No gameplay top bar, sidebar, card layout, marketing copy, or decorative whitespace that reduces board size.
- Use a bottom portrait dock and right landscape dock with the same ten-key structure. Keep More disabled in its position, with no top overflow. Future regular-options-plus-tools layout is deferred.
- Keep number entry accessible. Discuss notes, undo, erase, and hint access before adding visible controls; avoid an action-button row.
- Main menu: integrated artwork, minimal text, direct mode choices and same-scene submenus. See [menu flow](menu.md).
- Keep frogs in the main-menu identity, but remove the decorative gameplay frog for now to maximize board space. Frog-shaped cells and number-holding mascots are not the current gameplay direction.
- Halloween is deferred. Preserve earlier palette research for later rather than designing or implementing it during the basic Pond milestone.
- Reuse exactly the same frog and lily-pad artwork across themes. No sprite recoloring, costumes, seasonal replacements or accessories. Themes change UI colors, gradients, fonts, buttons and background styling.
- Keep digits and notes over quiet opaque surfaces. The proposed pad board can show water between those surfaces instead of an opaque panel. Put theme typography primarily in menus and short labels.
- Keep action keys warm cream/ivory and distinct from the green pads. Compare whole-region pad-tone alternation with water-tone alternation, reinforced by spatial gutters rather than color alone.
- Water must remain flat with sparse abstract markings, not a realistic/gradient scene or repeated large ripple rings. The menu background treatment also applies to gameplay.
- Default to Fill space and offer Square as a persistent setting. Never stretch glyphs or rotate the logical puzzle; preserve the nine-row, nine-column and three-by-three-region structure.
- Use selected soft-raised CSS buttons while keeping the world quiet and flat. Jelly and lily-pad studies remain alternatives, not additional required styles.
- No permanent progress HUD is needed. Review brief start status and persistent completion feedback, with information recoverable in a non-timed secondary view.
- Animation should make the world feel alive while keeping the puzzle readable. Support reduced motion.
- Design for desktop and mobile, both orientations. Check representative 360 by 800 and 393 by 873 CSS-pixel layouts and their landscape equivalents. Physical Motorola testing remains outstanding.

## Artwork policy

- Production artwork must be handmade by humans. Free and paid assets are both acceptable; verify the creator, human-authorship evidence, usage license and required attribution before adoption.
- AI-generated images and illustrations are temporary concept material only. This includes AI-authored SVG illustrations, sprites, icons, backgrounds and textures; vector format is not an exception.
- Use ImageGen for clearly marked mockups under ignored `/prototypes/`. Those images are references, not production assets or proof of a human-made art style's availability.
- Existing prototype frog artwork and generated mockups have no production approval and must not ship. A paid listing or an AI image traced into another format does not establish human authorship.
- Defer asset-pack sourcing now. Use one combined, intentionally provisional black-and-white frog/lily-pad question-mark placeholder. Final artwork is a later human-made replacement; no personal motivation belongs in project artifacts.

## Visual review

Use ImageGen to compare main-menu and gameplay mockups before interface code. Clearly label generated images as concepts; generated grids do not establish Sudoku correctness or interactive usability.

Review board size, control count, text, color, frog treatment, touch access, and both orientations. Record the selected direction before implementation.

See [flat visual directions](visual-directions.md) for the current comparison and research synthesis. Procedural CSS theme styling supplies the environment; it does not authorize AI-created production illustrations or sprites.
See [current UI and UX](ui-ux.md) for approved placement requirements and unselected board/control proposals.
