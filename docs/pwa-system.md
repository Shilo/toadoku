# PWA system walkthrough

For players: installing is optional, and online play works without offline setup. Open More, then Install and offline (during a game, choose Settings first). Prepare puzzles before a trip. When an update is ready, finish saving or export recovery, close every Toadoku window, then reopen.

## Player workflow

1. **While online:** open **More → Install and offline** from the menu, or **More → Settings → Install and offline** during a game.
2. Choose **Prepare offline play** for **3 upcoming puzzles per difficulty**. For a longer trip, open **More offline options → Prepare a longer trip** for **25 per difficulty**. A completed travel pack covers a 60-game Progression run if Quick Play, replays and replacements do not consume the same reserve.
3. Wait for preparation to finish. Check that app files are verified and the displayed Easy/Medium/Hard counts cover the play you need. Installing the app or seeing a saved game alone does not prove those extra puzzles are ready.
4. After first setup, finish saving or export recovery, **close every Toadoku tab and app window, then reopen once** before relying on offline play. Keep a backup of important progress.
5. Offline, resume your saved game or start a prepared next puzzle normally. When the exact next puzzle is missing, reconnect and prepare again; the app keeps the current game/result rather than substituting another puzzle.

### What downloads, and when

- **Ordinary online play:** fetches the exact requested puzzle when needed. It can retain that puzzle and recent files for reuse, but does not automatically fill an offline pack or download the entire 100,000-puzzle collection. The active saved game contains its own puzzle.
- **App files:** save automatically about two seconds after the first usable board, or earlier when preparation is explicitly requested. They are separate from extra puzzle downloads and include both current themes and first-use features.
- **Extra puzzles:** download only after a preparation action. The targets are upcoming playable counts, not fixed totals of downloaded files. Easy has one internal pool; Medium and Hard have two each, so a fresh small/travel pack typically stores 15/125 records, sometimes more for boundary lookahead. Displayed counts use the minimum coverage needed for each difficulty.
- **After playing or returning online:** packs do not automatically refill. Choose Prepare again when you need more; it reuses verified records and available recent files, and downloads only missing work. Removed or browser-evicted files may download again.

### Progress, cancellation and partial preparation

Puzzle work handles one optional file at a time while foreground play has its own lane. A file is read in chunks, then fully checked; progress counts records only after they are saved and checked again. Partial file bytes are not playable puzzles.

An already-started puzzle pack can continue after closing the panel so you can play. Reopen the panel to use **Cancel preparation**. Hiding the app stops optional puzzle preparation. Cancel keeps completed verified puzzles; choose Prepare again online to finish missing work. App installation/update files can finish separately. If you close the panel while it is still preparing app files, its pending start of the puzzle pack is cancelled.

Preparation can stop short after a connection error, storage refusal or its per-action work limit. Trust the checked counts, not the requested target or the number of files present. Reconnect or free space and prepare again. Small/travel actions allow about 2.1/12.6 MB of work before compression; these are not exact mobile-data caps. Normal online puzzle selection and essential saved progress do not depend on spare offline-pack capacity. **Remove extra puzzles** keeps saved games and rewards; a newly requested online puzzle may be retained afterward.

## Maintainer overview

This is the maintainers' map of the implemented installation, offline and update system. [Acceptance](pwa-acceptance.md) contains measured costs and actual evidence; the [validation matrix](pwa-validation-matrix.md) defines the release gates. The historical [handoff](pwa-implementation-handoff.md) and [decision ledger](pwa-progress.md) explain why these choices were challenged.

## Startup and setup

Ordinary startup opens the existing game repository and makes the menu usable. Local-record support starts attaching immediately after bootstrap; starting a puzzle awaits that attachment before allocation, so retained records can serve an exact request. This does not download a puzzle pack. A first-time menu visitor does not register a worker. After the first usable board, `App.svelte` waits two seconds, checks that the document remains visible and the board usable, then starts application-file caching; its repeated support-load call coalesces with earlier initialization. Explicit preparation can start application-file caching earlier. A returning visitor can check an existing registration once the menu is usable.

