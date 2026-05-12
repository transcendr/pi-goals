# 02 — Live surface research

## Command transcript

Primary discovery output is captured in `raw/commands.log`.

Key commands run:

```bash
pwd
git status --short --untracked-files=all
wc -l .ai/issues/open/ISSUE-041-harden-acceptance-verification-pipeline-workflow.md .ai/.pi-goals/verify-acceptance-pipeline.md .ai/.pi-goals/verify-acceptance-item.md .pi/extensions/goal/queue-steering.ts .pi/extensions/goal/lifecycle.ts .pi/extensions/goal/tools.ts .pi/extensions/goal/queue-tools.ts .pi/extensions/goal/types.ts
rg -n "sendQueueSteering|budgetLimited|goal-complete|triggerTurn|replaceCompleted|start_queued_goal|create_goal_from_template|token_budget|time_budget_seconds|process spawn|process send|acceptance_summary|acceptance_item_result|After all item goals|Final report" .pi/extensions/goal .ai/.pi-goals/verify-acceptance-pipeline.md .ai/.pi-goals/verify-acceptance-item.md -g '*.ts' -g '*.md'
find .ai/validation -maxdepth 1 -type f | sort
solo-mcp --instance solo-pi_goals process spawn --help
solo-mcp --instance solo_pigoals process send --help  # failed instance typo avoided in future; actual command used solo-pi_goals in raw log
python3 snippets against ~/.local/bin/solo-mcp to inspect profile/runtime-args behavior
```

## Surface map

```toon
toon.version: 1
surfaces[18]{id,path,classification,planned_role}:
  "s1",".ai/.pi-goals/verify-acceptance-pipeline.md","edit","Add strong worker profile/model setup, no invented budgets, mandatory no-batch loop, item ledger, rerun ledger, final report preconditions."
  "s2",".ai/.pi-goals/verify-acceptance-item.md","edit","Add proof-plan, evidence sufficiency, weak-evidence rejection, and per-green direct evidence/risk ruling requirements."
  "s3",".pi/extensions/goal/types.ts","edit","Extend GoalQueueSteeringReason with budget-limited terminal handoff reason."
  "s4",".pi/extensions/goal/queue-steering.ts","edit","Add explicit no-invented-budget guidance; add deduped effective queue-handoff helper or equivalent."
  "s5",".pi/extensions/goal/lifecycle.ts","edit","Call effective queue handoff on complete and budgetLimited terminal transitions, including reached and hard-stop paths."
  "s6",".pi/extensions/goal/tools.ts","edit","Allow queued/template progression over budgetLimited current goal only when queue exists; trigger/dedupe queue handoff after update_goal complete and budget edits to budgetLimited."
  "s7",".pi/extensions/goal/queue-tools.ts","edit","Allow start_queued_goal to start over a budgetLimited current goal when queue head exists; preserve non-complete active/paused blocking."
  "s8",".pi/extensions/goal/index.ts","edit","Pass GoalQueueSteeringSender options through registerGoalTools, not only reason."
  "s9",".pi/extensions/goal/command.ts","read-only dependency","Existing /goal resume and clear queue steering paths; preserve behavior."
  "s10",".pi/extensions/goal/continuation.ts","read-only dependency","Budget wrap-up and continuation behavior; avoid changing unless validation finds conflict."
  "s11",".pi/extensions/goal/queue-state.ts","read-only dependency","Queue head and queued budget metadata; no schema change expected."
  "s12",".ai/validation/goal-acceptance-template-contract-probe.mjs","create","Static/template contract probe for no-batch, ledger, profile/model, no invented budgets, evidence sufficiency."
  "s13",".ai/validation/goal-budget-limited-queue-handoff-probe.mjs","create","Static/runtime contract probe for budgetLimited queue handoff and replacement gates."
  "s14",".ai/validation/goal-complete-queue-handoff-probe.mjs","create","ISSUE-037-compatible regression probe for complete + queued work effective handoff."
  "s15",".ai/validation/goal-complete-queue-dedupe-probe.mjs","create","Dedupe regression probe for terminal queue handoff."
  "s16","package.json","validation","Use existing npm run quality:goal; no script changes planned."
  "s17","solo-mcp process spawn/send workflow","external/live","Spawn acceptance worker, set profile/model, send prompt, sparse-poll output."
  "s18",".ai/docs/pi-goals-live-probe-testing.md","validation","Canonical live probe guide for final end-to-end validation."
```

