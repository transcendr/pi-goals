# 00 — Request intake

Request: pick the next highest-leverage refine-bucket issue and run `create-issue-doc` with a 15-minute minimum time floor.

Selected issue: `.ai/issues/refine/ISSUE-021-goal-completion-proofs.md`.

Selection rationale:
- Priority P1.
- Recent completed work on minimum completion floors and the new ISSUE-037 queue-continuation bug both show that `update_goal(status:"complete")` needs stronger runtime gates than model judgment alone.
- Completion proofs are a foundational capability that can reduce false-green completions across future goals, queues, issue execution, and long-running Solo workflows.

Target path remains existing refine issue:
- `.ai/issues/refine/ISSUE-021-goal-completion-proofs.md`

Workflow dir:
- `.ai/docs/issue-workflow/ISSUE-021-goal-completion-proofs/`
