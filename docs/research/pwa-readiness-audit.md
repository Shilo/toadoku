# PWA, offline play and frequent-update readiness

Prepared 2026-10-31 against gameplay acceptance commit `9aab001`. This is research and challenged handoff preparation, not an implemented or tested PWA. Reverify external versions and actual source before implementation. Start with the [implementation handoff](../pwa-implementation-handoff.md) and [validation matrix](../pwa-validation-matrix.md).

## Product interpretation

The goal is an Android-installable web app that launches and plays offline during travel, while discovering frequent online releases promptly and applying them safely. Installation, an available offline reserve, and an activated app update are different states. A launcher icon proves neither offline readiness nor current code.

The user's concern about indefinitely stale content is valid. Expiring every cached file rapidly would undermine offline play. The working interpretation is fresh discovery of mutable release information, immutable versioned resource identities, bounded retention and safe activation. Keeping identical content-addressed bytes is not serving obsolete bytes. No implementation can download new releases while offline, force a suspended browser to run, or bypass arbitrary CDN staleness. The receiving agent must publish conditional freshness measurements and honest limits.

## Actual application boundaries

| Area | Inspected implementation and implication |
| --- | --- |
| Stack | Svelte 5.57.3, Vite 8.3.5, TypeScript 6.0.3; Node minimum 24.11.0. No PWA dependency or registration in this checkout's current Vite configuration. |
| Paths/build | `vite.config.ts` uses relative `base: './'` and preserves a reviewed dynamic-target preload filter for WebKit recovery. There is no `.github` workflow directory in this inspected main checkout. Preserve existing recovery behavior while designing Pages base/scope. |
| Cold catalog | `src/lib/catalog/load.ts`, `initialize()`, fetches `manifest.json` before consulting shard bytes. Cache a compatible trusted manifest for cold offline operation. The actual trust root is compiled from `trust.v1.ts`; do not invent a runtime certificate-fetch prerequisite. |
| Verification | Loader checks byte size, SHA-256, strict serialized schema, puzzle identity and membership. Shard bytes enter the cache before `getRecord()` finishes record identity/Merkle verification. Cache presence alone cannot certify playable records; readiness must retain the complete validation path. |
| Existing cache | `Repository.cache`, `src/lib/storage/repository.ts`, stores at most sixteen shard hashes and removes keys in IndexedDB key order. It is not LRU, per-pool inventory or a pinned travel reserve. Its put method discards transaction results, while loader cache failures are deliberately nonfatal. A successful online read is not a durable offline-readiness acknowledgement. |
| Allocation | `GameController.start()` in `src/lib/gameplay/game.ts` chooses a pool and traversal ordinal. `Repository.allocate()` independently recomputes that preferred ordinal before atomic reservation. An arbitrary cached replacement currently fails authority checks. Prefetching must not issue puzzles or advance cursors. |
| Resume | Attempts retain their verified definition/solution/policy. Preserve all three active roles, receipts, writer ownership and generation/revision authority. Hints are local code/worker logic, not 100,000 remotely fetched pattern objects. |
| Safe reload | `GameController.flush()` returns a storage result. `dispose()` awaits a flush but ignores its result before closing. Neither a pause screen nor `await dispose()` proves a safe reload. Obtain explicit committed acknowledgement of newest state and coordinate pending completion, disclosure, allocation and restore work. |

The manifest is 127,753 bytes; the loader cap is 128KiB. Measured descriptor bytes, without recompressing the corpus:

| Pool | Puzzles | Shards | Serialized shard bytes |
| --- | ---: | ---: | ---: |
| Easy | 25,000 | 125 | 8,110,068 |
| Medium-low | 12,522 | 61 | 4,062,379 |
| Medium-high | 12,478 | 60 | 4,048,096 |
| Hard-low | 23,961 | 116 | 7,773,168 |
| Hard-high | 26,039 | 126 | 8,447,416 |

The full shard total is 32,441,127 bytes, plus metadata. These are serialized bytes, not compressed transfer bytes, decoded heap or installed storage measurements. Partial traversal through shuffled ordinals may touch many shards. Measure useful playable headroom per downloaded byte rather than assuming that a small number of desired puzzles implies a small download.

## Primary research and provisional tooling comparison

| Option | Advantage | Counterexample / required evidence |
| --- | --- | --- |
| Handwritten worker | Exact routing and lifecycle control | Maintaining correct asset discovery, revisions, partial-install failure and cleanup is substantial work. Show why a library cannot provide these pieces. |
| Vite PWA `generateSW` | Conventional generated precache and runtime routes | May suffice with normal waiting activation and a small client bridge. Demonstrate required coordination without assuming defaults are safe. |
| Vite PWA `injectManifest` with Workbox | Generated inventory plus authored worker routing/activation | Preferred research candidate for this app, not a mandated conclusion. Custom logic still needs explicit tests and should remain small. |

