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

Production PWA lifecycle, cold offline features/completion/recovery, download costs/responsiveness, failure tests and final report challenge remain pending implementation. Android hardware and an authorized HTTPS Pages deployment have not been supplied or tested.


## Initial native install failure and correction boundary

The first frozen PWA A build `df323a090de60fa71e9aaa5ee23f1e676ccc7110242f98063bb075b2d3852576`, worker SHA `1eb5f580927246ade106c47e70715ba3b230e960a99618a18f3c4040647ee0b7`, failed actual service-worker installation. Lead observed this independently in Codex browser at port 5196; Sage reproduced it at 5198. The initial long readiness wait was terminated only after verifying owned Node process 30492 and its browser descendants. That terminated attempt has no completed result JSON and is not a pass.

The separate diagnostic uses the native CDP ServiceWorker error channel and actual Cache Storage. It reports `Offline shell readback failed` with all downloaded entries present. Lead and Cora identified duplicate `manifest.webmanifest` entries in the actual injected worker: the plugin appended a same-revision entry without integrity after manifest transforms, overwriting the valid entry in the readback lookup. Sage challenged the proposed fix before implementation: merge only compatible same-URL/revision entries, preserve a valid integrity value, reject conflicts or entirely missing integrity, and verify a fresh native install. A build passing its former string-presence validator was insufficient evidence.

The first copied B fixture also failed because the test builder omitted `data/gameplay-policy.v2.json`. This was a fixture omission, not a gameplay defect. The build guard initially hid the original import error; Cora's reviewed diagnostic fix preserves the original error while leaving the failed-build marker. The fixture builder now includes policy data and a local copy of the required Workbox license.

## Independent model result

The installation state-machine and independent reserve-horizon suites pass 13 tests in two files with one worker (478ms total). The traversal model does not import production selection helpers. It exhausts more than 400,000 dynamic role-retention/release branches for horizons one through three, simulates 1,000 travel paths at horizon 25 across wraps, rejects unsupported tiny domains and epoch overflow, and detects the meaningful fault of omitting currently blocked raw positions.

## Final measurement method correction

Page-target CDP network throttling may not shape service-worker fetches. Lead challenged that assumption before final acceptance measurements. The shared static host now optionally imposes an aggregate 200,000-byte/s response-body budget, 150ms header latency and fair chunks capped at 8KiB across real page and worker HTTP responses. It respects response backpressure and closed sockets. CDP network throttling is disabled for those paired runs; CPU factor four applies only to the page. Socket-written response bytes, completed CDP requests, timestamped partial CDP body bytes and logical file sizes remain separate. Earlier baseline timings retain their original page-target shaping label and do not stand in for final paired results.

