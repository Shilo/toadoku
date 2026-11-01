# Decorative theme font readability audition

Reviewed 2026-11-01 on isolated `codex/themes`. The initial audition preceded acceptance. The user approved Almendra Pond and Germania One Cauldron, tried themed numbers, then explicitly restored shared Outfit for the grid while retaining themed dock keys. The final decision below governs. Historical candidate scores are expert raster judgments, not measured human reading speed.

## Final shared-grid decision

The user requested a checkpoint commit before changing the number policy. `ea1931d` preserves the decorative UI/numeral implementation; `55ccea6` restores shared Outfit for all grid digits, notes and the enlarged cell editor while keeping bottom/right dock 1-9 and More in each theme's UI font. The optional families, real face metadata, UI size profiles and unchanged baked titles remain accepted.

Grid numbers now scale proportionally at 0.68D, capped at 36px, compared with the former 0.64D/32px. The invisible text frame is 0.72D square with a circular 50% clip: actual paint is bounded by the guaranteed 0.36D opaque disk. Cell allocations, rounded faces, 81 targets, ten keys and note geometry remain unchanged. A hard minimum no longer forces oversized figures into very small cells; dock labels retain 17px minimum. No theme-specific digit baseline offsets remain. Shared solid 1px conflict underlines use -0.05em offset with ink skipping, plus the unchanged exclamation/color cues. Actual conflicted 1/4/7/8/9 were entered through normal commands and inspected on both themes at 280px and 320px.

The final containment diagnostic uses actual Outfit 500/600, all 1-9 figures, normal/conflict states, both themes at native 280x568, 320x568, 360x800, 800x360 and 1280x720, plus an explicit 17px specimen in the 320 allocation. Diagnostic-only `filter: opacity(.99)` normalizes LCD rendering to observed grayscale; the production renderer is unchanged. Masked/unmasked PNG channels may differ by at most 2/255. A deliberately tiny 5% circle must produce a difference greater than 100/255, guarding against a false pass. Native fallback is tested separately by blocking Outfit, confirming actual Segoe UI Semibold through Chromium platform-font inspection and allowing observed faint antialiasing up to 4/255. This fallback smoke is current-platform evidence, not certification of every installed font. The actual colored faces and readable conflict cues are reviewed independently of this normalized diagnostic.

Matching final before/after captures use the former UI/grid/dock treatment versus the final larger shared grid and themed keys. Gameplay/editor pairs cover both themes at five native sizes, with main-menu/Settings pairs at 360 and 1280. The same puzzle, notes and selection are preserved within each pair. Raw screenshots/scripts/results are under ignored `prototypes/font-live-audition/final/`; durable copies are indexed by the current theme readiness receipt. Earlier decorative-grid captures remain historical evidence. Physical-phone readability and broader browser/zoom checks remain unclaimed.

Validation after the shared-grid change: all 433 unit tests in 62 files passed with one worker; all 18 theme-polish browser journeys passed; built-subpath/font/license checks passed; Svelte check reported zero errors/warnings and TypeScript node checking passed. The independent reviewer corrected one stale Cauldron unit assertion to check the circular paint mask instead of unpainted square corners, then approved the final geometry and real conflict captures.

## Earlier decorative numeral follow-up, superseded

Production uses one optional family with a nonempty list of real faces: Almendra 400/700 for Pond and Germania One 400 for Cauldron, retaining audited native bold synthesis for the latter. Accepted alphabetic sizes are Pond body 16px, summary 14.4px, small labels 12.1px; Cauldron body/summary 17.6px and small labels 13px. Controls and fixed title/subtitle geometry remain unchanged.

Primary cell digits, dock numbers and enlarged numeric editors now use the theme family. Both reviewers judged themed dock/enlarged figures readable at 4/5; Cauldron's main figures also scored 4. Pond's old-style figures required a common baseline adjustment before grid acceptance. Tiny themed nine-note faces were rejected at existing 4.84/5.57px phone sizes: fine Almendra details and condensed Germania forms lose distinctions. In-board notes alone retain Outfit; 24px enlarged notes remain themed. These are expert raster judgments, not hardware/user-study results or a WCAG font certification.

