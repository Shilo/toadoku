# Autonomous gameplay implementation handoff

Prepared 2026-10-31. This is the implementation brief for a subsequent agent, not an instruction to implement gameplay during its preparation. The current application is a maintained presentation/navigation shell with static example data. This task prepares researched documentation only.

## 1. Mission and authority

Implement the complete first classic Sudoku gameplay phase as the project lead, professional Sudoku game designer, senior engineer and accountable integration reviewer. Work autonomously through design decisions, bounded specialist implementation, adversarial testing, revisions and periodic commits. Do not stop after a plan, an engine demo, a small fake catalog, passing isolated tests or summaries from workers.

Correctness of puzzle data, rules, deduction patterns, sessions, mode transitions, persistence and rewards is the primary release condition. Preserve the selected Pond UI. Extend the maintained source; do not restart the prototype or copy an old experimental engine/save implementation.

The user's latest gameplay request governs the next activated phase. Historical statements saying gameplay is forbidden describe earlier tasks. Approved product requirements remain binding. Numerical/policy details explicitly marked as defaults below are implementation direction for autonomous ratification, not invented claims about prior approval or empirical calibration.

### Read first, in this order

1. [AGENTS](../AGENTS.md), this entire handoff and [readiness/source audit](research/gameplay-readiness-audit.md).
2. [Data, rules and pattern correctness](gameplay-data-and-correctness.md).
3. [Sessions, modes, rewards and persistent state](gameplay-state-and-persistence.md).
4. [Validation matrix and release gates](gameplay-validation-matrix.md).
5. [Progression](progression.md), [scoring](scoring.md), [menu](menu.md), [architecture](architecture.md), [decisions](decisions.md), [TODO](../TODO.md), [process](process.md).
6. [Production UI results](production-ui-progress.md), [design handoff](design-handoff.md), [UI/UX](ui-ux.md), [design](design.md), [themes](themes.md), [asset provenance](production-assets.md), [visual acceptance](future-visual-research.md).
7. [Local Svelte skill provenance](svelte-agent-skills.md), [lock](svelte-skills.lock.json), the project-local writing/best-practices skills and relevant bundled references for any Svelte work.

The readiness audit maps the relevant older research, its accepted findings and superseded proposals. Read those source details for the module being changed; do not use a historical recommendation to override this brief.

## 2. Starting point and non-negotiable boundaries

Baseline commits are `00ddd5f` for the production shell and `b0d500d` for the restored responsive sketch. Verify the actual checkout and preserve later user changes. Existing tests are regression evidence for the UI, not certification of gameplay.

| Existing area | Integration implication |
| --- | --- |
| `src/App.svelte` | Composition, fixture cells, native More dialog and focus wiring. Extract cohesive production board/menu/tool/result components as complexity grows; keep lead ownership of shared integration. |
| `src/lib/fixture.ts` | Static example only. Replace its production data usage with validated attempts. Preserve useful logical selection behavior; move example fixtures into tests/reference data. A load failure must never silently show a playable fake puzzle. |
| `src/lib/layout.ts` | Authoritative cells, board/dock and title/art rectangles. Implement required Fill space/Square through this same contract; do not maintain a second geometry calculation. |
| `src/lib/navigation.ts` | UI history only. Connect validated attempt identities; history.state/hash is not durable session authority. Preserve consumed-overlay behavior, Escape precedence, focus return and duplicate-click protection. |
| `src/lib/motion/clock.ts` | Decorative clock resets under reduced motion. It is unsuitable for scored gameplay elapsed time. |
| `src/lib/leaves/`, `src/lib/scene/` | Stable visual seeds and protected envelopes. Add real value/note/conflict states without altering rules, hitboxes or colors of logical groups. |
| `src/lib/i18n.ts`, `src/lib/theme/` | Extend typed copy and semantic roles. All visible/accessibility/error/help copy needs English, German and Spanish. |
| Current test tooling | Type checks, Vitest, Playwright and local Svelte autofixer exist. Playwright currently defaults to Chromium; add Firefox/WebKit persistence/integration coverage. |

