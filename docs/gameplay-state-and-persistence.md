# Sessions, modes, rewards and persistent state

Detailed future implementation contract for the [gameplay handoff](gameplay-implementation-handoff.md). Prepared 2026-10-31. Every architecture, task, transaction, test and fix plan must undergo its researched reciprocal challenge loop. No gameplay/storage implementation is created by this document.

## 1. State ownership and identifiers

Use pure domain transitions and one application-lifetime coordinator. Components do not directly assign entries, mutate wallet totals or independently save partial records. Decoration, language, geometry and browser history cannot own puzzle/progression identity.

| State/identifier | Required meaning |
| --- | --- |
| Application namespace | Canonical application ID plus configured deployment base path, stable across hash/menu changes and catalog releases; isolate same-origin GitHub Pages projects |
| Database version | IndexedDB structural object-store/index version, distinct from payload schema versions |
| Active save generation | One internal current-generation pointer and revision; restored generations are staged separately, not a new multi-profile product |
| Attempt ID | Immutable random identity for one scored attempt, distinct from puzzle ID and role. Restart retains it; a deliberate New puzzle creates another. |
| Puzzle identity | Stable givens-content ID plus catalog/certification/source/rating snapshots; no ordinal-only identity |
| Role | Quick Play, progression frontier or replay. At most one current attempt per role; visible/completed state is explicit. |
| Revision and command sequence | Monotonic state revision/command sequence; persisted acknowledgement records the highest committed sequence |
| Logical premise revision | Separate version/hash for values and authoritative logical eliminations. Timer saves, focus, selection and manual notes do not by themselves invalidate a board proof. |
| Writer token/epoch | Per-attempt active writer authority; changing it invalidates stale edits, timer checkpoints, disclosures and completion |
| Run/frontier | Run ID, displayed Metamorphosis ordinal, Leap and pinned schedule version; progression grants bind to this tuple |
| Completion receipt | Immutable unique attempt result with pinned score policy, arithmetic inputs, currency delta and optional frontier-grant identity |
| Allocation intent | Stable next-attempt/replacement/Continue operation identity; duplicate requests resume the same intent rather than creating multiple boards |
| Assistance disclosure | Stable disclosure ID, frozen revision, type/payload and monotone knowledge effects, committed before any informative output |

Persist settings separately from individual sessions within the same namespaced database. Theme identity, appearance preference, motion preference, board shape and locale are independent fields. Unsupported/future values must not cause the active board to be deleted or reinterpret a translated string as an enum.

Session snapshots include: original givens/solution definition needed for resume, catalog/source/certification/policy references, entries, manual notes, selection, Notes mode, bounded undo, command/revision/owner/generation, accumulated active elapsed time, assistance ledger, pending disclosure, role/run binding and completion/allocation state. Derived conflicts and legal candidates can be recomputed; do not persist them as competing authority.

## 2. Exact entry and undo semantics

These defaults remove incompatible specialist interpretations. If revised, research/challenge the replacement and update the entire input/reducer/undo/browser contract before implementation.

| Command | Result |
| --- | --- |
| Select cell | Select logical ID 0-80, including clues/water/notch. Does not create undo or award activity. |
| Enter digit in normal mode | On an editable cell set 1-9. Re-entering the same digit is a no-op, not a hidden erase. Replacing a different digit is one edit. |
| Fill cell | Clear its manual notes and remove that digit from empty peers' notes as part of the same compound edit. Preserve a complete inverse patch. |
| Enter in a clue | No clue change, no undo entry, no storage mutation from the rejected edit; provide appropriate accessible feedback. |
| Toggle Notes | Sticky input mode independent of selected cell and overlays. Does not modify values or assistance history. |
| Enter digit in Notes mode | Toggle that digit in the selected editable empty cell. In a filled/clue cell do not replace/erase its value or create hidden notes. |
| Manual notes | A nine-bit set, fixed digit-to-3x3-position mapping. They may contain mistakes; they are never authoritative solver candidates. |
| Erase | Clear an editable value, or all notes of an empty editable cell, as one undoable command. An already empty/unnoted cell is a no-op. A clue is immutable. |
| Undo | Restore the entire most recent reversible edit, including overwritten value and every affected peer-note bit. Return focus/selection to its primary edited cell by the agreed controller policy. Never restore old elapsed time, assistance, rewards, use history or frontier. |
| Restart puzzle | Explicit in-app action resets entries/notes for the same attempt, retains givens, elapsed time and all assistance, and clears incompatible undo history. No new reward identity or easier replacement. |
| New puzzle | Allocate a different attempt through the role/frontier policy, confirming replacement of an unfinished role. It is not Restart or Reset progress. |
| Completed/pending-completion board | Frozen to edits/undo/restart while its result is being committed or has been committed. Failure does not turn it into a new editable scored attempt. |

No redo/auto-fill-notes/batch paste/check-every-entry feature is required. Additional commands need their own plan, research, assistance semantics and tests. Normal notes, erase, undo and direct duplicate feedback do not reduce completion credit.

