# 03 — Design lock

## Design landscape

Research plus owner discussion exposed five meaningful architecture forks:

```toon
toon.version: 1
forks[5]{id,decision_area,chosen,why}:
  "f1","input parsing ownership","canonical GoalIntent anti-corruption layer before domain mutation","prevents slash/tool/template/queue drift and fixes template directive loss"
  "f2","post-completion model","generic post-completion actions rather than single postCompletionContext field","context reset is first hook, not the only likely lifecycle behavior"
  "f3","continuation safety invariant","continuation ticket/outbox-style command captured before optional actions","guarantees queue handoff decision cannot be lost due to reset adapter errors"
  "f4","failure behavior","post-completion action failures are visible but non-blocking for expected continuation","matches owner requirement that errors from this functionality never affect guaranteed goal processing"
  "f5","rollout posture","feature-flagged strategy with no-op runner fallback","lets runtime reset/hook subsystem be killed without destabilizing core goals"
```

## Owner decision already captured

The owner explicitly selected a two-stage direction before this issue-doc goal:

- Fix the template directive compatibility issue without guessing.
- Design the structured model-tool/hooks API as part of a broader hooks/action system rather than a narrow one-off param.

The later queue item asks for the broader feature rewrite issue from scratch, using current implementation only as anti-pattern evidence. This design lock therefore treats the broader hook/action architecture as the canonical target, while allowing implementation to land in safe staged slices.

## Locked architecture pattern mapping

```toon
pattern_mapping[9]{pattern,implementation_role,non_ad_hoc_constraint}:
  "Functional Core, Imperative Shell","pure functions decide intent parsing, continuation tickets, action eligibility; Pi operations stay in shell adapters","unit probes can prove decisions without navigateTree/UI/session side effects"
  "Anti-Corruption Layer","GoalIntent normalizes slash commands, model tools, template invocations, and queue items","domain creation code receives one shape, not route-specific prose"
  "Command Pattern","ContinuationTicket represents queue handoff/continue/noop as a command object","continuation becomes explicit and inspectable before optional effects"
  "Outbox Pattern (in-process)","terminal workflow captures/persists or at least materializes continuation intent before running optional actions","lost reset or thrown exception cannot erase the continuation decision"
  "Process Manager / Saga","post-completion orchestrator coordinates terminal goal handling, optional actions, and ticket dispatch","ordered workflow is centralized instead of scattered if-blocks"
  "Ports and Adapters","PostCompletionActionRunner port hides navigateTree/context-reset adapter","lifecycle depends on stable result contract, not Pi tree details"
  "Bulkhead Pattern","context reset runner catches/timeouts/returns Result and cannot throw through core lifecycle","adapter failure is contained to action result/UI/telemetry"
  "Feature Toggle + Strategy Pattern","flag selects noop runner vs action runner/context reset adapter","runtime kill switch is at composition boundary, not scattered ifs"
  "Result / Railway-Oriented Programming","action execution returns typed success/failure/skipped data","errors are data for telemetry/UI, not control flow that skips continuation"
```

## Chosen target design

### 1. Canonical goal intent

All creation/start/enqueue paths normalize through a shared input layer before creating or mutating goal state:

```ts
type GoalIntent =
  | {
      kind: "direct";
      objective: string;
      budgets?: GoalBudgetSpec;
      postCompletionActions: PostCompletionActionSpec[];
    }
  | {
      kind: "template";
      template: string;
      flags: Record<string, string>;
      args: string;
      budgets?: GoalBudgetSpec;
      postCompletionActions: PostCompletionActionSpec[];
    };
```

Trailing prose directives remain supported, but they are parsed from the raw user/tool/template invocation before expansion can relocate them. Structured params normalize into the same action list.

### 2. Generic post-completion actions

Use an action model instead of adding more context-specific fields:

```ts
type PostCompletionActionSpec =
  | { type: "context.reset"; mode: "clear" | "summarize" };

type PostCompletionActionState = PostCompletionActionSpec & {
  id: string;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  failure?: string;
  completedAt?: number;
};
```

First implementation may migrate/bridge old fields for replay compatibility, but new logic should run from action specs/states.

### 3. Continuation ticket first

Terminal goal handling must decide expected continuation independently from optional post-completion actions:

```ts
type ContinuationTicket =
  | { kind: "queueHandoff"; reason: "goal-complete" | "goal-budget-limited"; goalId: string; queueId: string }
  | { kind: "continueGoal"; goalId: string; reason: ContinuationReason }
  | { kind: "none"; reason: string };
```

Workflow shape:

```ts
const ticket = decideContinuationTicket(getGoal(), getQueue(), eventContext);
const actionResults = await runPostCompletionActionsSafely(pi, ctx, goal, flags);
dispatchContinuationTicket(pi, ctx, ticket);
```

If the branch navigation changes state, the ticket must still be revalidated by identity/queue-id before dispatch; revalidation may skip stale work, but action errors must not be the skip reason.

### 4. Safe action runner boundary

```ts
interface PostCompletionActionRunner {
  run(input: PostCompletionActionRunInput): Promise<PostCompletionActionRunResult>;
}

type PostCompletionActionRunResult =
  | { ok: true; actionId: string; status: "done" | "skipped" }
  | { ok: false; actionId: string; status: "failed"; message: string; severity: "warning" };
```

The runner contract forbids throwing through the orchestrator. The orchestrator catches unexpected throws/timeouts and converts them into failed action results.

### 5. Feature flag / strategy boundary

Introduce a feature flag layer, with exact source to be chosen during implementation planning based on Pi extension config conventions. The important design is selection at composition boundary:

```ts
const actionRunner = flags.postCompletionActions
  ? createPostCompletionActionRunner(adapters)
  : createNoopPostCompletionActionRunner();
```

Context reset itself should also be independently kill-switchable if post-completion actions grow additional action types.

## Rejected alternatives

```toon
rejected[7]{id,alternative,reason}:
  "r1","keep context reset as a lifecycle gate","violates requirement that reset errors never affect guaranteed continuation"
  "r2","only add post_completion_context tool param","fixes tool ergonomics but leaves single-purpose state and lifecycle special-casing"
  "r3","parse summarize/clear anywhere in objective","risks false positives in ordinary objective text"
  "r4","parse directives only after template expansion","known failure when {{args}} appears before template tail"
  "r5","scatter feature flag checks across command/tools/lifecycle","creates branch-by-condition sprawl and does not isolate failures"
  "r6","make reset failure silent","would hide data loss/context surprises; failures must be visible even when non-blocking"
  "r7","reuse current probes unchanged","current probes assert blocked handoff; rewrite needs inverted/nonblocking assertions and behavioral probes"
```

## Deferred but explicit

```toon
deferred[3]{id,item,why_deferred}:
  "d1","multiple action types beyond context.reset","issue should design extensibility but first implementation only needs context.reset"
  "d2","persistent cross-reload outbox queue for tickets","in-process ticket may be enough if existing compaction continuation recovery is wired through the same decision path; implementation readiness should decide exact durability"
  "d3","public slash flags for actions","structured model-tool params and trailing prose cover immediate need; slash flag syntax can be future ergonomic polish"
```

## Execution-readiness verdict

Execution-ready after this design lock, subject to proof rows in the issue doc.

No meaningful product/API/architecture fork remains open for the implementation session:

- canonical intent layer is chosen;
- action model is chosen;
- continuation-ticket invariant is chosen;
- failure behavior is chosen as visible/non-blocking;
- feature-flag/strategy boundary is chosen;
- current implementation anti-patterns are identified as research evidence, not constraints to preserve.
