# Theme authoring guide

This is the current reusable design and implementation contract for themes on the isolated `codex/themes` branch. It consolidates the accepted Pond/Cauldron direction. [Theme progress](theme-progress.md) records decisions and validation; the [isolated handoff](theme-implementation-handoff.md) governs ownership. Historical Pond-only restrictions and candidate interfaces do not override this guide. It does not authorize a new theme, gameplay changes or integration into the gameplay checkout.

## Preserve the game, theme the world

Every theme should feel like a coherent top-down liquid environment. The liquid is the play space; the ground or vessel supports controls. Theme identity should come from material, shapes, motion and typography together, while the familiar flat Sudoku composition remains intact. Flat does not mean a plain recolor.

| Preserve across themes | A theme may author |
| --- | --- |
| Classic 9x9 rules, upright digits, readable 3x3 groups and existing group-color assignment | Three distinct solid liquid fills and a dedicated liquid motion/profile for menu and gameplay |
| All 81 full rectangular targets, inward 1:1 face anchors, digit/note geometry and fixed logical IDs | Cell silhouette and peripheral material detail inside the shared envelope, with an opaque readable center |
| Shared layout, 4px/8px spacing, ten dock keys, Fill/Square setting and navigation | Ground/vessel contour inside the existing clearance corridor; optional narrow lip following that contour |
| Selection, keyboard focus, conflicts, notes, progress, rewards and persistence authority | Semantic colors for all states, complete control boundaries, finish and radii |
| Toadoku name, shared main-menu logo/sketch, product terminology and readable familiar digits | One optional readable UI/numeral family, licensed baked Toadoku wordmark outlines, colors, weights and measured metric adjustments |

Do not add a scenic frame, enclosing oval pot, permanent gameplay HUD, side-view horizon, gradients or decorative margins that shrink the board. Keep soft controls and equal corner radii on each dialog/popover. Theme-specific ornament never moves or resizes hitboxes. Layout changes are shared product decisions, not per-theme options.

Only Pond must retain frog-associated scenery and lily-pad cells. Other themes can use appropriate materials and floating objects. The shared app identity and terminology remain; new frog transitions/animations are deferred. Seasonal artwork cannot replace or recolor the shared logo.

The menu identity includes a subordinate uppercase `SUDOKU` descriptor in the selected theme UI font or system fallback. Both lines share the original protected title rectangle and float transform, preserving artwork, shore and bubble exclusions. The baked wordmark preserves its natural em scale inside the remaining height; the descriptor uses 19px bold normal type and existing title ink, retaining the established 3:1 contrast against deep/middle liquid. Do not mute it with opacity or make it tiny over moving liquid. Preserve real Toadoku heading text for accessibility and mark its decorative SVG nonfocusable and hidden from accessibility APIs.

## Token and material rules

Use the actual typed contract in [tokens.ts](../src/lib/theme/tokens.ts), not the historical research interface. Define both appearances with the same complete role set.

| Token group | Meaning and constraints |
| --- | --- |
| `water.deep/middle/shallow` | Exactly three solid liquid colors. All three must remain visibly present after foreground occlusion, not merely exist in the preset. Preserve clear group lightness relationships. |
| `ground.wet/dry/rim`, `ground.ink` | Three fills: liquid-facing bank/inner vessel, control-bearing ground/body, and a separate narrow seam or lip. The third band is ground, not a fourth liquid fill. Ground text has its own foreground, independently contrasted against dry ground in both appearances. |
| `decoration.bubble/bubbleEdge` | Separate decorative paint. Rings may use a fourth color distinct from the liquid; it is not a group cue. A theme can omit bubbles. |
| `leaf` | Existing semantic name for any cell material, including lily pads or squash. Cover normal/selected faces, lip, ink, notes, entries, conflicts, focus and optional peripheral rind. |
| `control`, `surface`, `dialog` | Complete normal/hover/pressed/selected/disabled/focus materials, edges, shadows and control/window radii. An edge must survive every applicable state. |
| `typography` | Colors, weights, line heights, established size limits and measured body/summary/small-label roles. The optional `ThemeDefinition.font` supplies UI and primary numerals. Tiny in-board notes use the shared note face. Keep sizes stable unless actual font evidence justifies a change. |
| Shared budgets | Spacing, geometry, floating travel and update-rate limits are shared presentation contracts. A new palette does not justify changing them. Theme liquid periods may differ. |