Matched real-application captures use identical puzzle values, conflict/selection and nine manual notes for each before/after pair. Eight contexts cover both themes at 320x568 DPR1, 360x800 DPR3, 800x360 DPR3 and 1280x720 DPR1. Menu/Settings pairs at 360 and 1280 supplement gameplay/editor pairs at all four sizes. Before is the previous Baloo 2/Fraunces UI plus shared Outfit numbers; after is actual production derivatives and metrics. Scripts/results/screens are ignored under `prototypes/font-live-audition/final/`; earlier rejected themed tiny-note comparisons remain under `numerals/`.

The original Almendra 7 lost its lower tip in the unchanged clipped paint box; the tested original 3 already matched and must not be reported as clipped. A shared upward lift preserves old-style relationships: Pond 0.09em, Cauldron 0.04em. Their small conflict waves also clipped, so the final profile uses a fine solid 1px underline at 0.03em offset with the existing exclamation/color cues. Enlarging the paint box, shrinking all digits and adding a separate wave that overlaps the exclamation were rejected. Failed/absent fonts receive zero custom lift and the original decoration.

The integrated ink regression isolates mounted numeral paint from decorative SVG edge antialiasing. It checks all 1-9 figures at 400/700, normal/conflict states, both themes and all four allocations. Clipped/unclipped PNG pixels may differ by at most 2/255 per channel for clipping-layer antialiasing; the actual cut wave differed by 211/255. Target rectangles and saved logical state remain equal after these diagnostic DOM-only specimens. Actual colored captures separately assess recognition, centering and conflict cues. Native-font failure and partial regular-success/bold-failure exercise whole-family system fallback and recovery.

## Method and score meaning

The user asked to challenge their preference for Berkshire Swash and Mystery Quest and compare all four finalists in the maintained application. The lead and named independent theme-guide reviewer agreed the rubric before inspecting application evidence. The independent reviewer received alias filenames without the font-name mapping until scores were complete. Both had previously seen font specimens, so this is not a blinded clinical study or measured reading-speed experiment.

Scores are ordinal expert screenshot judgments per role, not calculated readability percentages:

| Score | Meaning |
| ---: | --- |
| 5 | Immediately clear and unambiguous |
| 4 | Clear with minor ornament |
| 3 | Readable, requiring extra attention |
| 2 | Recurring ambiguity or slow deciphering |
| 1 | Unreliable |
| 0 | Unreadable or missing |

Record the weakest recurring sample. A clear large heading cannot compensate for a weak small label. Keep measured fitting, glyph fallback, contrast and weight delivery separate from these scores. Where reviewers disagreed, the table uses the lower score rather than an average. A score of at least 4 in each repeated alphabetic UI role is our acceptance preference for this audition, not a WCAG rule.

The real application was loaded in disposable browser contexts. Local FontFace instances replaced only `--font-ui`. Single-face candidates were honestly declared weight 400, not falsely described as variable 400-700. Almendra loaded genuine 400 and 700 faces. Existing CSS weight requests, natural browser matching/synthesis, theme colors, baked title outlines, solving numerals, layout and actions remained active. No fake Settings or gameplay markup was used.

The baseline matrix covers six fonts, four allocations, three locales, two appearances and nine surfaces, plus real recovery-play badges: 1,332 application states. Allocations were 320x568 DPR1, 360x800 DPR3, 800x360 DPR3 and 1280x720 DPR1. Surfaces included main menu, Quick Play, Progression, Settings/Auto, expanded Session, Backup paragraphs, gameplay Notes, gameplay More and Hint. Font loading, content bounds, subtitle containment, page errors and shared solving-family ownership were measured. No measured overflow, subtitle-bound failure or page error occurred.

Images used for scoring were displayed at their CSS dimensions. DPR3 raw images were retained for detail, but an enlarged 1080px raster was not treated as evidence that 11 CSS-pixel labels were easy to read. Actual role sizes are 16-22px controls, 16px normal paragraphs, 14.4px Auto summary, 21.6px dialog headings, 19px/700 SUDOKU and 11px Notes/save labels. Earlier assumptions that difficulty buttons were 14px were corrected from computed styles before final scoring.

