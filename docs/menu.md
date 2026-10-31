# Main-menu flow

## Agreed interaction

Show both mode choices immediately in the main scene. Quick Play and Progression are working mode labels; final names remain open.

| Selection | Same-scene choices | Back |
| --- | --- | --- |
| Quick Play | Select a difficulty, then start the puzzle | Return to mode choices |
| Progression | Continue/select an existing save, or start a new game | Return to mode choices |

Use a change of menu state within the same illustrated scene, not a new page or dashboard. Avoid an extra Play landing screen before mode selection. Preserve the selected main-menu layout. Exact submenu transitions and start-button behavior still require review.

Place Quick Play above Progression in a bottom-left block in both orientations. Put More at bottom-right, aligned vertically with Progression, rather than moving the mode block to the right in landscape. Title and the combined placeholder remain higher in the composition. Keep Back with the lower interaction area. More is disabled for now; no settings popup is functional. See [current UI and UX](ui-ux.md).

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

Menu and gameplay share the same three solid water fills and 4px/8px spacing. The menu uses broad organic pond curves and should later gain restrained water motion after research/testing. The latest selected menu references and full restart record are in [design handoff](design-handoff.md). Cutout and animation work is not implemented.
