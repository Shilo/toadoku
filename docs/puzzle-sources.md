# Puzzle sources and catalog maintenance

Toadoku's version 1 catalog contains 100,000 puzzles imported from one dataset, the Sudoku Exchange Puzzle Bank. Toadoku derives and independently verifies their solutions; it does not create the catalog by transforming a small set of boards.

## Original source and rights

- Publisher: [Sudoku Exchange Puzzle Bank](https://sudokuexchange.com/puzzle-bank/).
- Repository: [grantm/sudoku-exchange-puzzle-bank](https://github.com/grantm/sudoku-exchange-puzzle-bank).
- Exact imported revision: [`d8c8ebaee0c08c412cfba96af1923dfa61c83317`](https://github.com/grantm/sudoku-exchange-puzzle-bank/tree/d8c8ebaee0c08c412cfba96af1923dfa61c83317). Rebuilds use this revision, not the moving default branch.
- Upstream explanation: [pinned README](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/README.md).
- Dataset rights: [pinned public-domain dedication, Unlicense](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/LICENSE.txt), also retained byte-for-byte as the shipped [license](../public/catalog/v1/LICENSE.txt).

The upstream README names [QQWing](https://github.com/stephenostermiller/qqwing) as its generator and [Sukaku Explainer](https://github.com/SudokuMonster/SukakuExplainer) as its grader. Exact generator/grader versions, seeds and generation commands are not supplied. We can reproduce Toadoku's import from the pinned dataset, but cannot claim to reproduce the upstream generation process exactly. Dataset rights do not license those tools' code; neither is a browser runtime dependency.

Each source row supplies a 12-character SHA-1-derived upstream ID, 81 givens digits with `0` for blanks, and a decimal difficulty rating. It does not supply a solution or a logical solving trace. Rows are fixed-width, 100 bytes including the LF line ending. Toadoku retains ratings as integer tenths; ratings describe the upstream grader, not universally calibrated human difficulty.

## Difficulty ratings and the three labels

Toadoku **preserves the source's numeric Sukaku Explainer rating**. It does not calculate a new human difficulty rating with its own exact solvers. The [publisher explains](https://sudokuexchange.com/puzzle-bank/) that the puzzle rating reflects the most advanced solving technique needed by the grader. Its category thresholds were a publisher choice, described as arbitrary, rather than a universal Sudoku standard.

The [grader's rating documentation](https://github.com/SudokuMonster/SukakuExplainer/wiki/Difficulty-ratings-in-Sudoku-Explainer-v1.2.1) describes technique base values with complexity and preceding-technique adjustments. Examples on that reference scale include a last value at 1.0, a hidden single in a box at 1.2, a naked pair at 3.0 and an X-Wing at 3.2. These explain the scale; they do not establish the unrecorded exact grader version used for this bank or provide a solving trace for each imported puzzle.

Our visible labels retain the upstream boundaries:

| Label | Source rating | Toadoku v1 treatment |
| --- | --- | --- |
| Easy | Below 1.5 | Included; current decoder accepts ratings from 1.0 |
| Medium | At least 1.5, below 2.5 | Included |
| Hard | At least 2.5, below 5.0 | Included |
| Diabolical | At least 5.0 | Excluded; never merged into Hard |

The [decision audit](research/gameplay-readiness-audit.md#4-material-challenge-and-resolution-record) records why the fourth label was omitted: preserve the established three-label menu and avoid expanding v1 into extreme difficulty and additional hint coverage. This is a product scope decision, not a claim that Diabolical puzzles are invalid. The [runtime mapping](../src/lib/catalog/types.ts) enforces the `<5.0` ceiling.

Progression uses five internal intervals within those three labels, as implemented in the [schedule policy](../data/gameplay-policy.v2.json) and [mode mapping](../src/lib/modes/index.ts):

| Internal pool | Source rating | Progression Leaps |
| --- | --- | --- |
| Easy | 1.0 to below 1.5 | 1-6 |
| Lower Medium | 1.5 to below 2.0 | 7-15 |
| Upper Medium | 2.0 to below 2.5 | 16-24 |
| Lower Hard | 2.5 to below 3.5 | 25-42 |
| Upper Hard | 3.5 to below 5.0 | 43-60 |

These subdivisions are Toadoku's schedule policy, not additional upstream categories. Puzzles are randomized within their eligible interval, so consecutive Leaps do not guarantee strictly increasing difficulty. Quick Play retains only Easy, Medium and Hard; Medium/Hard can draw from both corresponding internal pools.

To assess an existing puzzle, inspect its retained `ratingTenths`: `32` means a source rating of `3.2`, which maps to Hard. The [record field definition](../src/lib/catalog/types.ts) and [decoder](../src/lib/catalog/decode.ts) define the serialized format. Do not estimate difficulty from clue count, solution uniqueness, our solver's running time or the number of moves a player took. The dual-oracle certificate proves unique solutions and correct source associations; it does not independently certify the upstream human difficulty judgment or complete logical-hint coverage.

New puzzles without a trusted rating need a separately selected and version-pinned human-technique grader, with its configuration and output retained before assigning these labels. Existing source ratings can be preserved without regrading. Regrading with another version/system requires a separately versioned policy and fresh provenance; numeric scales may differ. Human playtesting is needed to calibrate how the labels feel. Our current schedule and reward time targets remain provisional and are not a difficulty measurement.

Deferred user proposal: if Diabolical is added, make it an optional **Quick Play-only** difficulty. If most casual players cannot reasonably finish these puzzles, they must never be required in Progression or as a condition of completing a Metamorphosis and restarting the cycle. The goal is to let casual players finish the progression loop while offering a separate harder challenge. This is a proposal for later research and challenge, not an accepted schedule change or a claim that the existing Hard ceiling is accessible to everyone.

The [deferred TODO](../TODO.md#design-and-gameplay-decisions) requires examining the range within the source's 5.0+ bucket, representative casual-player completion/abandonment and hint reliance. Reviewers must challenge the Quick Play-only placement, compare alternatives and record the evidence and accepted policy before implementation. A numeric label alone does not establish that most casual players can or cannot finish a puzzle. Current Progression remains unchanged and excludes Diabolical.

## Why only 100,000?

The [implementation handoff](gameplay-implementation-handoff.md#4-explicit-autonomous-v1-defaults) sets **at least 100,000** accepted puzzles as a release gate. The [source decision audit](research/gameplay-readiness-audit.md#3-default-direction-agreed-after-specialist-challenge) records the reason as a meaningful large supply, with 40,000 explicitly rejected as a release fallback. These were documented lead-selected defaults after specialist challenge, not a claim that the user chose exactly 100,000.

The [importer](../tools/catalog/import.ts) implements fixed quotas totaling exactly 100,000: 25,000 Easy, 25,000 Medium and 50,000 Hard. Medium and Hard are subdivided proportionally to the measured source supply. It stops accepting records when those quotas are reached. Thus 100,000 is the implemented release selection target, not the source's size or a limit imposed by Sudoku Exchange.

At the pinned revision, the three captured files contain:

| Source file | Parsed source puzzles | Selected puzzles |
| --- | ---: | ---: |
| [easy.txt](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/easy.txt) | 100,000 | 25,000 |
| [medium.txt](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/medium.txt) | 352,643 | 25,000 |
| [hard.txt](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/hard.txt) | 321,592 | 50,000 |
| Total captured | 774,235 | 100,000 |

The [implementation record](gameplay-progress.md#catalog-checkpoint-and-c003) confirms all 774,235 rows were considered for parsing/deduplication, with no exact or D4/digit-relabel duplicates found. The selected 100,000 were fully certified with zero rejected candidates. The unselected 674,235 were not all solver-certified and must not be described as failed puzzles.

The upstream bank also has `diabolical.txt`, with 119,681 rows according to the pinned file metadata recorded in the [source audit](research/gameplay-readiness-audit.md#2-researched-catalog-candidate). That gives 893,916 source rows overall. Diabolical puzzles were deliberately outside v1's rating `<5` and three-label Easy/Medium/Hard scope, so that file was not captured or certified.

The retained records establish the large-supply minimum and the exact quota implementation. They do not document a separate experiment proving 100,000 optimal, a technical ceiling preventing a larger catalog, or an explicit reason to stop at the minimum rather than ship every eligible puzzle. A smaller release bounds output and certification work, but that is an engineering inference, not a recorded historical justification. The certificate reports 32,441,127 uncompressed shard bytes for the selected corpus.

## What Git preserves

| Tracked location | Purpose |
| --- | --- |
| [Source lock](../data/catalog/source-lock.json) | Repository, revision, source byte sizes, Git blob IDs, SHA-256 hashes, license/README hashes and generator/grader provenance limits |
| [Selection record](../data/catalog/selection.v1.json) | Deterministic ordering, quotas, complete source rating histogram and deduplicated pool supply |
| [Capture tool](../tools/catalog/source.ts) | Pinned download URLs, source parsing and Git blob verification |
| [Importer](../tools/catalog/import.ts), [identity rules](../tools/catalog/identity.ts), [exact-cover oracle](../tools/catalog/oracle-exact-cover.ts), [verifier](../tools/catalog/verify.ts) | Reproducible selection, two independent solvers, identity checks and emitted-record source joins |
| [Catalog manifest](../public/catalog/v1/manifest.json), its adjacent shards, [provenance](../public/catalog/v1/PROVENANCE.json) and [license](../public/catalog/v1/LICENSE.txt) | All shipped puzzle givens, derived solutions, ratings, source associations and integrity metadata |
| [Certificate](../data/catalog/certificate.v1.json), [compiled trust registry](../src/lib/catalog/trust.v1.ts) and [acceptance record](gameplay-acceptance.md) | Complete-corpus certification, historical membership roots and recorded rebuild/checkout acceptance |

Raw downloads live in ignored `prototypes/gameplay-validation/raw/`: `easy.txt`, `medium.txt`, `hard.txt`, `README.md` and `LICENSE.txt`. They are **not stored in Git**. On 2026-11-01 all five local files were checked against the source lock and matched their SHA-256 hashes. This check did not rerun full puzzle certification.

A fresh clone can recover those files from the pinned revision through the capture tool while upstream remains available. For preservation independent of GitHub, retain a separate durable archive of these exact five files together with the tracked source lock. That archive has not been added by this documentation change. Preserve exact bytes, including original line endings; moving the upstream default branch or retaining only the website URL is insufficient.

## Rebuild and verify

From the repository root, use the Node version required by [package.json](../package.json) and the locked dependencies:

```powershell
npm ci
npm run catalog:capture
node tools/catalog/import.ts prototypes/gameplay-validation/rebuild-source-guide/v1
node tools/catalog/verify.ts public/catalog/v1 prototypes/gameplay-validation/rebuild-source-guide/v1
```

Use a fresh ignored rebuild directory. Capture reuses existing local raw files or downloads missing files from the pinned revision and checks source Git blobs/lengths. The verifier checks source SHA-256 hashes against the lock, independently joins every shipped record to its source ID/givens/rating/file, re-solves every record with both oracles, checks membership and compares rebuilt output bytes. Compare the capture result with the committed source lock, including README/license hashes, before accepting changes.

These commands perform substantial corpus work and write files. Capture writes the source lock; even a rebuild to an ignored directory writes the compiled trust registry; verification writes the tracked certificate and ignored reports. Review resulting diffs. `npm run catalog:build` instead writes directly to the shipped catalog and its selection/certificate files. These commands are maintenance operations, never application startup requirements.

## Adding or changing puzzles

1. Preserve v1 source locks, shipped records, IDs, pool ordinals and historical trust roots. Saved progress and offline proofs rely on these identities. Follow the [catalog evolution contract](gameplay-data-and-correctness.md#6-selection-freshness-and-finite-supply) and [state/persistence specification](gameplay-state-and-persistence.md).
2. For more puzzles from this source, start with the retained eligible pool supply rather than fabricating transformations. Record a new versioned selection policy and quotas. For another source or revision, retain its exact URLs, revision, license and byte hashes separately.
3. Evolve the currently v1-specific importer, verifier, types and runtime trust/version handling together. Changing quota constants alone is insufficient: tools enforce a 100,000 total and frozen v1 membership. Use compatible appended immutable ranges where supported, or implement the required explicit migration before changing existing indexing.
4. Run both independent solvers and the independent emitted-record source join for every added record; regenerate provenance/certificates, compare a deterministic rebuild and repeat affected clean-checkout/runtime gates before release. Duplicate filtering covers exact givens, digit relabeling and D4 rotations/reflections, not full Sudoku structural equivalence.

The [data/correctness specification](gameplay-data-and-correctness.md) defines the full pipeline and evolution requirements. This guide documents the accepted source and maintenance path; it does not change the catalog or authorize a new gameplay implementation phase.
