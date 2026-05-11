# 06 — Final audit

Protocol compliance matrix:

| Requirement | Evidence |
| --- | --- |
| Required inputs parsed | `00-request.md` records bucket `open`, kind `fix`, title, context, issue number/path. |
| AGENTS and workflow docs read | `01-protocol-read.md` lists `AGENTS.md`, create-issue-doc prompt, feature workflow skill, issue references, and AXI skill. |
| Issue bucket selected | `.ai/issues/open/ISSUE-038-bound-goal-template-autocomplete-discovery.md`. |
| Next issue number determined | `00-request.md` and `raw/commands.log` record `ISSUE-038`. |
| Transcript directory created | `.ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/`. |
| Raw command transcript captured | `raw/commands.log`. |
| Grounded research performed | `02-grounded-research.md`; inspected `.pi/extensions/goal/command.ts`, `.pi/extensions/goal/templates.ts`, `README.md`, `package.json`, prior ISSUE-031, and command outputs. |
| Design choices locked | `03-design-lock.md` chooses bounded candidate directories and rejects recursive skip-list/caching-only/async-only alternatives. |
| Proof threat model written | `04-proof-threat-model.md` defines primary invariant, false-green risks, and proof strategy. |
| Canonical issue doc written | `.ai/issues/open/ISSUE-038-bound-goal-template-autocomplete-discovery.md`. |
| Issue links to artifacts | Issue doc `Transcript artifacts` section links to every required artifact. |
| TOON required proofs included | Issue doc includes a valid `required_proofs[3]{...}` TOON block. |
| Artifact visibility checked | `raw/commands.log` includes `git status --short --untracked-files=all` and `git check-ignore -v ... || true`; status shows artifacts as untracked, check-ignore shows explicit unignore rule. |

Completion assessment:

The create-issue-doc workflow is complete. The resulting issue is execution-ready with a locked design and adversarial proof plan.

No unresolved questions.
