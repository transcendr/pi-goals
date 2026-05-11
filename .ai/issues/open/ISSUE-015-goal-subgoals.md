# ISSUE-015 — Goals with agent-managed subgoals

Status: open — execution-ready for first nested-child implementation pass
Priority: P1
Owner: pi-goal automation
Created: 2026-05-08
Updated: 2026-05-10
Next best session: focused implementation/validation pass for nested child subgoals
Next best session rationale: The major architecture fork is now locked by owner decision: first release should implement a nested child goal runtime inside the active parent goal, not lightweight checklist-only subgoals and not separate queued/top-level child goals. The remaining work is implementation and validation within that bounded scope.
Target bucket: open
Issue kind: feature
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: none for the first nested-child pass
Related:
- `.ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md`
- `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md`
- `.ai/issues/open/ISSUE-019-parallel-multiple-goals.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`

## Goal

Add first-class agent-managed subgoals to `pi-goal` so a long-running parent goal can enter a bounded blocking child workflow, track child status/evidence durably, and then resume the parent without replacing the top-level goal or delaying the child behind the queue.

First release target: one active top-level goal with a one-level nested child runtime. This is intentionally narrower than arbitrary project management, parallel goals, or multi-agent child sessions.

## Problem/context

A single objective string is too coarse for large goals. Agents naturally break work into subgoals, but today that structure is only implicit in chat. This makes parent/child workflow cases fragile:

- starting `/goal dirty-worktree-cleanup ...` while a parent goal is active collides with or replaces the parent;
- queueing the cleanup delays a blocking prerequisite instead of running it inline;
- doing it only in chat loses durable progress, auditability, reload behavior, and parent return state.

Reference use case: `deslop-pipeline` may discover a dirty worktree during preflight. The correct behavior is to enter a blocking `dirty-worktree-cleanup` child, complete or escalate it with evidence, then return to the parent pipeline at the Sentrux baseline step. Existing top-level goal and queue semantics do not express that cleanly.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/commands.log`
- Research scan log: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/research-rg.log`
- Sentrux planning sensor: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/sentrux-gate.log`
- Validation probe log: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/validation-probe.log`
- Path existence audit: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/path-existence-audit.log`
- Diff check: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/diff-check.log`
- Final status: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/status-final.log`
- Final check-ignore: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/check-ignore-final.log`
- Acceptance traceability: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/07-acceptance-traceability.md`
- Open-bucket promotion: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/08-open-bucket-promotion.md`
- Migration consistency audit: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/09-migration-consistency-audit.md`
- Current code readiness audit: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/10-current-code-readiness-audit.md`
- Downstream reference update: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/11-downstream-reference-update.md`
- Package script proof check: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/12-package-script-proof-check.md`
- Promotion invariant probe: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/promotion-invariant-probe.log`
- Quality gate log: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/quality-goal-open-promotion.log`
- Executor handoff: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/13-executor-handoff.md`
- Non-implementation boundary: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/14-non-implementation-boundary.md`
- Queue continuation note: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/15-queue-continuation-note.md`
- Stale reference audit: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/16-stale-reference-audit.md`
- Template containment readback: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/17-template-containment-readback.md`
- Parent pipeline readback: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/18-parent-pipeline-readback.md`
- Subgoal state matrix: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/19-subgoal-state-matrix.md`
- Replay bounds handoff: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/20-replay-bounds-handoff.md`
- Closeout summary: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/21-closeout-summary.md`
- Final open/refine inventories: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/open-inventory-final.log`, `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/refine-inventory-final.log`
- Queue state checkpoint: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/22-queue-state-checkpoint.md`
- Types source recheck: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/23-types-source-recheck.md`
- State source recheck: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/24-state-source-recheck.md`
- Tools registration recheck: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/25-tools-registration-recheck.md`
- Tool output recheck: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/26-tool-output-recheck.md`
- Widget source recheck: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/27-widget-source-recheck.md`
- Prompt source recheck: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/28-prompt-source-recheck.md`
- README update plan: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/29-readme-update-plan.md`
- Stack order after promotion: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/30-stack-order-after-promotion.md`
- Acceptance traceability addendum: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/31-acceptance-traceability-addendum.md`
- Fingerprint: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/32-fingerprint.md`
- Monitor report recheck: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/33-monitor-report-recheck.md`
- UI source recheck: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/34-ui-source-recheck.md`
- Format source recheck: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/35-format-source-recheck.md`
- Final promotion invariant: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/36-final-promotion-invariant.md`
- Budget source recheck: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/37-budget-source-recheck.md`
- Queue source recheck: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/38-queue-source-recheck.md`
- Final closeout readback: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/39-final-closeout-readback.md`
- Final closeout probe: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/raw/final-closeout-probe.log`

## Desired behavior

### Parent and child runtime

- A `GoalState` may contain an ordered, bounded list of subgoals.
- The parent remains the only top-level persistent goal.
- At most one subgoal is active at a time for the first release.
- A subgoal can carry:
  - stable `subgoalId`;
  - short title;
  - child objective;
  - status;
  - optional notes/evidence;
  - optional reusable-template recipe metadata;
  - optional child budgets/floors/proof references when supported;
  - `returnToParent` instruction describing the parent step to resume.
- Entering a child focuses continuation guidance on the child objective while preserving parent context.
- Exiting/completing a child restores parent focus and keeps durable child evidence.

### Reusable child workflows

- A subgoal may reference a reusable template under `.ai/.pi-goals/` as its execution recipe.
- Template resolution for a subgoal should render child objective text and store trusted metadata, not call `create_goal_from_template` and not enqueue a top-level goal.
- The `deslop-pipeline` → `dirty-worktree-cleanup` scenario is the reference case: the child cleanup runs inline under the parent and then returns to the parent pipeline.

### Completion and audit semantics

- Parent completion is refused if any blocking subgoal is `pending`, `active`, `failed`, or `blocked` without explicit escalation evidence.
- Accepted terminal states for a blocking subgoal are:
  - `complete` with evidence; or
  - `blocked` / `abandoned` only with an explicit reason and parent-level escalation evidence that justifies treating the parent as resolved or stopped.
- Subgoal progress counts are advisory. They must not replace qualitative completion audit or durable proof gates.
- Future `/goal audit` should incorporate subgoal state, but parent completion must be deterministically blocked even without `/goal audit`.

### UI/tool output

- `get_goal` and related tool output should summarize current child, status, and blockers.
- The footer/widget should show a compact child row such as `subgoal 1/3 active: clean dirty worktree` when subgoals exist.
- Detailed subgoal lists belong in tool output, not in the narrow widget.
- No-subgoal goals should render exactly as before.

## Grounded research findings

Source artifact: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/02-grounded-research.md`.

