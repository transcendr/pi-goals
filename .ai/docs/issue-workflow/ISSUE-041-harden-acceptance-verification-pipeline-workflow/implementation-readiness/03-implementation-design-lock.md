# 03 — Implementation design lock

## Status decision

ISSUE-041 is implementation-ready after this plan. Runtime and template implementation details are locked below; no future implementation agent should need to choose architecture, ownership, or patch strategy.

## Chosen implementation approach

Implement ISSUE-041 in four patch layers:

1. Runtime queue handoff helper and reason typing.
2. Terminal-status queue handoff and budget-limited replacement gates.
3. Acceptance-template prompt/worker launch hardening.
4. Deterministic probes plus live-probe instructions/evidence capture.

## Exact runtime design

### Queue handoff helper

Edit `.pi/extensions/goal/queue-steering.ts`.

Add a deduped helper beside `sendQueueSteering`:

```ts
export type QueueHandoffOptions = { triggerTurn?: boolean; goalId?: string };

let lastQueueHandoffKey: string | undefined;

export function sendQueueHandoff(pi: ExtensionAPI, reason: GoalQueueSteeringReason, opts: QueueHandoffOptions = {}): boolean {
  const next = getQueue()[0];
  if (!next) return false;
  const key = `${reason}:${opts.goalId ?? "none"}:${next.queueId}`;
  if (lastQueueHandoffKey === key) return false;
  const sent = sendQueueSteering(pi, reason, { triggerTurn: opts.triggerTurn ?? true });
  if (sent) lastQueueHandoffKey = key;
  return sent;
}
```

Patch boundaries:

- `sendQueueSteering` remains the raw sender for `/goal resume` and `/goal clear` paths.
- `sendQueueHandoff` is used only by runtime/tool terminal-state handoff paths where duplicate observations are likely.
- Do not persist dedupe state. It is in-memory turn/session protection only; queued state remains the source of truth after reload.

### Queue reason type

Edit `.pi/extensions/goal/types.ts`:

```ts
export type GoalQueueSteeringReason = "goal-complete" | "goal-clear" | "goal-resume" | "goal-budget-limited";
```

No other public schema change is required.

### Queue steering content

Edit `queueSteeringContent()` in `.pi/extensions/goal/queue-steering.ts`:

- after `budgetLine(goal)`, add explicit no-invented-budget guidance;
- if `goal.tokenBudget`, `goal.timeBudgetSeconds`, `goal.minTokensBeforeWrapUp`, and `goal.minTimeSecondsBeforeWrapUp` are all absent, state: `Do not pass token_budget, time_budget_seconds, min_tokens_before_wrap_up, or min_time_seconds_before_wrap_up when creating the next goal; Budgets: none means omit budget/floor params.`
- if any are present, state: carry only the listed budget/floor metadata exactly; do not invent additional budget/floor params.

This closes the 20K arbitrary budget path at the queue-steering surface.

### Lifecycle terminal handoff

Edit `.pi/extensions/goal/lifecycle.ts`:

- import `sendQueueHandoff` from `queue-steering.ts` while preserving `queueSteeringStillValid` import;
- replace the `finishTurnGoal()` complete branch with:

```ts
if (goal?.status === "complete" && completedThisTurn) sendQueueHandoff(pi, "goal-complete", { goalId: goal.goalId });
```

- in the mid-stream `handleMessageUpdate()` hard-stop branch, after `syncGoalUi(ctx, stopped)` / warning and before `ctx.abort()`, call:

```ts
sendQueueHandoff(pi, "goal-budget-limited", { goalId: goal.goalId });
```

- in `enforceBudgetHardStop()`, after persisting/syncing/notifying `budgetLimited` and before `interruptActiveGoalTurn`, call:

```ts
if (result.goal) sendQueueHandoff(pi, "goal-budget-limited", { goalId: result.goal.goalId });
```

- in `markBudgetReached()`, after persisting `limited`, call `sendQueueHandoff`; schedule budget wrap-up only when no queue handoff was sent:

```ts
if (result.goal) {
  const handedOff = sendQueueHandoff(pi, "goal-budget-limited", { goalId: result.goal.goalId });
  if (!handedOff) scheduleBudgetLimitWrapUp(pi, ctx, result.goal);
}
```

