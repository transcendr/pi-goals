# 03 — Design Lock

## Decision context

The user explicitly rejected brittle prose parsing and tool proliferation. The desired product behavior is that plain queued prose remains flexible and can describe JIT orchestration that depends on context created by earlier goals.

## Options considered

### Option A — Prompt-guidance-only first pass using existing primitives

Add unconditional guidance to `queueSteeringContent` explaining that the next queued objective may be either:

- a direct goal suitable for `start_queued_goal`; or
- prose/JIT orchestration that should be semantically interpreted using current context.

For orchestration prose, the agent should create/start/enqueue the requested concrete goal(s) with existing goal tools and only call `dequeue_goal` after the orchestration item is fully satisfied. The guidance should explicitly say the orchestration item may require one or more consecutive active goals before it is dequeued.

Consequences:

- preserves prose as a feature;
- avoids parser heuristics;
- avoids new specialized tools;
- keeps `start_queued_goal` as the atomic direct-goal path;
- requires focused prompt/probe validation rather than state-machine changes.

### Option B — Add a parser/heuristic classifier for prose orchestration

Detect text such as "create a goal from template" or template names inside queued objectives and branch in code.

Rejected because:

- brittle and incomplete;
- would encode natural-language intent in ad hoc string checks;
- cannot reliably handle future user phrasing;
- conflicts with the user's explicit requirement that prose interpretation is agent-owned.

### Option C — Add specialized queue expansion/reordering tools now

Add first-class parameters such as `prependAfterStart`, queue-head resolution overrides, or queue insertion operations.

Rejected for first pass because:

- over-designed for the demonstrated workflow;
- existing tools can already create the immediate JIT goal and leave later queue tail items in place;
- expansion-before-tail can be revisited only if a concrete workflow requires multiple queued follow-ups rather than consecutive active goals.

### Option D — Treat all plain queued objectives as direct goals

Keep current behavior and rely on the agent to infer orchestration despite no steering guidance.

Rejected because:

- current steering actively says "start the next queued goal," nudging the agent toward the wrong interpretation for orchestration prose;
- the use case should be first-class and explicit in injected guidance.

## Locked design choice

Choose **Option A: prompt-guidance-only first pass using existing primitives**.

## Locked implementation shape

- Primary edit: `.pi/extensions/goal/queue-steering.ts`, specifically `queueSteeringContent()`.
- Keep the `goal.template` branch, but supplement it with unconditional prose-orchestration guidance before branch-specific steps.
- Keep `start_queued_goal` as the recommended path for direct queued goals.
- For prose/JIT orchestration guidance, instruct the agent to:
  - read the queued objective semantically using current context;
  - if it is direct, use `start_queued_goal`;
  - if it is orchestration, create/start/enqueue the requested concrete goal(s) with existing goal tools;
  - allow one orchestration queue item to require one or more consecutive active goals before dequeue;
  - call `dequeue_goal` only after the orchestration item is satisfied;
  - leave the queue item in place when blocked or uncertain.
- Do not add new parser code.
- Do not add new tools in this issue.
- Do not change FIFO queue persistence/order.

## Proof consequences

- A focused steering-content probe must fail if non-template queue steering lacks orchestration guidance.
- Existing template steering expectations must still pass.
- `npm run quality:goal` remains the required quality gate after implementation.

## Execution-readiness conclusion

Execution-ready. The user has already made the key product/API choice: prose remains flexible and agent-interpreted, not code-parsed. Implementation can proceed without additional owner clarification.
