# PWA implementation progress

## Isolation and ownership

Base: committed main `ecc8c309d022e2137085b9cffeb62febf7f21b79`.
Managed worktree: `C:\Users\shilo\.codex\worktrees\pwa-offline\toadoku`.
Branch: `codex/pwa-offline`. Original and theme worktrees are outside mutation scope.
Sandbox access required elevated execution for this explicitly authorized worktree; no common Git configuration was changed.

Lead owns integration, App/dialog/navigation contracts, installation and localized offline panel, final acceptance and personal browser review. Cora owns worker/build/update delivery. Rowan owns offline planning, disposable record storage and catalog loader changes. Sage owns independent adversarial and production-browser validation. Shared dependencies/build jobs run serially.

All required PWA documents, gameplay acceptance, state/data contracts, architecture, action audit, menu/UI constraints, provenance and theme handoff were read before coding. Project-local Svelte code-writer and best-practices skills govern component edits.

## Offline contract agreed before implementation

Installation is independent of offline readiness. A menu-only first visit is playable online without offline preparation. Initial shell installation starts after the first usable puzzle plus an idle delay, or through explicit preparation. Existing registrations check after useful menu startup. Shell readiness requires verified complete dependency readback for the document build, including unopened lazy features and workers.

Puzzle downloads are explicit. Automatic optional puzzle transfer is zero: absent network hints cannot establish unmetered consent. Foreground puzzles still fetch the exact certified traversal candidate online regardless of pack storage/network limits. Default preparation targets three upcoming allocations in every internal pool; larger travel preparation targets twenty-five, subject to measured transfer limits. Final guarantees require fresh exact-selection inspection, readback and independent models, not raw stored-record totals.

Only disposable bytes are removed by download cleanup. Existing saved definitions remain playable when a reserve is exhausted. More new puzzles then need a connection or explicit refill. Browser/user eviction can still remove local data; installation and persistent-storage permission are not backup guarantees.

## Researched challenge decisions

1. Lead proposed normal service-worker waiting instead of forced activation. Cora and Sage challenged first-uncontrolled-document races, indefinitely open/frozen tabs and old lazy chunks. Agreement: no skipWaiting, clients.claim, controllerchange reload or activation/reload button. Updates download, then wait for every Toadoku window to close. Controlled navigation serves its complete release snapshot; hosting retains hashed files for uncontrolled old documents within an explicit support window. No universal update deadline.
2. Cora compared manual workers, generateSW and injectManifest using actual Vite PWA 2.0.0 and Workbox code. Lead accepted injectManifest with an app-owned bridge and response integrity, not the virtual registration helper. Revision identifiers alone do not validate response bytes. Cora's detailed evidence is in her review.
3. Lead rejected a five-second menu timer for first precaching: it can compete with first board requests. Agreement: first usable board plus two seconds, or explicit preparation. Serial install may still compete with later requests, so paired shaped-network measurements are required.
4. Rowan challenged the sixteen-shard cache, unacknowledged cache writes and FIFO loader. Agreement: separately owned compact fully attested records, exact allocator unchanged, fresh authority-bound planning, separate foreground/background lanes with reference-aware cancellation, and explicit readback.
5. Rowan measured candidate horizons before choosing default three and travel twenty-five. Lead challenged epoch wrap, dynamic exclusions, capacity versus cumulative bandwidth, repeat/cancelled transfers and demand retention eviction. No readiness claim is accepted without independent models and actual storage evidence.
6. Sage challenged lead's installation UI: accepted prompt is not running standalone; event absence cannot identify private/unsupported mode. Agreement: capture real capability events early, consume once per gesture, retain browser-specific fallback, distinguish installed/running/offline states, recompute counts when opening, keep cancellation accessible.
7. Sage proposed paired pre-PWA/current tests. Lead accepted three cold shaped samples and repeat checks with median useful menu/board overhead <= max(250ms,10% baseline), repeat <= max(150ms,10%), input p95 <=100ms and no added optional-preparation task >200ms. Logical bytes, actual local encoded transfer and real-host limitations remain distinct.

Primary sources: [lifecycle](https://web.dev/articles/service-worker-lifecycle), [deployment timing](https://developer.chrome.com/docs/workbox/service-worker-deployment), [install event](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent), [storage eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria). Additional source/code comparisons and reciprocal reviews will be recorded with the corresponding implementation.

## Evidence status

Implementation in progress. No Android, hosting, performance, offline or update acceptance is claimed by this planning record.
