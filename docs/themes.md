# Theme requirements and proposals

Themes retain classic Sudoku rules and exactly the same frog and lily-pad sprites. Their definitions customize semantic UI colors, CSS gradients and background shapes, button styling, font roles, suitable motion parameters and localized text. Theme code stays independent of puzzle correctness and progress.

## Required behavior

- Automatic theme selection plus fixed explicit themes.
- Everyday cute frog theme and a Halloween theme first.
- Independent light/dark/system appearance and persistent language and animation preferences.
- Readable digits, notes, selection, box boundaries and conflicts in every palette.
- Reduced-motion support and no text embedded in artwork.
- Shared sprite assets, geometry, palette and animation frames across Pond and Halloween. Do not add seasonal hats, accessories, recolors, replacements or different lily pads.
- Build most atmosphere with HTML/CSS rather than background illustrations. Keep the solving board opaque and stable; reserve expressive fonts for readable menu/title roles.

## Discuss before implementation

| Topic | Current proposal |
| --- | --- |
| Halloween colors | Pumpkin orange, near-black, vivid purple and frog green |
| Scenery | A few unchanged human-made sprites in a CSS pond; Halloween expressed by palette, gradients, shapes and typography |
| Automatic window | October 24 through November 7 inclusive, local dates; 15 calendar dates |
| Customization | Semantic tokens for background, text, board, grid, selection, conflict and decorative colors; gradient stops, shape fields, font roles, motion and copy |

Exact swatches, artwork, light/dark treatment and event dates require discussion. The first experiment's muted aubergine/beige presentation was rejected as the intended Halloween direction.

Use ImageGen to compare main-menu and gameplay concepts before code. Follow [design constraints](design.md) and [discussion workflow](process.md).

Current candidates and evidence are in [visual directions](visual-directions.md). Specific palettes and fonts remain unselected. Author theme palettes directly for now; Android wallpaper-derived Dynamic Color is not automatically available to this web PWA and is not an approved feature.