## Results

| Candidate | Alias | Controls | Paragraphs | Original 11px labels | Adjusted labels | Adjusted profile |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Berkshire Swash | pond-a | 4 | 3 | 2 | 3 | 12.1px labels; paragraphs unchanged |
| Almendra | pond-b | 4 | 4 | 3 | 4 | 12.1px labels; paragraphs unchanged |
| Germania One | cauldron-c | 4 | 3 initially, 4 adjusted | 2 | 4 | 17.6px paragraphs, 13px labels |
| Mystery Quest | cauldron-d | 3 | 3 | 2 | 3 | 12.1px labels; paragraphs unchanged |
| Current Baloo 2 | pond-control | 5 | 5 | 4 | Not changed | Current production profile |
| Current Fraunces | cauldron-control | 5 | 5 | 4 | Not changed | Current production profile |

Both reviewers independently rated the adjusted Almendra and Germania profiles 4/4/4. The initial Germania body/tiny scores differed: lead 4/3, reviewer 3/2. Fresh adjusted images resolved that difference; agreement was not produced by averaging.

Germania's 17.6px preview rule targets `.game-dialog .pane p`, including the Auto summary whose baseline is 14.4px. It retains 1.3 line height and ordinary dialog scrolling. It is not a Backup-only adjustment; future adoption must reproduce and validate that full scope.

- **Berkshire Swash:** distinctive bubbly storybook identity, but its dark swashes and letter joins add effort in the German Backup warning. The 11px `Wertung`/`Notizen` samples lose separation. At 12.1px they become decipherable but retain distracting density. Visual preference did not justify adopting it for every UI surface.
- **Almendra:** calligraphic identity with more separated lowercase shapes. The 16px German warning and Spanish controls remain comfortable. At 12.1px, `Wertung`, `Notizen` and `Notas` become readily identifiable without changing targets. This is the preferred Pond audition.
- **Germania One:** strong geometric Fraktur character, with dense narrow shapes at the original body/small sizes. The 17.6px paragraph trial makes `Wiederherstellen`, `Spielstand`, `Tautropfen` and the Spanish warning easier to separate. At 13px, small words become clear while retaining the theme character. This is the preferred Cauldron audition, conditional on that explicit size profile.
- **Mystery Quest:** unmistakable curling fantasy identity and attractive larger actions, but thin loops and unusual joins make `Appearance`, `Motion`, the Auto sentence and especially `Wertung` harder to decode. The 12.1px trial improves small text to 3, not 4. The user's enthusiasm for its Halloween appearance did not override the small-text result.

## Measured size budgets and the Notes correction

An initial text-only fit check missed a real presentation problem: the inline Notes pencil could shrink under flexbox pressure. Ordinary More had 8px horizontal padding; a 57.6px phone key left 41.6px, less than the combined word, 12px icon and 4px gap. A lack of text overflow was not enough to establish a usable control.

