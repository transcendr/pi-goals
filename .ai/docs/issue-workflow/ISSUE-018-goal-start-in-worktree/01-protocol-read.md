# 01 — Protocol read for ISSUE-018

## Files read fully or freshly present in context

Project/workflow files:

- `AGENTS.md`
- `.ai/.pi-goals/create-issue-doc.md`
- `~/.codex/feature-workflow-pipelines/SKILL.md`
- `~/.codex/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `~/.codex/feature-workflow-pipelines/references/research-pass.md`
- `~/.codex/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `~/.codex/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `~/.agents/skills/axi/SKILL.md`
- `~/.codex/sentrux/SKILL.md`

Issue and context files read for protocol grounding:

- `.ai/issues/refine/ISSUE-018-goal-start-in-worktree.md`
- `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`
- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`

## Extracted governing requirements

From `AGENTS.md` and `.ai/.pi-goals/create-issue-doc.md`:

- Use `.ai/.pi-goals/create-issue-doc.md` for issue creation/refinement.
- Produce visible workflow artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/`.
- Verify artifacts are trackable with `git status --short --untracked-files=all` and `git check-ignore -v`.
- For architecture-sensitive `pi-goals` planning, run Sentrux against `.pi/extensions/goal` as a quality sensor.
- Do not treat queue prose as direct goals when it semantically matches reusable workflows.

From `$feature-workflow-pipelines`:

- The issue doc is the canonical planning doc.
- Execution-ready means design-ready, not merely proof-shaped.
- Meaningful design forks must be locked before marking execution-ready.
- Research must be grounded in live code/docs and written back to the canonical issue.
- Proof threat models must be adversarial: primary invariant, false-green risks, deterministic/live proof adequacy, and proof rows that would fail if the invariant is wrong.
- For Solo/TLO-style execution, include an importable `required_proofs[]` TOON block.
- TOON blocks must be real TOON syntax with `toon.version: 1`, not Markdown bullets.

From `$axi`:

- Agent-facing CLI/tool output should be concise, explicit, non-interactive when automation needs flags, and structured enough for agents.
- Errors should be actionable and avoid raw dependency leakage.
- Defaults should show current state/content first, not force follow-up discovery.

From `$sentrux`:

- Use `sentrux gate --save .pi/extensions/goal` before architecture-sensitive planning/changes.
- Treat Sentrux as a sensor; record pass/fail and do not overclaim architecture correctness.

## Protocol consequences for ISSUE-018

- The open issue must lock command/tool surface, branch/path naming, session handoff, dirty-source handling, cleanup policy, and ISSUE-019 boundary.
- It must not leave “spawn vs switch vs helper” as an implementer choice.
- The validation plan must include at least one probe that would fail if worktree creation can lose or mix user work.
- Because worktree starts create filesystem and branch state, live disposable proof plus cleanup should be required unless the implementation is explicitly dry-run-only.
