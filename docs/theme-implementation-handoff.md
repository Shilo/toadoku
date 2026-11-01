# Isolated theme implementation handoff

Implementation status: [theme progress](theme-progress.md) records the explicitly activated isolated `codex/themes` branch, validation and remaining integration/hardware limits. The brief below remains its scope contract.

This brief activates the theme task only when the user sends it to a new agent. Work autonomously in a separate Git worktree and branch. Gameplay continues independently in the original checkout and must finish before theme integration.

## Isolation and ownership

Use [Git's separate worktree mechanism](https://git-scm.com/docs/git-worktree), which provides a separate working tree, HEAD and index while sharing repository objects. Keep branch and configuration operations scoped accordingly.

- Original checkout: `C:\Programming_Files\Shilocity\Therra\toadoku`. Do not edit it. Gameplay production checkpoint: `c749448`.
- Use a separate Codex chat/worktree on `codex/themes`, based on current committed main. Place it outside the original checkout. Verify your working directory and branch before editing. Do not reset, clean, stash, rebase or modify gameplay, its refs or other worktrees. Do not change global/common Git configuration or prune/remove other worktrees.
- Keep your dependencies, ignored experiments and test artifacts inside your worktree; do not share writable `node_modules` with gameplay. Use a separate development port and disposable browser origin, for example `5195`, and an independent browser session/context. Do not claim the gameplay tab, change its viewport or use its saved data. Coordinate visual review if the browser cannot be isolated.
- Own theme modules, tokens, decorative scene/cell treatments, theme selection presentation and theme tests. Keep changes to shared App/settings/localization files narrow and reviewable. Do not alter rules, hints, sessions, scoring, modes, catalog, certificates or storage schemas. Theme/appearance are already opaque preference strings: use the existing compare-and-swap preference pipeline, without direct database/localStorage writes. Propose any necessary contract change separately.
- Commit green Conventional Commit slices. Deliver your branch, integration notes and outstanding limits. Do not merge or apply changes to gameplay main without later coordination.

## Read before implementation

Read [AGENTS](../AGENTS.md), [themes](themes.md), [earlier theme research](research/theme-structure.md), [design handoff](design-handoff.md), [design](design.md), [UI/UX](ui-ux.md), [production UI progress](production-ui-progress.md), [architecture](architecture.md), [asset provenance](production-assets.md), [future visual research](future-visual-research.md), [gameplay progress](gameplay-progress.md) and [action audit](gameplay-action-audit.md). Follow their relevant links. Inspect actual maintained source rather than copying prototype code.

This user activation supersedes historical theme-deferral wording for your isolated worktree only. The gameplay lead remains responsible for gameplay completion. Preserve Svelte + TypeScript + Vite, not SvelteKit. Load the local Svelte writing/best-practices skills before Svelte work; keep vendored skills unchanged.

Use named specialists for bounded theme concepts/research and independent challenge. Research primary documentation for token architecture, CSS custom properties, lazy loading, font licensing/metrics, contrast, motion and native scrollbars. Research Cauldron references too. Challenge every material plan, including your own, and the user's proposed objects/styles. Record concise evidence, alternatives, counterexamples and decisions in `docs/theme-progress.md`. Review actual implementation independently.

## Current visual boundary

Latest active polish direction: challenge and improve the entire theme while retaining the flat full-screen interaction design. Dedicated orange-stew Cauldron liquid/motion, recognizable floating ingredient faces, manufactured pot curves, complete material boundaries, informative Auto status and robust Pond curves across screen proportions are explicitly authorized. Earlier conservative cream/radius choices below are a baseline, not a requirement to stop at a plain recolor. The original rejected mockup remains rejected. New reference-based studies and whole-theme acceptance are recorded in [theme progress](theme-progress.md#reopened-whole-theme-polish).

Latest user refinements permit a narrow third ground/lip color and equal-height control rows, but prohibit a heavy gameplay-grid redesign. The pot edge has one regular concave curve. Preserve landscape board/right-dock allocation; a ten-key row is limited to suitable existing bottom-dock layouts. Narrow phones retain usable compact keys. The main menu may use a single base-action row while keeping submenu reservations and identity anchors fixed. These explicit refinements supersede the earlier two-ground-color and exact dock-row counts only within this bounded scope.

The user's subsequent correction requires preserving the established Quiet Flat C design and current visual choices. Theme work is an adaptation within that design, not a heavy redesign. Use the maintained screens, [design handoff](design-handoff.md), [design](design.md), [UI/UX](ui-ux.md) and [themes](themes.md) as visual authority. The first isolated ImageGen comparison is rejected in its entirety as a design direction. Preserve full-screen composition, Winding shallows B grouping, inward opaque near-circular faces, soft rounded controls, cream light surfaces, existing title/art anchors and exact spacing/dock geometry. Seasonal colors, readable title typography and restrained flat decorative treatments must stay within those boundaries. No scenic frame, enclosed pot illustration, new mascot, gradients or redesigned menu composition.

## Theme system

Build a small typed semantic token system. Theme swapping must update appearance coherently without changing gameplay state or geometry contracts. Cover:

- Title and normal font families, fallbacks, font colors, weights and necessary metric/line-height adjustments. Keep font sizes stable unless measured font differences require adjustment.
- Three liquid/background colors and two shore/vessel/UI-surface colors.
- Controls: faces, text/icons, highlights/shadows, pressed, selected, disabled, hover and keyboard focus states; button shape/radius/style.
- Windows, sheets, dialogs and popovers: surfaces, text, shadow and radius. Each individual surface must have equal radii on all four corners, including mobile sheets.
- Board cell appearance/material, clue/entry/note/conflict/selection/focus colors and non-color cues. Theme-specific artwork stays inside the existing cell faces.
- Scrollbars: transparent track/corner/button background, matching thumb and arrow-glyph color. Do not color the arrow's entire rectangle. Record native browser styling limits honestly.
- Relevant scene profiles, decorative materials and animation styles. Keep behavior separate from rendering.

Lazy-load theme implementations and theme-specific fonts/assets. Keep only small selection/event metadata eager. Prevent stale imports from applying an old choice or partially mixing themes. Avoid a generic plugin framework or unnecessary dependencies.

## Choices and calendar

- **Auto**: default. Resolve by the device's current local calendar date and supported event window.
- **Pond**: preserve the current appearance, organic water, wet/dry ground, frog-associated palette and lily-pad cells.
- **Cauldron**: Halloween liquid and vessel treatment.

Halloween is October 31 annually. Its window includes October 24 through November 7, inclusive. Outside supported events, Auto resolves to Pond. Use calendar boundaries rather than fixed millisecond offsets across daylight-saving changes. Do not hardcode today's date. Keep the policy small, deterministic and testable, including refresh/resume across a boundary.

Persist the selected preference separately from Auto's effective result. Auto is the default for fresh settings. Preserve existing saved Pond choices: legacy defaults and intentional choices are indistinguishable, so any migration needs a separately justified decision. Unknown theme IDs must degrade safely. Do not silently introduce a storage-schema change while gameplay is frozen.

## Cauldron direction

Brainstorm several coherent concepts with specialists, then use ImageGen for ignored mockups before new visual experiments. The starting idea is bubbling potion/stew beneath restrained dark metal vessel surfaces. Replace the organic shore silhouette with deliberate curved, human-made vessel geometry where that improves the composition.

Keep all three liquid colors and readable 3x3 group structure. Decorative bubbles must remain distinct from group boundaries, cell targets and logical state. Explore floating ingredient or potion-surface cell faces that retain opaque readable centers and familiar upright digits. Evaluate carrots, herbs, pumpkin pieces, bubbles and other motifs rather than accepting any suggestion automatically. Avoid visual noise, unnecessary gore and distracting motion.

Choose a cohesive Halloween palette, licensed display lettering and professional readable body font. Matte/enamel/metal controls may suit this theme better than Pond's smooth raised treatment; justify the decision. Theme style may differ substantially while interaction stays familiar.

Only Pond, the existing app identity/logo and the terminology Dewdrops/Leap/Metamorphosis remain frog-associated by requirement. Keep the existing logo/menu artwork unchanged. New frog animations, mascot transitions, extra features, store and purchases remain deferred.

ImageGen output is concept evidence, not approved production illustration. Follow the imagegen skill and asset-provenance boundary. Keep mockups ignored; use licensed assets and reviewed code-native functional geometry for implementation. Do not ship new AI bitmap illustrations without separate authorization.

## UX and acceptance

Preserve all 81 fixed rectangular targets, classic 9x9 rules, readable digits/notes/groups, ten dock keys, stable logical IDs/seeds, selection, progress and exact layout spacing. Theme changes must not reset clocks, reseed puzzles, move hitboxes or affect rewards/storage authority.

Keep the experience minimal and immersive: solving tools on the left and other menu actions on the right, compact popovers for small tasks, bottom sheets on mobile and centered dialogs on desktop. No permanent HUD or extra dock key. Use the installed Lucide system where appropriate. Keep English, German and Spanish text concise and human-readable.

Use unit tests for token completeness, calendar boundaries, selection/persistence, import races and state invariants. Reuse unchanged gameplay evidence. Browser work is for actual visual validation and critical integration only: batch interactions and capture meaningful states, not screenshots between clicks. Inspect Pond against its maintained baseline and Cauldron at representative portrait, short landscape and desktop sizes, including 320x568, 360x800, 800x360 and 1280x720. Check popovers/sheets, all four corners, scrollbars, contrast, focus, notes and reduced motion. Label emulation and unavailable hardware/zoom checks honestly.

Finish with passing relevant type/build/unit checks, focused visual evidence, licensing/provenance, concise decisions and a clean theme branch. Keep integration separate until the gameplay lead reports completion.
