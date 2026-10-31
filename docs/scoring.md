# Score and earned currency

## Requested scope

Both Quick Play and Progression award a performance score and persistent currency. Rewards reflect rated difficulty, speed and efficiency. Completed-level revisits use the same reward rules for equivalent fresh puzzles. A future store is out of scope; do not implement spending, purchases, upgrades or additional currencies.

The approved currency name is **Dewdrops**. Its name does not imply another collectible or a second currency.

The following scoring policy is a recommendation, not an approved formula or numerical balance.

## Recommended calculation

Compute one completion score, then convert it to currency at a fixed published rate. Avoid two independently balanced reward formulas.

**Score = difficulty-band base × unassisted share × (1 + capped speed bonus).**

- Use calibrated reward bands derived from puzzle ratings. Do not multiply currency directly by raw catalog ratings as if those were a linear measure of effort.
- The unassisted share is the fraction of originally empty cells whose answers were not revealed by the game. This is a transparent proxy for independence, not a measurement of mental effort or optimal reasoning.
- Revealing all answers earns zero. Record revealed cells for the entire attempt; erase, undo, restart and reload do not erase that history.
- Proposed simplest safeguard: answer-revealing assistance disables that attempt's speed bonus. Independently filled cells still earn proportional completion credit. This policy needs discussion before implementation.
- Notes, undo, erasing, ordinary duplicate highlighting and interface help do not reduce credit. Never define efficiency as fewest taps, fewest notes or an invented optimal-move count.
- Solution checks and future logical hints can reveal information too. Define their behavior and scoring treatment before offering them; do not quietly score mistakes while feedback is disabled.

Difficulty-based completion credit should dominate. Cap the speed bonus so careful independent play still earns its base credit. Use per-band time targets calibrated through representative play, rather than copying another game's times or using manipulable personal baselines. Thinking time counts as play.

## Timing and completion

- Measure active foreground time. Pause when backgrounded or explicitly paused. If a menu pauses scoring time, conceal the board and notes until play resumes.
- Reward only a valid completed puzzle. Do not award points per entry, guess, correction, undo or check.
- Give each attempt a stable ID and record the reward once with its completion. Reload, retries and repeated completion events must not pay twice. Preserve elapsed time and assistance history when restarting the same scored attempt.
- Do not award a multiplier just for a higher repeat counter. Rewards depend on the actual puzzle and performance.

## Currency and effort history

Persist both spendable balance and lifetime earned total. They are two records of one currency, not two currencies. Future spending must not erase the player's record of earned effort. The balance, lifetime total, puzzle-use history and settings survive automatic progression resets.

Use the same conversion policy in both modes and in fresh revisits. Currency is a device-local game record, with no real-money value, cloud verification or leaderboard guarantee in scope.

## Risks and open decisions

Easy puzzles can earn more per minute even when harder puzzles earn more per completion. Evaluate representative rewards per minute and across accessibility needs before fixing values; avoid adding farming limits or daily caps without evidence. A finite bank eventually repeats puzzles.

Currency is a record of rewarded play, not an objective measurement of effort. No single time target fairly measures every player's skill, reasoning or input needs. Keep progression independent of the score so slow solving does not block advancement.

Still open: difficulty reward bands, speed target times and caps, conversion rate and rounding, assistance policy, starting counter convention, and reward presentation. Show score details on completion or in secondary views, preserving the minimal gameplay surface.

## Research precedent

Arkadium documents Sudoku rewards combining difficulty, a bounded time bonus, and the share completed without reveals. This supports the feasibility of the structure, not its numerical suitability for Toadodu. [Official scoring explanation](https://support.arkadium.com/support/solutions/articles/44002181769--sudoku-how-to-play-menu-tips-scoring).