## Exact live code facts

### Queue steering

`queue-steering.ts` currently exposes `sendQueueSteering(pi, reason, opts)` and supports `triggerTurn`, but it has no dedupe helper and no budget/floor no-invention guidance. It renders `Budgets: none` when no queued budgets exist.

### Lifecycle terminal paths

`lifecycle.ts` currently calls queue steering only in `finishTurnGoal()`:

```ts
if (goal?.status === "complete" && completedThisTurn) sendQueueSteering(pi, "goal-complete");
```

This is passive because it does not pass `{ triggerTurn: true }`, and it does not cover `budgetLimited` transitions in `markBudgetReached()`, `enforceBudgetHardStop()`, or the mid-stream `handleMessageUpdate()` hard-stop branch.

### Tool replacement gates

`tools.ts:createGoalWithPolicy()` rejects any current goal unless `replaceCompleted` is true and current status is exactly `complete`. `create_goal_from_template` passes `replaceCompleted: true`, so it can replace completed goals but not budget-limited goals. `queue-tools.ts:startQueuedGoal()` has the same status boundary: any current status other than `complete` blocks queue progression.

### Acceptance templates

`verify-acceptance-pipeline.md` currently emits a spawn command without profile/runtime args and sends only the acceptance prompt. It has no model-switch command. The direct prompt requires head-to-tail execution, but it does not include the stronger user-tested `NO BATCH CHECKS` wording, repeated ledger checkpoints, or invalidation of AC-N..AC-M batch proof collection.

`verify-acceptance-item.md` requires false-green checks and concrete evidence, but does not explicitly require a proof-plan sentence, sufficiency rationale, or a rule that weak string-presence scripts must be red/blocked when stronger evidence is available.

### Solo profile/runtime facts

Local `~/.local/bin/solo-mcp` contains profile/runtime-args support. Inspection shows:

- `profileFromRuntimeArgs(args)` extracts `--profile <name>` from runtime args.
- registered Solo agent runtimes cannot receive per-spawn custom args unless a materialized agent tool is used.
- `spawnPlan()` supports `--custom-agent-tool materialized` and `--materialized-args-mode replace` for runtime args such as `--profile solo-researcher-strong`.
- `process send` blocks `/profile` slash commands and recommends `solo-mcp pi profile set`, but the user requested `/model opencode-go/glm-5.1`, not `/profile`.

Implementation should therefore render the acceptance worker spawn as a materialized Pi agent with runtime args replacing the default profile args, e.g. `--runtime Pi --runtime-args "--profile solo-researcher-strong" --custom-agent-tool materialized --materialized-args-mode replace --strict-profile`, then send `/model opencode-go/glm-5.1` as a separate process input before the acceptance prompt.

## Existing validation inventory

Current `.ai/validation/` contains compaction, floor, and template discovery probes. No ISSUE-041-specific probes exist yet:

- `goal-acceptance-template-contract-probe.mjs` — missing, create.
- `goal-budget-limited-queue-handoff-probe.mjs` — missing, create.
- `goal-complete-queue-handoff-probe.mjs` — missing, create or implement ISSUE-037 equivalent.
- `goal-complete-queue-dedupe-probe.mjs` — missing, create or fold into complete handoff probe if issue proof row is updated.

## Implementation constraints

- No `.pi/extensions/goal` file may introduce `as unknown as` or `as any`.
- Keep queue handoff behavior in queue/lifecycle/tool modules; do not mix acceptance-template prompt logic into runtime modules.
- Do not alter queue persistence schema unless a deterministic proof forces it; current issue can be solved with status gates, steering, and prompt/template changes.
- Keep live probe commands sparse and cleanup explicit.
