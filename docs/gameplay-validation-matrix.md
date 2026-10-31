# Gameplay validation matrix and acceptance gates

Required by the [autonomous gameplay handoff](gameplay-implementation-handoff.md). Prepared 2026-10-31. These are future checks, not results. Research and challenge this test plan, its models, oracles and revisions just as rigorously as implementation plans. Assign a named independent reviewer; do not let an implementation's author certify their own correctness alone.

## 1. Evidence model

Map every required invariant to unit/property/model/integration/browser evidence and a named owner. Record actual commands, seeds, source/configuration hashes, counts, browser versions, viewport/DPR and failures in `docs/gameplay-acceptance.md`. Keep large machine reports/screenshots/traces under ignored `prototypes/gameplay-validation/`. Track minimal original/licensed regressions and deterministic failing seeds in tests.

Use complementary evidence:

- Mathematical constraints and independent algorithms for rules/solutions.
- Exhaustive verification of the entire finite shipped corpus.
- Positive/negative/witness/metamorphic tests for human deductions and explanations.
- State-machine/property tests for command sequences and idempotency.
- Injected failure/interleaving tests plus real IndexedDB in multiple browsers.
- Actual Codex browser user journeys and visual/focus/accessibility review by the lead.

Coverage percentages, generated probe counts, a successful playthrough and agent agreement cannot substitute for the other layers. Do not relabel previous prototype/UI results as gameplay certification.

## 2. Gate A: baseline, plans and contracts

Before implementation:

1. Record checkout/HEAD, existing user changes and current type/build/UI checks. Do not discard changes or promote prototype code.
2. Have a named specialist challenge the lead's overall architecture, task dependency, catalog, transaction and test plans using primary online research.
3. Record every accepted plan ID, sources, assumptions, alternatives, strongest counterexample, replies, agreed direction and evidence gates. Do the same for specialist plans and every fix/material revision.
4. Define exact file ownership/contracts and trusted versus untrusted data boundaries. No overlapping worker edits without an explicit transfer.
5. Establish fixture/data licenses, independent oracle topology and safe isolated test storage. No tests operate on real player data.

Routine execution inherits an accepted plan; a new direction/assumption reopens review. This prevents recursive meta-planning without exempting any plan from research/challenge.

## 3. Gate B: rule kernel and exact oracles

| ID | Required case/invariant | Evidence |
| --- | --- | --- |
| R01 | 81 cells, 27 correct units, three memberships and 20 unique peers per cell; symmetric/no self peers | All cells/units, independent expected topology |
| R02 | Every digit/blank bit mapping; all row/column/box boundaries | Exhaustive cell/digit cases, property checks |
| R03 | Empty, completed valid, full invalid, contradictory clues, unsatisfiable consistent-looking, ambiguous and unique inputs | Independently constructed/original or correctly licensed fixtures |
| R04 | Strict invalid types/lengths/characters/NaN/floats/holes rejected | Decoder fuzz tests, no forgiving stripping |
| R05 | Candidates/conflicts match direct rules, including all duplicate participants | Independent simple reference implementation, randomized valid/invalid states |
| R06 | Count semantics 0 / 1 / at least 2; cap2; canceled/timed-out remains unknown | Empty/underconstrained grids terminate; cancellation tests |
| R07 | Completion checks all units and original givens, not only no blanks or solution string | Tampered clue, full wrong grid, corrupted snapshot cases |
| R08 | MRV and Algorithm X disagree neither on accepted fixtures nor corpus; no shared peer builder | Source review, differential tests, all emitted records |

Useful property/metamorphic checks include valid digit permutations, all D4 transforms, permitted row/column/band/stack transformations and invariance of exact solution multiplicity. These tests must transform givens/solution/expected deductions together and never inflate the production catalog count.

