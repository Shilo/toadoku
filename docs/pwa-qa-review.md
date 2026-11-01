# Independent PWA QA review

Sage owns this review and the isolated production browser harness in `tests/pwa/`. The reviewed base is committed main `ecc8c309d022e2137085b9cffeb62febf7f21b79`. This record distinguishes model tests, desktop Chromium simulation and outstanding physical Android/hosting evidence.

## Research and preimplementation challenge

Primary sources: [service-worker lifecycle](https://web.dev/articles/service-worker-lifecycle), [Workbox deployment timing](https://developer.chrome.com/docs/workbox/service-worker-deployment), [Playwright persistent contexts](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context). A persistent profile survives browser close/reopen; JSON storageState is not a replacement for worker, Cache Storage and IndexedDB persistence. Worker waiting protects controlled clients only when navigation and lazy resources remain a coherent release.

Lead and Sage agreed on three paired cold measurements plus repeat visits with CDP 150ms latency, 200,000 bytes/s download, 93,750 bytes/s upload and CPU throttling factor four. This is desktop simulation, not a physical phone. Allowed median menu/board overhead is the larger of 250ms or 10% baseline; repeat overhead is the larger of 150ms or 10%. Input dispatch delay p95 must be at most 100ms and optional preparation must add no task above 200ms. These thresholds preceded acceptance measurements.

Strongest lead architecture counterexample: normal waiting alone does not protect initial uncontrolled HTML A if the host changes to B before A asks for an unopened lazy chunk. Agreement requires full response integrity, coherent cached navigation, retained content-addressed assets for supported old documents and recoverable load errors. No automatic controllerchange reload, skipWaiting or claims of global save safety from one window.

Cora's plan was independently challenged before code: protect installing caches from overlapping installation cleanup; failure at 24MiB must leave A usable; retry policy must not repeatedly redownload a full failed shell without bounds. Integrity must bind HTML and public files, include late-copied notices, and be checked against actual bytes. Cache metadata alone cannot prove readiness after eviction or corruption.

Rowan's reserve plan was independently challenged before code. Exact selection version one must remain authoritative. The wrap proof applies to actual large pools only, with count greater than the raw lookahead range; tiny domains can cross multiple epochs and require rejection or a separate proof. Fetch raw blocked positions too, because releasing an active role can make them eligible later. An initial four excluded ordinals can occur twice across one wrap; at most N minus one newly allocated tail ordinals can recur in the head. A conservative 2N+8 raw scan is plausible but requires an independent dynamic-exclusion model. Readiness must use fresh generation/traversal authority and actual verified readback.

Lead installation/UI plan was independently accepted with safeguards: installation accepted, appinstalled and running standalone are distinct; absent capability events cannot identify private/unsupported browsers. Every waiting update message must explain closing all app/browser windows. Menu-only installation does not establish offline readiness. Explicit preparation must stage the shell, cancel must remain reachable, larger cost is shown before consent, and panel opening must reconcile counts.

## Baseline evidence

Unchanged production baseline built with locked dependencies and frozen under ignored `prototypes/pwa-validation/baseline-ecc8c30/`. Index SHA-256: `49ca44b4fcdcfd13aafa0feb603111801df7ed735cf81f2c339a9d72964efddf`. Every emitted asset hash is retained in the measurement JSON.

Command:

```text
node tests/pwa/performance.mjs baseline-corrected prototypes/pwa-validation/baseline-ecc8c30 3
```

Chromium 156.0.8078.4, 360x800 CSS pixels, DPR three, headless; local strict static host at port 5197. Gzip is actually served when smaller. This is not GitHub Pages header or transfer evidence.

| Measurement | Three baseline observations |
| --- | --- |
| Useful menu | 1510.6ms, 1514.2ms, 1506.1ms |
| First playable board from navigation | 2985.7ms, 2979.3ms, 2980.7ms |
| Repeat useful menu | 713.4ms, 687.8ms, 700.1ms |
| Repeat resumed board | 1777.2ms, 1740.4ms, 1761.0ms |
| Completed encoded CDP bytes by first board | 239,712; 239,680; 240,889 |
| Maximum observed startup long task | 96ms, 96ms, 97ms |
| Trusted digit input dispatch p95 | 1.4ms, 2.1ms, 1.4ms |

Completed CDP bytes include HTTP headers and completed requests, but not partially received in-flight responses. Server-sent body totals include the large in-flight sketch and therefore must not be described as bytes received before useful play. Resource Timing and individual request records preserve encoded/decoded lengths separately. Slight first-shard variation comes from genuine seeded gameplay allocation, not arbitrary replacement.

The first exploratory baseline omitted repeat visits and mislabeled server-sent bytes in its terminal summary. Its retained `baseline/results.json` is superseded for those claims by `baseline-corrected/results.json`; it is not erased or presented as complete evidence.

## Actual source review

`src/lib/pwa/install.ts` independently reviewed before integration: consumes each event once; a late prompt choice cannot overwrite appinstalled; embedded/insecure contexts do not fake a prompt; dispose removes listeners. Synthetic unit tests validate this state machine only and are not native installation proof. iPad Safari desktop user-agent detection can select generic desktop guidance; no universal browser identification claim is justified.

## Remaining validation

This historical checkpoint preceded implementation. The completed evidence below supersedes it. The final lifecycle/visibility/root-scope batch also passes below; final lead browser/report reconciliation is recorded in acceptance; Android hardware and authorized HTTPS Pages deployment remain external checks.


## Initial native install failure and correction boundary

The first frozen PWA A build `df323a090de60fa71e9aaa5ee23f1e676ccc7110242f98063bb075b2d3852576`, worker SHA `1eb5f580927246ade106c47e70715ba3b230e960a99618a18f3c4040647ee0b7`, failed actual service-worker installation. Lead observed this independently in Codex browser at port 5196; Sage reproduced it at 5198. The initial long readiness wait was terminated only after verifying owned Node process 30492 and its browser descendants. That terminated attempt has no completed result JSON and is not a pass.

The separate diagnostic uses the native CDP ServiceWorker error channel and actual Cache Storage. It reports `Offline shell readback failed` with all downloaded entries present. Lead and Cora identified duplicate `manifest.webmanifest` entries in the actual injected worker: the plugin appended a same-revision entry without integrity after manifest transforms, overwriting the valid entry in the readback lookup. Sage challenged the proposed fix before implementation: merge only compatible same-URL/revision entries, preserve a valid integrity value, reject conflicts or entirely missing integrity, and verify a fresh native install. A build passing its former string-presence validator was insufficient evidence.

The first copied B fixture also failed because the test builder omitted `data/gameplay-policy.v2.json`. This was a fixture omission, not a gameplay defect. The build guard initially hid the original import error; Cora's reviewed diagnostic fix preserves the original error while leaving the failed-build marker. The fixture builder now includes policy data and a local copy of the required Workbox license.

## Independent model result

The installation state-machine and independent reserve-horizon suites pass 13 tests in two files with one worker (478ms total). The traversal model does not import production selection helpers. It exhausts more than 400,000 dynamic role-retention/release branches for horizons one through three, simulates 1,000 travel paths at horizon 25 across wraps, rejects unsupported tiny domains and epoch overflow, and detects the meaningful fault of omitting currently blocked raw positions.

## Final measurement method correction

Page-target CDP network throttling may not shape service-worker fetches. Lead challenged that assumption before final acceptance measurements. The shared static host now optionally imposes an aggregate 200,000-byte/s response-body budget, 150ms header latency and fair chunks capped at 8KiB across real page and worker HTTP responses. It respects response backpressure and closed sockets. CDP network throttling is disabled for those paired runs; CPU factor four applies only to the page. Socket-written response bytes, completed CDP requests, timestamped partial CDP body bytes and logical file sizes remain separate. Earlier baseline timings retain their original page-target shaping label and do not stand in for final paired results.


## Accepted final timing and responsiveness

The final timing harness records visible/enabled readiness inside the page using a one-shot MutationObserver and two animation frames. The board requires 81 visible cells and ten enabled keys, with no concealing dialog. This is a conservative paint proxy, not compositor instrumentation. The old selector polling had up to 500ms retry gaps; its apparent regression is superseded, preserved as a harness failure. An early repeat predicate also accepted a missing element; it was corrected before the paired run. Production imports were not optimized to fit faulty measurements.

Commands: `node tests/pwa/performance.mjs baseline-frame prototypes/pwa-validation/baseline-ecc8c30 3` and the identical `pwa-frame` run against `releases/acceptance-final/A`. That build is `12c2cd6235b62d2193a011f1e6b1198d9936b0f54f39a30541a67698e920f98d`, worker SHA `5e89069fda8d93ac51b4db38f020264c730c8cc1cd7aedfec09db1399970efd7`. Later changes affect only the unopened PWA dialog; these startup measurements are explicitly scoped to unchanged critical startup code.

| Three-sample median | Pre-PWA | PWA |
| --- | --- | --- |
| First useful menu | 1466.1ms | 1444.7ms |
| First playable board | 2968.8ms | 2942.5ms |
| Early same-profile repeat menu | 1446.4ms | 1506.5ms |
| Early same-profile repeat board | 1816.1ms | 1736.3ms |

All pre-agreed regression thresholds pass. Early repeats may be uncontrolled and do not claim an installed-worker benefit. Separate actual browser-close/reopen controlled repeats measured median menu 251ms and board 465ms under the same aggregate shaping, with navigation served by the worker. First-board received body bytes are 461,892 to 465,990 in the accepted PWA samples; completed CDP response lengths alone omit in-flight illustration bytes and are not used as that total. Gzip is actually served locally; no GitHub Pages or mobile-radio measurement is implied.

`preparation-1793521663161/results.json` passes: a demanded uncached Hard puzzle loaded in 0.943s while an optional Easy response was held, 100 trusted digits had dispatch/next-frame p95 of 5.5/14.7ms, maximum optional-page long task was 52ms, and cancellation produced no further shard requests after the pending response closed. Earlier prefix `preparation-1793520531890` exercised 660 trusted digits through real shell installation; its later running-button wait failed in the harness and is retained separately. Page CDP heap samples peaked at 24,964,228 bytes; workers, GPU and whole-browser memory are unmeasured. The coarse constant `performance.memory` bucket is not reported as exact peak memory.

The cancellation profile cold-opened offline successfully. Four fully verified records totaling 7,284 JSON bytes remained, but displayed upcoming coverage was [0,0,0]: partial file-order work cannot promise the exact next traversal prefix. Cancellation is not claimed to leave a complete playable pack.

## Cold play, storage and traversal evidence

The activation-budget first-click profile passed real installation/default preparation and cold persisted offline launch, entries/notes/undo/time/fonts/art. Its exact-profile tail passed first-use Hint/Reveal, German/English Settings, 5,485-byte backup, raw recovery worker export, one completion reward of 95 Dewdrops exactly once, and immediate next allocation after another cold offline launch. Selector mistakes are retained as failed original runs, with passing continuations attributed separately.

The final-policy prepared travel profile completed all sixty Progression Leaps offline, including 6/15/24/42/60 difficulty boundaries and Metamorphosis rollover. Sixty unique durable receipts total exactly 20,400 Dewdrops. Genuine additional Quick Hard and completed-Leap replay were created offline, then all three roles and their definitions, entries, notes, undo and assistance survived a cold profile reopen. This validates the tested profile; arbitrary extra play consumes reserve and cannot extend the promised traversal indefinitely.

Rowan's native store prefix plus exact-profile continuation passed actual 512-record and near-1MiB record caps, online exact-demand independence, removal preserving essential data, strict extra-field/proof rejection, and scoped synthetic quota/transaction abort. These synthetic injected errors do not prove physical disk-full handling. Native canonical-manifest repair `manifest-native/1793520002637/report.json` passed on build 12c2cd: poisoned descriptors gave zero readiness offline, then one canonical manifest fetch repaired routing online without a shard fetch, and the next cold offline exact record allocated with prior progress intact.

Exhaustion first exposed a real missing modal error. The same exhausted profile was then upgraded normally to build 12c2cd and cold-opened offline. The next exact replacement remained unavailable, showed connection/preparation guidance and preserved the attempt, pools, issuance and wallet. The original failure and passing `exhaustion-tail` remain separate evidence.

## Provenance and external boundaries

Frozen release inventories hash every emitted byte. Early `source.patch` captures omitted then-untracked source files, including the later manifest pin; those patches alone are incomplete reproduction artifacts. Copied fixture source and output hashes remain preserved. The final builder additionally inventories SHA-256 and length for relevant tracked and untracked source inputs. Variant B/C change only ignored copied localized status text and an observable hint-worker console marker so lazy release assets actually differ.

No hardware Android install, standalone icon, airplane-mode device or actual HTTPS Pages deployment was available. Native desktop worker lifecycle, cold persistent profiles and labelled CPU/network/tab simulations are not represented as those external checks. No merge, push or publication is authorized or performed.

## Final integrated lifecycle and scoped-build batch

The final source freeze is `releases/final-reviewed/fixtures.json`: A `61d4d07ba0a956a33b706e11d5d2dad547952d6ce98e7dc16ce5ae4d987372fd`, B `165471641f1d7a3e2f48be0f39651a0eec078e990dea953c7198fe096a87e5e8`, C `79d52f4b6a7fdf452a8fbbda2aa04ef912215e0f11113a3c7205c367a80202ab`. The 603-file source inventory file SHA is `e06c48d82a465f354eadd5499350d8c694fc6c8a22439a592524299878c54e5d`; compact canonical serialization SHA `b4d10f2344eec7fd9046900185aee98b9b40cb2581879aa8a04b1e98c269bf0e` is recorded separately. This metadata clarification changes no source or emitted build bytes. A worker SHA is `6fe03593940f5b25c5d02e955fdc4f6411252ce6a38e616e087932d76ebc8947`; actual readback closure is 1,896,213 bytes. All three builds and actual injected inventories validated.

`hidden-shell-1793523125930/results.json` passes a real held raw-recovery worker response during first shell installation. Headless tab switching did not produce hidden state, so document.hidden and visibilitychange were explicitly simulated. Hidden then visible occurred before release; after real activation, no puzzle shards had been requested and all readiness counts were zero. The simulation validates continuation cancellation, not physical Android lifecycle.

`journeys/updates-1793523135344/results.json` passes failed B installation, retry to waiting B, supersession by C, lazy A Hint after C publication, multiwindow durability, last-client activation and compatible rollback. A real readwrite transaction held the second window's attempts store while its correct digit showed Saving. Failed B left active A and the other window untouched; releasing the transaction durably saved that digit. CDP freezing the second window is labelled simulation. After the first closed, the frozen sole remaining app client still prevented activation; only closing all permitted C to activate. The dirty digit and original Quick game survived, and rollback to A kept them. A neighboring exact /neighbor/ registration, scoped cache marker and IndexedDB sentinel stayed byte-identical throughout. Missing JavaScript returned 404 without HTML fallback. The natural passing panel screenshot is alongside this report.

C appeared in 1.543s in that multiwindow run, which may include queued browser-native checks. A separate early single-window run observed 3.029s. These are observed automatic discoveries, not proof that the application timer fired early. The final instrumented cadence case records actual registration.update invocation timestamps without mocking the browser method.

`journeys/inflight-1793523194027/results.json` passes the distinct rapid-download case: B was actually installing with a unique JavaScript response held; a second real A window requested C before release. Changing the host during B installation caused an expected integrity rejection. Verified C eventually waited, while A stayed active and essential attempts, history, pools, receipts and profile remained unchanged. The gate is released in finally; no assumed intermediate worker ordering is required.

`root-smoke-1793523222469/results.json` passes an actual root-base build `b665ac091a5b2ae67450b253d91a86ab7117f2f143ddda9ce9871f332b7925ff`. Manifest id/start/scope resolve to /, worker is /worker.js with exact / scope, exact puzzle play/default preparation succeeds, and a fully closed profile cold-opens offline through the worker with saved attempts and profile unchanged. Unknown online JavaScript is 404; offline missing JavaScript fails as a network request, never an HTML application document. This supplements all other journeys hosted under /toadoku/.

The settled cadence case `journeys/polling-1793523326920/results.json` passes. A read-only wrapper recorded the actual native registration.update method invocation, preserving its returned promise and behavior. The next application invocation began 64,597ms after the preceding manual invocation; verified B was observed 65,331ms after publication with A still active. No new tabs, focus, reconnect or manual actions occurred during that interval. An opportunistic earlier browser download is not confused with this application cadence. This is local visible desktop evidence, not a suspended/mobile/CDN deadline.

## Independent acceptance-report challenge

The report was checked against implementation and retained artifacts, not merely specialist summaries. Corrections accepted before completion: source patches alone omitted untracked inputs; 125 travel records is a fresh-sample count, not a universal maximum; partial cancellation can retain records while exact upcoming coverage is zero; Medium/Hard display the minimum of constituent pools; additional Quick/replay consumption reduces remaining traversal; initial register and browser-native checks are distinct from throttled application update calls; logical, gzip, completed and partially received bytes are different quantities. No physical Android, real hosting, complete mutation rerun or exact whole-browser memory claim is supported.

The final seven plain-language answers in acceptance match the chosen caps and measured results after those corrections. The app remains a Pond-only base for later authorized theme integration. The safe read-only artifact-capacity alternative can stop publication and requires reviewed operational capacity management; it is not self-maintaining unlimited minute-rate publication. Parent owns final affected-browser/default-build/clean-branch gate and commits; this review does not authorize publishing.

## Native shell eviction and repair completion

The final audit challenged a remaining evidence gap: protocol models do not establish actual Cache Storage repair. `shell-repair-1793523622068/results.json` passes the native continuation on final B 16547164. Only the exact owned raw-recovery.worker entry was removed. Native full-shell SHA readback became false. CDP evaluated a narrowly scoped Cache.prototype.put fault inside that worker realm, throwing QuotaExceededError only for the selected path. This is an explicitly synthetic API-write error, not physical disk exhaustion. Preparation failed, readiness stayed false and all essential attempts/profile/pools/issuance/receipt tables were unchanged. Restoring the original method and explicitly preparing again repaired the full 1,896,254-byte closure. A full close/reopen offline returned the restored 9,874-byte resource with status 200 and unchanged essential state.

The first invocation `shell-repair-1793523566526` had an incorrect expected failure sentence and timed out after the genuine eviction/fault. The passing continuation reuses that evicted profile and records this provenance. A second invocation `shell-repair-1793523606817` mistakenly named a profile directory that did not own the worker and failed before exercising repair; it is retained as a harness error, not product evidence. No product fix or repeated unrelated gate followed these mistakes. The narrowed model/native distinction is preserved in acceptance.
