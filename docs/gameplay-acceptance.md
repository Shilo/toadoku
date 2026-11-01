# Gameplay acceptance record

Status: **gameplay implementation and available-environment acceptance complete**. The required executable gates pass, with the external release limits below explicitly unverified. Pause and report to the user. Do not begin or integrate theme work in this checkout without fresh instructions. Historical interrupted and failed runs remain historical, never passing evidence.

The validated execution-input checkpoint is `faae4dd`. Application runtime remains byte-identical to the two verified `0b3fae7a9d1c123bcfd5e28cc07895be0dba376f` checkouts, including session-array fix `a12b62c`. The later five-file regression batch passes 353 critical tests in 49 files at unchanged per-file 100% coverage and Node TypeScript. All 24 fresh forced mutation scopes pass strict adjudication. A later documentation/ledger commit records acceptance without changing execution inputs. Earlier integration/storage/foundation slices remain in the progress ledger.

## Contracts and data

The [handoff](gameplay-implementation-handoff.md), [validation matrix](gameplay-validation-matrix.md), [invariants](gameplay-invariants.md), [action audit](gameplay-action-audit.md) and [progress ledger](gameplay-progress.md) define scope, source reviews and evidence. [Reproduction commands](gameplay-testing.md) distinguish fast, native, full-corpus and mutation checks.

| Item | Actual checkpoint |
| --- | --- |
| Stack | Svelte 5, TypeScript, Vite; no SvelteKit, required backend or WebAssembly |
| Reward/schedule | Direct Dewdrops reward version 2, schedule version 1; bases 100/200/400, targets 10/20/40 active minutes, maximum 10% bonus |
| Persistence | Domain records version 1; IndexedDB structure 2, explicit rows-v1/buckets-v1 generation layouts |
| Catalog | Version 1/certification 1, 100,000 independently certified unique puzzles and 100,000 distinct solution strings |
| Pools | Easy 25,000; Medium-low 12,522; Medium-high 12,478; Hard-low 23,961; Hard-high 26,039 |
| Delivery | 488 shards, manifest 127,753 bytes, largest decoded shard 67,480 bytes, largest gzip shard 32,765 bytes |
| Manifest SHA-256 | `2927ff190cdbd1f6ed919a02f1fc62455e47b78079410d107c7e61eff2c5b5e8` |
| Membership root | `d25693b2fcb84f067fadb553e4e79087ec93c12bdee2a158fb4f63697ffcb17e` |
| Source | Pinned SudokuExchange revision `d8c8ebaee0c08c412cfba96af1923dfa61c83317`, source license and hashes retained |

Duplicate filtering covers exact givens, digit relabeling and D4 transformations. It does not certify full Sudoku equivalence. Source ratings describe the pinned grader rather than universal human difficulty. The [certificate](../data/catalog/certificate.v1.json), source lock and provenance bind the actual solver/runtime/tool inputs.

## Gate evidence and outstanding work

