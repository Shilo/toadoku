# PWA validation and acceptance matrix

Required by the [implementation handoff](pwa-implementation-handoff.md). These are acceptance criteria, not test results. [PWA acceptance](pwa-acceptance.md) records completed checks and external hardware/hosting gates. Research and independently challenge affected test plans, then map each implemented invariant to its actual evidence there.

## Evidence and resource rules

- Record exact source commit, worktree/branch, lockfile/tool/browser/device versions, build/worker/asset/catalog identities, commands, fixture provenance, outputs, network counts/bytes and limitations. Retain failures and superseded evidence honestly.
- Unit/model tests cover pure selection/readiness/cache/update policies. Real browsers cover actual service-worker lifecycle, Cache Storage, IndexedDB, network failure and install/update integration. Lead personally inspects critical journeys with Codex browser; independent QA reviews actual implementations.
- Build two or three real distinct versions, A/B/C. Serve them in sequence at one isolated persistent origin and the actual repository subpath. Do not substitute HMR, fake update events, service-worker bypass flags, DevTools "update on reload", or route-fulfilled offline responses for real lifecycle evidence.
- Cold offline means close/reopen the browser or installed app using the same persisted test profile, with network unavailable, then navigate normally. A fresh context with cleared storage or JSON storageState is not the same test; neither is a warm tab, Back navigation or a cached screenshot. Record the actual worker controller/response source and requests.
- Run heavy jobs serially; cap units at two workers and browser jobs at one. Use observable bounded waits, no per-click sleeps/screenshots. One coherent critical flow may exercise multiple rows. Repeat only affected checks after fixes; preserve exact unchanged-input reuse boundaries.
- Isolate fixture profiles/origins from gameplay/theme/user data. Never globally delete origin caches/registrations to make a test pass. Keep reports/screenshots/build fixtures under ignored `prototypes/pwa-validation/`.

## A. Architecture, build and scope

| ID | Required evidence |
| --- | --- |
| A01 | New managed worktree/new branch from recorded current main, owned ports/profile, unchanged original/theme worktrees, clean initial baseline and explicit file ownership. |
| A02 | Primary-source/actual-code comparison of manual worker, generateSW and injectManifest, including selected package peer/Node ranges, licensing, pinned lockfile and produced registration behavior. Challenge every material plan and fix before executing it. |
| A03 | Inspect actual dist/precache graph. Every required lazy JS/CSS/module worker/font/current-theme dependency and linked offline notice is present, bounded and correctly revisioned. First offline use of previously unopened Hint/Settings/Backup/Recovery works. |
| A04 | Build assertion excludes the full catalog, source maps, prototypes/tests/fixtures, dev-agent routes and unnecessary unselected theme packs. File-size omissions or late-generated required assets cannot silently produce a ready build. |
| A05 | Root, `/toadoku/` and any actual configured Pages base: correct manifest ID/start/scope, worker URL/scope, module/worker/font/data paths, query/hash navigation and trailing-slash behavior. An adjacent same-origin project retains its worker/caches/data unchanged. |
| A06 | Unique app release identity changes for relevant emitted-byte changes, including public images/fonts/workers. Unchanged content reuses bytes. Build/worker/catalog/schema/policy/theme versions are not conflated. |

## B. Installation and honest readiness

| ID | Required evidence |
| --- | --- |
| I01 | Actual Android Chrome installation initiated through the app: supported prompt from real user gesture, accepted path, standalone launcher identity/icon/start URL and reopening. Desktop/emulated or synthetic-event evidence is labelled separately. |
| I02 | Dismissed/consumed prompt, event not yet received, already standalone, unsupported browser, embedded/private/restricted context and browser-menu fallback. No false installed badge, endless prompt loop or unusable install button. |
| I03 | Installation can succeed while reserve preparation is incomplete; UI distinguishes the states. Offline-ready appears only after full required dependency and reserve acknowledgement/readback. |
| I04 | Existing mobile/desktop surfaces, equal four-corner radii, focus/Escape/Back, portrait/landscape, concise English/German/Spanish text and reduced motion remain usable. No new solving dock key or permanent dashboard. |

## C. Offline launch, reserve and allocation