Keep Svelte framework + TypeScript + Vite, JavaScript delivery, local locked tooling, GitHub Pages repository-subpath compatibility and no required backend or browser WebAssembly. No SvelteKit, generic game engine, cloud account, telemetry, leaderboard, ads, monetization, store, purchases, currency spending, upgrades, Daily mode, Sudoku variants, story or stage map.

No runtime puzzle generation is needed. No fresh Halloween/appearance artwork or alternate theme palettes are part of this phase. Persist supported preferences without exposing fake choices that lack validated implementations. Full installability, service-worker application-shell caching and deployment remain separate work; do not claim cold offline launch from an IndexedDB shard cache.

Production source, tests, policies, derived certified catalog shards and licenses are tracked. Raw downloads, experimental mockups, tool binaries, screenshots and machine test reports belong under ignored `prototypes/gameplay-validation/`. Do not import runtime code/assets from prototypes. Keep the preserved prototype unchanged.

Retain the user-authorized rough frog/lily-pad menu sketch, including its provisional status, until approved replacement art exists. This specific exception is documented in the asset record. Do not create or ship new AI illustrations. New tool/result/settings UI experiments require ignored ImageGen mockups before implementation, followed by actual browser comparison; mockups are never puzzle correctness evidence.

## 3. Complete phase scope

Deliver all of the following together, progressively integrated:

- Pure classic 9x9 rule validation, candidates, conflicts, completion checks and exact solution counting capped at two (0, 1 or at least 2), with immutable clues, cancellation and explicit invalid/unknown outcomes. Do not enumerate every completion of an empty board.
- A reproducible licensed catalog pipeline, at least 100,000 accepted puzzles with certified stored solutions, stable identities, rating provenance, meaningful duplicate filtering and progressively loaded local shards.
- Cell selection, digit entry, erase, sticky pencil Notes, bounded undo and honest hints/reveals. User notes and solver candidates remain distinct.
- Quick Play with Easy/Medium/Hard, separate resumable Progression frontier and fresh completed-Leap replays.
- Versioned Metamorphosis/Leap schedule, exactly-once completion/reward/frontier transitions and one Dewdrops currency with wallet/lifetime totals.
- A separate active-play timer, durable monotone assistance history, completed board/results retained until Continue and idempotent next-attempt allocation.
- Validated persistent preferences, attempts, use history, progression, receipts, migrations, backup/restore and clear unsaved/recovery behavior.
- Functional secondary tools/Settings/session information through the existing tenth More key, accessible results and replay selection without a permanent HUD or extra dock key.
- Independent catalog/logic/state/storage/adversarial browser verification, explicit remaining external limits, updated documentation and periodic Conventional Commits.

If one required group is incomplete, the phase is incomplete. Do not label a small working subset the complete game.

## 4. Explicit autonomous v1 defaults

These are starting decisions after the preparation team's research/challenge. Confirm the evidence with specialists and record the chosen v1 configuration. Improve provisional parameters through the same review loop when justified, without asking the user to choose routine implementation details. Do not weaken catalog size, correctness, persistence or regression gates to fit a budget.

