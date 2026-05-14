# 01 — Protocol read

## Files read

- `AGENTS.md` — project-local rules for pi-goals, quality gate, issue workflow, queue routing, and live probe validation.
- `~/.codex/feature-workflow-pipelines/SKILL.md` — full workflow skill.
- `~/.codex/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md` — canonical issue structure and proof/TOON requirements.
- `~/.codex/feature-workflow-pipelines/references/research-pass.md` — grounded research pass rules.
- `~/.codex/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md` — design choice locking rules.
- `~/.codex/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md` — TOON planning block guidance.
- `~/.agents/skills/axi/SKILL.md` — TOON/AXI requirements because required proofs/TOON blocks are needed.

## Extracted requirements

- Make the issue doc the canonical planning home.
- Create durable visible transcript artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/`.
- Run grounded research against live code before finalizing the issue.
- Lock meaningful design choices; do not leave implementers to choose product/API behavior.
- Add proof threat model before required proof rows.
- Use real TOON syntax for TOON-labeled blocks.
- Include importable `required_proofs[]` rows for proof-driven execution.
- Verify artifact visibility with `git status --short --untracked-files=all` and `git check-ignore -v <artifact> || true`.
- Respect project quality requirements: Sentrux gate before substantial implementation and `npm run quality:goal` after implementation.
- Use live probe validation for behavior-changing `pi-goals` work unless a visible reason to skip is provided.
