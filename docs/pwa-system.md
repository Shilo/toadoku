# PWA system walkthrough

For players: installing is optional, and online play works without offline setup. Open More → Settings → Install and offline from either screen to prepare puzzles before a trip. Updates download automatically. The idle main menu updates safely by itself; during a game, More shows Update. Choose it when convenient. Your game saves and is checked before reloading. Other windows can stay open.

## Player workflow

1. **While online:** open **More → Settings → Install and offline** from the menu or during a game.
2. Choose **Prepare offline play** for **3 upcoming puzzles per difficulty**. For a longer trip, open **More offline options → Prepare a longer trip** for **25 per difficulty**. A completed travel pack covers a 60-game Progression run if Quick Play, replays and replacements do not consume the same reserve.
3. Wait for preparation to finish. Check that app files are verified and the displayed Easy/Medium/Hard counts cover the play you need. Installing the app or seeing a saved game alone does not prove those extra puzzles are ready.
4. Once app files and puzzle counts are verified, offline play is ready. Keep a backup of important progress. First setup no longer requires closing and reopening all windows.
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

`ensureShell()` waits for actual activation and fresh readback before puzzle preparation. The verified worker takes control after setup. Each page identifies its own build; an unidentified page receives no arbitrary mutable files from another build. Installation remains optional for browser offline use.

## Automatic saving

Digits, notes and other changed progress save promptly with the current thinking time. Rapid cell selection batches for up to 250 ms. Pause, returning to the menu and hiding the app stop the clock, capture the final time and drain pending input. Ordinary readable More/Settings windows keep timing without forcing another save. A visible, owned unfinished game also has a thirty-second time-only fallback. Menu, hidden, paused, completed, failed-save and RAM-only states have no recurring save timer; RAM-only play remains explicitly unsaved.

The fallback is about two writes per idle visible minute, versus six at the former ten-second interval. Sixty seconds would save only one further write per minute while doubling nominal average unsaved thinking time from fifteen to thirty seconds. These averages assume an abrupt stop evenly distributed between checkpoints; scheduling delays prevent a hard crash-loss deadline. Real edits and lifecycle boundaries still save without waiting for the fallback.

Clock-only commands validate the stored game once and check generation, writer, revision, sequence and active-role authority before changing only time metadata. The full stored record and schema stay the same; ordinary edited snapshots retain all three validation passes. The queue preserves pending real edits. Retryable storage failures save the newest full state on explicit Retry; conflicts, corruption and future formats stay blocked for recovery. Storage is asynchronous, while validation/copying still runs on the UI thread. No separate save worker is used; its message-copying and lifetime costs need measured justification. Without an earlier ownership check, an idle old window can stay readable until the nominal thirty-second fallback plus delay, but stale writes fail immediately.

