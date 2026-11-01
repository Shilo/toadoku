# Theme font delivery and baked wordmarks

Reviewed 2026-11-01 for the isolated `codex/themes` implementation. This is an asset-format decision and provenance record, not acceptance of phone hardware readability or gameplay integration.

## Decision and challenge

The user approved one optional decorative UI family per theme: Almendra-derived Pond with genuine regular 400 and bold 700 faces, and Germania One-derived Cauldron with its genuine regular 400 face. These are static fonts, not invented 400 through 700 variable ranges. Browser-native emphasis for Germania One is an explicit design choice that requires application raster review. A theme without a UI family uses the readable system stack. The original Chewy/Creepster mixed-case `Toadoku` shapes remain baked into outlined SVG path data bundled with each lazy theme module, preserving HarfBuzz kerning, an accessible parent heading and inherited `currentColor`.

This reopens the earlier Baloo 2/Fraunces choice after the user requested stronger decorative identity. The lead and independent reviewer challenged the revised plan before production edits: retaining source weight/style metadata, sharing only family IDs between Almendra faces, using distinct Regular/Bold full/PostScript/unique names, and proving glyph identity, positions, contours and hint programs. English, German and Spanish NFC/NFD text must actually shape without `.notdef`. Capital German sharp S `ẞ` is the sole approved language exception, rendered by the normal system fallback because these original faces lack it. Absence of separate combining-mark cmap entries is not itself a failure when the decomposed text correctly recomposes during shaping.

Historical challenges remain useful for future theme authors. Broad Latin/Latin Extended Nunito/Bitter subsets cost 47,240/73,744 bytes and could increase compressed first-visit cost. Bounded language subsets and removal of full title-font downloads addressed that problem. The intermediate Baloo 2/Fraunces pair passed genuine-weight/language/application checks but the user wanted more decorative typography. Fredoka was initially rejected for missing `ẞ`; the later explicit fallback approval supersedes that earlier strict-glyph policy for the selected decorative pair. Grenze read smaller in compact labels; Bree Serif supplied only a regular face under the earlier four-weight contract. These are contextual decisions, not universal font-quality judgments.

The selected static fonts retain English/German/Spanish accented text and all source-supported current copy symbols. The generator also checks `0123456789`, all nine notes together and each numeral separately. Accepted numeral roles use each theme family for grid digits, numeric dock keys, the enlarged editor and its 24px notes. Only tiny in-board notes retain shared Outfit: both decorative families lost recognition at the actual 4.84px/5.57px note sizes in the 320px/360px checks. Shared Outfit asset bytes and baked wordmark bytes remain unchanged. Almendra has no lining-number feature. Matched clipped/unclipped probes identified a lower-tip clipping failure for its old-style `7`; the tested original `3` already matched. The reviewed renderer correction uses one shared font-specific baseline lift within the existing paint box, only after successful theme-font loading; system fallback retains zero shift. This preserves the source figures and their relative baseline relationships without per-digit recentering, enlarged paint targets or reshaped font assets. No source glyph shape, control target or board geometry is resized by the generator.

Auditions and full decorative source TTFs remain ignored under `prototypes/decorative-font-research/`. Only the reviewed renamed WOFF2 derivatives and notices enter production. Pond needs both native faces, so its fair cold-font comparison counts their combined cost rather than comparing a single static face against a variable font.

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
| Intermediate Pond: solving WOFF2 + Baloo 2 WOFF2 + outlined module | 42,622 | 39,233 | 38,606 |
| Decorative Pond: solving WOFF2 + both Almendra WOFF2 faces + outlined module | 34,690 | 31,319 | 30,686 |
| Previous Cauldron: Outfit TTF + Creepster TTF | 173,608 | 93,923 | 80,385 |
| Intermediate Cauldron: solving WOFF2 + Fraunces WOFF2 + outlined module | 48,337 | 43,271 | 42,207 |
| Decorative Cauldron: solving WOFF2 + Germania One WOFF2 + outlined module | 23,185 | 18,109 | 17,055 |

The conservative decorative combinations include the unchanged 4,616-byte shared solving font. Against the original TTF combinations they are about 61%/81% smaller under gzip for Pond/Cauldron and 57%/79% smaller under Brotli. Against the immediately preceding Baloo 2/Fraunces combinations they also save bytes, despite counting both Almendra faces. These are bounded asset sums, not exact whole-application transfer guarantees or a claim about which faces the browser requests on every screen.

| UI face only | Raw | Gzip | Brotli |
| --- | ---: | ---: | ---: |
| Almendra regular 400 | 12,188 | 12,211 | 12,190 |
| Almendra bold 700 | 11,500 | 11,523 | 11,504 |
| Pond UI, both native faces | 23,688 | 23,734 | 23,694 |
| Germania One regular 400 | 9,124 | 9,147 | 9,128 |
| Both themes, all three UI faces | 32,812 | 32,881 | 32,822 |

UI families remain lazy and optional. A theme without one incurs no UI webfont request. The original Outfit/Chewy/Creepster source TTFs remain for regeneration/provenance but must not be imported into the production bundle.

## Language, glyph and shaping checks

The requested subset contains Latin-1, combining marks U+0300 through U+036F, general punctuation, Euro U+20AC and every presently authored source-copy codepoint supported by the original face. All source-supported requested codepoints must remain after subsetting. Required accented text includes `ÄÖÜäöüßÑñÁÉÍÓÚáéíóúÜü¿¡€`. Capital `ẞ` intentionally falls back to the system font; unsupported incidental symbols also retain normal CSS fallback. This is bounded English/German/Spanish support, not arbitrary future-language coverage.

The generator checks actual NFC and decomposed NFD shaping with HarfBuzz, requiring zero `.notdef` glyphs in the language/numeral corpus excluding only `ẞ`. All three output faces produce identical NFC/NFD shaped sequences. Compared with each original static face, glyph names and advances/offsets match exactly. This avoids mistaking an absent raw combining-mark cmap entry for a failed accent sequence, or accepting the same glyph count with a wrong substitution.

Every retained glyph except the non-language `.notdef` placeholder is checked for exact decomposed contour geometry, advance width and per-glyph TrueType hint programs: 219 glyphs for Almendra regular, 207 for Almendra bold and 205 for Germania One. Source weight/style flags remain unchanged, no variable axis appears, and the two Almendra `a` outlines are genuinely distinct. These are retained-glyph and bounded shaping checks; they do not prove every possible text sequence, global interpreter state or perceived tiny-text readability. Real application localized-label, emphasis, nine-note and fallback review remains necessary. The accepted tiny-note fallback is a role decision, not a claim that all decorative numerals fail at larger sizes.

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

Primary references: [FontTools subsetter](https://fonttools.readthedocs.io/en/latest/subset/index.html), [variable-font instancing](https://fonttools.readthedocs.io/en/latest/varLib/instancer.html), [HarfBuzz shaping bindings](https://github.com/harfbuzz/uharfbuzz), [OFL logo/outlining FAQ](https://openfontlicense.org/ofl-faq/), [Almendra pinned source](https://github.com/google/fonts/tree/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/almendra), [Germania One pinned source](https://github.com/google/fonts/tree/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/germaniaone). Raster files and derived word-only fonts are comparison evidence, not approved production assets.