| Concern | Default |
| --- | --- |
| Visible difficulty | Easy rating `<1.5`, Medium `[1.5,2.5)`, Hard `[2.5,5)` from the pinned Sukaku-rated bank; no undisclosed Expert level |
| Accepted catalog | At least 100,000 records after validation/deduplication, including minimum quotas 25k Easy / 25k Medium / 50k Hard; at least 1,000 in every scheduled internal interval |
| Initial counters | Metamorphosis 1, Leap 1 |
| Run schedule | Leaps 1-6 Easy; 7-15 Medium `[1.5,2)`; 16-24 Medium `[2,2.5)`; 25-42 Hard `[2.5,3.5)`; 43-60 Hard `[3.5,5)` |
| Repeat | Complete frontier Leap 60 once, increment Metamorphosis, create next run at Leap 1; repeat the same difficulty arc; no reward multiplier |
| Replay | Fresh puzzle for any completed unlocked Leap; highest unlock survives cycles within schedule version; replay never changes frontier |
| Active roles | One Quick Play, one frontier, one replay; no arbitrary three-slot UI and no silent replacement |
| Score bases | Easy 1000, Medium 2000, Hard 4000; completion credit weighted by answers not exposed by the game |
| Speed | At most 10%, provisional targets 10/20/40 active minutes; any disclosed information assistance disables that attempt's speed bonus |
| Conversion | `floor(score / 10)` Dewdrops, one final conversion; no points for individual taps/checks/edits |
| Undo | Last 512 reversible edits initially; no claim of unlimited history; assistance/time/rewards never undo |
| Catalog delivery | About 256 records per shard, at most 96 KiB decoded/32 KiB gzip, top manifest at most 128 KiB, one foreground fetch plus at most one prefetch |
| Logical hint set | Naked/hidden singles, pointing/claiming, naked/hidden pairs and triples, basic X-Wing; sound typed proof and explicit reveal fallback when unsupported |
| Notes | Manual candidates in fixed 3x3 positions; repeated note input toggles; placing a value removes matching peer notes as one undoable edit; never insert a note into a filled/clue cell |
| Errors | Nonpunitive direct row/column/box conflicts by default, no lives or forced correction. No hidden solution-error checking while entering digits. |
| Preferences | Persist explicit language, supported motion choice, board Fill space/Square, and valid supported theme/appearance identifiers independently. Do not build unimplemented palettes or Halloween merely to fill a selector. |

The catalog intervals must pass actual histograms and sampling before schedule freeze. Ratings approximate one grading policy, not universal human difficulty. Speed targets are provisional, not calibrated fairness claims. The exact formula, state transitions and migration rules are in the state/persistence specification.

## 5. Lead and specialist organization

The orchestrator owns product/engineering judgment, shared contracts, foundation, basic app integration, browser session, acceptance and the final result. Every gameplay group below must have a named specialist owner. The lead does useful foundation/integration work while specialists research and implement; it must not simply distribute tasks and wait.

Use the available concurrency efficiently. In a four-slot environment keep one lead plus at most three active specialists. These are logical responsibilities, not a request to spawn eight simultaneous agents or one agent per file. Reuse specialists across sequential groups where sensible. Long certification processes can run as bounded tool jobs while agents do other useful work.

### Initial ownership map

Exact filenames and interfaces must be written into the task ledger before editing. The following are the default ownership groups; adjust only through lead agreement to avoid collisions.

| Group | Specialist-owned files | Dependencies and acceptance |
| --- | --- | --- |
| Rules and exact solver | `src/lib/sudoku/**`, `tests/sudoku/**` | Lead contracts; pure rules/topology/candidates/solver; independent oracle and property tests; no UI/storage/mode code |
| Catalog and independent oracle | `tools/catalog/**`, `src/lib/catalog/**`, `public/catalog/**`, `data/catalog/**`, `tests/catalog/**` | Separate exact-cover topology/implementation from production solver; license/pin/import/certification/shards; full emitted corpus verification and payload/loading checks |
| Persistent storage/recovery | `src/lib/storage/**`, `tests/storage/**` | Shared record/transaction contracts; real IndexedDB, migrations, writer epochs, backups/cache; injected failures and real-browser atomicity |
| Sessions/input/timing | `src/lib/session/**`, `tests/session/**` | Rules and storage interfaces; pure reducer, notes/undo/assistance, lifecycle timer; state-machine tests and disclosure barriers |
| Modes/scoring/progression | `src/lib/modes/**`, `src/lib/rewards/**`, `data/gameplay-policy.v1.json`, related tests | Pure deterministic policy, frontier CAS/grants, replays, allocation intents, score arithmetic; no wallet writes outside repository transaction |
| Patterns/hints | `src/lib/hints/**`, `data/techniques.v1.json`, `tests/fixtures/techniques/**`, `tests/hints/**` | Satisfiable logical state and independent oracle; positive/negative/metamorphic proof tests, truthful explanations and assistance classification |
| Presentation/accessibility/localization | New bounded board/tool/result/settings/replay components and corresponding tests, with exact files assigned | Lead-owned integration contracts; official Svelte skills/docs/autofixer; selected layout, keyboard/touch/AX/locale/notes-readability acceptance |
| Independent adversarial QA | Separately assigned oracle/review/property/browser test files and `docs/gameplay-acceptance.md` inputs | Read actual implementations, challenge worker claims, reproduce defects; must not be the sole author/reviewer of its own critical algorithm |

