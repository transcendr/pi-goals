# 00 — Request intake

## Parsed request

Queue item `q-1778443864560-6` asked to pick the next most valuable / highest-leverage issue from `.ai/issues/refine` and run the reusable `create-issue-doc` goal with a minimum time of 15 minutes.

## Queue classification

- Classification: orchestration/JIT reusable workflow request, not a direct one-off goal.
- Reason: the queue text explicitly says to run `create-issue-doc`, which matches `.ai/.pi-goals/create-issue-doc.md` (`aliases: issue-doc,new-issue,plan-issue`).
- Action taken: used `create_goal_from_template`, not `start_queued_goal`.
- Queue handling rule: keep `q-1778443864560-6` at the head until this concrete ISSUE-015 refinement goal is actually satisfied, then `dequeue_goal` exactly once.

## Issue choice

Selected `.ai/issues/refine/ISSUE-015-goal-subgoals.md`.

Rationale:
- It is P1 in the refine bucket.
- It affects persistence, tools, UI, progress, completion audits, and reusable workflow orchestration.
- It is an explicit dependency/overlap surface for `.ai/issues/refine/ISSUE-022-goal-history-checkpoints-and-compaction.md` and `.ai/issues/refine/ISSUE-024-goal-audit-command.md`.
- Recent queue/proof/floor work made nested workflow semantics more important: a blocking prerequisite should not require replacing the active top-level goal.

## Concrete goal invocation

Template: `create-issue-doc`

Args:

```text
--bucket refine --kind feature --title "Goals with agent-managed subgoals" -- Refine existing issue .ai/issues/refine/ISSUE-015-goal-subgoals.md into a stronger canonical issue doc. This is selected as the next highest-leverage refine-bucket issue because it is P1, affects persistence/tools/UI/progress/completion audits, and is a prerequisite or overlap surface for ISSUE-022 history/checkpoints and ISSUE-024 goal audit. Ground the refinement in current pi-goals code and related fixed/refine issues, preserve visible issue-workflow artifacts, lock data model/tool/UI design choices enough for execution readiness if possible, and include proof threat model plus required proofs.
```

Minimum time floor: 15 minutes.

## Clarification / owner decision

No clarification was needed for the issue path or template inputs: required values were derivable from the queue text and current issue inventory.

A design-lock owner decision was still collected because the first-release subgoal execution model is high-impact architecture. The chosen model was: **nested child goal runtime inside parent**.