This makes non-empty queue the next action after terminal budget state, while preserving empty-queue budget wrap-up behavior.

### Tool completion/budget edit handoff

Edit `.pi/extensions/goal/tools.ts`:

- change `GoalToolRuntime.sendQueueSteering` to `GoalQueueSteeringSender` instead of `(reason: "goal-clear") => boolean`;
- update `registerGoalTools` parameter type accordingly;
- after successful `persistUpdateGoal()` and `syncGoalUi()`, call a new local helper:

```ts
queueHandoffAfterToolUpdate(runtime, goal, update.goal);
```

Helper behavior:

- if `updated.status === "complete"` and previous status was not complete, call `runtime.sendQueueSteering?.("goal-complete", { triggerTurn: true })`;
- if `updated.status === "budgetLimited"` and previous status was active/budgetLimited with exhausted budget and queue size > 0, call `runtime.sendQueueSteering?.("goal-budget-limited", { triggerTurn: true })`;
- do not call handoff when queue size is zero.

Because `index.ts` will pass `sendQueueHandoff` into tools, this helper inherits dedupe.

### Budget-limited replacement gates

Edit `.pi/extensions/goal/tools.ts`:

- extend `createGoalWithPolicy` policy to `{ replaceCompleted: boolean; replaceBudgetLimitedForQueuedWork?: boolean }`;
- `createGoalFromTemplateTool()` should pass `replaceBudgetLimitedForQueuedWork: true`;
- `createGoalFromTool()` should not pass it;
- allow replacement when current status is `budgetLimited`, policy flag is true, and `runtime.getQueueSize?.() ?? 0` is greater than zero.

Expected user-facing prefix:

- completed replacement remains `Goal created; replaced completed goal.`
- budget-limited queue replacement should be `Goal created; replaced budget-limited goal for queued work.`

Edit `.pi/extensions/goal/queue-tools.ts`:

- allow `start_queued_goal` when current goal is `complete` or `budgetLimited`;
- still reject `active` and `paused` current goals;
- update the error string to clarify: `A non-terminal goal is already active. The queued goal was left in the queue.`

This allows both direct queued goals and orchestration/template queued goals to continue after a budget-limited item.

### Index wiring

Edit `.pi/extensions/goal/index.ts`:

- import both `sendQueueSteering` and `sendQueueHandoff`;
- keep `registerGoalCommand(... (reason, opts) => sendQueueSteering(pi, reason, opts))` for manual slash command paths;
- change `registerGoalTools(..., (reason, opts) => sendQueueHandoff(pi, reason, opts))` so model-tool completion and budget edit paths dedupe and trigger effective queue handoff.

## Exact template design

### `verify-acceptance-pipeline.md`

Edit the inline Python ready-command renderer:

- change `spawn_acceptance_agent` to include materialized profile args:

```text
solo-mcp --instance <instance> process spawn --project <project_id> --kind agent --runtime Pi --runtime-args '--profile solo-researcher-strong' --custom-agent-tool materialized --materialized-args-mode replace --strict-profile --name <worker_name>
```

- add ready commands:

```text
send_model_selection: solo-mcp --instance <instance> process send "$ACCEPTANCE_WORKER_ID" --project <project_id> --input '/model opencode-go/glm-5.1' --allow-recent-spawn
verify_worker_status_after_model_selection: solo-mcp --instance <instance> process status "$ACCEPTANCE_WORKER_ID" --project <project_id>
model_selection_output_check: solo-mcp --instance <instance> process output "$ACCEPTANCE_WORKER_ID" --project <project_id> --lines 40
```

- update workflow section 2 so order is: spawn → set worker id → status check → send model selection → status/output check → write/send acceptance prompt.
- do not send `/profile`; `process send` blocks profile slash commands and the profile must be supplied through spawn runtime args.

Edit the direct acceptance-agent prompt:

