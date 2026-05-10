# 00 — Request intake

User observed a bug: after the active reload goal `q-1778443864560-4` was marked complete, `/goal queue` still had two queued goals (`q-1778443864560-5` and `q-1778443864560-6`), yet the agent was allowed to stop and no effective auto-continuation/queue-steering message forced continuation.

Requested action:
- Run `create-issue-doc` next.
- Create an open issue doc investigating this scenario and the missing steering/autocontinuation.
- Then immediately continue with the remaining queue.

Chosen issue number/path:
- Issue: `ISSUE-037`
- Bucket: `open`
- Path: `.ai/issues/open/ISSUE-037-goal-queue-auto-continuation-after-complete.md`
- Workflow dir: `.ai/docs/issue-workflow/ISSUE-037-goal-queue-auto-continuation-after-complete/`

Assumptions:
- The bug is in `pi-goals` queue steering/continuation semantics after `update_goal(status:"complete")` when queued goals remain.
- The screenshot path supplied by the user is supporting evidence; the text in the user message is treated as primary observed behavior.
