# 04 — Patch sequence

## Preconditions

- Work on branch `develop` unless user says otherwise.
- Worktree should be reviewed first with `git status --short --untracked-files=all`.
- Because runtime code under `.pi/extensions/goal` will change, run the pre-change architecture sensor before implementation:

```bash
sentrux gate --save .pi/extensions/goal
```

- Do not use `as unknown as` or `as any` in `.pi/extensions/goal`.
- Keep all template inline commands read-only during goal rendering; spawning/sending occurs in the executing workflow, not template expansion.

## Ordered patch plan

### Step 1 — Runtime type and queue handoff helper

Files:

- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/queue-steering.ts`

Edits:

1. Extend `GoalQueueSteeringReason` with `"goal-budget-limited"`.
2. In `queue-steering.ts`, add `QueueHandoffOptions`, `lastQueueHandoffKey`, and `sendQueueHandoff()` as designed in `03-implementation-design-lock.md`.
3. Add no-invented-budget guidance to `queueSteeringContent()` immediately after `budgetLine(goal)`.
4. Optionally add helper `budgetGuidance(goal: QueuedGoal): string[]` to keep `queueSteeringContent()` readable.

Expected intermediate state:

- TypeScript compile may still fail until lifecycle/tools call sites are updated.
- `sendQueueSteering()` remains unchanged for direct/manual queue steering.

Rollback:

- Revert `types.ts` and `queue-steering.ts` changes if type errors cascade beyond queue handoff surfaces.

### Step 2 — Lifecycle terminal handoff

File:

- `.pi/extensions/goal/lifecycle.ts`

Edits:

1. Import `sendQueueHandoff` alongside `queueSteeringStillValid`.
2. In `finishTurnGoal()`, replace the passive complete handoff with deduped effective handoff:
   - `sendQueueHandoff(pi, "goal-complete", { goalId: goal.goalId })`.
3. In `handleMessageUpdate()` hard-stop branch, call `sendQueueHandoff(pi, "goal-budget-limited", { goalId: goal.goalId })` after budgetLimited persistence/UI sync and before `ctx.abort()`.
4. In `enforceBudgetHardStop()`, call budget-limited queue handoff after persistence/UI sync/notification and before interrupting.
5. In `markBudgetReached()`, call budget-limited queue handoff and schedule `scheduleBudgetLimitWrapUp()` only if no queue handoff was sent.

Expected intermediate validation:

```bash
npm run typecheck:goal
```

Typecheck may still fail until Step 3 wires tools/index; if so, inspect errors and continue only if they are expected reason/type call-site errors.

Rollback:

- Revert lifecycle changes if they alter no-queue budget wrap-up behavior; preserve Step 1 until deciding whether helper design needs adjustment.

### Step 3 — Tool and queue start gates

Files:

- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/index.ts`

Edits in `tools.ts`:

1. Import `GoalQueueSteeringSender` if not already available through types.
2. Change `GoalToolRuntime.sendQueueSteering` type to `GoalQueueSteeringSender`.
3. Change `registerGoalTools(... sendQueueSteering)` parameter type to `GoalQueueSteeringSender`.
4. Extend `createGoalWithPolicy()` policy to include `replaceBudgetLimitedForQueuedWork?: boolean`.
5. Update `createGoalFromTool()` policy to keep `replaceBudgetLimitedForQueuedWork: false`.
6. Update `createGoalFromTemplateTool()` policy to set `replaceBudgetLimitedForQueuedWork: true`.
7. Add helper:

```ts
function canReplaceCurrentGoal(current: GoalState, runtime: GoalToolRuntime, policy: { replaceCompleted: boolean; replaceBudgetLimitedForQueuedWork?: boolean }): boolean {
  if (policy.replaceCompleted && current.status === "complete") return true;
  if (policy.replaceBudgetLimitedForQueuedWork && current.status === "budgetLimited" && (runtime.getQueueSize?.() ?? 0) > 0) return true;
  return false;
}
```

