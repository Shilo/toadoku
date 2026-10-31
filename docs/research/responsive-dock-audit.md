# Responsive board and input dock audit

> Research record: original proposals may be superseded. Read the [design handoff](../design-handoff.md) and [current UI/UX](../ui-ux.md) for selected decisions; this record does not approve implementation.

Research checked October 31, 2026. This challenges the selected full-stretch default and optional Square board, plus the proposed two-row portrait keypad and two-column right landscape keypad. The current control proposal has exactly nine digits plus More, with no separate top overflow. More opens four solving tools and a Settings entry in the same overlay. Unselected details remain proposals until recorded as decisions. This audit does not approve implementation or generated artwork.

## Recommendation

Use **Board shape: Fill space / Square**, with Fill space selected by default, to express the selected full-stretch direction. Keep the input dock fixed when changing board shape. In landscape, put the board left and the input dock right. Interpret the rotated layout as the same spatial relationship, recalculated for the actual usable viewport. Literal equality of pixel bounds across rotations is an idealized comparison, not a reliable browser constraint. Do not impose an untested aspect-ratio cap on the selected default.

Propose ascending row-major key order in both orientations for discussion before choosing the number order. This favors immediate visual scanning and lets visible order, source order and keyboard order agree without special reordering. It does not preserve every key's physical position during rotation. This is design judgment; the consulted sources do not establish an empirical optimum for Sudoku key order or board proportions.

```text
Portrait                     Landscape
1  2  3  4  5                1  2
6  7  8  9  More             3  4
                             5  6
                             7  8
                             9  More
```

## What rotation should preserve

Preserve the selected cell, puzzle, notes, input mode, undo history, focus identity and board-shape preference. Keep every digit upright and normally proportioned. Recompute geometry rather than rotating the rendered board or keypad with a transform.

For an ideal usable viewport W by H and a portrait dock of depth D, the portrait board is approximately W by H minus D and its separating gap. A perfectly swapped landscape viewport can give the transpose: H minus D and the gap, by W. The board's tall cells consequently become wide cells. The logical nine-by-nine grid and three-by-three regions remain valid in either shape. Region membership, rather than pixel aspect ratio, determines Sudoku correctness. See [existing board research](board-and-controls.md).

The same ideal rotation transposes individual key faces too. A portrait key W/5 wide by D/2 high becomes D/2 wide by W/5 high. Upright text may need different padding in the two layouts. There is no need to distort glyphs to fill those faces.

Real browser content areas need not swap exactly. Toolbars, display cutouts and installed PWA presentation can produce different usable bounds. Use the current viewport and safe insets as inputs rather than remembering the previous orientation's rectangle. [MDN documents environment safe-area insets](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env).

Dynamic viewport units track browser-interface changes, while small viewport units favor a stable area that fits when browser interfaces are expanded. Dynamic sizing may resize content during browser-interface changes. For a Fill space presentation, prefer the current usable viewport, with ordinary responsive relayout and no ornamental resize animation. Evaluate stability with browser controls visible and hidden. Do not assume `100vh` means the currently unobscured screen. [MDN viewport-unit behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length).

