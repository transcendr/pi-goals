# 01 — Protocol read for ISSUE-019

## Files read fully or freshly present in context

Project/workflow files:

- `AGENTS.md`
- `.ai/.pi-goals/create-issue-doc.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/research-pass.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `/Users/bryan/.agents/skills/axi/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/sentrux/SKILL.md`

Issue/context files read:

- `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`
- `.ai/issues/open/ISSUE-018-goal-start-in-worktree.md`
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

From `$feature-workflow-pipelines`:

- The issue doc is the canonical planning doc.
- Execution-ready means meaningful product/API/architecture forks are locked.
- Research must be grounded in live code/docs and written back to the canonical issue.
- Proof threat models must name the primary invariant, false-green risks, deterministic/live proof adequacy, and proof rows that would fail if the invariant is wrong.
- For Solo/TLO-style execution, include an importable `required_proofs[]` TOON block.
- TOON blocks must be real TOON syntax with `toon.version: 1` and structured rows.

From `$axi`:

- Agent-facing command/tool output must be concise, structured, and actionable.
- List/default surfaces should expose enough aggregate state for agents to decide the next action without extra calls.
- Errors must be actionable and should not leak raw dependency noise.
- Non-interactive agent tool paths should use flags/parameters, while high-risk user-facing command paths may require explicit confirmation.

From `$sentrux`:

- Use `sentrux gate --save .pi/extensions/goal` before architecture-sensitive planning/changes.
- Treat Sentrux as a sensor; record pass/fail and do not overclaim architecture correctness.

## Protocol consequences for ISSUE-019

- The open issue must lock the first-pass multi-goal model rather than leaving “extend `GoalState` vs new runtime” unresolved.
- The issue must explicitly separate: nested subgoals (ISSUE-015), one-goal worktree adoption (ISSUE-018), sequential queue (fixed ISSUE-027), and parallel/multiple top-level goal orchestration (this issue).
- It must not permit silent paid/background model session spawning.
- It must include budget/spend controls and focus/context isolation proofs, because shallow quality checks cannot detect cross-goal steering leakage.
- If live parallel process/session behavior is implemented, a bounded live probe or explicit deterministic-coverage rationale is required.
