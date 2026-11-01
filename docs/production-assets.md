# Production UI assets and theme decisions

Reviewed 2026-10-31. This record describes the fresh production UI, independently obtained assets and its remaining limits.

Latest isolated theme delivery is described in [optional theme UI fonts and baked wordmarks](#optional-theme-ui-fonts-and-baked-wordmarks). It supersedes the original font-delivery details below; original binaries remain source/provenance inputs only.

## Agreed implementation

The lead approved a single typed Pond preset and explicit semantic CSS mapping in `src/lib/theme/pond.ts`. It owns presentation inputs, not layout, navigation, locale, puzzle identity or saved state. The app applies `themeStyle()` at its outer boundary. Components consume named roles. Appearance remains independent of the `pond` identity; this phase supplies no alternate appearance or settings interface.

The preset centralizes water, ground, leaf/default/selected/focus, controls/disabled/focus, fonts/type scale/weight/line height, the 4px/8px spacing scale, surfaces, geometry budgets, motion, layers, dialogs and transitions. Shore bank/amplitude values are nominal shape dimensions; the renderer must clamp them to actual free corridors. The protected opaque leaf radius is 0.36 of its anchor diameter. The shape module must preserve that disk and verify full number/note boxes, not just glyph centers. These presentation tokens do not change the board allocation or hitboxes.

Alternatives challenged: a general token/plugin framework adds no current value, so the CSS mapping is explicit; converting fonts to WOFF2 adds tooling and derived payloads for about 152KB of original TTF data, so original upstream files are retained. WOFF2 remains a possible later delivery optimization. No new palette, theme or art experiment was introduced.

## Fonts and licenses

Downloaded directly from [Google Fonts](https://github.com/google/fonts/tree/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec) at revision `6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec`, without importing/copying prototype assets. Binary files and license notices are preserved unchanged in `src/assets/fonts/`.

| Local file | Pinned upstream path | SHA-256 |
| --- | --- | --- |
| `Outfit.ttf` | [ofl/outfit/Outfit[wght].ttf](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/outfit/Outfit%5Bwght%5D.ttf) | `fc7287273e66929776e2ba54f144fe699080bec29f61bf649d70d871468aeade` |
| `Outfit-OFL.txt` | [ofl/outfit/OFL.txt](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/outfit/OFL.txt) | `c676351bf8576b9aba743cd5eaa8c0e7ee0d51f805d720447b4df4ddb6a2e416` |
| `Chewy-Regular.ttf` | [apache/chewy/Chewy-Regular.ttf](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/apache/chewy/Chewy-Regular.ttf) | `7cf75ea288f82fd20badea8ab4da7a656a96a7277c170811e813b3d3d6294147` |
| `Chewy-LICENSE.txt` | [apache/chewy/LICENSE.txt](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/apache/chewy/LICENSE.txt) | `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30` |

Outfit is by Smartsheet Inc and Rodrigo Fuenzalida, copyright 2021 The Outfit Project Authors, licensed under SIL OFL 1.1. Its upstream metadata identifies [Outfitio/Outfit-Fonts](https://github.com/Outfitio/Outfit-Fonts) source revision `902773808eb372f70fb34e8946dd1ffe604efc79`. Outfit supplies UI/digits/notes and supports the 100-900 weight axis, Latin and Latin Extended.

Chewy is by Sideshow, copyright 2010 Font Diner, Inc DBA Sideshow, licensed under Apache 2.0. Its upstream metadata identifies [googlefonts/chewy](https://github.com/googlefonts/chewy) source revision `5e436e35405525b4f3b5d808dc6f809ed1edb093`. It is used only for the title. UI and digits retain Outfit. Both fonts have system fallbacks.

`src/lib/theme/fonts.css` uses relative URLs handled by Vite, with local files, explicit weight ranges and `font-display: swap`. Production has no external font requests. Retain both license notices with any redistribution; the production asset audit must check the output distribution notices as well as the repository.

The build copies both original font notices to `dist/licenses/` and uses Vite's [bundled dependency license manifest](https://vite.dev/config/build-options#build-license) at `dist/licenses/dependencies.json`. This retains the notices for bundled runtime packages such as Svelte and clsx, independently of the font licenses. Build-time tooling is locked in `package-lock.json` and is not served as application dependencies.

## Contrast evidence and limits

Relative luminance calculations follow [WCAG 2.2 contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), with active normal text threshold 4.5:1. Unrounded values are tested by `tests/theme.test.ts`.

| Pair | Ratio |
| --- | --- |
| Control ink on cream | 10.737:1 |
| Leaf ink on default face | 9.390:1 |
| Leaf ink on selected face | 10.323:1 |
| Dialog ink on dry ground | 5.757:1 |
| Disabled ink on disabled face | 1.933:1 |

The disabled palette is reserved for genuinely inactive native controls. It uses WCAG's inactive-component exception; it must never become active copy without a new contrast review. Cream focus beads alone contrast weakly on pale leaves, so their dark edge role is essential. Active focus and selection must also have shape/position cues, not color alone.

Water deep/middle, middle/shallow and deep/shallow contrast ratios are 2.171:1, 1.821:1 and 3.952:1. The palette alone does not establish 3:1 region boundaries for every pair. Inward leaf grouping, fixed 8px group gaps and logical accessible names remain important, and grayscale/color-vision readability needs integrated review. Selected colors are preserved rather than silently redesigned.

Cream title contrast on deep/middle/shallow water is 6.525:1, 3.006:1 and 1.651:1 respectively. The production menu therefore keeps its fixed title rectangle plus the full 1.8px float envelope clear of shallow water and shore. This preserves the selected cream Chewy lettering without extra water colors or an outline. Middle water barely meets the large-text 3:1 threshold; raster and device legibility still require review.

Color contrast does not prove tiny nine-note optical readability. The note scale records 4.5px as a descriptive small-size reference, not a forced minimum. The specimen's actual glyph size is capped proportionally at 0.165 of the leaf anchor diameter, preserving complete glyph boxes inside the protected disk. That is about 4.62px at a 28px anchor and 5.57px at a 33.77px anchor. These tiny specimens are not final typography approval. Hardware, text scaling and final solving-state typography remain later validation work.

## Artwork boundary

On 2026-10-31 the user explicitly requested restoring the current rough frog-plus-lily-pad sketch or creating an equally provisional sketch, including the built UI and a commit. This supersedes the earlier neutral-text-only handoff for this one placeholder.

`src/assets/menu-sketch.png` is an unchanged copy of the existing `prototypes/pond-visual-v1/public/menu-placeholder.png`: 1254x1254 transparent PNG, SHA-256 `b4c53b629017faa5f57c9a72d3cb80d182268dd729b93e842ddd6be229ffedf1`. It is the project's AI-generated development sketch, not human-made final art or a newly acquired licensed illustration. Its scribbles, question mark and TEMP label are preserved. The original prototype file is unchanged.

The image is imported from tracked assets with Vite-managed paths, never through a runtime prototype import. It uses the existing fixed title/art geometry and shared float, full-slot `object-fit: contain`, intrinsic square dimensions and localized alt text. It appears only in the menu. The build audit permits exactly this image/hash and continues to reject other artwork or prototype imports.

This explicit temporary exception does not approve AI illustrations as final production art. Replace the sketch with approved human-made art and documented rights before final artwork acceptance. Other AI mockups remain ignored reference material.

## Primary technical references

- [Google Fonts Outfit metadata](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/outfit/METADATA.pb) and [Chewy metadata](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/apache/chewy/METADATA.pb): authorship, supported fonts and source revisions.
- [MDN font-face](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face): local CSS font sources, variable weight descriptors, fallback/display behavior.
- [W3C WCAG 2.2 contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): luminance contrast, normal text thresholds and inactive-control exception.

Module acceptance still requires the lead's review and integrated browser evidence; unit checks alone cannot establish visual fidelity, focus discovery, localization fit or final typography.

## Isolated Cauldron font addition

On branch `codex/themes`, Creepster is used only for the Cauldron title. Outfit remains UI/digits and Chewy remains the Pond title. Creepster by Sideshow is obtained unchanged from [Google Fonts at revision 50f8ff96f9de584858108a44a7b3dd4065dce11f](https://github.com/google/fonts/tree/50f8ff96f9de584858108a44a7b3dd4065dce11f/ofl/creepster), with SIL OFL 1.1 notice retained in source and `dist/licenses/`. The font and its title metrics are reviewed separately from the preserved application logo/sketch. Title fonts are explicit lazy FontFace URL resources; shared Outfit remains in `fonts.css`.

| File | SHA-256 |
| --- | --- |
| `Creepster-Regular.ttf` | `402aeb734586c74aecd3dbdc454589b1fb12e2e1c71f782fd019ae68066d9f44` |
| `Creepster-OFL.txt` | `c09e3b81d9cfeec46bc29a3374000e8ad013d694bdf24a288088491dd4cd5c69` |

No museum photograph, new bitmap illustration or ImageGen output is shipped. Potion medallions/vessel are reviewed code-native control/background geometry. The temporary menu sketch is unchanged. Isolated implementation evidence and limitations are recorded in [theme progress](theme-progress.md).

## Optional theme UI fonts and baked wordmarks

The latest user-directed typography task supersedes the global-UI-family and downloaded-title-font delivery described above. Pond uses one optional Baloo 2-derived roman UI font; Cauldron uses one optional Fraunces-derived roman UI font. This pair supersedes the initial Nunito/Bitter derivatives after the user's request for more playful typography and the application/raster review. Themes without a UI font use the reviewed system stack. Solving numerals remain the same Outfit glyphs, delivered as a shared digits-only WOFF2. The existing Chewy/Creepster wordmarks are outlined into lazy theme path data, so no title font is downloaded or registered. The original Outfit/Chewy/Creepster TTF files remain unmodified source/provenance inputs and are not production imports.

Source UI font files and licenses were obtained directly from Google Fonts revision `6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec`. Baloo 2 is copyright 2019 The Baloo 2 Project Authors, with [EkType project source](https://github.com/EkType/Baloo2); Google Fonts metadata identifies the [variable-font build source](https://github.com/yanone/Baloo2-Variable) revision `da523dfa21aa0e376253d61c21e39146dc55702a`. Fraunces is copyright 2018 The Fraunces Project Authors, with [source project](https://github.com/undercasetype/Fraunces) revision `d6d385783609ceb11ac0f220f3abd9f1631c8a36`. Both are SIL OFL 1.1. Their original notices are retained unchanged and included in the distribution notices.

| Pinned upstream input | SHA-256 |
| --- | --- |
| [ofl/baloo2/Baloo2[wght].ttf](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/baloo2/Baloo2%5Bwght%5D.ttf) | `d47a6852548059b1db49a1319d06d499d546c3fa2237cf9eee9c43c8abb025c2` |
| [ofl/baloo2/OFL.txt](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/baloo2/OFL.txt) | `ad09b05dc8bc678c9daf7c4c5f7ef1f55e5726127f4330b2e98e40b9dffcb860` |
| [ofl/fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf) | `177ff6c0f14e5550a3c624247cd1189611d4eb65d000b14944c63d967958abbb` |
| [ofl/fraunces/OFL.txt](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/fraunces/OFL.txt) | `bdf4c22802eaf804f998195871c6b8938aac2ac14b2d78a8bd66a6f1eced833b` |

Derived UI fonts preserve the supported English, German and Spanish alphabets in NFC and decomposed NFD, including `ẞ`, plus current copy symbols and Euro. They preserve genuine weights 400 through 700 and normal shaping/kerning/numeric features, with unused language glyphs and discretionary stylistic sets omitted. Fraunces fixes optical size `opsz=9`, softness `SOFT=50` and `WONK=0` for the reviewed small-text appearance. Both derivatives expose only their 400 through 700 weight axis. Restricting the variable axis introduces at most two source-unit positioning differences in the checked corpus, under 0.05px per glyph at 22px. Fraunces sampled contours match the source at those fixed axes, within 1.220 of 2,000 source units from instancing rounding. This requires real application label-fit checks, not a claim that the source font's general reading purpose proves every compact UI state readable.

All three derived font families are conservatively renamed, even where no Reserved Font Name is declared in the source header: `ToadokuPondUI`, `ToadokuCauldronUI` and `ToadokuSolving`. Their original copyright/license metadata is preserved. This follows the [OFL modification/RFN guidance](https://openfontlicense.org/ofl-faq/). Font outlines used in a logo/graphic are explicitly permitted by OFL FAQ 1.1 and 1.1.1; Creepster's reserved font name does not prohibit the outlined wordmark artwork. Chewy retains its Apache 2.0 notice and source link. None of the generated outlines are AI illustrations or newly designed replacement mascot artwork.

| Production derivative | Family / role | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `Baloo2-UI.woff2` | `ToadokuPondUI`, optional Pond UI | 31,620 | `7dd1e14afb82d04391029fe14c89610a104c4a6d7d60cf044f066a5b8cefc606` |
| `Fraunces-UI.woff2` | `ToadokuCauldronUI`, optional Cauldron UI | 34,276 | `ea65187915d697aec1579b38c6117e750833c9ba24e6c7c1e2eb39cf3dbe477f` |
| `Outfit-Solving.woff2` | `ToadokuSolving`, shared exact solving glyphs | 4,616 | `94521752365c23a599f084d01f8e21fa9f8ac0b120607f55f3cd9cf60e00d564` |
| `src/lib/theme/wordmarks/pond.ts` | Chewy-derived `Toadoku` outlines and metrics | 6,386 | `ee6f578c2ea3a38396f9ab785d24a486b5bbabd661d89c985ddc460000cd077b` |
| `src/lib/theme/wordmarks/cauldron.ts` | Creepster-derived `Toadoku` outlines and metrics | 9,445 | `24273a1d2115e68d0ead13b71b3a4afde60ab7dc2060bc0f92c02f9d8b889981` |

The solving subset maps only space, `0123456789` and `!`, preserving the entire original 100 through 900 weight axis. The generator checks exact contours, advance widths and glyph hinting against original Outfit at six representative weights. Future alphabetic labels must use the theme UI/system family, not this numeric subset. Its normal system fallback remains available for an unexpected character.

HarfBuzz shapes the seven-letter mixed-case wordmark before FontTools extracts outlines, preserving kerning. The generated contract includes y-flipped paths, natural em bounds, advance width, units per em, ascent/descent and overhang-aware viewBox dimensions. The renderer can retain the existing natural glyph scale, shared title envelope and accessible heading, while applying theme ink via `currentColor`.

The reproducible [asset generator](../tools/theme-font-assets.py) and [measured alternatives](research/theme-font-asset-comparison.md) document dependencies, pinned input verification and `--check`. Two consecutive check runs produced identical production bytes. Word-only WOFF2 was smaller than outlined SVG in isolation, but would retain a second theme font download. Outlined wordmarks plus bounded UI/solving subsets reduce the compared combined asset payload by about 52%/54% under gzip for Pond/Cauldron and about 46%/47% under Brotli. These are isolated asset sums, not whole-app HTTP transfer guarantees. Raster and word-only-font alternatives remain ignored evidence; only the reviewed WOFF2 and vector data are integrated.
