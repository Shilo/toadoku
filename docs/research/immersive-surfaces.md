# Immersive surfaces and flat visual directions

Research checked against official sources on October 30, 2026. This is a design proposal, not implementation approval. Read [visual constraints](../design.md), [theme requirements](../themes.md), and [discussion workflow](../process.md) first.

## Recommendation

Start the next visual comparison with a fullbleed pond gradient, one opaque traditional Sudoku board, flat colored controls, and the same frog and lily-pad artwork in both themes. Compare that against two genuinely different flat treatments below. Keep main-menu and gameplay artwork under ignored `/prototypes/`; human-made production assets require provenance and a suitable license.

The weather-app connection is the continuous atmospheric scene and minimal foreground hierarchy. It does not require weather data, clouds, simulated rain, glass, or continuously moving backgrounds. None of the platform guidance below prescribes a weather-like Sudoku interface; that connection is our design interpretation.

## What current official guidance actually says

**Apple:** Liquid Glass is a native material for a distinct controls and navigation layer. Apple advises against putting it in the content layer and against applying it to too many custom controls. Its native components also adapt to system preferences and background conditions. A CSS blur does not reproduce those guarantees. For this web game, the useful principle is separating the calm puzzle from secondary controls. It is not a reason to make the board or 81 cells translucent. An opaque overflow button is appropriate. [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)

