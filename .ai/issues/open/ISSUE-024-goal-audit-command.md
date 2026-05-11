# ISSUE-024 — `/goal audit` pre-completion review command

Status: open — execution-ready for first audit command/tool pass
Priority: P1
Owner: pi-goal automation
Created: 2026-05-08
Updated: 2026-05-10
Next best session: focused implementation/validation pass for bounded goal audit UX
Next best session rationale: Command/tool semantics, prompt constraints, persistence posture, status behavior, and proof requirements are locked. Implementation can proceed without choosing product/runtime direction.
Target bucket: open
Issue kind: feature
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/fixed/ISSUE-020-goal-churn-monitor.md`
Related:
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`

## Goal

Add a bounded `/goal audit` command and `audit_goal` model tool that ask the agent to review current goal completion readiness against objective requirements and available evidence, without marking the goal complete or continuing goal work automatically.

## Problem/context

The continuation prompt already asks the agent to perform a completion audit before calling `update_goal(status: "complete")`, but users have no explicit command for "audit where we are right now." Users need a bounded review of objective requirements, completed work, missing evidence, proof/subgoal/floor state, blockers, and next recommendations without triggering normal continuation or completion.

This is distinct from nearby features:

- completion proofs (ISSUE-021) are runtime-enforced command/evidence gates;
- subgoals (ISSUE-015) are durable child workflow state;
- churn monitor (ISSUE-020) detects strategy loops and injects steering;
- `/goal audit` is a user-requested qualitative completion-readiness review.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/raw/commands.log`
- Sentrux planning sensor: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/raw/sentrux-gate.log`
- Research grep log: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/raw/research-rg.log`
- Downstream reference update: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/07-downstream-reference-update.md`
- Closeout summary: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/08-closeout-summary.md`
- Final validation logs: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/raw/open-promotion-validation.log`, `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/raw/quality-goal-open-promotion.log`, `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/raw/check-ignore-final.log`, `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/raw/diff-check.log`, `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/raw/status-final.log`
- Lifecycle/filter source recheck: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/09-lifecycle-filter-source-recheck.md`
- Tool output source recheck: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/10-tool-output-source-recheck.md`
- Model output parser reuse note: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/11-model-output-parser-reuse-note.md`
- Validation probe plan: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/12-validation-probe-plan.md`
- README and docs plan: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/13-readme-and-docs-plan.md`
- Queue continuation note: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/14-queue-continuation-note.md`
- Implementation handoff: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/15-implementation-handoff.md`
- Acceptance traceability: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/16-acceptance-traceability.md`
- Non-implementation boundary: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/17-nonimplementation-boundary.md`
- Proof command sanity: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/18-proof-command-sanity.md`
- Current inventory after promotion: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/19-current-inventory-after-promotion.md`
- UI/widget source recheck: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/20-ui-widget-source-recheck.md`
- Queue tools source recheck: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/21-queue-tools-source-recheck.md`
- Audit record schema sketch: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/22-audit-record-schema-sketch.md`
- Prompt contract sketch: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/23-prompt-contract-sketch.md`
- Reference audit: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/24-reference-audit.md`
- Dependency path probe: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/25-dependency-path-probe.md`
- Live probe scope note: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/26-live-probe-scope-note.md`
- Sentrux planning summary: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/27-sentrux-planning-summary.md`
- Quality gate summary: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/28-quality-gate-summary.md`
- Final linkage probe: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/29-final-linkage-probe.md`

## Desired behavior

- `/goal audit` works whenever a goal exists.
- `audit_goal` model tool exposes the same behavior without slash-command parsing.
- Audit sends a dedicated audit prompt/steer and triggers a visible agent response.
- Audit output restates objective requirements as a checklist and maps each item to concrete evidence.
- Checklist states include: `verified`, `missing`, `weak`, `blocked`, and `not_applicable`.
- Audit includes available proof gate status, subgoal status, floors, budgets, and relevant telemetry/monitor context when present.
- Audit never calls `update_goal(status:"complete")` automatically.
- Audit never schedules normal continuation or starts queued work automatically.
- Audit is stale-guarded by goal id and status.
- Paused, budget-limited, and complete goals can be audited as read-only reviews; audit must not resume or continue them.
- Audit records, if persisted, are bounded and replay-safe.

## Grounded research findings

Source artifact: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/02-grounded-research.md`.