Lead-owned shared files include `src/App.svelte`, existing navigation/layout/i18n/theme contracts, package/configuration/lock files, `src/lib/gameplay/contracts.ts`, the task/decision ledger, architecture and final acceptance record. Specialists propose changes to these interfaces; they do not silently edit other owners' files. The lead can delegate a precise shared-file change explicitly after resolving ownership.

Suggested sequencing:

1. Lead establishes contracts, backlog/risks and current UI regression baseline. Parallel specialists research rules/oracles, catalog/license/loading and persistence contracts.
2. Accept and integrate rules, catalog tools and storage foundation through small green commits. Start complete catalog certification as soon as its two oracles are credible.
3. Reuse available specialists for session/timer, modes/rewards and hints. Work behind agreed pure interfaces while the lead builds controller/navigation and integrates real attempt loading.
4. Delegate bounded tools/results/preferences/accessibility presentation and independent verification. Lead owns actual Codex browser actions and cross-module acceptance.
5. Run full catalog certification, failure-injection, model-based, multi-browser and visual gates. Resolve findings with responsible specialists, then commit the integrated completion record.

Do not postpone integration until the end or create idle agents waiting for an unspecified interface.

## 6. Mandatory research and reciprocal challenge loop

**Every plan must be researched and challenged before implementation.** This includes the orchestrator's overall phase plan, architecture and dependency plan, each specialist's task plan, data/import plan, schema/migration plan, gameplay/balance plan, UI/accessibility plan, test/acceptance plan, integration plan and every proposed fix or material plan revision. A plan authored by the orchestrator is not exempt: assign a named specialist to challenge it, answer the counterarguments, and record an agreed evidence-supported version before executing the affected work. No plan is accepted solely because of its author, seniority, another agent's agreement or passing earlier tests.

For each plan record the relevant primary online research, assumptions, alternatives, strongest counterexample, challenger, replies, decision and required evidence. Existing verified research may be reused only after explicitly checking its applicability to this plan; a small plan is not a reason to skip research or challenge. A changed assumption reopens the affected plan and dependent work. Continue unrelated accepted work while that review happens. This rule applies equally to plans written in the progress ledger, tool planning messages and specialist briefs.

Routine reads, tool calls and test execution within an already accepted plan are execution of that plan, not an infinite new layer of plans requiring a meta-plan. Every declared new direction, task/test/fix plan, changed assumption or material revision still enters the complete research/challenge loop. Record the accepted plan ID for routine execution; do not use this clarification to bypass review of a new plan.

For every assignment, including follow-up fixes, give a self-contained brief containing:

1. User-visible problem and desired behavior, exact owned files and forbidden edits.
2. Shared-workspace warning: preserve other agents' changes, coordinate contract changes with the lead.
3. Dependencies, typed inputs/outputs, invariants, lifecycle/cleanup and error semantics.
4. Relevant project records, specific primary online sources to verify and installed Svelte skills where applicable.
5. Cases the specialist must challenge, simpler alternatives, data/license/performance/accessibility risks.
6. Required proposal before coding, implementation evidence, tests and acceptance criteria.

The specialist must research relevant official/primary sources online for its task. Use mathematical papers, source-author explanations, publisher data/license records, browser/framework standards and official testing-tool docs. Search snippets, an arbitrary tutorial, popularity or another agent's confidence are not sufficient evidence. Reuse current verified research where appropriate, recheck changeable facts, and record links/version/date and what is inference. Do not duplicate broad research without a concrete unanswered question.

