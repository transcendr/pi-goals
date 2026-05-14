# 01 — Protocol read

Files read before drafting:

- `AGENTS.md`
- `.ai/.pi-goals/create-issue-doc.md`
- `~/.codex/feature-workflow-pipelines/SKILL.md`
- `~/.codex/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `~/.codex/feature-workflow-pipelines/references/research-pass.md`
- `~/.codex/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `~/.codex/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `~/.agents/skills/axi/SKILL.md`

Protocol requirements extracted:

- Use `.ai/.pi-goals/create-issue-doc.md` exactly for issue doc creation/refinement.
- Produce visible workflow artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/`.
- Read the feature workflow skill and relevant references before drafting.
- Ground claims in live code/docs/commands rather than memory.
- Make the issue doc canonical and execution-ready when possible.
- Lock meaningful design choices; do not leave implementation to choose among product/runtime alternatives.
- Include a proof threat model before required proof rows.
- Include valid TOON syntax for `required_proofs[]` when proof-driven execution is expected.
- Verify artifact visibility with `git status --short --untracked-files=all` and `git check-ignore -v <artifact-path> || true`.
- For this repo, preserve modular extension architecture under `.pi/extensions/goal/` and run `npm run quality:goal` after implementation.

AXI relevance:

- The affected surface is an agent-facing slash-command autocomplete path, so responsiveness, bounded output/behavior, and non-surprising agent ergonomics matter.
- The issue itself is planning-only; no CLI output contract is changed in this session.
