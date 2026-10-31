# Discussion and prototyping

## Next gameplay phase: autonomous researched/challenged execution

The latest task prepares documentation only. Once gameplay implementation is explicitly activated, follow the [complete gameplay handoff](gameplay-implementation-handoff.md) and its [mandatory loop](gameplay-implementation-handoff.md#6-mandatory-research-and-reciprocal-challenge-loop). Research and challenge **every plan before executing it**, including the lead's overall/architecture/dependency/integration plans, specialist plans, data/storage/balance/UI plans, test/acceptance plans and every proposed fix or material revision. A named subagent must challenge lead-authored plans. Record primary online sources, assumptions, alternatives, counterexamples, replies and agreed evidence gates. Routine execution within an accepted plan inherits its plan ID; new directions/revisions reenter the loop.

Assign exact files/interfaces/dependencies/acceptance and shared-workspace constraints to each specialist. The lead continues contracts/integration work while specialists research/implement. Review actual diffs and surrounding code, run independent tests and personally exercise Codex browser journeys. Specialists challenge the lead's diagnoses/fixes in return; resolve with evidence and repeat until accepted, using an independent reviewer when needed. Passing isolated tests or agent agreement alone never accepts a module. Commit accepted green slices periodically. Preserve the complete prototype, maintained Pond design, asset provenance and local skill policy.

Ordinary engineering and provisional policy choices are resolved autonomously within the brief. Historical one-decision-at-a-time user discussion/prototype-only guidance below does not require user polling or limit an activated gameplay phase. Do not claim tests prove every possible bug absent or convert unavailable external hardware evidence into a pass.

## Historical UI/prototype workflow

Production update, 2026-10-31: the explicitly activated UI phase is complete using the researched/challenged specialist workflow below. See [decision/revision and acceptance evidence](production-ui-progress.md). Future work must preserve the completed prototype and the current phase boundary; this does not authorize Sudoku or later systems.

Current phase: the prototype is complete. The [production UI handoff](production-ui-handoff.md) and project-local Svelte skills are preparation only; no production source is implemented in this task. When the user activates the next phase, build fresh maintained Svelte framework + TypeScript + Vite source, preserve the selected visual design and implement gameplay More navigation without Sudoku logic. Prototype workflow below remains historical/reference guidance for future visual experiments.

The receiving lead owns project management, core engineering, overall UI/UX and integration. Use an efficient bounded specialist team for theme/scene/leaf/motion responsibilities. Every specialist researches and challenges its task, then the lead challenges material proposals until agreement and critically reviews each resulting implementation. [The handoff's team workflow](production-ui-handoff.md#12-lead-orchestration-and-efficient-specialist-teamwork) defines ownership, decision/revision loops, evidence and integration acceptance. This is not permission to start implementation during the handoff-only task.

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
