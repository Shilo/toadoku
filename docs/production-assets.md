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

The latest user-directed typography supersedes earlier global-UI-family, downloaded-title-font, Baloo 2/Fraunces and temporary themed-grid choices. Pond uses one optional Almendra-derived UI family with native regular 400 and bold 700 faces. Cauldron uses one optional Germania One-derived regular 400 family, with honestly audited native browser bold synthesis. Themes without a UI font use the readable system stack. Theme families supply UI and bottom/right dock numerals. All grid digits, notes and the enlarged cell editor use shared Outfit, as explicitly restored by the user for solving-critical readability. The Outfit subset and Chewy/Creepster baked wordmark modules remain byte-identical through these changes. Original full TTFs remain unmodified provenance/regeneration inputs, not production imports. Every future theme must bake its own title using the [title-authoring recipe](theme-authoring.md#bake-a-title-for-every-future-theme).

Source UI fonts and licenses are pinned directly to Google Fonts revision `6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec`. Almendra is copyright 2011-2012 Ana Sanfelippo, with Reserved Font Name `Almendra`. Germania One is copyright 2011 John Vargas Beltrán, with Reserved Font Name `Germania`. Both are SIL OFL 1.1. Original notices remain byte-identical in the source tree and distribution notices; full decorative source TTFs remain ignored regeneration cache inputs.

| Pinned upstream input | SHA-256 |
| --- | --- |
| [ofl/almendra/Almendra-Regular.ttf](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/almendra/Almendra-Regular.ttf) | `b127a6121209353b53da9ce73bf9d350f74190d8384c28ede179e4fb9440f946` |
| [ofl/almendra/Almendra-Bold.ttf](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/almendra/Almendra-Bold.ttf) | `5895ef04d0d56c60083ec302e72db99b952b044ab2b440ee12283649b5edc971` |
| [ofl/almendra/OFL.txt](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/almendra/OFL.txt) | `b7eae5e3c3447f70caa14e0c43f5e0d953f54ee59df406f6362863bcee1a0a95` |
| [ofl/germaniaone/GermaniaOne-Regular.ttf](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/germaniaone/GermaniaOne-Regular.ttf) | `3ee3d56584bab8c9e3f59cc3360aa8a36e219dcf0a9f3c8928e3da5a19277e3f` |
| [ofl/germaniaone/OFL.txt](https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/germaniaone/OFL.txt) | `b7574cd4c76770e5e3915d16bd93f09663bd77cb041a4ec09d824c52b540529a` |

Both derivative families support the English/German/Spanish language corpus in NFC and decomposed NFD, including accents, `ß`, Spanish punctuation and Euro. Capital `ẞ` is the explicit human-approved exception, rendered by the system fallback because the original decorative faces lack it. Missing standalone combining-mark cmap entries are accepted only when actual NFD text shapes without `.notdef`; no accent glyph is silently invented or removed. All source-supported requested copy symbols and normal shaping/kerning/numeric features are retained. The generator includes `0123456789`, all nine notes together and each digit separately in its shaping corpus. The separate application review determines readable numeral roles; source coverage alone does not establish small-note readability.

Derived family names are `ToadokuPondUI`, `ToadokuCauldronUI` and the unchanged `ToadokuSolving`. Almendra regular/bold share family IDs but retain distinct style, full, PostScript and unique names with genuine 400/700 metadata. Germania One retains genuine regular 400 metadata. Neither profile invents an axis or claims genuine intermediate weights. Almendra has no `lnum` alternate; its themed-grid audition and temporary baseline correction are historical, superseded by shared Outfit. Source outlines remain unchanged. Original copyright/license metadata is preserved, complying with [OFL modification/RFN guidance](https://openfontlicense.org/ofl-faq/). OFL FAQ 1.1/1.1.1 permit outlined logo lettering; Creepster's reserved font name does not prohibit its outlined wordmark graphic. Chewy retains its Apache 2.0 notice and source link. These outlines are licensed font derivatives, not AI illustrations or replacement mascot artwork.

| Production derivative | Family / role | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `Almendra-UI-Regular.woff2` | `ToadokuPondUI`, Pond regular 400 | 12,188 | `aba7222a1f2a33dfea57e6cbcbbfd6f419d12e9e9928b230cc21d6df74c393c1` |
| `Almendra-UI-Bold.woff2` | `ToadokuPondUI`, Pond bold 700 | 11,500 | `44b897ad02022672bb9f378c8f433808d6a9d43b588c6395d2de591ee203d3f3` |
| `GermaniaOne-UI.woff2` | `ToadokuCauldronUI`, Cauldron regular 400 | 9,124 | `f5330179ba66616e96494fe6b52336e8abc9dc8cffebf43c4f7ca330afc9e8dc` |
| `Outfit-Solving.woff2` | `ToadokuSolving`, preserved shared solving glyphs | 4,616 | `94521752365c23a599f084d01f8e21fa9f8ac0b120607f55f3cd9cf60e00d564` |
| `src/lib/theme/wordmarks/pond.ts` | Chewy-derived `Toadoku` outlines and metrics | 6,386 | `ee6f578c2ea3a38396f9ab785d24a486b5bbabd661d89c985ddc460000cd077b` |
| `src/lib/theme/wordmarks/cauldron.ts` | Creepster-derived `Toadoku` outlines and metrics | 9,445 | `24273a1d2115e68d0ead13b71b3a4afde60ab7dc2060bc0f92c02f9d8b889981` |

HarfBuzz checks each static derivative against its original source for exact shaped glyph names and positions in the bounded language/numeral corpus, and identical NFC/NFD output with no missing shaped glyphs excluding `ẞ`. Every retained glyph except `.notdef` has exact decomposed contours, advance widths and per-glyph TrueType hint programs: 219 Almendra regular, 207 Almendra bold and 205 Germania One glyphs. These checks do not prove all possible text sequences, global TrueType interpreter behavior or physical-phone readability. Real localized application and small-note raster review remains necessary.

The preserved shared subset maps only space, `0123456789` and `!`, retaining the original 100 through 900 axis; it supplies grid digits, notes and the enlarged cell editor under the final shared-grid policy. Its generator checks exact contours, advances and glyph hint programs against original Outfit at six representative weights. HarfBuzz shapes each seven-letter mixed-case wordmark before outlining; the generated SVG contract preserves kerning, y-flipped paths, natural em bounds and overhang-aware viewBox dimensions, with an accessible heading supplied by the renderer.

The reproducible [asset generator](../tools/theme-font-assets.py) and [measured alternatives](research/theme-font-asset-comparison.md) record pinned dependencies, immutable source/hash verification, per-face payloads and `--check`. Two consecutive checks produced identical production bytes. Both Pond faces total 23,688 raw bytes; Cauldron needs 9,124 raw bytes. Conservatively including the unchanged shared solving asset plus the selected baked wordmark, the compared combinations save about 61%/81% under gzip for Pond/Cauldron and 57%/79% under Brotli versus the original full Outfit/title TTFs. These are isolated asset sums, not exact whole-app transfer guarantees. Word-only WOFF2 is smaller than outlined SVG alone but would retain an extra title-font resource. Comparison rasters and full decorative TTFs remain ignored evidence.
