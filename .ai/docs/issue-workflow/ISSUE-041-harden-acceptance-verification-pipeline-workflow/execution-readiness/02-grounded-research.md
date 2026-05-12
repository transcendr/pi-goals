# 02 — Grounded research

## Surfaces inspected

```toon
toon.version: 1
research_surfaces[13]{id,path,reason}:
  "s1",".ai/.pi-goals/verify-acceptance-pipeline.md","direct acceptance-agent prompt and rerun instructions"
  "s2",".ai/.pi-goals/verify-acceptance-item.md","single-criterion verification contract"
  "s3",".ai/issues/open/ISSUE-040-verify-acceptance-pipeline-goal-templates.md","original intended behavior and acceptance criteria"
  "s4",".ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/07-implementation-closeout.md","known implementation risks and skipped full live probe rationale"
  "s5",".ai/docs/issue-workflow/ISSUE-040-verify-acceptance-pipeline-goal-templates/08-qualitative-review.md","prior template-hardening work and remaining risk"
  "s6",".ai/issues/open/ISSUE-037-goal-queue-auto-continuation-after-complete.md","existing queue continuation issue related to stop-after-complete"
  "s7",".pi/extensions/goal/queue-steering.ts","queue steering message content and triggerTurn option"
  "s8",".pi/extensions/goal/queue-tools.ts","queue start/dequeue behavior and current active-goal blocking"
  "s9",".pi/extensions/goal/tools.ts","create_goal_from_template optional budget params and completion behavior"
  "s10",".pi/extensions/goal/lifecycle.ts","turn-end completion, budget-limited transitions, queue steering call sites"
  "s11",".pi/extensions/goal/continuation.ts","budget wrap-up and active-goal continuation behavior"
  "s12","/tmp/pi-goals-acceptance-ISSUE-036-20260511T220611Z/acceptance-rerun-output.txt","captured first live acceptance report showing aggregate/red report and item output"
  "s13","/tmp/pi-goals-acceptance-ISSUE-036-20260511T220611Z/acceptance-final-output.txt","captured corrected AC-17 rerun output"
```

## Command facts

`rg -n "20K|20000|token_budget|time_budget_seconds"` over both acceptance templates and ISSUE-040 artifacts found no hard-coded `20K`, `20000`, or budget flags. That points away from template-authored budget values and toward model/tool-choice behavior enabled by optional budget parameters plus insufficient prompt/queue guidance.

`rg -n "sendQueueSteering|budgetLimited|start_queued_goal|replaceCompleted" .pi/extensions/goal -g "*.ts"` showed:

- `queue-steering.ts` supports `sendQueueSteering(pi, reason, { triggerTurn })`.
- `lifecycle.ts` only sends queue steering on `goal?.status === "complete" && completedThisTurn`, and currently calls it without `triggerTurn`.
- `lifecycle.ts` transitions exhausted goals to `budgetLimited` but does not send queue steering for non-empty queues on budget-limited terminal stop.
- `queue-tools.ts` refuses `start_queued_goal` whenever a current goal exists and `current.status !== "complete"`; `budgetLimited` is therefore a hard blocker for queue progression.
- `tools.ts` permits optional `token_budget` and `time_budget_seconds` on `create_goal_from_template`, and `createGoalWithPolicy` only replaces completed goals for template-created goals.

## Existing issue overlap

ISSUE-037 already documents the complete-status version of the queue-continuation bug: completed current goal + non-empty queue should trigger effective queue handoff and not allow silent stop. ISSUE-041 should not duplicate that full design. It should depend on ISSUE-037 and extend the root invariant to the budget-limited terminal path exposed by this acceptance run.

## Template contract facts

`verify-acceptance-pipeline.md` currently instructs the worker to:

- read the issue;
- extract and count acceptance rows;
- enqueue all item objectives first;
- execute the queue head-to-tail;
- for every queued item, match `verify-acceptance-item`, create a concrete goal, complete it, and dequeue only after item result capture;
- compile a final report.

The prompt does not explicitly say that an aggregate all-items verification is forbidden before item-result ledger completion. It also does not require a per-item ledger that the final report must reconcile against concrete `acceptance_item_result` rows. This left room for the observed shortcut: enqueue goals, perform one broad check, and emit all rows from the aggregate pass.

`verify-acceptance-item.md` already requires issue-context reading, evidence mapping, false-green checks, a status decision, and one structured row. The live run still produced very small item scripts for some checks. That does not automatically prove a bug—some criteria can be verified with a tight targeted script—but the issue needs a stronger evidence-floor rule: each item result should document why its chosen check is sufficient and must reject script-only string presence when a stronger proof surface is available.

## Live-run artifact facts

The captured first report for ISSUE-036 had `acceptance_summary` with `total=27`, `green=26`, `red=1`, `blocked=0`; the aggregate report included AC-17 as red after individual processing. The user reports an earlier all-green aggregate pass before forced requeue; that initial all-green output is not present in the retained `/tmp` files, so it is treated as user-provided transcript evidence from Figure 1 rather than independently archived local evidence.

The corrected rerun artifact shows AC-17 reprocessed as a single item and green after remediation. It also shows the item template can route and complete a single item correctly when the worker follows the queue workflow.

## Root-cause map by user point

```toon
toon.version: 1
root_cause_map[4]{point,probable_root,grounded_evidence,planning_implication}:
  "P1","agent invented optional budget and runtime treats budgetLimited as queue-blocking terminal state","no 20K in templates; create_goal_from_template accepts optional budgets; lifecycle budgetLimited paths do not send queue steering; start_queued_goal rejects non-complete current goals","forbid invented budgets in acceptance prompts/queue steering and add budget-limited queue handoff semantics"
  "P2","prompt contract lacks an enforceable item-result ledger and explicit prohibition on aggregate verification substitution","pipeline prompt says execute head-to-tail but does not define final-report precondition tied to captured acceptance_item_result rows","harden acceptance prompt with ledger, no-aggregate rule, and final-report gate"
  "P3","same runtime family as ISSUE-037 plus budget-limited variant: queue steering is passive/missing after terminal states","ISSUE-037 documents complete+queue gap; lifecycle sends queue steering only on complete turn-end without triggerTurn and not on budgetLimited","depend on ISSUE-037 and extend proof rows to budget-limited stop with queued work"
  "P4","cascades from P2: once aggregate report is treated as authoritative, later queue items can be ceremonially satisfied; item template also lacks an evidence-depth floor","item prompt requires false-green review but not a minimum evidence ledger or sufficiency justification per selected proof surface","make aggregate report invalid unless sourced from item results and add per-item evidence sufficiency requirements"
```

## Research conclusion

The best follow-up issue should combine two classes of remediation:

1. **Runtime queue handoff hardening** for terminal statuses with queued work, especially budget-limited queue items. This overlaps with ISSUE-037 but adds budget-limited semantics and optional-budget guardrails.
2. **Acceptance-template workflow hardening** so the acceptance agent cannot satisfy the pipeline with an aggregate shortcut or ceremonial per-item completions. This is ISSUE-040-specific prompt/template remediation and should include live nested proof, not only static template checks.
