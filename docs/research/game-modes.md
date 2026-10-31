# Game modes and progression

Research date: 2026-10-30. This is a product recommendation, not a commitment to implement every mode.

## Recommendation

Keep **Quick Play** as the immediate, unrestricted way to choose a difficulty and start a fresh classic Sudoku. Add **Pond Journey** later as an optional, saved sequence of short chapters. Journey should gradually introduce harder reasoning, then settle into varied practice at a chosen challenge ceiling. It should never prevent spontaneous play.

Improve difficulty measurement before promising that each numbered level is harder. The existing engine targets 40 clues for Easy, 34 for Medium and 28 for Hard, with a unique-solution check after removal. These are clue-density settings, not human difficulty grades. A Hard puzzle can still be solved with singles; a different puzzle with more clues can demand harder deductions. Conceptis describes difficulty in terms of logical decisions, complexity and bottlenecks rather than clue count. [Conceptis difficulty explanation](https://www.conceptispuzzles.com/index.aspx?uri=info/article/2).

The observation that Hard feels manageable is useful feedback, but it does not establish how much harder successive generated boards actually are. The current generator does not rate those boards or increase difficulty after completion.

## What existing games demonstrate

| Structure | Publisher example | Useful lesson for Toadodu |
| --- | --- | --- |
| Choose difficulty and play | Easybrain describes six difficulty levels and familiar notes, hints and checks | A direct play option should remain available without unlocks |
| Daily puzzle and archive | Sudoku.com offers a date-based challenge calendar | Adds a recurring ritual without changing Sudoku rules |
| Learning campaign | Sudoku.coach separates Play, Campaign and technique Practice; its campaign introduces techniques progressively | A Journey can have an educational purpose instead of merely numbering random boards |
| Seasonal event | Easybrain offers themed events and collectible trophies; TheSudoku.com reveals artwork through completed puzzles | Visual milestones can create progression independently of increasing difficulty |
| Puzzle library or volume | Conceptis offers manually selected puzzles with progress previews | A small reviewed catalog is a credible starting point for authored stages |
| Unlimited play | SudokuW advertises unrestricted puzzles alongside its separate daily challenge | Endless availability does not require endless difficulty escalation |

Sources: [Easybrain Sudoku](https://easybrain.com/sudoku), [Sudoku.com calendar](https://sudoku.com/challenges), [Sudoku.coach modes](https://sudoku.coach/), [Sudoku.coach campaign](https://sudoku.coach/en/campaign), [TheSudoku.com events](https://thesudoku.com/events), [Conceptis mobile Sudoku](https://www.conceptispuzzles.com/index.aspx?uri=mobile/100004), [SudokuW daily and unlimited play](https://www.sudokuw.com/daily).

These are examples of published approaches, not evidence that one structure is universally best. Avoid copying an event's expiry pressure simply because its artwork progression is appealing.

**Modes and rule variants are different decisions.** Quick Play, Daily and Journey describe how puzzles are selected and progress is stored. Killer, Diagonal and Irregular Sudoku change constraints or regions. Killer, for example, adds sum cages to ordinary Sudoku constraints. There is no need to add variants to create a satisfying Journey. Keep classic 9 by 9 rules for the first version. [Puzzler Killer Sudoku rules](https://www.puzzler.com/media/puzzles/instructions/KillerSudoku.pdf), [Conceptis variations](https://www.conceptispuzzles.com/index.aspx?uri=mobile/100004).

## A restrained Pond Journey

Use a small chapter list or lily-pad path with one clear Continue action. Five puzzles per chapter is an initial design example, not a required fixed size. The pond can gain a flower, lantern or frog perch at a milestone. Seasonal themes restyle those rewards without resetting progress or replacing the frogs.

| Example band | Puzzle selection goal | Progression behavior |
| --- | --- | --- |
| First Lily Pads | Naked and hidden singles | Establish the controls and comfortable solving |
| Reed Walk | Singles plus locked candidates | Introduce one supported elimination technique |
| Lantern Pond | Pairs with familiar techniques | Alternate practice and a reviewed milestone puzzle |
| Moonlit Crossing | Broader subsets, then X-Wing if supported | Optional advanced chapters with explanatory hints |
| Open Pond | A chosen mastered band | Fresh boards and varied patterns at a stable ceiling |

These are proposed local bands, not a universal ordering or established difficulty scale. A grader must solve the entire puzzle using supported techniques and demonstrate that the target technique is needed under its chosen solving policy. Merely finding an opportunity for that technique is insufficient if simpler moves solve the puzzle first. Technique counts and bottlenecks can distinguish puzzles within a band, but cannot predict every person's experience.

Do not make each consecutive stage strictly harder. A sequence of practice, consolidation, a modest challenge and a calmer board gives room to learn. A finite set of supported techniques provides a useful ceiling; beyond it, additional stages should offer variety. Let the player choose a higher band, keep practicing, replay a stage or return to Quick Play. Show a timer only as optional information. Do not require speed, impose lives, or invalidate a completion because hints were used.

## Puzzle supply: curated stages with fresh practice

| Approach | Strength | Cost or limitation |
| --- | --- | --- |
| Reviewed static catalog | Stable stage identity, predictable quality, tiny runtime cost, works offline | Requires preparing and grading enough puzzles; finite content |
| Seeded runtime generation | Reproducible fresh boards without a server | Seed alone guarantees neither uniqueness nor difficulty; generation and grading can exceed a phone's time budget |
| Hybrid | Fixed reviewed milestones plus fresh practice filtered to a band | Slightly more bookkeeping, but preserves reliability and replay |

Start Journey with a small original catalog generated and graded at build time. Give every stage a stable ID and freeze its puzzle after release. Add seeded practice later if demand warrants it. Sudoku Slate documents a comparable separation: seeded generation, exact uniqueness checking, a separate human-technique solver and stable catalog IDs. Its published caveat is useful: the grader describes one supported solving path rather than a universal measure of human difficulty. [Sudoku Slate generation and grading](https://sudokuslate.com/methods).

For future generation, use a versioned seeded random source and record generator version, grader version, seed, puzzle ID and accepted board. Generate a completed grid, remove clues while retaining exactly one solution, grade with human techniques, and accept only puzzles in the requested band. Use a bounded worker operation with a reviewed catalog fallback. The current engine randomizes one valid solution pattern through Sudoku symmetries; a future generator can use randomized search for broader completed-grid variety. More variety alone does not establish better difficulty.

A fresh seed does not prove a fresh puzzle. Store a normalized exact-board fingerprint and retry collisions against local completed history. If perceptually equivalent puzzles become noticeable, add symmetry-aware duplicate filtering offline. Do not claim infinite never-repeated boards with finite local storage. Fixed Journey stages intentionally remain identical when revisited; a fresh attempt at the same band is labeled Practice and gets a different puzzle ID. Updates must preserve existing stage assignments rather than silently replacing an unfinished puzzle.

## Persistence, daily play and player control

Keep Quick Play's active save separate from Journey's active stage. Persist catalog version, completed stage IDs, current stage and board state, notes, elapsed time and hint usage. Completion should update progress once, after normal board validation. Local storage is sufficient for an initial static application, with schema validation and graceful recovery. It is device-local progress, not cloud synchronization.

A later Daily option can select from a bundled catalog using a documented date policy, so no backend is necessary. A UTC date gives the same puzzle globally; a local date feels natural to the device. Choose and label one policy. Save an active daily puzzle across midnight, and allow archive play. Keep daily selection and seasonal theme selection independent. A calendar, streaks and rewards add UI and persistence work, so defer Daily until the two main entry points prove useful.

Avoid hidden adaptive difficulty. Completion time can reflect interruptions, and hints can reflect curiosity or experimentation. If suggestions are added, offer explicit choices such as Stay here, Practice this technique, or Try the next band. Do not secretly change the board, lower a selected difficulty, or punish a player for taking longer.

## Small implementation sequence

1. **Now:** retain Quick Play, document clue-based labels honestly, and gather representative puzzle feedback. Do not add a level map that implies measured progression.
2. **Difficulty foundation:** implement a separate deterministic human-technique grader, tests with known technique cases, and explanatory hints. Begin with singles, locked candidates and pairs. Mark unsupported puzzles as ungraded rather than assigning a guessed advanced label.
3. **Small Journey:** ship a reviewed catalog with a few chapters, stable stage saves and cosmetic milestones. Include unrestricted Quick Play and voluntary practice at every stage.
4. **Only after use:** expand advanced techniques, fresh seeded practice, daily puzzles or seasonal collections. Evaluate the value of each feature before adding it.

The main tradeoff is content confidence versus nominal endlessness. A small Journey with honestly graded stages provides a clearer improvement path than a long counter over clue-count-generated boards.