Layout orientation concerns the viewport, not the physical device. A narrow desktop window can be portrait and an on-screen keyboard can change its aspect ratio. Fit decisions should use available dimensions; avoid device-name detection or forcing orientation. [MDN orientation](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/orientation), [WCAG orientation](https://www.w3.org/WAI/WCAG22/Understanding/orientation.html).

## Key-order alternatives

| Landscape order, rows separated by semicolons | Benefit | Cost |
| --- | --- | --- |
| **1 2; 3 4; 5 6; 7 8; 9 More** | Ascending left-to-right scan; 1 starts top-left and More ends bottom-right in both layouts | Individual keys change neighbors and row grouping during rotation |
| 1 6; 2 7; 3 8; 4 9; 5 More | Keeps portrait's 1 through 5 and 6 through More groups as two columns | Ascending sequence moves down then across; row scanning jumps between groups |
| 6 1; 7 2; 8 3; 9 4; More 5 | Literal clockwise spatial rotation of the portrait positions | Starts with 6, puts More bottom-left, and requires the player to interpret a rotated sequence |

The grouping alternative is defensible if preserving those groups is the stronger preference. The literal rotation offers the weakest initial scan predictability. None preserves identical screen coordinates and an upright row sequence at once. Do not claim that spatial rotation automatically preserves muscle memory, especially when the grip also changes.

Whichever order is chosen, keep sequential focus logical and retain focus on the same control through relayout. WCAG permits more than one meaningful sequence, including row or column order, and advises reinforcing the reading order implied by the layout. Row-major is a recommendation, not a WCAG mandate. [WCAG focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html).

## Challenge the area assumption

Fill space maximizes area under the chosen dock, but its shortest cell dimension still limits upright digits and the three-by-three note matrix. Taller portrait cells do not gain width; wider landscape cells do not gain height. Size text against both dimensions and padding, and keep each candidate in its stable position. Inspect all nine candidates, sparse candidates, selection, conflicts and region borders. Avoid filling tall or wide cells with stretched or excessively spaced glyphs merely to use their area.

For an illustrative already-usable board area of 360 by 660 CSS pixels, Fill space yields cells about 40 by 73, while Square yields 40 by 40. Under an exact transpose, the filled cells become about 73 by 40. Their area is identical, and the short dimension is unchanged. These are geometry examples after subtracting chrome, safe areas, dock and gaps, not phone measurements.

Measure target width and height separately. WCAG 2.2 AA has a 24 by 24 CSS pixel minimum with exceptions; the enhanced AAA criterion uses 44 by 44. Large key targets are practical with ten keys split across two portrait rows or five landscape rows. A 360-wide board cannot make all nine adjacent cells 44 pixels wide, and stretching its height does not change that. Do not infer an automatic Sudoku exception or let neighboring cell targets overlap. [Target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [enhanced target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html).

An opaque filled board also exposes less of the colored pond backdrop. That is a predictable visual consequence, not a correctness problem. Maintain the frog-world identity through menu art, the dock and restrained theme roles without tinting the board so strongly that candidates or conflicts lose clarity. Perceived visual balance requires mockups; more colored area is not a substitute for readable cells.

## Square mode and preference boundary

Use the largest square that fits inside the same board allocation. Center it within that allocation and let unused space show the existing decorative background. Keep dock geometry unchanged so toggling board shape does not move number entry. Do not fill the spare area with new controls, copy or decorative gameplay frogs.

Persist one global board-shape preference separately from puzzle saves, theme and appearance. It should apply to both modes and both orientations without changing puzzle contents or completion history. No separate per-orientation preference, aspect-ratio slider or automatic shape-switching system is needed.

**Board shape: Fill space / Square** states the visible result more directly than **Board fit: Stretch / Square**. Fill space also avoids suggesting distorted digits. Localize the setting and values in English, German and Spanish; do not store translated strings as preference identifiers.

## Conflicts to resolve in the next visual comparison

- The current proposal removes the separate top overflow. That resolves the conflict between an edge-to-edge board and a floating button's footprint. If the top overflow returns, it must not cover a clue, note or selection target.
- Moving entry to the right in landscape is a functional input-dock proposal. It changes the earlier bottom-entry direction and should be recorded explicitly. It does not authorize a decorative or dashboard sidebar.
- More occupies the tenth keypad position and is proposed to open Notes, Undo, Erase, Hint and a Settings entry directly in one overlay. Tray dimensions, sticky notes indication and open-tray board geometry still need review. Do not add another permanent tools row or a separate overflow button.
- A two-column dock is plausible on phones and wide desktops, but a desktop-height dock can create unnecessarily tall buttons. Exact dock depth, gaps and large-screen limits need visual comparison. Avoid fixing the whole design to one phone's rotated pixel measurements.

Compare identical puzzles and candidates in portrait and landscape, both board shapes, browser and installed PWA presentation, both landscape directions, text enlargement, English/German/Spanish, and visible keyboard focus. Include the existing 360 by 800 and 393 by 873 CSS-pixel references and their landscape counterparts. Check actual touch reach with either hand. ImageGen comparisons remain temporary concepts and cannot verify hit targets or a correct Sudoku grid.