8. Use this helper in `createGoalWithPolicy()`.
9. Add result prefix for budget-limited queue replacement.
10. Add `queueHandoffAfterToolUpdate(runtime, previousGoal, updatedGoal)` and call it after `persistUpdateGoal()`/`syncGoalUi()` in `updateGoalFromTool()`.

Edits in `queue-tools.ts`:

1. Change `startQueuedGoal()` current-goal gate:
   - allow no current goal;
   - allow current `complete`;
   - allow current `budgetLimited`;
   - reject current `active` or `paused`.
2. Update error wording to `A non-terminal goal is already active. The queued goal was left in the queue.`

Edits in `index.ts`:

1. Import `sendQueueHandoff` from `queue-steering.ts`.
2. Pass raw `sendQueueSteering` to command registration.
3. Pass deduped `sendQueueHandoff` to tools registration.

Expected intermediate validation:

```bash
npm run typecheck:goal
node .ai/validation/goal-min-spend-floors-probe.mjs
```

Rollback:

- If budgetLimited replacement permits replacing paused/active goals, revert Step 3 and add explicit status tests before reapplying.

### Step 4 — Acceptance pipeline template worker launch and no-batch ledger

File:

- `.ai/.pi-goals/verify-acceptance-pipeline.md`

Edits:

1. Update rendered `spawn_acceptance_agent` command to materialize Pi with the strong profile:

```bash
solo-mcp --instance <instance> process spawn \
  --project <project_id> \
  --kind agent \
  --runtime Pi \
  --runtime-args '--profile solo-researcher-strong' \
  --custom-agent-tool materialized \
  --materialized-args-mode replace \
  --strict-profile \
  --name <worker_name>
```

2. Add rendered commands:

```bash
send_model_selection: solo-mcp --instance <instance> process send "$ACCEPTANCE_WORKER_ID" --project <project_id> --input '/model opencode-go/glm-5.1' --allow-recent-spawn
verify_worker_status_after_model_selection: solo-mcp --instance <instance> process status "$ACCEPTANCE_WORKER_ID" --project <project_id>
model_selection_output_check: solo-mcp --instance <instance> process output "$ACCEPTANCE_WORKER_ID" --project <project_id> --lines 40
```

3. Update step 2 instructions to send/verify model selection before the acceptance prompt.
4. Add a prominent `IMPORTANT: NO BATCH CHECKS` block inside the acceptance-agent prompt.
5. Add the ledger schema and the create-review-result-complete-dequeue loop.
6. State AC-N..AC-M batch proof collection is a workflow violation and must be discarded as final evidence.
7. Add no-invented-budget/floor rule near `create_goal_from_template` instruction.
8. Update correction/rerun prompt to repeat no-batch + ledger requirements.

Expected intermediate validation:

```bash
node .ai/validation/goal-acceptance-template-contract-probe.mjs
```

If the probe does not exist yet, create it in Step 6 before running.

Rollback:

- Revert template edits only if resolver smoke fails in a way that cannot be repaired with quoting/Markdown fence fixes.

### Step 5 — Acceptance item template evidence sufficiency

File:

- `.ai/.pi-goals/verify-acceptance-item.md`

Edits:

1. Insert a `Proof plan` step after invariant restatement.
2. Require at least one direct file/command/artifact inspection that would likely fail if the criterion were false.
3. Require evidence output to include sufficiency rationale and false-green risk ruled out.
4. Add weak-evidence rule: string-presence-only checks are not green if stronger implementation/proof evidence is available.
5. Preserve read-only/no mutation requirements.

Expected intermediate validation:

```bash
node .ai/validation/goal-acceptance-template-contract-probe.mjs
```

Rollback:

- Revert or simplify wording if it causes `verify-acceptance-item` resolver smoke to exceed command output constraints or breaks Markdown fences.

### Step 6 — Deterministic probes

Create files:

