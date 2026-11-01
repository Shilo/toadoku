# Gameplay readiness, source and decision audit

Prepared 2026-10-31 for the next autonomous gameplay implementation. This pass reviews documentation and sources only. It does not import a production catalog, implement game rules, certify puzzles or change the application. Start implementation from the [gameplay handoff](../gameplay-implementation-handoff.md), when that task is activated.

## 1. Existing record and precedence

The latest user request asks for a complete implementation handoff covering correct Sudoku, progressively loaded established puzzle data, modes, cycles, levels, currency and persistent storage. It also requires researched specialist work, reciprocal challenge/review, Codex browser acceptance and periodic commits. That future scope supersedes the old presentation-only prohibitions when implementation is activated. It does not mean this documentation task should begin coding gameplay.

| Reviewed record | Retain | Superseded, unresolved or historical |
| --- | --- | --- |
| [AGENTS](../../AGENTS.md), [decisions](../decisions.md), [TODO](../../TODO.md) | Classic Sudoku, approved names, modular boundaries, stack, selected Pond presentation | Old handoff-only/prototype-only task restrictions; open numerical choices need explicit defaults |
| [Progression](../progression.md) | Shuffled pre-rated catalog, frontier advance, final Leap resets to easiest, Metamorphosis increases, freshness/currency survive, completed board stays until Continue | Starting ordinal, schedule, replay unlock scope and save-role policy were not settled |
| [Scoring](../scoring.md) | Both modes and fresh replays earn one currency; valid completion only; monotone assistance; rewards once; base credit dominates speed | Formula and all numbers were recommendations, not calibrated facts |
| [Menu](../menu.md), [menu/status audit](menu-and-status-audit.md) | Direct modes, same-scene choices, explicit return, sticky Notes, persistent completion result, no untimed readable pause | Save-slot limit and exact tools layout remained open; disabled-More language is historical |
| [Architecture](../architecture.md), [technology](technology.md) | Pure rules/session/presentation/locale/storage separation, Svelte framework + TypeScript + Vite, static hosting, no required WASM/backend | Two independent localStorage records cannot provide atomic wallet/frontier/session completion; prefer transactional IndexedDB |
| [Game modes research](game-modes.md), [progression audit](progression-audit.md) | Bank approach and difficulty limitations, no hidden adaptation, finite supply | Fixed Journey chapters, permanent difficulty ceiling instead of looping, daily puzzles, cosmetics and custom-grader-first are unselected alternatives |
| [Sudoku interaction research](sudoku-design.md), [board/controls](board-and-controls.md) | Immutable clues, real digits, reversible edits, notes, sound hints, rule conflicts distinct from solution checks, keyboard/accessibility | Outlined selected cells, top bar, permanent tool row, gameplay frog and clue-count difficulty are superseded |
| [Responsive dock audit](responsive-dock-audit.md), [UI/UX](../ui-ux.md), [design](../design.md) | Ten keys, portrait 2x5/right landscape 5x2, row-major order, inward square leaf anchors, exact 4px/8px gaps, safe areas | Earlier square-only assumptions, extra tools row and disabled gameplay controls describe prior phases |
| [Terminology](terminology.md) | Metamorphosis, Leap, Dewdrops; localization separated from state identifiers | Rebirth/Hop/Level alternatives do not rename approved concepts |
| [Prototype findings](prototype-findings.md) | Regression cases: keypad steals arrow navigation, stale accessible labels, unnamed dialogs, completion focus loss | Prototype engine, saves, generators and test results are not production implementations or certification |
| [Themes](../themes.md), [theme structure](theme-structure.md) | Theme/appearance/locale/persistence independence, changes preserve gameplay, no theme-owned rules | Halloween, alternate palettes and renderers are outside the gameplay phase; old accessories proposals are unselected |
| [Production UI results](../production-ui-progress.md), [UI handoff](../production-ui-handoff.md), [process](../process.md) | Existing tracked shell, geometry, history/focus behavior, clock lifecycle and explicit specialist challenge workflow | Fixture digits, inert entry keys and decorative motion clock are not a rules/session/timing implementation |
| [Asset provenance](../production-assets.md), [design handoff](../design-handoff.md), [visual acceptance](../future-visual-research.md) | Current rough sketch exception, fixed identity anchors, no gameplay mascot, protected leaf/water envelopes, honest hardware/tiny-note limits | Do not remove the user-authorized sketch by reapplying the earlier neutral-only fallback; do not label simulated screenshots as physical-device results |