A service worker is a browser-managed script that can answer requests from stored application files. It is enabled here only in supported secure production contexts, not the Vite development server. `install.ts` separately captures the browser's one-use installation prompt. Accepted prompt, installed app and standalone window are separate states; none proves offline readiness.

The panel keeps four independent facts:

| Fact | Authority |
| --- | --- |
| Installed or running standalone | Browser install/display events. |
| Current game saved | Existing acknowledged essential repository state. |
| Application files ready | Worker rehashes stored files and confirms the running document's build identity. |
| Upcoming puzzles available | Fresh allocator lookahead and proof-verified retained records. |

`ensureShell()` waits for a first worker's actual activation and fresh readback before puzzle preparation. An updated worker can remain waiting while the old active build serves its windows. A first setup document can remain uncontrolled even after files are ready; save or export recovery, close all Toadoku windows and reopen once before relying on offline features. Installation itself is optional for browser offline use.

## Exact online play and disposable reserves

The existing allocator chooses the exact certified ordinal. The loader checks a verified compact record first, then its existing recent-file cache, then downloads the requested shard on demand. Online allocation is never restricted by optional pack targets, admission allowances or an unsuccessful extra-cache write. The saved active puzzle is self-contained. If the exact replacement is unavailable offline, the current attempt/result remains and the UI gives connection/preparation guidance.

There are five internal pools: Easy and two each for Medium/Hard. Small preparation targets three upcoming allocations per pool; travel targets twenty-five. Medium/Hard display the minimum of their constituent pools. Lookahead includes blocked raw candidates so releasing an active role cannot reveal an unprepared hole. Counts describe the current horizon, not the number of unrelated stored puzzles. A complete travel horizon supports sixty scheduled Progression games without other modes consuming it; an action can stop partially at its allowance and need another explicit action.

Preparation is manual. There is no startup puzzle pack, automatic refill or automatic record eviction. Optional work uses one file at a time alongside the foreground lane; identical in-flight files share consumers. Cancellation preserves a foreground consumer and completed verified records. Hiding cancels optional puzzle work, including a pending panel continuation; closing the panel invalidates pending setup-to-pack continuation. An already-started visible pack may continue. Application-worker installation can finish independently.

Responses are read in bounded chunks, but a partial file is never playable. A complete shard must decode and pass its certified checks. Compact records carry inclusion proofs, strict data shape and canonical manifest binding. Progress counts advance after storage acknowledgement/readback. Repeated preparation reuses verified records/recent files; evicted files can download again. Removal clears only the disposable store, never saved games, wallet, receipts or recovery generations. Browser persistence permission reduces eviction risk but is not a backup guarantee.

## Limits and what they bound

A MiB is 1,048,576 bytes. These limits do not establish total browser heap, HTTP wire bytes or whole-origin disk usage.

| Resource | Current limit |
| --- | --- |
| Automatic optional puzzle preparation | Zero. |
| Small / travel action admission | 2 / 12 MiB of uncompressed planned work. |
| Each new optional shard read | Reserves its maximum 96 KiB; refetches reserve again, shared reads/cache hits do not. |
| Puzzle request timeout | Twenty seconds after that request starts, excluding queue time. |
| Retained compact records | 512 records and 1 MiB serialized record text; each at most 4 KiB. |
| Trusted manifest / recent cache | 128 KiB manifest; existing cache retains at most sixteen shards separately. |
| Application cache | 4 MiB per resource; 8 MiB per release including release metadata; 24 MiB aggregate protected shell-body budget. |
| Hosted predecessor assets | Thirty days after last-current observation, at most 256 MiB; refuse publication at the cap. |
| Repository artifact capacity gate | Default 400 MiB including conservative planned uploads; configurable, read-only refusal. |

Admission is conservative: cancelled queued requests can use allowance without transferring bytes. A received chunk or browser-internal buffering can exceed admission accounting; this is not a phone-data cap. Optional cache capacity never becomes an online-selection cap. Stored-record limits exclude indexes, metadata, recent shards, application caches, essential saves and browser overhead.

