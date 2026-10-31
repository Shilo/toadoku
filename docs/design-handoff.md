# Design handoff: resume here

Status: 2026-10-31. **Inward circular pads and board B, Winding shallows, are selected.** This file records the agreed direction after the visual comparisons. It is sufficient to resume design discussion without the chat.

## Authority and project state

Read this handoff, [UI/UX](ui-ux.md), [visual constraints](design.md), [decisions](decisions.md) and [TODO](../TODO.md) before relevant research. Accepted requirements override historical research and incidental generated-image details. A research recommendation is not a new approval. Preserve alternatives without reopening selected decisions by default.

The repository currently tracks documentation and guidance. Interface experiments, their dependencies, builds, screenshots and AI concepts remain under ignored `prototypes/`. No prototype has been promoted into production. The latest request is documentation and future research planning, not implementation of cutouts or animation.

Keep user-facing discussion extremely concise and proceed one topic at a time. Use ImageGen to explore new visual directions before interface experiments. Use measured temporary layouts when verifying exact geometry. Never record personal motivation or relationship context.

## Product and delivery

**Toadodu** is a cute frog-themed classic numbered 9x9 Sudoku game. Preserve ordinary digits, rows, columns, nine 3x3 boxes, immutable clues and familiar solving behavior. The world is full screen, colorful, minimal and top-down. No dashboard, marketing text, gameplay mascot, conventional grid/frame, permanent HUD or added action bar.

Approved stack: Svelte, TypeScript and Vite; GitHub Pages, PWA installation and offline play; JavaScript delivery without required WebAssembly or backend. Separate Sudoku rules, session, presentation, themes, localization and persistence. No game engine or shader dependency has been selected.

English, German and Spanish are required. Persist language, theme/appearance and puzzle progress locally. Browser language is an initial default, not a replacement for a saved explicit choice. See [architecture](architecture.md) and [technology findings](research/technology.md).

## Two naming systems: do not confuse them

| Category | Selected | Preserved |
| --- | --- | --- |
| Overall scene treatment | C, Quiet Flat, now developed into a three-color abstract pond | B, Layered Pond; A, Expressive Gradient |
| Board water composition | B, Winding shallows | A, Connected bays |
| Pad placement | Inward within each 3x3 group | Centered, for comparison/history |

Scene treatment C remains the modular starting style. Selecting board B does not select the older scene treatment named B.

## Shared pond background

Menu and gameplay use **the same exact three solid water colors** with broad abstract organic curves. The working study values are deep teal `#0D6267`, middle teal `#329D9A` and pale mint `#7ED1B8`; exact production palette/contrast and light/dark variants remain to be validated. Do not silently add a fourth water tint, gradient, opacity blend, texture, reflective lighting or detailed ripple rings. Pad faces/lips, cream controls, ink and placeholder art are outside the three-water-color limit.

The menu uses sweeping connected water/shallows shapes around a quiet central composition. Gameplay B assigns whole-group fills:

```text
A B C
B C A
C A B
```

These letters identify the three water fills, not additional themes. Use naturally winding shared contours and selective curved junctions, not nine trays, cards, straight panels or subtly wavy rectangles. Unused water inside stretched cells provides room for curves. All visible circles, their lips and labels in one group stay within its assigned fill. A color boundary in unused cell water never changes the logical cell or hitbox.

Preserved board A uses `A B A / C A C / A B A`: four organic bays at regions 2, 4, 6 and 8 over one connected base. It is liked but not selected; do not add a public A/B selector.

Earlier subtle alternating pad greens were ineffective, rectangular water backings felt like UI panels, and blank water with only small marks lacked the desired pond character. Preserve those studies as history.

**New future requirement:** animate the menu and gameplay water slowly so it feels alive. A simple drift/deformation of the existing shapes is a candidate; a shader is only an option to investigate. Keep the flat palette and readability. Implementation, renderer, motion parameters and performance testing are outstanding. Respect reduced motion with a static rendering. Do not move pads, labels, hitboxes or the dock with the water. See [future visual research](future-visual-research.md).

## Gameplay layout and input

Fill space is the default. The logical board fills every remaining pixel after the single scene inset, fixed dock and board/dock gap. The board remains rectangular when the available area is rectangular; no extra wrapper padding, decorative header, scenic strip or artificial aspect-ratio cap. Preserve logical cell identity and upright, unstretched glyphs through rotation.

Exactly ten dock keys:

```text
Portrait, bottom             Landscape, right
1 2 3 4 5                    1 2
6 7 8 9 More                 3 4
                             5 6
                             7 8
                             9 More
```

More is visible but disabled in the tenth position; there is no top overflow or replacement Tools key. A future shared overlay may show regular options plus tools alongside in gameplay, without a nested Tools step. Narrow-screen stacking is unresolved. Common tools to restore later are Notes, Undo, Erase and Hint. Do not invent gestures to make the disabled demo seem complete.

Square remains a planned independent persistent preference. When implemented, center the largest square in the same allocation and keep the dock fixed. User access to that setting is deferred with More/Settings.