Before coding, the specialist proposes a direction, interfaces, rejected alternatives, counterexamples and verification. The lead challenges each material proposal: ask what invalidates it, find a boundary/race/corruption case, check actual source evidence, and prefer a simpler equally correct solution. The specialist must answer, revise or provide a convincing construction/proof. Record the final agreed direction and reasons. Agreement must be explicit; locked user requirements are not reopened for preference debates.

After implementation, the lead reads the actual diff and relevant surrounding code/data. Challenge algorithm soundness, state ownership, circular dependencies, stale asynchronous work, cleanup, transaction boundaries, undo/assistance semantics, labels, keyboard/focus, loading and responsive presentation. Run the relevant tests independently and exercise the integrated result through Codex browser. A worker summary or passing isolated tests is never acceptance.

Send actionable findings with file/line or reproduction, expected result and evidence. The specialist researches the failure, challenges the diagnosis where evidence warrants, proposes a fix and explains regressions it could introduce. The lead challenges the fix, agrees a direction, reviews the revision and repeats affected cross-module checks. Continue until the behavior and evidence satisfy the contract. Record meaningful disagreements and resolutions, not theatrical argument over every constant.

If agreement is blocked, identify the exact contradictory evidence, obtain an independent specialist review and choose a correct alternative within the authorized product boundary. Do not resolve a disagreement by lowering correctness gates or declaring confidence. No external feedback/issues/project uploads are authorized merely by an installed skill.

## 7. Integration contracts and implementation discipline

Use concrete modules, typed discriminated results and immutable inputs. No generic event bus, plugin system, speculative economy framework or backend. Domain code must not import Svelte, DOM, theme tokens, translated strings or IndexedDB. UI components dispatch commands; they do not mutate cells, wallet or frontier directly.

The lead should agree these boundaries before workers implement them:

| Boundary | Required meaning |
| --- | --- |
| Rules | Strict board decoder; immutable topology; legal candidates; all conflicts; valid completion; bounded exact solution count with clear invalid/aborted/unknown outcomes |
| Catalog | Versioned manifest/record/shard validation; stable puzzle identity; source/rating provenance; bounded progressive load; no-fallback difficulty and stale-request results |
| Session | Pure typed commands/reducer; entries separate from givens; manual notes separate from solver candidates; reversible edit patches separate from monotone knowledge/time |
| Hints | Typed deduction/reveal, premises, affected cells/digits, explanation key/parameters, source revision and assistance classification; stale or unproved hints never apply |
| Modes/rewards | Pure score/frontier calculations; frozen attempt policy; grant identity distinct from attempt ID; replay isolation and idempotent allocation intent |
| Storage | Validated snapshots; compare-and-swap revision/owner epoch; atomic disclosure/completion; transaction-complete acknowledgement; explicit pending/unsaved/conflict results |
| Controller/presentation | Application-lifetime coordinator; UI-only route/overlay state; validated active attempt selection; global focus policy and small typed component inputs/events |

Use data files for puzzles/solutions, source manifests, schedule/reward policies, technique metadata and technique fixtures. Algorithms remain reviewed TypeScript, not arbitrary executable strings loaded from data. Version these separately: storage schema, database structure, catalog, certification, techniques, schedule, scoring and seed/permutation policy.

Current `#board` cannot identify a durable attempt. A direct link/reload must resolve the correct validated role/attempt or return safely to mode selection. Browser Back closes the top overlay first and preserves the attempt. More dismissal must not lose the board, selection, input mode or pending storage work. Closing a tool restores appropriate focus without trapping subsequent digit/arrow entry on the keypad.

## 8. User experience to preserve and complete

Keep all 81 full rectangular targets, inward 1:1 leaf anchors, stable visual seeds, upright digits, 4px cell/key gaps, 8px edge/group/board-dock gaps and safe-area allocation. No permanent HUD, top bar, gameplay mascot, eleventh dock key or new decorative board card. Add needed semantic states and non-color cues without selected cell/pad outlines or uncontrolled visual clutter.