| Gate | Actual evidence | Acceptance state |
| --- | --- | --- |
| Plans/contracts | Named Lead, Rowan, Cora and Sage primary-source research, reciprocal proposal challenges and actual-source reviews recorded in the ledger | Passed; final sequence independently challenged by Sage |
| Rules/oracles | Independent coordinate topology/reference tests, production cap-two MRV and separately authored Algorithm X; strict indexed-input regressions | Passed, including final mutation audit and native topology replay |
| Catalog | All 100,000 emitted records independently verified, source joined and membership checked; deterministic rebuild and both full autocrlf imports at `865aec1`; application checkouts at `0b3fae7` pass | Passed; catalog/oracle/importer bytes remain unchanged |
| Hints | Nine required techniques, 21 original fixtures, 168 D4/digit states and 378 additional digit/house transformations; independent witness, satisfiability and nonvacuous forcing; two additional constructive intersection cases | Passed, including detector/witness mutation audit |
| Sessions | Independent 2,000 x 250-command model, all 49 adjacent command pairs, compound undo/time/knowledge boundaries | Passed, including final reducer mutation audit |
| Modes/rewards | Independent formula/boundary tests, genuine 60-completion UI journey, completed replay/frontier and explicit Quick choice checks; lead personally completed every progression boundary | Passed, including final source-bound mutation review |
| Native storage | Three-engine transaction/failure matrix, deliberate guard mutants, S-KEY001/002 physical-binding regressions, 100,000-issued/10,000-receipt normal roundtrips, raw future/corrupt recovery and two-generation capacity | Passed with recorded capabilities/performance limits; final pure audit also passed |
| Pure coverage | Final capped regression run: 353 tests in 49 files, all 24 critical files at 100% across 2,174 statements, 1,919 branches, 336 functions and 1,303 lines; summary SHA `e0cadd14e21b7b7037264a0db134dc6c59aa8640a3318ff24f5938ac9d0999ec` | Passed at `faae4dd`; 13.38s, observed exit zero |
| Mutation | All 24 fresh forced scopes and 6,605 mutants; 331 exact approved exception reviews and 55 causal timeout audits; complete current source/test/configuration/plan union | Passed strict wrapper, no unresolved fingerprints |
| UI/browser | Preserved UI regression fifteen cases and built subpath case; full 35-journey Chromium run, three-engine affected presentation/focus/recovery checks, exact frozen builds and lead screenshots | Passed on recorded scopes; final lead saved-game/mobile-popover review also passed |
| Build/types/unit | Both `0b3fae7` clean checkouts pass fresh installation, zero-error/warning type checks, all 378 unit tests in 56 files and production build; later 353 critical tests and Node TypeScript pass | Passed with explicit unchanged-application reuse; later tests are not attributed to earlier checkouts |

The pre-crash combined eighteen-journey Chromium repetition and separate sixty-completion repetition passed against their recorded frozen build. An earlier Continue timeout had no retained diagnostic trace; its cause is not established and it is not erased by later passes. Later fixes have their own actual counterexamples and regression evidence. No unexplained timeout is treated as proof of a product defect or a passing final gate.

After interruption recovery, a complete 35-journey Chromium run passes in 5.3 minutes, including its genuine sixty-completion case in 3.9 minutes. Its frozen F19 index SHA is `bb2c3ef7ab7be4e1a2e7d822df78e160b85c0c9eef461c42b770d7885d1072f5`; `journeys/final-complete-chromium.json` and its runtime inventory retain the exact assets. Fourteen isolated presentation cases pass with normal runner exit. Nine localized save/unscored/Notes badge cases plus trusted emulated DPR-3 touch pass in Firefox and WebKit as well as Chromium. These results certify their recorded snapshots; affected checks for later loader revisions follow below.

The later affected checks also pass: dismissing a held dialog import permits durable input before release in all three engines; editor Erase/Undo retains useful focus; and the real WebKit failed-chunk, Retry and Reload journey passes with the bounded self-preload filter. The lead personally repeated editor Erase followed by Tab, which now reaches Back inside the dialog. Pure identifier limits and shared hint registration do not alter layout or require another full browser playthrough.

R-ITER001 is independently reviewed by Lead, Cora and Sage. Ten inherited-method/iterator/species cases now match their indexed plain controls without invoking caller hooks or changing input/clues. The post-fix coverage run includes the 500,000-command independent session model and finishes in 14.38s. Type checks report zero Svelte errors/warnings and production build passes. Normal indexed-input semantics, visuals, Sudoku/catalog data and repository contracts are unchanged; prior browser/native/corpus evidence is reused on that explicit scope.

