# 04 — Proof threat model

Issue: ISSUE-014 — agent-estimated goal progress percentage
Date: 2026-05-10

## Primary invariant

Progress estimates are optional, durable, advisory goal metadata. They update UI when set, stay hidden when unset, and never weaken completion gates, proof requirements, or no-progress safety accounting.

## False-green risks

| Risk | False-green mode | Required proof |
|---|---|---|
| Progress becomes completion | `update_goal({ progress_percent: 100 })` marks goal complete or bypasses completion floors | behavior probe asserts active status remains active and completion-gate tests still block early completion |
| Hidden-by-default breaks | unset goals render `undefined`, empty progress rows, or stale placeholder text | render probe covers unset state across footer/widget/tool summary |
| Progress is not durable | estimate updates UI once but disappears after replay/resume | replay probe creates update event and verifies `replayGoalState()` restores fields |
| Invalid estimates accepted | negative, fractional, >100, or note-only values persist | update validation probe covers invalid ranges and note-only rejection |
| Progress-only updates defeat safety | repeated subjective estimate updates reset no-progress counters | lifecycle/tool-result probe asserts progress-only update details do not increment `progressCount` |
| Widget breaks ISSUE-011 rules | progress row overflows or framed/compact split regresses | render probe covers all statuses and widths around 32 |
| Proofs are only static | grep/typecheck passes while behavior is wrong | deterministic behavior probes plus live probe or explicit deterministic skip note |

## Deterministic proof strategy

The implementation should add focused validation under `.ai/validation/` or equivalent tests that execute the relevant helpers directly. The tests must cover:

- schema/validation for `progress_percent` and `progress_note`;
- replay persistence through `GoalState` events;
- `update_goal(progress_percent: 100)` does not complete the goal;
- progress-only update result metadata does not count as productive work;
- footer/tool/widget rendering hidden unset and visible set;
- ISSUE-011 width/status coverage with progress row present.

## Live probe stance

This feature touches model tools and persistent UI rendering, so implementation should usually run a bounded live Pi probe following `.ai/docs/pi-goals-live-probe-testing.md`. A deterministic-only skip is acceptable only if the implementation closeout explains that exhaustive helper-level probes cover update/replay/render semantics and no live extension runtime behavior changed outside those seams.

## Required proof rows

```toon
toon.version: 1
required_proofs[7]{id,command,pass_condition,evidence,notes}:
  "sentrux_gate_goal","sentrux gate --save .pi/extensions/goal","exit 0 and no structural degradation",".ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/raw/sentrux-gate-impl.log","run before/after implementation as project protocol requires"
  "progress_update_validation_probe","node .ai/validation/goal-progress-estimate-probe.mjs validation","exit 0; rejects invalid range/fraction/note-only/no-op and accepts 0, 35, 100",".ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/raw/progress-update-validation-probe.log","must fail if update_goal validation is too permissive"
  "progress_replay_probe","node .ai/validation/goal-progress-estimate-probe.mjs replay","exit 0; replay restores percent,note,updatedAt and clear removes them",".ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/raw/progress-replay-probe.log","must prove branch-local persistence"
  "progress_completion_boundary_probe","node .ai/validation/goal-progress-estimate-probe.mjs completion","exit 0; progress_percent 100 does not set complete or bypass completion floors",".ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/raw/progress-completion-boundary-probe.log","guards advisory-only invariant"
  "progress_safety_counter_probe","node .ai/validation/goal-progress-estimate-probe.mjs safety","exit 0; progress-only update does not count as productive turn progress",".ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/raw/progress-safety-counter-probe.log","guards no-progress safety invariant"
  "progress_render_probe","node .ai/validation/goal-progress-render-probe.mjs","exit 0; unset hidden, set visible, all statuses and widths 8,12,20,31,32,33,72,100 visible-width safe",".ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/raw/progress-render-probe.log","must incorporate ISSUE-011 framed/compact rules"
  "quality_goal","npm run quality:goal","exit 0",".ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/raw/quality-goal.log","required project quality gate"
```