## Two spacing values only

| Location | Authored size |
| --- | --- |
| Neighboring full rectangular cell buttons | Small: 4 CSS px |
| Neighboring action/menu buttons | Small: 4 CSS px |
| Gaps between logical 3x3 groups | Large: 8 CSS px |
| Menu/gameplay scene edges | Large: 8 CSS px |
| Board-to-dock gap | Large: 8 CSS px |

Large is always twice small; use the same two tokens in both scenes and orientations. Apply each inset once. Real system safe areas are additional device constraints, not a third theme token. Font sizes, radii, control dimensions and lip thickness are not padding sizes.

Circular faces leave extra water within stretched cells, so their visible separation is not a constant 4px. That is a consequence of aspect ratio and alignment, not extra authored padding. The earlier zero-edge-padding rule is superseded by the single 8px scene inset.

## Pads: selected inward geometry

Every logical cell is a full stretched rectangular button, including water. The decorative green pad keeps a **1:1 bounding box**, sized to the shorter cell dimension. Its current baseline is a circle with 50% radius, opaque number area and soft-raised finish. Keep lip/highlight inset inside its bounds; do not make an oval, stretch digits or shrink the clickable area to the pad.

Align the circle toward the center of its own group:

| Position within the group | Vertical | Horizontal |
| --- | --- | --- |
| Top-left | Bottom | Right |
| Top-middle | Bottom | Center |
| Top-right | Bottom | Left |
| Middle-left | Center | Right |
| Center | Center | Center |
| Middle-right | Center | Left |
| Bottom-left | Top | Right |
| Bottom-middle | Top | Center |
| Bottom-right | Top | Left |

Digits and fixed-position candidates move with their pad. Only axes with spare cell space visibly shift: primarily vertical in portrait, horizontal in landscape. Global rows and columns still form straight lines; their spacing becomes uneven at group boundaries. Centered placement is preserved as a comparison, not the active direction or a new setting.

Water and decorative shapes ignore pointer input. A transient full-rectangle selection/focus cue may explain the actual target without permanent grid borders. Keyboard movement follows logical rows/columns, never the apparent water shape.

**New future refinement:** add researched procedural splits/cutouts and possibly a restrained irregular perimeter so the pads read more like abstract lily pads. This changes silhouette/masking only, not the approved green palette, shadow/lip style, inward placement, 1:1 envelope or full rectangular hitbox. Keep the text/candidate zone intact. Exact holes, edge treatment, variation and generation method are not selected or implemented. The perfect circle is the current geometric baseline; future irregular edges/cuts remain inside its 1:1 envelope. See [research and acceptance tasks](future-visual-research.md).

## Buttons and solving readability

Cream/ivory menu and action buttons remain distinct from green pads. Preserve their soft-raised rounded-square/capsule family, shallow lower lip and restrained highlight. Do not redesign them during water/pad-mask experiments. Disabled More is muted and exposes disabled semantics.

Use solid readable numerals, a quiet opaque face, stable note positions and non-color selection/conflict/focus cues. Recognizing regions must not depend on hue alone. Theme display fonts can be playful; number recognition comes first. Exact production fonts are open; the measured study uses local Outfit as a prototype choice, not final font approval.

At representative phone sizes the circular diameter is about 33.77 CSS px. The existing nine-note example uses very small candidate text and is **not approved production typography**. Validate notes, givens/entries, errors and focus before accepting the full solving UI; a selected visual direction does not waive readability.

## Main menu and feedback

Show Quick Play above Progression in a bottom-left block in both orientations. Disabled More sits bottom-right aligned with Progression. Title and one combined menu image stay higher; adapt their composition to orientation without moving the mode block to the right.

Quick Play reveals difficulty choices in the same scene. Progression reveals existing-save/new-game choices in the same scene. Back returns to mode selection. No initial Play-only landing screen. Progression uses its schedule rather than an extra approved difficulty picker. Save-slot count, naming and replacement remain deferred; three slots and automatic overwriting are not selected.

The title is **Toadodu**. Use one intentionally rough black-and-white combined top-down/slightly oblique frog-plus-lily-pad placeholder containing a question mark/TEMP marker. It is one replaceable asset, not separate sprites or a polished mascot. Do not source sprite packs now. Human-made final illustration can replace it without restructuring the scene.

Gameplay has no decorative frog. Brief nonblocking start information and persistent completion results until Continue are agreed; no permanent currency/level/repeat HUD. Exact presentation remains open. A future non-timed secondary view must recover session information. Start puzzle timing when the board becomes visible and interactive, not on first digit.

## Modes, terminology and scope

Quick Play plus randomized Progression are the only initial modes. Use a bundled pre-rated puzzle bank, not clue count as difficulty. Progression gradually rises through a schedule; after its final frontier level, the next run returns to easiest with the repeat counter incremented. Continue starts the next board. Completed levels can be revisited with fresh random puzzles; protect furthest advancement and active saves.