Latest application clean-checkout evidence is `checkouts/0b3fae7a9d1c-final-1793505723136/summary.json`, SHA-256 `8fdae8981cc7035c106b2bd1b8c18c18ac98e8167e3fa46be545aaebbdbcd654`. Both autocrlf settings verify all 491 built catalog files, including notices, at root and subpath, totaling 1,964 successful responses, plus separate trust-source identity. Ordinary units pass in 18.13s and 13.01s with two workers; both tracked checkouts remain clean. Node is 25.0.0 and the selected npm CLI is 11.6.2. These runs reuse the unchanged full-corpus certification and two imports at `865aec1`. They do not claim fresh corpus imports or execution of the later regression tests. Later test-only revisions have their own critical coverage/type gate and complete fresh mutation captures at `faae4dd`.

## Final strict mutation acceptance

Exact final invocation from the repository root:

```text
node tests/adversarial/mutation-jobs.mjs review tests/adversarial/mutation-equivalents.v1.json prototypes/gameplay-validation/mutation/final-faae4dd-t3-20261101/jobs.v1.json tests/adversarial/mutation-timeouts.v1.json
```

The exact tracked `mutation-jobs.mjs review` command exits zero with `accepted`, `finalAcceptance` and `fingerprintAccountingAccepted` true and no failures. Untouched raw totals are 6,219 Killed, 329 Survived, 55 Timeout, one NoCoverage and one RuntimeError. The raw score remains 95.0030284675954%. Individually reviewed exceptions are 329 equivalents, one unreachable case and one invalid unloadable static mutant. All 55 timeouts have exact causal audits. The adjusted meaningful-detection result is 6,274 of 6,274, not a claim that every raw mutant was killed or that finite testing proves all possible behavior.

All seventeen meaningful discovery survivors are actually killed by the final regressions. Cora independently verified the 24 unique forced owners, 656 unchanged execution inputs, 56 test entries, complete plan/report fingerprints and observed native exits. The native topology replay exits baseline zero and exact mutant one with TypeError/flatMap; it is never counted as killed. Standalone exception ledgers deliberately do not certify acceptance; the complete strict wrapper does.

- Frozen batch: `mutation/final-faae4dd-t3-20261101`, manifest SHA `7bbf24241492961b9268af7e41a81d0f199fd1add2d39e6953a2a4bb08a1d166`.
- Final adjudication SHA: `e972608215b44989a19aeb9076d51d3e04baeb7da65bb708d7b3fde845efd26f`.
- Exact review ledger SHA: `5bad838ac0cbadd897eeefb69cc39c14049db8ab8e9b6dccb2ea967205967076`.
- Timeout ledger SHA: `51c69d38e4d423a06411b454a0bbb88406088cd14ede591cc8948202f2bf755d`.
- Native replay SHA: `a538740abe10b618e188637ffcdc1014f756145faf12f8598cf39adad3d74571`.
- Removal ledger SHA: `495410dda1071f67f914e3f3ddf8a9f665d500cb2168d19eae33fba97868ee39`; only eleven stale modes reviews and two unused/stale audits were removed, with full before/after snapshots.

Heavy jobs ran serially with two Stryker workers and one Vitest worker each. The supervisor observed all 24 ordinary completions and exited zero. Minimum sampled free RAM was 11.225GiB, above the 8GiB soft reserve; no pressure event occurred. Sampling and V8 limits are not a hard RSS or no-crash guarantee. Historical timeout observations remain separately hash-bound; current raw facts are refreshed rather than copied from previous runs.

S-KEY002 normal roundtrips preserve 52,327,010 canonical bytes in Chromium 156.0.8078.4, Firefox 157.0 and WebKit 27.2. Measured operation times are 18.1165s, 12.54s and 71.755s; staging checkpoints take 5ms, 4ms and 32ms. Maximum observed heartbeat gaps are 248.6ms, 186ms and 563ms. These are desktop observations, not zero-long-task or physical-phone guarantees.

## Personal Codex browser evidence

The lead's isolated localhost origin is port 5189. Saved progress survived the interruption. Screenshots and actual downloaded backups are under ignored `prototypes/gameplay-validation/codex-browser/`; frozen builds are retained independently of mutable dist.