Use deterministic generators with shrinking and recorded seeds, preferably a small compatible development-only property tool such as [fast-check](https://fast-check.dev/docs/advanced/model-based-testing/). Research/pin compatibility before adding it. The independent model should be simpler than production and must not call the same reducer/solver to calculate expected results.

## 4. Gate C: complete catalog certification

| ID | Required case/invariant | Evidence |
| --- | --- | --- |
| D01 | Explicit data rights, pinned revision/blobs/bytes/SHA-256, upstream uncertainty retained | Source lock/notices, primary links and reproducible input capture |
| D02 | Strict source parse and rating boundaries; malformed/quarantined reasons | Independent source parser, full counts/histograms |
| D03 | At least 100k accepted; minimum 25k Easy/25k Medium/50k Hard; >=1k per five scheduled intervals | Exact emitted counts after all validation/deduplication |
| D04 | Every shipped record uniquely solved by independent oracles and all units/givens validated | Full emitted-file certification, no sample-only pass |
| D05 | Every emitted source ID/rating/givens/file/revision association matches original bytes | Independent join; deliberate neighboring-row metadata swap must fail |
| D06 | Exact/D4/digit-label duplicate scope correct; conflicting exact metadata quarantined | Canonical-key tests, collision/representative cases, explicit full-equivalence limitation |
| D07 | Rebuild and checkout bytes are reproducible; modified input/policy/oracle invalidates certificate | Clean second import and clean checkouts with `core.autocrlf=true`/`false`, effective attributes, canonical input hashes, per-shard/manifest and actually served production-byte hash comparison |
| D08 | Five shared pools; Quick weighted unseen selection uses same authority as frontier/replay | Mixed-mode state-machine/allocation tests |
| D09 | Exhausted lower Medium plus unseen upper Medium | Quick Medium prefers lifetime-unseen, not reset-epoch repeats |
| D10 | One remaining unused record, one-record pool, full exhaustion, corrupt candidate | Bounded deterministic termination, no immediate repeat where alternatives exist |
| D11 | Simultaneous mode allocations reserve atomically | Real-IDB interleaving and stale-cursor tests |
| D12 | Catalog update retains chosen equivalence representatives or migrates group aliases | Old/new concrete-ID representative case, stable freshness history |
| D13 | Initial manifest/shard request count, decoded/gzip bytes and parsed memory bounded | Built network/heap evidence; no startup corpus/eager ID list |
| D14 | 404, truncated/oversized JSON, wrong hash/schema/count/rating, canceled/stale response | Failure injection and real fetch behavior; old attempt preserved |
| D15 | Root and repository subpath; public manifest paths, cached/missing content | Built artifact server and browser network audit |

Catalog validation can be an explicit full command outside the fast default suite, but it is mandatory before catalog acceptance/final commit. A 40k progress run, source metadata size or a certificate produced by the same unchecked importer is insufficient.

## 5. Gate D: deduction patterns and hints

For every required technique, test premises and explanation as well as conclusions. At minimum cover distinct positive examples and near-miss/degenerate negatives in row/column/box orientations, plus mapped transformations. Store fixtures in data files with ownership/license metadata.

| ID | Required challenge |
| --- | --- |
| H01 | Correct solution digit with the named pattern absent must fail the independent witness validator |
| H02 | Original state must be satisfiable before oracle-based elimination proof; unsatisfiable state cannot vacuously certify everything |
| H03 | Incomplete/wrong manual notes never manufacture a single/subset/fish |
| H04 | Every placement/elimination follows the declared witness and preserves valid solutions |
| H05 | Pair/triple cell/digit cardinalities, locked candidate direction and basic versus finned/degenerate X-Wing are distinguished |
| H06 | Value edit/overwrite/erase/undo/restart invalidates prior derived elimination trace, not only pending UI hints |
| H07 | Delayed hint after logical-premise/owner/attempt/generation change is discarded; no stale application |
| H08 | First informative stage, including highlighting/technique/correctness feedback, follows durable disclosure acknowledgement |
| H09 | Crash after disclosure commit/before display restores the recorded payload once; repeat Apply/Reveal cannot erase or duplicate knowledge effects |
| H10 | Unsupported logical step becomes honestly labeled reveal choice; no fabricated explanation or hidden solution checking during ordinary entry |
| H11 | Localized explanation parameters exactly match witness cells/digits/units; no solution hidden in ordinary accessibility labels |
| H12 | Multi-second hint survives multiple timer checkpoints/manual-note edits when values are unchanged, rebases onto current storage state and never pauses scored time; value edit invalidates it |

An independently verified answer alone is not technique correctness. Review the witness validator separately from detector code and test it with deliberate false labels/incorrect premises.

## 6. Gate E: session, input, clock and undo

Test deterministic model-generated sequences of entries, notes, erase, undo, restart, save/reload, mode switches and asynchronous acknowledgements. Initial floor: 2,000 seeded sequences of up to 250 commands, plus all named deterministic regressions. Increase/restructure when counterexamples or coverage gaps justify it; raw counts are not a correctness argument.

| ID | Required case/invariant |
| --- | --- |
| S01 | Clues never mutate; rejected/no-op edits do not create undo/writes |
| S02 | Same-value input no-op, overwrite, erase and filled-cell Notes follow one agreed contract |
| S03 | Placement clears own notes and matching peer notes atomically; Undo restores the complete compound patch |
| S04 | Undo depth 511/512/513, empty history, note toggles, mixed changes and reload restore exact reversible state |
| S05 | Undo/Restart cannot rewind time, knowledge, receipt, wallet, use history or frontier |
| S06 | Pending/completed attempts are immutable; failures/reload do not reopen a paid attempt |
| S07 | Board, dock, enlarged notes editor and keyboard all use the same reducer commands |
| S08 | Mouse/touch digit then arrow/next digit has no keypad-focus dead end; named tool dismissal restores appropriate focus |
| S09 | Numpad, invalid keys, IME/composition, modifier shortcuts and repeat keydown; active dialogs/text fields own input |
| S10 | Timer starts at reveal/interactivity; readable More/tools count; loading/start notice/first digit do not create free study |
| S11 | Pause/Settings/menu/hidden/ownership-conflict states conceal active board+notes and stop time; completed review exempt |
| S12 | Reduced motion, theme/locale/rotation do not change scored time, values, notes, undo, selection or seeds |
| S13 | Reload/BFCache/long task/sleep/clock changes use defined monotonic segments and durable elapsed acknowledgement |
| S14 | Unmount/route changes/repeated overlays dispose workers/listeners/observers without orphan clock/save work |
| S15 | Reason-specific focus: Resume/Escape/Back -> More; applied Notes/Erase/Hint -> selected cell; Undo -> edited cell; Quit -> modes |
| S16 | Held Notes digit cannot toggle repeatedly; discrete commands ignore repeat while navigation may repeat and text fields remain native |

Keep injected unit clocks distinct from actual browser lifecycle evidence. Verify that the decorative clock can reset while gameplay elapsed remains correct.

## 7. Gate F: modes, scores and progression

| ID | Required case/invariant |
| --- | --- |
| M01 | Quick Play all three labels and resume/replacement, independent of unlocked Progression |
| M02 | Frontier at Leaps 1,6->7,15->16,24->25,42->43,60->new Metamorphosis/Leap 1 |
| M03 | Replay each boundary including 60 never advances/resets frontier; fresh issue history and ordinary equivalent rewards |
| M04 | Switching/replacing replay preserves exact unfinished frontier; highest unlock survives runs within schedule version |
| M05 | Completion before Continue retains displayed old board/result even though next frontier metadata exists |
| M06 | Repeated/slow double Continue, reload or stale response creates one next allocation, not another reward/advance |
| M07 | Two stale attempts bound to one frontier position cannot both claim its grant; separate legitimate role completions retain both wallet deltas |
| M08 | Score examples and E=0,T-1,T,T+1, zero/one/all exposed answers, repeated reveal, unsafe numbers and rounding |
| M09 | Notes/undo/direct conflicts free; logical info/check removes speed; displayed answer marks distinct cell before Apply |
| M10 | Reveal->undo->erase->restart->reload never restores bonus/unassisted cell credit |
| M11 | Slow/assisted valid completion advances independently of score, including zero reward |
| M12 | Catalog/schedule/score updates do not reprice active attempts/receipts or discard unfinished boards/history |
| M13 | New puzzle, Restart and data reset are distinct; ordinary Progression New game never resets counters/wallet |
| M14 | New puzzle/role replacement during validating, pending completion, write-failed solved and retained completed-result states follows the explicit role-status table; no bypass of result/commit/Continue |

All score/policy computations use independent expected arithmetic examples, not calls to the production function as the test expectation.

## 8. Gate G: persistent state and failure interleavings

Use real IndexedDB tests in Chromium, Firefox and WebKit. An in-memory/fake implementation helps property exploration but cannot replace real transaction lifecycle, blocked/versionchange, quota-denial and connection behavior. Record platform-specific unavailable simulations accurately.

| ID | Required failure/interleaving | Expected durable outcome |
| --- | --- | --- |
| P01 | Abort completion after each queued request and after request success/before transaction complete | No partial receipt/wallet/frontier/completed state; retry same attempt |
| P02 | Reload/crash before commit, after commit/before render and after result shown | Zero or one complete durable outcome; no double pay |
| P03 | Two legitimate roles complete concurrently | Read current wallet inside each transaction; both deltas retained |
| P04 | Distinct stale frontier attempts/race on same grant | One frontier grant only; clear conflict/recovery |
| P05 | Out-of-order/coalesced snapshots and slow storage | No old acknowledgement overwrites newest state; bounded queue |
| P06 | Hint before commit / commit before display / display before reload | No unrecorded useful disclosure; pending payload recovers once |
| P07 | Generation changes while old tab edits/checkpoints/discloses/completes | Every stale essential mutation rejected by in-transaction generation check |
| P08 | Writer takeover during pending save, missing Web Locks/BroadcastChannel message, frozen owner | Epoch/revision authority works without notifications; non-owner active board concealed |
| P09 | Duplicate allocation/Continue; same unused candidate selected by two modes | One reservation/attempt per intent; cursor/role/use history committed together |
| P10 | Restore parse/stage fails or process stops before pointer flip; successful staging without active-state changes | Prior generation remains authoritative before flip; inactive staging revisions do not invalidate their own preview, and complete unchanged staging can activate |
| P11 | Another mode edits/completes after restore preview but before flip | Generation-revision CAS conflicts; no silent loss of newer data |
| P12 | Old app opens newer database; upgrade blocked/versionchange/close | Read-only/reload/export/retry; never delete/recreate |
| P13 | Corrupt arrays/clues/notes/history/time/policies/receipts, future schema | Strict quarantine/recovery; no fake defaults wiping independent valid state |
| P14 | Unknown/modified imported puzzle with valid-looking solution | Unique-solution verification alone does not establish rating/source eligibility; no scored catalog attempt without all required provenance/eligibility |
| P15 | Imported duplicate/conflicting receipts, unsafe totals, additive wallet attempt | Reject or safe validated replacement; never additive merge |
| P16 | Large exported history, truncation, excessive depth/bytes, prototype keys | Export/import same-version round-trip; bounded safe parser |
| P17 | Denied/quota/closed database, pending completion and explicit ephemeral play | Honest unsaved/unscored state; no silent durable wallet merge |
| P18 | Cache quota abort/eviction during gameplay save | Only disposable cache affected; essential save remains correct |
| P19 | Old catalog missing/network offline while resuming an active snapshot | Exact board/notes/time/policy resume locally; missing next shard is a separate recoverable state |
| P20 | Failed disclosure -> RAM-only unscored/same-puzzle fork -> crash -> old durable scored resume | No useful disclosure without committed assistance or irrevocable retirement; fresh ephemeral attempts never become rewarded |
| P21 | Hint ledger's own revision update and frequent time saves | Proof checks logical revision, returns committed storage revision and preserves latest elapsed/notes without livelock |
| P22 | Large history after many Continue/replacement operations | Old full undo/proof snapshots compact safely; receipt/knowledge/freshness integrity and matching backup round-trip retained |

Simulated tab closure or transaction abort is not a physical power-loss test. Browser storage retention and strict durability hints have documented limits; do not claim guaranteed persistence against all eviction/media failure.

## 9. Gate H: browser journeys and visual/accessibility review

The lead personally uses Codex browser. Discover/follow its current runtime documentation and keep one clear session owner. Specialists use their own isolated browser contexts or saved artifacts, never race the lead's tab/viewport.

Review at least 360x800, 800x360, 393x873, 873x393, 320x568, flexible tablet/desktop and 1280x720. Test actual supported zoom/text enlargement and safe areas. A CSS font override or scaled screenshot is a simulation, not proof of real 200% browser zoom/Android scaling. Record viewport, DPR, zoom method and browser version with screenshots. Native Motorola/DPR3/hardware remains a separate gate when hardware is unavailable.

Required lead journeys:

1. Start each Quick Play label, enter/overwrite/erase, toggle Notes, edit sparse/all-nine notes, undo peer cleanup, receive correct conflict feedback, leave/resume/reload and finish.
2. Complete frontier boundaries, Leap 60/Metamorphosis reset, replay old/final Leaps and return to unchanged frontier. Exercise repeated Continue and mode switching during a delayed shard load.
3. Inspect actual pattern proof/explanation and a labeled fallback reveal. Test wrong nonconflicting entries, canceled/stale hints, assistance effects and restart/reload persistence.
4. Open readable More while timer runs; use concealed Pause/Settings; rotate with each overlay open; Escape/Back/Forward closes the appropriate layer first without stale popup history.
5. Resume in a second tab, transfer ownership, simulate lost notification and verify hidden/non-owner boards are concealed and cannot overwrite/award.
6. Exercise storage failure/retry/pending solved state, export, validated restore preview, concurrent restore conflict and recovery. Use only test data.
7. Change every supported preference/locale during a pending save. Switch Fill space/Square with overlays open in both orientations. Preserve the attempt and all 81 targets; no decorative reseeding or theme-owned game state. Check Square's dock-anchored grid with exact 8px grid/dock gap, perpendicular centering and deliberate unused water; Fill still receives the full remaining allocation.
8. Inspect completion announcement, focus transfer, persistent breakdown and Continue. No success before durable commit, timed result dismissal or disabled-board focus loss.

Measure all 81 targets, ten-key row-major order, exact gaps, safe-area/full allocation, fixed identity and menu reservation, no accidental overflow, no gameplay mascot/HUD and unchanged sketch provenance. Compare actual final screens with the current production UI/prototype/ImageGen guideline, documenting better/worse/intentional differences. Fix visible clipping, seams, pinches, unreadable controls and focus problems.

Verify named dialogs, keyboard containment/ownership, non-color clue/entry/conflict/selection/Notes cues, localized accessible names, reduced motion and non-spammy announcements. Tiny note marks are not separate tiny touch targets: full cells/dock and the enlarged notes tool provide input. Verify >=24px targets or applicable spacing/equivalent controls, with generous tool/dock targets where feasible, following [WCAG target guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) and [WAI interaction patterns](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).

Actual tiny-note usability must be addressed through a usable enlarged selected-cell/notes tool or a demonstrably readable equivalent. Do not carry the static specimen's unapproved 5.57px claim into a working game's acceptance. State actual screen-reader/hardware checks performed versus AX/viewport simulations; do not invent assistive-technology testing.

## 10. Coverage, mutation, scale and release report

Require complete statement/branch coverage of critical pure decoder/rules/reducer/score/progression decision paths, with every exclusion justified against an invariant and independently reviewed. Coverage alone is not proof. Use development-only mutation testing on critical modules after researching a compatible runner, for example [Stryker plugins](https://stryker-mutator.io/docs/stryker-js/plugins/). Every surviving meaningful mutation in validation, candidate legality, completion, assistance, reward arithmetic, frontier/grant, generation/revision or transaction acknowledgement must be killed by a real regression or shown equivalent with review evidence. Do not hide it with broad ignore patterns or advertise a percentage as bug freedom.

Benchmark large realistic data/history, not only tiny fixtures: complete catalog import/certification, manifest and shard parse/load, near-exhaustion selection, long undo, many receipts/use-history records, migrations, backup round-trip and slow/failed storage. Keep heavy work off the UI path where measured necessary; bounded workers need cancellation, stale-response protection and cleanup. State measurements and environment, not unverified Motorola energy/frame-rate claims.

Final scripts should make checks reproducible, with names agreed by the lead. Existing commands remain `npm ci`, `npm run check`, `npm test`, `npm run test:browser` and `npm run build`. Add explicit commands for full catalog verification, model/property suites and mutation gates rather than pretending they already exist. Pin local compatible dependencies and preserve distribution notices/base-path behavior. No required backend, WASM or third-party runtime puzzle fetch.

Final acceptance record must include:

- Exact committed HEAD, policy/schema/catalog/certificate versions and accepted counts/quotas/intervals.
- Command results and logs/hashes for every gate, plus minimized regressions and independent reviewers.
- Actual Codex browser screenshots/flows, supported browsers, viewport/DPR/zoom/safe-area methods and unresolved external hardware limits.
- No known unresolved required correctness, data-loss, duplicate-reward, unsound-hint, essential accessibility or regression blocker. Do not park an unmet required behavior as a cosmetic P3 to declare completion.
- Clear distinction between implementation completion and external release/hardware acceptance. Do not claim every possible bug is absent, every puzzle's human difficulty is universal or browser storage is unconditionally durable.
- Periodic accepted green Conventional Commits and a clean final worktree containing only the authorized implementation/documentation. No unrelated user work, raw downloads, generated mockups or test artifacts staged.

If a required check fails, reproduce, research/challenge the fix with its specialist, implement the agreed revision and rerun the affected cross-module gate. Do not weaken a requirement or stop because the task is long. If a genuine external gate cannot be satisfied, complete all independent work and report the precise evidence/blocker instead of relabeling it passed.
