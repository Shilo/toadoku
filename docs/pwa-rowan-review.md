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

Lead/Cora/Sage challenged these choices and accepted default 3 per pool, explicit travel 25 per pool, subject to actual attained capacity and action budgets. Default preparation allows 2MiB decoded response budget; travel 12MiB. Each new shard attempt is charged the maximum 96KiB bounded response, plus up to128KiB metadata, before starting. Stop at the allowance or first failure. Repeated explicit actions are new player-requested transfers, not an automatic allowance reset. Foreground requests remain available independently.

Records are limited to512 and1MiB of serialized record JSON; each record at most4096 bytes. Trusted manifest is separate and at most128KiB. Existing demanded-shard cache retains at most16 shards of at most96KiB each. Browser disk overhead and app-shell storage are additional measured acceptance quantities. No automatic eviction of retained records, including prepared records, occurs. Remove downloads clears only compact records and reserve metadata, retaining trusted manifest and every essential save.

## Coverage proof and independent challenge

Readiness is upcoming capacity now, not arbitrary future play. All five pools are protected, so Quick Medium/Hard cannot choose an unprepared constituent merely because the other is cached. Ordinary allocation recomputes exact candidates and repository CAS authority as before.

For a horizon N, preparation includes raw permutation positions, including currently excluded positions. If an active role is released later, this prevents exposing an omitted hole. With no epoch wrap, newly allocated positions lie behind the cursor; only initial exclusions can cause skips. At a wrap, require count greater than2N+8, satisfied by all current certified pools for N<=25. The covered window spans at most two epochs. At most four initial blockers can occur twice (eight skips). At most N newly allocated first-epoch ordinals can appear once more in the second epoch. Thus2N+8 raw positions conservatively cover N actual allocations across changing role retention. Tiny unsupported domains are rejected rather than assigned this guarantee.

Cora challenged an unrestricted wrap heuristic. Sage independently required the explicit domain guard and an independent dynamic-exclusion model. Lead agreed. Sage owns the separate model and blocked-position fault test. Travel25 per pool can cover the60-Leap Progression-only schedule and following rollover within its attained counts; Quick/replay/replacement consumption shares those pools and can shorten this horizon. Never promise endless offline play.

Actual-source review findings raised by Lead before acceptance:
1. Bind compact records to the initialized manifest's catalog/certification/source tuple, even if a future binary trusts more than one root.
2. Await explicit manifest persistence for preparation; a fire-and-forget write is not acknowledgement.
3. Await cancelled preparation before clearing downloads, so a delayed acknowledged put cannot repopulate after removal.
4. Reject malformed stored rows when enforcing storage accounting.
5. Stop optional planning at cancellation yields; a shared demanded manifest fetch remains separately bounded.

These are required fixes, not passing evidence. Corresponding implementation/test results are recorded below as they become available.