Current facts:

- `command.ts` supports `pause`, `resume`, `clear`, and `queue`; there is no `audit` subcommand today.
- `prompts.ts` embeds a completion-audit checklist inside continuation guidance, but this is not a user-invoked bounded audit.
- `tools.ts` and `completion-gate.ts` own completion mutation and deterministic completion deferral; audit should not be implemented as a completion update.
- `monitor.ts` / `monitor-prompts.ts` implement third-party churn monitoring. Audit should not reuse the monitor judge or create a manual churn-check variant.
- `types.ts` / `state.ts` have no audit event or audit record types today.
- README does not document `/goal audit`.
- ISSUE-021 and ISSUE-015 create future state that audit should consume: proof gate status and subgoal completion/blocker state.
- ISSUE-020 is fixed; the previous refine dependency path was stale and has been corrected here.

## Locked design choices

Source artifact: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/03-design-lock.md`.

- `/goal audit` triggers a bounded audit steering prompt and a visible agent response.
- Add `audit_goal` model tool for parity and non-string-parsed natural-language use.
- Audit never marks complete and never schedules normal continuation.
- First pass persists only bounded audit metadata in a separate custom entry or goal-adjacent audit stream, not long audit prose on every `GoalState` snapshot.
- Audit is allowed for active, paused, budget-limited, and complete goals; absent goal is the only no-goal error.
- Audit prompt must require stale-guarding and status-aware read-only behavior.

Rejected/deferred:

- Manual churn-check variant; churn monitor remains separate.
- `/goal audit --churn` and other variants.
- Automatic completion after a green audit.
- Audit-owned proof execution; use ISSUE-021 proof tools/state instead.
- Widget-heavy audit history rendering.

## Implementation checklist

- [ ] Add `audit` to `GoalSubcommand` and autocomplete in `.pi/extensions/goal/command.ts`.
- [ ] Implement `handleGoalAuditCommand()` that validates a goal exists, sends audit steering, and does not schedule continuation.
- [ ] Add `audit_goal` model tool in a dedicated module or carefully scoped section of `tools.ts`.
- [ ] Add audit prompt builder, preferably separate from continuation/monitor prompts.
- [ ] Add `GoalSteeringKind` / details support for audit steering.
- [ ] Add bounded audit metadata event type/state replay support without storing full audit prose on `GoalState`.
- [ ] Include proof/subgoal/floor/budget summaries in audit context when available.
- [ ] Ensure paused/budget-limited/complete audits are read-only and do not call resume/continuation logic.
- [ ] Add deterministic probes under `.ai/validation/`.
- [ ] Update README `/goal` command docs and feature list.
- [ ] Run `npm run quality:goal`.
- [ ] Run or explicitly justify skipping live probe per `.ai/docs/pi-goals-live-probe-testing.md`.

## Acceptance criteria

- `/goal audit` is registered, autocompletes, and works when a goal exists.
- `audit_goal` tool produces the same audit prompt path and guard behavior.
- Audit response distinguishes verified, missing, weak, blocked, and not-applicable requirements.
- Audit cannot mark the goal complete by itself.
- Audit does not schedule normal continuation, queue steering, or monitor changes as a side effect.
- Audit is stale-guarded by goal id/status and safe for paused, budget-limited, and complete goals.
- Audit incorporates latest proof/subgoal/floor/budget state when present.
- Audit metadata persistence is bounded and replay-safe.
- README documents the command/tool behavior.
- `npm run quality:goal` passes.

## Proof threat model

Source artifact: `.ai/docs/issue-workflow/ISSUE-024-goal-audit-command/04-proof-threat-model.md`.

Primary invariant: a user-requested goal audit produces a bounded, evidence-mapped completion-readiness review for the current goal without marking the goal complete, starting/resuming normal continuation, or bypassing paused/budget-limited controls.

High-risk false greens:

- Audit accidentally uses continuation scheduling and keeps working.
- Audit prompt allows `update_goal(status:"complete")`.
- Audit ignores proof/subgoal/floor/budget state.
- Audit reviews a stale/replaced goal.
- Audit record persistence bloats or corrupts replay.
- Slash command and model tool diverge.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,target_session,goal}:
  "ISSUE-024","execution-ready-first-pass","implement bounded audit command/tool","user-requested audit reviews goal completion readiness without completing or continuing the goal"
locked_requirements[6]{id,requirement}:
  "lr1","/goal audit and audit_goal share one bounded audit prompt path"
  "lr2","audit output maps objective requirements to evidence states: verified, missing, weak, blocked, not_applicable"
  "lr3","audit never calls update_goal complete and never schedules normal continuation"
  "lr4","audit is stale-guarded by goal id/status and read-only for paused, budget-limited, and complete goals"
  "lr5","audit consumes proof, subgoal, floor, budget, and telemetry summaries when available"
  "lr6","audit metadata persistence is bounded and replay-safe"
implementation_surfaces[6]{id,path,change}:
  "s1",".pi/extensions/goal/command.ts","add audit subcommand and command handler"
  "s2",".pi/extensions/goal/tools.ts","register audit_goal or delegate to audit tool module"
  "s3",".pi/extensions/goal/prompts.ts","add dedicated audit prompt builder or import from audit-prompt module"
  "s4",".pi/extensions/goal/types.ts","add audit steering/details and bounded audit metadata types"
  "s5",".pi/extensions/goal/state.ts","replay bounded audit metadata without bloating GoalState snapshots"
  "s6","README.md","document /goal audit and audit_goal behavior"
verification_checks[5]{id,check,evidence}:
  "v1","audit command registered and does not schedule continuation","deterministic command probe"
  "v2","audit prompt forbids completion and requires evidence checklist states","prompt static probe"
  "v3","audit_goal shares command prompt path and guards","tool probe"
  "v4","paused and budget-limited audits are read-only","status behavior probe"
  "v5","audit metadata replay keeps goal status/objective stable","replay probe"
```

