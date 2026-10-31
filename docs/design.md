# Visual constraints

These requirements override earlier visual recommendations in the research notes.

- Feel like an immersive, colorful game.
- Make the Sudoku board fill the available play area within practical limits.
- No gameplay top bar, sidebar, card layout, marketing copy, or decorative whitespace that reduces board size.
- Use one floating overflow button near the top for secondary actions.
- Keep number entry accessible. Discuss notes, undo, erase, and hint access before adding visible controls; avoid an action-button row.
- Main menu: integrated artwork, minimal text, direct mode choices and same-scene submenus. See [menu flow](menu.md).
- Frogs stay central in every theme. Explore frog-shaped cells and frogs holding digits without obscuring numbers, notes, or 3 by 3 boundaries.
- Halloween: recognizable pumpkin orange and near-black, with vivid purple and green accents. Exact swatches remain open.
- Animation should make the world feel alive while keeping the puzzle readable. Support reduced motion.
- Design for desktop and mobile, both orientations. Check representative 360 by 800 and 393 by 873 CSS-pixel layouts and their landscape equivalents. Physical Motorola testing remains outstanding.

## Artwork policy

- Production artwork must be handmade by humans. Free and paid assets are both acceptable; verify the creator, human-authorship evidence, usage license and required attribution before adoption.
- AI-generated images and illustrations are temporary concept material only. This includes AI-authored SVG illustrations, sprites, icons, backgrounds and textures; vector format is not an exception.
- Use ImageGen for clearly marked mockups under ignored `/prototypes/`. Those images are references, not production assets or proof of a human-made art style's availability.
- Existing prototype frog artwork and generated mockups have no production approval and must not ship. A paid listing or an AI image traced into another format does not establish human authorship.
- Select a final art direction alongside available human-made assets or a human artist's commission. Exact sources and budget remain open.

## Visual review

Use ImageGen to compare main-menu and gameplay mockups before interface code. Clearly label generated images as concepts; generated grids do not establish Sudoku correctness or interactive usability.

Review board size, control count, text, color, frog treatment, touch access, and both orientations. Record the selected direction before implementation.
