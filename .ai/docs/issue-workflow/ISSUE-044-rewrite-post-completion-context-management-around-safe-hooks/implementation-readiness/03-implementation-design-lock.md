# 03 — Implementation design lock

## Status

Implementation-ready design is locked.

One owner decision was needed during this pass: rollout flag contract. The owner chose default-on kill switches.

## Exact implementation approach

### 1. Canonical intent/action normalization

Create `.pi/extensions/goal/goal-intent.ts` as the anti-corruption layer for all input paths.

Locked exports:

```ts
export type GoalBudgetSpec = {
  tokenBudget?: number;
  timeBudgetSeconds?: number;
  minTokensBeforeWrapUp?: number;
  minTimeSecondsBeforeWrapUp?: number;
};

export type GoalIntent =
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

export type GoalIntentResult =
  | { ok: true; intent: GoalIntent }
  | { ok: false; error: string };
```

Functions:

```ts
export function parseTrailingPostCompletionDirective(input: string): ParsedDirectiveResult;
export function normalizePostCompletionActionSpecs(input: PostCompletionActionInput): ActionSpecResult;
export function buildDirectGoalIntent(input: DirectGoalIntentInput): GoalIntentResult;
export function buildTemplateGoalIntent(input: TemplateGoalIntentInput): GoalIntentResult;
export function mergePostCompletionActionSpecs(left: PostCompletionActionSpec[], right: PostCompletionActionSpec[]): ActionSpecResult;
```

Rules:

- trailing prose directive grammar remains the current grammar: `and summarize context`, `and summarize the context`, `and clear context`, `and clear the context`, optional final punctuation;
- directives are stripped from raw direct objective or raw template invocation args before template expansion;
- duplicate same-mode `context.reset` actions are deduped;
- conflicting `clear` vs `summarize` actions from prose/structured params fail actionably;
- `none` means no action and conflicts with a non-empty explicit action list;
- no parser may infer action from a non-trailing mention.

### 2. Template parsing support

Edit `.pi/extensions/goal/templates.ts` to export the template invocation parser rather than duplicating parsing in `goal-intent.ts`.

Locked change:

```ts
export type GoalTemplateInvocation = {
  name: string;
  flags: Record<string, string>;
  args: string;
};

export function parseGoalTemplateInvocation(input: string): GoalTemplateInvocation | undefined;
```

Existing `resolveGoalTemplateInvocation` and `resolveGoalTemplateInvocationArgs` continue to work, but command/tool paths should use the exported parser when they need to strip post-completion directives before expansion.

### 3. Action model in shared types

Edit `.pi/extensions/goal/types.ts`.

Locked canonical types:

```ts
export type PostCompletionActionType = "context.reset";
export type ContextResetMode = "clear" | "summarize";

export type PostCompletionActionSpec =
  | { type: "context.reset"; mode: ContextResetMode };

export type PostCompletionActionStatus = "pending" | "running" | "done" | "failed" | "skipped";

export type ContextResetPostCompletionActionState = {
  id: string;
  type: "context.reset";
  mode: ContextResetMode;
  status: PostCompletionActionStatus;
  anchorEntryId?: string;
  capabilitySource?: GoalContextResetCapabilitySource;
  failure?: string;
  skippedReason?: string;
  completedAt?: number;
  updatedAt?: number;
};

export type PostCompletionActionState = ContextResetPostCompletionActionState;
```

`GoalState` gets:

```ts
postCompletionActions?: PostCompletionActionState[];
```

Keep legacy ISSUE-043 fields as optional compatibility fields for replay and migration:

```ts
postCompletionContext?: GoalPostCompletionContextPolicy;
contextResetAnchorEntryId?: string;
contextResetCapabilitySource?: GoalContextResetCapabilitySource;
contextResetStatus?: GoalContextResetStatus;
contextResetFailure?: string;
contextResetCompletedAt?: number;
```

Do not remove them in this implementation. Mark them conceptually deprecated in comments if comments are used.

`QueuedGoal` stores action specs:

```ts
postCompletionActions?: PostCompletionActionSpec[];
```

Keep `postCompletionContext?: GoalPostCompletionContextPolicy` for legacy replay.

### 4. State and queue replay compatibility

Edit `.pi/extensions/goal/state.ts` and `.pi/extensions/goal/queue-state.ts`.

