# 02 — Grounded Research

## Commands and files inspected

Command transcript is in `raw/commands.log` and includes:

- `git status --short --untracked-files=all`
- `find .ai/issues -maxdepth 2 -type d | sort`
- next issue number discovery command
- `rg -n "queueSteeringContent|start_queued_goal|dequeue_goal|enqueue_goal|create_goal_from_template|registerGoalQueueTools" .pi/extensions/goal`
- `sentrux gate .pi/extensions/goal`

Files inspected directly:

- `.pi/extensions/goal/queue-steering.ts`
- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/templates.ts`
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`
- `.ai/issues/fixed/ISSUE-030-queued-goal-steering.md`
- `/tmp/pi-goal-queue-template-steer-probe.cjs`

## Live code findings

### Queue steering currently assumes the queue head is the goal to start

`queueSteeringContent()` in `.pi/extensions/goal/queue-steering.ts` currently renders:

- a queue id;
- optional budget line;
- objective preview;
- required next steps.

For structured template-origin entries (`goal.template` truthy), it instructs `start_queued_goal`, describes template re-resolution, and has a fallback to `create_goal_from_template` plus dequeue after successful creation.

For plain objective entries, it instructs `start_queued_goal` and says to leave the item in place if a non-complete active goal exists.

Missing live behavior: neither branch tells the agent that a plain objective may itself be orchestration prose that asks the agent to create/start/queue one or more goals from current context instead of starting the text itself as the next active goal.

### The atomic direct-goal path exists and should remain the simple-path default

`start_queued_goal` in `.pi/extensions/goal/queue-tools.ts`:

- refuses to start if a non-complete current goal exists;
- reads `getQueue()[0]`;
- re-resolves template metadata when present;
- creates a new goal;
- dequeues only after successful creation;
- schedules monitor/UI updates.

This is the correct path for direct queued goals and should remain first-class.

### Existing minimal primitives already support prose/JIT orchestration

The current model-facing tools already provide enough primitives for the desired flexible workflow:

- `create_goal` starts a concrete non-template goal when explicitly requested.
- `create_goal_from_template` starts a template-backed goal using structured flags/args and can replace a completed goal.
- `enqueue_goal` appends prose follow-up goals to the FIFO queue.
- `dequeue_goal` removes the queue head, and its prompt guidance already says to prefer `start_queued_goal` for normal handoff and use dequeue manually after separate successful handling.

The gap is guidance, not a missing parser or specialized expansion tool.

### Queue persistence/order is FIFO and should not be changed for this issue

`queue-state.ts` appends with `runtimeQueue.push(goal)`, consumes with `runtimeQueue.shift()`, and replay applies enqueue with `q.push(event.goal)` and dequeue with `q.shift()`.

The desired prose/JIT behavior does not require changing FIFO queue ordering.

### Template metadata support is separate from prose orchestration

`QueuedGoal` has optional `template`, `templateFlags`, and `templateArgs` fields. `queueSteeringContent` branches on this metadata, which works for requests already known to be template-backed at enqueue time.

The new requirement is intentionally different: a plain prose queued item may ask the agent to use a template later, after new context exists. No deterministic code check should try to infer that from text.

### Existing tests/probes cover template metadata steering but not prose orchestration guidance

`/tmp/pi-goal-queue-template-steer-probe.cjs` asserts that template-origin steering includes `start_queued_goal`, `create_goal_from_template`, template name, flags, and stale guard behavior.

Missing proof: a focused probe should assert that all queue steering content, including non-template queued objectives, includes unconditional guidance for semantic interpretation of direct versus orchestration queue items, and that orchestration items may remain queued across one or more consecutive goal creations until satisfied.

### Structural health baseline is good

`sentrux gate .pi/extensions/goal` reported no degradation:

- Quality: `6197 -> 6228`
- Coupling: `0.19 → 0.17`
- Cycles: `0 → 0`
- God files: `0 → 0`

This issue should preserve that modular health by limiting implementation to `queue-steering.ts` content and focused probes unless research during implementation discovers a small adjacent prompt-guideline need.

## Stable / missing / next plan update

stable[5]{id,finding}:
  "s1","FIFO queue storage and replay already exist and should remain unchanged"
  "s2","start_queued_goal is the atomic direct-goal handoff path"
  "s3","create_goal_from_template already supports JIT structured template creation"
  "s4","dequeue_goal already exists for manual consumption after separate handling"
  "s5","template metadata steering is already covered separately from prose orchestration"
missing[3]{id,gap}:
  "m1","queue steering does not unconditionally explain direct-goal versus orchestration-prose interpretation"
  "m2","queue steering does not explicitly permit one prose/JIT item to require multiple consecutive created goals before dequeue"
  "m3","no focused probe asserts prose/JIT orchestration guidance in non-template steering"
next_plan_update[3]{id,update}:
  "n1","lock a prompt-guidance-only first pass with no prose parser"
  "n2","require focused steering-content probe plus existing quality gate"
  "n3","keep new tools/reordering out of scope unless implementation research proves guidance cannot satisfy the behavior"