## Updates and cache ownership

`vite-plugin-pwa` uses `injectManifest`: the build inserts the actual emitted inventory into the authored worker. SHA-256 integrity binds required response bytes, including mutable HTML/public files. The release identity also binds worker/build/config/lockfile inputs. Compatible duplicate plugin entries are normalized; conflicting identities or missing integrity fail closed. Current lazy features, module workers, fonts, icons and notices belong to the closure. Puzzle shards and their manifest are not precached with application files. Both current themes and their four small WOFF2 fonts are included for offline choices and Auto rollover. The fonts total 37,428 bytes; the typed two-theme policy in tools/pwa/theme-packs.ts enforces a separate 64 KiB font budget and source-hash/notice completeness. This is separate from module/wordmark/whole-shell bytes. Future themes/fonts require explicit policy review rather than automatic unlimited expansion.

The pinned Workbox installer awaits app entries individually. Its scheduling is separate from the two puzzle lanes and does not govern all browser traffic. Unchanged bytes are reused only after verification. Cache names include the app, encoded deployment base and full release ID. Staging protects active/waiting/installing identities, removes only strict owned orphan caches, and refuses uncertain ownership or excess storage. It never clears adjacent apps or essential databases. Activation cleans the current release's own obsolete entries; later staging removes abandoned releases.

The authored bridge coalesces app-requested automatic `registration.update()` calls at least sixty seconds apart while visible and online, using a five-second condition timer. Initial registration and its first eligible check, manual checks, other windows and browser-native requests are separate. Failures wait five minutes, thirty minutes, then twenty-four hours; automatic discovery resumes afterward. Manual checking can retry sooner. Successful updates have no daily byte allowance.

There is no `skipWaiting`, `clients.claim`, controller-change reload or application-initiated reload. Verified waiting updates, or a verified newer active worker beside an old uncontrolled document, show save/export then close-all/reopen guidance. Open games keep their build. The worker supplies its own coherent cached HTML only for base/index navigation; missing scripts, fonts, workers and puzzle files never receive an HTML fallback.

## Publication and recovery

The Pages workflow checks main pushes or explicit dispatch, then builds/publishes only when production inputs changed or a manual release was requested. Docs-only/test-only pushes skip production. Publication is serialized without cancelling a running deployment; a current-input check rejects superseded queued app snapshots. [CI setup, input policy and researched tradeoffs](pwa-ci.md) document the exact behavior. Before upload, the release checks the injected closure, notices/icons, budgets and every published certified shard. Corpus certification is reused only when its bound content/tool/runtime/solver inputs still match; this is not a new 100,000-puzzle solving run.

The workflow obtains the monotonic predecessor archive from actual Pages deployment jobs even if a previous publication's later host probe failed. Skipped docs checks cannot crowd that index. It reads the currently hosted inventory before aging assets, preserves supported hashed paths and refuses same-path/different-byte replacements. It validates the final retained artifact, creates a complete compact rollback snapshot, then checks repository artifact capacity before uploading/deploying. It performs no remote artifact cleanup. Capacity refusal requires reviewed artifact management or a capacity decision; account-wide/Packages quota remains a separate operational gate.

Post-deploy checks verify all current shell/worker/release bytes and MIME types, plus up to four retained JavaScript samples. Samples do not prove every old hosted byte. Real HTTPS headers/CDN propagation and Android installation/airplane-mode behavior require actual release/device evidence. Local Chromium results do not replace them. Rollback uses a complete compatible snapshot and the same waiting lifecycle; future schema migrations need their own compatibility plan.

For offline failure, reconnect and inspect/prepare again. Manual preparation can repair missing/corrupt files only for the matching active build, preserving valid entries and enforcing integrity/budgets. Old mutable bytes may no longer exist on the host; then finish saving/export recovery and close/reopen into the available build. Clear extras may recover malformed disposable rows without touching essential data. Do not recommend clearing site data or unregistering workers as routine recovery. Use the existing emergency export when ordinary storage is unavailable.

## First publication and a failed first attempt

