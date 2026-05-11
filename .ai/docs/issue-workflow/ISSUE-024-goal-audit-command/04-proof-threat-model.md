# 04 — Proof threat model

## Primary invariant

A user-requested goal audit produces a bounded, evidence-mapped completion-readiness review for the current goal without marking the goal complete, starting/resuming normal continuation, or bypassing paused/budget-limited controls.

## False-green risks

1. `/goal audit` accidentally uses continuation scheduling and continues work instead of auditing.
2. Audit prompt allows or encourages `update_goal(status:"complete")`.
3. Audit ignores proof/subgoal/floor/budget state and gives a shallow "looks done" response.
4. Audit prompt is not stale-guarded and reviews a replaced/cleared/different goal.
5. Audit records bloat `GoalState` snapshots or break replay.
6. Paused/budget-limited audit resumes work or monitor/continuation timers.
7. Slash command and model tool diverge.

## Proof strategy

Deterministic/static probes are sufficient for first implementation because this is a command/tool/prompt/state-seam feature. A bounded live probe is still required or explicitly skipped per project policy because slash commands and live runtime steering are touched.

## Required proof rows to carry into issue

- `quality_goal`: full extension quality gate.
- `audit_command_probe`: proves `/goal audit` is registered/autocompleted and does not call normal continuation scheduler.
- `audit_prompt_guard_probe`: proves audit prompt forbids completion and requires checklist/evidence states.
- `audit_tool_probe`: proves `audit_goal` tool exists and shares the same prompt path/guards.
- `audit_replay_probe`: proves bounded audit metadata replays without mutating `GoalState` status/objective.
- `paused_budget_audit_probe`: proves paused/budget-limited audits are read-only and do not resume/schedule continuation.
- `live_probe_or_skip`: records live `/goal audit` evidence or explicit deterministic-coverage skip rationale.

## Adequacy check

These proofs fail if the main invariant is broken because they cover the command/tool surfaces, prompt constraints, scheduling side effects, replay/persistence, status controls, and live runtime behavior.