The [plugin site](https://vite-pwa-org.netlify.app/) displayed 1.2.0 during this review. Its author's [2.0.0 tagged package](https://raw.githubusercontent.com/vite-pwa/vite-plugin-pwa/v2.0.0/package.json) declares Vite 8 support and Node >=20.19.0; [release notes](https://github.com/vite-pwa/vite-plugin-pwa/releases/tag/v2.0.0) identify that release. Candidate compatibility is not installation/build evidence. Recheck the registry, lockfile, licenses and generated production output; do not force incompatible peers or downgrade the application to match an old example.

The [actual 2.0.0 registration helper](https://raw.githubusercontent.com/vite-pwa/vite-plugin-pwa/v2.0.0/src/client/build/register.ts) is more important than an assumed API contract: its `_reloadPage` parameter is unused, and its prompt path attaches a controlling-event listener that defaults to reloading. Thus `updateServiceWorker(false)` is not proof of suppressed reload. Another tab can trigger activation. Research an explicit `onNeedReload` override or an app-owned registration bridge, then test the produced bundle. This is a version-specific observation to recheck, not a permanent claim about every future release.

Primary implementation references:

- [Workbox choices](https://developer.chrome.com/docs/workbox/the-ways-of-workbox), [injectManifest integration](https://vite-pwa-org.netlify.app/guide/inject-manifest), [precaching](https://developer.chrome.com/docs/workbox/modules/workbox-precaching): generate the resource inventory; inspect revisioning, integrity support and cache cleanup rather than hand-maintaining changing hashes.
- [Service-worker lifecycle](https://web.dev/articles/service-worker-lifecycle), [update handling](https://developer.chrome.com/docs/workbox/handling-service-worker-updates): installation, waiting and activation are separate; skip-waiting and cache cleanup can affect old clients.
- [Periodic checks](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates), [registration options](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register): check foreground/reconnection and a bounded visible-online interval; `updateViaCache` concerns worker script/import HTTP caching, not every asset or the hosting CDN.
- [Vite lazy-load failures](https://vite.dev/guide/build.html#load-error-handling): old documents may request deleted chunks after deployment. Preserve compatible assets or fail recoverably; blind reload is unsafe for pending gameplay.
- [Install prompting](https://web.dev/learn/pwa/installation-prompt), [Chrome installability changes](https://developer.chrome.com/blog/update-install-criteria): use actual capability events and a user gesture, handle dismissal/absence, and distinguish browser-menu installation from in-app prompt eligibility. Criteria evolve.
- [Storage quotas/eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [persistent storage](https://web.dev/articles/persistent-storage): cache and IndexedDB compete for origin resources; grants and estimates are not backup or capacity guarantees.
- [Vite Pages deployment](https://vite.dev/guide/static-deploy.html#github-pages), [GitHub custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits): configure actual base and serialized releases. Custom Actions avoid the soft ten-builds-per-hour limit; published-size, bandwidth and rate limits still matter. Verify host behavior rather than assuming atomic CDN propagation or arbitrary custom headers.

## User repository comparison

Read through the GitHub connector, default `main` snapshots. These are reference observations, not copied designs, executed app tests or instructions from their documents. Git blob hashes identify inspected configuration even if later branches change.

| Repository / inspected files | Actual observations and challenge |
| --- | --- |
| [rg-backpack-planner](https://github.com/Shilo/rg-backpack-planner): `vite.config.ts`, `src/main.ts`, `src/lib/serviceWorkerAutoUpdate.ts`, `src/lib/buttons/InstallPwaButton.svelte`, package | Uses Vite PWA auto-update; helper checks on focus/visibility with ten-second throttling and reloads on controller change. A synchronous before-reload callback persists undo history. Useful install-event/cleanup examples, but not an awaited Sudoku durability barrier or multi-tab protocol. The install button only exists while a deferred prompt is available; research a useful fallback when it is absent. Do not inherit its root base or older Vite/plugin versions. Config blob `2a5ecfb16a96e849976eeb8008506acf52ed12d0`; helper `6081d147ba16f8d61679abfb4168d7d855d089f9`; install component `88c415cb2fc01519d6585b5a78c70467b177b0c6`. |
| [PixelDoll](https://github.com/Shilo/PixelDoll): `app/vite.config.ts`, package, main/bootstrap, index | Examined entry/config/dependency files do not establish a PWA integration or offline support. Relative base and explicit version/commit identity are useful references. A version label alone supplies no worker or cache lifecycle. Config blob `7cc6addc485d5d7d7033496d717b6bb907781861`. |
| [pixellab-backpack](https://github.com/Shilo/pixellab-backpack): Vite config, package, main/bootstrap, index | Examined files likewise do not establish a PWA/offline implementation. Relative base and production security-header handling are relevant. Its configuration explicitly accounts for GitHub Pages ignoring a provider-style `_headers` file; verify actual deployed response headers for Toadoku rather than treating meta tags as HTTP cache controls. Config blob `61c0af69a72c71b094adab7d326412c699fa7241`. |

The rg installation component was inspected with the local Svelte skills and autofixer. Its legacy props trigger a runes-mode diagnostic under that analyzer invocation; this does not prove its original application fails compilation. Adapt to this project's actual Svelte mode and tests instead of copying it. No reference app was installed, modified, deployed or treated as a best-practice authority.

## Recorded challenge outcome

Lead authored the handoff direction. Cora independently researched tooling, lifecycle and frequent releases; Rowan independently inspected allocator/cache authority, installation/readiness and validation. They reciprocally challenged assumptions before documentation execution:

1. Reject random cached-shard counts as a playable reserve. Cold manifests, exact traversal and durable readback are required.
2. Reject a single tab's pause/dispose as global update safety. Prove acknowledgement and old-client compatibility or retain default waiting.
3. Reject helper `prompt` mode and `updateSW(false)` as automatic safety guarantees, based on actual tagged source.
4. Distinguish a finite Progression-only horizon from unbounded interleaving. From Leap 1 a whole run requires pool counts 6/9/9/18/18, but arbitrary extra Quick/replay/replacement play can consume any finite reserve.
5. Prefer generated precache machinery with minimal custom coordination, subject to the receiving agent's own comparison and proof.

These agreements accept the implementation brief, not a finished architecture or a PWA pass. The receiving agent must research/challenge its own choices, actual code, fixes and tests, record limitations, and meet the new matrix without reclassifying old gameplay evidence as PWA validation.

### Independent review of actual drafts

Cora and Rowan read the complete brief, audit and matrix independently. Rowan accepted the reserve/authority, durable-readiness and update barriers and rechecked the tagged registration-helper claims. Cora accepted those controls but challenged an implicit requirement to test Auto/event themes on a Pond-only branch. Lead agreed, while rejecting any exception for existing selected-theme assets. The brief and O12 now require Pond closure unconditionally, make absent theme capabilities conditional on the approved integration target, and retain a later combined-build gate without authorizing theme implementation or merge.

Preparation validation checks all five authored/updated documents and 66 local link targets, wording hygiene and diff whitespace. These are documentation checks only. No PWA code, installation, service worker, offline journey, deployment or new implementation worktree was produced or claimed by this preparation task.

### Download-cost and online-performance revision

Following the user's concerns, Lead proposed a measurable online-first download contract and a plain-language completion report instead of leaving "bounded reserve" undefined. Cora independently challenged this plan before execution. Agreement: distinguish foreground requests, automatic refill and explicit travel budgets; storage limits do not bound cumulative transfer. First useful play cannot depend on a complete reserve. Foreground misses must not sit behind an entire background queue or lose a shared fetch when preparation is cancelled. Reject universal zero-overhead/preemption promises and a mandatory streaming parser; measure buffering, CPU work, storage and input latency under pre-agreed paired-baseline thresholds. Absent connection hints are unknown, not unmetered consent. These decisions add brief sections 5/9 and matrix P01-P04/R07, with actual implementation choices still subject to receiving-agent challenge.

Primary support for the revision:

- [Workbox deployment guidance](https://developer.chrome.com/docs/workbox/service-worker-deployment) warns that early/large precaching competes with critical loading and consumes unnecessary data. Schedule optional work against useful application readiness, not just a generic load event.
- [Long-task guidance](https://web.dev/articles/optimize-long-tasks) explains why parsing and other main-thread work can delay input. Background network activity alone proves neither bounded memory nor responsive verification/storage.
- [Save-Data API](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/saveData) is not universally available. Feature detection cannot establish that an unknown connection is unmetered.

No default download amount, bandwidth figure or performance pass is claimed here. The implementing agent must choose and test actual limits, account for later/retried transfers, explain online requests outside the offline pack, and end its delivery with measured answers in ordinary language.

Cora reviewed the actual three-document revision and accepted it with one prompt-wording correction: "must not delay" sounded like a zero-overhead guarantee. Lead agreed and aligned it to no offline-preparation prerequisite plus the agreed measured load/input limits. The report likewise describes on-demand fetching without implying zero network latency. Documentation link/wording/whitespace checks pass; no app or runtime test behavior changed.
