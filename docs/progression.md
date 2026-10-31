# Randomized progression and repeat runs

## Agreed behavior

Progression draws shuffled puzzles from a bundled, pre-rated collection. Difficulty rises across a defined sequence of levels. After the final level, the level returns to 1, a second counter increases, and the next puzzle uses the easiest difficulty. Quick Play remains separate.

Approved names: **Metamorphosis** for the repeat counter, **Leap** for a level, and **Dewdrops** for earned currency. Example: Metamorphosis 2, Leap 7, 240 Dewdrops. These are game metaphors, not an approved frog-transformation feature. Keep labels separate from progression logic; the initial repeat-counter numbering convention remains open. See [naming research](research/terminology.md).

| Event | Outcome |
| --- | --- |
| Complete an ordinary frontier level | Advance to the next level |
| Complete the final frontier level | Increment the repeat counter and return to Level 1, easiest difficulty |
| Resume or reload | Restore the active board, time, assistance history and counters |
| Revisit a completed level | Draw a fresh puzzle matching that level's difficulty |
| Begin another repeat | Preserve currency, lifetime earnings, settings and puzzle-use history |

Record valid completion and progression once. Keep the completed board visible until Continue; a new puzzle starts only when the player continues. Date, theme, language and catalog changes must not discard an unfinished board.

## Recommended replay policy

Selecting a completed level starts a fresh puzzle attempt, not the original board. Recommend keeping the furthest-progression marker separate from the selected replay level. A replay does not move the frontier backwards or trigger another reset by repeatedly completing an old final level.

Fresh replay attempts use the same score and currency rules as equivalent puzzles in Quick Play and normal progression. Completing replay puzzles rewards play without granting duplicate advancement.

Still open: whether level access survives automatic resets, how a replay is launched while another board is unfinished, and whether replay has a separate active-save slot. Decide the smallest useful behavior before implementation; do not silently overwrite an active puzzle or introduce a map.

## Recommended repeat behavior

- Repeat the same difficulty schedule on each pass. The repeat count does not raise the difficulty floor or ceiling.
- Loop automatically using the ordinary Continue action. A separate prestige button or power-up system is unnecessary.
- Keep loop length and difficulty breakpoints internal to the game, with actual values determined through sampling and playtesting.
- Persist score and currency in both modes. No store, spending, purchases or upgrades are in scope. See [scoring proposal](scoring.md).
- Counter and currency presentation must preserve the minimal gameplay surface; no top bar or additional action row is approved.

## Freshness and finite supply

Retain shuffled order/cursors or played-puzzle history across repeats and level revisits. Restarting the difficulty sequence must not restart catalog order. Choose unused puzzles within the required band while available.

If a band is exhausted, reshuffle that band, permitting repeats and avoiding the immediate previous puzzle where possible. Exhaustion does not reset progression or change difficulty. Finite content cannot guarantee permanently unseen puzzles. Preserve catalog version, stable puzzle IDs and active board data across updates.

## Challenges and boundaries

Returning to Easy may become tedious as skills improve. This loop offers variety and a recurring challenge arc, not uninterrupted skill advancement. Keep the easy section proportionate and test it before adding skips or extra systems.

Paid replays make reward balance important: easier puzzles can pay more per minute even when harder puzzles pay more per completion. Calibrate the scoring proposal before deciding amounts. Do not add farming restrictions, daily limits or prestige multipliers without discussion.

Clicker Heroes uses Ascension and Transcendence resets with lasting resources. Toadodu draws inspiration from reset terminology and persistent earned currency; no power bonuses or additional reset layers are approved. [Official developer interview](https://blog.clickerheroes.com/the-evolution-and-success-of-clicker-heroes-interview-with-playsaurus/).

## Open decisions

Repeat-counter starting convention, loop length and difficulty breakpoints, catalog selection, replay unlock scope and save behavior, scoring formula and numerical balance, and visual presentation. No game or interface code is authorized by this note.
