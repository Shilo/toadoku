# Dewdrops and completion rewards

The user's later simplification supersedes the separate score/conversion proposal. Dewdrops are both the completion score and persistent currency. [Policy 2](../data/gameplay-policy.v2.json) pins the [implemented arithmetic](../src/lib/rewards/index.ts); Lead, Cora and Rowan reviewed it. The numerical targets remain design defaults, not calibrated human fairness. See [exact policy](gameplay-state-and-persistence.md#5-exact-score-and-dewdrops-policy) and [validation gates](gameplay-validation-matrix.md).

## Requested scope

Quick Play, Progression and fresh completed-Leap replays award Dewdrops using the same difficulty, independence and capped active-time policy. No spending, purchases, upgrades, store or additional currency is implemented.

The approved currency name is **Dewdrops**. Its name does not imply another collectible or a second currency.

Reward version 2 is implemented. Version 1's separate score/conversion is unsupported and recoverable, never silently repriced. Active attempts and receipts pin their policy.

## Calculation

Compute Dewdrops directly. Easy, Medium and Hard bases are 100, 200 and 400. Active-time targets are 10, 20 and 40 minutes.

**Dewdrops = difficulty base × independent share × (1 + capped time bonus), rounded down once.** The integer bonus is calculated in basis points first; the exact formula and boundary examples are in the state specification.

- Use the pinned difficulty-band bases above. Human calibration remains pending; raw catalog ratings are not a linear measure of effort.
- The unassisted share is the fraction of originally empty cells whose answers were not revealed by the game. This is a transparent proxy for independence, not a measurement of mental effort or optimal reasoning.
- Revealing all answers earns zero. Record revealed cells for the entire attempt; erase, undo, restart and reload do not erase that history.
- Every useful information hint disables that attempt's time bonus. A shown placement/reveal also reduces the independent share immediately upon disclosure. Repeatedly showing one cell counts once. Failed or canceled computations disclose nothing and do not charge help.
- Notes, undo, erasing, ordinary duplicate highlighting and interface help do not reduce credit. Never define efficiency as fewest taps, fewest notes or an invented optimal-move count.
- Logical elimination hints and explicit unsatisfiable-state diagnoses are information assistance. Ordinary entry never checks the hidden solution.

Difficulty-based completion credit dominates and the time bonus is capped so careful independent play retains its base credit. The pinned per-band time targets need representative human evaluation; no calibrated-fairness claim is made. Thinking time counts as play.

## Timing and completion

- Measure active foreground time. Pause when backgrounded or explicitly paused. If a menu pauses scoring time, conceal the board and notes until play resumes.
- A brief start status does not defer timing until the first entered digit. Start when the puzzle is revealed and interactive. More and ordinary solving tools keep active time running; Settings can pause only with the puzzle concealed. Completion information remains available until Continue rather than disappearing on a timer.
- Reward only a valid completed puzzle. Do not award points per entry, guess, correction, undo or check.
- Give each attempt a stable ID and record the reward once with its completion. Reload, retries and repeated completion events must not pay twice. Preserve elapsed time and assistance history when restarting the same scored attempt.
- Do not award a multiplier just for a higher repeat counter. Rewards depend on the actual puzzle and performance.

## Currency and effort history

Persist both spendable balance and lifetime earned total. They are two records of one currency, not two currencies. Future spending must not erase the player's record of earned effort. The balance, lifetime total, puzzle-use history and settings survive automatic progression resets.

Use the same direct policy in every role. Permanently unscored attempts always earn zero. Currency is a device-local game record, with no real-money value, cloud verification or leaderboard guarantee in scope.

## Risks and open decisions

Easy puzzles can earn more per minute even when harder puzzles earn more per completion. Evaluate representative rewards per minute and across accessibility needs before fixing values; avoid adding farming limits or daily caps without evidence. A finite bank eventually repeats puzzles.

Currency is a record of rewarded play, not an objective measurement of effort. No single time target fairly measures every player's skill, reasoning or input needs. Keep progression independent of the score so slow solving does not block advancement.

Pinned values, assistance, starting counters and rounding are implemented and independently tested. Human calibration remains open. Completion and Session show concise Dewdrops details while gameplay keeps its minimal surface. Wallet/lifetime additions reject unsafe-integer overflow. Completion, receipt, reward and frontier changes acknowledge only after one atomic transaction completes.

## Research precedent

Arkadium documents Sudoku rewards combining difficulty, a bounded time bonus, and the share completed without reveals. This supports the feasibility of the structure, not its numerical suitability for Toadodu. [Official scoring explanation](https://support.arkadium.com/support/solutions/articles/44002181769--sudoku-how-to-play-menu-tips-scoring).