The narrow correction reuses the existing recovery-badge layout: whenever Notes is active, the pencil sits beside Ellipsis in `.more-symbols`, protected by the existing `flex-shrink: 0`. The lower row contains only the localized word. Notes also uses the existing `.has-state` padding/gap. Native accessible labels, commands, 81 cell targets, ten keys and grid allocation are unchanged. Neutral More has only 28px Ellipsis; Notes has 28px Ellipsis plus 12px Pencil; recovery alone has 20px Ellipsis; combined recovery/Notes has 20px Ellipsis plus 12px Pencil. [CSS flex shrinking](https://www.w3.org/TR/css-flexbox-1/#flex-shrink-property)

After this correction, 80 enlarged-label cases test all four candidates at 12.1px, including English/German/Spanish on 320px phones, German on 360px DPR3 phones and German on the 612px viewport's fixed 56px single-row dock. All preserve actual 12x12 pencil dimensions, full content bounds and all 91 cell/key rectangles.

Germania's final bounded trial uses 13px, not an arbitrary 20% target. The recovered two-line badge must fit the shortest dock: two 13px lines + 20px Ellipsis + 2px gap + 8px vertical padding = 56px. A 13.2px trial would nominally need 56.4px. Twenty actual 13px cases cover the same languages/appearances and both phone and single-row allocations, with no measured clipping and unchanged targets/icons. Six additional 320px paragraph captures check English/German/Spanish in both appearances at 17.6px and natural 1.3 line height. Scores for adjusted and original profiles remain separate.

## Language, weights and contrast

Chromium's platform-font inspection confirms all 21 tested accented characters use each custom face for both NFC and decomposed NFD strings. The four decorative sources lack capital `ẞ`, which actually uses installed Segoe UI in this Windows test. This is a per-glyph consistency tradeoff, not failure of the remaining German alphabet. A cmap-only combining-mark test would incorrectly reject the successful recomposition observed here. Future adoption still needs a bounded subset/generator review and cross-browser verification.

Comparing the 19px SUDOKU raster with normal synthesis versus `font-synthesis: none` confirms visible synthetic bold for Berkshire Swash, Germania One and Mystery Quest. Almendra's real 700 and the current variable fonts do not change. Do not label the static sources as genuine supplied bold fonts. The existing title/descriptor size, ink and protected liquid region remain fixed.

Colors are unchanged and the maintained contrast tests remain applicable. Normal active text must satisfy 4.5:1, with the maintained large bold descriptor using its separately tested 3:1 region. A numeric contrast pass does not settle thin decorative-stroke recognition. Text resizing and spacing are separate requirements, not points in the subjective font score. [Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)

Twelve real manual-note journeys also entered all nine candidates in a blank cell and opened the enlarged editor, across all six faces and both phone allocations. Shared Outfit notes remain 4.84px at 320x568 and about 5.57px at 360x800; these are very small and are not improved by choosing another alphabetic UI font. The existing enlarged editor displays them at 24px. All font families and geometry remain unchanged in these solving roles. This shared optical limitation is reported separately, not hidden by the alphabetic UI scores.

## Reproduction, preview and limits

Ignored artifacts remain under `prototypes/font-live-audition/`:

- `audit.mjs`, `audit-results.json`: baseline matrix and CSS-size/raw-device evidence.
- `followup.mjs`, `followup-results.json`: 12.1px profiles and actual visible glyph/synthesis proofs.
- `followup.mjs --larger-c`, `larger-c-results.json`: bounded Germania paragraph/small-label profile.
- `solving-notes.mjs`, `solving-notes-results.json`: actual nine-note cells and enlarged editors.
- `index.html`: interactive live application preview with font, viewport, locale, appearance and original/adjusted profile selection. Its unique `.localhost:5195` origin has separate save data from the user's `127.0.0.1:5195` tab.

Original font inputs, source URLs/hashes, licenses and outline measurements remain in `prototypes/decorative-font-research/metrics.json`. Sources are pinned to Google Fonts revision `6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec`. [Berkshire Swash](https://fonts.google.com/specimen/Berkshire+Swash), [Almendra](https://fonts.google.com/specimen/Almendra), [Germania One](https://fonts.google.com/specimen/Germania+One), [Mystery Quest](https://fonts.google.com/specimen/Mystery+Quest).

Runs use one browser worker sequentially. The lead also reviews the live isolated preview through Codex browser, while the independent reviewer inspects the captured CSS-sized images. All fifteen polish regression journeys, the built deployment-subpath/artwork/font-delivery test, fifteen focused palette/contrast unit checks and Svelte/TypeScript checks pass after the Notes correction. Autofixer reports zero issues, with reviewed inherited suggestions. Physical Motorola hardware, human reading speed, dyslexia/low-vision user testing and full browser zoom/spacing conformance remain unverified. There is no universally certified font score.

The font profiles remain audition results for the user's decision. Adopting Almendra would require representing real regular/bold as one optional family with two faces, rather than pretending the current one-URL contract already supports it. Germania would require explicitly reviewed synthetic-weight and size/subset choices. No font-family change or gameplay integration is made by this report.
