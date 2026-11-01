# Gameplay data, rules and deduction correctness

Implementation specification linked by the [autonomous gameplay handoff](gameplay-implementation-handoff.md). Prepared 2026-10-31. All implementation, import and test plans are subject to its research/challenge rule. This document defines future gates; it is not a completed catalog certificate.

## 1. Meaning of puzzles, solutions and patterns

Keep three concepts distinct:

1. A puzzle instance is an 81-cell givens grid with a stable content identity, source/rating provenance and exactly one certified solution.
2. A solved-grid structure is not automatically novel because digits, orientation or permitted rows/columns were permuted. Do not manufacture a large catalog by renaming one template.
3. A deduction pattern is an algorithmic logical rule with premises, conclusions, explanation metadata and positive/negative proof fixtures. A puzzle's imported rating does not supply its deduction trace.

Puzzle instances and their solutions must be in progressively loaded data files. Technique metadata, policy tables and fixtures should also be data. Rule/pattern algorithms remain typed, reviewed TypeScript, not arbitrary code strings in JSON.

## 2. Pure classic-rule contract

The production rules module has no Svelte, DOM, storage, UI token, translation, clock, network or reward dependency. Prefer simple immutable arrays/bitmasks and explicit validated types over framework abstractions.

| Invariant | Required behavior |
| --- | --- |
| Board | Exactly 81 integer cells, values 0-9; 0 means empty. Reject NaN, floats, booleans, undefined holes, extra cells and permissive text filtering. |
| Topology | Nine rows, nine columns, nine 3x3 boxes; 27 units of nine cells. Each cell belongs to three units and has exactly 20 distinct non-self peers. Peer relation is symmetric. |
| Clues | Givens are immutable. Entries and notes are stored separately and cannot rewrite the original definition. |
| Candidates | For an empty cell, remove digits already present in its row/column/box. No user pencil mark becomes authoritative legality. Define filled-cell candidate behavior explicitly. |
| Conflicts | Return all direct duplicate participants with reason/unit metadata. A wrong answer that creates no duplicate is not a rule conflict. |
| Valid completion | No blanks; every unit is exactly digits 1-9; all original clues unchanged. A full grid or a string match without rule checks is insufficient. |
| Exact solver | Distinguish invalid input, zero solutions, exactly one solution and at least two solutions. Saturate count at two. Timeout/abort is unknown, never zero/unique. |
| Solution snapshot | Validate it is a solved classic grid agreeing with every given. A valid completed board that disagrees with a supposedly unique certified snapshot is an integrity failure, not an ordinary player mistake. |

Use strict import/storage decoders separate from friendly UI key parsing. Put every cell/digit/unit boundary into tests, especially rows/columns 2/3 and 5/6, cell 80, bit 9 and the blank mask. Do not import a shared production peer builder into the independent exact-cover verifier.

