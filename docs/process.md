# Discussion and prototyping

1. Report the existing research briefly, with visual references and clear tradeoffs.
2. Discuss one topic at a time: visual direction, themes, technology, then modes and feature access. Change the order when requested.
3. Use ImageGen for clearly marked temporary main-menu and gameplay mockups. Refine new directions before interface experiments. Final art must be human-made; asset sourcing is currently deferred in favor of one rough replaceable composite placeholder.
4. Record decisions in [decisions.md](decisions.md). Treat recommendations as proposals until agreed.
5. Build only the agreed scope. Keep experiments under ignored `/prototypes/`; discuss before promoting any experiment's code to tracked production source. AI-generated artwork must never be promoted into production assets.

Keep conversation extremely concise. Prefer a picture and a short comparison to long explanations. Do not treat a successful prototype or test as approval of its design or stack.

Next authorized work is a visual prototype only: menu/game navigation, static digits, pad selection and dynamic Pond backgrounds. Most controls remain inert/disabled. Do not implement the eventual Sudoku engine, modes, economy, saves or PWA delivery. Follow the bounded scope at the top of [design handoff](design-handoff.md).

Build that prototype fresh in a new ignored directory. Existing prototypes supply visual references only, not reusable starting code. Delegate pond-motion research and implementation to a sub-agent, review its concise comparison first, and assign separate file ownership for background versus screens/integration.

Commit durable documentation and guidance with Conventional Commits. Exclude prototype code, dependencies, builds, test outputs, deployment experiments, and temporary mockups.

For a new or compacted chat, read [design handoff](design-handoff.md) first. Selected inward/B references and all preserved alternatives are indexed in [design-artifacts.json](design-artifacts.json). Research records retain original proposals for context and do not override the latest decisions. New cutout and water-motion goals require future research/implementation/testing; recording them is not evidence that they work.
