# Gameplay acceptance record

Status: **in progress, not final acceptance**. Finish all gameplay tasks and required checks, then pause and report to the user. Theme work must wait for fresh user instructions, even after gameplay completion. This record does not waive a gate or claim that an interrupted run completed.

The current application checkpoint is `a12b62c`, which fixes indexed session-array capture after `c749448579bdf15a95836b683c1f16c9bfd14ffe`. Earlier integration/storage/foundation slices are recorded in the progress ledger. The final regression batch passes critical checks; fresh application checkouts and mutation adjudication remain in progress. Final acceptance must identify the exact committed snapshot and distinguish unchanged runtime evidence from later test revisions.

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

| Gate | Actual evidence | Required before final acceptance |
| --- | --- | --- |
| Plans/contracts | Named Lead, Rowan, Cora and Sage primary-source research, reciprocal proposal challenges and actual-source reviews recorded in the ledger | Reconcile all final revisions and source owners |
| Rules/oracles | Independent coordinate topology/reference tests, production cap-two MRV and separately authored Algorithm X; strict indexed-input regressions | Final current source-bound mutation audit |
| Catalog | All 100,000 emitted records independently verified, source joined and membership checked; deterministic rebuild and both full autocrlf imports at `865aec1`; final application checkouts at `c749448` pass | Reuse certification only while catalog/oracle/importer inputs remain unchanged |
| Hints | Nine required techniques, 21 original fixtures, 168 D4/digit states and 378 additional digit/house transformations; independent witness, satisfiability and nonvacuous forcing; shared technique registration | Finish current detector/witness mutation campaign |
| Sessions | Independent 2,000 x 250-command model, all 49 adjacent command pairs, compound undo/time/knowledge boundaries | Finish current reducer mutation audit |
| Modes/rewards | Independent formula/boundary tests, genuine 60-completion UI journey, completed replay/frontier and explicit Quick choice checks; lead personally completed every progression boundary | Finish final source-bound mutation review |
| Native storage | Three-engine transaction/failure matrix, deliberate guard mutants, S-KEY001/002 physical-binding regressions, 100,000-issued/10,000-receipt normal roundtrips, raw future/corrupt recovery and two-generation capacity | Final pure mutation evidence; repeat native checks only for genuinely affected runtime changes |
| Pure coverage | Post-batch 349 tests in 49 files: all 24 critical files have 100% coverage across 2,174 statements, 1,919 branches, 336 functions and 1,303 lines; summary SHA `e0cadd14e21b7b7037264a0db134dc6c59aa8640a3318ff24f5938ac9d0999ec` | Complete the separately required mutation gate |
| Mutation | Raw per-module reports and exact reviewed fingerprints retained; missing modules/survivors are not accepted | Complete every configured source, meaningful survivors, timeout audit and source-bound report/plan union |
| UI/browser | Preserved UI regression fifteen cases and built subpath case; full 35-journey Chromium run, three-engine affected presentation/focus/recovery checks, exact frozen builds and lead screenshots | Reuse unchanged visual/transaction evidence; inspect only genuinely affected runtime changes |
| Build/types/unit | Both `c749448` clean checkouts pass fresh installation, zero-error/warning type checks, all 346 unit tests in 53 files and production build | Final regression-batch checks, committed snapshot and clean working tree |

The pre-crash combined eighteen-journey Chromium repetition and separate sixty-completion repetition passed against their recorded frozen build. An earlier Continue timeout had no retained diagnostic trace; its cause is not established and it is not erased by later passes. Later fixes have their own actual counterexamples and regression evidence. No unexplained timeout is treated as proof of a product defect or a passing final gate.

After interruption recovery, a complete 35-journey Chromium run passes in 5.3 minutes, including its genuine sixty-completion case in 3.9 minutes. Its frozen F19 index SHA is `bb2c3ef7ab7be4e1a2e7d822df78e160b85c0c9eef461c42b770d7885d1072f5`; `journeys/final-complete-chromium.json` and its runtime inventory retain the exact assets. Fourteen isolated presentation cases pass with normal runner exit. Nine localized save/unscored/Notes badge cases plus trusted emulated DPR-3 touch pass in Firefox and WebKit as well as Chromium. These results certify their recorded snapshots; affected checks for later loader revisions follow below.

The later affected checks also pass: dismissing a held dialog import permits durable input before release in all three engines; editor Erase/Undo retains useful focus; and the real WebKit failed-chunk, Retry and Reload journey passes with the bounded self-preload filter. The lead personally repeated editor Erase followed by Tab, which now reaches Back inside the dialog. Pure identifier limits and shared hint registration do not alter layout or require another full browser playthrough.