| ID | Required evidence |
| --- | --- |
| O01 | First online preparation followed by browser-closed/installed-app cold airplane-mode launch. Current saved values, notes, selection, undo, assistance, elapsed acknowledgement, all three roles and wallet remain correct. |
| O02 | Solve and complete offline; use notes/undo/hints/reveal/Settings/locale/backup/recovery without missing dynamic imports. Completion/disclosure acknowledgements and receipts remain exactly once across restart. |
| O03 | Measured candidate default/travel reserve choices show useful playable headroom and transfer/storage/heap cost across all five pools, not raw record counts. Whole-shard versus attested-record tradeoffs are documented. No startup 100k download or unbounded background refill. |
| O04 | Next uncached preferred ordinal with many other cached records; Quick weighted choice of an uncached eligible pool; active/previous exclusions; issued/group aliases; cursor/epoch wrap; lower Medium exhausted but upper unseen. Preserve or explicitly version the allocation contract. No silent cached substitution or freshness reset. |
| O05 | Pure model checks a declared finite horizon across pool choices and relevant mode sequences. Reserve downloads never change essential cursors/revisions/issued history/wallet. Download cancellation or duplicate retry cannot allocate an attempt. |
| O06 | Offline Progression crosses 6/7,15/16,24/25,42/43 and60/next-Metamorphosis within the declared prepared coverage. Replays/Quick consume shared authority appropriately. Do not claim arbitrary interleaving or endless offline play from a finite pack. |
| O07 | Another tab allocates, restore changes generation, a frontier advances, or catalog root changes during preparation. Stale readiness invalidates/recomputes and allocation CAS still rejects stale authority. |
| O08 | Exhaustion: preserve current attempt/result and offer a truthful connection/refill path. No hidden rewarded repeat, new uncertified generation, lost progress or retry loop. |
| O09 | Cached/prefetched bytes have wrong size/hash/schema/source identity/membership, stale manifest/root, bad MIME, redirect, truncated response or HTML error body with status200. Reject/quarantine/retry boundedly; never publish a playable count merely because bytes exist. |
| O10 | Quota/cache-write/metadata-write/readback failure, interrupted download, worker/process termination and cache eviction between ready publication and launch. Acknowledge partial/unavailable state honestly, reconcile inventory and retain essential saves. |
| O11 | Clear downloads, low-water refill, byte/count caps, cancellation and persistence-permission denial. Essential IndexedDB/history/recovery is unaffected by application-controlled cleanup. Report actual origin-wide eviction limits. |
| O12 | Current theme/font pack always cold-loads offline. On a Pond-only base, verify Pond and record the later combined-theme gate without implementing/merging themes. If the approved integration target exposes other themes/Auto, verify unprepared theme choices and event-date rollover use the documented fallback/download-needed behavior. No partial theme mix or forced eager download of every future theme. Repeat affected checks on the approved combined build. |

## D. Frequent update safety

| ID | Required evidence |
| --- | --- |
| U01 | A stays open while B deploys. Measure discovery at startup/focus/online and chosen visible polling cadence against the time B is actually served. Coalesce triggers, back off failures and keep hidden work bounded. No universal deadline claim for offline/suspended/deferred clients. |
| U02 | Rapid A to B to C while B is downloading/waiting, repeated checks, new tabs and skipped releases. Version identity/readiness reflect verified assets; no duplicate prompt storm, stuck spinner or old-release activation loop. |
| U03 | Request update with unacknowledged entries/time, delayed or quota-failed save, owner conflict, RAM-only play, pending disclosure/completion/allocation or restore validation/staging/activation. Block or explicitly resolve; reload only after a successful current-state barrier. No lost local changes, duplicate reward or mid-restore generation switch. |
| U04 | Two tabs or tab plus installed window: one accepts while the other is dirty, saving, paused, frozen/BFCache or unresponsive. A single acknowledgement/timeout cannot authorize unsafe global activation. Verify actual selected helper/controllerchange behavior, including the audited ignored updateSW(false) parameter. |
| U05 | Old A opens an unused lazy feature after B/C publication, while offline and online; old and new tabs coexist where supported. Required old assets remain available or activation is safely deferred. No deleted chunks, wrong MIME or HTML fallback for JS/CSS/worker/font/data. |
| U06 | B install fails from one missing/corrupt/oversized resource, network interruption, quota failure, malformed worker or partial deployment. A remains usable; failed/new partial caches are not advertised ready; retry recovers without clearing saves. |
| U07 | Cached HTML A, network HTML B, worker C and independently stale release/catalog metadata. Prove coherent routing/integrity and recoverable failure, including initial uncontrolled visit. Service-worker freshness checks must not accidentally hit their own cache-first release endpoint. |
| U08 | Delayed activation, user chooses Later, repeated controllerchange/online events and listener remount. No surprise reload or busy loop; activation waits on the defined safe protocol. |
| U09 | Rollback C to a compatible earlier release, missing predecessor files and incompatible schema/catalog metadata. Never downgrade/mutate/delete essential saves blindly; preserve supported old definitions/trust roots and show explicit recovery for unsupported versions. |
| U10 | Cache pruning with old clients, overlapping worker installation, an abandoned staged build and adjacent same-origin app. Delete only owned disposable entries under the documented retention policy; never global unregister/delete-all. |

