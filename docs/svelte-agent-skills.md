# Project-local official Svelte agent skills

Production update, 2026-10-31: the installed skills were used for the subsequently activated [production UI phase](production-ui-progress.md). The installation/provenance record below remains unchanged in scope; no global skills or external feedback reports were added.

Installed and verified: 2026-10-31. Scope is this repository only. No global skills, plugins or MCP server configuration were installed. The production application has not been scaffolded or implemented.

## Installed set and provenance

Source: [official Svelte AI tools](https://github.com/sveltejs/ai-tools), pinned revision `75a688cd090b7b8326bfc988cf4ed69d5abd38fd`. The [official skills documentation](https://svelte.dev/docs/ai/skills) identifies `tools/skills` as the source directory. The complete, non-truncated Git tree at that revision contains three canonical published skills:

| Skill | Project-local entry point | Purpose |
| --- | --- | --- |
| Svelte code writer | [SKILL.md](../.agents/skills/svelte-code-writer/SKILL.md) | Official documentation lookup and Svelte autofixer workflow. |
| Svelte core best practices | [SKILL.md](../.agents/skills/svelte-core-bestpractices/SKILL.md) | Modern reactivity, components, events, CSS, integration and attachments. |
| Svelte MCP feedback | [SKILL.md](../.agents/skills/svelte-mcp-feedback/SKILL.md) | Guidance for a genuinely applicable autofixer-feedback task, not initial app implementation. |

All 12 published files were copied: three skill entry points plus nine bundled references. Duplicate plugin-specific copies were not installed again. The repository's own `writing-great-skills` and `writing-opencode-plugins` maintenance skills are not part of its published Svelte skill directory. The public documentation currently lists the first two skills; enumeration of the pinned official directory also includes the newer feedback skill.

The upstream MIT license is included at [svelte-ai-tools-MIT.txt](licenses/svelte-ai-tools-MIT.txt). [svelte-skills.lock.json](svelte-skills.lock.json) records the source commit, source/destination paths, sizes, Git blob hashes and SHA-256 digests. All 12 installed files were checked against their pinned upstream Git blobs. The narrow `.gitattributes` rules preserve these bytes across Windows checkouts.

Vendored instructions and references remain verbatim, including upstream punctuation and examples. Project-authored style rules apply to authored project documents; do not rewrite vendor content to remove punctuation or framework examples.

## Usage by the next agent

The installed project skills become available to the next turn/new agent. If automatic discovery is unavailable, read their local entry points directly. For production Svelte component/module work, load the code-writer and best-practices skills and the references relevant to the change. Use the Svelte autofixer before finalizing components, together with project type/build/browser checks.

**This project uses the Svelte framework, TypeScript and Vite. SvelteKit is not the selected stack.** References to SvelteKit inside upstream skills do not authorize installing it, migrating the project or introducing its routing/server conventions. Select only relevant Svelte guidance.

Installation does not activate every optional workflow. Do not submit issues, send project material, or configure remote tools merely because the feedback skill describes doing so. Follow the user's actual task and the host's communication/permission rules. No feedback issue was submitted during this handoff.

The skills describe `@sveltejs/mcp` CLI commands. Installing skill text does not install that runtime or connect an MCP server. When implementation begins, verify current CLI and Node compatibility, use project-scoped development tooling where appropriate, and avoid global installs. In PowerShell, use single-quoted rune expressions or file paths so `$state` and other runes are not interpolated by the shell.

## Updating

Treat this as a pinned vendored set. Before updating, enumerate the official canonical directory at the new revision, review changes and preserve its reference files/license. Use the bundled Codex skill-installer with an explicit destination of this repository's `.agents/skills`, never its default global destination. Its relevant arguments are `--repo sveltejs/ai-tools`, `--ref <reviewed commit>`, `--path <canonical skill paths>` and `--dest <absolute project .agents/skills path>`.

Do not silently overwrite existing copies or add a second global installation. Recompute both Git blob and SHA-256 checks and update the lock/provenance record after a deliberate upgrade.
