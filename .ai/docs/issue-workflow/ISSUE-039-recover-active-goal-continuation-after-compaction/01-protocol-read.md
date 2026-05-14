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

Requirements extracted:

- Produce visible issue-workflow artifacts before final issue writeback.
- Ground research in live files/commands and write findings into the canonical issue doc.
- Lock meaningful design choices before marking execution-ready.
- Include proof threat model and valid TOON `required_proofs[]` rows.
- Make target repo roots explicit.
- Verify artifacts are visible with `git status --short --untracked-files=all` and `git check-ignore -v <artifact> || true`.
- For `pi-goals`, preserve modular `.pi/extensions/goal/` architecture, run Sentrux before substantial implementation, and run `npm run quality:goal` after implementation.
- Because this touches continuation/compaction/live runtime behavior, require a bounded live probe or an explicit skip rationale.

AXI relevance:

- This issue targets an agent-facing autonomous continuation path. The issue doc uses TOON for proof and handoff structure; no CLI implementation is changed in this planning pass.