R-ITER001 is independently reviewed by Lead, Cora and Sage. Ten inherited-method/iterator/species cases now match their indexed plain controls without invoking caller hooks or changing input/clues. The post-fix coverage run includes the 500,000-command independent session model and finishes in 14.38s. Type checks report zero Svelte errors/warnings and production build passes. Normal indexed-input semantics, visuals, Sudoku/catalog data and repository contracts are unchanged; prior browser/native/corpus evidence is reused on that explicit scope. New application checkouts follow before the final mutation campaign.

Final application clean-checkout evidence is `checkouts/c749448579bd-final-1793500299035/summary.json`, SHA-256 `98e26ece805a667a16ead245674f71566ab07ea3019eed0d8ff8de76c1bd88ef`. Both autocrlf settings verify all 491 built catalog files, including notices, at root and subpath, totaling 1,964 successful responses, plus separate trust-source identity. These runs reuse the unchanged full-corpus certification and two imports at `865aec1`; they do not claim fresh corpus imports at `c749448`.

S-KEY002 normal roundtrips preserve 52,327,010 canonical bytes in Chromium 156.0.8078.4, Firefox 157.0 and WebKit 27.2. Measured operation times are 18.1165s, 12.54s and 71.755s; staging checkpoints take 5ms, 4ms and 32ms. Maximum observed heartbeat gaps are 248.6ms, 186ms and 563ms. These are desktop observations, not zero-long-task or physical-phone guarantees.

## Personal Codex browser evidence

The lead's isolated localhost origin is port 5189. Saved progress survived the interruption. Screenshots and actual downloaded backups are under ignored `prototypes/gameplay-validation/codex-browser/`; frozen builds are retained independently of mutable dist.

- Quick Easy completed with 108 Dewdrops in the earlier integrated journey.
- Quick Hard resumed its acknowledged inconsistency hint after interruption. Explicit reveal matched a separately written solver using only visible givens; reload and Restart retained assistance. Actual entry of all blanks produced 391 Dewdrops, 48/49 independent answers, 0% time bonus and wallet 936.
- Genuine UI-generated boundary backups were restored through the actual file chooser, validation preview and confirmation, never by fabricated rewards. Every boundary was personally completed and inspected: 6 to 7, 15 to 16, 24 to 25, 42 to 43 and 60 to Metamorphosis 2/Leap 1. Final-Leap replay then selected Leap 6 preserved every visible frontier value/note label, including Notes 1/2.
- Current F19 Medium logical assistance reported a naked single at row 1/column 2. An independent coordinate candidate scan found only 7 and the separate solver agreed. Completion earned 196 Dewdrops, 53/54 independent answers and zero time bonus. Explicitly choosing Hard retained that receipt with Continue · Hard, then allocated Hard directly.
- Two actual tabs transferred writer ownership explicitly and reciprocally concealed the former writer. The lead downloaded and inspected the previous writer's nonimportable local recovery, verified trigger focus, then explicitly resumed the saved puzzle. The temporary second tab was closed afterwards.
- Mobile Backup computed all four corners as 28px. Earlier actual scrollbar review recorded transparent track/buttons with ink-colored arrow glyphs and thumb. Responsive screenshots and exact geometry checks remain separate from hardware claims.

## Explicit limits

Browser IndexedDB acknowledgement cannot guarantee survival of every power failure, eviction or media fault. The normal same-version backup is validated/importable; emergency raw/local recovery is distinct and nonimportable, requiring manual recovery. Unsupported structured-clone types fail explicitly without changing stored data. Automatic key-generator high-water state is not observable through read-only APIs. Native getAll can allocate an unknown large value before JavaScript checks encoding budgets; browser peak memory was not measured.

Two retained full histories pass raw export in all three tested desktop engines at about 209.3MB. Main heartbeat observations are recorded with each report, not a zero-long-task or phone guarantee. This Windows WebKit build cannot seed Blob/File/FileList in IndexedDB; its native capability flags disclose that limitation. Chromium/Firefox actual roundtrips and pure encoder tests remain separate evidence.

Physical Motorola G31/G32 testing, actual Android scaling/browser chrome/safe areas, sustained energy/thermals and human screen-reader testing have not been performed. DPR-3 touch and viewport/AX simulations are labelled as such. The available Codex browser did not change actual zoom under the attempted shortcuts; CSS enlarged text is not an actual 200% page-zoom pass. These external release limits must remain visible.

The rough menu sketch remains an explicitly authorized temporary asset with its recorded provenance; final human-made replacement art is deferred. Service-worker application-shell caching, installability, cold offline launch and deployment are outside this gameplay phase. No new theme work is included while gameplay completion remains outstanding.