Initially retain the latest 512 reversible edit units. This cap is explicit and tested at 511/512/513. A compound peer-note update consumes one undo unit. No-op input, selection, focus, timer ticks and overlays do not consume history. Keep history bounded without truncating the monotone assistance ledger.

### Role-status action policy

| Current role status | Resume/New puzzle/Continue behavior |
| --- | --- |
| Empty | A deliberate mode choice can allocate its first verified attempt. |
| Playing/suspended | Resume the exact attempt; New puzzle requires unfinished-attempt replacement confirmation and safe flush. |
| Validating/pending completion or recoverable completion-write failure | Do not replace the role through ordinary mode navigation. Resolve/retry the same completion barrier, or use an explicit recovery/export path. |
| Durably completed, result not continued | Resume opens the retained result. Only an explicit Continue or equally labeled next-puzzle action allocates the next attempt; route mounting never does. |
| Explicit unscored recovery attempt | Keep its unscored lineage and recovery labels; never reopen it as a rewarded attempt. |

### Input ownership

Map digit/numpad input, arrows, Home/End, Backspace/Delete, Notes and undo shortcuts to the same typed command path as touch/mouse. Ignore composition/IME intermediates, invalid digits and unrelated modifiers. Preserve normal editing/browser shortcuts while a dialog, settings field, backup text field or enlarged notes editor owns focus. No global board shortcut may fire through a modal.

Choose a documented platform-aware undo shortcut without stealing browser/system actions outside gameplay. Ignore `KeyboardEvent.repeat` for discrete digit/note/erase/undo/tool commands by default; otherwise holding a note digit would repeatedly toggle it on/off. Navigation keys may repeat. Normal digit entry does not automatically advance to another cell. After clicking a digit key, logical movement and number entry must remain available without the historical focus-on-keypad dead end. Test mouse, touch, physical keyboard, keyboard-activated buttons and screen-reader-accessible control labels separately.

Focus return is reason-specific: Resume, Escape and browser Back from ordinary More restore its trigger; applied Notes/Erase/Hint return the selected board cell; Undo returns its primary edited cell; Quit returns mode selection. Enlarged-editor/dialog fields retain their own interaction until closed. This preserves the existing Resume contract while restoring productive entry after tools.

Board accessible names must update with clue/editable status, current value, manual notes, conflicts and selection. Do not announce elapsed time every second or expose hidden solution answers in DOM/ARIA labels. User-observable missing/wrong notes never become hidden solver assumptions.

## 3. Lifecycle and scored time

Create a separate injectable active-play clock. Never reuse the decorative clock, whose reduced-motion behavior deliberately resets its elapsed time. The gameplay clock has no dependency on theme, water phase, float seed, motion preference, animation frame count or number of input events.

Start time when the verified board is revealed and interactive. Include visible thinking time and time spent in ordinary readable More/tools. Do not start at first digit or grant an untimed visible loading/intro preview. Use accumulated active milliseconds plus a fresh monotonic segment per document; do not subtract wall-clock timestamps across reload to charge hidden time.

Pause for hidden/page lifecycle states, explicit concealed Pause and returning to the menu. The later user-directed theme correction keeps Settings and other ordinary windows readable and timed, superseding the earlier concealed-Settings policy. Explicit Pause and restore staging keep the scene mounted but strongly blur both board and notes while time is paused; a translucent dimming layer is insufficient. More uses a localized game-menu label because ordinary More remains timed. Completed-board review is untimed and immutable. The separately authorized [theme integration](theme-integration.md) records merged-source validation of this presentation contract.

A read-only second tab, ownership-conflict view or takeover-pending state must conceal an active scored board/notes. Otherwise one tab can pause while another offers unlimited untimed study. Explicit Resume here acquires writer authority before revealing/starting its active segment. This is consistent UI timing, not an anti-cheat promise against DevTools, screenshots or exported public solutions.

Checkpoint active time through the bounded persistence coordinator, not every frame. The thirty-second time-only fallback below supersedes the earlier one-, five- and ten-second policies. Preserve immediate progress saves and semantic/lifecycle flushes; benchmark and record the unacknowledged interval. Hidden/pagehide handlers are best effort, not the sole save mechanism. Do not fabricate durable elapsed recovery before acknowledgement. Test reload, BFCache, sleep/long tasks, clock changes, reduced motion and ownership transfer with injected clocks and actual browser events. Document platform timer limitations instead of clamping away legitimate thinking time.

### Current autosave policy, 2026-11-02

Automatic saves preserve the current game locally without uploading progress or downloading puzzles. A snapshot replaces the current attempt and essential revision marker, including its certified definition and bounded undo; it does not append copies or repeatedly rewrite the wallet. Thinking time affects Dewdrops and resume, so it needs bounded periodic protection even without number entry. The monotonic clock remains independent of storage cadence.