## E. Fast online play, downloads and responsiveness

| ID | Required evidence |
| --- | --- |
| P01 | Paired accepted pre-PWA production baseline and new build under equivalent network/CPU/cache conditions. Set numerical allowed regressions before acceptance measurements. Cover first uncontrolled visit, repeat visit and installation, including optional precache competition. Record transferred requests/bytes and time to useful menu/first playable board, not paint alone; no material regression against the agreed limits. Use a small justified repeat count and report variance/measurement limits. |
| P02 | Input/navigation/new-puzzle requests while refill, integrity verification, decoding and storage run under a representative slower connection/device or labelled simulation. Measure input delay/long tasks and peak memory, enforce bounded work, and test slow in-flight/shared fetches. Foreground requests do not wait behind an entire pack; cancelling background work retains any foreground consumer. Do not claim async fetching, streaming or priority hints alone prove responsiveness. |
| P03 | Exhaust automatic download allowance or retained-storage capacity, then request an uncached online puzzle. Correct preferred data loads on demand without requiring offline preparation; successful optional retention is not a play prerequisite. Test request deduplication, eviction, retries, partial/aborted work, repeated sessions and low-water refill. Separate foreground/manual/automatic limits and demonstrate no silent unlimited transfer loop or artificial online catalog restriction. |
| P04 | Measured first-visit/revisit/install/refill/travel/online-cache-miss/update costs support the chosen budget. Report compressed transfer, logical bytes, disk and peak memory separately, including measurement uncertainty. Larger travel action shows additional size, honest progress and cancellation. Save-Data/slow or unknown connection, hidden/closed app, network recovery and unchanged-catalog app updates follow the documented policy without unsupported Wi-Fi/background-download claims. |

## F. Delivery, adversarial tests and final acceptance

| ID | Required evidence |
| --- | --- |
| R01 | Build/check/unit gates pass with pinned dependency versions. New safety-critical pure policies have explicit coverage, independent model/negative cases and meaningful fault/mutation tests. A mocked worker API is not native lifecycle evidence. |
| R02 | Deliberately broken guards are detected: bypass durability barrier, automatic cross-tab reload, publish ready before durable verification, ignore catalog hash, replace preferred ordinal with arbitrary cached candidate, delete unowned cache, or route asset404 to HTML. Select meaningful bounded faults for the chosen architecture rather than mirroring implementation strings. |
| R03 | Recheck affected gameplay/transaction/hint/reward/navigation contracts. Respect exact-input mutation reuse; changed captured inputs require current evidence. Reuse full corpus certification only on its unchanged bound source/data/oracle scope. No broad unchanged browser reruns merely to increase counts. |
| R04 | Custom Actions workflow builds/tests complete artifacts, serializes publication, identifies release versions and supports tested retention/rollback. Verify actual authorized Pages response bytes/headers and repository-base scope; local fake headers are labelled simulations. |
| R05 | Lead Codex browser review covers a compact integrated install/offline/update journey and representative responsive surfaces. Capture meaningful screenshots and actual build identities, reset temporary viewport overrides, review implementations reciprocally and commit green slices. |
| R06 | Real Android browser-closed offline launch and online update/installed-window behavior are recorded with device/browser versions, or explicitly remain external release gates. Do not relabel desktop emulation, a warm tab or a synthetic beforeinstallprompt as physical installation. |
| R07 | Final docs include decisions/challenges, actual passes/failures, dependency and release hashes, supported offline horizon, measured budgets/freshness, hosting limitations and exact commands. Both acceptance documentation and final user report end with the handoff's plain-language answers and actual numbers for upfront/later downloads, playable offline counts, caps/refill, online uncached puzzles, responsiveness, travel and updates. Independently check claims against evidence. Branch is committed/clean, integration instructions identify shared theme changes, and no merge/publish occurs without subsequent user direction. |

Acceptance means every applicable feasible gate has evidence and no known unresolved safety/readiness/update blocker remains. Explain any real external release limitation separately. A high test count, an installed icon or a service-worker ready event cannot substitute for the other layers.
