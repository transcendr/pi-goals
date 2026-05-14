# 01 — Protocol read

Issue: ISSUE-013 — `/goal update` natural-language goal updates
Date: 2026-05-10

## Read sources

- `AGENTS.md`
- `.ai/.pi-goals/create-issue-doc.md`
- `~/.codex/feature-workflow-pipelines/SKILL.md`
- `~/.codex/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `~/.codex/feature-workflow-pipelines/references/research-pass.md`
- `~/.codex/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `~/.codex/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `~/.codex/feature-workflow-pipelines/references/pipelines.md`
- `~/.agents/skills/axi/SKILL.md`
- `~/.codex/sentrux/SKILL.md`

## Workflow requirements extracted

- Promote only after grounded research resolves the meaningful product/runtime forks.
- Make the issue doc canonical and execution-ready: problem, context, locked decisions, implementation surfaces, acceptance criteria, and required proofs must all be visible.
- Use TOON for decision-dense handoff content where it improves executability.
- Keep transcript artifacts visible under `.ai/docs/issue-workflow/<issue>/`.
- Verify artifacts are trackable with `git status --short --untracked-files=all` and `git check-ignore -v <artifact> || true`.
- For architecture-sensitive changes, use Sentrux. This pass is docs-only, but `/goal update` affects command parsing and runtime seams, so Sentrux was run as a planning sensor against `.pi/extensions/goal`.

## AXI requirements extracted

`/goal update` is agent-facing CLI ergonomics. The issue must require:

- predictable command grammar and errors;
- no silent ambiguous mutation;
- machine-visible structured proposed changes before confirmation;
- concise, stable output wording suitable for agents;
- non-destructive defaults and explicit confirmation for risky edits.

## Sentrux posture extracted

Sentrux is required for non-trivial code/architecture changes. Implementation will touch command parsing, tools/update application, UI confirmation, state formatting, tests/probes, and README. The promoted issue requires `sentrux gate --save .pi/extensions/goal` before implementation and `npm run quality:goal` after implementation.
