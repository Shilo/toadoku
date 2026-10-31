# Discussion and prototyping

1. Report the existing research briefly, with visual references and clear tradeoffs.
2. Discuss one topic at a time: visual direction, themes, technology, then modes and feature access. Change the order when requested.
3. Use ImageGen for clearly marked temporary main-menu and gameplay mockups. Refine new directions before interface experiments. Final art must be human-made; asset sourcing is currently deferred in favor of one rough replaceable composite placeholder.
4. Record decisions in [decisions.md](decisions.md). Treat recommendations as proposals until agreed.
5. Build only the agreed scope. Keep experiments under ignored `/prototypes/`; discuss before promoting any experiment's code to tracked production source. AI-generated artwork must never be promoted into production assets.

Keep conversation extremely concise. Prefer a picture and a short comparison to long explanations. Do not treat a successful prototype or test as approval of its design or stack.

Next authorized work is a visual prototype only: menu/game navigation, static digits, pad selection and dynamic Pond backgrounds. Most controls remain inert/disabled. Do not implement the eventual Sudoku engine, modes, economy, saves or PWA delivery. Follow the bounded scope at the top of [design handoff](design-handoff.md).

The fresh baseline is now in ignored `prototypes/pond-visual-v1/`; refining that current prototype is authorized. Older demos remain visual references only, not reusable starting code. Delegate bounded concept/background work to sub-agents with separate ownership from screens/integration. ImageGen precedes new UI experiments. Compare actual screenshots to its guidelines and record better, worse and reasonable intentional differences, while rejecting generated geometry/spacing errors.

Commit durable documentation and guidance with Conventional Commits. Exclude prototype code, dependencies, builds, test outputs, deployment experiments, and temporary mockups.

For a new or compacted chat, read [design handoff](design-handoff.md) first. Selected inward/B references and all preserved alternatives are indexed in [design-artifacts.json](design-artifacts.json). Research records retain original proposals for context and do not override the latest decisions. Latest authorized shore, varied-notched-pad, natural-selection, fixed-anchor and floating refinements supersede older stationary-circle guidance. Record implementation progress and measured limits in [prototype progress](prototype-progress.md); authorization/concepts alone are not evidence that a feature passes.