Inspected surfaces:

- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/tool-results.ts`
- `.pi/extensions/goal/completion-gate.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/monitor-report.ts`
- `.pi/extensions/goal/monitor.ts`
- `.pi/extensions/goal/ui.ts`
- `.pi/extensions/goal/widget.ts`
- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/queue-state.ts`
- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/templates.ts`
- `.pi/extensions/goal/command.ts`
- `.ai/.pi-goals/deslop-pipeline.md`
- `.ai/.pi-goals/dirty-worktree-cleanup.md`
- `.ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md`
- `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`

Current facts:

- `GoalState` has no subgoal fields today.
- State replay is branch-local and defensive; optional subgoal fields can be added without breaking older events if parsing remains bounded.
- `tools.ts` and `completion-gate.ts` already form the right seam for deterministic completion refusal.
- Queue state is for future top-level goals and should not become the blocking child execution mechanism.
- Template resolution is reusable, but child template resolution must not call the top-level goal creation path.
- UI/widget space is already dense; subgoal rendering must be compact.
- Sentrux planning sensor: `sentrux gate --save .pi/extensions/goal` reported quality `6241`.

## Locked design choices

Source artifact: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/03-design-lock.md`.

Owner-selected first-release model: **Nested child goal runtime inside parent**.

Locked scope:

- Preserve one active top-level `GoalState`.
- Add one-level nested child runtime under the parent goal.
- Keep subgoals ordered and bounded; first release allows at most one active child.
- Store child records in parent `GoalState`, not in the queue and not in a separate top-level goal.
- Add model tools first; defer slash-command UX.
- Include subgoal state in completion gating, tool details, prompt context, format summaries, and compact UI.
- Reuse ISSUE-021 proof concepts later rather than inventing a separate subgoal proof engine.

Rejected alternatives:

- Checklist-only subgoals: too weak for blocking reusable child workflows.
- Separate queued/top-level child goals: reintroduces replacement/delay and fragile parent resume behavior.
- Arbitrary-depth subgoal trees: too large for first release.
- Separate child Pi/Solo sessions: belongs to future parallel/multi-goal architecture.
- Progress aggregation as completion proof: conflicts with ISSUE-014's safety boundary.

