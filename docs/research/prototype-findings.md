# Findings from the initial experiment

This records earlier exploration, not production approval. All prototype files and temporary images remain under ignored `prototypes/`.

## Product and visual review

The top bar, action row, explanatory copy, decorative spacing and muted Halloween palette were rejected. Current requirements prioritize a large traditional Sudoku board, minimal controls, one floating overflow entry point, and recognizable Halloween colors. ImageGen comparisons explored an atmospheric pond, tactile pumpkin habitat, and graphic frog-cell direction; none has been selected.

## Technical exploration

- The Svelte + TypeScript + Vite experiment exercised Sudoku generation, notes, undo, hints, saving, localization, appearance settings and responsive layouts. The stack is now approved separately from that interface.
- Generated puzzles were checked for unique solutions. Clue-count targets did not establish human difficulty, and hints revealed values without explaining deductions.
- Browser checks covered 360 by 800, 393 by 873, their landscape equivalents, desktop, and longer German and Spanish labels. These were emulated checks, not physical Motorola tests.
- Production cases reported offline reload, offline puzzle generation, saved-game resume, asset caching and root/project-subpath behavior. They demonstrate feasibility; the code still requires review before any reuse.
- Self-hosted fonts and original editable SVG artwork were explored. Final artwork format remains open following the visual discussion.

## Known unresolved prototype issues

- After keypad entry, focus remained on the keypad, so board-only arrow navigation stopped working.
- Completion did not announce success or focus the next action after disabling the board.
- Dialogs lacked accessible names.
- A stale cell accessibility label was found and fixed during earlier testing; future implementations need equivalent coverage.

Do not promote this experiment, its test results, or generated mockups into production without the agreed discussion and review.
