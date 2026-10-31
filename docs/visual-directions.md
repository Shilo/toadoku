# Flat visual directions

Research synthesis and preserved alternatives. **C, Quiet Flat is selected as the starting direction.** B and A remain documented future treatments. Palette swatches, fonts, board proportions and button finish remain open. No interface code, artwork purchase or asset adoption is authorized by this note.

## Selected start and preserved alternatives

**Quiet Flat** starts with a solid tonal field, a few low-contrast organic edge shapes, clear opaque board and minimal controls. Cute menu sprites and typography provide identity without needing a detailed environment. Gameplay now omits the decorative frog; earlier comparison images containing it are superseded on that point.

Layered Pond can later add a small number of broad flat banks/water fields. Expressive Gradient can later add restrained atmospheric gradients. Keep gradients out of cells and behind no unbacked small labels. Their background and token choices must not require rewriting the board, controls or game state.

| Status | Direction | Benefit | Main cost |
| --- | --- | --- | --- |
| Preserved A | Expressive Gradient | Most atmospheric and colorful with little art dependency | Needs careful foreground contrast and restrained shapes |
| Preserved B | Layered Pond | Flat solid-color banks and water create a cute habitat | Broad layers can compete with the grid if overused |
| Selected C | Quiet Flat | Calmest and simplest, with few tonal edge shapes | Less atmospheric; sprite and type choices carry more personality |

These are three approaches to the same two themes, not three extra themes. Compare identical menu/game composition and board sizes. Pond and Halloween reuse the same sprite identities and source colors. The imagery is temporary AI concept material and does not establish exact pixel geometry, correct puzzle values, font rendering or accessibility.

Preserved descriptions, palette/type research and tradeoffs remain in this document and the three linked research notes. Original temporary comparison files are `a-expressive-gradient.png`, `b-layered-pond.png` and `c-quiet-flat.png` under ignored `prototypes/flat-theme-study/`, with exact prompts alongside. Those images are local references, not tracked production assets. The initial agent recommendation favored A; the user selected C for simplicity.

## Research findings that matter

- Current Material 3 Expressive supports hierarchy through color, shape and restrained motion. It does not require Android-style navigation, cards or a new UI framework. Preserve familiar Sudoku interaction. [Material research](https://design.google/library/expressive-material-design-google-research).
- Apple separates decorative/control materials from content; its current guidance is not a reason to turn the puzzle into glass. Use an opaque board and controls. [Apple materials](https://developer.apple.com/design/human-interface-guidelines/materials).
- Fullbleed backgrounds and inset interaction targets suit the request. Browser safe areas, dynamic browser chrome and installed-PWA display still need their own responsive checks. Native Android edge-to-edge code is not a web API. [Android edge-to-edge](https://developer.android.com/design/ui/mobile/guides/layout-and-content/edge-to-edge).
- Aim for at least 4.5:1 for digits, notes and labels, and 3:1 for required visual boundaries/state indicators. Contrast examples in the research are solid-pair calculations, not certification of generated mockups. [W3C text](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C non-text](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- Static-first gradients and short transform/opacity effects are a simpler starting point than animated full-screen gradients or blur. Reduced motion removes nonessential movement. Performance on a desktop does not establish Motorola performance. [Browser animation guidance](https://web.dev/articles/animations-guide).

## Theme and type proposal

Pond: mint, teal, light green, deep evergreen controls. Halloween: meaningful pumpkin orange, near-black and vivid purple fields, with the same green sprites. Every theme still needs independent light/dark appearances; the mockups compare theme identity, not the whole appearance matrix.

Use a playful display role and a stable readable digit/UI role. Initial audition shortlist: Fredoka and Nunito for Pond, Mystery Quest as a Halloween title candidate. The generated letters illustrate style only and are not rendered specimens of those exact fonts. Preserve clear familiar numbers in the same board font across themes; theme display fonts and button roles can change. Keep local font files and licenses in the eventual offline bundle. Exact fonts are not selected.

## Human-made asset findings

Kenney Animal Pack Remastered/Redux offers a free CC0 frog-face candidate with historical creator provenance. RhosGFX Vector Animals offers a paid full-body frog candidate with an explicit no-generative-AI creator statement. GameDeveloperStudio has a more detailed animated frog and an explicit human-made statement. These are candidates, not adopted assets.

No verified matching frog-and-lily-pad suite was found. A small matching human commission may be preferable to mixing incompatible art. RhosGFX forbids AI-reference use; none of its artwork or previews was used in the ImageGen comparisons. Paid source art must not be published as a standalone asset collection in a public repository. See the asset research for evidence, exact license scope and acquisition checks.

## Supporting documents and next review

- [Material and Android research](research/material-expressive.md)
- [Apple, immersive surfaces, contrast and performance](research/immersive-surfaces.md)
- [Human-made asset shortlist and typography](research/assets-and-type.md)

Temporary theme mockups are under ignored `prototypes/flat-theme-study/`; current board/button studies are under ignored `prototypes/quiet-flat-controls/`. Follow [current UI and UX](ui-ux.md) and [theme requirements](themes.md). Do not select save-slot policy, buy assets or implement UI during these comparisons.