Locked behavior:

- new goal creation writes `postCompletionActions` only for canonical behavior;
- `toGoalState` parses `postCompletionActions` when present;
- if `postCompletionActions` is absent and legacy `postCompletionContext` is `clear|summarize`, synthesize a single `context.reset` action state;
- synthesized legacy action state maps:
  - legacy `contextResetStatus` undefined => `pending`;
  - `pending` => `pending`;
  - `done` => `done`;
  - `failed` => `failed`;
  - legacy anchor/capability/failure/completed fields map to action fields;
- `toQueuedGoal` parses `postCompletionActions` when present;
- if queued `postCompletionActions` is absent and legacy `postCompletionContext` is `clear|summarize`, synthesize a single `context.reset` spec.

### 5. Post-completion action runner

Create `.pi/extensions/goal/post-completion-actions.ts`.

Locked exports:

```ts
export type PostCompletionActionRunResult =
  | { ok: true; actionId: string; status: "done" | "skipped"; message?: string }
  | { ok: false; actionId: string; status: "failed"; message: string; severity: "warning" };

export type PostCompletionActionRunner = {
  run(input: PostCompletionActionRunInput): Promise<PostCompletionActionRunResult>;
};

export function createPostCompletionActionStates(specs: PostCompletionActionSpec[], now?: number): PostCompletionActionState[];
export function getRunnablePostCompletionActions(goal: GoalState): PostCompletionActionState[];
export function recordPostStartActionAnchors(pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState, reason: PiGoalEventReason): GoalState;
export async function runPostCompletionActionsSafely(pi: ExtensionAPI, ctx: ExtensionContext, goal: GoalState | null, reason: PiGoalEventReason, runner: PostCompletionActionRunner): Promise<GoalState | null>;
export function createNoopPostCompletionActionRunner(disabledReason: string): PostCompletionActionRunner;
```

Rules:

- actions run only for `goal.status === "complete"`;
- runner exceptions are caught and converted to failed action results;
- failed/skipped action states are terminal for action execution and do not count as pending reset gates;
- warnings are visible but nonblocking;
- action state persistence uses `persistUpdateGoal` with reason `reset` for context reset action outcomes in this implementation.

### 6. Context reset adapter

Refactor `.pi/extensions/goal/context-reset.ts`.

Locked ownership:

- keep command-context capability capture functions:
  - `captureContextResetCommandContext`
  - `clearContextResetCommandContext`
  - `getContextResetCapabilityStatus`
  - `getContextResetCapabilitySource`
  - `hasContextResetCapability`
- keep/specialize anchor support for `context.reset` action states;
- remove generic parser ownership; parser moves to `goal-intent.ts`;
- replace `needsPostCompletionContextReset` and `attemptPostCompletionContextReset` call sites with action-runner use.

New adapter export:

```ts
export function createContextResetActionRunner(flags: GoalFeatureFlags): PostCompletionActionRunner;
```

Context reset disabled by flag returns `{ ok: true, status: "skipped" }` with a disabled/skipped reason, not an error.

Context reset runtime failure returns `{ ok: false, status: "failed", severity: "warning" }`, persists failure state through the safe runner, and never decides queue handoff.

### 7. Feature flags

Create `.pi/extensions/goal/feature-flags.ts`.

Locked contract from owner interview:

```ts
export type GoalFeatureFlags = {
  postCompletionActions: boolean;
  contextReset: boolean;
};

export function getGoalFeatureFlags(env?: NodeJS.ProcessEnv): GoalFeatureFlags;
```

Environment variables:

```toon
flag_contract[2]{flag,default,disabled_values,effect}:
  "PI_GOAL_POST_COMPLETION_ACTIONS","enabled","0,false,no,off","select no-op/skipping action runner while preserving continuation"
  "PI_GOAL_CONTEXT_RESET","enabled","0,false,no,off","skip context.reset actions while preserving other action types and continuation"
```

Any value other than the disabled values is treated as enabled. Unset is enabled.

### 8. Continuation tickets

Create `.pi/extensions/goal/continuation-ticket.ts`.

Locked exports:

