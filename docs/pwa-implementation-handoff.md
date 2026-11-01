# PWA installation, offline play and frequent updates

## 1. Activation and isolation

This is the implementation brief for a new agent when the user explicitly invokes it. The preparation turn writes documentation only. Implement the complete scoped phase in a **new separate worktree and branch**, never directly in gameplay main or the active theme worktree.

- Source repository: `C:\Programming_Files\Shilocity\Therra\toadoku`. Accepted gameplay commit: `9aab001`; use the latest committed `main` containing this handoff and record its exact SHA. Do not revert later accepted changes to obtain the older checkpoint.
- Create a Codex-managed worktree outside the original checkout using the available worktree tools, then create a new branch such as `codex/pwa-offline`. Verify path, branch and clean starting state. If that name exists, inspect/reuse only the task's own suitable worktree or choose a new suffix. Never force-reset another branch.
- Keep dependencies, builds, temporary profiles and ignored artifacts inside the new worktree. Obtain the worktree's required write access rather than editing main as a workaround. Preserve other agents' changes.
- Use a separate test origin/port, for example 5197, after checking it is unused. Do not take over gameplay 5189 or theme 5195, their browser tabs, service workers, caches or databases. Never kill an unknown listener.
- Theme work is being implemented separately on `codex/themes`. Coordinate narrow Settings/App/localization/package/asset-metadata contracts; do not edit or merge that worktree automatically. Before integration, reconcile with current main and the approved theme contract, then repeat affected checks on the exact combined build.
- Commit accepted green Conventional Commit slices. Deliver branch/worktree, design decisions, reproduction commands and evidence. Do not merge into main, publish a site, push deployment changes or alter Pages settings without the user's subsequent authorization. Prepare a concrete deployable result first.

## 2. Read before coding

Read [AGENTS](../AGENTS.md), this entire brief, the [readiness/source audit](research/pwa-readiness-audit.md) and [PWA validation matrix](pwa-validation-matrix.md). Also read:

- [Gameplay acceptance](gameplay-acceptance.md), [state/persistence contracts](gameplay-state-and-persistence.md), [data/correctness contracts](gameplay-data-and-correctness.md), [architecture](architecture.md) and relevant actual implementations.
- [Menu](menu.md), [UI/UX](ui-ux.md), [action audit](gameplay-action-audit.md), [asset provenance](production-assets.md) and [theme handoff](theme-implementation-handoff.md). Keep the existing minimal controls, Tools-left/Menu-right split, equal four-corner radii and mobile-sheet/desktop-dialog patterns.
- [Svelte skill provenance](svelte-agent-skills.md), local code-writer/best-practices skills and relevant references before Svelte work. Preserve Svelte + TypeScript + Vite; do not migrate to SvelteKit.

The accepted gameplay evidence is a baseline, not proof of PWA behavior. Inspect current source and dependencies instead of assuming this brief's paths or external versions remain current.

## 3. Goals and firm boundaries

A friend should be able to install Toadoku on Android, prepare a reasonable offline reserve, close the browser, travel without a connection, launch the installed app and continue playing. When online, frequent GitHub Pages releases must be discovered and applied without data loss, broken lazy chunks, stale mutable resources or cache-clearing rituals.

Required outcomes:

1. Accessible in-app installation entry, native prompt where supported, useful browser-specific fallback and truthful installed/unsupported/dismissed states.
2. Cold offline application launch, saved-game resume and full solving functionality, including hints, tools, rewards, Progression/replays and local backup/recovery within declared cached availability.
3. Bounded, integrity-verified puzzle downloads with useful default readiness and an explicit travel-preparation option. Do not automatically download the 100,000-puzzle corpus.
4. Online progressive loading remains efficient. Background refill is bounded/cancellable and never blocks input or causes unbounded retries, memory growth or network consumption.
5. Reliable frequent-release discovery, safe activation and complete asset-version consistency. Existing progress, assistance, time, ownership, receipts and wallet survive updates.
6. Correct root/custom-domain and GitHub Pages repository-subpath behavior, without interfering with other same-origin applications.