**Android:** edge-to-edge guidance extends backgrounds to screen edges while insetting text and buttons around system bars, gestures, and cutouts. This supports a full-screen pond scene with safe placement of the board, overflow, and number entry. Its Compose and Views implementation instructions concern native Android apps, not browser CSS. The browser still controls its own chrome. [Android: Edge-to-edge design](https://developer.android.com/design/ui/mobile/guides/layout-and-content/edge-to-edge)

**Web:** safe-area environment variables describe insets where content can avoid screen cutouts or related obstructions. Small viewport units describe the viewport with browser UI expanded; dynamic units can resize as that UI changes. The website cannot assume a physical screen resolution is its usable CSS viewport or force every mobile browser to hide its chrome. [MDN: env()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env), [MDN: length units](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length)

## Three coherent directions to compare

These are project recommendations rather than platform standards. Use the same board dimensions, puzzle, controls, typography size, sprite assets, and camera framing in comparison images so styling remains the variable.

| Rank and direction | Pond | Halloween | Strength | Weakness |
| --- | --- | --- | --- | --- |
| 1. Atmospheric flat | Broad mint-to-teal gradient with a restrained warm green horizon; flat light board and dark teal buttons | Near-black-to-vivid-purple field, pumpkin-orange glow or broad color zone, bright orange controls, green frogs | Closest to the immersive weather-like request; clear board; few decorative assets; easiest shared theme system | A generic gradient can feel anonymous; sprite silhouette, placement, and exact palette must carry identity |
| 2. Layered flat habitat | Two or three broad, solid-color pond-bank or water bands behind the board | Near-black water, large violet banks, broad orange sky or reflected color | More playful scene depth and strong seasonal contrast while retaining flat graphics | Layers can compete with grid lines or look like stacked interface panels; keep edges away from digits and controls |
| 3. Quiet flat tonal | Solid teal field, sparse low-contrast organic background shapes, crisp dark teal controls | Near-black field, sparse violet background shapes, crisp orange controls and green frogs in the same positions | Calmest board-focused composition; predictable contrast; simplest rendering; strong mobile readability | Less atmospheric; needs excellent button shapes and sprite placement to retain personality |

All three retain identical human-made frog and lily-pad sprites across Pond and Halloween. No hats, pumpkins added to frogs, sprite recolors, or replacement seasonal characters are needed. Palette, gradient or broad background geometry, button colors, and suitable interface typography create the difference. Halloween should visibly include orange, near-black, vivid purple, and green, rather than relying on subtle aubergine and beige. Avoid detailed scenic illustration for this comparison. Most of the environment can be theme-driven CSS color and simple background geometry, with only a few sprite assets. Keep all three quiet and minimal; none needs a Material-style card system or illustrated world.

For all directions, main-menu mode choices are directly visible in the scene. Selecting Quick Play replaces those choices with difficulty; Progression shows continuation/new-game choices. Back restores the modes within the same scene. Gameplay contains the large board, essential number entry, and one floating overflow button near the top. These proposals add no action-button row, top bar, sidebar, explanatory copy, or marketing heading. Notes, undo, erase, and hint access still require discussion.

## Board, typography, and contrast

WCAG AA requires at least 4.5:1 for normal text and 3:1 for qualifying large text. Use 4.5:1 as the project floor for all puzzle digits, pencil marks, and button labels even where large digits technically qualify for the lower threshold. Tiny notes need careful sizing as well as contrast. [W3C: Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

Required non-text visual information needs at least 3:1 against adjacent colors. Apply that to meaningful cell/box boundaries, visible focus, selection outlines, and state indicators. Fine lines may be thinner than box boundaries while retaining contrast: propose 1 CSS px cell lines and 2 to 3 CSS px box boundaries as a starting point, then inspect actual rendering. WCAG does not prescribe Sudoku line thickness. [W3C: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)

Project recommendations:

- Keep the board opaque and uniform behind numbers. A background gradient must never show through cells, pencil marks, or the nine-box structure.
- Prefer open, familiar digit forms, stable widths, and upright text. Check 1/7, 3/8, and 6/9 at the actual device size. Use one readable number face across themes; any theme-specific display typeface belongs in the menu or short labels.
- Distinguish given and entered numbers with weight as well as color. Retain a visible keyboard-focus outline independently of selection. Use an outline, marker, or other additional cue for conflicts rather than hue alone.
- Keep outlines inside their cells or otherwise prevent them from shifting grid geometry. Avoid 81 separate rounded cards, deep shadows, flower-petal cells, or thick decorative borders that dilute the traditional grid.
- Decoration can overlap the outside of the board frame only if digits, notes, state outlines, touch targets, and the 3 by 3 divisions remain unobscured. Crop decoration before reducing board size.

### Example semantic palette

These swatches are comparison candidates only. They illustrate independent theme roles, not final light/dark palettes or event dates. Pond is a light-board example and Halloween a dark-board example; both themes still need independent light and dark variants.

| Semantic role | Pond example | Halloween example |
| --- | --- | --- |
| Scene field | `#76CABA` to `#B1E5A8` | `#17131F` to `#5B2A9C`, broad orange `#DC6019` accent |
| Board | `#EFFFF8` | `#201B2D` |
| Given | `#143B33` | `#FAF6FF` |
| Entry | `#165E89` | `#B6D9FF` |
| Note | `#395C50` | `#C8BBD4` |
| Cell and box line | `#52776A` | `#8C7E9C` |
| Selected-cell fill | `#CEE8E1` | `#42305E` |
| Focus outline | `#143B33` | `#FF8A24` |
| Button / label | `#196451` / `#FFFFFF` | `#FF8A24` / `#241525` |
| Secondary scene accent | warm pale green | vivid purple `#9D53FF`, green `#9FDF4C` |

Calculated using the WCAG sRGB relative-luminance formula: the weakest given/entry/note contrast across board and selected fills is approximately 5.42:1 for Pond and 6.34:1 for Halloween. Grid contrast on selected fill is about 3.86:1 and 3.07:1 respectively. Button-label contrast is about 7.04:1 and 7.37:1. The Halloween selected-grid pair is close to its floor; inspect rendering and darken the selection fill if it looks weak. These calculations cover the listed solid pairs only, not all future state combinations, gradients, overlays, disabled states, or complete WCAG conformance. [W3C: contrast definition](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)

Additional roles should cover conflict fill/ink/marker, related-cell fill, selection outline, menu surface, and overlay scrim when their interactions are decided. Keep background stops, typography references, and motion settings outside puzzle logic. Theme switching preserves sprite identity, layout, selected cell, entries, and notes.

## Motion, transparency, and performance

Google's browser performance guidance recommends animating transform and opacity when possible and profiling rather than assuming CSS is cheap. Blurs can take longer to paint, and `will-change` should be used sparingly. [web.dev: High-performance CSS animations](https://web.dev/articles/animations-guide)

For this project, start with a static gradient or flat bands. Add only short, localized frog or ripple motion after measuring on target hardware. Avoid animating full-screen gradient stops, background position, large blur filters, or a full-screen canvas particle loop. Transform/opacity can still consume memory and compositing time when applied to large layers, so those properties alone do not establish good performance. Do not create a layer per cell or assume 60 fps on the target phones without testing.

Respect `prefers-reduced-motion` and provide an equivalent calm presentation: stationary frogs, fixed backgrounds, immediate scene changes or a brief non-spatial fade, and a static completion state. The media query detects the exposed user preference; it does not itself pause application animations. [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)

For automatically moving content lasting more than five seconds alongside other content, WCAG requires a pause, stop, or hide mechanism unless essential. Do not assume spaced-out repeated animation avoids that rule. A persisted ambient-motion control can live in the overflow menu, without adding gameplay chrome. Reduced-motion support alone does not establish compliance for users who have not enabled that preference. The simplest initial proposal is a static solving scene with short input-triggered celebrations. [W3C: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

`prefers-reduced-transparency` is currently marked limited availability and experimental by MDN. It cannot be relied on as a universal Android/browser setting bridge. Opaque board and controls work without that signal. If optional translucent overlays are later adopted, include an opaque fallback, honor the query where supported, and verify contrast independently of blur support. Do not add a transparency preference just to support an unnecessary effect. [MDN: prefers-reduced-transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency)

## Responsive and device checks

WCAG 2.2 AA target sizing is a minimum of 24 by 24 CSS px with specified exceptions, not a universal 44 px requirement. Prefer around 44 to 48 CSS px for standalone overflow, menu choices, and number entry where space allows. Adjacent 9 by 9 cells impose real limits: a 336 CSS px board gives approximately 37 CSS px cells before line accounting. Make the whole cell selectable, preserve keyboard access, and avoid suggesting an invisible overlapping hit area solves the constraint. [W3C: Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)

In portrait, maximize board width within modest safe margins and place essential number entry close below. In landscape, size the board from available height and consider essential number entry immediately beside it as a compact cluster, without creating a secondary information panel. Exact key arrangement remains a control-design decision. The overflow control must not cover playable cells. Reserve only its necessary safe area, not a full-width top-bar strip.

Validate 360 by 800 and 393 by 873 CSS px and their landscape equivalents, expanded/collapsed browser chrome, installed PWA display, both appearance modes, and all three interface languages. A compact menu must tolerate longer German labels without shrinking text into illegibility. Avoid height transitions that move the board while a user taps; decide viewport sizing from measured browser behavior. Test zoom and text resizing rather than disabling them to hold the composition.

On Motorola G31/G32-class hardware, measure input responsiveness, rotation, repaint areas, frame drops, and memory with decoration active; then repeat with reduced motion. Record actual CSS viewport, browser version, and installed/browser state. Emulator screenshots and desktop throttling cannot establish physical-device performance. Keep all sprites, necessary fonts, and scene resources local and included in the eventual offline asset strategy; no remote weather API or runtime font dependency is needed for these designs.

## Next review

Generate temporary paired Pond/Halloween main-menu and gameplay mockups for the three directions, keeping the frog and lily-pad references identical. Include at least one landscape crop before choosing a direction. Evaluate board prominence, readable fine lines, explicit Halloween colors, sprite continuity, and control count. Generated grids are visual concepts, not evidence of Sudoku validity or usable interaction. After selection, discuss the control-access decision before interface implementation.
