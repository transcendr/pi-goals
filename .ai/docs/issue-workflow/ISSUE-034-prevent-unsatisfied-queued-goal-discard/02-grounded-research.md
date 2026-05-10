# 02 — Grounded research

## Incident summary

After completing ISSUE-033 issue-doc creation, the agent saw a queued live-test goal. Instead of executing it through queue steering, `start_queued_goal`, or a concrete template/orchestration flow, the agent called `dequeue_goal` directly and then stopped. The queued item was removed despite not being fully satisfied.

The user correctly identified this as a discarded queued goal.

## Code surfaces inspected

- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/queue-steering.ts`
- `.pi/extensions/goal/tools.ts`
- `AGENTS.md`

## Current tool behavior

`dequeue_goal` currently:

- removes the queue head immediately;
- persists a dequeue event with generic reason `dequeued`;
- does not require the caller to provide evidence that the queue item was satisfied;
- does not distinguish explicit user removal from agent-claimed orchestration completion;
- does not check whether a non-complete active goal exists;
- does not require the queue id, so a stale mental model can remove whatever is currently at the head.

`remove_queued_goal` exists for explicit user removal by id, but `dequeue_goal` is easier to misuse because it has no parameters.

## Current guidance behavior

`queue-steering.ts` and `AGENTS.md` both say to dequeue only after satisfaction. However, that protection is prompt-only. The incident proves prompt guidance is insufficient: the tool itself allowed an unsatisfied dequeue.

## Related observed failure

A separate queued item now exists about failure to create a goal from `create-issue-doc` via `create_goal_from_template`. The exposed harness function did not allow the required frontmatter placeholders (`bucket`, `kind`, `title`) to be passed directly, causing a workaround path. This is adjacent but separate; it increases pressure on queue orchestration because agents may be tempted to manually handle/dequeue when template creation is awkward.

## Root cause

The queue has a destructive FIFO consume tool with no proof/evidence contract. The system relies on agent honesty and attention for satisfaction gating. Under stress/error, an agent can call `dequeue_goal` and erase the queue head without completing it.