Presentation research remains contextual, not a license to restore rejected layout or gameplay alternatives. The detailed gameplay specifications linked by the handoff settle future implementation defaults explicitly. Historical prose remains intact where it is useful evidence.

## 2. Researched catalog candidate

The preferred source is the [Sudoku Exchange puzzle bank](https://github.com/grantm/sudoku-exchange-puzzle-bank). The [publisher explains its generation, rating and reuse policy](https://sudokuexchange.com/puzzle-bank/). Its [data license at the pinned revision](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/LICENSE.txt) dedicates this dataset to the public domain. That permission concerns the bank data, not unrelated puzzle archives or the generator/grader source code.

The reviewed revision is `d8c8ebaee0c08c412cfba96af1923dfa61c83317`, committed `2023-09-22T21:55:27Z`, with tree `e16d0103b3e05b314df0c4b6654fb862feaf7aff`. See the [commit API](https://api.github.com/repos/grantm/sudoku-exchange-puzzle-bank/commits/d8c8ebaee0c08c412cfba96af1923dfa61c83317) and [tree API](https://api.github.com/repos/grantm/sudoku-exchange-puzzle-bank/git/trees/e16d0103b3e05b314df0c4b6654fb862feaf7aff).

| File | API byte size | Count derived from documented 100-byte records | Git blob |
| --- | ---: | ---: | --- |
| `easy.txt` | 10,000,000 | 100,000 | `7f7795485929d2a14b48d92e400471ca0d69a5fb` |
| `medium.txt` | 35,264,300 | 352,643 | `09d12cd530454a30ebc04127e0061ddc3847524f` |
| `hard.txt` | 32,159,200 | 321,592 | `fa8ee5ead4ab7be4e8c1b9af91d859384d5d4cfb` |
| `diabolical.txt` | 11,968,100 | 119,681 | `69b8583a8e4064339b85ca567ec57e27433f90cc` |
| Total | 89,391,600 | 893,916 | |

These are metadata-derived source counts. They are not a full parse, uniqueness certificate, exact duplicate count, equivalence-class count or validated difficulty histogram. Small streamed samples matched the documented ID/givens/rating structure. No bulk source download or catalog certification was performed in this handoff pass. Source SHA-256 values must be computed during import, not invented here.

Upstream provides givens and ratings, not solutions. The implementation must derive solution data and certify it independently. Preserve the upstream rating system and the fact that its QQWing/Sukaku versions are not pinned by this dataset. Do not invent generator/grader version provenance.

## 3. Default direction agreed after specialist challenge

The following are explicit handoff defaults selected by the lead after research and challenge. They are not retroactive claims of earlier user approval or human playtesting. The future orchestrator can improve provisional values before freezing v1, through a recorded specialist review and complete affected tests, without polling the user for routine product decisions. It must preserve actual user requirements and the large-catalog gate.

| Decision | Default | Reason and boundary |
| --- | --- | --- |
| Catalog size | At least 100,000 accepted puzzles, minimum quotas 25k Easy / 25k Medium / 50k Hard | Meaningful large supply; 40k is a progress milestone, not a smaller release fallback |
| Labels | Easy `<1.5`, Medium `[1.5,2.5)`, Hard `[2.5,5)` | Preserve current three-label menu; do not smuggle extreme/Expert puzzles into Hard |
| Internal intervals | One Easy, two Medium, two Hard pools; at least 1,000 accepted records in each | Subdivide only where actual validated supply exists; do not assume separate 1.0/1.2 Easy supply |
| Metamorphosis/Leap | Display starts at 1/1; 60-Leap loop: 6 Easy, 18 Medium, 36 Hard | Shorter easy re-entry, longer challenging practice; configurable, not empirically calibrated |
| Replay | Highest completed Leap unlock survives cycles within schedule version; fresh puzzle; normal rewards; never advances frontier | Separate selected replay from durable frontier |
| Active saves | One Quick Play, one frontier, one replay role | Preserve frontier during replay without inventing an arbitrary three-slot management product |
| Scoring | Bases 1000/2000/4000, at most 10% speed bonus, 10 score per Dewdrop | Fixed-point deterministic calculation; notes/undo do not count as inefficiency |
| Provisional time targets | 10/20/40 active minutes | Published initial configuration; not a human-skill or accessibility benchmark |
| Storage | Namespaced IndexedDB, transactional essential state, separate disposable cache | Completion, wallet, progression and receipt must commit together |
| Assistance | Monotone knowledge ledger committed before information disclosure | Undo/restart/crash cannot make known answers appear unassisted |
| Runtime supply | Progressive local immutable shards, no runtime puzzle generator | Avoid generation/rating latency and unverified clue-count labels |
| Offline boundary | Resume full local attempt snapshots and reuse verified cached shards | Full cold offline application launch/PWA/deployment remains a separate phase |

Source grading is approximate. [HoDoKu documents solver-order effects](https://hodoku.sourceforge.net/en/docs_solv.php); [Conceptis discusses reasoning difficulty and bottlenecks](https://www.conceptispuzzles.com/index.aspx?uri=info/article/2); the [Sukaku rating notes](https://github.com/SudokuMonster/SukakuExplainer/wiki/Difficulty-ratings-in-Sudoku-Explainer-v1.2.1) include technique/complexity adjustments. Do not treat different graders' numeric scales as interchangeable or promise every subsequent puzzle feels harder.

## 4. Material challenge and resolution record

| Initial proposal or assumption | Lead/specialist challenge | Agreed direction |
| --- | --- | --- |
| Import four source buckets into four visible levels | Current UI has three labels; extreme ceiling and hint coverage would expand scope | Three labels, rating `<5` ceiling for v1 |
| Release at 40k if 100k is inconvenient | Weakens the user's large-supply requirement and encourages untested fallback | 100k is the real gate; investigate or report a blocker, never inflate with transformations |
| Divide Easy into multiple rating strata immediately | A source histogram has not established rare low-rating supply | One Easy interval, coverage-gated Medium/Hard subdivisions |
| Canonical key proves all structures distinct | Digit relabeling and D4 symmetry do not cover band/stack/row/column equivalences | Name the exact deduplication scope; no claim of full Sudoku equivalence classification |
| One solver validates all imported rows | Shared topology/algorithm defects can certify wrong puzzles | Separate MRV/bitmask and Algorithm X oracles, no shared peer builder, full emitted-data recheck |
| Reward receipt keyed only by attempt ID | Distinct stale attempts can advance the same frontier position twice | Unique attempt reward plus frontier-grant identity and compare-and-swap bound to run/Leap |
| 100 score buys one Dewdrop | Flooring removes every positive-time Easy speed bonus | Use 10 score per Dewdrop; test exact arithmetic examples |
| Save hints optimistically after showing them | A crash can preserve the player's knowledge but lose assistance provenance | Commit disclosure payload/ledger first; recover the pending payload after reload |
| Independent localStorage blobs are sufficient | They cannot atomically update wallet, receipt, frontier and completed attempt | IndexedDB multi-store transaction, acknowledge completion event |
| Save every command in an unlimited journal | Slow storage and long games grow queues/history indefinitely | One in-flight plus one coalesced snapshot, explicit bounded undo, durable receipts retained |
| Revision checks solve all multi-tab issues | Two tabs can both act like the writer and measure time | Per-attempt writer epoch, explicit takeover, stale writer read-only; notification is not authority |
| Reuse the existing motion clock for elapsed play | Reduced motion deliberately resets that clock | Separate injectable active-play clock independent of decoration/preferences |
| Imported wallets can be combined | Restore can double earnings or cross incompatible lineages | Validated replacement generation, retained recovery copy, no additive merge |
| A globally correct hint conclusion proves its technique label | A solution digit can be correct while the claimed X-Wing is absent; unsatisfiable premises prove anything vacuously | Independently validate actual technique witnesses; first prove the original state satisfiable, then validate conclusions |
| Solver certification also checks rating/source associations | Copying a neighboring row's rating leaves a valid puzzle/solution | Independently join every serialized record to its original pinned source row and metadata |
| Quick Play can have separate freshness cursors | A completed interval can repeat while another eligible interval still has lifetime-unseen puzzles | Five shared disjoint interval authorities, weighted eligible unseen selection, atomic issue reservation |
| General storage revision is also a hint proof version | Frequent timer/manual-note saves can invalidate a long-running hint indefinitely | Separate logical-premise revision; rebase onto latest compatible persisted state before disclosure |
| RAM-only unscored assistance is always safe after a write fails | Crash can reopen the original durable scored lineage after the player learned the answer | Durable assistance or irrevocable retirement before disclosure; only fresh permanently unscored identities avoid that barrier |
| Restore pointer comparison alone prevents lost work | Another tab can edit or earn a reward during staging without changing the pointer | Compare active generation and its essential revision; inactive staging uses separate revisions and does not invalidate its own preview |
| Deterministic import alone gives stable catalog hashes | Windows checkout can rewrite JSON/license endings after import | Canonical output/input hash rules, narrow Git attributes and clean autocrlf true/false served-byte verification |
| Square remains optional while this phase builds Settings | Approved design deferred access, not the preference; naive centering breaks the dock gap | Required persistent Square through the same geometry contract, dock-anchored with exact 8px and both-shape/runtime tests |

The review sought counterexamples and simpler alternatives, not ceremonial agreement. Research-only specialists edited no application files. Implementation teams must repeat the same process against their actual code, data and browser behavior.

Preparation reviewers were `catalog_logic_handoff` for catalog/oracles/patterns, `modes_handoff` for mode/reward/UI policy and `storage_validation_handoff` for state/storage/acceptance. The lead authored and integrated the specifications, challenged proposals, read their actual text and requested concrete revisions; specialists also challenged the lead's plans. Their acceptance concerns this documented direction only. It does not certify unimplemented software or puzzle data.

## 5. Primary source index and limits

These references establish technical facts or precedents, not Toadoku's numerical balance or final certification. Recheck relevant versions when implementing.

- [Knuth, Dancing Links](https://arxiv.org/abs/cs/0011047): independent exact-cover algorithm reference.
- [Norvig, Solving Every Sudoku Puzzle](https://www.norvig.com/sudoku.html): units/peers and solving explanation. Do not blindly inherit permissive parsing or third-party benchmark rights.
- [HoDoKu techniques](https://hodoku.sourceforge.net/en/techniques.php): human technique taxonomy and examples; do not copy licensed diagrams/code without checking rights.
- [QQWing about/license](https://qqwing.com/about.html), [Sukaku Explainer](https://github.com/SudokuMonster/SukakuExplainer), [Tdoku license](https://github.com/t-dillon/tdoku/blob/master/LICENSE): distinct code licensing and optional oracle tools. A code license does not automatically license external benchmark data.
- [IndexedDB specification](https://www.w3.org/TR/IndexedDB/), [transaction complete](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event), [transaction options/durability](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction): transaction boundaries. Durability hints do not guarantee recovery from arbitrary power/media failure.
- [Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB), [quota and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [persistent storage](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist): platform limits. Origin data can be evicted and storage permission can be denied.
- [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API), [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API), [page lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api): optional coordination and lifecycle observations; do not depend on reliable unload or message delivery.
- [Fetch error handling](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch), [SHA-256 digest](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest), [Vite assets](https://vite.dev/guide/assets.html): local progressive resource loading and integrity checks.
- [Git attributes](https://git-scm.com/docs/gitattributes#_checking_out_and_checking_in): exact hashed files/notices and canonical policy inputs need explicit byte/EOL handling and clean-checkout verification; a deterministic importer alone cannot prevent checkout conversion.
- [Arkadium scoring precedent](https://support.arkadium.com/support/solutions/articles/44002181769--sudoku-how-to-play-menu-tips-scoring): published difficulty/time/independence structure; not evidence for our numerical choices.
- [fast-check model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/), [Stryker plugins](https://stryker-mutator.io/docs/stryker-js/plugins/): candidate development-only verification tools; pin compatible versions and keep reports local.
- [WAI grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), [dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [WCAG keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html): interactive semantics must be implemented and tested, not obtained by adding roles alone.

No external issue, feedback submission or project-data upload is authorized by this research. No puzzle bank, strategy module or human difficulty claim is certified by this document. The handoff's gates require the implementation team to produce that evidence and to distinguish finite test results from a proof that every possible bug is absent.

## 6. Preparation-only validation

The lead checked all 16 new/updated Markdown files: 251 local file/heading links resolved, fenced code blocks balanced and project-authored text contained no em dashes. Independent arithmetic recomputed six published score/currency examples, all five contiguous schedule intervals totaling 60 Leaps, the 100,000 minimum quota sum and metadata-derived upstream row totals. A separate check verified the explicit every-plan rule in the main handoff/process/AGENTS and the embedded receiving-agent prompt. `git diff --check` passed; final staged scope is documentation only.

All three research specialists reviewed the actual specifications after revisions and accepted their relevant contracts. The catalog/correctness reviewer also challenged and accepted the lead's documentation-only validation/release plan. No application/build inputs changed, so application type/build/browser tests were not rerun for this documentation commit. No gameplay implementation, bulk import, complete-corpus solver verification, real storage test, new browser journey or hardware test was performed. Those remain mandatory receiving-agent gates, not inherited passes.