Pond retains its three water colors and wet/dry ground, organic shore and notched lily pads. Cauldron uses orange pumpkin broth, pale squash faces, dark iron/enamel ground and a thin metal lip. Its boundary has one regular concave curve, not a wavy shore or convex mound. These material choices are examples for future themes, not a requirement that every theme resemble cookware.

The existing rim bands are at most 1.5px for Pond and 2px for Cauldron, interpolated within the bank. Do not enlarge the bank to make a lip fit. At constrained short-landscape menu sizes, the unchanged temporary sketch intentionally straddles the Cauldron rim; title/control clearance and full bubble exclusion still apply.

Active text must satisfy the maintained contrast checks. Cauldron's three group fills pass 3:1 pairwise; preserve that baseline when extending its palette. Meaningful boundaries and focus need clear non-text contrast. Inspect actual rendered edges and small notes as well as numeric ratios. Scrollbar tracks/corners remain transparent; thumb and arrow-glyph colors match, subject to native-browser limits.

## Implementation boundaries

| Source | Ownership |
| --- | --- |
| [runtime.ts](../src/lib/theme/runtime.ts) | `ThemeDefinition`, explicit dynamic imports, bounded font loading and atomic publication of the winning theme/appearance |
| [presentation.ts](../src/lib/theme/presentation.ts), [layout.ts](../src/lib/layout.ts) | Shared budgets and viewport allocation; theme definitions consume layout rather than allocating it |
| [scene/types.ts](../src/lib/scene/types.ts), [scene contract](../src/lib/scene/README.md) | Required `liquid` and `vessel`, optional `bubbles`, frame/path types and complete containment rules |
| Theme definition module | Complete light/dark tokens, one optional local UI `font`, baked `wordmark`, required `cellPath`, optional `cellDetail` and scene functions |
| [calendar.ts](../src/lib/theme/calendar.ts), [policy.ts](../src/lib/theme/policy.ts), [event.ts](../src/lib/theme/event.ts), [copy.ts](../src/lib/theme/copy.ts) | Ordered annual event metadata, shared selection/deadlines and localized status; no eager theme renderer or font imports |

Keep shared Scene/Leaf/board components free of theme-ID checks. Shared components receive functions and semantic CSS properties. Lazy-load theme modules and their fonts/assets; do not turn the system into a plugin framework or add a separate board implementation.