This is maintainer setup, not a player setting. A missing release file does not prove that a website is empty. Before the first publication, independently confirm that this exact Pages website has never served an app, including older workflows and deleted run history. If it already has a site, preserve and verify its existing files through a separately reviewed migration. Do not delete it or invent an empty history to get past the check.

For a confirmed new website, open **Actions → Toadoku Pages → Run workflow**, choose main, tick **First publication only: this Pages website has never served an app**, and run it. The repository, exact Pages URL and source commit are filled in automatically. No copying identifiers or custom secrets is required. After the first successful publication, app changes pushed to main publish automatically and the checkbox stays off.

This confirmation is a Toadoku safeguard, not a GitHub requirement. Future updates keep files that older open games may still need. A website returning "not found" could be new, temporarily unavailable, private, or previously published with its history removed. The checkbox supplies the one fact the available APIs cannot prove: this target has never hosted an app. It cannot override a detected existing website or an earlier attempted deployment. No publication has been performed as part of this implementation.

The read-only proof checks complete currently returned workflow history, across branches and earlier rerun attempts, within bounded run/attempt/API limits. Known workflow source and an explicitly skipped deployment step, or a wholly skipped protected release job in the recognized gated workflow, are required for each prior attempt. An uploaded archive does not prove deployment. A failed or cancelled deployment might already have published, so it is not considered safe initial setup. Missing, unknown, changed or truncated history refuses recovery. The normal hosted release must remain recoverable. An existing index page without a release inventory also refuses initial publication.

If the first attempt failed before deployment and history proves deployment stayed skipped, a new manual run can use the confirmation for the corrected main commit. If deployment was attempted, do not repeat the never-published confirmation: inspect the actual host and recover its valid inventory/assets. After a successful first publication, ordinary later releases use the hosted inventory and need no initial_release input. The API check cannot prove that nobody deleted history or published through another system; the independent first-publication review supplies that missing evidence.

## Removing extra puzzles safely

Remove extra puzzles removes the current extras and asks other windows to cancel existing optional preparation. A shared clear revision is checked inside the same database transaction that would write a record or reserve list, so work started before removal cannot restore old extras afterward. Foreground online requests capture the revision without waiting for it before returning the requested puzzle. A slow or failed optional storage read skips extra retention; it does not fail that game. A genuinely new request after removal may save its puzzle normally. The essential saved game and rewards are separate and are preserved.

## File map and change checks

| Responsibility | Main entry points |
| --- | --- |
| Startup and controls | `src/App.svelte`, `src/lib/pwa/PwaPanel.svelte`, `install.ts`, `copy.ts`. |
| Update protocol and pure policies | `src/lib/pwa/client.ts`, `policy.ts`, `worker.ts`. |
| Exact delivery and trust | `src/lib/catalog/load.ts`, `manifest.v1.ts`, existing decode/attestation modules. |
| Disposable planning/storage/readiness | `src/lib/offline/plan.ts`, `store.ts`, `verify.ts`, `reserve.ts`. |
| Inventory, identities and manifest | `vite.config.ts`, `tools/pwa/build.ts`, `version.ts`, `validate.mjs`, `catalog-artifact.mjs`. Human version labels follow the [PixelDoll commit-count workflow](pwa-ci.md#automatic-app-versions); the full content fingerprint controls updates. |
| Retention/publication checks | `tools/pwa/{release-inputs,bootstrap,previous,previous-history,retain,snapshot,capacity,verify-host,host-mime}.mjs`, `.github/workflows/pages.yml`. |
| Icon maintenance | [Icon recipe](pwa-icons.md), `public/pwa/`, `tools/pwa/icons.mjs`. |

Before release, run type/unit gates, a production build and artifact validation, then the affected production-browser journeys from the validation matrix. Use root and repository subpaths. Changes to update/storage/trust behavior require their failure and multi-window cases; lazy feature/theme/font changes require cold offline first use. Keep heavy jobs serial and bind evidence to the exact combined source/build. The acceptance record, not this map, identifies which hardware/hosting gates have actually passed.
