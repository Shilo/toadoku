# Gameplay action audit

Reviewed against the current `src/App.svelte`, `src/lib/gameplay/ui/GameDialog.svelte` and controller contracts on 2026-10-31. This records implemented actions and their purpose; it does not accept an unfinished validation gate. Theme work remains queued.

The design uses [Apple's popover guidance](https://developer.apple.com/design/human-interface-guidelines/popovers) for a small group of related actions, the [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) for focus and dismissal, and WCAG guidance for [targets](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and [status feedback](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html). These sources guide presentation. Project contracts determine Sudoku, rewards and persistence behavior.

## Timing and authority

Time counts only while an owned, playable attempt is readable and study is allowed. More, enlarged notes and Hint remain study surfaces. Settings, Pause, replay selection, Backup and replacement/recovery confirmations conceal the board and stop study time. Completed results have frozen time. Background visibility, lost ownership and restore phases also stop study, independently of the named surface. A modal prevents board input underneath it.

Short noncancellable commits disable Close and Back honestly. Cancellable hint, backup and raw-recovery work leaves dismissal available; leaving cancels pending work and guards late replies. A disclosure already committed remains charged and recoverable. Navigation does not undo a durable allocation.

## Modes and board

| Action | Availability and consequence | Why retained |
| --- | --- | --- |
| Quick Play; Easy, Medium, Hard | Starts the selected difficulty when no Quick attempt exists. An unfinished Quick attempt requires replacement confirmation. Pending completion resumes its barrier. A completed attempt resumes its retained result with the explicit selected difficulty named on Continue. | Direct familiar mode and difficulty choice, with one Quick role. |
| Progression; Start or Resume | Starts or resumes the frontier role. Durable completion of Leap 60 advances the frontier to the next Metamorphosis. Its old result stays visible until explicit Continue allocates the next puzzle. | A durable long-term journey without a currency multiplier. |
| Completed Leaps | Available after a frontier unlock. Opens the compact replay selector while preserving the frontier. | Replay an unlocked difficulty without advancing the frontier. |
| Mode Back; main-menu More | Back returns to the parent menu; menu More opens Settings. | Predictable navigation without a permanent toolbar. |
| Select cell; digits 1 through 9 | Mouse, touch and keyboard use the same reducer. Clues cannot change. Local rule conflicts are visible; legal wrong entries are not checked against the answer. | The essential Sudoku interaction. |
| More | Opens Tools on the left and Menu on the right. Its existing dock key carries a visible unsaved or unscored badge when necessary. | Reach secondary actions without adding a HUD or dock key. |
| Resume here | Reacquires a stale board. Conflicted unsaved local changes first require the explicit recovery choice below. | Prevent silent cross-tab edits or loss of local changes. |

## Tools and menus

| Action | Availability and consequence | Why retained |
| --- | --- | --- |
| Notes | Toggles sticky manual notes mode and returns to solving. The dock communicates the mode. | Fast repeated pencil entry without opening a sheet for every digit. |
| Undo | Enabled when the current attempt has an undo step. Reverses one reducer command, including its note effects; never refunds disclosures or resets time. | Recover from an accidental input. |
| Erase | Enabled for an editable selected cell with an entry or notes. Clues remain immutable. | A clear deletion action on touch devices. |
| Hint | Opens explicit logical-hint and answer-reveal choices. | Optional assistance with visible consequences. |
| Cell and notes | Shows the selected value or all nine manual note positions at readable size. Its digits, Notes, Undo and Erase dispatch the same reducer commands. Filled cells cannot receive pencil marks. | Small-screen readability without changing the board or its rules. |
| Pause; Resume | Conceals the board; Resume returns to it after authority checks. | A deliberate interruption with no study-time advantage. |
| Settings | Conceals the board and opens larger controls. | Keep preferences and backup operations out of the solving surface. |
| Main menu | Conceals and pauses the current board, cancels cancellable work and leaves the application-lifetime write queue active. It does not promise a completed flush before navigation. | Switch roles while retaining each role and its pending coordinator work. |
| View result | Replaces irrelevant edit tools on a completed attempt and reopens its retained receipt. | Closing a result must not issue the next puzzle or hide earned Dewdrops. |

## Settings and assistance

| Action | Availability and consequence | Why retained |
| --- | --- | --- |
| Language | English, German or Spanish; saving starts on change and durability requires acknowledgement. | Complete supported localization. |
| Motion | System, reduced or full motion; saving starts on change and durability requires acknowledgement. | User control and reduced-motion support. |
| Board shape | Fill or square; changes presentation only and preserves progress. | The approved flexible board layout. |
| Session disclosure | Native expandable summary shows role/difficulty, elapsed time, Metamorphosis, Leap and Dewdrops with visible labels. | Secondary context without a dashboard. |
| Restart | Requires confirmation. Clears editable entries and notes on the same puzzle; retains identity, elapsed time and assistance. | Start reasoning again without farming a fresh reward identity. |
| New puzzle; Replace; Cancel | Requires confirmation for an unfinished role. Successful replacement issues one new attempt; Cancel leaves the old one. Pending completion cannot bypass its barrier. | An explicit abandonment path. |
| Find a logical hint | Computes a witnessed deduction or an honest no-step, inconsistent-board or technical outcome. Information appears only after its assistance ledger acknowledgement. | Explain a valid next deduction without a separate Apply action. |
| Reveal an answer | Requires an editable empty selected cell. Only a newly exposed original blank reduces answer credit. | An explicit fallback when logical help is insufficient. |
| Hint feedback | A concise polite status announces readiness or failure; an acknowledged result heading receives guarded focus. Close and Back focus are preserved. | Make asynchronous outcomes perceivable without silently charging or changing entries. |

Preference selectors are disabled when no validated save exists. In-memory unscored play has editable preferences held only in RAM. No unimplemented theme or appearance selector is presented.

## Completion and replay

| Action | Availability and consequence | Why retained |
| --- | --- | --- |
| Result Continue | Available after durable completion. Issues one fresh attempt for that role, subject to freshness and transaction checks. Quick uses its existing band or the explicitly named new band; replay retains its Leap; frontier follows the updated schedule. A failed or cancelled allocation preserves the old result. | Allocation requires an explicit action after the retained result. |
| Result Close | Keeps the completed attempt and receipt. | Review or leave the result without implicit allocation. |
| Choose a completed Leap | Lists unlocked Leaps with their actual difficulty. | Communicate the replay target before allocation. |
| Resume replay | Returns to the existing replay or its retained result. | Preserve the third role independently of Quick and frontier. |
| Start replay; Replace replay; Cancel | A new replay starts directly when absent; an unfinished replay requires explicit replacement. Pending completion stays blocked. | Prevent accidental abandonment or completion bypass. |
| Continue at Leap N | On a completed replay, explicitly issues the selected unlocked Leap without an intermediate throwaway puzzle. | Honor the selected target while preserving the frontier. |

Direct Dewdrops depend on pinned difficulty, distinct blanks solved without disclosure and the eligible time bonus. Hints remove that bonus. No separate Score, conversion control or Metamorphosis reward multiplier exists.

## Backup, recovery and failure

| Action | Availability and consequence | Why retained |
| --- | --- | --- |
| Export backup | Downloads a validated normal backup. Failure stays visible with retry through the same button. | A portable, importable save. |
| Choose backup file | Native labelled file input with a full equivalent target and visible filename. Changing or clearing it invalidates old preview work. | Accessible local-file selection without a hidden stale confirmation. |
| Preview restore | Validates the selected file in a cancellable worker. Shows wallet, attempts, receipts and issued-history consequences; focuses the review heading, never the destructive button. | Review concrete consequences before replacement. |
| Replace with this backup; Cancel | Confirm activates the exact previewed save and retains the previous save for recovery. Cancel clears the selected preview. The activation transaction is not cancellable halfway through. | Explicit whole-save replacement without combining wallets. |
| Export emergency recovery | Exports current local state immediately when ordinary saving fails. Boot/corrupt/future storage can additionally export bounded raw stored data. A combined artifact preserves both when available. | Preserve recoverable evidence when normal validation cannot produce a backup. |
| Recovery feedback | Partial means local data only; unavailable means export failed. These files require manual recovery and are rejected by normal restore. Download initiation does not prove the user retained a file. | Avoid a false backup or Saved claim. |
| Resume saved puzzle; Cancel | The conflicted-local recovery pane first offers emergency export. Explicit Resume authorizes abandoning local pending edits only after fresh acquisition succeeds; failure preserves local RAM. Cancel returns without discarding it. | Resolve writer conflicts without automatic merging. |
| Retry saving | Offered for eligible durable unsaved/unavailable states. It retains current lineage and serializes pending writes. | Recover from a temporary write failure. |
| Retry boot; Restore backup | Boot Retry reopens without deleting data. Restore is available when a repository exists; unsupported future storage without a repository offers raw recovery instead. | Recover a valid save without an inferred repair or reset. |
| Play without saving | Creates a separate permanently unscored Quick lineage. It earns no Dewdrops or progression and does not overwrite the durable save. | Allow explicitly limited play when storage is unavailable. |
| Retry menu loading; Reload app | Retry is best effort after a chunk failure. Reload carries an unsaved-loss warning and a separate emergency-export action when needed. | Recover feature delivery without promising that browser module-cache failure is reversible. |
| Close; Back; Escape; outside dismissal | Return to the appropriate parent or board. Dismissal is blocked only for critical transitions; pending cancellable work cannot reopen the pane later. | Native predictable escape paths with no duplicate giant Resume control. |

## Deliberate omissions and remaining acceptance

There is no separate Apply hint, check-all answer oracle, optimal-tap score, permanent score/currency HUD, extra dock key, arbitrary save-slot manager, store or purchase flow. Settings changes request saving directly, so there is no redundant Save/Apply button. No fake sheet grabber implies unsupported dragging. Required actions retain text labels beside decorative icons.

Choosing another Quick difficulty after completion keeps the old receipt and names the new band on Continue. The transient choice clears on a fresh menu/generic resume or reload; the completed receipt remains durable. The actual browser regression covers a failed shard, a cancelled pending allocation, explicit resume after reload and exactly one successful new issuance without a throwaway puzzle.

The final gate still requires the lead's independent integrated browser review and current validation evidence. Device emulation and CSS text enlargement do not substitute for physical hardware or actual browser zoom. The earlier intermittent Continue timeout remains recorded separately until acceptance resolves its evidence and limitations.
