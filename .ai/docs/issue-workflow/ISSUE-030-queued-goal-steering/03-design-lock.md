# 03 — Design lock

Options considered:

1. Automatically create the next queued goal inside the extension when current goal completes.
   - Rejected for first pass: would mutate active goal state autonomously and may bypass model/tool guidance, especially template-origin behavior.

2. Inject a steering message that tells the agent the next queued goal and instructs it to create it immediately.
   - Chosen: matches user request and existing pi-goal steering patterns.
   - Keeps the agent aware and auditable while letting normal tools create the next goal.

3. Only show a UI notification that queued goals exist.
   - Rejected: the agent may stop and never see/action UI-only notification as execution context.

Locked choice:
- On current goal completion and on explicit clear when queue is non-empty, inject a hidden steering message with `deliverAs: "steer"` describing the next queued goal and instructing immediate continuation.

Design details:
- The first queued item remains queued until the agent successfully creates/dequeues it; avoid losing queued work merely by injecting steering.
- The steering must include queue id, objective preview/full objective within safe bounds, budgets if set, and whether template metadata exists.
- If template metadata exists, steering must explicitly instruct the agent to use `create_goal_from_template` with the stored template/flags/args rather than `create_goal`.
- If only resolved objective exists, steering may instruct `create_goal` or `dequeue_goal` + `create_goal` depending on the final implementation contract.
- Use a distinct custom message type/prompt id for queue steering for probes and future filtering.
- Avoid repeated steering loops: record enough queue/goal state or inject only at completion/clear transition.

Execution-ready: yes, with implementation detail left to choose exact helper names.
