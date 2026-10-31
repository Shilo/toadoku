# Theme requirements and proposals

Current scope is basic Pond only. Halloween and seasonal selection remain future requirements, explicitly deferred in [TODO.md](../TODO.md). Preserve modular theme boundaries without implementing the deferred theme now.

Themes retain classic Sudoku rules and exactly the same frog and lily-pad sprites. Their definitions customize semantic UI colors, CSS gradients and background shapes, button styling, font roles, suitable motion parameters and localized text. Theme code stays independent of puzzle correctness and progress.

## Eventual required behavior

- Automatic theme selection plus fixed explicit themes.
- Everyday cute frog theme and a Halloween theme first.
- Independent light/dark/system appearance and persistent language and animation preferences.
- Readable digits, notes, selection, box boundaries and conflicts in every palette.
- Reduced-motion support and no text embedded in artwork.
- Shared sprite assets, geometry, palette and animation frames across Pond and Halloween. Do not add seasonal hats, accessories, recolors, replacements or different lily pads.
- Build most atmosphere with HTML/CSS rather than background illustrations. Keep number-bearing faces opaque and board geometry stable; reserve expressive fonts for readable menu/title roles.
- Start with Quiet Flat C, with extension points for Layered Pond B and Expressive Gradient A behind the same UI components.
- Support optional human-made PNG, JPEG and WebP backgrounds with a usable CSS fallback. No image is selected by this capability.

## Modular boundary

Keep theme identity (Pond/Halloween), appearance (light/dark), background treatment and button finish conceptually separate. Use semantic CSS properties and a small set of authored preset fields. Do not add a plugin system, theme editor or user-facing selector for every styling combination.

The selected green finish remains soft raised inside a 1:1 nearly circular envelope with subtle procedural perimeter variation and a true shallow notch. The latest user refinement supersedes perfect circles and stationary decorative faces. Keep the lip/highlight inside the silhouette and preserve a quiet opaque text area. Cream menu/input controls remain unchanged. Fixed rectangular cells, decorative leaf geometry, floating presentation and water/ground layers have separate responsibilities. No visual mask or motion may shrink/move the full hitbox. Fill space/Square stays independent of theme and input state.

The authored theme spacing scale has exactly two values: small 4px and large 8px, with large derived as twice small. Rectangular cell buttons and action keys use small gaps; scene edges, group channels and board/dock separation use large. Circular faces naturally leave extra water within their slots; do not model that as another spacing token. Share the scale between scenes/orientations without stacked padding. System safe-area insets are external constraints, not a new authored size.

A decorative renderer supplies solid water fields, broad flowing shared contours and the two-color shore. Current Pond water has no gradients; optional image/background capabilities remain an eventual separate extension. Board, keypad and menu consume semantic water/ground roles without checking season or renderer type. Image fit and focal position never determine logical board allocation.

An adopted background needs creator/source/license records, sensible file dimensions, `cover`/`contain` crop review, local paths compatible with GitHub Pages, offline caching and a fallback if loading fails. It must not intercept input or show essential text. Both appearances and all target orientations must remain usable without it.

Shared menu sprites stay outside theme definitions and unchanged. Gameplay frog removal is a scene-layout choice, not a seasonal theme. A tactile CSS lily-pad button is a control finish, not a replacement sprite. See [candidate theme contract](research/theme-structure.md) for the proposed small model and image/performance evidence.

The menu currently uses one combined provisional frog/pad template, not separate finished sprites. The accepted scene is flat top-down CSS pond water, and the accepted pad-board direction uses quiet opaque control faces rather than one opaque board panel. Water uses a few broad organic curves suggesting connected water/shallows, not a blank field, large ripple rings or scene gradients. Keep gameplay curves away from region cues. Treat backdrop, board face and art asset as separate responsibilities. Existing opaque classic-board notes describe the earlier visual baseline.

Current Pond water uses exactly three solid roles shared by both scenes: deep #0D6267, middle #329D9A and mint #7ED1B8. Do not add water tints through opacity, gradients, texture or shadows. Ground has two additional solid roles: wet reed #6D9F81 and dry sage #B6BA86. Dry land supports all non-gameplay controls, and the wet bank forms an organic transition into the pond. Control faces/lips, ink and illustration remain separate. These are prototype palette choices, not final contrast/light-dark certification.

Region presentation uses selected B, Winding shallows; A remains documented. See [both arrangements](ui-ux.md#three-color-organic-regions-current-comparison). Theme data supplies three fills; geometry derives from region identity and inward pad bounds. Each group's nine pad faces, lips and labels stay in its fill. Broader winding contours can use unused water inside stretched slots. Underlays remain noninteractive; no boundary may change hitboxes, reading order or rules. Inward alignment is selected, without adding a selector. Do not recolor shared illustration assets.

The shore renderer uses the same two ground roles in both scenes, with organic edge bleed appropriate to portrait/landscape. Its dry region covers every menu/dock control. Menu layout reserves the largest Progression label-plus-three-button height, keeping identity anchors and shore height fixed across choices. Title-only Chewy and the combined scribbly black-and-white art float inside those anchors; the consistent cream controls and Outfit UI stay on fixed ground.

Procedural pad cuts/perimeters belong to the noninteractive leaf-mask layer. Water deformation and shore composition belong to decorative backgrounds. A shared floating token classifies pond objects and applies stable seeded visual drift to pad faces/labels, title and art; ground UI stays fixed. Current float targets are at most 0.48px for pads and 1.8px for title/art, separate from subtle selected-leaf lift. Combined water/object envelopes must preserve group-fill containment and readable text. Reduced motion renders static poses; hidden-page rendering pauses. The baseline selected SVG after a renderer comparison. Current refinement implementation and final evidence are recorded in [prototype progress](prototype-progress.md); production adoption is deferred.

## Discuss before implementation

| Topic | Current proposal |
| --- | --- |
| Halloween colors | Pumpkin orange, near-black, vivid purple and frog green |
| Scenery | Quiet Flat CSS first, unchanged menu sprites, no gameplay frog; optional licensed image support and B/A treatments later |
| Automatic window | October 24 through November 7 inclusive, local dates; 15 calendar dates |
| Customization | Semantic tokens for background, text, board, grid, selection, conflict and decorative colors; gradient stops, shape fields, font roles, motion and copy |

Exact swatches, artwork, light/dark treatment and event dates require discussion. The first experiment's muted aubergine/beige presentation was rejected as the intended Halloween direction.

Use ImageGen to compare main-menu and gameplay concepts before code. Follow [design constraints](design.md) and [discussion workflow](process.md).

Historical candidates are in [visual directions](visual-directions.md). The current prototype uses the five semantic water/ground swatches above, Chewy only for the title and Outfit for UI/digits; final production palettes/fonts remain open. Author theme palettes directly for now; Android wallpaper-derived Dynamic Color is not automatically available to this web PWA and is not an approved feature.