- add an `IMPORTANT: NO BATCH CHECKS` block after extraction/cardinality steps;
- define the only valid loop as: create one concrete `verify-acceptance-item` goal → review that item individually and all relevant files/proofs → capture exactly one `acceptance_item_result` → mark concrete item goal complete → dequeue its orchestration queue item → update ledger → advance to next queue head;
- explicitly forbid AC-N..AC-M batch inspection/discovery as final evidence;
- allow aggregate orientation only before per-item execution and only if it does not produce red/green decisions;
- add a ledger schema and final report precondition:

```toon
acceptance_item_ledger[0]{id,enqueued,template_matched,concrete_goal_created,item_result_captured,concrete_goal_complete,orchestration_dequeued}:
```

- state final `acceptance_summary` is invalid until every ledger field is true for every extracted criterion;
- add no-invented-budget rule near the `create_goal_from_template` instruction: do not pass `token_budget`, `time_budget_seconds`, `min_tokens_before_wrap_up`, or `min_time_seconds_before_wrap_up` unless explicitly present in the queued item metadata or user instruction;
- update rerun prompt to repeat the same no-batch and ledger rules for corrected item ids.

### `verify-acceptance-item.md`

Edit the verification workflow:

- add a required `Proof plan` step after invariant restatement;
- require the item result evidence to include direct source(s), sufficiency rationale, and false-green risk ruled out;
- add rule: if the check is only string presence but stronger evidence is available, return `red` or `blocked`;
- clarify small scripts are valid only when they directly test the invariant and the result explains why the script would fail if the criterion were false.

## Validation probe design

Create these files under `.ai/validation/`:

1. `goal-acceptance-template-contract-probe.mjs`
   - read `.ai/.pi-goals/verify-acceptance-pipeline.md`, `.ai/.pi-goals/verify-acceptance-item.md`, `.pi/extensions/goal/queue-steering.ts`;
   - assert profile/model strings, `NO BATCH CHECKS`, `AC-N..AC-M`, ledger schema, no invented budget language, final-report precondition, proof-plan/sufficiency language, and weak string-presence rejection;
   - run a resolver smoke test for both templates through `.pi/extensions/goal/templates.ts`.
2. `goal-budget-limited-queue-handoff-probe.mjs`
   - read `types.ts`, `queue-steering.ts`, `lifecycle.ts`, `tools.ts`, `queue-tools.ts`, `index.ts`;
   - assert `goal-budget-limited` reason, `sendQueueHandoff`, budget-limited calls in lifecycle hard-stop/reached paths, budget-limited replacement in tools and queue-tools, and index wiring to handoff helper.
3. `goal-complete-queue-handoff-probe.mjs`
   - assert `goal-complete` path uses `sendQueueHandoff` / trigger-turn semantics from tool and lifecycle paths;
   - assert create-from-template still replaces completed goals.
4. `goal-complete-queue-dedupe-probe.mjs`
   - assert queue handoff dedupe key includes reason, goal id, and queue id;
   - assert duplicate lifecycle/tool observations do not produce two effective handoffs for the same key.

These can be static/contract probes for first pass, but the live probe remains mandatory.

## Meaningful alternatives rejected

```toon
rejected_alternatives[5]{id,alternative,rejected_reason}:
  "ra1","Only edit prompts and templates","Runtime gates currently block budgetLimited queue progression, so prompt-only cannot fix P1/P3."
  "ra2","Treat budgetLimited as complete","Budget exhaustion is not success and would corrupt goal semantics/history."
  "ra3","Clear budgetLimited goal automatically before queue start","Would hide failure state and discard useful accounting; replacement through controlled queue path preserves transcript history."
  "ra4","Spawn worker with default profile then rely on /model only","User explicitly requested profile arg and Solo helper supports runtime profile validation through runtime args/materialized agent tools."
  "ra5","Use broad quality gate for every acceptance item","Expensive and weaker than criterion-specific evidence; keep per-item sufficiency instead."
```

## Non-goals

- Do not implement a general queue scheduler or automatic all-queue execution engine beyond terminal handoff.
- Do not change queue persistence schema unless validation proves unavoidable.
- Do not change unrelated `.ai/.pi-goals` templates.
- Do not add broad destructive Solo/TLO timer helpers to acceptance pipeline.
- Do not make the acceptance worker remediate repository files.
