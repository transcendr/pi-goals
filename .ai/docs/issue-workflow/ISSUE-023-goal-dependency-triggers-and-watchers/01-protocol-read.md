# 01 — Protocol read for ISSUE-023

## Files read fully or freshly present in context

Project/workflow files:

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

Issue/context files read so far:

- `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`

Additional code and issue research is recorded in `02-grounded-research.md`.

## Extracted governing requirements

From `AGENTS.md` and `.ai/.pi-goals/create-issue-doc.md`:

- Use `.ai/.pi-goals/create-issue-doc.md` for issue creation/refinement.
- Produce visible workflow artifacts under `.ai/docs/issue-workflow/ISSUE-NNN-<slug>/`.
- Verify artifacts are trackable with `git status --short --untracked-files=all` and `git check-ignore -v`.
- For architecture-sensitive pi-goals planning, run Sentrux against `.pi/extensions/goal` as a quality sensor.
- Do not use hidden or ignored artifacts as proof of workflow completion.

From `$feature-workflow-pipelines`:

- The issue doc is the canonical planning doc.
- Execution-ready means meaningful product/API/architecture forks are locked.
- Research must be grounded in live code/docs and written back to the canonical issue.
- Design locking must choose a path rather than leaving alternatives for the implementer.
- Proof threat models must name the primary invariant, false-green risks, deterministic/live proof adequacy, and proof rows that would fail if the invariant is wrong.
- Solo/TLO-style execution issues should include an importable `required_proofs[]` TOON block.
- TOON blocks must be real TOON syntax with `toon.version: 1` and structured rows.

From `$axi`:

- Agent-facing command/tool output should be concise, structured, and actionable.
- List/default surfaces should provide enough aggregate state for agents to decide the next action without extra calls.
- Mutations must be non-interactive and flag/parameter driven.
- Errors should be structured/actionable and not leak raw dependency noise.

From `$sentrux`:

- Use `sentrux gate --save .pi/extensions/goal` before architecture-sensitive planning/changes.
- Treat Sentrux as a sensor, not proof of feature correctness.
- Record pass/fail and address structural degradation if implementation later changes code.

## Protocol consequences for ISSUE-023

- The open issue must lock the first watcher release rather than leave watcher type/executor/persistence choices open.
- The issue must explicitly separate idle waiting (ISSUE-016), top-level multi-goal ownership (ISSUE-019), queue behavior (ISSUE-027), and watcher-triggered nudges (ISSUE-023).
- Watchers must be opt-in, bounded, visible, cancelable, stale-guarded by goal id, timeout-limited, and reload-safe.
- If any watcher executes commands, proofs must cover command timeouts, output caps, environment/cwd ownership, and failure/no-match handling.
- If live runtime behavior changes in implementation, a live probe or explicit deterministic-coverage skip is required.
