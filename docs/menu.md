# Main-menu flow

Current activated gameplay supersedes the historical preparation notes below. Quick Play has Easy/Medium/Hard and a separate Resume action. Progression has Start/Resume and Completed Leaps. Each role retains its own attempt; there is no slot manager. Menu More opens a compact popover with Settings, a separator and one Version link. Gameplay More groups Tools on the left and Menu on the right; its Menu column includes the same separated Version link. There is no extra dock key or permanent HUD. Small related choices use a popover; larger tasks use a bottom sheet on mobile and a centered desktop dialog, with equal four-corner radii.

In the maintained application, every main-menu action uses the same responsive layout-owned height across base, Quick Play and Progression, including More. Opening Settings or a nested window preserves the current menu underneath and returns focus to More on dismissal. Gameplay overlays retain the owned board and dock in place behind the native modal backdrop. Readable dialogs remain timed; explicit Pause/restore blur the scene while suspending study. See the current [theme authoring contract](theme-authoring.md#implementation-boundaries).

Install and offline is available through More → Settings from either screen. Installation is optional. The primary preparation action targets 3 upcoming puzzles per difficulty; More offline options contains the 25-per-difficulty travel action and storage cleanup. Progress, cancellation and consequential readiness/update messages remain directly visible. See the [practical offline checklist](pwa-system.md#player-workflow) and [accepted PWA implementation](pwa-acceptance.md). The installation proposal in the historical notes below is superseded by this implemented flow.

The Version item uses the existing PixelDoll-style commit-count version calculation and opens the public repository in a new tab using a native link. It does not introduce a separate GitHub item, connectivity check or setting. The current game stays open. Native dialog focus, keyboard access, Escape/outside dismissal and browser Back follow the existing overlay ancestry; Settings Back restores its More parent. The [deferred privacy task](../TODO.md#more-and-settings) removes the link behavior if the repository becomes private while retaining the version text.

Routine study-time checkpoints must not change an open dialog's geometry. Quick saves show no transient footer. A save still pending after one second shows Saving; once a status row has appeared it stays for that pane, reverting to the neutral Automatic saving label after acknowledgement instead of alternating Saving/Saved on every heartbeat. Errors and recovery remain immediate. Pane changes and unmount clear the timer. Save queues, acknowledgement, clock accounting and failure recovery are unchanged; this is presentation timing only.

Completed results remain until explicit Continue. Selecting another Quick difficulty opens the retained result with a visibly labelled target, such as Continue · Hard. Reload retains the receipt but clears that transient choice; explicit Resume restores the result without silent allocation. Replacement and Continue bind the role identity the player reviewed, and reject a changed generation/role before fetching a new puzzle. Pending completion cannot be bypassed. See the [action audit](gameplay-action-audit.md), [state policy](gameplay-state-and-persistence.md#role-status-action-policy) and [actual validation progress](gameplay-progress.md).

## More menu and flicker validation

The lead and Iris challenged the menu plan against the local PixelDoll toolbar, native dialog/link semantics and existing history. PixelDoll has separate source and commit-version links; this task uses the single root-repository Version item requested by the user. Native links need inclusion in the custom Tab loop and button-equivalent focus styling; main More needs its actual button anchor and explicit non-game context even when a saved game exists. The native modal remains a dialog rather than adopting an incomplete ARIA menu keyboard model. See [native dialog semantics](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) and [native links](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a).

Mira reproduced the reported layout flicker in a production browser: the one-second acknowledged study checkpoint briefly inserted a Saving footer. More moved between 314.80 and 362.66 CSS px high; Settings moved between 760.70 and its 784 px viewport cap. Footer pulses lasted about 1.2 to 17 ms. Native showModal/close counts did not change, ruling out dialog remounting in this reproduction. A clean menu with no active study stayed stable. These are layout/mutation measurements, not a claimed count of painted frames or physical-phone evidence.

After reciprocal challenge, the fix waits one second before showing routine pending feedback, then retains that row for the pane with a neutral label. Always reserving blank space would burden every popover; suppressing pending feedback indefinitely would hide a real stalled write; showing Saved while pending would be false. The neutral label also avoids repeat announcements after recovery. The one-second choice follows the flow/feedback boundary in [Nielsen's response-time guidance](https://www.nngroup.com/articles/response-times-3-important-limits/); it is a chosen application threshold, not a browser requirement. The effect depends on semantic save state and pane only, so repeated pending publications cannot postpone its deadline. Svelte autofixer reported no issues; timer effects and their cleanup were reviewed as intentional asynchronous feedback.

Local gates passed: 714 unit tests across 84 files, Svelte/Node type checks, production build and full offline artifact validation. The focused production menu test passed 18 menu/locale/orientation combinations, actual Tab/Shift+Tab/Enter link activation, Back/Forward consumption, Settings parent restoration, outside/Escape focus return, retained-game isolation, keyboard inertness and offline version display. The save-flicker regression monitored More, Settings, Hint, Backup and PWA controls for more than six checkpoints each with exactly one geometry and no native remounts. A deliberately held native IndexedDB completion showed delayed feedback; acknowledgement retained stable geometry and six more checkpoints caused no footer text changes. An injected quota error exercised native transaction abort and retry through the real storage path; recovery controls appeared immediately, and retry preserved entries, notes, wallet and over 40 seconds of acknowledged time. This tests recovery handling, not actual browser storage exhaustion. Periodic PWA inspection did not reproduce another layout issue, so no speculative PWA fix was added.

The native two-window update/cold-offline journey also passed with the new menus and saved progress, plus the existing preferences/notes/undo/geometry/reward regression. Browser jobs used one worker and heavy jobs ran serially. Evidence is ignored under `prototypes/pwa-validation/menu-flicker/`, `version-menu-*`, `menu-*` and the corresponding bounded-run receipts. External GitHub navigation responses are fulfilled only in local destination tests; real-link and deployed-app verification are recorded separately after publishing. Existing PWA harnesses use a small dependency-free Settings adapter so both preserved direct-Settings releases and the current More → Settings path remain reproducible without initializing Playwright early.

Live validation, 2026-11-01: [Pages run 41374926626](https://github.com/Shilo/toadoku/actions/runs/41374926626) passed all 714 tests, type checks, build, retained-artifact validation and actual hosted-byte/header verification. Version 0.0.45 comes from commit `6b5418af17aa46f813cf0a3d12b694abb00dd1d1`, build `88c249446ab63c9cee6f85b03c4b9c755f68a86d94093acef426b4105561c7d3`. The lead personally tested the published site with Codex browser: the old 0.0.44 app downloaded its update, normal close/reopen activated 0.0.45, and the retained Quick Play game resumed. Both Version items opened the actual public source repository in separate tabs. Main-menu Settings and Back restored the correct parent. Gameplay More retained the same observed geometry across GitHub navigation; seven Settings observations spanning over six seconds had identical geometry and no footer. These deployed observations complement the local frame-by-frame regression; they do not replace it or prove physical Android behavior. Screenshots and observations are ignored under `prototypes/pwa-validation/live-version-menu-*.png` and `live-menu-observations.json`.

## Historical preparation context

Gameplay handoff update, 2026-10-31: the tracked UI already enables gameplay More with Resume and Back to main menu. The next activated [gameplay phase](gameplay-implementation-handoff.md) expands tools/Settings, entry, resumable Quick Play/frontier/replay roles and persistent results. Its [role/status policy](gameplay-state-and-persistence.md#role-status-action-policy) and validation matrix govern replacements, pending completion, Continue, focus/history and failures. It does not introduce arbitrary named save slots or an extra permanent key/HUD. Functional persistent Fill space/Square is required when Settings is implemented. Older disabled-More and unresolved save-policy statements below are historical; preparation remains documentation-only.

Production UI phase delta: the prototype is complete. The [new handoff](production-ui-handoff.md#7-screen-states-more-and-navigation-behavior) requires an enabled gameplay More popup with Resume/Close and Back to main menu, including touch, keyboard and browser Back behavior. Older disabled-More statements below describe the completed prototype. Main-menu More contents and functional Settings/tools remain outside the specified minimum scope. This handoff-only task does not implement those changes.

## Agreed interaction

Show both mode choices immediately in the main scene. Quick Play and Progression are working mode labels; final names remain open.

| Selection | Same-scene choices | Back |
| --- | --- | --- |
| Quick Play | Select a difficulty, then start the puzzle | Return to mode choices |
| Progression | Continue/select an existing save, or start a new game | Return to mode choices |

Use a change of menu state within the same illustrated scene, not a new page or dashboard. Avoid an extra Play landing screen before mode selection. Preserve the selected main-menu layout. Exact submenu transitions and start-button behavior still require review.

Place Quick Play above Progression in a bottom-left block in both orientations. Put More at bottom-right, aligned vertically with Progression, rather than moving the mode block to the right in landscape. Title and the combined placeholder remain higher over water at fixed layout anchors. Reserve the maximum Progression label plus three action-button rows for every submenu, so the identity and shore height do not reflow when choices change. Keep Back with the lower interaction area. More is disabled for now; no settings popup is functional. See [current UI and UX](ui-ux.md).

Quick Play has explicit difficulty selection. Progression follows its saved or initial difficulty schedule; a separate Progression difficulty picker is not approved.

## Save slots postponed

The proposed three-slot limit is an idea, not a selected policy. Slot count, naming, creation, deletion, replacement confirmation and backup behavior are deferred. Do not automatically overwrite a save or encode a slot limit before that discussion.

The eventual menu must allow returning from save selection to the two mode choices. Do not design a large save-management screen during the current main-menu exploration.

## PWA installation proposal

A small Install app entry could live in the overflow when installation is available and the app is not already installed. Keep browser-specific install steps secondary to playing; do not require installation to access either mode or show an always-present install button. This placement remains a proposal.

More functionality and installation placement are deferred. A recorded future alternative is regular menu options plus an adjacent tools column in gameplay, with no separate Tools submenu. The current mockup must not suggest that the disabled More key opens anything. See [TODO.md](../TODO.md).

## Artwork

Follow the [human-made production artwork policy](design.md#artwork-policy). AI-generated mockups can explore the flow and atmosphere, but are temporary, clearly labeled and ignored by Git.

Use one combined frog-and-lily-pad image, intentionally rough black and white with a conspicuous question mark/template cue. Do not make separate frog/pad files or a polished character for this milestone. A later human-made image can replace it without changing layout. The selected camera is overhead pond water with a top-down or slightly oblique top-down placeholder, not a horizon scene.

Menu and gameplay share three solid water fills, two ground roles and 4px/8px spacing. The menu's abstract wet reed #6D9F81 to dry sage #B6BA86 shore supports all actions and reserves the largest submenu height. It bleeds through left/right edges in portrait; the landscape connected cove keeps modes left and More right while continuing ground to the vertical edges. Avoid a straight separator or rectangular backing.

The title uses licensed local Chewy only in this prototype; UI/digits retain Outfit. Title and art receive the pond-floating token, with seeded subtle float targeting about 1.8px inside their fixed anchors. Reduced motion is static and hidden work pauses. Keep the combined black-and-white art deliberately childish and scribbly. The baseline water renderer exists; current refinement/test status is in [prototype progress](prototype-progress.md).

CSS sets the shared maximum menu allocation on the first layout, without waiting for a resize observer. It is 240.8 CSS px at the representative phone dimensions. Geometry measurements may feed the shore renderer, but cannot move the initial identity anchors or change reservation between submenus.
