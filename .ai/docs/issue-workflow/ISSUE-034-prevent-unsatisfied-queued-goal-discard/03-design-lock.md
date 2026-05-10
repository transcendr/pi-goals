# 03 — Design lock

## Options considered

### Option A — Strengthen prompt guidance only

Add stronger warnings to `dequeue_goal`, queue steering, and `AGENTS.md`.

Rejected as insufficient. Prompt guidance already existed and still failed.

### Option B — Remove `dequeue_goal`

Force all queue consumption through `start_queued_goal` or `remove_queued_goal`.

Rejected because prose/JIT orchestration genuinely needs a way to consume one queue item after one or more concrete goals satisfy it.

### Option C — Make `dequeue_goal` proof-gated and queue-id-specific

Require callers to provide the expected `queueId`, a satisfaction reason, and/or evidence summary. Refuse to dequeue when the provided id is not the current head. Keep `remove_queued_goal` for explicit user removal by id.

Chosen.

## Locked remediation direction

Redesign `dequeue_goal` from a zero-argument destructive FIFO pop into an auditable consume operation.

Recommended shape:

- Parameters:
  - `queueId`: required expected queue head id.
  - `satisfaction`: required concise explanation of how the queued item was satisfied.
  - optional `evidence`: command, goal id, template name, or user instruction reference.
- Behavior:
  - refuse if queue is empty;
  - refuse if `queueId` is not the current head;
  - refuse or strongly warn if the current active goal is non-complete, unless the satisfaction explicitly cites a user removal instruction;
  - persist the satisfaction/evidence in the queue event details if state schema allows, or in a new event field.
- Tool metadata:
  - make `remove_queued_goal` the only path for explicit deletion/removal;
  - make `dequeue_goal` only for satisfied queue-head consumption.

## Additional mitigation

Consider renaming or adding a safer tool:

- `complete_queued_goal` / `consume_satisfied_queued_goal` for satisfaction-gated consumption;
- keep `dequeue_goal` as backward-compatible alias only if needed, but with required parameters.

Also strengthen live/probe coverage so a queue item cannot disappear without one of:

- `start_queued_goal` success;
- `dequeue_goal` with matching id and non-empty satisfaction evidence;
- `remove_queued_goal` with explicit user-request path.

## Non-goals

- Do not remove prose/JIT orchestration support.
- Do not make extension runtime parse arbitrary queue prose.
- Do not block legitimate manual consumption after a multi-goal orchestration is fully satisfied.