Names: **Metamorphosis** for repeat counter, **Leap** for level, **Dewdrops** for currency. No power-ups, transformation mechanic or prestige bonus is implied. Both modes and fresh revisits earn score/currency based on difficulty, speed and efficiency. Scoring formulas, assistance treatment, numbers, repeat length, catalog and some replay policies remain open. No store, purchases, spending, upgrades, leaderboard or cloud backend is approved. See [progression](progression.md) and [scoring](scoring.md).

## Theme and art boundaries

Basic Pond only for the current milestone. Halloween, seasonal switching and event dates are deferred. Automatic/fixed theme selection, independent light/dark/system appearance and persistence remain future requirements. Preserve support for optional human-made PNG/JPEG/WebP backgrounds with CSS fallback, without selecting an image or adding a theme editor/plugin framework.

Theme data may change UI tokens, backgrounds, motion, font roles and localized copy. It must not change Sudoku logic, cell identity, input state or saved progress. Shared menu illustration remains the same across themes, without recolors or accessories.

Production artwork must be human-made with suitable provenance/license. AI images and illustrations are temporary ignored concepts only, never production assets. Procedural UI masks and scene geometry are presentation code, not permission to ship generated botanical illustrations.

## Saved visual references

The complete file/hash registry is [design-artifacts.json](design-artifacts.json). Paths below are local ignored files; they survive chat clearing in this workspace, but are not backed up by Git.

| Purpose | File |
| --- | --- |
| Selected inward gameplay, portrait | [portrait-inward.png](../prototypes/circular-pond/portrait-inward.png) |
| Selected inward gameplay, landscape | [landscape-inward.png](../prototypes/circular-pond/landscape-inward.png) |
| Selected inward plus preserved centered comparison | [centered-inward-review.png](../prototypes/circular-pond/centered-inward-review.png) |
| Latest measured menu, portrait | [portrait-menu.png](../prototypes/motorola-spacing/portrait-menu.png) |
| Latest measured menu, landscape | [landscape-menu.png](../prototypes/motorola-spacing/landscape-menu.png) |
| Broad organic B style and preserved A comparison | [menu-and-gameplay.png](../prototypes/organic-three-color-pond/menu-and-gameplay.png) |
| Original selected B reference | [reference-winding-shallows.png](../prototypes/circular-pond/reference-winding-shallows.png) |
| Latest ImageGen exploration and exact prompt | [concept](../prototypes/circular-pond/imagegen-concept.png), [prompt/readme](../prototypes/circular-pond/README.md) |
| Earlier scene A/B/C alternatives | [prompts and descriptions](../prototypes/flat-theme-study/prompts.md), [visual directions](visual-directions.md) |
| Soft-raised button reference | [button-style-comparison.png](../prototypes/quiet-flat-controls/button-style-comparison.png) |

The latest menu reference is the menu only: the older gameplay panels in its contact sheet are superseded. Likewise, use the organic B sheet for water character, not its obsolete stretched-pad geometry, excess spacing or generated text. Do not copy ImageGen mistakes as measurements. Unselected drafts/debug images remain history.

## Verification and remaining work

Representative Motorola G31/G32 emulation: portrait 360x800 and landscape 800x360 CSS px at DPR 3, giving 1080x2400 and 2400x1080 PNGs. These are assumptions matching physical-resolution targets, not observed device CSS viewports. Browser chrome, Android scaling and safe areas require real-device measurement.

The existing measured studies pass circle bounds, inward formulas, 81 full-cell buttons, ten dock keys, 4px/8px slot gaps, no overflow, three shared water fills, sampled visible-circle containment, water-corner hit testing, selection from water and logical arrow navigation. Their scripts and measurements are saved locally. This proves those demo checks, not a working Sudoku engine, full accessibility, readable tiny notes or Motorola performance.

Still to do: research and mock up cutouts; research, implement and profile water animation; actual-phone/browser/PWA checks; notes and solving states; tool access; final palette/fonts/art; save policy, scoring and progression numbers. Keep the backlog in [TODO](../TODO.md). No additional implementation should be inferred from this handoff.

## Handoff audit

The 2026-10-31 audit scanned all 34 Markdown documents, checked local links/anchors and the privacy/no-em-dash rules, and reconciled current alignment/motion status. Research records explicitly defer to this handoff so old proposals do not override decisions. The registry indexes 68 saved files, including 40 PNG images, with content hashes; the four selected menu/gameplay originals retain the expected physical dimensions. All indexed files exist locally and remain ignored. Layout-source and measurement references are retained for reproduction. This is a documentation/artifact audit, not an animation, cutout or real-device test.

## Resume after clearing chat

Open this file first, then the selected visual references and the relevant topic document. The chosen direction is **basic Quiet Flat Pond, three-color Winding shallows B, inward 1:1 pad faces, full stretched clickable cells, soft-raised cream controls, 4px/8px spacing and bottom/right docks**. Procedural cutouts and animated water are approved future goals with research/implementation/testing still outstanding. Do not restart the visual comparison or treat those future goals as already implemented.
