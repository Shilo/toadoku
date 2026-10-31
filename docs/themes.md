# Theme requirements and proposals

Current scope is basic Pond only. Halloween and seasonal selection remain future requirements, explicitly deferred in [TODO.md](../TODO.md). Preserve modular theme boundaries without implementing the deferred theme now.

Themes retain classic Sudoku rules and exactly the same frog and lily-pad sprites. Their definitions customize semantic UI colors, CSS gradients and background shapes, button styling, font roles, suitable motion parameters and localized text. Theme code stays independent of puzzle correctness and progress.

## Required behavior

- Automatic theme selection plus fixed explicit themes.
- Everyday cute frog theme and a Halloween theme first.
- Independent light/dark/system appearance and persistent language and animation preferences.
- Readable digits, notes, selection, box boundaries and conflicts in every palette.
- Reduced-motion support and no text embedded in artwork.
- Shared sprite assets, geometry, palette and animation frames across Pond and Halloween. Do not add seasonal hats, accessories, recolors, replacements or different lily pads.
- Build most atmosphere with HTML/CSS rather than background illustrations. Keep the solving board opaque and stable; reserve expressive fonts for readable menu/title roles.
- Start with Quiet Flat C, with extension points for Layered Pond B and Expressive Gradient A behind the same UI components.
- Support optional human-made PNG, JPEG and WebP backgrounds with a usable CSS fallback. No image is selected by this capability.

## Modular boundary

Keep theme identity (Pond/Halloween), appearance (light/dark), background treatment and button finish conceptually separate. Use semantic CSS properties and a small set of authored preset fields. Do not add a plugin system, theme editor or user-facing selector for every styling combination.

The selected finish remains soft raised; green pad faces now use 1:1 circular geometry with 50% radius, superseding stretched notched pastilles. Keep lip/highlight within the circle. Cream menu/input controls remain unchanged. Stretched cell rectangles, decorative circle sizing/alignment and water geometry are separate presentation responsibilities. Neither theme nor circle geometry may shrink hitboxes to the visible leaf. Fill space/Square stays independent of theme and input state.

The authored theme spacing scale has exactly two values: small 4px and large 8px, with large derived as twice small. Rectangular cell buttons and action keys use small gaps; scene edges, group channels and board/dock separation use large. Circular faces naturally leave extra water within their slots; do not model that as another spacing token. Share the scale between scenes/orientations without stacked padding. System safe-area insets are external constraints, not a new authored size.

A decorative background renderer handles solid fields, optional broad shapes, future gradients and an optional local image. The board, keypad and menu consume semantic roles without checking the active season or background mode. Image fit and focal position are presentation data, not board-layout inputs.

An adopted background needs creator/source/license records, sensible file dimensions, `cover`/`contain` crop review, local paths compatible with GitHub Pages, offline caching and a fallback if loading fails. It must not intercept input or show essential text. Both appearances and all target orientations must remain usable without it.

Shared menu sprites stay outside theme definitions and unchanged. Gameplay frog removal is a scene-layout choice, not a seasonal theme. A tactile CSS lily-pad button is a control finish, not a replacement sprite. See [candidate theme contract](research/theme-structure.md) for the proposed small model and image/performance evidence.

The menu currently uses one combined provisional frog/pad template, not separate finished sprites. The accepted scene is flat top-down CSS pond water, and the accepted pad-board direction uses quiet opaque control faces rather than one opaque board panel. Water uses a few broad organic curves suggesting connected water/shallows, not a blank field, large ripple rings or scene gradients. Keep gameplay curves away from region cues. Treat backdrop, board face and art asset as separate responsibilities. Existing opaque classic-board notes describe the earlier visual baseline.

Current Pond water uses exactly three solid color roles, identical in menu and gameplay. Do not add background tints through opacity, gradients, texture or shadows. Button faces/lips, ink and shared illustration are outside that background-color limit. Exact swatches remain under review.

Region presentation uses selected B, Winding shallows; A remains documented. See [both arrangements](ui-ux.md#three-color-organic-regions-current-comparison). Theme data supplies three fills; geometry derives from region identity and actual visible-circle bounds. Each group's nine circles, lips and labels stay in its fill. Broader winding contours can use unused water inside stretched cell slots; they no longer have to fit only the 8px gutters. Underlays remain noninteractive; no color boundary may change hitboxes, reading order or rules. Circle alignment is under review, not another approved settings control. Do not recolor shared illustration assets.

## Discuss before implementation

| Topic | Current proposal |
| --- | --- |
| Halloween colors | Pumpkin orange, near-black, vivid purple and frog green |
| Scenery | Quiet Flat CSS first, unchanged menu sprites, no gameplay frog; optional licensed image support and B/A treatments later |
| Automatic window | October 24 through November 7 inclusive, local dates; 15 calendar dates |
| Customization | Semantic tokens for background, text, board, grid, selection, conflict and decorative colors; gradient stops, shape fields, font roles, motion and copy |

Exact swatches, artwork, light/dark treatment and event dates require discussion. The first experiment's muted aubergine/beige presentation was rejected as the intended Halloween direction.

Use ImageGen to compare main-menu and gameplay concepts before code. Follow [design constraints](design.md) and [discussion workflow](process.md).

Current candidates and evidence are in [visual directions](visual-directions.md). Specific palettes and fonts remain unselected. Author theme palettes directly for now; Android wallpaper-derived Dynamic Color is not automatically available to this web PWA and is not an approved feature.