The latest approved typography supersedes the global-Outfit and later Baloo 2/Fraunces policies. A theme has at most one optional `font: { family, faces: [{ url, weight? }, ...] }` for labels, headings, forms, dialogs, SUDOKU and primary gameplay numerals. The nonempty face list describes actual files and native weights: Pond uses Almendra regular 400 and bold 700; Cauldron uses Germania One regular 400 with the audited browser bold synthesis. Never label a static face as a variable weight range. Load every face off-document; register the complete family only for the winning request after all succeed. One failure or timeout gives whole-family fallback, and stale completions never register. Cache identity includes every URL and weight. [CSS font loading](https://www.w3.org/TR/css-font-loading-3/), [weight matching](https://www.w3.org/TR/css-fonts-4/#font-weight-matching)

The runtime derives `--font-ui` and `--font-solving` from that winning load result, without an independent preset family string. Missing, failed or timed-out fonts explicitly use `SYSTEM_UI_FONT`, even when another theme's face is already registered. Initial loading/error UI also uses that system stack. An omitted font causes no theme font download. The accepted metrics are Pond body 16px, Auto summary 14.4px and small status labels 12.1px; Cauldron paragraph/summary 17.6px and small labels 13px. Controls remain 16-22px and SUDOKU remains 19px bold inside its existing envelope.

Board digits, numeric dock keys and enlarged numeric editors, including 24px enlarged notes, use the theme's `--font-solving` family. Tiny in-board candidates alone use shared `--font-note`: the unchanged 4,616-byte Outfit subset. Both decorative candidates lost distinctions at the existing 4.84/5.57px phone note sizes. This narrow readability exception preserves numeric identity elsewhere without changing the board or note geometry. Any future note replacement needs actual nine-note evidence at the smallest supported allocation. Theme WOFF2 files cover EN/DE/ES, current punctuation and actual NFC/NFD shaping; rare capital sharp S uses the documented system fallback. Future languages require coverage review and a reproducible rebuild.

The main-menu title is vector path data, not a font resource. `wordmark` supplies the shaped path, overhang-aware em viewBox and dimensions; shared rendering applies `currentColor` inside an accessible h1. Existing Chewy/Creepster lettering remains recognizable without full title-font downloads. Compare a new wordmark's outlined module against word-only WOFF2 and raster sizes before choosing; SVG is the practical current choice, not a universal smallest-format claim. See [asset measurements and reproduction](research/theme-font-asset-comparison.md) and [licensing/provenance](production-assets.md#optional-theme-ui-fonts-and-baked-wordmarks). Do not add a second theme font for fixed branding.

Rendering functions consume `Layout`, screen and the existing active-time clock. They own no timers, observers or gameplay state. Reduced motion has a deterministic static pose; hidden work pauses. Reserve full independent face/lip/lift/float/focus sweeps, not just the current position. Decorations must stay outside readable centers and meaningful region boundaries. Cache expensive layout-only site/proof work against immutable layout objects. SVG path/circle animation still paints; do not claim compositor-only or phone performance without measurement.

All main-menu actions, including difficulties, Resume, Back and More, share `layout.menuActionHeight` across base, Quick Play and Progression states. It is capped at 64px and shrinks with the viewport's existing key budget. Maximum submenu reservation and identity/shore anchors stay fixed across menu states. Narrow portrait gameplay uses 2x5; landscape retains right 5x2, with ten equal-height keys within that allocation. Existing bottom-dock allocations may use one 56px-high row only with at least 596px usable width and 32px board faces. This includes ten 56px-wide keys plus nine 4px gaps. The minimum was raised after the real German save badge overflowed 48px keys. Preserve full localized labels, Notes/save cues and equal key heights.

Opening an overlay preserves its underlying screen, mounted cells, labels, control geometry and normal enabled/disabled appearance. Render the underlying menu from the overlay's base screen, not the overlay route itself. Native modal dialogs make the background inert and retain the existing theme-token backdrop; ordinary windows do not need a glass visual redesign or additional blur. Readable Settings/tools remain timed. Explicit Pause and restore staging blur the entire scene while stopping study time, retaining its silhouette and mounted cells. Authority loss still conceals stale puzzle values. Do not couple visual presence to the clock's `canStudy` flag or disable all background controls merely because a lazy dialog is loading. Focus returns to the appropriate trigger after dismissal.

Never reject all mouse events with `detail > 1`: it is a native multi-click count, not proof of a duplicate command, and can break stationary repeated clicks throughout the app. Existing busy/history/command guards prevent duplicate work. A narrow one-click dialog-to-gameplay guard protects against a dismissal's second click entering an underlying cell/number or moving selection through focus; menu controls and repeated intentional note-key presses remain native. Loading/error dialogs share the loaded dialog's outside-dismiss behavior. Test stationary presses with real increasing native click counts and late-import dismissal, rather than assuming repeated locator clicks reproduce the browser's multi-click sequence.

### Font fallback and future lettering

The [decorative-font audition](research/theme-font-readability-audition.md) compares Berkshire Swash, Almendra, Germania One and Mystery Quest inside the real application. The user accepted the adjusted Almendra/Germania One profiles and subsequently requested themed numerals. It records expert role scores separately from fitting, native/synthesized weights and actual NFC/NFD shaping. A large lowercase measurement alone does not prove small-label readability. Review the complete lower label and icon at CSS display size; silent icon shrinking is a fitting failure.

Primary numeral paint has the same fixed 0.44D by 0.56D clipped box. The loaded Almendra face uses a common 0.09em upward ink lift and Germania One 0.04em; do not recenter old-style figures individually. Positive `digitBaselineShift` produces twice that bottom padding under border-box/flex centering. These are tested font metrics, not cell geometry. Both faces use a fine solid 1px conflict underline at 0.03em offset alongside the unchanged exclamation mark and conflict color. Native wavy decoration was cut at small sizes. Only successful custom-font publication enables these metrics; missing/failed/system callers default to zero lift and the established wavy treatment. Any new font must prove all 1-9 figures at native weights, minimum/maximum sizes and conflict states within the unchanged paint box. Compare clipped/unclipped ink separately from scene rasterization, then review real colored screens and the exclamation mark.

The fallback order is `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`. Prefer the device's own modern interface font, then named installed alternatives and finally the browser's sans-serif default. Typical results are Segoe UI on Windows, San Francisco on Apple devices and Roboto on Android; exact choices depend on the browser, installed fonts and user settings. None of these fallbacks downloads another font. Do not add a downloaded fallback merely because a family is fashionable. The stack never requests Times or a serif generic. Keep the initial CSS stack and `SYSTEM_UI_FONT` synchronized. [CSS font matching](https://www.w3.org/TR/css-fonts-4/)

In player-facing explanations, call the 4,616-byte shared subset a small number-only font used for tiny notes. A baked wordmark means saved letter outlines that scale like a drawing. The title modules cost 6,386 bytes for Pond and 9,445 for Cauldron before compression, approximately 2.4KB and 3.3KB with Brotli. These are isolated module measurements, not guaranteed network transfer sizes.

For every future theme:

1. Supply at most one optional UI/numeral family with genuine weights, EN/DE/ES accents and actual NFC/NFD shaping. Keep branding baked and tiny in-board notes on the tested shared face unless replacement evidence supports them.
2. Compare playful candidates in actual controls, paragraphs, subtitle and small status labels at existing sizes in both appearances. Include long German choices at 320px and short landscape. Reject a font that needs smaller labels or changed targets to fit. A catalog description is not readability evidence.
3. Shape the licensed fixed word `Toadoku` before outlining, preserving kerning, overhangs and natural em scale. Add the result to the lazy module's `wordmark`; retain real accessible heading text and hide decorative SVG from accessibility APIs. Do not ship a full display font for seven fixed letters.
4. Measure outlines against a word-only webfont and appropriately sized raster alternatives. Record bytes, source/license hashes and a reproducible generator. SVG avoids another font request but is not always the smallest representation.
5. Test successful, absent, failed and timed-out font loading. Check contrast, text enlargement/spacing and visible accented text separately from character coverage. WCAG does not certify font families; neither a playful style nor a successful glyph check alone proves readability. [Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)

## Auto and future events

Fresh settings use these defaults. Existing saved choices take priority; changing a default never migrates those choices.

| Preference | Fresh default |
| --- | --- |
| Theme | Auto |
| Appearance | System, following the browser/OS light or dark preference |
| Language | First supported browser-preferred language, in order: match English, German or Spanish; English fallback if none match |
| Motion | System, respecting the reduced-motion preference |
| Board shape | Fill space |

Language detection uses ordered `navigator.languages`, falling back to `navigator.language` if the list is empty. A `lang` URL override can choose the initial locale; a saved language still wins when the repository loads. Do not infer language from location or timezone or overwrite a saved choice when browser preferences change.

Persist the selected preference separately from the applied theme. Auto is the fresh default; existing saved Pond choices remain intentional. Unknown IDs resolve safely without rewriting saves. Appearance remains an independent system/light/dark choice. Use the existing preference transaction pipeline and keep storage schemas unchanged.

Halloween's actual date is October 31. The shared two-week rule activates it from October 24 through November 6, ending at local November 7. Calendar boundaries choose the event; countdown days are 24-hour durations with rounded-up remaining hours and a final less-than-one-hour label. Name the seasonal theme directly and associate its event, for example "Cauldron ends in 6 days and 4 hours (Halloween)." This describes the theme window, not the literal holiday date. Settings shows the actually applied theme, including when a desired theme is loading or failed; remaining-time copy names the expected seasonal theme. Fixed choices have no expiry. Refresh countdown text quietly each visible minute; that refresh must not retry imports. Re-resolve on midnight/resume.

### Add a yearly event

Annual events are data in `THEME_EVENTS` in [calendar.ts](../src/lib/theme/calendar.ts). An event for an existing theme needs one entry, not new selection or countdown branches:

```ts
{
  id: 'halloween',
  theme: 'cauldron',
  label: { en: 'Halloween', de: 'Halloween', es: 'Halloween' },
  date: { month: 10, day: 31 },
}
```

Months are 1-based. Supply only the actual event date, not a pre-expanded window. Year is omitted because it repeats annually. Every event uses the same `EVENT_DAYS_EACH_SIDE = 7` rule: start at local midnight seven calendar days before, end at local midnight seven calendar days after. The start is inclusive and end exclusive, giving exactly 14 active calendar dates. Including both the event day and all seven following dates would instead give 15; that earlier convention is superseded. There are no per-event durations or hour/minute fields. Adjacent event years are checked so January events can start in December and December events can remain active in January.

Auto uses the first active entry in list order. Overlaps require no priority numbers, sorting, randomness or extra saved state. The same resolved occurrence supplies the theme, localized event label and countdown deadline. When no window matches, `DEFAULT_THEME` supplies Pond. Explicit theme choices bypass the schedule and have no expiry.

The application rechecks at local midnight and on resume/focus. Countdown minute updates remain independent and do not retry imports. This is a small annual-date resolver, not a general recurrence service. Invalid actual dates are skipped before deriving windows; February 29 events run only in valid leap years. Each boundary is constructed directly from nominal calendar fields, so an event date's skipped midnight cannot carry a normalized 01:00 into other dates. If a boundary's own midnight does not exist, native `Date` uses its first valid local instant. The shared rule measures calendar days; elapsed duration can differ across DST, for example 335 or 337 hours rather than 336.

New event data needs localized labels and boundary/overlap/year-wrap tests. A new theme additionally needs the ID, lazy module and name registration described below; scheduling does not import its visual code eagerly. Moving-date holidays need an explicitly reviewed extension rather than incorrect fixed dates.

## Choosing events worth a full theme

Use a small set of major, broadly recognized occasions with distinct visual identities. Cultural interest alone does not justify another complete palette, scene, cell material and validation burden. Smaller customs can inform optional accents within a larger seasonal theme.

Current research recommendation, not authorization to create themes: prioritize Christmas, Easter and the existing Halloween theme; Fasching is a strong Austrian candidate. A September 2026 IMAS survey of Austrian residents aged 16 and above reported 63% celebrating Fasching and 49% Halloween, supporting Fasching's local relevance rather than copying only an American calendar. [Primary survey and methods](https://www.imas.at/news/fasching-ist-das-groessere-fest-klar-und-eindeutig)

New Year is optional after those priorities. Combine Advent with the Christmas/winter direction; defer separate Martinstag and Epiphany themes. Nikolaus/Krampus can inform a later winter variation instead of requiring another full theme now. These are product-effort judgments, not statements that the traditions lack cultural importance. Easter and Fasching require calculated annual dates before scheduling; the current fixed-date registry must not approximate them with a permanent month/day. No new theme or event is registered by these recommendations.

## Authoring and acceptance

1. Read maintained screens, this guide and current progress. Identify the material/UX goal and challenge weaker alternatives before implementation. Use bounded named specialists for concepts and independent review when following the activated handoff.
2. Research primary sources and compare reference-based ImageGen concepts before a new UI experiment. Keep mockups/prompts ignored in `prototypes/`; document useful directions and rejected generated mistakes. Final production illustration still requires human authorship, provenance and licensing. The existing rough sketch is a temporary exception only.
3. Add the authored lazy module and semantic roles. Register its ID/choice/import and localized name; extend event policy/status only when needed. Reuse the stable layout and presentation components. Verify complete appearance presets and coherent failure/font fallback.
4. Prove full swept containment, readable opaque centers, unchanged targets, useful curvature at square proportions and separation of ornament from game state. Narrow lips/bubbles must disappear safely when no valid decorative space exists. Do not weaken these bounds to match a mockup.
5. Review actual menu/game screenshots in both appearances, Full/Reduced motion, Fill/Square and EN/DE/ES. Cover 320x568, 360x800, 800x360, 1280x720, near-square and large desktop; test the bottom-row threshold and safe-area allocation. Check pressed/hover/disabled/focus edges, conflicts, notes, native scrollbars and long save labels.
6. Run relevant token/calendar/runtime/geometry tests and browser invariants. Theme switches must retain puzzle, edits, undo, rewards and identical target rectangles at the same viewport/board shape; time/checkpoint counters may advance. Verify deployment subpaths, lazy chunks/fonts, licenses and unchanged logo. Record hardware/zoom/performance limits honestly. Prefer sequential single-worker checks when resource use matters.

Use [theme progress](theme-progress.md) for the current test commands, evidence paths and integration limits. Green tests support visual judgment; they do not approve a future theme's appearance automatically.
