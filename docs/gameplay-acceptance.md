# Gameplay acceptance record

Status: **in progress, not final acceptance**. Finish all gameplay tasks and required checks, then pause and report to the user. Theme work must wait for fresh user instructions, even after gameplay completion. This record does not waive a gate or claim that an interrupted run completed.

The accepted integration checkpoint is `865aec1`, following storage checkpoint `c253531`, `cc0bdbe`, `6981a12`, `ddf7652`, `3005d8d`, `8f07080` and `a863c89`. Later targeted revisions and adversarial test/documentation changes remain under review. Final acceptance must identify the exact committed source snapshot and final clean-checkout evidence.

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
| Catalog | All 100,000 emitted records verified independently, source joined, membership checked; deterministic rebuild unchanged | Repeat both autocrlf clean checkouts at the accepted integrated commit |
| Hints | Nine required techniques, 21 original positive fixtures and 168 transformed proof states; independent witness and nonvacuous forcing | Finish current detector/witness mutation campaign and final browser review |
| Sessions | Independent 2,000 x 250-command model, all 49 adjacent command pairs, compound undo/time/knowledge boundaries | Finish current reducer mutation audit |
| Modes/rewards | Independent formula and boundary tests, genuine 60-completion UI journey, completed replay/frontier checks | Final snapshot/choice regressions and independent browser acceptance |
| Native storage | Fifteen pre-raw native cases per engine, deliberate semantic guard mutants, large normal backup roundtrip, raw future/corrupt recovery and two-generation capacity | Final mutation evidence and final snapshot repetition as affected |
| Pure coverage | Pre-cleanup 24-file checkpoint: 2,131 statements, 1,902 branches, 335 functions and 1,274 lines, all covered; summary SHA `9fded45b7eb8d70c86a566e70255e104eec47093eab15bec786a50e4b84b00a8` | Repeat after final pure-source/test revisions and record final hash |
| Mutation | Raw per-module reports and exact reviewed fingerprints retained; missing modules/survivors are not accepted | Complete every configured source, meaningful survivors, timeout audit and source-bound report/plan union |
| UI/browser | Preserved UI regression fifteen cases and built subpath case; one recovered-origin fixture failure corrected and affected touch case passed; isolated presentation and real recovery journeys | Final complete run, three-engine affected journeys, source/build hashes and lead screenshots |
| Build/types/unit | Current type check has no Svelte errors/warnings and node tsc passes; production builds pass; unit checkpoint 267 tests/44 files, including controller integration; later session/accounting cases pass their affected checks | Final committed snapshot commands and clean working tree |

The pre-crash combined eighteen-journey Chromium repetition and separate sixty-completion repetition passed against their recorded frozen build. An earlier Continue timeout had no retained diagnostic trace; its cause is not established and it is not erased by later passes. Later fixes have their own actual counterexamples and regression evidence. No unexplained timeout is treated as proof of a product defect or a passing final gate.

After interruption recovery, a complete 35-journey Chromium run passes in 5.3 minutes, including its genuine sixty-completion case in 3.9 minutes. Its frozen F19 index SHA is `bb2c3ef7ab7be4e1a2e7d822df78e160b85c0c9eef461c42b770d7885d1072f5`; `journeys/final-complete-chromium.json` and its runtime inventory retain the exact assets. Fourteen isolated presentation cases pass with normal runner exit. Nine localized save/unscored/Notes badge cases plus trusted emulated DPR-3 touch pass in Firefox and WebKit as well as Chromium. These results certify their recorded snapshots; later loader and pure-source revisions still need their affected checks.

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