| Trigger | Saving behavior |
| --- | --- |
| Changed digit, note, erase, undo or Notes mode | Immediately enqueue the full updated attempt with freshly sampled elapsed time. |
| Rapid cell selection, including held arrows | Mark pending immediately; batch for up to a fixed 250 ms before requesting the latest selection write. A real edit or flush makes it urgent. Storage acknowledgement can take longer. |
| Visible, owned, unfinished durable game with no recent progress save | Save changed thinking time about every thirty seconds. Changed input resets this deadline; rejected/noop input and read-only ownership checks do not. |
| Ordinary readable More/Settings or equivalent view update | Keep timing without forcing a save or resetting the fallback deadline. |
| Pause, hide or return to the menu | Stop the timer, sample the final time and drain pending selection. A critical transaction already in progress owns its safe before/after samples. |
| Main menu, hidden app, explicit Pause, restore staging, completed game, failed save or RAM-only play | No recurring save timer. Explicit changes, boundary flushes and recovery can still write. RAM-only play remains explicitly unsaved. |
| Preference change | Save preferences separately when changed. |
| Allocation, informative assistance, completion/rewards, replacement or restore | Preserve existing acknowledged transaction barriers and exact time sampling. |

Thirty seconds gives about two fallback writes per idle visible minute instead of six at ten seconds, a 67% reduction in nominal time-only writes. Sixty seconds would remove only one further write per minute and double nominal average unsaved thinking time from fifteen to thirty seconds, assuming abrupt stops are evenly distributed between checkpoints. Browser scheduling can extend these intervals; edits and lifecycle flushes usually shorten them. This is a checkpoint-work reduction, not a frame-rate or battery claim. A visible unchanged board still represents legitimate thinking time. With no elapsed change, checkpoint exits before reducing or writing.

