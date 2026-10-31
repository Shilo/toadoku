# Tactile buttons for Quiet Flat C

Research checked 2026-10-31. Proposals for the next visual comparison only. No interface implementation, keypad arrangement, palette, font or production artwork is selected by this note. Follow [visual constraints](../design.md) and the [discussion workflow](../process.md). This study uses the requested Quiet Flat C scene and omits the foreground gameplay frog; shared frog artwork remains available in the menu.

**Current decision overrides the historical comparison below:** soft raised is selected for green lily-pad cells, cream input keys and menu buttons. Preserve the small pad notch, broad face, shallow lower lip and restrained highlight across water-background experiments. The former opaque classic-board recommendation is superseded by the pond board. See [current UI/UX](../ui-ux.md).

## Recommendation

Compare **soft raised pastilles** first and **restrained jelly** second. A shallow lower lip and small highlight can make buttons feel like candy while the surrounding pond stays flat and calm. Keep the board opaque, traditional and unchanged. Put the tactile treatment on menu choices and number-entry buttons, with less emphasis on overflow and Back.

The ranking is a design judgment for Toadodu, not a finding that these styles outperform other Sudoku controls. Google's Material research supports purposeful use of shape, color and size, while warning that unfamiliar interaction patterns can reduce usability. It does not establish a benefit for jelly buttons or this game. [Google Design research](https://design.google/library/expressive-material-design-google-research).

| Rank | Style | Proposed treatment | Strength | Main cost |
| --- | --- | --- | --- | --- |
| 1 | Soft raised pastille | Rounded square for digits, rounded capsule for labels; mostly solid face, small top highlight, solid 2 to 4 CSS px lower lip | Cute, tactile and easy to read; strongest match for a quiet flat scene | Excess thickness can make the keypad look heavy |
| 2 | Restrained jelly | Same geometry with a shallow two-tone face and one small static shine near the upper edge; opaque underneath | Strongest candy character with ordinary CSS | Shine can cross labels or turn into distracting plastic/glass |
| 3 | Lily-pad inspired | Broad rounded face with a small off-center edge detail; flat digit zone and generous intact center | Strong pond identity without adding a character beside the board | A deep notch wastes visible area and makes target edges ambiguous |
| 4 | Flat pill | Solid face, clear edge, no dimensional lip or shine | Simplest fallback and calmest secondary control | Less tactile; keypad capsules need enough width to avoid looking cramped |

Use one family consistently. Do not combine nine unrelated candy shapes or alternate digit colors without meaning. Reserve fuller jelly treatment for menu choices if repeated keypad shine becomes busy. These are ordinary UI fills, borders, gradients and shadows, not permission to generate production frog or lily-pad illustrations. Any actual sprite still needs human provenance and a suitable license.

## CSS feasibility and shape limits

The first two styles need standard rounded boxes, a solid fill or simple gradient, inset highlights and a short offset shadow. MDN documents both multiple/inset box shadows and CSS gradients. No image backdrop, blur, rendering engine or animation dependency is needed. These are feasibility observations, not supplied production code. [MDN box-shadow](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/box-shadow), [MDN linear-gradient](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/gradient/linear-gradient).

For the lily-pad option, keep a stable semantic button with an intact large hit area. Apply any notch only to a noninteractive decorative face, leaving the label and keyboard focus outline intact. Avoid clipping the button itself or overlapping neighboring targets to recover space. `clip-path` hides parts outside its region; using it on a visual layer avoids making the control depend on that silhouette. A plain rounded face is preferable if the notch cannot remain clear at small sizes. [MDN clip-path](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/clip-path).

The lily-pad inspired UI shape is distinct from the shared lily-pad sprite. Keep actual frog and lily-pad sprites identical in geometry, palette and frames across themes. Do not reinterpret the themed button proposal as approval for new AI-authored production artwork.

## Digits and interaction states

Use crisp, solid, upright digits over a quiet central face. Avoid engraved or embossed numerals: paired light/dark text shadows add small edges and make legibility depend on simulated lighting. A subtle raised button face supplies enough depth. Keep one stable digit font across Pond and Halloween; compare 1, 4, 6, 7 and 9 at actual size.