- Quick Easy completed with 108 Dewdrops in the earlier integrated journey.
- Quick Hard resumed its acknowledged inconsistency hint after interruption. Explicit reveal matched a separately written solver using only visible givens; reload and Restart retained assistance. Actual entry of all blanks produced 391 Dewdrops, 48/49 independent answers, 0% time bonus and wallet 936.
- Genuine UI-generated boundary backups were restored through the actual file chooser, validation preview and confirmation, never by fabricated rewards. Every boundary was personally completed and inspected: 6 to 7, 15 to 16, 24 to 25, 42 to 43 and 60 to Metamorphosis 2/Leap 1. Final-Leap replay then selected Leap 6 preserved every visible frontier value/note label, including Notes 1/2.
- Current F19 Medium logical assistance reported a naked single at row 1/column 2. An independent coordinate candidate scan found only 7 and the separate solver agreed. Completion earned 196 Dewdrops, 53/54 independent answers and zero time bonus. Explicitly choosing Hard retained that receipt with Continue · Hard, then allocated Hard directly.
- Two actual tabs transferred writer ownership explicitly and reciprocally concealed the former writer. The lead downloaded and inspected the previous writer's nonimportable local recovery, verified trigger focus, then explicitly resumed the saved puzzle. The temporary second tab was closed afterwards.
- Mobile Backup computed all four corners as 28px. Earlier actual scrollbar review recorded transparent track/buttons with ink-colored arrow glyphs and thumb. Responsive screenshots and exact geometry checks remain separate from hardware claims.

After the crash, the browser inventory contained no tabs. Lead opened the verified preview, resumed the existing Progression game, inspected the gameplay More popover and saved `codex-browser/final-gameplay-accepted.jpg`. Tools are visibly left and Menu right; all four corners compute to 28px at 360x800 CSS pixels, DPR 1. The browser observation limitation on performance entries was handled by reading actual DOM script/style URLs instead. The final byte check verifies all seventeen index/assets against both local dist and the clean-checkout build, including observed browser assets. Index SHA is `f3a0c8404f455c2757b2a907017efc3b6934c964ca51ebd6c247e65051c62d16`; verification summary SHA is `e5ae941abbf1135298ee4aea58b20ffe8d14bd78060ff97fab2bfba0bb302342`. Screenshot SHA is `51eee0b3b5b5ca572db629c5e15f10c07ab8c56d28b3d7f3d1b7104d753ee930`. Lead restored the normal viewport and explicitly paused the game. This final bounded visual check reuses the earlier complete journeys, not another full playthrough or a new physical-device claim.

## Explicit limits

Browser IndexedDB acknowledgement cannot guarantee survival of every power failure, eviction or media fault. The normal same-version backup is validated/importable; emergency raw/local recovery is distinct and nonimportable, requiring manual recovery. Unsupported structured-clone types fail explicitly without changing stored data. Automatic key-generator high-water state is not observable through read-only APIs. Native getAll can allocate an unknown large value before JavaScript checks encoding budgets; browser peak memory was not measured.

Two retained full histories pass raw export in all three tested desktop engines at about 209.3MB. Main heartbeat observations are recorded with each report, not a zero-long-task or phone guarantee. This Windows WebKit build cannot seed Blob/File/FileList in IndexedDB; its native capability flags disclose that limitation. Chromium/Firefox actual roundtrips and pure encoder tests remain separate evidence.

Physical Motorola G31/G32 testing, actual Android scaling/browser chrome/safe areas, sustained energy/thermals and human screen-reader testing have not been performed. DPR-3 touch and viewport/AX simulations are labelled as such. The available Codex browser did not change actual zoom under the attempted shortcuts; CSS enlarged text is not an actual 200% page-zoom pass. These external release limits must remain visible.

The rough menu sketch remains an explicitly authorized temporary asset with its recorded provenance; final human-made replacement art is deferred. Service-worker application-shell caching, installability, cold offline launch and deployment are outside this gameplay phase. Gameplay is complete on the recorded executable matrix; theme work and integration in this checkout await fresh user instructions.