Closing is best effort. An actual Android navigation delivered pagehide then freeze about 18.7 ms later, before its final time tail committed; acknowledged moves survived. A close/minimize event does not prove a game save finished. Keep lifecycle saves and periodic protection together, and rely on acknowledged storage/readback for update safety. See [lifecycle limits](https://developer.chrome.com/docs/web-platform/page-lifecycle-api), the [persistence policy](gameplay-state-and-persistence.md#current-autosave-policy-2026-11-02) and [actual acceptance evidence](pwa-acceptance.md). Earlier one-, five- and ten-second measurements remain historical.

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

The pinned Workbox installer awaits app entries individually. Its scheduling is separate from the two puzzle lanes and does not govern all browser traffic. Unchanged bytes are reused only after verification. Cache names include the app, encoded deployment base and full release ID. A small separate IndexedDB database records which builds open pages need. New pages are recorded before their verified HTML is delivered. Cleanup and new references share an atomic deletion gate, so a cache selected for removal cannot acquire a new reference halfway through deletion. Essential game storage and adjacent apps are untouched.

The authored bridge coalesces app-requested automatic `registration.update()` calls at least sixty seconds apart while visible and online, using a five-second condition timer. Startup, returning to the foreground and reconnecting use the same checks. Browser-native checks are separate. Network failures wait five minutes, thirty minutes, then twenty-four hours; automatic discovery resumes afterward. Capacity deferral retries at normal eligible checks instead of entering that failure backoff. Successful updates have no daily byte allowance. Background checks do not briefly switch visible panels into a checking layout.

After complete verification the worker uses `skipWaiting()` to activate and `clients.claim()` to take control. These browser operations do not reload pages. The new worker serves each older page's authenticated files, including unopened features. It serves only its own verified current HTML for a fresh navigation. Missing scripts, fonts, workers and puzzle files never receive an HTML fallback.

The idle main menu applies a compatible verified update automatically. A game or open dialog is never automatically reloaded. A concise Update label appears in More, with one Update action in that popover. Before reloading, the controller synchronously blocks edits, conceals the board, stops thinking time, drains the newest pending save, then reads storage back and checks the exact acknowledged local game and its ownership. A changed candidate, hidden page or failed save/readback cancels navigation and retains recovery. Updated pages return to the main menu; Resume is explicit so they cannot silently take another window's puzzle ownership. Automatic reloads are separated by at least sixty seconds; rapid newer releases are retried after that cooldown.

If saving or verification takes longer than one second, an Updating window offers Cancel. Cancel stops this update attempt immediately; an underlying save may still finish normally. Operation tokens prevent that late save or verification reply from reloading the page or cancelling a newer attempt. Returning from a hidden page verifies ownership before showing the board. The rest of the app stays usable during a delayed check, including More, Main menu and recovery.

Observed live/frozen pages retain their dependencies. Missing/BFCache pages receive thirty days of conservative support; BFCache means a page the browser keeps asleep for Back navigation. The one-time transition from 0.0.46 reserves its old caches even when old pages are temporarily invisible to the browser's client list. The 8 MiB per-build and 24 MiB combined limits still apply. If protected builds leave insufficient space, another update waits and retries automatically instead of deleting a live game's files. Unlimited simultaneous releases cannot fit a fixed budget.

Compatibility bookkeeping holds up to 256 precise client references and 64 build snapshots. Closed known clients can be compacted into per-build thirty-day references; observed live/frozen clients are renewed first. At the exceptional client limit, verified navigation and hashed assets remain protected through a bounded overflow record, but an unidentified page cannot claim complete offline readiness or borrow another build's mutable files. Full expected build sizes remain reserved after partial browser eviction so later repairs cannot silently exceed the combined budget.

This bookkeeping is separate from saved games. Missing or damaged records can be reconstructed only from the worker's own compiled, verified app inventory. Earlier files receive conservative protection without inventing old-page identities or trusting orphan inventories. Observable old pages keep conservative references; absent pages receive thirty days. If the bookkeeping database is unavailable, ordinary online requests pass through to their original network URLs without caching or promising offline readiness. Cleanup stops while ownership is uncertain; retries are coalesced and delayed thirty seconds after failure. Known app-file integrity failures still fail closed. Recovery never clears essential game data.

Migration limit: JavaScript already open in 0.0.46 cannot gain the new Update action retroactively. Its next ordinary refresh or fresh launch receives the verified new version, even while another old game stays open. The worker does not force that legacy page to reload.

## Publication and recovery

The Pages workflow checks main pushes or explicit dispatch, then builds/publishes only when production inputs changed or a manual release was requested. Docs-only/test-only pushes skip production. Publication is serialized without cancelling a running deployment; a current-input check rejects superseded queued app snapshots. [CI setup, input policy and researched tradeoffs](pwa-ci.md) document the exact behavior. Before upload, the release checks the injected closure, notices/icons, budgets and every published certified shard. Corpus certification is reused only when its bound content/tool/runtime/solver inputs still match; this is not a new 100,000-puzzle solving run.

The workflow obtains the monotonic predecessor archive from actual Pages deployment jobs even if a previous publication's later host probe failed. Skipped docs checks cannot crowd that index. It reads the currently hosted inventory before aging assets, preserves supported hashed paths and refuses same-path/different-byte replacements. It validates the final retained artifact, creates a complete compact rollback snapshot, then checks repository artifact capacity before uploading/deploying. It performs no remote artifact cleanup. Capacity refusal requires reviewed artifact management or a capacity decision; account-wide/Packages quota remains a separate operational gate.

Post-deploy checks verify all current shell/worker/release bytes and MIME types, plus up to four retained JavaScript samples. Samples do not prove every old hosted byte. Real HTTPS headers/CDN propagation and Android installation/airplane-mode behavior require actual release/device evidence. Local Chromium results do not replace them. Release metadata declares update protocol 2 and unchanged storage compatibility protocol 1. Publication rejects a lower worker or storage protocol than the hosted app. Roll back application behavior by rebuilding older app code with the current compatible router; do not redeploy the old 0.0.46 worker. Future incompatible storage migrations need their own coexistence plan.

For offline failure, reconnect and inspect/prepare again. Manual preparation can repair missing/corrupt files only for the matching active build, preserving valid entries and enforcing integrity/budgets. Old mutable bytes may no longer exist on the host; then finish saving/export recovery and close/reopen into the available build. Clear extras may recover malformed disposable rows without touching essential data. Do not recommend clearing site data or unregistering workers as routine recovery. Use the existing emergency export when ordinary storage is unavailable.

## First publication and a failed first attempt

First publication is automatic on a relevant main push after GitHub Pages is enabled. There is no special checkbox, typed confirmation or separate first-release process. If your first push ran before Pages was enabled, retry through the workflow's ordinary **Run workflow** action.

For the user's new, never-published repository, the workflow checks for an empty target automatically. It probes release metadata first. A normal successful response skips first-publication history inspection, so ordinary releases do not spend their history budget on docs-only runs. A not-found response requests the bounded history check; other responses or network errors stop publication. The retention stage independently reads the actual metadata and checks the index before publishing. Both must be genuinely absent for an initial release; an existing index without Toadoku metadata requires migration, while a valid hosted release follows normal file-preserving update behavior.

The read-only history check covers all currently returned workflow runs, branches and earlier rerun attempts. Known workflow source and an explicitly skipped deployment step, or a wholly skipped protected release job in the recognized gated workflow, are required for each prior attempt. It also accepts a scheduler failure that provably never received a runner: all four runner fields must be explicitly null, the failed job must have no steps and equal valid start/end timestamps, and its attempt must match. This handles the first push arriving before Pages created its environment; missing/assigned runner fields or ambiguous failures remain refused. An uploaded archive does not prove deployment: an upload followed by a skipped deployment can retry automatically. A failed or cancelled deployment might already have published; its missing host metadata requires recovery. Missing, unknown, changed or truncated history stops initialization.

The operational assumption is that this fresh target has no erased or externally published history. Neither a checkbox nor available APIs can prove that after someone deletes history, reuses a repository URL or reassigns a custom domain. Those are migration/recovery tasks, not automatic fresh-site setup. Do not delete deployment history or hosted files to bypass a recovery failure. Existing installation and supported-asset safeguards remain unchanged.

## Removing extra puzzles safely

Remove extra puzzles removes the current extras and asks other windows to cancel existing optional preparation. A shared clear revision is checked inside the same database transaction that would write a record or reserve list, so work started before removal cannot restore old extras afterward. Foreground online requests capture the revision without waiting for it before returning the requested puzzle. A slow or failed optional storage read skips extra retention; it does not fail that game. A genuinely new request after removal may save its puzzle normally. The essential saved game and rewards are separate and are preserved.

## File map and change checks

| Responsibility | Main entry points |
| --- | --- |
| Startup and controls | `src/App.svelte`, `src/lib/pwa/PwaPanel.svelte`, `install.ts`, `copy.ts`. |
| Update protocol and pure policies | `src/lib/pwa/client.ts`, `policy.ts`, `worker.ts`, `worker-compat.ts`, `worker-leases.ts`. |
| Save/reload and returning-page guards | `src/lib/gameplay/game.ts`, `app-guards.ts`, `src/App.svelte`. |
| Exact delivery and trust | `src/lib/catalog/load.ts`, `manifest.v1.ts`, existing decode/attestation modules. |
| Disposable planning/storage/readiness | `src/lib/offline/plan.ts`, `store.ts`, `verify.ts`, `reserve.ts`. |
| Inventory, identities and manifest | `vite.config.ts`, `tools/pwa/build.ts`, `version.ts`, `validate.mjs`, `catalog-artifact.mjs`. Human version labels follow the [PixelDoll commit-count workflow](pwa-ci.md#automatic-app-versions); the full content fingerprint controls updates. |
| Retention/publication checks | `tools/pwa/{release-inputs,bootstrap,previous,previous-history,retain,snapshot,capacity,verify-host,host-mime}.mjs`, `.github/workflows/pages.yml`. |
| Icon maintenance | [Icon recipe](pwa-icons.md), `public/pwa/`, `tools/pwa/icons.mjs`. |

Before release, run type/unit gates, a production build and artifact validation, then the affected production-browser journeys from the validation matrix. Use root and repository subpaths. Changes to update/storage/trust behavior require their failure and multi-window cases; lazy feature/theme/font changes require cold offline first use. Keep heavy jobs serial and bind evidence to the exact combined source/build. The acceptance record, not this map, identifies which hardware/hosting gates have actually passed.
