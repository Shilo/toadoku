# Main-menu flow

## Agreed interaction

Show both mode choices immediately in the main scene. Quick Play and Progression are working mode labels; final names remain open.

| Selection | Same-scene choices | Back |
| --- | --- | --- |
| Quick Play | Select a difficulty, then start the puzzle | Return to mode choices |
| Progression | Continue/select an existing save, or start a new game | Return to mode choices |

Use a change of menu state within the same illustrated scene, not a new page or dashboard. Avoid an extra Play landing screen before mode selection. Preserve the minimal text and control constraints. Exact transitions, start-button behavior and visual layout require mockup review.

Place the main action choices in the lower, reachable portion of the scene where practical. Keep Back with the lower interaction area, without introducing a header bar. Main-menu artwork can retain the frog even though gameplay now omits it. Quiet Flat C is the starting scene treatment.

Quick Play has explicit difficulty selection. Progression follows its saved or initial difficulty schedule; a separate Progression difficulty picker is not approved.

## Save slots postponed

The proposed three-slot limit is an idea, not a selected policy. Slot count, naming, creation, deletion, replacement confirmation and backup behavior are deferred. Do not automatically overwrite a save or encode a slot limit before that discussion.

The eventual menu must allow returning from save selection to the two mode choices. Do not design a large save-management screen during the current main-menu exploration.

## PWA installation proposal

A small Install app entry could live in the overflow when installation is available and the app is not already installed. Keep browser-specific install steps secondary to playing; do not require installation to access either mode or show an always-present install button. This placement remains a proposal.

Current recommendation consolidates gameplay tools and secondary navigation under the tenth keypad key, More, removing the old top overflow. Main menu can retain a small lower More entry for Settings; it does not need a numeric dock. Prefer a short primary tool popup plus Settings rather than embedding a long preference list alongside Notes. See [current UI and UX](ui-ux.md).

## Artwork

Follow the [human-made production artwork policy](design.md#artwork-policy). AI-generated mockups can explore the flow and atmosphere, but are temporary, clearly labeled and ignored by Git.
