# ISSUE-016 — Idle-tolerant goals with delayed nudges

Status: open — execution-ready for first idle-nudge implementation pass
Priority: P1
Owner: pi-goal automation
Created: 2026-05-08
Updated: 2026-05-10
Next best session: implement and validate idle-nudge continuation policy
Next best session rationale: The policy schema, default behavior, timer semantics, update surface, UI wording, and proof strategy are now locked for a bounded first pass.
Target bucket: open
Issue kind: feature
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/issues/fixed/ISSUE-003-paused-goal-continuation-guard.md`
Related:
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
- `.ai/issues/refine/ISSUE-018-goal-start-in-worktree.md`
- `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`
- `.ai/issues/open/ISSUE-037-goal-queue-auto-continuation-after-complete.md`
- `.ai/docs/pi-goals-live-probe-testing.md`

## Goal

Add an optional per-goal auto-continuation policy that lets an active goal intentionally go idle without being paused, while still allowing a delayed nudge to reassess whether the agent should continue.

## Problem/context

Current goal continuation is optimized for immediate persistence: when an active goal reaches `agent_end`, `scheduleMaybeContinueGoal()` schedules a short follow-up if the context is idle and safe. That is useful for autonomous work, but awkward for goals waiting on an external process, another agent, CI, a user, or a long terminal command.

The system needs a first-class active-but-waiting mode that does not overload `paused`. Paused means user requested no work. Idle-tolerant active goals mean work is still active, but immediate self-continuation is temporarily counterproductive.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/raw/commands.log`
- Sentrux planning sensor: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/raw/sentrux-gate.log`
- Downstream reference update: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/07-downstream-reference-update.md`
- Implementation handoff: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/08-implementation-handoff.md`
- State and telemetry plan: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/09-state-and-telemetry-plan.md`
- Validation probe plan: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/10-validation-probe-plan.md`
- UI wording plan: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/11-ui-wording-plan.md`
- Non-implementation boundary: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/12-non-implementation-boundary.md`
- Queue continuation note: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/13-queue-continuation-note.md`
- Package script proof check: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/14-package-script-proof-check.md`
- Final promotion invariant: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/15-final-promotion-invariant.md`
- Closeout summary: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/16-closeout-summary.md`
- Final inventories: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/raw/open-inventory-final.log`, `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/raw/refine-inventory-final.log`
- Quality gate log: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/raw/quality-goal-open-promotion.log`
- Telemetry source recheck: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/17-telemetry-source-recheck.md`
- Command source recheck: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/18-command-source-recheck.md`
- Tool output source recheck: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/19-tool-output-source-recheck.md`
- Template source recheck: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/20-template-source-recheck.md`
- Monitor prompt recheck: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/21-monitor-prompt-recheck.md`
- Queue steering recheck: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/22-queue-steering-recheck.md`
- Floor source recheck: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/23-floor-source-recheck.md`
- README update plan: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/24-readme-update-plan.md`
- Validation script plan: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/25-validation-script-plan.md`
- Proof command normalization: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/26-proof-command-normalization.md`
- Entrypoint and schema recheck: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/27-entrypoint-and-schema-recheck.md`
- State replay source recheck: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/28-state-replay-source-recheck.md`
- UI/widget/format source recheck: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/29-ui-widget-format-recheck.md`
- Final readback: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/30-final-readback.md`
- Monitor report source recheck: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/31-monitor-report-source-recheck.md`
- Downstream stale reference fix: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/32-downstream-stale-reference-fix.md`
- Stack inventory after promotion: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/33-stack-inventory-after-promotion.md`
- Goal completion readiness: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/34-goal-completion-readiness.md`
- Final diff snapshot: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/35-final-diff-snapshot.md`
- Non-implementation final audit: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/36-nonimplementation-final-audit.md`
- Artifact link check: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/37-artifact-link-check.md`

## Desired behavior

- Default behavior remains current immediate auto-continuation.
- A goal can set `autoContinueMode` to `"idle_nudge"` with an optional `idleNudgeAfterSeconds` delay and optional `idleWaitReason`.
- `idle_nudge` suppresses the immediate 25ms `agent_end` follow-up and schedules a delayed stale-guarded nudge instead.
- The delayed nudge uses follow-up delivery and asks the agent to inspect whether the wait is still appropriate before doing substantive work.
- `manual` disables automatic follow-up and delayed nudge until the policy is changed or the user resumes/updates the goal.
- The goal remains `active`, not `paused`, while waiting.
- UI/tool output shows active-but-waiting state compactly.

## Grounded research findings