## Proposed schema sketch

Names are illustrative; implementation may tune field names while preserving semantics.

```ts
type GoalSubgoalStatus = "pending" | "active" | "paused" | "blocked" | "failed" | "complete" | "abandoned";

type GoalSubgoal = {
  subgoalId: string;
  title: string;
  objective: string;
  status: GoalSubgoalStatus;
  blocking: boolean;
  template?: { name: string; path: string; args?: string; flags?: Record<string, string> };
  returnToParent?: string;
  evidence?: string;
  blockerReason?: string;
  tokenBudget?: number;
  timeBudgetSeconds?: number;
  minTokensBeforeWrapUp?: number;
  minTimeSecondsBeforeWrapUp?: number;
  tokensUsed?: number;
  timeUsedSeconds?: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
};

type GoalState = {
  // existing fields...
  subgoals?: GoalSubgoal[];
  activeSubgoalId?: string;
};
```

Replay rules:

- Missing `subgoals` means no subgoals.
- Unknown/invalid subgoal records are ignored or sanitized rather than crashing replay.
- Bounded title/objective/evidence lengths are mandatory to avoid oversized state snapshots.
- Child usage may be tracked separately but total token/time accounting remains on the parent goal; child budgets must not permit exceeding parent hard budgets.

## Proposed model-tool surface

First release should prefer separate tools instead of overloading `update_goal`:

- `list_goal_subgoals` — show ordered subgoals, active child, blockers, and counts.
- `create_goal_subgoal` — create a child record with title/objective or resolved template recipe, optional `blocking`, and optional `return_to_parent`.
- `enter_goal_subgoal` — mark a pending/paused child active and focus continuation context.
- `update_goal_subgoal` — update status, notes/evidence, blocker reason, return point, budgets/floors, or title.
- `remove_goal_subgoal` — remove only when explicitly requested or before meaningful child work starts; completed/audited children should normally remain as evidence.

Tool constraints:

- Do not create subgoals for ordinary task decomposition unless pursuing an explicit persistent goal and the child is useful for audit/resume.
- Creating a template-backed subgoal must resolve the template into child objective text without replacing the top-level goal.
- Completing a child requires evidence text or proof reference when the child is blocking.
- Marking a child `blocked` or `abandoned` requires reason text.

## Implementation checklist

- [ ] Add subgoal types and bounded parsing helpers in `.pi/extensions/goal/types.ts` / a focused helper module.
- [ ] Extend `GoalState` creation/replay to carry optional subgoals and `activeSubgoalId` safely.
- [ ] Add `subgoal-tools.ts` and register tools from `.pi/extensions/goal/tools.ts` without bloating `tools.ts`.
- [ ] Add deterministic helper functions for active child lookup, terminal-state checks, blocker summaries, and template-backed child objective rendering.
- [ ] Extend `completion-gate.ts` so parent `complete` is refused when blocking subgoals are unresolved.
- [ ] Extend `tool-results.ts` and `format.ts` with concise subgoal summaries.
- [ ] Extend `prompts.ts` continuation guidance to include parent objective plus active child objective/return point.
- [ ] Update `ui.ts` / `widget.ts` for compact current-child rendering.
- [ ] Add targeted validation probes under `.ai/validation/` for replay, completion blocking, template containment, and rendering.
- [ ] Update README after implementation to document subgoal model tools and the parent/child workflow boundary.
- [ ] Run `npm run quality:goal`.
- [ ] Run or explicitly justify skipping live probe per `.ai/docs/pi-goals-live-probe-testing.md`.

## Acceptance criteria

- A parent goal can create a blocking child subgoal and make it the active child without replacing the top-level goal.
- A child can be created from a reusable goal template recipe without calling top-level `create_goal_from_template` or queue start semantics.
- Reload/replay preserves subgoal order, active child, status, evidence, and parent return point.
- `update_goal(status:"complete")` refuses parent completion while a blocking child is pending/active/failed or blocked/abandoned without explicit reason/evidence.
- Completing a blocking child records durable evidence and clears active child focus or returns to parent focus.
- `get_goal`/tool details expose current child and blocker summaries.
- Widget/footer rendering remains compact and does not regress no-subgoal display.
- Parent hard budgets still win over child budgets/floors.
- Validation probes and `npm run quality:goal` pass.

