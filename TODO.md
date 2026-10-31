# Deferred work

## More and settings

- [ ] Keep More visibly disabled in the current menu and tenth gameplay-key position; do not open a placeholder popup.
- [ ] Review one shared menu: regular options in the main menu; regular options plus tools to their right in gameplay. Test narrow-screen stacking before choosing two columns.
- [ ] Compare that idea against the previous direct-tools-plus-Settings proposal without adding a nested Tools step.
- [ ] Restore Notes, Undo, Erase and Hint access, sticky Notes state, accessible dismissal/focus and session information.
- [ ] Expose the planned Fill space / Square preference when Settings is available. Do not claim it is user-accessible while its only entry point is disabled.
- [ ] Revisit optional PWA installation placement; browser installation does not require an in-game More menu.

## Themes and art

- [ ] Defer Halloween artwork, palette, seasonal dates and automatic event switching until basic Pond gameplay is settled. Preserve earlier research, do not implement it now.
- [ ] Replace the deliberately provisional black-and-white question-mark frog-plus-pad image with one human-made composite asset. Final provenance and rights still apply.
- [ ] Asset-pack sourcing and purchases are deferred; a placeholder is the current direction.

## Selected design: future visual refinements

- [x] Select inward 1:1 pad placement and B, Winding shallows. Preserve centered and board A as historical alternatives. Resume from [design handoff](docs/design-handoff.md).
- [ ] Research real lily-pad references for splits, cutouts and a restrained irregular edge. Distinguish actual openings from surface markings before choosing procedural masks/paths.
- [ ] Mock up and review the minimum procedural silhouette treatment inside the same 1:1 bounds. Preserve inward placement, green colors, raised lip/highlight, opaque number/note zone and full rectangular hitboxes. No generator/variation policy is selected.
- [ ] Research slow water animation for both menu and gameplay: compare simple shape drift/deformation with a shader only if the visual benefit justifies it. Preserve the three-color flat B composition and static puzzle geometry.
- [ ] Implement/test motion only after that research and review: complete-phase pad containment, reduced-motion/static fallback, hidden-page behavior, input/keyboard, resize/rotation and actual Motorola performance. Both cutouts and animation are unimplemented now. Follow [acceptance plan](docs/future-visual-research.md).

## Design and gameplay decisions

- [ ] Validate the new top-down pad board: recognizable 3 by 3 groups without grid lines, nine-note readability, immutable clues, focus/selection/conflicts and rectangular hitboxes.
- [ ] Test full-allocation Fill space with 4px/8px spacing at actual portrait/landscape sizes, including safe areas and the Square alternative. Existing representative emulation passes do not certify physical hardware.
- [ ] Settle score/currency formula, progression schedule, catalog and repeated-level policies.
- [ ] Discuss save slots and replacement policy. Three slots and automatic overwriting are not selected.

This is a backlog, not implementation approval. Keep temporary mockups/code under ignored `prototypes/`.