Source artifact: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/02-grounded-research.md`.

Current facts:

- `GoalState` has no idle/auto-continuation policy fields today.
- `continuation.ts` centralizes immediate auto-continuation scheduling and uses a 25ms timer.
- `maybeContinueGoal()` already stale-guards by goal id/status, idle state, pending messages, and safety counters.
- `constants.ts` already has a 90-second monitor interval, but delayed idle nudges should be a separate runtime timer/prompt from churn monitoring.
- `prompts.ts`, `ui.ts`, `widget.ts`, and `format.ts` have no active-waiting display or prompt context today.
- Sentrux planning sensor reported quality `6241` with exit `0`.

## Locked design choices

- Add optional fields to `GoalState`:
  - `autoContinueMode?: "immediate" | "idle_nudge" | "manual"`
  - `idleNudgeAfterSeconds?: number`
  - `idleWaitReason?: string`
  - `idleWaitingSince?: number`
- Missing mode means `immediate` for backward compatibility.
- `idle_nudge` default delay is 90 seconds.
- First release uses model tool parameters on goal create/update; slash command flags may be deferred.
- No new public goal status is introduced.
- Delayed nudge timer is separate from churn monitor timer.

## Implementation checklist

- [ ] Add idle policy types and bounded parsing helpers in `.pi/extensions/goal/types.ts` / state helpers.
- [ ] Extend `create_goal`, `create_goal_from_template`, and `update_goal` params to accept idle policy fields.
- [ ] Normalize policy fields during replay in `.pi/extensions/goal/state.ts`; do not rely on broad spread for idle policy fields.
- [ ] Extend `.pi/extensions/goal/continuation.ts` with delayed idle-nudge timer management and cancellation.
- [ ] Suppress immediate `agent_end` continuation for `idle_nudge` and `manual` modes.
- [ ] Add stale guards for delayed nudges: goal id, status active, unchanged policy, idle context, no pending messages.
- [ ] Extend prompts with wait reason and reassessment guidance.
- [ ] Extend tool output/footer/widget summaries with active waiting state.
- [ ] Ensure safety/no-progress telemetry does not punish intentionally idle waits.
- [ ] Add deterministic probes under `.ai/validation/`.
- [ ] Update README after implementation.
- [ ] Run `npm run quality:goal`.
- [ ] Run or explicitly justify skipping live probe per `.ai/docs/pi-goals-live-probe-testing.md`.

## Acceptance criteria

- Existing goals without policy fields behave exactly like current immediate continuation goals.
- An `idle_nudge` goal does not schedule the immediate 25ms follow-up at `agent_end`.
- An `idle_nudge` goal schedules one delayed nudge after the configured/default interval.
- Delayed nudges are stale-guarded and do not fire after pause, completion, clear, replacement, pending messages, or non-idle context.
- `manual` mode schedules no automatic continuation and no delayed nudge.
- Tool output and compact UI indicate active waiting mode and reason when configured.
- Replay preserves policy fields and defaults missing fields safely.
- Safety counters/no-progress handling does not classify intentional idle waiting as a no-progress loop.
- `npm run quality:goal` passes.

## Proof threat model

Source artifact: `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/04-proof-threat-model.md`.

Primary invariant: an active goal configured for `idle_nudge` may intentionally go idle without immediate auto-continuation, while still receiving a stale-guarded delayed nudge that asks the agent to reassess the wait.

False-green risks:

- Immediate continuation still fires for idle-nudge goals.
- Delayed nudge fires repeatedly or after state changed.
- Manual mode accidentally schedules a nudge.
- UI/tool output hides active waiting state.
- Replay drops policy fields and changes behavior.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,target_session,goal}:
  "ISSUE-016","execution-ready-first-pass","implement idle-nudge continuation policy","active goals can intentionally wait without immediate continuation and receive delayed reassessment nudges"
locked_requirements[6]{id,requirement}:
  "lr1","default missing policy remains immediate auto-continuation"
  "lr2","idle_nudge suppresses immediate agent_end follow-up and schedules one delayed stale-guarded nudge"
  "lr3","manual disables automatic follow-up and delayed nudges"
  "lr4","goal remains active rather than paused while waiting"
  "lr5","tool/UI/prompt surfaces show wait mode and reason compactly"
  "lr6","replay preserves policy fields and defaults older goals safely"
implementation_surfaces[6]{id,path,change}:
  "s1",".pi/extensions/goal/types.ts","add idle policy fields and types"
  "s2",".pi/extensions/goal/state.ts","normalize policy fields during replay"
  "s3",".pi/extensions/goal/tools.ts","accept policy fields on create/update"
  "s4",".pi/extensions/goal/continuation.ts","add delayed nudge timers and suppress immediate continuation by policy"
  "s5",".pi/extensions/goal/prompts.ts","include wait reason and reassessment instruction"
  "s6",".pi/extensions/goal/format.ts","render active waiting summaries for tool/UI/widget helpers"
```

## Required proofs

```toon
toon.version: 1
required_proofs[6]{name,source,command,pass_condition,scope,notes}:
  "quality_goal","ISSUE-016","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0","run","full extension quality gate after implementation"
  "idle_nudge_suppresses_immediate","ISSUE-016","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-idle-nudge-suppresses-immediate-probe.mjs","exit 0 and output includes PASS suppresses_immediate_continuation","run","must fail if 25ms follow-up still schedules for idle_nudge"
  "idle_nudge_stale_guard","ISSUE-016","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-idle-nudge-stale-guard-probe.mjs","exit 0 and output includes PASS stale_guard_blocks_invalid_nudge","run","must cover pause/complete/replace/pending-message stale cases"
  "manual_mode_probe","ISSUE-016","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-manual-mode-no-auto-probe.mjs","exit 0 and output includes PASS manual_schedules_no_auto_followup","run","must fail if manual mode schedules any automatic continuation"
  "idle_policy_replay_probe","ISSUE-016","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-idle-policy-replay-probe.mjs","exit 0 and output includes PASS idle_policy_replay_defaults","run","must prove older goals default to immediate and configured fields survive replay"
  "live_probe_or_skip","ISSUE-016","cd /Users/bryan/dev/personal/experiments/pi-goals && test -s .ai/validation/goal-idle-nudge-live-probe-closeout.md","exit 0","run","record live probe evidence or explicit deterministic-coverage skip rationale"
```

## Non-goals for first implementation

- Full external process monitoring; see watcher/dependency issue.
- Multi-agent orchestration; see parallel-goals issue.
- New public goal status beyond the existing status union.
- General calendar/scheduler semantics.
- Replacing churn monitor behavior.
