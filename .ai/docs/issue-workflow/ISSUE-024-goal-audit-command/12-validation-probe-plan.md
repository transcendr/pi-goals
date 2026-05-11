# 12 — Validation probe plan

## Current validation inventory

Current `.ai/validation` scripts are focused on completion-floor behavior, not audit.

## Required audit probes

Add deterministic probes matching the issue's `required_proofs[]` rows:

1. `goal-audit-command-probe.mjs`
   - asserts `audit` appears in command subcommands/autocomplete;
   - asserts command handler does not call `scheduleContinuation` for audit;
   - based on `.pi/extensions/goal/continuation.ts`, specifically fail if the audit path can reach `scheduleMaybeContinueGoal()`, `setNextTurnOrigin("auto")`, or `pi.sendMessage(... { triggerTurn: true, deliverAs: "followUp" })` for normal continuation.
2. `goal-audit-prompt-guard-probe.mjs`
   - asserts audit prompt includes checklist states `verified`, `missing`, `weak`, `blocked`, `not_applicable`;
   - asserts audit prompt forbids `update_goal(status:"complete")`.
3. `goal-audit-tool-probe.mjs`
   - asserts `audit_goal` tool registration;
   - asserts command/tool share prompt builder or guard strings.
4. `goal-audit-replay-probe.mjs`
   - asserts bounded audit metadata replays without mutating goal status/objective.
5. `goal-audit-status-probe.mjs`
   - asserts paused/budget-limited audits are read-only and do not resume/schedule continuation.

## Live validation

Because this touches slash commands and live steering, run a live probe against the project live-probe surface or record a deterministic-coverage skip rationale in `.ai/validation/goal-audit-live-probe-closeout.md`.
