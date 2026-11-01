# Usability principles

Research reviewed: 2026-11-01. Applies to feature scope, settings, navigation, feedback and player-facing copy.

## Principle: opinionated defaults and progressive disclosure

Make starting, resuming and solving a puzzle work without configuration. Provide a small, coherent set of useful features with sensible defaults. Reveal necessary advanced or infrequent options through clearly labeled secondary access. Every feature, control and sentence must help a player accomplish a real task.

This is project policy for future work, not authorization to redesign the maintained Pond interface, remove accepted features, change scoring or begin theme/PWA implementation. Existing gameplay correctness, persistence and accessibility contracts still apply. Resolve any conflict explicitly before changing behavior.

## What the research supports, and where simplicity can fail

- **Strong defaults and fewer settings.** Apple recommends useful defaults, minimizing settings, using available system information and separating general preferences from options used during a task. This supports play without setup, while retaining meaningful customization. [Apple: Settings](https://developer.apple.com/design/human-interface-guidelines/settings)
- **Selective disclosure.** NN/G recommends exposing important options first and revealing specialized options on request. It also warns that hiding frequently needed actions or providing an unclear route to secondary options defeats the pattern. [NN/G: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- **Clarity over a click quota.** An extra tap can reduce scanning and decision effort, but it also adds navigation. Optimize understandable task completion rather than a fixed maximum number of taps. [NN/G: The 3-Click Rule for Navigation Is False](https://www.nngroup.com/articles/3-click-rule/)
- **Minimalism still needs feedback and control.** Players need understandable state, a way to back out and protection from costly mistakes. Removing those to make a screen look cleaner can reduce usability. [NN/G: 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- **Familiarity and plain language.** Conventional controls and clear relationships help people understand an interface, including people with cognitive disabilities. Concise, consistent, action-oriented wording helps explain what happens next. [W3C: Understandable Controls](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/), [Apple: Writing](https://developer.apple.com/design/human-interface-guidelines/writing)

The challenged conclusion: fewer visible controls alone do not make an app intuitive. A hidden feature still has design and maintenance costs, and an essential option for a minority of players may be a basic accessibility need. Apple is a useful design reference; these sources do not establish a universal Apple-versus-Android usability ranking. Apply the principles to this browser game while respecting familiar browser, keyboard and touch behavior.

These sources provide design guidance, not usability evidence from this app's players. W3C's cited cognitive guidance is supplemental, not a WCAG conformance checklist. Feature frequency and discoverability remain hypotheses until observed.

## Rules for product and interface work

1. **Choose a good behavior before adding a preference.** Do not offer a switch merely because two implementations are possible. State the player need, why a default cannot meet it and what the setting changes. Omit speculative features from new proposals; do not accumulate them in an Advanced section.
2. **Keep ordinary play free of setup.** Starting or resuming should not require appearance choices, storage configuration or a tutorial. Preserve meaningful choices such as Quick Play difficulty. Keep internal session, catalog and transaction concepts out of the normal journey.
3. **Separate actions from preferences.** Number entry and solving tools belong to gameplay. General, infrequently changed preferences belong in Settings. Task-specific choices belong near the action they affect.
4. **Use shallow, predictable disclosure.** Prefer one clearly labeled additional step for necessary advanced options from their relevant parent area. Use a specific group name when it predicts the contents better than Advanced. Avoid nested menus, gesture-only access and repeated hunting. This is a design preference, not a universal tap limit.
5. **Respect individual needs.** Follow applicable system preferences, including reduced motion, and persist explicit supported choices. Keep language and accessibility options easy to discover through Settings; do not classify them as expert features. Do not add a new override without a demonstrated need.
6. **Write only what helps the next decision.** Use familiar action labels and consistent terms across English, German and Spanish. Remove repeated instructions and implementation details. Explain an unfamiliar term or consequence briefly where it matters; put optional detail behind a labeled disclosure. Brevity must preserve meaning.
7. **Make routine work dependable and consequences explicit.** Save automatically under the existing persistence contract. Surface failures when they affect progress, with a clear recovery action. Preserve confirmation before destructive replacement or restore, and disclosure before assistance changes rewards. Do not add confirmations to routine reversible input.

## Applying the principle to this app

The following guides later reviews; it does not change the current layout or accepted mechanics.

| Player need | Placement and behavior |
| --- | --- |
| Start, resume, select a cell, enter a digit | Clear ordinary play path without opening Settings. |
| Notes, Undo, Erase, Hint | Contextual gameplay tools through the accepted More layout; no extra Advanced layer. Review repeated navigation if observed use shows friction. |
| Language, board shape and supported appearance preferences | Discoverable Settings with useful defaults and remembered choices; no setup prerequisite. |
| Backup and restore | Secondary Settings area, with restore consequences explained at the point of commitment. |
| Save failure or progress at risk | Timely contextual feedback and recovery, even though the condition is uncommon. |
| Catalog hashes, transaction generations and technical diagnostics | Internal engineering detail; show a short actionable explanation if a failure needs player attention. |

## Review before accepting changes

For each proposed addition or revision, record the player task, default behavior, reason a control is necessary and where it belongs. Prefer simplifying the interaction over adding explanatory paragraphs or another preference. Existing approved requirements need an explicit scope decision before removal.

Check that a first-time player can start and enter a digit without configuration; a returning player can resume; a player can find a secondary preference and return without losing progress; and a consequential action explains its effect before commitment. For affected UI journeys, observe representative players where available and record hesitation, wrong turns, repeated taps and successful recovery. Include keyboard, touch, reduced motion and supported languages as relevant.

Developer/browser checks can verify behavior, but cannot establish that unfamiliar players find it intuitive. Label untested assumptions and physical-device limits honestly. This documentation change adds no analytics or new testing infrastructure.