Use 4.5:1 as the project floor for every label and digit, including all points of a gradient behind the glyph. Required boundaries and focus/state indicators need 3:1 against adjacent colors. A decorative highlight need not meet that threshold unless it is carrying required information. WCAG does not require every decorative button edge to contrast 3:1 when the control is identifiable through other sufficient information. [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

| State | Proposed feedback |
| --- | --- |
| Rest | Clear solid label, stable face and shallow lip |
| Pressed | Lip becomes shorter and face darkens slightly; optional 1 to 2 CSS px visual depression inside a stationary hit area |
| Hover | Small fill/edge change for devices with hover; no information available only on hover |
| Keyboard focus | Separate visible outline, not just a shadow or fill change; it must survive the pressed state |
| Selected/toggled, where applicable | Persistent outline or marker plus programmatic state; do not confuse temporary pressing with selection |
| Disabled, where genuinely unavailable | Remove the raised appearance, retain a legible label and expose disabled semantics; do not rely only on a hue change |

Apple explicitly recommends a press state for custom buttons. Use native HTML buttons for keypad/menu actions, preserving keyboard and assistive-technology activation. Keep selected state distinct from press feedback. Required state information must not depend only on color, and keyboard users need visible focus. Inactive controls have WCAG contrast exceptions, but retaining their readability remains a project recommendation. [Apple buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [MDN button](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button), [W3C use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [W3C focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html).

Do not pulse, wobble or repeatedly squash the keypad. In reduced motion, replace spatial depression with an immediate lip/fill change. The board and digit positions stay still in either mode. [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).

## Touch size and keypad arrangement

Keep units separate: Android recommends at least **48 by 48 dp** touch targets; Apple generally recommends **44 by 44 pt** hit regions. These are native platform units. For this web PWA, WCAG 2.2 AA uses **24 by 24 CSS px**, with exceptions, while its enhanced AAA criterion uses **44 by 44 CSS px**, with exceptions. Propose at least **48 by 48 CSS px** for essential keypad buttons where feasible, as a project comfort target rather than an assertion that native units convert directly. [Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps), [Apple buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [W3C minimum target](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [W3C enhanced target](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html).

Nine 48 CSS px buttons need 432 CSS px before gaps. At a 360 CSS px viewport, even a marginless nine-across row gives only 40 CSS px per button. Do not imply that a single phone-width row meets the proposed 48 CSS px target.

| Layout to compare | Benefit | Tradeoff |
| --- | --- | --- |
| Two rows, 1 to 5 then 6 to 9 | Low keypad height; leaves more portrait height for the board; five 48 px targets plus four 8 px gaps occupy 272 px | Unequal row lengths; needs careful centering and stable digit order |
| 3 by 3, 1 to 9 in reading order | Regular geometry with generous targets; useful beside a board in landscape | Three 48 px rows plus two 8 px gaps occupy 160 px of height before padding |
| Nine across, only when space permits | Very short keypad; direct sequential scanning | Unsuitable for the proposed target on narrow phones |

These examples are arithmetic, not device testing or evidence of faster entry. Start the portrait comparison with two rows to protect board size; compare 3 by 3 beside the board in landscape and on wide displays. Keep the numeric order stable across arrangements. Do not silently add notes, undo, erase or hints into spare keypad positions; their access is still a separate discussion.

Keep entry close to the board and clear of safe-area insets. A low portrait keypad is a reasonable candidate to test, but it is not evidence that a fixed bottom cluster is best on every device, orientation, hand or input method. Desktop keyboard users and phone landscape layouts need their own composition. Review real touch accuracy, accidental neighboring taps and board occlusion before selecting the arrangement.

## Theme comparison and next review

Pond can use fresh green or teal faces with darker green lips. Halloween can use pumpkin-orange faces, near-black lips and vivid purple surrounding UI. Exact colors remain proposals and need contrast checks in light and dark appearances independently. Keep highlights small enough that orange still reads as orange. Green frog and lily-pad sprites retain their source colors, with no themed replacements or accessories.

The next ImageGen comparison should show identical board sizes and control counts for pastille, jelly and lily-pad inspired buttons in Pond and Halloween, using the same Quiet Flat C surroundings. Add close crops of rest, pressed and focus treatments. Keep all generated images under ignored `/prototypes/` and label them temporary concepts. Generated images cannot prove correct Sudoku, actual CSS rendering, contrast, focus behavior or usable target dimensions. Discuss the button family first; keypad geometry and secondary actions remain separate decisions.