No required backend, WebAssembly, app-store APK/AAB packaging, account/cloud sync, push notifications or runtime puzzle generation. New gameplay/economy features are outside scope. Reserve downloads never allocate attempts, mark puzzles issued, advance progression or earn Dewdrops.

## 4. Lead and specialist workflow

Act autonomously as lead engineer and product/UX designer. Delegate named bounded specialists for worker/build/update delivery, offline catalog/storage/allocation, installation/readiness UI, and independent adversarial QA. Assign precise file ownership; the lead owns shared contracts, integration and final Codex browser review. Specialists are not alone in the checkout and must not revert each other's work.

Before each material implementation/test/fix plan, research primary current documentation and have a named independent specialist challenge it. Include the lead's architecture, this brief's proposals, the user's assumptions, library defaults, timing/budget choices, data retention and every material revision. Record the strongest counterexample, alternatives, sources, replies, agreement and required evidence in `docs/pwa-progress.md`. Review actual implementations reciprocally before acceptance. Routine execution inherits an accepted plan; avoid recursive planning or repeated unchanged checks.

Research the three user repositories in the audit and the actual [Vite PWA project](https://vite-pwa-org.netlify.app/), then decide whether handwritten worker code, `generateSW` or `injectManifest` is best. The audit nominates Vite PWA 2.0.0/Workbox with a small explicit coordinator because its declared ranges include Vite 8. This is a candidate to verify, not permission to force peer ranges or blindly install a version. Examine actual helper source and built output, not just method names.

## 5. Offline product contract and puzzle reserve

Write a short explicit offline contract before implementation: what becomes available after first online setup, how readiness is verified, what the default reserve supports, how to prepare a longer trip, how exhaustion behaves, and what browsers can evict. Installation success must not be labelled offline-ready automatically.

### Availability and allocation

The current catalog has five pools, 488 shards and 100,000 certified records, about 32.44MB serialized shard bytes. The manifest is about 128KB. Use the exact measured numbers in the audit as baseline and measure transfer/storage/heap separately. Techniques are local algorithms, not another 100,000-item download.

Inspect `CatalogLoader.initialize()/getRecord()`, `GameController.start()` and `Repository.allocate()` before designing the reserve. Current allocation must choose the exact validated traversal candidate; picking any cached board is invalid. The current sixteen-entry cache cannot certify a reserve or durable writes.

Research and compare:

- Predicting and pinning bounded verified traversal lookahead while preserving selection version 1.
- Whole verified shards versus compact attested-record storage, including transfer amplification, proof metadata, duplication and practical retention cost.
- An explicitly versioned availability-aware allocation policy only if justified. Such a change requires a new researched contract, atomic validation, migration/compatibility design, independent models and affected gameplay gates. Do not silently skip uncached candidates, advance cursors or relax freshness.

For the chosen policy, bind availability to catalog/certification/root and actual generation, pool seeds/epochs/cursors/revisions, issued concrete/group histories and active/previous exclusions. Revalidate at allocation; another tab, restore, new run or ordinary play can invalidate a prefetched plan. A cache-availability hint must never become gameplay authority.

Readiness counts must describe **genuinely playable eligible upcoming allocations**, not just downloaded records. Quick Medium/Hard may choose either constituent pool; protect the needed coverage. Support Progression boundaries and Metamorphosis rollover. A Progression-only full run from Leap 1 uses 6/9/9/18/18 pool requests; this finite horizon can be planned, while unbounded interleaving with Quick/replay/replacement cannot be promised from a finite reserve.

Measure candidate small/default/travel budgets, for example 10/25/50 playable allocations per pool, rather than fixing these suggestions as requirements. Decide default, low-water refill, travel size, byte/count limits, concurrency, cancellation and cleanup from measured cost and UX. Predictive lookahead can touch many shuffled shards; include the cost of bytes transferred but not retained. A smaller defensible guarantee is better than a large misleading counter.

### Persistence, readiness and exhaustion

- Keep essential saves and disposable downloads distinct. Cache clearing removes only this app's disposable downloads, never settings, active attempts, histories, receipts, restore/recovery generations or backups.
- Cache successful bounded verified responses only. Preserve all existing size/SHA/schema/identity/membership checks. Existing shard caching precedes complete record attestation, so cache presence is not proof of a playable record. Keep compatible trusted manifests and compiled trust metadata available on cold launch; do not fetch an invented certificate endpoint.
- Mark a reserve ready only after acknowledged storage, verified readback/inventory and all required dependencies exist. The existing cache put discards failure results; do not treat it as an acknowledgement. Stage updates and commit readiness metadata last; reconcile missing bytes after interrupted writes or eviction.
- Pin active offline packs appropriately. Define cache owner, quota, reference/pin policy and bounded eviction. Prevent an independent SW cache and IDB cache from racing to evict promised downloads or storing unlimited duplicate copies.
- Recompute counts after consumption, restore, cache removal, corruption and other-tab changes. A stale readiness banner must not promise capacity it no longer has.
- Preserve an existing saved puzzle when reserve is depleted. Explain that more puzzles require a connection and offer preparation/refill when online. Do not silently fall back to a rewarded repeat, reset progress, fabricate an attempt or generate uncertified puzzles.
- Treat `navigator.onLine` as a hint, not proof of connectivity. Bound timeouts/backoff; tolerate captive portals, bad MIME/HTML responses, redirects, partial downloads, quota failures and persistence-permission denial. Persistent-storage grants reduce eviction risk but never guarantee survival of user clearing, power failure or all browser policies.

## 6. Offline application dependency closure

Build and verify the full offline-required resource graph: entry HTML/JS/CSS, lazy gameplay/dialog chunks, hint/backup/raw-recovery module workers and their imports, locale copy, fonts, current theme assets and any linked offline notices. Precache or explicitly stage required assets before readiness. Caching only already visited screens fails first offline Hint/Settings/Backup use. Downloading a chunk for offline storage need not eagerly execute it.

Inspect generated manifests in the final dist. Broad precache globs must not pull in the complete catalog, prototypes, test fixtures, reports, source maps, dev-agent routes/secrets or all future theme assets. Required assets omitted by file-size thresholds or plugin hook ordering must fail readiness/build verification, not disappear silently.

Respect theme lazy loading and always verify the complete currently selected theme's fonts/assets. On a Pond-only base, prove Pond's offline closure and record the later combined-theme integration gate; do not implement or merge themes to finish this branch. If the approved integration target includes additional themes, research a core/fallback closure plus a complete selected-theme pack and optional downloads for others. If Auto/event themes exist, handle an offline event-date change with an intentional cached-theme fallback or truthful download-required state, without mixing partial themes. Coordinate declarative asset metadata with the theme agent; do not eagerly import every theme to discover its files. Repeat affected checks on the approved combined build. This task adds offline integration, not new theme designs.

Separate app build ID, worker protocol/cache format, catalog/certification roots, gameplay/storage schemas, reward/schedule versions and theme asset identities. An ordinary CSS/app release must not reset data or redownload an unchanged catalog. Do not overwrite immutable catalog-version resources incompatibly with an older compiled trust root.

## 7. Frequent updates and deployment

### Discovery versus activation

Design distinct states for checking, downloading, ready/waiting, applying, deferred, failed and running build. Automatically discover/download when appropriate; keep user control over disruptive activation. Provide a concise manual check/update action and meaningful last-check/build information. Avoid a permanently spinning "updating" label for a worker that is merely waiting.

Select and measure a visible-online freshness target. Compare startup, foreground return, reconnection and throttled visible polling, for example a 60-second discovery target after the host actually serves the new release. Back off offline/failures and coalesce duplicate triggers. Specify the real guarantees: detection/download timing is conditional on network, hosting visibility and browser execution; user-deferred activation may remain old intentionally. Do not promise latest content offline or updates while the OS suspends the app.

Keep a stable correctly scoped worker script URL and an app-owned registration. Research HTTP cache, SW Cache Storage, IDB and CDN as separate layers. `updateViaCache: 'none'`, fetch cache options and query keys have limited meanings; none magically controls the host/CDN. Do not spray timestamp queries on all assets or use meta/no-cache tags as a substitute for deployment behavior.

### Safe activation

Before any app-initiated activation/reload, establish a safe point: conceal/pause study, prevent new edits/time checkpoints from racing, await explicit successful persistence of the newest command/revision, and resolve pending disclosures/completion/allocation/restore barriers. Quota/conflict failure or RAM-only unscored state is not a successful durable acknowledgement. Preserve a recoverable state and explain a deferred update rather than discarding it.

Do not use `dispose()` as proof of persistence. Do not blindly call skipWaiting/clients.claim, reload on every controller change, or depend on a synchronous unload callback. Inspect the selected library helper's real activation/reload behavior; the audited 2.0.0 helper's `updateServiceWorker(false)` does not disable its default listener.

Activation affects the registration and other clients. Decide between normal waiting until old clients close, explicit coordinated activation, or a proved compatible coexistence design. A single safe tab, a short arbitrary timeout, a missing BroadcastChannel reply, or a frozen/BFCache tab is not evidence that every client is safe. Test one tab accepting while another has unsaved changes. Preserve compatible old chunks/caches until relevant old clients cannot request them, or refuse unsafe activation. Keep the protocol bounded; avoid building a general distributed application framework.

### Release consistency and retention

Generate a deterministic release identity and asset inventory from actual output, including changes to workers, CSS, fonts, pictures, metadata and public resources. Distinguish change detection from integrity; inspect how the chosen precache tool validates actual responses and test same-URL/mismatched bytes and incomplete deployment.

Old HTML and unopened lazy chunks must remain mutually compatible during A to B to C rapid deployments, cached HTML, partial propagation and rollback. Do not combine newest network HTML with an incompatible old worker/resource set. Navigation fallback applies only to valid in-scope HTML navigations; never return index.html for a missing JS/worker/font/catalog request or cache a 404/error page as success.

Research a coherent release snapshot and hosting asset-retention scheme. A fixed "keep two releases" policy alone is not justified when releases happen minutes apart and clients may remain offline for weeks. Bound disk/cache retention by a documented age/byte/client policy and measured CDN behavior; prove old clients remain safe within the support contract. If a required old byte is unavailable, show a recoverable update path without erasing progress or entering reload loops.

Prepare a custom GitHub Actions Pages pipeline: correct build/base/scope/start URL/manifest ID, complete artifact validation, serialized publication, release identification and post-deploy byte/version checks. Consider deployment ordering, incomplete artifacts, rollback, superseded rapid pushes and retention within current Pages limits. Verify actual Cache-Control/ETag/Age/content types when an authorized deployed URL exists; `_headers` files or meta tags do not establish host cache headers. No real publishing is authorized by this documentation task.

## 8. Installation and minimal UX

Use stable manifest `id`, `start_url`, scope, display mode, names, approved icons/maskable assets and local paths valid at the deployed base. Preserve identity across ordinary releases so installation is not duplicated. Respect artwork/font provenance; no new unapproved AI production imagery.

Place Install/Offline/Update actions with general Menu or Settings, not solving Tools or a new permanent HUD. Use existing localized controls and sheet/dialog/popover conventions. Keep text concise. Browser-granted install prompts require an actual captured event and user gesture; the event is not universal and may not arrive. Handle accepted, dismissed, already-running-standalone, unavailable, embedded/private and unsupported cases honestly. Offer useful install instructions when the native prompt cannot be triggered. Do not fake an event or claim an Android APK was downloaded.

A compact offline panel should communicate readiness, usable difficulty/horizon coverage, storage/download cost and preparation progress. Distinguish "installed", "saved game available", "offline reserve ready" and "update ready". Offer cancel/refill/removal only where meaningful. Challenge every new button/state and omit controls without a useful player outcome.

## 9. Validation, delivery and acceptance

Meet every applicable row of the [PWA validation matrix](pwa-validation-matrix.md). Lead personally uses Codex browser for integrated critical journeys and visual acceptance; independent QA reviews actual source and deliberately broken safety guards. Browser automation must use built production output and real service-worker lifecycle, not HMR or only mocked registration.

Use unit/model tests for scheduling, reserve planning, readiness, update state transitions, compatibility and failures. Batch critical browser journeys and reuse unchanged UI/corpus evidence explicitly. Keep assertions deterministic; poll observable conditions rather than sleeping per click. Capture screenshots at meaningful visual checkpoints, not between every control. Do not repeat the entire gameplay browser suite for every pure PWA fix.

Cap unit workers at two, browser workers at one and run heavy jobs serially. Monitor resource use; stop only owned processes on pressure. Keep test artifacts ignored under `prototypes/pwa-validation/`. Use isolated origins/databases; never unregister all origin workers, delete all caches or clear a real player's data. Real-browser Cache Storage/IndexedDB and multi-build lifecycle tests complement unit models.

Rerun the accepted gameplay gates actually affected by loader/selection/storage/controller or dependency changes. Follow the existing exact-input mutation/certification reuse rules: stale global captures cannot be presented as current. New safety-critical pure modules need explicit coverage/fault tests and independent review. Reuse complete 100k certification only if its bound data/importer/oracle/rule inputs are unchanged; otherwise repeat the required affected certification. Document why each expensive check is repeated or reused.

Deliver `docs/pwa-progress.md`, design decisions, `docs/pwa-acceptance.md`, an invariant-to-test map, reproducible commands, exact dependencies/build/worker/asset identities, measured transfer/storage/heap limits, compatible release/rollback policy and remaining external limits. Record real Android installation, browser-closed airplane-mode launch and online update evidence separately from desktop emulation. If physical hardware or authorized HTTPS deployment is unavailable, finish feasible implementation and tests, identify the exact outstanding release gate and do not call it passed.

Acceptance requires no known unresolved PWA-related data loss, duplicate reward, false offline-readiness, stale-release trap, broken required lazy feature or unsafe cross-project cleanup. End with a clean committed branch and reviewable integration instructions. Do not implement unrelated themes/features or silently merge/publish.

## 10. Copy-ready receiving-agent prompt

```text
Implement the PWA/offline/frequent-update phase for Toadoku.
Source repository: C:\Programming_Files\Shilocity\Therra\toadoku.
Read AGENTS.md and docs/pwa-implementation-handoff.md plus every linked PWA
specification before coding. Create a separate managed worktree and a new
codex/pwa-offline branch from current committed main containing that handoff.
Do not implement in main or modify the concurrent theme worktree.

Work autonomously with named specialists. Research primary sources and actual
code, challenge your own and every specialist/user/library assumption, and
record evidence-supported decisions before material implementation/fix plans.
Build Android in-app installation, verified bounded offline play and very
frequent safe GitHub Pages updates. Do not preload the 100k corpus or weaken
allocation, certification, persistence, scoring or recovery contracts.

Compare manual SW, Vite PWA generateSW and injectManifest; inspect compatible
versions and real reload behavior. Prove cold offline launch, useful reserve
readiness, worker/theme/font coverage, multi-tab update safety and A/B/C rapid
deploy/rollback behavior. Follow docs/pwa-validation-matrix.md, use unit tests
for logic and bounded real-browser tests for lifecycle/integration/visuals.
Keep heavy jobs serial and resource-bounded. Review implementations reciprocally,
commit green Conventional Commit slices, document actual evidence/limits, and
deliver the completed branch for review without merging or publishing.
```
