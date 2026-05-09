# 03 Design lock

## Options considered

1. Full multi-goal runtime now.
   - Pros: could subsume queue, parallel goals, worktrees, and focus management.
   - Cons: much larger than request; overlaps ISSUE-019 refine work; would force unresolved parallel/session architecture decisions.
   - Rejected for first pass.

2. Simple persisted FIFO queue of future objectives in the existing single-goal runtime.
   - Pros: directly matches user request; preserves one active goal invariant; small enough for execution-ready implementation; can support users and agents.
   - Cons: not parallel; requires clear auto-advance behavior.
   - Chosen.

3. Non-persistent in-memory queue only.
   - Pros: fastest.
   - Cons: queued goals would disappear on reload and fail the reviewable/auditable requirement.
   - Rejected.

4. Automatically create the next goal immediately on complete/clear without agent involvement.
   - Pros: simple runtime transition.
   - Cons: user asked for agent awareness and instructions injected into context; immediate creation risks surprising replacement/continuation semantics.
   - Rejected for first pass.

## Locked design

First-pass ISSUE-027 should add a persisted FIFO goal queue while preserving the invariant that only one goal is active at a time.

Data model:
- Add `QueuedGoal` records with stable id, objective, createdAt, source (`command`/`tool`), optional budgets, and status (`queued`).
- Persist queue mutations durably and replay them into runtime state. Prefer a separate custom entry type such as `pi-goal-queue-state` or a clearly versioned queue event helper rather than overloading active-goal telemetry.

Command surface:
- `/goal queue` with no extra text lists the queue.
- `/goal queue <objective-or-template>` resolves templates like normal `/goal <text>` and enqueues the resolved objective.
- When `/goal <objective>` is entered while a current goal exists, replacement confirmation should offer three outcomes: replace, queue, cancel. Choosing queue enqueues the validated/resolved objective without replacing current goal.

Tool surface:
- Add model-facing queue tools or equivalent API: list queued goals, enqueue goal, remove/dequeue if safe.
- Agent enqueuing should use the same validation/resolution/persistence path as command enqueuing.

Auto-advance:
- When a goal becomes complete or is cleared and the queue is non-empty, inject a dedicated hidden follow-up/steering message telling the agent the next queued objective is available and instructing it to create/start that goal explicitly.
- Do not silently start the queued goal without agent context; the agent must see the queue item and act audibly.
- Stale guard the prompt by queued goal id and current active-goal absence/completion state.

UI/context:
- Queue should be visible via `/goal queue`, tool listing, and optionally concise status/widget indication such as `queue: N`.
- Current active goal remains the primary widget; queue awareness should be compact.

## Deferred

- Parallel multi-agent execution and per-goal worktrees remain with ISSUE-019.
- External watcher triggers remain with ISSUE-023.
- Rich queue editing/reordering can be deferred unless trivial; first pass needs enqueue, list, and safe remove/dequeue.