- `.ai/validation/goal-acceptance-template-contract-probe.mjs`
- `.ai/validation/goal-budget-limited-queue-handoff-probe.mjs`
- `.ai/validation/goal-complete-queue-handoff-probe.mjs`
- `.ai/validation/goal-complete-queue-dedupe-probe.mjs`

Implementation notes:

- Use Node `fs.readFileSync` and small `assert()` helpers, following existing `.ai/validation/*.mjs` style.
- For template resolver smoke, transpile `.pi/extensions/goal/templates.ts` to `/tmp/pi-goals-templates-test.cjs` with TypeScript, as documented in `.ai/docs/prompt-template-authoring.md`.
- Keep probes deterministic and side-effect-free.
- Make assertions strong enough to fail if the exact ISSUE-041 regressions remain.

Run:

```bash
node .ai/validation/goal-acceptance-template-contract-probe.mjs
node .ai/validation/goal-budget-limited-queue-handoff-probe.mjs
node .ai/validation/goal-complete-queue-handoff-probe.mjs
node .ai/validation/goal-complete-queue-dedupe-probe.mjs
```

Rollback:

- If probes are too brittle around exact wording, revise to assert semantic marker strings that are still implementation-specific enough to catch regressions.

### Step 7 — Full deterministic quality gate

Run:

```bash
npm run quality:goal
```

Pass condition:

- Sentrux gate/check pass.
- Slop guard finds no `as unknown as` / `as any`.
- TypeScript strict check passes.
- Pi extension load validation passes.

Rollback:

- Fix all failures unless user explicitly accepts a tradeoff; do not proceed to live probe with failing quality gate.

### Step 8 — Bounded live acceptance pipeline probe

Create a disposable issue doc outside canonical issue buckets if possible, or in a clearly disposable temp location accepted by the resolver. If resolver requires `.ai/issues/**`, use `.ai/issues/open/ISSUE-999-disposable-acceptance-pipeline-live-probe.md` and delete it afterward.

Fixture requirements:

- At least 12 acceptance criteria.
- Criteria should be safe/read-only and varied enough to require per-item inspection, but not expensive.
- Include at least one criterion whose proof would be wrong if batched superficially.

Live worker requirements:

- Worker spawned by `verify-acceptance-pipeline` rendered command with `--profile solo-researcher-strong` and materialized runtime args.
- `/model opencode-go/glm-5.1` sent before acceptance prompt.
- Sparse `sleep 90` polling only.
- No manual `DO NOT STOP` prompt.

Evidence to capture:

- prompt file;
- process spawn output showing profile/materialized runtime or profile validation;
- model-selection send/status/output evidence;
- worker transcript/output showing all items enqueued first;
- exactly one concrete `verify-acceptance-item` goal/result per criterion;
- no AC-N..AC-M batch proof segment;
- final `acceptance_summary` only after ledger completion;
- cleanup commands and final no-residue queue/goal state.

Cleanup:

- remove disposable issue doc;
- clear any disposable goals/queues only after satisfied/authorized cleanup path;
- preserve `/tmp` acceptance artifact output in closeout notes.

### Step 9 — Final issue/doc closeout

Update ISSUE-041 implementation notes only if implementation has materially refined exact proof paths. Do not reopen design choices unless a real blocker was found.

Commit guidance:

- Prefer one focused commit for runtime/template/probe implementation if the diff is cohesive.
- If large, split into runtime handoff commit and template/probe commit, but run final quality/live proof after both.

## Stop conditions

Stop and ask/route instead of guessing if:

- `solo-mcp process spawn` cannot materialize Pi with `--profile solo-researcher-strong` and no safe equivalent is available.
- `/model opencode-go/glm-5.1` is rejected by the worker and no configured equivalent exists.
- Runtime changes require changing Pi core extension APIs outside `.pi/extensions/goal`.
- Live probe leaves ambiguous evidence about whether batching occurred.

## Cardinality and handoff

```toon
patch_cardinality[1]{issue,patch_layers,required_probe_files,live_probe_required}:
  "ISSUE-041",4,4,true
```
