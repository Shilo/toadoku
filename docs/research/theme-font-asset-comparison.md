# Theme font delivery and baked wordmarks

Reviewed 2026-10-31 for the isolated `codex/themes` implementation. This is an asset-format decision and provenance record, not acceptance of phone hardware readability or gameplay integration.

## Decision and challenge

Use one optional roman UI font per theme: a Baloo 2-derived subset for Pond and a Fraunces-derived subset for Cauldron. Both retain genuine weights 400 through 700, English/German/Spanish alphabets, combining marks and current UI punctuation. Fraunces fixes `opsz=9`, `SOFT=50` and `WONK=0`; only weight remains variable. Keep a small, shared Outfit-derived solving font for digits, manual notes, numeric keys and the conflict exclamation mark. Bake the existing mixed-case `Toadoku` lettering into outlined SVG path data bundled with each lazy theme module. The Pond/Cauldron wordmarks preserve their Chewy/Creepster shapes and HarfBuzz kerning; the parent heading supplies accessible text and the renderer supplies `currentColor`.

The lead challenged the initial broad Latin/Latin Extended subset: it produced 47,240-byte Nunito and 73,744-byte Bitter payloads, including many glyphs outside the three supported languages. Merely replacing full title fonts while adding those UI fonts could increase compressed first-visit cost. The accepted narrower language set and a solving-only Outfit subset materially reduce total delivery. No controls, board glyph shapes or gameplay targets are resized to compensate for a font.