Hide/pagehide synchronously stop the clock and request a final checkpoint/drain; an already-held critical operation retains its own before/after samples. Asynchronous storage may not finish before suspension or termination. An actual Android navigation delivered pagehide followed by freeze about 18.7 ms later; the final time tail did not commit although saved moves survived. This demonstrates why closing a tab, window or installed app cannot be the sole protection or a guaranteed save. Minimize/background is the earliest useful save opportunity, not a promise of completion. See [browser lifecycle limits](https://developer.chrome.com/docs/web-platform/page-lifecycle-api) and the source-bound [acceptance evidence](pwa-acceptance.md).

Ownership remains transactional on every write. If no earlier ownership check occurs, an otherwise idle old window may remain readable until its next fallback, nominally thirty seconds plus dispatch/storage delay. Its stale writes still fail the writer/revision checks immediately. Foreground-return checks remain; no additional expensive ten-second full-store polling loop replaces the removed saves.

An ownership read certifies saved puzzles asynchronously after its readonly transaction. If settings acknowledge during that gap, its older cached snapshot must not replace the newer local settings. A cache reference acts only as a freshness stamp; all authority and validation checks still run, and a foreign writer still conceals the board. Native digest-delay and controller tests cover both outcomes.

Time checkpoints and acknowledgements preserve board-data references. Svelte's stable field selectors isolate values, conflicts and notes from time-only changes, so routine saving does not recalculate the board or refresh cell text. Save-state notifications remain truthful; only the duplicate queue-start notification was removed. The dialog's existing delayed feedback remains reserved for slow writes and failures.

Pure clock saves send captured identity/sequence/time metadata rather than a local board snapshot. The repository reads and completely validates the authoritative stored attempt once, checks generation, writer, revision, committed sequence, active role and playing status, then updates only time/sequence/revision and the essential revision marker. The same full record is still written; there is no schema migration or small separate time row. A queued real edit remains a full save even when a later clock sample arrives. Failures retain the newest full snapshot, preserving an uncommitted digit, note or selection. Retryable storage failures use that full snapshot on explicit Retry; ownership conflicts, corruption and future formats stay blocked for recovery.

Ordinary full saves retain their three complete validation passes and detached captures. The earlier redundant-copy removal and skipped completion scans for unchanged board values remain. There is no validation cache keyed by mutable identity; the nested puzzle-definition copy remains necessary against changing caller getters. Browser storage is [asynchronous](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology#key_characteristics), but JavaScript validation and copying still use the UI thread. No separate save worker is used; moving full snapshots between threads would add message copying and lifetime handling that need measured justification. Current source-bound results belong in [acceptance](pwa-acceptance.md); the [earlier ten-second comparison](pwa-acceptance.md#long-game-autosave-review-2026-11-01) is historical.

For an app update, `prepareReload()` synchronously freezes commands, preferences and thinking time, flushes the newest snapshot and verifies its complete acknowledged attempt, writer, generation and active-role binding through durable readback. It refuses temporary storage, pending critical work and unresolved saves. Legitimate changes to another role, preferences or rewards are adopted from validated readback. A clean menu with no unacknowledged local attempt may adopt the current saved game without acquiring ownership, including when this window has not yet noticed another owner's takeover. Unacknowledged/conflicted local changes still block it. Success stays frozen through navigation; candidate changes or failed navigation restore the previous view. The App also excludes backup/export/restore UI work. This is a local save witness, not a lock preventing other windows from acting afterward. Updates return to the menu and never automatically steal a writer.

One controller timeout exists only while eligible for a periodic save. Failed storage retains the newest pending state and cancels routine work until explicit retry; retry captures time spent since failure. The queue holds one in-flight and one newest pending snapshot. Its fixed selection deadline cannot be postponed by held arrows; a pending real edit cannot become deferred. Flush drains selections arriving during an in-flight write before a role/backup/disclosure boundary completes. Disposal cancels both kinds of timer. Routine saves remain invisible; prolonged writes and real failures retain feedback and recovery.

### Historical one-, five- and ten-second validation

The evidence below describes superseded policies and publications. The earlier ten-second results and automatic-update behavior are recorded in [PWA acceptance](pwa-acceptance.md#automatic-updates-and-quieter-saving-2026-11-01). They do not establish acceptance of the thirty-second compact path or physical-device lifecycle behavior.

Baseline evidence: fresh local Chromium previously wrote 3 or 4 attempts per 3.3-second window in the board, More and Settings, versus zero after settled menu/Pause boundaries. The unedited attempt was 2,649 to 2,653 serialized bytes, with 0.6 to 1 ms from first put through transaction acknowledgement on this desktop. Mira's CPU-only model measured a reachable 512-edit snapshot at 50,585 serialized bytes and 2.83 ms median repository decode/merge work; a maximum accepted schema stress shape was 803,737 bytes and 26.82 ms. The stress shape is not typical reducer-generated play. These exclude actual storage latency and phone/battery evidence; serialized bytes are not physical disk writes. Routine saves retain browser-default durability and completion/rewards retain strict durability. Avoid a compact-time-row schema migration: reducing full-snapshot frequency preserves current backup, rollback, integrity and ownership contracts. Baseline/CPU evidence is ignored under `prototypes/pwa-validation/save-audit*` and `save-optimization-cost*`.

Reciprocal implementation review found and fixed two new races before acceptance: read-only checks could keep resetting the timer without saving, and a flush could finish while a newly arriving cursor remained deferred. Focused tests cover fixed deadlines, immediate edits, late cursor flushes, failure/retry, lifecycle tails, exact completion time, no inactive timers and stale-writer rejection. Final native and complete-suite evidence is recorded with the accepted optimization result, rather than treating the earlier one-second audit as validation of this change.

Accepted local validation: all 730 unit/model cases are covered green. The full run passed 727; three Git-fixture cases failed because the restricted Windows process could not create MSYS objects. The affected Git files passed when rerun outside that restriction. Svelte/Node types, Svelte autofixer, production build and complete offline/certified-catalog artifact validation passed. Jobs ran serially with at most two unit workers and one browser; receipts are ignored under `prototypes/pwa-validation/save-optimization-*`.

Production Chromium measured three acknowledged time-save transactions in 16 seconds of idle visible play, and one selection-save transaction for twenty actual arrow presses. The earlier one-second native baseline measured three or four writes per 3.3 seconds; the 80% reduction is the cadence comparison, not a same-length old-build rerun. A digit queued behind a cursor was read back in 23.6 ms in this run. Settings retained one geometry across two periodic writes. Fresh/menu-after-play/Pause and delivered pagehide windows each showed zero recurring attempt writes; the pagehide/pageshow events were injected and do not prove physical OS lifecycle delivery. Document close/reopen retained entries, notes, Notes mode and wallet. The first ten native stages are recorded in `save-optimization-browser/accepted-current/results.json`.

Recovery/takeover were completed in the focused `accepted-recovery-host` fixture: injected quota errors stopped automatic retries; emergency export included the local notes/time; explicit retry advanced acknowledged elapsed time from 65 to 6,010 ms without losing progress. The previous owner concealed its board in 4,914 ms after actual second-window takeover and could not change the authoritative board or wallet. The first export attempts were cancelled inside the restricted Windows process even after explicit download permission; the identical app/harness passed outside that restriction. Browser download defaults were not blamed and the application download helper was not changed. The existing five-dialog native regression also passed delayed acknowledgement, neutral feedback, injected quota recovery and preserved entries/wallet/time. Its 6.2-second windows now span at least one five-second checkpoint, not six. The native two-window update/cold-offline journey passed separately. The lead personally reviewed local entry, cell navigation, Notes mode, readable Settings and concealed Pause with Codex browser. Android hardware and battery measurements remain unavailable.

Published validation: [Pages run 41385954092](https://github.com/Shilo/toadoku/actions/runs/41385954092) passed all 730 tests together across 84 files, type/build checks, retained-file validation and actual hosted-byte/header verification. Version 0.0.46 is source `89e273ca15113dd04361e9fa42a7565d4928379d`, build `6bf1b170e39c4aa6b62815345af58d9ad820e30fa31816a8680f6278ee2c875a`. The lead personally verified the live app's ordinary update-ready message, closed its sole old window, reopened into 0.0.46, resumed the retained Quick Play board and entered a number with Undo available. The live screenshot is ignored under `prototypes/pwa-validation/save-optimization-live.jpg`. In plain language: numbers and notes save immediately; quick cell movements are combined; thinking time saves about every five seconds; menu/Pause/hidden screens do no recurring save work. The fewer writes trade a larger possible loss of recent thinking time after an abrupt termination, with no guaranteed browser crash-loss deadline. No saving-frequency setting was added.

## 4. Quick Play, frontier and replay

Quick Play is unrestricted by progression unlocks. Select Easy/Medium/Hard and a fresh eligible catalog record. Resume the existing Quick Play attempt or explicitly replace it. Starting Quick Play cannot overwrite frontier/replay state.

Progression starts at displayed Metamorphosis 1, Leap 1. Store the 60-Leap schedule in versioned data:

| Leaps | Eligible source rating | Count |
| --- | --- | ---: |
| 1-6 | `<1.5` | 6 |
| 7-15 | `[1.5,2)` | 9 |
| 16-24 | `[2,2.5)` | 9 |
| 25-42 | `[2.5,3.5)` | 18 |
| 43-60 | `[3.5,5)` | 18 |

The accepted corpus must meet every interval gate before schedule freeze. No hidden adaptive difficulty, skipped frontier Leap, score threshold, hint prohibition or speed requirement controls advancement. Any genuinely valid completion advances the frontier even if assistance makes its reward zero.

At completion, record the next frontier once. An ordinary Leap goes to the next; Leap 60 creates the next run with Metamorphosis increased and Leap 1/Easy. Preserve wallet/lifetime totals, preferences, unlocks and use history. Keep the completed board/result visible until Continue; advancing durable frontier metadata does not automatically replace its displayed attempt.

Store both the displayed completed-attempt binding and the next frontier tuple. Reload between completion and Continue must still show the completed result, not accidentally allocate a board or pay again. New run ID/ordinal and the old completion receipt must not be confused.

Replaying an unlocked completed Leap allocates a fresh matching puzzle in the replay role. Preserve the exact unfinished frontier board. Replays receive the same score/currency rules as equivalent fresh puzzles but never advance/rewind the frontier or trigger another Metamorphosis, including replay of Leap 60. Preserve the highest completed/unlocked Leap across runs of that schedule; migrate unlock metadata by schedule version if future schedules differ.

Progression's New game label must not imply resetting all progress. With existing progress, use New puzzle/Resume appropriate to the active frontier. Replacing an unfinished frontier generates another attempt at that same current position after confirmation; it preserves counters and wallet. A full reset-data operation is separate and unnecessary for ordinary mode navigation.

## 5. Exact score and Dewdrops policy

The later user simplification and accepted reward policy 2 supersede the historical separate-score proposal. Dewdrops are the completion score and currency. Pin `rewardVersion: 2`, display band, rating snapshot, base/target/configuration and schedule binding into each new attempt. Changing configuration cannot retroactively reprice an active attempt or receipt. The section anchor is retained for existing links.

Let `N > 0` be originally empty cells, `R` distinct originally empty cells whose answer was exposed by the game, `A = N - R`, `B` band base, `T` target active milliseconds, and `E` nonnegative accumulated active milliseconds. Validate inputs and integer products/denominators within safe-integer bounds. Division may produce a bounded fractional quotient, which is rounded down at the explicit floor operations below.

| Band | Base B | Provisional T |
| --- | ---: | ---: |
| Easy | 100 | 600,000 ms |
| Medium | 200 | 1,200,000 ms |
| Hard | 400 | 2,400,000 ms |

```text
bonusBasisPoints = informationAssistanceUsed
  ? 0
  : floor(1000 * max(0, T - E) / T)

dewdrops = floor(B * A * (10000 + bonusBasisPoints) / (N * 10000))
```

The maximum bonus is 10%; slower unassisted completion retains the full base. Treat these times/bases as published policy 2 defaults, not measured human fairness. No per-tap points, invented optimal-move count, note penalty, hidden mistake penalty, Metamorphosis multiplier, farming cap, daily limit, purchases or spending. Permanently unscored attempts earn zero.

| Example | Expected Dewdrops |
| --- | ---: |
| Easy, 51 blanks, no help, 5 active minutes | 105 |
| Easy, no help, at least 10 active minutes | 100 |
| Medium, 50 blanks, 5 exposed answers, any time | 180 |
| Hard, 51 blanks, 5 exposed answers, any time | 360 |
| All original blanks exposed | 0 |
| Logical elimination hint, no exposed answer, any time | Full band base |

There is no separate score or conversion. Calculate the integer bonus first, then one final reward floor. Test boundaries `E=0`, `T-1`, `T`, `T+1`, one/no/all exposed cells and repeated exposure of one cell. Clamp the time-bonus numerator before multiplication when elapsed time exceeds the target. Validated bases bound the intermediate numerator to 356,400,000 and denominator to 810,000. Older score-policy records require explicit recovery; never silently reinterpret them.

Wallet and lifetime earned are records of one currency. With no spending in v1, both increase by the same committed delta and remain equal from a zero start. Use safe-integer checks and explicit overflow failure; never wrap or silently reset counters. Local data is not a trusted leaderboard or anti-cheat ledger.

## 6. Assistance, truthful hints and durable disclosure

| Information | Ledger/reward treatment |
| --- | --- |
| Direct duplicate conflicts from rows/columns/boxes | Free rule-derived feedback; no solution comparison |
| Manual notes/undo/erase/peer-note cleanup | Free interface operations |
| Logical elimination or other useful information hint | Information-assistance flag becomes permanent; no speed bonus |
| Correctness check or unsatisfiable-entry diagnosis on explicit request | Information assistance; do not silently expose it during ordinary entry |
| Placement answer in text/highlight or explicit reveal | Also add the originally blank cell to the exposed-answer set immediately, even before Apply |
| Failed/canceled computation with no useful information disclosed | No fictitious reveal/penalty; technical errors are not assistance |

Use a neutral confirmation/choice to explain the scoring effect before revealing payload. A technique name, highlighted row/candidate or board-specific correctness diagnosis can be the first informative stage. The disclosure barrier precedes that stage, not only the final digit/Apply button.

Compute a hint against a frozen validated logical premise revision outside transactions. Check satisfiability and technique witness/soundness as specified by the data/correctness document. A rule-consistent but wrong entry may still make the logical state unsatisfiable. Do not claim a deduction or identify a wrong entry without the appropriate explicit assistance path. Unsupported logical reasoning gets an honestly named selected-cell answer reveal fallback, with its effect previewed; never invent a technique explanation.

Separate the proof's logical revision from storage revision/command sequence. A multi-second computation must survive timer-only checkpoints and harmless manual-note changes while preserving those newest fields. At the disclosure barrier, recheck logical state, attempt/definition/catalog, request/target, writer and generation, then rebase onto the latest unchanged-board snapshot and storage revision. A value/authoritative elimination change invalidates the proof; a timer checkpoint alone does not. The ledger commit returns its own committed storage revision rather than comparing forever against the pre-disclosure revision. Never pause scored time just to make a hint finish.

Before showing useful information:

1. Await prior semantic writes for that attempt and verify current generation/logical premise revision/writer epoch; rebase onto the latest compatible storage revision.
2. Atomically persist a stable disclosure ID, recoverable payload, assistance classification and monotone exposed-cell/assistance effects.
3. Acknowledge only on transaction completion; then disclose against the still-matching logical state and returned committed revision, preserving intervening compatible time/note state.
4. Recover a committed pending payload after reload without double-recording it, so a crash after commit/before display does not simply charge help the player cannot access.
5. If state/ownership changed while computing or waiting, discard/recompute. A previously committed assistance flag does not authorize applying a stale proof.
6. On failed durable recording, reveal nothing in an existing persistent scored lineage. Offer retry, or first durably commit an irrevocable unscored/retired marker for that lineage before useful disclosure. A RAM-only switch to unscored or a same-puzzle fork is insufficient: after a crash the old scored save could otherwise resume without assistance. Fresh never-persisted ephemeral attempts can have local hints only with a permanent unscored identity and no later promotion into durable rewards.

Undo, erase, Restart and reload never remove knowledge, restore a disabled bonus or change reward identity. Repeatedly revealing one cell counts once in `R`; different useful disclosures still retain their own stable event identity/recoverable payload as needed.

## 7. IndexedDB repository and bounded persistence

Use one app/base-path namespaced database with separate essential stores for settings, attempts/roles, progression/wallet, completion/grant receipts, pool selection/use history and save-generation metadata. Verified catalog-cache stores are disposable and have separate write/retention scope. Exact names are agreed contracts, not a reason to create an unnecessary generic repository framework.

The historical two-localStorage-record proposal is superseded. IndexedDB permits multi-store transactional updates; individual request success is not a committed save. Resolve durable operations on the transaction's complete event and handle abort/error. See the [transaction completion reference](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event) and [IndexedDB transaction specification](https://www.w3.org/TR/IndexedDB/).

Every normal mutation of active essential state checks the active save-generation pointer **inside its transaction**, plus the required attempt/role/profile/pool revision and writer epoch. A stale tab from before restore cannot write into, award against or switch over the new active generation. Authorized restore staging uses the separate inactive-generation protocol below. Cache eviction is generation-independent and cannot mutate essential progress.

Allow ordinary edits to render optimistically with one in-flight full snapshot and one coalesced latest snapshot, not an unbounded per-key journal. The snapshot includes current entries/notes, bounded undo and monotone assistance state. `commandSeq`/`committedSeq` distinguish in-memory progress from committed progress. An older in-flight snapshot must not replace newer state after its acknowledgement.

The coordinator survives menu/role navigation. Leaving the board pauses/conceals it but does not drop pending work. Replacing an attempt waits for its relevant flush or asks an explicit in-app unsaved-session choice. Do not promise recovery of commands not yet acknowledged when the process is terminated.

On denied storage, quota, transaction abort, blocked upgrade or unexpected connection close, retain the latest in-memory snapshot and pending intent. Show clear pending/unsaved/retry/export states. Fresh never-persisted ephemeral attempts have permanently unscored identities; they may later be saved for resume as unscored, never promoted/merged into durable rewards. Existing durable scored attempts may continue ordinary unsaved editing, but useful assistance still requires the durable ledger/retirement barrier above. A solved pending attempt stays frozen for retry/export rather than becoming an editable fresh attempt.

Prefer standard strict durability hints for disclosure/completion where available, with a tested browser fallback. Do not use experimental nonstandard modes as a correctness requirement. Browser acknowledgement and durability hints cannot guarantee recovery from arbitrary power/media failure; [transaction durability](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction) and [quota/eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) document limits.

Never fetch, solve a full puzzle or await unrelated asynchronous work inside a readwrite transaction. Validate/compute outside it, then re-read and compare the authoritative versions before short transactional writes.

### Retention and capacity

Three current roles and 512 undo edits do not bound historical storage automatically. After Continue or confirmed replacement, compact old redundant full session/undo snapshots unless a reviewed history feature needs them. Retain canonical completion/grant receipts, required score/puzzle/policy identity and issued/equivalence history for idempotency and recovery. Assistance can compact to its irreversible flag/exposed-cell set plus necessary pending disclosure/retry high-water identity; no need to keep every old proof payload forever. Obsolete intent IDs must be rejected as obsolete rather than treated as brand-new allocations if detailed payloads were compacted.

Define and benchmark essential-store and export/import size budgets using at least 10,000 compact completion records and the full catalog's issued history. Cache eviction alone cannot fix an oversized essential store. Do not delete receipts/knowledge/history to hide quota pressure, promise infinite local retention, or export backups too large for the matching importer. If capacity is reached, retain truthful save/recovery behavior and preserve existing records.

## 8. Atomic attempt allocation and Continue

Allocation is its own idempotent transaction protocol, separate from completion. It must coordinate active roles and shared catalog freshness across Quick Play/frontier/replay and multiple tabs.

1. Create/reuse a stable intent bound to active generation, desired role, current role revision and expected frontier/completed receipt. Repeated Continue/resume/replacement requests use that intent.
2. Read an eligible candidate from the versioned shared pool traversal and fetch/verify its shard outside the transaction. Keep the old board/result intact.
3. In one essential readwrite transaction, check active generation, intent state, role/frontier/pool revisions and candidate reservation/use status. If stale or already reserved, retry the bounded selection plan; do not force an overwrite.
4. Atomically reserve/mark the stable puzzle ID issued, advance the appropriate pool/history state, write the full new attempt snapshot and bind the role/intent to its attempt ID. Acknowledgement precedes reveal.
5. On duplicate requests return the existing allocation outcome. On load/commit failure retain the old board and resumable intent. A late response cannot replace a newer role or user choice.

Marking issued at durable start prevents abandonment from immediately redrawing the same puzzle. Freshness domains are the five shared disjoint intervals, not a separate Quick Play history. Same-time Quick Play and frontier requests cannot both call one record unused. An exhausted eligible pool repeats only under its documented epoch policy, not because a fetch failed.

## 9. Atomic completion and frontier grant

The controller recognizes a potentially solved board, freezes edits and queues a completion barrier after all prior semantic/disclosure operations. Independently validate all units, givens and the certified solution snapshot outside the transaction against a frozen revision.

Within one readwrite transaction:

1. Check active save generation, authoritative attempt/owner/revision, current role and existing immutable attempt receipt.
2. If the same valid receipt already exists, return its result; do not add another reward. Conflicting duplicate receipts are integrity errors, not an excuse to overwrite history.
3. Calculate/revalidate the pinned pure score inputs. Read the **current wallet/profile inside the transaction** and add the delta. Never write a stale whole-profile snapshot from another mode.
4. Write the completion receipt and completed attempt. For frontier only, claim a unique grant keyed by generation/run/Leap/schedule and compare-and-swap the expected frontier tuple.
5. Advance that frontier once, or create the next run/Metamorphosis at Leap 60. Replays and Quick Play never enter this grant branch.
6. Write wallet, lifetime total, progression/grant and completed session together. Resolve success only when the transaction completes.

Two different stale attempt IDs bound to one frontier position must not advance it twice. Two legitimate Quick Play/frontier completions in separate roles may both earn rewards, serializing their deltas without losing either. A failed transaction changes none of receipt/wallet/frontier/session durable state.

Expose distinct UI states: validating/pending commit, saved completed result, recoverable write failure and explicitly unsaved/unscored result. Do not show a provisional wallet as durably awarded. Do not allow a solved board to be edited/undone and re-awarded after a failure. Continue becomes available only for the appropriate stable result/allocation path, and never reruns reward calculation as a side effect of route mounting.

## 10. Multi-tab ownership

Revision compare-and-swap is mandatory even if Web Locks is present. Per-attempt writer epochs prevent two views from acting as the active timer/writer. A non-owner view conceals the active scored board and offers explicit Resume here; acquisition checks generation and increments owner epoch atomically. The previous writer's subsequent edits/checkpoints/disclosures/completion must fail safely and preserve any uncommitted local snapshot for recovery/export.

The normal mode Resume action can perform ownership acquisition; avoid an unnecessary extra modal where that action already expresses the choice. Direct-link/reload restoration must not silently manufacture an attempt or expose untimed study. Define and test the first/returning-tab acquisition UX before implementing it.

Web Locks can improve short coordination where supported. BroadcastChannel informs peers about invalidation; neither grants authority nor proves durability. Lost messages, suspended owners and absent APIs must still be safe. Avoid a wall-clock lease protocol or permanent app-wide lock that blocks independent roles unnecessarily. See [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) and [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API).

## 11. Migrations, backup, restore and local trust

The current production UI has no prior production gameplay schema. Do not fabricate migrations from ignored prototypes or import their saves automatically. Start with v1; retain migration fixtures whenever a real schema evolves. Keep database structural version distinct from record, catalog, technique, schedule and scoring versions.

Upgrade through versionchange transactions; close old connections on versionchange and present recoverable blocked/upgrade-required states. Handle VersionError from an older app against a newer database as read-only/reload/export, never delete/recreate. Quarantine malformed data without losing original bytes. Independent valid settings/roles should remain recoverable. Unknown future versions/policies are read-only/exportable rather than guessed.

Validate lengths, integer ranges, enums, IDs, givens, entries, notes, undo patches, assistance, elapsed time, mode/run bindings, receipts and arithmetic consistency. A valid stored solution alone does not prove a puzzle's uniqueness or rating. Known certified record/hash/provenance can establish trusted resume; unknown/tampered puzzle imports require bounded independent verification or read-only rejection and cannot silently become rated rewarded catalog attempts.

### Backup/restore protocol

- Export only versioned game/preferences/receipt/history data, never executable fields, arbitrary network URLs or the disposable catalog cache.
- Use a bounded strict parser with byte/record/depth/string limits and prototype-pollution protection. Every backup the app exports must round-trip through that version's importer; benchmark a large realistic history before freezing limits.
- Validate imported score totals from canonical receipts and their pinned policies; reject unsafe integers and conflicting duplicate attempt/grant IDs. Do not add imported wallet totals to the existing wallet.
- Stage a validated restore into a new inactive internal generation, retaining the previous validated generation/recovery copy. This is one current save with recovery history, not a user-facing profile system.
- Preview concrete replacement effects. Capture the current essential-generation revision with that preview. Staging may take time while another tab plays.
- At final activation, compare both the active generation ID **and expected essential-generation revision** in the same pointer-switch transaction. Every mutation of active essential state increments that revision. Writes to the new inactive staging generation use their own staging ID/revision and must not increment the active generation's revision or invalidate their own preview. If active state changed after the preview, return conflict and refresh the review; never silently discard intervening edits/rewards.
- Flip the pointer only after complete successful staging. A failure before that leaves the previous authoritative generation intact. Old tabs must fail their generation checks after the flip.
- An old backup is an explicit rollback, not secure anti-rollback protection. Exactly-once claims apply within the retained generation/attempt lineage; client data can be inspected or modified.
- Real user replacement/reset must be an explicit player action with a recovery copy. Tests use isolated disposable data, never the developer/user's actual saves.

## 12. Cache and offline boundary

Verified immutable shards may be cached by catalog/hash separately from essential progress. Fetch/verify/parse outside IDB transactions. Cache writes use their own transaction; a quota-aborted cache write cannot roll back a gameplay save. Evict only this application's disposable cache, never attempts, receipts, settings or quarantined recovery data.

A full local active definition permits resume despite a missing old shard or catalog deployment. Missing uncached next content offers retry or an explicitly eligible cached pool, never an unlabeled harder/easier puzzle or fake generator fallback. Catalog exhaustion, invalid data, cancellation and connectivity are separate typed outcomes.

Full cold offline app launch still depends on later application-shell/service-worker infrastructure. Do not claim it works from HTTP caching or IDB alone. Storage is best effort and origin-wide eviction can remove both data/cache; exports and honest unsaved states are necessary. Optional persistence permission is a separate explicit user-facing action, not an unprompted permission request during ordinary resume.

## 13. Required adversarial review

The lead and independent reviewer must challenge actual transactions, not just repository mock methods. See the [validation matrix](gameplay-validation-matrix.md) for named cases covering allocation/completion/disclosure crash points, generation races, simultaneous legitimate rewards, stale writers, restore staging, denied/quota storage, policy/catalog upgrades, notes/undo and time.

Keep outputs explicit: committed, pending, conflict, unavailable, corrupt, unsupported-future and unsaved are different states. No catch-all exception handler may silently reset the profile, mint a replacement puzzle, mark a failed write saved or reward an unverified completion.