## Required proofs

```toon
toon.version: 1
required_proofs[7]{name,source,command,pass_condition,scope,notes}:
  "quality_goal","ISSUE-024","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0","run","full extension quality gate after implementation"
  "audit_command_probe","ISSUE-024","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-audit-command-probe.mjs","exit 0 and output includes PASS audit_command_no_continuation","run","must fail if audit is missing or schedules normal continuation"
  "audit_prompt_guard_probe","ISSUE-024","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-audit-prompt-guard-probe.mjs","exit 0 and output includes PASS audit_prompt_forbids_completion","run","must fail if audit prompt permits completion or lacks checklist states"
  "audit_tool_probe","ISSUE-024","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-audit-tool-probe.mjs","exit 0 and output includes PASS audit_tool_shared_guards","run","must fail if audit_goal diverges from slash command behavior"
  "audit_replay_probe","ISSUE-024","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-audit-replay-probe.mjs","exit 0 and output includes PASS audit_replay_bounded_metadata","run","must fail if audit records mutate goal status/objective or bloat replay state"
  "paused_budget_audit_probe","ISSUE-024","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-audit-status-probe.mjs","exit 0 and output includes PASS audit_readonly_for_paused_budget_limited","run","must fail if audit resumes or schedules continuation for paused/budget-limited goals"
  "live_probe_or_skip","ISSUE-024","cd /Users/bryan/dev/personal/experiments/pi-goals && test -s .ai/validation/goal-audit-live-probe-closeout.md","exit 0","run","record live /goal audit evidence or explicit deterministic-coverage skip rationale"
```

## Non-goals for first implementation

- Automatic completion after audit.
- `/goal audit --churn` or manual churn-check UX.
- Proof command execution owned by audit.
- Full audit history widget.
- Replacing the continuation prompt's normal completion audit guidance.