The later playful-font challenge replaced the initial Nunito/Bitter UI pair after actual application previews and independent raster review. Baloo 2 brings rounded, friendly Pond lettering; Fraunces adds a storybook Cauldron identity. [Fraunces axis documentation](https://github.com/undercasetype/Fraunces#axis-definitions) explains that small optical sizes increase x-height and spacing, and wonky substitutions are disabled at optical sizes 18 and below. The small-text `opsz=9` instance and explicit `WONK=0` retain that stable behavior; `SOFT=50` supplies moderate softness. Font style alone does not prove readability: the application's smallest badges, localized labels and dialogs still need raster review.

| Challenged candidate | Outcome |
| --- | --- |
| Fredoka, width 100 | Rejected: the pinned face lacks capital German sharp S `ẞ`, despite passing real-weight checks. |
| Grenze | Language and weight gates pass, but its apparent body reads smaller than the initial Bitter choice; compact-label comfort favored Fraunces. |
| Bree Serif | Rejected for this contract: the reviewed roman source provides only weight 400. |
| Baloo 2 and Fraunces | Accepted after language, genuine-weight, application fit and independent raster checks. |

These auditions remain ignored evidence under `prototypes/font-audition/`; only the accepted derivatives enter production. The playful pair adds 456 raw bytes for Pond and saves 56 raw bytes for Cauldron relative to the narrower initial Nunito/Bitter pair, so identity does not require a material payload increase.

The parent and independent theme reviewer challenged the wordmark alternatives before integration. A word-only WOFF2 is the smallest isolated byte payload, but it would still be a second font resource for seven fixed letters. Outlined SVG adds about 0.6KB to 1.5KB under Brotli compared with that minimal webfont, removes the title-font registration/loading path, supports inherited colors and scales at every DPR. It is much smaller than the full title fonts and high-DPR PNGs. This is the chosen practical tradeoff, not a claim that SVG is universally smaller than WOFF2.

## Measured alternatives

Sizes are bytes. Gzip uses level 9 with a fixed timestamp; Brotli uses quality 11. WOFF2/PNG already contain compression, so HTTP encoding can add a small wrapper overhead. Measurements use the actual tracked fonts and the seven-letter word `Toadoku`, not a generic logo-size estimate.

| Pond title representation | Raw | Gzip | Brotli |
| --- | ---: | ---: | ---: |
| Existing full Chewy TTF | 41,248 | 25,211 | 23,130 |
| Full Chewy WOFF2 | 21,152 | 21,180 | 21,154 |
| Word-only Chewy WOFF2 | 1,624 | 1,647 | 1,628 |
| Outlined SVG | 6,152 | 2,752 | 2,210 |
| Actual outlined TypeScript module, including metrics | 6,386 | 2,946 | 2,372 |
| Transparent PNG at approximately 55px em, DPR1 | 3,315 | 3,338 | 3,319 |
| Same raster at DPR3 | 10,986 | 10,781 | 10,792 |

| Cauldron title representation | Raw | Gzip | Brotli |
| --- | ---: | ---: | ---: |
| Existing full Creepster TTF | 62,724 | 37,831 | 32,404 |
| Full Creepster WOFF2 | 29,780 | 29,714 | 29,642 |
| Word-only Creepster WOFF2 | 1,648 | 1,671 | 1,652 |
| Outlined SVG | 9,195 | 4,106 | 3,184 |
| Actual outlined TypeScript module, including metrics | 9,445 | 4,323 | 3,307 |
| Transparent PNG at approximately 55px em, DPR1 | 3,572 | 3,595 | 3,576 |
| Same raster at DPR3 | 11,553 | 11,366 | 11,381 |

PNG is sampled at one size/color. Enlarging it needs another raster density; recoloring it needs another image or a mask. SVG keeps the title vector-based and tintable. The script shapes text before outlining and rounds path coordinates to 0.1 source units, under 0.006px at the measured em size. It preserves negative left overhang, full advance width and natural em-relative ink scale rather than stretching tight glyph bounds to the title container.

## Fair combined asset comparison

These totals compare the old shared Outfit TTF plus selected full title TTF against the new shared solving subset plus selected UI subset plus the outlined TypeScript module. They exclude unrelated application code and artwork and are not a claim about exact final HTTP transfer size. The final Vite theme chunk includes the wordmark rather than requesting a separate SVG file; bundling/minification and server encoding determine its actual incremental transfer size.

| Asset combination | Raw | Gzip | Brotli |
| --- | ---: | ---: | ---: |
| Previous Pond: Outfit TTF + Chewy TTF | 152,132 | 81,303 | 71,111 |
| New Pond: solving WOFF2 + Baloo 2 WOFF2 + outlined module | 42,622 | 39,233 | 38,606 |
| Previous Cauldron: Outfit TTF + Creepster TTF | 173,608 | 93,923 | 80,385 |
| New Cauldron: solving WOFF2 + Fraunces WOFF2 + outlined module | 48,337 | 43,271 | 42,207 |

The new combinations are about 52% and 54% smaller under gzip, and about 46% and 47% smaller under Brotli, while adding distinct theme UI typography. Switching themes can reuse the shared 4,616-byte solving font. The final UI files are 31,620 bytes for Baloo 2 and 34,276 bytes for Fraunces. UI fonts remain lazy and optional; a theme without one uses the reviewed system stack and incurs no UI webfont request. The original source TTFs remain for regeneration/provenance but must not be imported into the production bundle.

## Language, glyph and shaping checks

The UI font set contains Latin-1, capital sharp S U+1E9E, combining marks U+0300 through U+036F, general punctuation, Euro U+20AC and every presently authored source-copy codepoint supported by the source face. This includes `ÄÖÜäöüẞßÑñÁÉÍÓÚáéíóúÜü¿¡€`. Rare symbols missing from a source font retain the normal system fallback. This is a bounded EN/DE/ES subset, not a claim to support arbitrary future languages.

The generator checks NFC and decomposed NFD character coverage. HarfBuzz checks an EN/DE/ES corpus at weights 400, 500, 600 and 700, retaining the same shaped glyph counts and default kerning/mark behavior. Restricting the source variable axis normalizes intermediate positions with at most two source-unit differences, below 0.05px per glyph at the 22px UI cap. Actual label fit and perceived readability still require the application's browser/font review.

The generator also verifies that the final font exposes only the 400 through 700 weight axis and that `a` has distinct outlines at all four used weights. For Fraunces, a shaped contour comparison against the original four-axis font at the exact reviewed pins verifies sampled contour topology at those weights. Maximum coordinate rounding is 1.220 of 2,000 units per em, below 0.014px at 22px. These are corpus and sampled-weight proofs, not a claim of full-font equivalence at every possible interpolated value.

The Outfit solving subset retains the entire original 100 through 900 weight axis and the exact contours, advances and glyph hinting for space, `0123456789` and `!`. The generator compares them at weights 100, 400, 500, 600, 700 and 900. This preserves the existing solving glyphs rather than replacing them with seasonal numerals. Standard shaping, kerning and tabular/lining/proportional numeric features are retained when supported by the source; unused discretionary stylistic sets are omitted from UI subsets.

## Reproduction

The tracked generator is [theme-font-assets.py](../../tools/theme-font-assets.py). It fetches immutable, SHA-256-checked originals into ignored `prototypes/theme-font-sources/`, derives production assets, and writes alternative representations and byte measurements into ignored `prototypes/theme-font-measurements/`.

Use a project-local Python 3.13 environment, with these pinned build-only packages: `fonttools[woff]==4.60.1`, `brotli==1.1.0`, `uharfbuzz==0.52.0`, `pillow==11.3.0` and its `zopfli==0.4.3` dependency. Nothing is added to application dependencies or global Python packages. Example for the Windows checkout:

```powershell
uv venv prototypes/theme-font-tooling --python 3.13
uv pip install --python prototypes/theme-font-tooling/Scripts/python.exe 'fonttools[woff]==4.60.1' 'brotli==1.1.0' 'uharfbuzz==0.52.0' 'pillow==11.3.0' 'zopfli==0.4.3'
prototypes/theme-font-tooling/Scripts/python.exe -B tools/theme-font-assets.py --check
```

Omit `--check` to regenerate production assets. With `--check`, production bytes are compared without rewriting them; the glyph/language/shaping checks still run and ignored measurements may refresh. Two consecutive check runs produced byte-identical fonts and wordmark modules. Preserve the source revision, notices and generated-family renaming described in [asset provenance](../production-assets.md#optional-theme-ui-fonts-and-baked-wordmarks).

Primary references: [FontTools subsetter](https://fonttools.readthedocs.io/en/latest/subset/index.html), [variable-font instancing](https://fonttools.readthedocs.io/en/latest/varLib/instancer.html), [HarfBuzz shaping bindings](https://github.com/harfbuzz/uharfbuzz), [OFL logo/outlining FAQ](https://openfontlicense.org/ofl-faq/), [Baloo 2 source](https://github.com/EkType/Baloo2), [Fraunces source](https://github.com/undercasetype/Fraunces). Raster files and derived word-only fonts are comparison evidence, not approved production assets.
