# Rowan offline reserve review

## Researched plan and challenges

Scope: `codex/pwa-offline`, based on committed main `ecc8c30`, separate managed worktree. Rowan owns `src/lib/offline/`, narrowly scoped catalog loader changes, corresponding tests and this review. Essential repository, selection version 1, catalog bytes, certificates, receipts, scoring and themes are unchanged.

Primary sources checked during implementation:
- [Browser quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria): Cache Storage and IndexedDB share origin capacity; persistence permission does not replace backups.
- [Workbox deployment](https://developer.chrome.com/docs/workbox/service-worker-deployment): large or early optional precaches can compete with useful loading.
- [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort): cancellation can stop fetch/body consumption; shared ownership must be preserved.
- [IndexedDB transaction completion](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event): request success alone does not acknowledge a completed write.

Lead challenged the original sixteen-shard cache: it discards write results, evicts promised bytes and cannot prove playable capacity. Agreement: retain the existing bounded demanded-shard cache for compatibility, but use a separately named disposable database for complete attested records plus trusted manifest bytes. No service-worker catalog cache duplicates whole shards. Compact records retain existing certification membership proofs and are checked again before use. Merely finding bytes never authorizes allocation or readiness.

Rejected alternatives:
- Whole-shard pinned reserves consume several megabytes for a few shuffled requested records and require a changed eviction contract.
- Availability-aware allocation would alter certified traversal/freshness and require migration and broader gameplay validation. Existing exact ordinal selection stays authoritative.
- Automatic background puzzle refill without known connection consent would repeatedly consume data; missing network hints do not establish an unmetered connection. Automatic optional puzzle downloads are zero. Demanded puzzles still load online, and explicit default/travel preparation is available.

## Cost experiment before choosing limits

Actual unchanged manifest/shards were read locally with production permutation seeds 1, 7, 12345, 4294967295 and 305419896. Initial cursor zero, no active exclusions. Unique touched shards, logical file bytes and local gzip output were measured. These are encoded-byte estimates, not authorized GitHub Pages wire or physical-device measurements.

| Allocations per each of five pools | Unique shards | Logical shard bytes | Local gzip bytes |
| --- | --- | --- | --- |
| 1 | 5 | 334,789 to 334,792 | 162,490 to 162,608 |
| 3 | 14 to 15 | 936,888 to 1,004,375 | 454,785 to 487,785 |
| 10 | 45 to 48 | 3,007,938 to 3,213,609 | 1,460,001 to 1,559,908 |
| 25 | 104 to 111 | 6,961,167 to 7,373,914 | 3,379,297 to 3,579,593 |
| 50 | 176 to 186 | 11,771,529 to 12,385,366 | 5,714,107 to 6,013,745 |

Lead/Cora/Sage challenged these choices and accepted default 3 per pool, explicit travel 25 per pool, subject to actual attained capacity and action budgets. Default preparation allows 2MiB decoded response budget; travel 12MiB. Each new shard attempt is charged the maximum 96KiB bounded response, plus up to 128KiB metadata, before starting. Stop at the allowance or first failure. Repeated explicit actions are new player-requested transfers, not an automatic allowance reset. Foreground requests remain available independently.

Records are limited to 512 and 1MiB of serialized record JSON; each record at most4096 bytes. Trusted manifest is separate and at most128KiB. Existing demanded-shard cache retains at most16 shards of at most 96KiB each. Browser disk overhead and app-shell storage are additional measured acceptance quantities. No automatic eviction of retained records, including prepared records, occurs. Remove downloads clears only compact records and reserve metadata, retaining trusted manifest and every essential save.

## Coverage proof and independent challenge

Readiness is upcoming capacity now, not arbitrary future play. All five pools are protected, so Quick Medium/Hard cannot choose an unprepared constituent merely because the other is cached. Ordinary allocation recomputes exact candidates and repository CAS authority as before.

For a horizon N, preparation includes raw permutation positions, including currently excluded positions. If an active role is released later, this prevents exposing an omitted hole. With no epoch wrap, newly allocated positions lie behind the cursor; only initial exclusions can cause skips. At a wrap, require count greater than 2N+8, satisfied by all current certified pools for N<=25. The covered window spans at most two epochs. At most four initial blockers can occur twice (eight skips). At most N newly allocated first-epoch ordinals can appear once more in the second epoch. Thus 2N+8 raw positions conservatively cover N actual allocations across changing role retention. Tiny unsupported domains are rejected rather than assigned this guarantee.

Cora challenged an unrestricted wrap heuristic. Sage independently required the explicit domain guard and an independent dynamic-exclusion model. Lead agreed. Sage owns the separate model and blocked-position fault test. Travel25 per pool can cover the60-Leap Progression-only schedule and following rollover within its attained counts; Quick/replay/replacement consumption shares those pools and can shorten this horizon. Never promise endless offline play.

Actual-source review findings raised by Lead before acceptance:
1. Bind compact records to the initialized manifest's catalog/certification/source tuple, even if a future binary trusts more than one root.
2. Await explicit manifest persistence for preparation; a fire-and-forget write is not acknowledgement.
3. Await cancelled preparation before clearing downloads, so a delayed acknowledged put cannot repopulate after removal.
4. Reject malformed stored rows when enforcing storage accounting.
5. Stop optional planning at cancellation yields; a shared demanded manifest fetch remains separately bounded.

These are required fixes, not passing evidence. Corresponding implementation/test results are recorded below as they become available.



## Accepted implementation and pure evidence

The first green application slice is `eb055c9`. Cora reviewed the actual final offline deltas and accepted them after the findings above were resolved. Sage independently checked more than 400,000 dynamic role-release/replacement paths, 1,000 travel paths, unsupported domains and an intentionally broken omission of blocked positions. No production selection helper is used by that model's reference walk.

Actual fixes accepted through reciprocal review:
- Compact records match the initialized manifest tuple, ordinal and exact plain-data allocation shape before existing identity/Merkle verification. Unknown fields, symbols, hidden properties and accessors are rejected.
- Foreground optional compact writes are caught and are not awaited before returning a verified puzzle. Explicit preparation awaits manifest write acknowledgement and exact hash readback.
- Requests have separate foreground/background lanes, with at most one network read in each lane. A shared file keeps reference-aware cancellation. The coordinator queues one background file at a time. A 20-second own timeout is reported as unavailable; explicit player cancellation remains aborted.
- Bad HTTP/MIME/redirect responses cancel their unused bodies. Byte limits bound accepted application buffers; browser buffering and chunk overshoot are not a hard wire-byte guarantee.
- Removal waits for pending preparation and prior inspection. A disposable clear revision is changed atomically and rechecked before publishing counts; a scoped BroadcastChannel cancels/rechecks other open support instances.
- Completed preparation waits for any older inspection, then performs a fresh proof readback. It cannot remain falsely partial merely because an earlier inspection saw an unfinished pack.
- Storage opens time out after two seconds and late successes close their connection. Malformed inventory rows refuse further retention rather than evading size accounting.

Actual commands:
- `node tools/test.mjs unit --maxWorkers=2`:62 files, 412 tests, exit zero, 32.73 seconds.
- `npm run check`: zero Svelte errors/warnings and TypeScript exit zero.
- After the final fresh-inspection regression was added, `node tools/test.mjs unit tests/offline/reserve.test.ts --maxWorkers=1`:9 tests, exit zero, 36.94 seconds. The union is 413 tests; this does not claim all 413 ran in the earlier full invocation.
- `node --check tests/pwa/store-native.mjs`: exit zero. Native execution evidence remains separately required.

Ignored evidence logs and SHA-256:
- `unit/first-integrated.log`: `b0283c7c30b96bfb54c6baffff2dd88493492469785998c59539121798945c06`.
- `unit/first-check.log`: `1ffddf8cd63ccd1cba36a80354f2304168cb8b54d7cba31d93d4808c503ba8fb`.
- `unit/fresh-readiness.log`: `0d4b9749bd2be9bc58a74d768d957d569ec8290f363ce9e0dc026d4c9798cad6`.

These logs live below `prototypes/pwa-validation/`. The full corpus certification is reused only for its unchanged bound inputs. Actual SHA-256 checks match all six certified tool/importer/oracle files and four runtime attestation/decode/types/trust files. The loader is not in that certificate's bound runtime list. MIME fixture changes do not alter certified catalog bytes, Sudoku rules or oracle inputs.

The reproducible cost command is `node tests/offline/costs.mjs`; it writes the file-byte/local-gzip comparison to ignored `prototypes/pwa-validation/reserve-costs.json`. Actual compressed transfer, origin-wide estimates and closed-profile file sizes are native-browser evidence, not replaced by these arithmetic inputs.



## Offline invariant-to-test map

| Matrix scope | Invariant | Executable evidence and limits |
| --- | --- | --- |
| O03/O04/O05/O06 | Preparation includes every exact candidate within the declared constrained horizon, including blocked raw positions and one epoch boundary. It does not change essential state. | `tests/pwa/reserve-model.test.ts` independently walks dynamic three-role retention/release, more than 400,000 short paths and 1,000 travel paths. The blocked-position omission fault is detected. `tests/offline/reserve.test.ts` compares the whole essential save before/after preparation. This is a finite proof/model plus current count guard, not arbitrary endless play. |
| O04/P03 | A missing exact record remains fetchable online even when optional retention refuses writes. Cached substitution is forbidden. | `cold exact record reads use verified durable manifest and proof, while a missing exact ordinal still fetches online if writes are refused`; unchanged allocation/selection tests remain in the full suite. Native 512-record boundary is a separate production-browser gate. |
| O07 | Current generation/pool traversal/active exclusions are re-read; stale staging cannot publish old pins. | `detects a generation/pool change during staging rather than publishing stale pins` and `fresh state recomputation rejects a consumed frontier...`. Repository allocation CAS and issued/group authority are unchanged. A count is the last inspected capacity, not a future reservation. |
| O09 | Wrong proof, identity, ordinal, schema or manifest identity never contributes to ready capacity. | Catalog load/attestation suites; `tests/offline/load.test.ts` rejects extra record/proof fields, symbols, hidden fields, accessors, a mismatched manifest and invalid MIME/redirects. Response-body cancellation is asserted. Actual cached bytes must be rechecked. |
| O10/I03 | Neither a request success nor a pending put constitutes durable readiness. | `write or independent readback failure never advertises a completed reserve`; `explicit preparation cannot acknowledge a manifest until the awaited write and exact readback succeed`. Unknown/unsupported data refuses readiness. Native quota/abort faults remain separate. |
| O10/O11 | Clear cannot race a pending write or stale local inspection into a ready banner. A concurrent clear invalidates inspected capacity. | Three minimized reserve tests: pending acknowledged write, stale in-flight inspection, and another connection clearing before final inventory. The native test separately checks real IndexedDB writes/removal. A browser/user eviction after the final check still cannot be ruled out. |
| O11 | Only disposable compact records/reserve metadata are removed, and essential settings, attempts, histories, receipts, wallet and recovery are preserved. | Reserve test compares the entire essential DTO across clear. `tests/pwa/store-native.mjs` compares real paused essential-store snapshots; it also records retained manifest and recent cache separately. Browser-origin eviction is outside application cleanup control. |
| P02/P03 | Foreground selection does not wait behind an entire pack; shared cancellation keeps an interested foreground consumer alive. | `foreground exact fetch bypasses a held background file; cancelling the shared background consumer preserves foreground ownership` asserts two catalog network lanes maximum and correct resulting record. Real shaped-network input effects are Sage's separate production measurements. |
| P03/P04 | A single request or body cannot wait indefinitely; failure stops the action and does not silently retry. | Own 20-second fetch/body timeout tests assert unavailable, while shared explicit cancellation remains aborted. The coordinator has one file at a time, no automatic optional puzzle transfer and no automatic retry loop. Byte-budget stop fault is tested separately. |
| O10/P03 | Count and byte retention caps are atomic across writers; reaching them cannot restrict ordinary online selection. | Production-browser native store runner covers 512 records and near 1MiB serialized JSON, malformed cached data, and deliberately scoped QuotaExceededError/transaction-abort faults. Synthetic faults are labelled; natural disk exhaustion is not claimed. |
| R02 | Meaningful safety faults must produce failing evidence. | Blocked-position omission model; false write acknowledgement/corrupt readback; extra-field valid-proof record; exact online miss with refused optional storage; stale-clear races; malformed MIME and own timeout. These are independent behavioral counterexamples, not string snapshots of implementation. |

Reproduction scopes:
- Complete unit suite: `node tools/test.mjs unit --maxWorkers=2`.
- Owned focused logic: `node tools/test.mjs unit tests/offline tests/catalog/load.test.ts tests/catalog/attestation.test.ts tests/pwa/reserve-model.test.ts --maxWorkers=1`.
- Real browser storage: `node tests/pwa/store-native.mjs <frozen-production-build>`, using only owned port 5199 and its isolated persistent Chromium profile.
- Candidate costs: `node tests/offline/costs.mjs`.

Fingerprint reuse summary: certificate SHA-256 `f9eea56946e0ad4331fd68d1df10106e3994146f0db08c2a48680b41e575ad42`; all thirteen tool/runtime/oracle/lock/selection checks pass. All 488 shards total 32,441,127 bytes and retain their descriptor hashes. Manifest, provenance and source license match; complete inventory SHA-256 remains `372b25e8515aeac44bdea3dc12aaba1450562a220934f1a20b92ff6cabfde131`. The actual content-only report is `prototypes/pwa-validation/catalog-reuse.json`. It does not execute either Sudoku solver again.



## Cumulative transfer allowance correction

Lead's actual-source challenge found a material counterexample to charging each unique shard path once: foreground play can evict a background shard from the three-entry decoded cache and sixteen-entry recent cache before another prepared record needs that same file. A second network fetch must consume another allowance. Path uniqueness is not a cumulative-transfer bound.

Sage challenged the first proposed fix of charging immediately before a queued fetch: a foreground consumer could already have joined the optional SharedRead when its allowance was refused, incorrectly restricting ordinary online play. Lead accepted the smaller safe rule: after cache lookup and caller-abort checks, admit/debit a newly created optional SharedRead before publishing it to other consumers. Refused work creates no shared entry; a foreground request can start independently. Already admitted shared work is charged once. Repeated reads of a file after eviction are charged again. An admitted queued request cancelled before transfer conservatively consumes allowance; there is no automatic retry to reclaim or reuse that charge.

Each action owns its received-byte callback. If an old cancelled optional request continues for a foreground consumer, its later bytes cannot inflate the next preparation action's display. These received bytes are distinct from the pessimistic allowance reserved at admission.

New meaningful tests:
- Foreground LRU eviction forces a background refetch; the second admission is debited/refused and a simultaneous same-path foreground request succeeds.
- A shared foreground-created request consumes no optional allowance. A shared background-created request has one admission and retains its original action's byte ownership after one consumer cancels.
- At an actual epoch boundary the default closure needs more than twenty distinct files. A fresh action reserves 128KiB metadata and twenty 96KiB shard reads, then refuses the twenty-first before starting it. Verified partial records remain, the complete essential save is unchanged, inspection starts no retry and the problem is the explicit download limit.

Actual final affected command:
`node tools/test.mjs unit tests/offline/load.test.ts tests/offline/reserve.test.ts tests/catalog/load.test.ts tests/catalog/attestation.test.ts tests/pwa/reserve-model.test.ts --maxWorkers=2`.

Result: five files, 34 tests, exit zero, 36.87 seconds. `npm run check` then passes with zero Svelte errors/warnings and TypeScript exit zero in 5.12 seconds. Logs are `unit/budget-admission.log` and `unit/budget-admission-check.log` under ignored PWA evidence.

No physical-link wire cap is claimed. The admission allowance bounds requested application payload work; the browser may buffer bytes before JavaScript cancels a bad or interrupted response. Actual encoded body bytes in native acceptance are measured separately.



## Native storage evidence

Executed `node tests/pwa/store-native.mjs prototypes/pwa-validation/releases/activation-budget/A` with a fresh persistent desktop Chromium profile at owned port5199. The frozen build is `d4388e240b892c0dd43bbe2fe5ed99a736132854f653bfd8071d83bd040c2758`; worker SHA-256 is `eb7ca59efba1ffff4614e2e86338afb251627e9e67580940466d76a438707e8c`. This is desktop production-worker/IndexedDB evidence, not Android installation or actual Pages hosting.

Actual default preparation from the menu:
- 15 compact records, 27,375 serialized JSON bytes.
- Trusted manifest 127,753 bytes.
- Recent demanded/prepared file cache 15 shards, 1,006,318 logical bytes.
- Origin-wide browser estimate 28,936 bytes before preparation and 3,132,435 afterwards: Cache Storage 2,057,728; IndexedDB 1,052,339; service-worker registration 22,368 bytes. Estimates share origin quota and are not per-store disk measurements.
- After closing the profile, actual files under Chromium IndexedDB total 1,052,804 bytes; CacheStorage files total 2,048,960 bytes. These include browser/database overhead and obsolete log-structured bytes pending compaction. Essential saves, compact records and recent shards share IndexedDB attribution.
- Menu-to-prepared action takes 1,049.33ms on the unshaped local host. It sends 2,001,367 gzip/identity body bytes for 3,111,753 logical response bytes, including the separately prepared app closure, dialog/metadata and puzzle files. This is not the first-play download, not a phone result and not HTTP/TLS overhead. Source requests permit each part to be separated for final acceptance.

Real native boundary/failure outcomes:
1. A 512-record fixture occupies 931,840 JSON bytes. Despite refused optional retention, ordinary online allocation fetches the exact independently predicted Easy ordinal 205 and succeeds; count stays 512.
2. A 256-record near-byte-cap fixture occupies 1,047,040 JSON bytes. Preparation refuses another record and reports counts 0/0/0.
3. Removing extras preserves the entire paused essential-store snapshot byte for byte and reports 0/0/0. The trusted manifest remains.
4. A valid-proof record with an unknown field is rejected, reducing inspected Easy coverage to 0 while Medium/Hard remain 3/3.
5. A corrupt membership proof is ignored; a later normal online allocation fetches the correct exact ordinal 19186 and recovers.
6. Deliberately scoped QuotaExceededError and transaction-abort faults both leave records/counts at zero and essential snapshots unchanged. These are synthetic native-interface faults, not a claim of natural device disk exhaustion.

The first runner stopped after item 4 because its test-only immediate replacement-button count ran before the legitimate asynchronous confirmation appeared. The retained profile was reopened and the actual DOM showed `Replace unfinished puzzle?`, Cancel and Replace puzzle with zero board cells, confirming correct application behavior. The harness now polls for either the board or replacement control, then acts. No runtime fix was made.

Only the affected tail was resumed:
`node tests/pwa/store-native.mjs prototypes/pwa-validation/releases/activation-budget/A --resume prototypes/pwa-validation/store-native/1793518031827`.

It exits zero in 2.19 seconds, covering items 5/6. The original failed overall runner is preserved and is never called a complete passing invocation. Its completed prefix assertions and the exact-profile continuation jointly cover the native storage scope without repeating unchanged earlier gates.

Ignored evidence:
- Prefix and retained harness failure: `store-native/1793518031827/report.json`, SHA-256 `964a22a8e31327dc0436ba8c014c54da208f77b9ffe2f73abe7d3fab4657f0e4`.
- Confirmed DOM screenshot: `store-native/1793518031827/confirmed-replacement-dialog.png`.
- Passing affected continuation: `store-native/1793518154227/report.json`, SHA-256 `047c77729a73034f6b112a20b892da5aa924f7df1d9cc2377972dfbe4e34850e`.
- Cost comparison: `reserve-costs.json`, SHA-256 `6cf5d0dafb60f67aead61097b7636f5d3d52d46a187232c99cd238c93d00c78c`.
- Unchanged certification fingerprints: `catalog-reuse.json`, SHA-256 `c62ccba4a22de83d0ace43444afaeef55ab5382161345e80026330ad3df12cf5`.

Cora independently reviewed and accepted the final per-read admission implementation and its 34 affected tests/check scope. No remaining offline allocation/storage source blocker was found. Sage's broader cold solving, all-role/reward, travel, rapid-update and performance journeys remain separately attributed in the lead acceptance record.

