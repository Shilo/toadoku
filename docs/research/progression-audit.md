# Independent progression assessment

Research date: 2026-10-30. The randomized pre-rated catalog approach is now approved. The subsequent [cycle design](../progression.md) replaces this assessment's proposed permanent stay at the difficulty ceiling: the agreed loop returns to easiest and increments a cycle counter. Other unselected alternatives below remain research. Scope stays Quick Play plus one Progression mode with classic Sudoku.

## Recommendation

Use shuffled puzzles from a bundled, pre-rated catalog, selected through gradually harder difficulty bands. Keep a simple completion count and a supported difficulty ceiling. This is randomized progression with finite content, not a promise of unlimited unique puzzles or permanently increasing difficulty.

Separate three decisions: how difficulty is measured, how advancement works, and where puzzles come from. A finite catalog does not require fixed stages, a map, a story, or an endpoint in the interface.

## Alternatives challenged

| Approach | Strongest advantage | Strongest objection |
| --- | --- | --- |
| Fixed curated stages | Deliberate teaching, carefully reviewed transitions, a defined finish | Replaying identical stages reduces novelty; alternatives require more content |
| Live generation and grading | Autonomous fresh supply and control over original puzzles | Needs a reliable human-technique solver, generation filters, cancellation, phone benchmarks, and regression cases |
| Shuffled pre-rated catalog | Fresh ordering, fast predictable offline selection, reproducible puzzles, no runtime grader | Finite supply, external rating assumptions, validation and exhaustion handling |
| Small shuffled ladder | Cheap way to evaluate advancement | Repetition arrives quickly; unsuitable evidence for long-term replayability |

Fixed stages are preferable when authored teaching or a completion goal matters most. Live generation is preferable when autonomous supply or original generated content justifies the additional engineering. For the current minimal offline game, the catalog approach offers the strongest balance. This is an engineering and product judgment, not a universal ranking.

## Material findings

Sudoku Exchange publishes a public-domain bank of several hundred thousand generated puzzles, with per-puzzle Sukaku Explainer ratings and documented record format. The publisher explicitly calls its broad category boundaries arbitrary. A custom grader is therefore not a prerequisite for selecting imported rated puzzles. This candidate source has not been imported or approved. [Publisher methodology](https://sudokuexchange.com/puzzle-bank/), [dataset](https://github.com/grantm/sudoku-exchange-puzzle-bank), [license](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/master/LICENSE.txt).

Difficulty ratings are approximations, not guarantees of perceived challenge. HoDoKu documents that changing technique order can change a puzzle's rating. Promise increasing challenge across bands, not that every next puzzle feels harder. Independently check imported uniqueness and duplicates and sample neighboring bands through play. [HoDoKu solver documentation](https://hodoku.sourceforge.net/en/docs_solv.php).

Moving generation and grading to build time relocates the work; it does not eliminate it. Runtime generation is feasible in principle, but this project has no validated grader or device benchmark for it. The temporary clue-removal generator cannot substantiate progression difficulty.

## Challenges to spontaneous progression

- Fresh boards prevent exact memorization, but restarting at Easy will still feel easy to a skilled player. Starting from an unlocked band is a possible later choice, not an approved feature.
- Completing puzzles does not prove readiness for a new technique. An explicit hold at the current difficulty is a small possible safeguard; hidden adaptation based on time or hints is unnecessary.
- Endless difficulty growth eventually becomes unreasonable. Continue variety at a supported ceiling instead.
- Each band's supply can run out independently. Handle exhaustion explicitly; a new shuffle changes order but does not guarantee unseen puzzles across resets.
- Maintaining novelty requires played-puzzle history and sufficient content. Cosmetic digit permutations are not equivalent to new reasoning structures.

## Smallest credible implementation, if selected

1. Pin a catalog snapshot and provenance; import a bounded selection; validate uniqueness, duplicates and rating coverage. Sample difficulty transitions and measure the shipped payload before choosing catalog size.
2. Define a simple advancement schedule across verified bands, with a ceiling. Decide whether an explicit hold is needed before adding it.
3. Save stable puzzle IDs, catalog version, shuffled order/cursor, advancement state and the unchanged active board. Count completion once.
4. Avoid already-played puzzles where supply permits. On a band's exhaustion, disclose repetition or a bounded endpoint rather than silently claiming unlimited novelty. Decide cross-reset history and update behavior explicitly.
5. Verify offline availability, resume, reset, completion accounting, exhaustion and catalog updates. Test on the target phone before claiming device performance.

Do not implement these details until the progression choice is agreed. A candidate bank does not automatically provide logical hint explanations; that would be a separate capability.

## Conditions that reverse this recommendation

Choose curated stages if teaching and reviewed transitions become central. Choose original build-time or runtime generation if autonomous content supply becomes essential. Reassess the bank approach if provenance is unacceptable, difficulty transitions are poor, or realistic use exhausts a band too quickly.
