# Visual constraints

These requirements override earlier visual recommendations in the research notes.

- Feel like an immersive, colorful game.
- Make the Sudoku board fill the available play area within practical limits.
- No gameplay top bar, sidebar, card layout, marketing copy, or decorative whitespace that reduces board size.
- Use one floating overflow button near the top for secondary actions.
- Keep number entry accessible. Discuss notes, undo, erase, and hint access before adding visible controls; avoid an action-button row.
- Main menu: integrated artwork, minimal text, very few actions.
- Frogs stay central in every theme. Explore frog-shaped cells and frogs holding digits without obscuring numbers, notes, or 3 by 3 boundaries.
- Halloween: recognizable pumpkin orange and near-black, with vivid purple and green accents. Exact swatches remain open.
- Animation should make the world feel alive while keeping the puzzle readable. Support reduced motion.
- Design for desktop and mobile, both orientations. Check representative 360 by 800 and 393 by 873 CSS-pixel layouts and their landscape equivalents. Physical Motorola testing remains outstanding.

## Visual review

Use ImageGen to compare main-menu and gameplay mockups before interface code. Clearly label generated images as concepts; generated grids do not establish Sudoku correctness or interactive usability.

Review board size, control count, text, color, frog treatment, touch access, and both orientations. Record the selected direction before implementation.
