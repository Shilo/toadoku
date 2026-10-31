# Material 3 Expressive research

> Research record: original proposals may be superseded. Read the [design handoff](../design-handoff.md) and [current UI/UX](../ui-ux.md) for selected decisions; this record does not approve implementation.

Checked 2026-10-30. Research and proposals only. No new interface, feature, artwork, palette, or dependency is approved by this document.

## Current guidance and relevance

The official Material homepage still identifies the system as **Material Design 3**, with **M3 Expressive** as its expressive expansion. Its latest dated homepage announcements surfaced in this review are May 19, 2026. Expressive is not a separate requirement to reproduce Android screens. [Material homepage](https://m3.material.io/), [getting started](https://m3.material.io/get-started).

Google's research explains expression through color, shape, size, motion, and containment. It also reports that breaking familiar interaction patterns reduced usability. Its findings support making important actions recognizable, not adding decoration indiscriminately. The research concerned Google's tested app designs, not Sudoku, and establishes no measured improvement for Toadodu. [Google Design research, published with the 2025 Expressive introduction](https://design.google/library/expressive-material-design-google-research).

**Recommended transfer:** a full-screen, minimal, very cute pond world, unmistakable mode choices, a dominant stable Sudoku board, and deliberate selection feedback. Build the environment mainly from lightweight CSS gradients, organic shapes, and a few human-made frog, lily-pad, and supporting sprites. Use no image backdrops, painted environmental detail, app cards, or gameplay headers. Keep the established Sudoku grid and number-entry interaction recognizable. All recommendations below are product-specific interpretations, not claims that Google specifies Sudoku layouts.

### Three directions for mockup comparison

| Rank | Direction | What changes around the same board and sprites |
| --- | --- | --- |
| 1 | Expressive Gradient | Saturated CSS pond gradients, a few large organic shapes, strong selection color, and restrained motion. Best first comparison for a colorful minimal game. |
| 2 | Layered Pond | Flat CSS color bands and a few soft shoreline curves give the scene depth with little detail. Avoid adding scenery layers that visually crowd the grid. |
| 3 | Quiet Flat | Mostly flat tonal surfaces with a bright accent and sparse organic shapes. Strongest calm baseline, but keep enough saturation and frog presence to feel like a game. |

These are visual proposals, not three new application themes. Compare each in Pond and Halloween using unchanged sprite colors and geometry. The board stays large in all three.

## What transfers to the web

| Foundation | Useful application | Avoid |
| --- | --- | --- |
| Hierarchy | Board first; two direct mode choices; one floating overflow near the top | Gameplay top bars, dashboards, nested cards, decorative headings |
| Semantic color | Separate surface, text, selection, entry, conflict, and decorative roles | Applying a seed color to every visible element |
| Shape | Rounded mode choices and an occasional emphasis shape outside the puzzle | Morphing cells, irregular cell spacing, obscured 3 by 3 boundaries |
| Typography | Friendly menu expression; plain stable digits and notes | A decorative number font, animated numeral widths, embedded artwork labels |
| Motion | One purposeful menu transition and restrained feedback | 81 independent bouncing cells, continuous movement beneath notes |
| Adaptation | Recompose within the same scene as usable space changes | Stretching the board or assuming desktop navigation belongs on mobile |

Material's shape update introduces additional shapes and morphing, but those are optional expressive tools. Keep frogs and lily pads as the same human-made sprites, with the same geometry and source colors, across Pond and Halloween. UI palettes, gradients, backgrounds, and fonts carry this comparison. Do not recolor or redraw the sprites to make a theme work. [Material shape guidance](https://m3.material.io/styles/shape/overview-principles).

Android's wallpaper-derived Dynamic Color is a platform feature introduced in Android 12. It generates tonal palettes from source colors. **Do not assume a web PWA automatically receives wallpaper palettes, Android theme tokens, or native component accessibility.** Material Color Utilities has a TypeScript implementation, but the project needs no new runtime dependency merely to evaluate authored static themes. [Android Dynamic Color](https://developer.android.com/develop/ui/views/theming/dynamic-colors), [official Material Color Utilities](https://github.com/material-foundation/material-color-utilities).

Toadodu's Automatic theme is its own seasonal selection policy. System appearance selects light or dark. These remain independent, and an explicit theme stays fixed. Wallpaper matching would be a new, unapproved preference.

## Color, surfaces, and gradients

Material pairs each container with its intended `on` color and uses surface roles to express hierarchy. Reusing a text color on an unrelated fill can destroy contrast. The useful lesson is semantic pairing, not adopting every available token or surface layer. [Material color roles](https://m3.material.io/styles/color/the-color-system).

Propose a small game-specific palette. Keep board cells opaque and flat. Put gradients in the surrounding world and menu scene, with solid backing behind labels. A pond gradient or orange-purple Halloween glow is an art-direction proposal, not a Material requirement. Test text against the worst point of any gradient that can appear behind it. Gradients, translucency, bloom, and shadows must not reduce digit or grid contrast.

### Candidate semantic colors

These authored swatches are starting points for visual comparison. They are not exported official Material palettes. Dark appearance does not mean Halloween, and Halloween still needs a light appearance.

| Role | Pond light | Pond dark | Halloween light | Halloween dark |
| --- | --- | --- | --- | --- |
| Board surface | `#F4FFF0` | `#15271E` | `#FFF4E6` | `#1E1428` |
| Givens and notes | `#17301C` | `#F0F8E9` | `#28172E` | `#FFF3DF` |
| Entered digit | `#145AA3` | `#9ECDFF` | `#65369B` | `#CAB2FF` |
| Grid and box lines | `#54735B` | `#799482` | `#84627B` | `#A18AA9` |
| Selected fill | `#BEEB9F` | `#BEEB9F` | `#FF9B31` | `#FF9B31` |
| On selected fill | `#17301C` | `#17301C` | `#241302` | `#241302` |
| Conflict fill | `#FFE4E1` | `#54252E` | `#FFE4E1` | `#5B1E35` |
| On conflict fill | `#8B191B` | `#FFCDD2` | `#8B191B` | `#FFD2E1` |
| Decorative world gradient | `#65D9B7` to `#C8EF83` | `#063B39` to `#122323` | `#FFAF45` to `#DFC2FF` | `#0C0911` to `#6D1FC2` |

Halloween's visible identity should include pumpkin orange `#FF9B31`, near-black `#0C0911`, vivid purple `#9836FA`, and green UI accents such as `#7DDF57`, alongside the unchanged frog sprites. Decorative green is not an instruction to recolor the artwork. Orange and purple need to occupy meaningful parts of the scene, not appear only in tiny swatches. Light Halloween must still retain clear orange, purple, and near-black cues.

Calculated using WCAG sRGB relative luminance and the exact opaque hex pairs above:

| Pair | Pond light | Pond dark | Halloween light | Halloween dark |
| --- | --- | --- | --- | --- |
| Givens/notes on board | 13.83:1 | 14.40:1 | 15.44:1 | 16.14:1 |
| Entered digit on board | 6.76:1 | 9.42:1 | 7.57:1 | 9.55:1 |
| Grid on board | 5.13:1 | 4.75:1 | 4.82:1 | 5.67:1 |
| Selected ink on selected fill | 10.55:1 | 10.55:1 | 8.54:1 | 8.54:1 |
| Conflict ink on conflict fill | 7.74:1 | 8.87:1 | 7.74:1 | 9.25:1 |

These are pair calculations, not certification of a rendered interface. Use 4.5:1 as the text floor, including tiny notes, rather than relying on the lower large-text allowance. A selected cell must switch to its paired ink, not retain blue or purple entry text over the selection fill. Conflicted selection needs both a selection ring and conflict treatment. Give conflicts a non-color cue, and distinguish givens from entries with weight as well as hue. Recheck grid lines against selection and conflict fills, keyboard focus, hover/pressed overlays, and any reduced-opacity text. [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

## Type and motion proposals

Material separates expressive display roles from readable smaller roles and adds emphasized typography for hierarchy. A Sudoku game needs only a small subset. Typeface choice is still a visual decision; font licensing and language coverage must be verified before adoption. [Material applying type](https://m3.material.io/styles/typography/applying-type), [type-scale tokens](https://m3.material.io/styles/typography/type-scale-tokens).

Proposed visual-review sizes at a 16 px browser default: mode choices 20 to 24 px; menu labels 14 to 16 px; board digits about 24 to 32 px as cell size permits; notes about 11 to 13 px, arranged in fixed 3 by 3 positions. These are Toadodu proposals rather than copied Material tokens. Show 1, 4, 6, 7, and 9 together when comparing fonts. Favor clear counters and steady numeral positions. Keep any playful display face out of the solving grid. Check German and Spanish labels without shrinking text or clipping accents. Use rem for interface text and preserve browser zoom.

Material's May 2025 physics guidance distinguishes spatial movement from effects such as color and opacity, which should not overshoot. Propose a restrained spring for same-scene menu changes, direct selection feedback, and a short success moment away from the digits. The board geometry and note positions remain still while solving. Do not add a spring library for concept research. [Material motion](https://m3.material.io/styles/motion).

Respect `prefers-reduced-motion` and a persisted game preference. Reduced motion should remove hops, parallax, pulsing, and spatial transitions, retaining instant state changes and readable completion feedback. Continuous ambient animation should be optional. [WCAG animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [pause, stop, hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

## Touch and visual review

Android recommends 48 by 48 dp touch targets; WCAG 2.2 AA specifies a 24 by 24 CSS px minimum, subject to listed exceptions. The native recommendation and web minimum serve different purposes. At 360 CSS px wide, nine 48 px cells require 432 px before margins. A 344 px board instead gives roughly 38.2 px cells. Maximize the board, retain direct cell selection, and evaluate real thumb accuracy. Never overlap adjacent cell hit regions to claim larger targets. Overflow, menu choices, and number entry should use larger targets where feasible. A nine-across keypad has the same width constraint and needs explicit visual review. [Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps), [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Compare all directions using the same board size, source sprites, digit layout, and control count. Review selected, entered, conflicted, and note-filled cells at 360 by 800, 393 by 873, landscape, and desktop sizes. Preserve box boundaries under every state. Keep secondary control access a discussion item; no unexplained gesture should become the only way to perform an action.

ImageGen comparisons belong only under ignored `/prototypes/`, clearly marked temporary AI concepts. They cannot prove correct Sudoku, accessible contrast, touch accuracy, or production artwork availability. The established Svelte, TypeScript, Vite, GitHub Pages, and offline PWA direction needs no change to apply these principles.
