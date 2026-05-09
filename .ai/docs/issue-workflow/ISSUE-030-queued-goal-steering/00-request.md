# 00 — Request intake

User-reported queue behavior gap: when a queued goal exists and the current active goal completes, the agent stops and is not made aware of the queue. The extension should inject a steering message, like auto-continuation, telling the agent about the next queued goal and instructing it to continue by creating it. If the queued item came from a reusable prompt/template, the steering must reinforce `create_goal_from_template` rather than normal `create_goal`.

Parsed inputs:
- bucket: open
- kind: feature
- title: Start queued goals via steering after completion
- issue: ISSUE-030
- issue path: `.ai/issues/open/ISSUE-030-queued-goal-steering.md`
- artifact dir: `.ai/docs/issue-workflow/ISSUE-030-queued-goal-steering/`

Clarification: not needed. The desired queue continuation semantics are explicit.
