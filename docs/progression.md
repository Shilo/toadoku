# Randomized progression and cycles

## Agreed approach

Progression selects shuffled puzzles from a bundled, pre-rated collection. Difficulty rises across a defined sequence of levels. After the final level, the next cycle starts at the easiest difficulty with another puzzle. Quick Play remains separate.

Use two counters: **Cycle** and **Level**. Both start at 1. A cycle is one complete pass through the difficulty schedule. A level is one puzzle's position within that cycle.

| Event | Outcome |
| --- | --- |
| Complete an ordinary level | Same cycle, next level |
| Complete the final level | Next cycle, Level 1, easiest difficulty |
| Resume or reload | Restore the same active puzzle and counters |
| Enter a new cycle | Keep puzzle-use history and settings |

Progress advances only after a valid completed puzzle and must be recorded exactly once. Persist the counter transition together so reload cannot duplicate or lose advancement. Keep the completed board visible until Continue; the new puzzle starts only when the player continues. Do not clear an unfinished puzzle because of a date, theme change, reload, or catalog update.

## Recommended minimal design

- Label the system **Cycles**. Exact visible counter placement waits for the interface discussion; do not add a gameplay header.
- Repeat the same difficulty schedule each cycle. Higher cycle numbers do not raise the difficulty floor or ceiling.
- Loop automatically after completion. Use the ordinary Continue action, without a separate prestige button or reset confirmation for normal advancement.
- Add no currencies, upgrades, power bonuses, reward economy, extra prestige layers, or special Sudoku rules.
- Preserve progress independently of theme, language and Quick Play's active save.
- Keep cycle length and difficulty breakpoints internal to the game. Their actual values require puzzle sampling and playtesting; no configuration screen is needed.

The two counters record repeated completed runs. They do not claim that Cycle 2 is harder than Cycle 1, or that every successive puzzle has a greater perceived difficulty.

## Freshness and finite supply

Retain shuffled order/cursors or played-puzzle history across cycles. A cycle reset must not replay the same catalog order from its beginning. Choose unused puzzles within the required difficulty band while available.

If one band is exhausted, reshuffle that band, allowing repeats and avoiding the immediately previous puzzle where possible. This does not reset counters or change difficulty. Finite content cannot guarantee permanently unseen puzzles. Retain catalog version and stable puzzle IDs, preserve active board data, and document update/exhaustion behavior before implementation.

## Challenge to this approach

Automatic return to Easy can become boring after skills improve. This loop offers variety and a repeating challenge arc, not uninterrupted skill advancement. Keep the easy opening proportionate and test it. If returning to Easy repeatedly causes abandonment, revisit automatic cycling before adding skips, unlocks, adaptive grading, or bonuses.

Optional prestige would preserve the choice to stay at a high difficulty, but adds another decision. Automatic looping is the simpler fit for the requested behavior. Raising difficulty every cycle would eventually reach the same ceiling and contradict the return to easiest, so it is not recommended.

## Research and terminology

Clicker Heroes uses Ascension and Transcendence resets that award persistent resources. Toadodu borrows only the repeating-run idea. With no lasting power or reward system, Cycle describes the proposed behavior more directly than Prestige or Reincarnation. This is a naming recommendation, not a claim that prestige always requires a specific reward. [Official Clicker Heroes developer interview](https://blog.clickerheroes.com/the-evolution-and-success-of-clicker-heroes-interview-with-playsaurus/).

The pre-rated catalog recommendation and tradeoffs remain in [the independent assessment](research/progression-audit.md). A candidate public-domain bank is documented there; no puzzle data has been imported.

## Open decisions

Exact cycle length, difficulty-band boundaries and time spent in each band; final counter wording and placement; catalog selection and size. These require discussion or evidence before implementation. No interface or game code is authorized by this design note.
