# Usability research and challenge

Research reviewed: 2026-11-01. Optional evidence and rationale for the [operational guide](../usability-principles.md). Read when evaluating a disputed principle or revisiting its evidence; routine implementation does not require this file. The operational guide owns current instructions.

## What the research supports, and where simplicity can fail

- **Strong defaults and fewer settings.** Apple recommends useful defaults, minimizing settings, using available system information and separating general preferences from options used during a task. This supports play without setup, while retaining meaningful customization. [Apple: Settings](https://developer.apple.com/design/human-interface-guidelines/settings)
- **Selective disclosure.** NN/G recommends exposing important options first and revealing specialized options on request. It also warns that hiding frequently needed actions or providing an unclear route to secondary options defeats the pattern. [NN/G: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- **Clarity over a click quota.** An extra tap can reduce scanning and decision effort, but it also adds navigation. Optimize understandable task completion rather than a fixed maximum number of taps. [NN/G: The 3-Click Rule for Navigation Is False](https://www.nngroup.com/articles/3-click-rule/)
- **Minimalism still needs feedback and control.** Players need understandable state, a way to back out and protection from costly mistakes. Removing those to make a screen look cleaner can reduce usability. [NN/G: 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- **Familiarity and plain language.** Conventional controls and clear relationships help people understand an interface, including people with cognitive disabilities. Concise, consistent, action-oriented wording helps explain what happens next. [W3C: Understandable Controls](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/), [Apple: Writing](https://developer.apple.com/design/human-interface-guidelines/writing)

The challenged conclusion: fewer visible controls alone do not make an app intuitive. A hidden feature still has design and maintenance costs, and an essential option for a minority of players may be a basic accessibility need. Apple is a useful design reference; these sources do not establish a universal Apple-versus-Android usability ranking. Apply the principles to this browser game while respecting familiar browser, keyboard and touch behavior.

These sources provide design guidance, not usability evidence from this app's players. W3C's cited cognitive guidance is supplemental, not a WCAG conformance checklist. Feature frequency and discoverability remain hypotheses until observed.

## Naming and applying the documentation pattern

**Progressive disclosure** is the established pattern: essential information first, further detail when needed. Strong defaults are a separate supporting practice, not part of a single formally named principle. Anthropic also uses progressive disclosure for agents discovering context incrementally; the broader discipline is context engineering. [Anthropic: Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

The documentation split applies that pattern: AGENTS.md gives the rule and loading condition, the short guide contains operational requirements, and this reference contains optional evidence. The challenge is that more files can increase searching and cause agents to miss requirements. Keep related instructions together, maintain one authoritative version and retain required constraints in the relevant guide. Shorter context is useful only when it still supplies enough information to act correctly; the split alone does not guarantee better agent performance.

## Independent challenge and resulting corrections

A subagent checked the sources and challenged the agent instructions. Its findings led to these corrections:

- Make omission of unnecessary features explicit; hiding them still permits feature creep.
- Classify controls by the player task, frequency and consequences. Rare recovery can be urgent, and technical complexity does not make a tool infrequent.
- Scale review effort to the change. Small wording corrections do not need a product decision record or unrelated journey checks.
- Treat current More placement as an existing scope constraint, not proof of usability. Future authorized work may reconsider repeated navigation and existing features.

The subagent reviewed the revised text and found those issues resolved. This is a documentation review, not validation with players.
