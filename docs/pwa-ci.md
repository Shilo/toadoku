# Conditional GitHub Pages publication

## Practical behavior

Push committed changes to `main`. A small check runs first. If production inputs changed, the protected release job installs the locked dependencies, checks types, runs the unit suite with two workers, builds the app, validates the complete certified catalog/offline artifact, retains supported files and publishes through GitHub Pages. Documentation-only and test-only pushes skip that production job: no dependency install, app build, upload or Pages deployment.

GitHub sends one push event for the pushed snapshot, which can contain several commits. It does not publish every intermediate local commit separately. Rapid pushes queue up to 100 release jobs without interrupting a running deployment. Before building, each queued job checks the current main production inputs. Superseded app snapshots are skipped, preventing an older job from replacing newer app code. A newer docs-only commit does not suppress a still-needed app release because their production inputs match. A manual run on main deliberately requests a release even without a relevant diff; it still must pass freshness and safety checks.

## One-time GitHub setup

1. Create the GitHub repository with `main` as its default branch and push this maintained source, including `.github/workflows/pages.yml` and the committed puzzle assets.
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. Use the `github-pages` environment and allow main to deploy. Repository/account Pages availability and storage capacity must be configured on GitHub; this local task does not create or publish a remote repository.
3. For a genuinely never-published site, follow the [first-publication confirmation](pwa-system.md#first-publication-and-a-failed-first-attempt). In **Actions → Toadoku Pages → Run workflow**, select main and supply the exact `OWNER/REPO|https://configured-pages-base/|FULL_MAIN_SHA` as `initial_release`. The configured Pages URL, including any repository subpath, must match exactly. An existing legacy site needs asset-preserving migration, not a false never-published confirmation.
4. After the first successful publication, normal relevant pushes to main publish automatically without that input. No personal access token or custom deployment secret is required; the workflow uses GitHub's job-scoped token and Pages identity token. First-publication proof remains intentionally bounded and fails on unknown/missing history; set up the site promptly rather than accumulating unreviewed failed initial attempts.
5. Review the run's change/freshness summaries and published-byte checks. Perform the [remaining real-host/device gates](pwa-acceptance.md) on the actual URL. Compatible app updates still wait until players save, close every Toadoku window and reopen.

## Which changes are relevant

`tools/pwa/release-inputs.mjs` is the single policy used for push detection and current-main comparison.

| Triggers production | Why |
| --- | --- |
| `src/**`, except the audited `src/lib/scene/README.md` | App code, styles, fonts, themes, gameplay, workers and localization. |
| `public/**` | Published puzzles, icons, notices, static files and any public domain file. Markdown here is shipped content, so it is included. |
| `data/**` | Runtime policies/techniques and catalog certification inputs. |
| `tools/pwa/**`, `tools/catalog/**`, `tools/test.mjs` | Build, trust, validation and delivery logic. |
| `index.html`, `package.json`, `package-lock.json`, `npm-shrinkwrap.json` | App entry and locked installation. |
| Root Vite/Svelte configuration, `tsconfig*.json`, `vitest.config.ts`, `playwright.config.ts` | Build and the release's type/test checks. |
| `.gitattributes`, `.npmrc`, `.node-version`, `.nvmrc` | Checkout bytes and tool/install configuration. |
| `.env`, `.env.local`, `.env.production`, `.env.production.local` | Files read by Vite's current default production build mode. |
| `.github/workflows/pages.yml` | Publication configuration itself. |

`docs/**`, root Markdown such as README/AGENTS/TODO, `tests/**`, `.agents/**`, prototypes and unrelated workflows do not trigger production. `.env.example` and development-only environment files do not affect the current production mode. If a new build mode, input root, preprocessing tool or imported documentation file is introduced, update this policy and its tests in the same change. Tests-only changes can be checked locally; they do not independently cause a production release. This workflow does not create pull-request preview deployments.

## Why this differs from the example

The [PixelDoll workflow](https://github.com/Shilo/PixelDoll/blob/d4c5785f00b288505275a90a7a0f6d91047f30a8/.github/workflows/pages.yml) usefully separates checks from publishing and limits deployment credentials. Its `app/**` filter is specific to that repository; Toadoku's production source is at the root. Its sixteen browser shards are not copied into this repository's bounded resource policy.

Native GitHub path filters can miss relevant files outside the first 3,000 returned paths; large commit batches or diff timeouts can run regardless of filters. Toadoku therefore reads complete Git snapshots with NUL-delimited paths and disables rename detection so both sides of a move count. It fetches a missing push base when possible; an unavailable base conservatively validates/builds rather than silently missing an app change. An unavailable current-main check refuses publication. See [GitHub diff/filter behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#git-diff-comparisons).

Publication concurrency belongs to the release job, after the cheap check. Docs runs never join that queue. `queue: max` prevents a later pending run from silently replacing a pending app release; `cancel-in-progress: false` protects an upload/deployment already running. Queue waiting order is not guaranteed to match commit order, which is why the current-input guard is still necessary. See [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

## Credentials, actions and retained releases

The change job has only contents-read permission and sparsely checks out the helper, avoiding puzzle-bank checkout and npm installation. The release job separately receives contents/actions/deployments read access plus the Pages write and identity-token permissions required for deployment. Checkout-managed read credentials are retained until its post-job cleanup so explicit Git fetches also work in private repositories. Tokens are not inserted in command arguments, URLs or diagnostic text.

Official actions are pinned to independently verified full commit hashes, not movable version tags. The reviewed releases are checkout 7.0.1, setup-node 7.1.0, configure-pages 6.0.0, upload-pages-artifact 5.0.0, deploy-pages 5.0.1 and upload-artifact 7.0.2. JavaScript actions use Node 24; target current GitHub-hosted Ubuntu runners, not an unverified older/self-hosted runner. Artifact ZIP format is explicit for the retained assets, rollback snapshot and evidence, preserving the download protocol. See [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [immutable action pinning](https://docs.github.com/en/actions/reference/security/secure-use).

Retained archive discovery indexes actual `github-pages` environment jobs through the read-only deployments API. Skipped docs runs create no deployment records, so hundreds of them cannot hide the last release archive. Complete metadata pagination, same-repository job/run identity and successful upload timestamps bind an archive to its exact attempt, including reruns and failed later hosting probes. A recent missing archive refuses publication. Records outside the 30-day supported window do not require expired job/archive data; the actual current hosted release remains independently protected by the retention stage. See [GitHub environment/deployment relationships](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments#how-environments-relate-to-deployments).

The existing supported-asset retention, first-publication proof, compatible rollback and read-only capacity checks remain required. History reads share a maximum of 100 API requests, with bounded response/download sizes; sufficiently large or unknown history stops publication for explicit inspection rather than losing supported assets. This can require a maintenance decision before the 100-job queue is exhausted. The 400 MiB default repository-artifact budget and account quota can also stop publishing safely; this is not an unlimited storage promise or authorization to delete artifacts. See [system operation and recovery](pwa-system.md). Actual GitHub token permissions, queue execution, environment protections, CDN headers and publication must still be verified after the repository is hosted.

## Implementation review and local validation

The lead and Iris independently researched the example, official actions and GitHub behavior, challenged the plan, and reciprocally reviewed the actual implementation. Review changed the initial native-filter idea, prevented docs pushes from replacing queued app work, and replaced all-run archive scanning with actual deployment-job discovery. Two further challenged cases now have tests: expired feature-branch metadata cannot block releases forever, and an attempted deployment without a successful retained upload cannot be treated as harmless history.

Focused integration passed 134 tests across seven files with two workers, covering production relevance, complete large diffs, additions/deletions/renames, multi-commit/force pushes, unavailable bases, manual/non-main events, real local Git fetches, docs descendants, stale app inputs, workflow structure, initial-release proof, reruns, archive loss and delivery safeguards. The first integrated attempt hit a Windows sandbox Git process restriction; the same suite passed outside that restriction. The complete unit suite then passed all 667 tests across 83 files in 61.17 seconds with two workers. Svelte checking, Node TypeScript checking, production build and complete PWA artifact validation passed. The app build ID (`c74346bc…`) and worker hash (`26c332a9…`) match the preceding accepted app. Logs and resource receipts are under ignored `prototypes/pwa-validation/ci-*`; minimum free memory stayed above 17.5 GiB during these checks. The three type/build commands briefly overlapped after the shell yielded a running type-check session; all completed successfully within that memory limit. The full unit suite and artifact validation ran separately. No runtime source or dependency changes were needed, so unchanged gameplay/browser acceptance journeys were not repeated for this CI-only change. Remote workflow execution and real publication remain untested until hosting is available.