The [Norvig explanation](https://www.norvig.com/sudoku.html) is useful for topology and solving concepts; adopt neither permissive parsing nor benchmark redistribution assumptions without review. [Knuth's exact-cover work](https://arxiv.org/abs/cs/0011047) supplies an independent algorithmic basis.

## 3. Established source and immutable provenance

For the implemented catalog's source links, the reason for selecting 100,000 puzzles, retained files and rebuild/expansion instructions, see [Puzzle sources and catalog maintenance](puzzle-sources.md).

Default source: Sudoku Exchange at revision `d8c8ebaee0c08c412cfba96af1923dfa61c83317`. The [readiness audit](research/gameplay-readiness-audit.md#2-researched-catalog-candidate) records source URLs, license, Git blobs, byte sizes and the distinction between metadata counts and actual certification.

The source files supply an upstream short ID, givens and a Sukaku rating. They do not supply solutions. Derive solutions through the import pipeline. Retain the bank's data dedication/attribution and distinguish it from QQWing GPL and Sukaku LGPL implementation licenses. Neither generator nor grader must become a runtime dependency.

The accepted release corpus must contain at least **100,000** records after all validation and declared deduplication, with minimum quotas of 25,000 Easy, 25,000 Medium and 50,000 Hard. A 40,000-puzzle import is a useful diagnostic milestone, not a release fallback. Require at least 1,000 accepted records in every scheduled internal interval. Full source coverage, rating histograms and actual quotas must be reported before declaring this feasible, not inferred solely from API byte counts.

Select deterministically across the actual rating distribution. Source buckets and human difficulty are not interchangeable universal truths. Keep only rating `<5` in v1; preserve the three current Quick Play labels. Do not fill a missing tier with mislabeled, ungraded, ambiguous or transformed puzzles.

Before downloading/importing, the catalog specialist researches and challenges:

- Exact source revision, explicit data rights, format, generator/grader provenance and missing facts.
- Whether the source is a real established game-system supply, not scraped user submissions.
- Supply per intended interval after independent validation and deduplication.
- Deterministic selection, reproducibility and meaningful pattern diversity.
- Shard/payload/memory budgets and static-host base paths.
- Whether optional third-party oracle tools or benchmark fixtures can actually be redistributed under their own licenses.

If rights or supply cannot meet the gate, investigate verified alternatives and report the concrete failure. Do not quietly downgrade to a tiny demonstration bank or use commercially scraped/Kaggle data with unverified origin.

## 4. Reproducible import and certification pipeline

Own this pipeline under `tools/catalog/`; raw downloads and logs are ignored. Tracked production output includes only certified derived records, manifests, provenance/notices and compact certification summaries. No app startup fetches GitHub or a third-party catalog API.

### Pass A: source capture and parse

1. Fetch pinned immutable URLs and preserve exact bytes/license. Record revision, Git blob, source size and independently calculated SHA-256. Re-download hash mismatch is a hard failure.
2. Parse the documented fields and line endings strictly. Report source row IDs and reasons for malformed lines; never ignore unexpected characters to make 81 digits.
3. Store ratings as integer tenths after strict decimal parsing. Do not round an arbitrary float across a tier boundary.
4. Validate clues, givens count, valid ranges and source ID structure. Reject an already fully filled board as a playable catalog puzzle even if it is a valid solution.

### Pass B: independent exact oracles

For every candidate that can enter the shipped corpus:

- Oracle A: MRV/bitmask exact backtracking.
- Oracle B: independently implemented Algorithm X/exact cover with 729 possible assignments and 324 constraints.
- Do not share topology construction, candidate-mask routines, mutable state or acceptance predicates between the oracles. Agreement by two wrappers around the same implementation is not independent.
- Both must find exactly one solution, with a count capped at two, and agree on the solved grid. Independently validate all 27 units and all original clues.
- Invalid, unsatisfiable, ambiguous, aborted, timed-out or disagreeing records are quarantined. The report cannot treat unknown as unique.

An optional separately licensed native development oracle such as Tdoku can strengthen adversarial sampling. It is not required browser WASM or a reason to install new system tooling silently. Code/data licensing must be checked separately.

### Pass C: identities, deduplication and selection

Use a stable content identity such as SHA-256 of a versioned classic-9x9 namespace plus the strict givens string. Keep the upstream short ID separately; do not use row number or manifest ordering as puzzle identity.

At minimum remove exact duplicates and duplicate representatives under digit relabeling plus the eight dihedral rotations/reflections. A versioned canonical key can take the lexicographic minimum over those transforms after first-occurrence digit normalization. Independently test normalization, all eight transforms and idempotence. These equivalences do not cover all valid row/column/band/stack permutations; state that limitation. Do not call 100,000 records 100,000 fully inequivalent Sudoku structures without a correct, independently tested full equivalence procedure.

Do not count generated transformations toward the release quota. Avoid runtime transformations initially because they add identity/freshness and rating-path complications. If later adopted, transform givens and solution together, preserve a common base identity, prove unit preservation and revalidate the result.

Exact duplicate givens with inconsistent source ratings/provenance require quarantine/investigation rather than an average or the most convenient label. Equivalent D4/digit-relabel records can have different traversal-dependent ratings; select one deterministic representative and retain that representative's original metadata. Do not present a merged invented rating as upstream evidence.

Use a fixed selection seed/configuration and deterministic stable sort. Ensure quotas and every intended rating interval pass after deduplication. Record duplicate scope, rejection counts, rating/givens histograms, solution-grid diversity measures and selected IDs/hashes. Clue-count distributions are descriptive, not difficulty grading.

### Pass D: emitted data and independent recheck

Emit versioned policy/manifest/shards and a compact certificate. The certificate includes importer/oracle versions, source hashes, accepted counts, interval coverage, deduplication policy, shard hashes, run commands, test seeds and failure totals.

Then validate **every emitted record** from actual serialized files through both oracles and independent constraints again. Independently join each serialized record back to the pinned source bytes with a separate straightforward parser: givens, upstream ID, original rating and file/revision association must match. A valid unique puzzle/solution with its neighbor's copied rating would pass both solvers but must fail this provenance gate. Recompute its content/equivalence identities too. Run a clean deterministic rebuild and compare manifests/shards byte for byte. Sampling is not a substitute for the complete finite-corpus gate.

Certification can be resumable by immutable input/configuration hashes, but partial results must never be labeled a complete accepted catalog. A changed oracle/importer/policy invalidates the appropriate certificate and requires rechecking affected artifacts. Keep the raw detailed reports ignored; track the exact summary/hashes and reproducible tools.

Define canonical serialized JSON bytes explicitly: UTF-8 without BOM, deterministic field/order/number encoding and LF endings. Preserve original source/license bytes separately. Narrow repository attributes must prevent Git checkout conversion of exact hashed artifacts and original notices, for example `-text` for those outputs/notices; canonical JSON may alternatively use `text eol=lf`. Do not change global Git configuration or normalize upstream license bytes. Preserve exact selection/policy/source-lock input bytes or hash a specified canonical parsed representation, so input hashes also survive checkout consistently. Content-addressed files must not contain current wall-clock timestamps; put execution timestamps in separate reports. The [official Git attributes documentation](https://git-scm.com/docs/gitattributes#_checking_out_and_checking_in) explains why unspecified text behavior depends on `core.autocrlf`. Verify effective attributes and clean checkouts with `core.autocrlf=true` and `false`, rebuilding and serving production files, and compare actual served bytes against manifest/certificate hashes. A second import in one worktree misses checkout-time rewriting.

## 5. Progressive data layout and loader

Suggested arrangement:

```text
data/catalog/source-lock.json
data/catalog/selection.v1.json
data/techniques.v1.json
public/catalog/v1/manifest.json
public/catalog/v1/<content-hash>.json
public/catalog/v1/LICENSE.txt
public/catalog/v1/PROVENANCE.json
tools/catalog/{import,verify,oracle-exact-cover,...}.ts
src/lib/catalog/{types,decode,load,select,...}.ts
```

Names can change before contracts freeze; responsibilities cannot blur. The manifest carries shard descriptors, interval counts/ranges, content hashes, schema/catalog/certification versions and base-path-relative paths. It must not carry every full record or all 100,000 IDs in a startup array.

A compact record can contain `id`, a versioned equivalence-group freshness key, `sourceId`, `givens`, `solution`, `ratingTenths`; its tier is established by the shard and verified by the decoder. Preserve source/grading/version metadata through the manifest and copy the required snapshot into a new attempt. Document the tuple decoder if tuples replace object keys.

Initial budgets are about 256 records per shard, at most 96 KiB decoded and 32 KiB gzip, top manifest at most 128 KiB. A five-field compact record starts around 255 bytes; adding a separate 64-character freshness-group hash brings a planning estimate near 320 bytes, or about 32 MB uncompressed for 100k records. These are arithmetic estimates, not measured output. Measure actual serialized/gzip/Brotli sizes and parsed memory. Shrink shards or add a small lazy secondary index if necessary; never hide excess data in a huge eagerly fetched index. Compression by a development server is not proof of production-host transfer behavior.

Resolve URLs under the configured Vite application base. No origin-root `/catalog/...` assumptions or host SPA rewrites. Test root and `/toadoku/`, deep links and asset version changes. Public files are copied without Vite rewriting, so the loader owns this resolution explicitly; see [Vite assets](https://vite.dev/guide/assets.html).

### Loader invariants

- Fetch only the manifest and the required shard at startup/new-game selection. One foreground request and at most one bounded prefetch; coalesce identical requests.
- Check HTTP success, actual streamed/decoded byte limits, JSON/schema/record count, permitted path origin/base, rating intervals and content hash before acceptance. A Content-Length header alone is not a size bound.
- Return typed loading/unavailable/corrupt/aborted/exhausted results. Network failure is not exhaustion and is not permission to change difficulty.
- Use request/allocation IDs and attempt revision to ignore stale responses. Shared-request cancellation needs reference-aware handling so one canceled consumer does not break another.
- Keep a small decoded LRU, initially three shards, and a separate bounded persistent verified cache. Bound prefetch and retry work; do not loop forever over a bad tier.
- Validate a selected record's givens/solution/identity before showing it. The static certificate and hash are integrity evidence, not a reason to accept an invalid runtime shape.
- Preserve the old attempt until verified replacement data and its durable allocation transaction succeed. No blanking a good board before a failing fetch.
- Store the full active definition, not only its catalog URL, so updates/cache loss do not destroy resume.

See [Fetch handling](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch), [SubtleCrypto digest](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest) and [worker messages](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage). Hashes do not make public client solutions secret or local score records tamper-proof.

## 6. Selection, freshness and finite supply

Use a versioned, deterministic shuffle/permutation policy with injectable seeded randomness. Avoid modulo-biased integer selection, unseeded `Math.random()` inside reducers and indices tied to current source ordering. The selected record's stable content ID remains authoritative.

The five disjoint scheduled rating intervals are the shared freshness/reservation domains. Quick Play Medium chooses between its two eligible internal pools, and Hard between its two, using an explicit policy weighted by remaining never-issued eligible supply. It then uses the same pool authority/cursor/reservations as Progression and replay. Do not give the broader Quick Play label a separate history that treats a Progression-used puzzle as unseen. After eligible unseen supply is exhausted, use the documented repeat epoch; a scheduled Progression tier may not silently draw from another tier.

The source manifest can identify ordinal ranges/counts without exposing every record at startup. A per-pool numeric permutation/seed/cursor is small compared with the catalog; its implementation must be memory/time bounded and tested as a bijection. A more elaborate random-access permutation is not justified unless measured simpler arrays fail budgets. Do not make progressive loading require an enormous eagerly parsed ID index.

Reserve/mark used when a new attempt is durably allocated, before revealing it, not only on completion. Share freshness across Quick Play, frontier and replay, preserve it across Metamorphosis, and avoid allocating the same record to simultaneous active roles when alternatives exist. Allocation, cursor/history update and attempt snapshot must form one durable logical operation. Fetch/verification precedes that transaction.

Prefer never-issued eligible records while available. On a genuinely exhausted pool, start a new shuffle epoch and avoid the immediately previous puzzle where at least two eligible records exist. Keep lifetime history as history rather than pretending a reshuffle makes a previously seen puzzle new. One-record pools terminate/repeat predictably; rejected/corrupt rows do not cause an infinite retry loop.

Track lifetime-unseen availability separately from a restarted shuffle epoch. If Progression exhausted lower Medium but upper Medium still has unseen records, Quick Play Medium must prefer those unseen upper-pool records. Resetting the lower pool's epoch cursor must not make old puzzles appear lifetime-unseen or steal that preference.

Catalog updates require a versioned selection/history migration. Stable IDs allow old use history to remain meaningful; ordinal cursors alone do not. Preserve active snapshots and the old run's schedule/policy. Evaluate update/history lookup costs and interrupted-migration recovery before choosing the final indexing design. Do not silently reset freshness or fetch the entire new bank at startup.

Freeze the initial catalog's ordinal domains. Prefer compatible updates that append immutable shard/ordinal ranges and retire invalid records explicitly rather than reshuffling every existing ordinal. Keep lifetime issued stable IDs as the cross-version authority. An incompatible reindex requires a staged, resumable migration/index lookup with bounded work quanta and visible loading/retry, not random rejection near exhaustion or a huge startup ID list. The specialist must benchmark near-exhausted selection and prove its traversal terminates without accidental repeats. A deterministic scan can be resumable; no unbounded loop, unbounded network fan-out or falsely complete migration is accepted.

Preserve the versioned equivalence-group freshness identity as well as the concrete givens ID. Compatible imports retain the chosen representative; incompatible imports need tested old/new representative aliases or an equivalent group-key migration. Otherwise selecting a rotated/renamed representative on update would falsely make a previously issued group unseen. This key covers only the documented D4/digit equivalences, not full Sudoku equivalence.

## 7. Sound deduction patterns and hints

Default required logical modules: naked single, hidden single, pointing, claiming, naked pair, hidden pair, naked triple, hidden triple and basic X-Wing. The [HoDoKu technique index](https://hodoku.sourceforge.net/en/techniques.php) is a primary taxonomy reference. Research each pattern's precise premises and exclusions; do not implement a visual resemblance heuristic.

Do not promise these modules can solve every accepted Hard puzzle. Additional techniques may be added only after the same proof/fixture gates; otherwise provide a clearly labeled reveal fallback. Never fabricate an explanation for a solver-filled answer or pretend a reveal teaches a technique.

Each deduction should identify a stable technique/version, source session revision, premises/units/cells/digits, exact placements/eliminations, explanation key/parameters and assistance classification. No English strings, storage writes or UI mutations belong in the pattern detector.

Authoritative logical candidate state derives from current values and any previously sound logical eliminations with a verifiable trace. User notes, including missing/wrong notes, are never premises. If detector input contains previously eliminated candidates, the proof/test must establish why those eliminations are sound; arbitrary candidate masks can manufacture false patterns.

Derived elimination traces/caches are tied to their exact value-state and premises. The simple v1 policy is to invalidate and rebuild nontrivial logical candidate state after any value edit, overwrite, erase, undo or Restart. Invalidating only pending hints is insufficient: an elimination proved using an entry can become unsound when that entry is undone, then create a false single. Manual notes and monotone knowledge history remain independent and are not wiped as a substitute.

### Mandatory anti-vacuity and stale-state rules

Before proving a deduction using an exact oracle, the original logical state must have at least one solution. An unsatisfiable state makes every candidate appear impossible, so zero-solution tests alone are invalid evidence for sound elimination.

For an elimination, show that the original state is satisfiable and forcing the eliminated candidate leaves zero solutions. For a placement, exclude all competing digits while retaining a solution with the claimed digit. Check complete proposed deductions, not just one convenient conclusion. Use the structurally independent oracle.

**A correct conclusion is not proof of the named technique.** On a unique puzzle any correct answer could be falsely labeled X-Wing and still pass the exact-solver check. Require a separately reviewed technique-witness validator for the actual declared premises: units, cell sets, candidate restrictions and permitted conclusions for that precise pattern. Validate explanation parameters against that witness. Include negative cases whose answer is globally correct but whose claimed pattern is absent. This is a separate gate from candidate soundness and anti-vacuity. Research the author's [basic fish](https://hodoku.sourceforge.net/en/tech_fishb.php), [naked subsets](https://hodoku.sourceforge.net/en/tech_naked.php) and [hidden subsets](https://hodoku.sourceforge.net/en/tech_hidden.php) definitions; do not copy their diagrams/prose without meeting the specific license.

A player can enter a wrong value that creates no direct conflict. The hint policy must not present deductions based on a contradictory board as unquestionable truth. On an explicit Hint request, detect inconsistency and explain the issue or offer an explicitly classified correctness/reveal action. Do not silently enable hidden solution-based errors while ordinary entry feedback is disabled.

Compute against a frozen logical premise revision outside storage transactions/expensive UI rendering. A changed value, authoritative elimination, undo affecting those premises, Restart, role, catalog or attempt makes the pending hint stale. Discard/recompute it; never apply old conclusions to a new board. Timer-only persistence revisions and manual notes are not solver premises: rebase valid proofs onto current compatible storage state instead of causing perpetual hint cancellation. Commit any information-assistance record before exposing the result, as required by the state specification.

### Pattern data and tests

Store technique metadata and validly sourced/original fixtures in files. Each module needs positive examples, near-miss negative examples, degenerate cases, row/column/box orientation coverage and duplicate/unsatisfiable input handling. A naked triple is not necessarily three identical candidate masks; a basic X-Wing is not a finned/degenerate fish. Require a real elimination or placement before claiming a useful hint.

Use transformations as metamorphic tests, not as catalog novelty: digit permutations, rotations/reflections and valid row/column transformations must preserve a deduction's mapped validity. Test false user notes, stale revisions, no useful deduction, full board, wrong nonconflicting entries and delayed worker responses.

Every explanation must correspond to the actual proof data and be localizable in English/German/Spanish. No arbitrary HTML or executable expressions in technique data. Knowledge is disclosed when an answer appears in text, not only when an Apply button is pressed.

## 8. Independent acceptance and evidence

The rules/catalog/hints workers cannot accept their own output. The lead and an independent reviewer inspect actual algorithms and emitted artifacts, challenge source licenses and proof assumptions, reproduce minimized failures and run the full certification. Pure tests, data certificates and browser flows are complementary.

Required tracked deliverables include the importer/validators, independent exact-cover oracle, strict runtime decoders, versioned manifests/policies/notices, technique fixtures, invariant-to-test map and concise catalog certificate. Ignored evidence includes full audit logs, histograms, performance traces, sample screenshots and reproducible failed source-row lists.

The final report must state the accepted count, actual per-band/tier counts, deduplication equivalences, source revision/hashes, source-grader uncertainty, exact certificate/tool versions and actual payload measurements. It must not present this preparation document's metadata-derived source counts as completed implementation results.
