# 04 — Proof threat model

Primary invariant:
- When a goal completes or is cleared and the queue is non-empty, the agent receives a steering message that makes the next queued goal actionable immediately.

False-green risks:
- UI notification exists but no agent-context steering is injected.
- Steering mentions a queue exists but omits the next goal objective or queue id.
- Template-origin queued goals are steered toward `create_goal`, losing template behavior.
- Steering repeatedly fires every turn after completion.
- The queue item is removed before a new goal is actually created, losing work if creation fails.

Proof strategy:
- Add focused queue steering probe(s) that stub `pi.sendMessage()` and capture custom message payloads/options.
- Simulate completion/clear with queued goals and assert `deliverAs: "steer"`.
- Assert the content includes next queue id/objective and template-origin instruction when metadata exists.
- Assert no destructive dequeue happens merely because steering was injected.

required_proofs[3]{name,command,condition}:
  queue_completion_steer_probe,"NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-completion-steer-probe.cjs","exit 0; completion with queued goal injects steer message with queue id objective and no dequeue"
  queue_template_steer_probe,"NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-template-steer-probe.cjs","exit 0; template-origin queued goal steering explicitly instructs create_goal_from_template"
  quality_goal,"npm run quality:goal","exit 0; Sentrux slop TypeScript and Pi load gates pass"