Fill space remains the default and uses the full remaining rectangular board allocation. Functional persistent Square is required now that Settings is implemented; its earlier deferral was about access, not rejection. One authoritative contract exposes the available allocation and actual cell-grid rectangle. Anchor the compact square nearest the unchanged dock: bottom in portrait, right in landscape, preserving exactly 8px from grid to dock. Center it along the perpendicular axis; unused allocation is water on the opposite side, not a new padding token, frame or reduced Fill allocation. Test both shapes and runtime switching during overlays/pending saves without changing logical IDs, entries, notes, selection, seeds or progress. This direction was challenged against the existing design decision and the enlarged-gap counterexample; dock anchoring is the accepted simpler resolution.

The existing tenth More entry must grow into a professional secondary surface: Resume/Close, Notes, Undo, Erase, Hint, Settings/session information and Back to main menu. Prefer a small labeled dialog/popover with ordinary buttons rather than incomplete ARIA menu semantics. Keep Notes sticky when the surface closes. Notes state must remain visible/programmatically exposed within the existing dock. Unavailable actions have genuine disabled semantics.

Ordinary More/tools remain timed while the board is readable. Replace the existing misleading "Take a breather" heading with a localized game-menu label; a timed menu must not imply the game is paused. Explicit Pause, paused Settings or returning to the menu must fully conceal board and notes while stopping active time. A dim-readable board is not concealed. Escape/Back handles nested overlays in order; no underlying click/number entry occurs through dismissal. Test repeated/slow double activation.

Completion validates first, then records the atomic durable result. Announce success once and show a persistent result with score breakdown, earned Dewdrops and Continue. Keep the completed board available until the player chooses Continue. No timed disappearance, automatic next puzzle, empty focus target or repeated reward on reload.

Progression needs a compact completed-Leap selector, not a story map. It must state the selected Leap/difficulty, preserve the active frontier, and resume the existing replay or explicitly confirm replacing it. New puzzle/Restart/Reset progress are different operations; ordinary New game must not silently reset counters or wallet. Full reset is not required for normal play.

The current tiny nine-note specimen is not acceptable evidence for final gameplay typography. The presentation specialist must resolve usable note reading/editing, including a clearly reachable enlarged selected-cell/notes view in More or an equally tested alternative. Do not merely label 5.57px text approved. Preserve the board allocation and permanent-key count; a temporary enlarged tool view can reuse the same reducer. Verify with actual font rendering, 100%/200% text/zoom, keyboard/touch and accessible names. Record physical-device limits honestly.

Settings must expose only implemented controls and persist them independently of puzzle state. Support explicit English/German/Spanish, reduced/system motion, functional Fill space/Square, and helpful session/score information. Unsupported appearance/theme IDs must degrade safely without losing the saved preference or board; do not expose an inert dark/Halloween selector. Restore/reset/import controls must preview concrete destructive effects and preserve recovery copies.

## 9. Validation, commits and completion

Follow every gate in the [validation matrix](gameplay-validation-matrix.md). The lead is the sole owner of the shared Codex browser session; specialists may use separate isolated automated contexts and submit screenshots/traces. The lead must personally reproduce complete journeys and challenge both logic and presentation. Run mathematical/data/state/storage tests as well as browser testing; a browser playthrough alone cannot certify Sudoku uniqueness or transactional accounting.

Maintain `docs/gameplay-progress.md` with task ownership/dependencies, proposals/decisions, current risks, next checks and acceptance state. Maintain an invariant-to-test map and `docs/gameplay-acceptance.md` with actual final evidence. Keep machine reports/screenshots/large certification logs ignored, with stable summary hashes/commands/counts recorded in tracked documents. Preserve raw minimized failing seeds/fixtures in tracked tests where licensing permits.

Commit periodically after accepted coherent slices, typically every 30-90 minutes of active implementation or earlier when a module is ready. Each commit must build/type-check and pass its affected tests; integrate often enough that the application does not accumulate incompatible modules. Useful commits include contracts/rules, catalog importer/oracle, certified data, storage/recovery, reducer/timer, modes/rewards, hints, UI integration and final adversarial fixes. Long corpus jobs do not justify a huge unreviewable final-only commit. Do not stage user work, ignored evidence/raw downloads or vendor changes incidentally. Use Conventional Commits.