## Proof threat model

Source artifact: `.ai/docs/issue-workflow/ISSUE-015-goal-subgoals/04-proof-threat-model.md`.

Primary invariant: a parent goal cannot be honestly completed while a blocking child subgoal remains active, incomplete, failed, or unresolved; completing/escalating a child must leave durable, replayable evidence and a clear return-to-parent point.

High-risk false greens:

- Parent completion succeeds with active child still present.
- Template-backed child accidentally creates/replaces/queues a top-level goal.
- Replay drops active child state.
- UI/tool output hides the child so the agent audits only the parent string.
- `blocked`/`abandoned` becomes a loophole without evidence.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,target_session,goal}:
  "ISSUE-015","execution-ready-first-pass","focused implementation/validation","add nested child subgoals under one active parent pi-goal"
locked_requirements[6]{id,requirement}:
  "lr1","preserve one active top-level GoalState"
  "lr2","store one-level ordered bounded subgoals on the parent goal"
  "lr3","support one active child subgoal with objective, status, evidence, template recipe, and return-to-parent instruction"
  "lr4","block parent completion while blocking child subgoals are unresolved"
  "lr5","render current child and done/total compactly without regressing no-subgoal UI"
  "lr6","resolve template-backed child workflows without top-level goal replacement or queue delay"
invariants[5]{id,invariant}:
  "inv1","subgoals do not create a second top-level persistent goal"
  "inv2","parent hard budgets constrain child work"
  "inv3","subgoal progress/counts are advisory and never proof of parent completion"
  "inv4","blocked or abandoned child states require explicit reason/evidence before parent can proceed"
  "inv5","state replay remains defensive and branch-local"
implementation_surfaces[7]{id,path,change}:
  "s1",".pi/extensions/goal/types.ts","add subgoal schema/status types"
  "s2",".pi/extensions/goal/state.ts","parse/replay optional bounded subgoal fields"
  "s3",".pi/extensions/goal/subgoal-tools.ts","new model tool surface for child lifecycle"
  "s4",".pi/extensions/goal/completion-gate.ts","refuse parent completion on unresolved blocking children"
  "s5",".pi/extensions/goal/prompts.ts","include active child context in continuation guidance"
  "s6",".pi/extensions/goal/tool-results.ts","include child summaries and blockers"
  "s7",".pi/extensions/goal/widget.ts","compact current-child rendering"
verification_checks[5]{id,check,evidence}:
  "v1","parent completion blocked with active blocking child","completion probe"
  "v2","template-backed child does not replace or dequeue top-level goal","template containment probe"
  "v3","reload/replay preserves active child and evidence","state replay probe"
  "v4","no-subgoal and active-child widget modes render within width bounds","render probe"
  "v5","extension quality gate remains green","npm run quality:goal"
```

## Required proofs

```toon
toon.version: 1
required_proofs[5]{name,source,command,pass_condition,scope,notes}:
  "quality_goal","ISSUE-015","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0","run","required full extension quality gate after implementation"
  "subgoal_replay_probe","ISSUE-015","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-subgoal-replay-probe.mjs","exit 0 and output includes PASS replay_preserves_active_subgoal","run","probe should create parent+child events and replay them"
  "completion_block_probe","ISSUE-015","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-subgoal-completion-block-probe.mjs","exit 0 and output includes PASS completion_blocked_by_subgoal","run","must fail if parent completion succeeds with unresolved blocking child"
  "template_child_probe","ISSUE-015","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-subgoal-template-child-probe.mjs","exit 0 and output includes PASS no_top_level_replacement","run","must prove template-backed child stays nested"
  "live_probe_or_skip","ISSUE-015","cd /Users/bryan/dev/personal/experiments/pi-goals && test -s .ai/validation/goal-subgoal-live-probe-closeout.md","exit 0","run","record live probe evidence or explicit skip rationale grounded in deterministic coverage"
```

## Non-goals for first implementation

- Arbitrary-depth subgoal trees.
- Parallel child agents, child worktrees, or multi-session orchestration.
- Slash-command subgoal management.
- Full project-management issue tracker replacement.
- Automatic progress-percent aggregation beyond compact counts.
- Independent subgoal proof runner separate from ISSUE-021.
- Durable human-readable checkpoints beyond compact state/evidence fields; see ISSUE-022.