```ts
export type ContinuationTicket =
  | { kind: "queueHandoff"; reason: GoalQueueSteeringReason; goalId: string; queueId: string; triggerTurn?: boolean; deliverAs?: "steer" | "followUp"; force?: boolean }
  | { kind: "none"; reason: string };

export function decideTerminalContinuationTicket(goal: GoalState | null, queue: QueuedGoal[], opts: ContinuationTicketOptions): ContinuationTicket;
export function revalidateContinuationTicket(ticket: ContinuationTicket, goal: GoalState | null, queue: QueuedGoal[]): { ok: true } | { ok: false; reason: string };
export function dispatchContinuationTicket(pi: ExtensionAPI, ticket: ContinuationTicket): boolean;
```

Locked behavior:

- `queueHandoff` ticket includes queue head id and goal id;
- revalidation skips only for stale state-machine reasons: no queue, queue changed, missing goal, goal id changed, or incompatible terminal status;
- action failure/skipped/disabled status is never a revalidation skip reason;
- no persistent ticket event in this implementation: the ticket is in-process and recomputable from persisted goal/queue state by normal lifecycle/recovery paths.

### 9. Terminal workflow boundary

Create `.pi/extensions/goal/terminal-workflow.ts` to keep `lifecycle.ts`, `tools.ts`, and `queue-tools.ts` thin.

Locked export:

```ts
export async function processTerminalGoalWorkflow(pi: ExtensionAPI, ctx: ExtensionContext, input: TerminalGoalWorkflowInput): Promise<GoalState | null>;
```

Responsibilities:

1. decide a continuation ticket before optional action execution;
2. run post-completion actions safely through selected runner;
3. sync UI after action state changes;
4. revalidate and dispatch the ticket.

`lifecycle.ts`, `tools.ts`, `queue-tools.ts`, and `continuation.ts` should call ticket/workflow helpers instead of importing context-reset gate functions.

### 10. Tool schemas

Edit `tools.ts` and `queue-tools.ts` schemas.

Add both a simple compatibility field and canonical action field:

```ts
const PostCompletionContextParam = Type.Union([
  Type.Literal("none"),
  Type.Literal("clear"),
  Type.Literal("summarize"),
]);

const PostCompletionActionParam = Type.Object({
  type: Type.Literal("context.reset"),
  mode: Type.Union([Type.Literal("clear"), Type.Literal("summarize")]),
});

post_completion_context: Type.Optional(PostCompletionContextParam)
post_completion_actions: Type.Optional(Type.Array(PostCompletionActionParam))
```

Apply to:

- `create_goal`
- `create_goal_from_template`
- `enqueue_goal`

Do not add these to `update_goal` in this issue; editing post-completion actions after creation is deferred unless required by implementation discoveries.

### 11. Entrypoint strategy selection

Edit `.pi/extensions/goal/index.ts`.

Locked composition:

- call `getGoalFeatureFlags()` once in extension factory;
- create runner strategy:
  - if `postCompletionActions` false: `createNoopPostCompletionActionRunner("disabled by PI_GOAL_POST_COMPLETION_ACTIONS")`;
  - else create context reset runner with flags;
- pass runner/workflow dependencies into command/tools/lifecycle runtime wiring as needed.

## Meaningful alternatives considered and rejected

```toon
toon.version: 1
alternatives[6]{alternative,decision,reason}:
  "default-off post-completion actions",rejected,"would disable already-shipped ISSUE-043 behavior unless users opt in"
  "Pi settings.json flag",rejected,"extension docs/types inspected do not expose a direct settings getter; would add extra Pi API dependency"
  "persisted continuation-ticket state event",deferred,"in-process ticket plus recomputation from persisted goal/queue state is enough for first pass and avoids branch-navigation replay complexity"
  "only post_completion_context param",rejected,"not extensible and conflicts with hooks direction"
  "QueuedGoal discriminated union replacement",deferred,"larger migration; first pass adds canonical actions while preserving legacy objective/template fields"
  "run actions for budgetLimited goals",rejected,"context reset is post-completion behavior; budget-limited handoff uses continuation tickets but skips post-completion actions"
```

## Unresolved forks

None that block implementation.

Implementation details left to the coding session are local and constrained:

- exact helper function names may vary if semantics remain equivalent;
- action state id format can be `crypto.randomUUID()` or deterministic per action index, provided replay/probes are stable;
- probes may be static or behavioral depending on module export feasibility, but must prove the listed pass conditions.
