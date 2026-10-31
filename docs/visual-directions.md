# Flat visual directions

Research synthesis and temporary mockup comparison. The CSS-led environment and unchanged sprites are requirements; these three treatments, palette swatches and font families remain proposals. No interface code, artwork purchase or asset adoption is authorized by this note.

## Recommendation

**Expressive Gradient**, restrained by the minimal-control and board-first rules. It supplies the requested immersive atmosphere with CSS rather than expensive or difficult-to-source scene illustrations. Use a small number of broad gradient fields, organic edge shapes, flat filled controls and tiny shared frog/lily-pad sprites. Keep gradients out of the board and behind no unbacked small labels.

The generated version still contains more decorative water shapes than the minimum implementation needs. Treat those as optional atmosphere to simplify, not a prescribed asset set. Quiet Flat is the fallback if the richer background distracts in playtesting.

| Rank | Direction | Benefit | Main cost |
| --- | --- | --- | --- |
| 1 | Expressive Gradient | Most immersive and colorful with little art dependency | Needs careful foreground contrast and restrained shapes |
| 2 | Layered Pond | Flat solid-color banks and water create a cute habitat | Broad layers can compete with the grid if overused |
| 3 | Quiet Flat | Calmest and simplest, with few tonal edge shapes | Less atmospheric; sprite and type choices carry more personality |

These are three approaches to the same two themes, not three extra themes. Compare identical menu/game composition and board sizes. Pond and Halloween reuse the same sprite identities and source colors. The imagery is temporary AI concept material and does not establish exact pixel geometry, correct puzzle values, font rendering or accessibility.

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

Temporary mockups and exact prompts are under ignored `prototypes/flat-theme-study/`. After a direction is selected, refine the same-scene difficulty/save menu states and portrait/landscape/desktop composition using mockups. Do not select save-slot policy, buy assets, add control rows or implement UI during this comparison.
