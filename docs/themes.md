# Theme requirements and proposals

Themes retain the frog identity and classic Sudoku rules. Their definitions customize semantic colors, backgrounds, artwork accessories, animation and localized text. Theme code stays independent of puzzle correctness and progress.

## Required behavior

- Automatic theme selection plus fixed explicit themes.
- Everyday cute frog theme and a Halloween theme first.
- Independent light/dark/system appearance and persistent language and animation preferences.
- Readable digits, notes, selection, box boundaries and conflicts in every palette.
- Reduced-motion support and no text embedded in artwork.

## Discuss before implementation

| Topic | Current proposal |
| --- | --- |
| Halloween colors | Pumpkin orange, near-black, vivid purple and frog green |
| Scenery | Frogs within a seasonal habitat, with pumpkins and playful Halloween accessories |
| Automatic window | October 24 through November 7 inclusive, local dates; 15 calendar dates |
| Customization | Semantic tokens for background, text, board, grid, selection, conflict and decorative colors; scene, motion and copy fields |

Exact swatches, artwork, light/dark treatment and event dates require discussion. The first experiment's muted aubergine/beige presentation was rejected as the intended Halloween direction.

Use ImageGen to compare main-menu and gameplay concepts before code. Follow [design constraints](design.md) and [discussion workflow](process.md).
