# Gameplay invariant to evidence map

QA001 independent review record. Activated 2026-10-31. A listed test is evidence of its executed cases, not certification of every possible board or browser state. Final phase acceptance is owned by the lead in `gameplay-acceptance.md`.

## Owners and trust boundaries

Rowan owns this map and independent adversarial tests. Cora owns the independently constructed Algorithm X oracle, catalog and modes/rewards. Sage owns native storage tests. The lead owns shared contracts, integration, Codex browser and final acceptance. Rowan's rules/session/hints code requires reciprocal actual-source review by the lead and Cora; Rowan cannot accept those algorithms alone.

| Invariant | Current executable evidence | State |
| --- | --- | --- |
| R01-R07 strict board, exact peers, candidates, all conflicts and immutable clues | `tests/sudoku/rules.test.ts`, `solver.test.ts`; original algebraic fixtures, all cells, malformed arrays and bit boundaries | Targeted tests passed; complete coverage/mutation gates pending |
| R08 independent exact algorithms | `tests/sudoku/differential.test.ts`; 1,000 original subsets/corruptions, multiplicity and unique solution comparison against Algorithm X | Targeted tests passed; full corpus certification separately owned by Cora |
| H01-H05 named premises, anti-vacuity, conclusions and degenerate cases | `tests/hints/proofs.test.ts`; 21 original value-state fixtures, 168 D4/digit transformed proof states, independent Algorithm X satisfiability and forced conclusions, forged labels, expanded candidate premises | Targeted tests passed; independent source review pending |
| H06 no stale elimination cache | `src/lib/hints/` recomputes from values and stores no authoritative elimination cache; notes are absent from the proof API | Actual design reviewed by lead; integrated stale worker/disclosure tests pending |
| H08-H12 durable disclosure, delayed hints and identity | Sage native transaction cases and lead worker/controller integration | Pending integrated evidence |
| S01-S06 notes, compound undo, monotone time/knowledge, frozen completion | `tests/session/reducer.test.ts`, `model.test.ts`; 2,000 seeds of 250 commands, independent full-before snapshot model, 511/512/513 limits, frozen input and corrupt patches | 500,000 command comparison passed; complete coverage/mutation pending |
| S09/S16 scoped keyboard, modifiers, composition and repeats | `tests/session/clock-input.test.ts`; pure key mapping with explicit modal/editable ownership | Targeted tests passed; actual keyboard/touch/browser focus pending |
| S10-S14 independent active-play clock | `tests/session/clock-input.test.ts`; injected monotonic segments, fractional retention, concealed gaps, long tasks, overflow | Pure checks passed; actual lifecycle, BFCache and sleep platform evidence pending |
| M01-M14 mode identity, schedule, reward and grant boundaries | `tests/modes/progression.test.ts`, `tests/rewards/score.test.ts`, `tests/adversarial/pure.test.ts`; explicit examples and BigInt arithmetic expectations | M002 uses only Dewdrops, reward version 2; revised mutation review pending |
| D01-D07 full certified source, provenance, duplicate scope and bytes | Cora's importer, independent serialized verifier and source join; local certificate/logs | Cora evidence and lead acceptance pending |
| D08-D12 shared freshness and bounded exhaustion | `tests/catalog/select.test.ts`; unseen weighting and exhaustive small exclusion domains | Source inspected; update/history and real allocation races pending |
| P01-P22 durable atomicity, ownership, restore and failure | `tests/storage/native.spec.ts` in Chromium/Firefox/WebKit; strict decoders, backup and receipt checks | Sage native results and independent review pending |
| P05 bounded save queue | `tests/gameplay/controller.test.ts`; delayed and reentrant acknowledgements, coalescing, failure/retry and command high-water | Actual source independently reviewed; integrated journeys pending |
| Cross-module deferred operations | `tests/adversarial/controller.integration.test.ts`; 10 deferred-port cases for time carry, delayed proof rebasing, stale requests, explicit reveal, disclosure recovery, authority loss, preference races, role flush and canceled allocation | Passed; ports are not native IndexedDB evidence |
| Nested single-pane browser history | `tests/gameplay/navigation.test.ts` and legacy navigation tests; document-unique pane IDs, consumed ancestry, delayed dismissal, skip Back and Forward | Nine tests passed; lead actual-source/browser review pending |
| Layout and accessibility | Existing UI regression, both-shape geometry and lead Codex browser | Geometry inspected; new tools/notes/settings/results and 200% fit pending |

## Reproducible pure verification

- `npm test -- tests/sudoku tests/session tests/hints` ran 29 tests in seven files successfully after the reviewed session and witness fixes. The 500,000-command model uses seeds 1 through 2,000.
- `node tests/hints/generate-fixtures.mjs` regenerates original algebraic-grid subset fixtures from seed `0x2101`. They are testing data, never catalog novelty.
- `node tests/hints/generate-fallback.mjs` finds a later-stage unsupported hint state after independently checked single placements. The resulting fixture retains pinned Sudoku Exchange source identity, original givens, solution and each derived placement. Its public-domain dedication is retained with the catalog.
- QA001 coverage uses `tests/adversarial/vitest.coverage.config.ts`, pinned Vitest V8 support and per-file 100% statement/branch/function/line thresholds. Coverage has not yet been accepted.
- QA001 mutation uses `tests/adversarial/stryker.config.mjs`, pinned Stryker core/Vitest runner and local ignored reports. No mutation run is accepted yet. Every meaningful survivor must be killed; an equivalent or unreachable case needs a specific invariant argument and independent lead review.

The first coverage run passed 99 tests but correctly failed its 100% gate at 91.07% statements and 90.10% branches. Independent malformed-state tests increased the later run to 98.11% statements, 96.84% branches and 99.39% lines, with 109 tests passing. This still fails the gate. A separate run timed out the unrelated visual scene sweep under combined coverage/certification load. QA001-F2 scopes this coverage command to critical gameplay test directories; the full ordinary UI/scene suite remains a separate required command with its original deadline.

The initial pre-M002 reward mutation smoke run tested 168 mutants: 134 killed, 32 survived and two lacked coverage. Its breaking threshold correctly failed. M002's revised one-currency policy invalidates that old report; it is preserved locally as historical evidence, not accepted mutation certification. A subsequent rule-kernel mutation job includes static topology mutants; the tool's suggestion to ignore static mutants was not adopted.

Native transaction guards require actual browser transactions, not a fake IDB or the Vitest runner's unsupported browser mode. Coverage and mutation results complement full corpus, state-model and browser evidence. Physical Motorola, native assistive technology, universal human difficulty and unconditional browser storage retention are not claimed.