Do not disable a failing test, replace a real integration with a mock, weaken an oracle, reduce corpus requirements or silence a real accessibility issue to make a checkpoint green. If a new failure appears, add its minimal regression, fix the cause, rerun affected integration and document the resolution before acceptance.

Work without routine user clarification. Research/decide ordinary engineering, interaction and provisional balance choices using this brief and record why. Do not ask permission to do already authorized reversible work. This autonomy does not authorize publishing/deploying, sending external messages, accepting new legal terms, purchasing assets or destructively modifying real player/user data. Use fresh test profiles/databases. Genuine missing rights, contradictory critical evidence or unavailable required external resources must be investigated through alternatives, then reported concretely if unresolved.

The acceptance bar is zero known unresolved required correctness, data-loss, reward-duplication, gameplay accessibility or regression blockers, complete finite-catalog certification and honest coverage of the supported matrix. Do not claim that finite tests prove absence of every possible bug, universal difficulty fairness, guaranteed browser-storage retention or physical-device performance. An external limitation cannot be relabeled a passing test. Keep implementing feasible work, and distinguish implementation-complete from release/hardware acceptance when a real external gate remains.

## 10. Copy-ready receiving-agent prompt

```text
Work in C:\Programming_Files\Shilocity\Therra\toadoku.

Activate and implement the entire first gameplay phase described in
docs/gameplay-implementation-handoff.md. Read it and all linked gameplay
specifications/readiness audit before coding. The maintained UI is finished;
extend it, preserve its selected Pond design and rough sketch, and do not copy
prototype engines, source trees, dependency trees or test certifications.

Act autonomously as project lead, professional Sudoku designer and senior
engineer. Delegate every bounded gameplay group to named specialist subagents,
using available concurrency efficiently while you own contracts, foundation,
integration, the shared Codex browser and final acceptance. Every specialist
must research primary sources online and challenge its assignment BEFORE code.
RESEARCH AND CHALLENGE EVERY PLAN before executing it, including your own
overall/architecture/integration plans, specialist plans, data/storage plans,
gameplay/UI plans, test plans and every fix or material revision. Assign a
named subagent to challenge your plans too. Verify relevant primary online
sources, assumptions, alternatives and counterexamples; argue from evidence
until the orchestrator and specialist agree and record the rationale. No plan
or author is exempt. Review actual implementations, independently test them, challenge
findings/fixes reciprocally and repeat until the required gates pass. Passing
isolated tests or agent agreement is not acceptance.

Implement pure classic Sudoku, independently certified puzzle/solution data
in progressively loaded files (at least 100,000 accepted puzzles), correct
patterns/hints, full entry/notes/erase/undo, separate active-play timing,
Quick Play, Progression/replays, Metamorphosis/Leap/Dewdrops, atomic exactly-once
completion/rewards and reliable versioned IndexedDB storage/recovery. Use the
explicit v1 defaults and improve provisional choices through documented
research/review without routine user polling. Preserve all user requirements.

Use Svelte framework + TypeScript + Vite, not SvelteKit. Use project-local
official Svelte skills/docs/autofixer. No backend/browser WASM, store/spending,
new modes/variants/Halloween, service-worker/PWA/deployment or external feedback
submissions. Keep full UI state independent of decoration, locale and theme.

Run the full data, rules, state-machine, property, mutation, storage-failure,
multi-tab and real-browser gates. Personally exercise full user journeys with
Codex browser at the required phone/desktop sizes; inspect and challenge
screenshots, notes, focus, histories and failure recovery. Fix regressions.
Keep progress/decision/acceptance records, and commit accepted green slices
periodically with Conventional Commits. Do not stop at an engine demo or
silently weaken gates. Report exact evidence and genuine external limits;
never claim testing proves every possible bug absent. Stop when the complete
authorized gameplay phase is integrated, validated and committed, before
later deployment/PWA/monetization or unrelated product phases.
```
