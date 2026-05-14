# ISSUE-014 — Agent-estimated goal progress percentage

Status: open
Priority: P2
Owner: unassigned
Created: 2026-05-08
Promoted: 2026-05-10
Target bucket: open
Issue kind: feature
Next best session: implement optional advisory progress estimates for pi-goals
Next best session rationale: State ownership, update semantics, UI rendering, safety-counter behavior, and proof shape are now locked.
Target repo roots: `~/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: `.ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md`
Related: `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`, `.ai/issues/open/ISSUE-024-goal-audit-command.md`

## Goal

Add optional agent-updated progress estimates to persistent goals, with instant reactive UI when used and no UI clutter when unused.

The estimate is advisory metadata only. It must not complete a goal, satisfy completion proofs, bypass audit/proof gates, or reset no-progress safety counters by itself.

## Problem/context

The runtime tracks objective, status, usage, budgets, completion floors, and internal telemetry, but it has no user-facing progress estimate. For long-running goals, users may ask the working agent to periodically estimate progress such as `35%` with a short rationale.

The previous refine issue left meaningful design forks unresolved: state vs telemetry vs event stream, numeric range, note requirements, stale display, widget layout, and safety-counter semantics. Those forks are now locked.

## Research artifacts

- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/00-request.md`
- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/01-protocol-read.md`
- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/02-grounded-research.md`
- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/03-design-lock.md`
- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/04-proof-threat-model.md`
- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/05-issue-writeback.md`
- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/06-final-audit.md`
- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/07-acceptance-traceability.md`
- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/08-implementation-handoff.md`
- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/09-stack-continuation-note.md`

Key raw logs:

- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/raw/pre-refinement-progress-invariant-probe-v2.log`
- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/raw/source-surface-inventory.log`
- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/raw/focused-source-excerpts.log`
- `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/raw/sentrux-gate-pre.log`

## Grounded findings

- `GoalState` is the durable user-visible goal state replayed from branch-local custom events.
- `GoalTelemetrySnapshot` is internal runtime/safety accounting, including turn counts and `lastProgressAt`; it should not own user-facing subjective estimates.
- `update_goal` already persists `GoalState` updates and calls `syncGoalUi()`, making it the right update surface for reactive progress UI.
- Current `update_goal` has no progress parameters.
- Current `lifecycle.ts` counts any successful `update_goal` result with a `goal` object as productive turn progress; this must be refined so progress-only updates do not defeat no-progress safety.
- ISSUE-011 locks the widget strategy: framed mode at width `>= 32`, compact unframed mode below 32, no generic Card component assumption, and visible-width-safe rendering.

## Locked design choices

### State ownership

Add optional progress estimate fields to `GoalState`:

```typescript
progressPercent?: number;
progressNote?: string;
progressUpdatedAt?: number;
```

Do not store first-pass progress estimates in telemetry or a separate event stream.

### Update API

Add `update_goal` params:

- `progress_percent?: number | null`
- `progress_note?: string | null`

Validation:

- `progress_percent` must be an integer `0..100` or `null`;
- `progress_note` must trim to at most 160 characters;
- empty string or `null` clears the note;
- `progress_percent: null` clears the whole estimate;
- note-only updates are rejected unless an estimate already exists;
- no-op progress updates are rejected.

### Advisory-only semantics

- `progress_percent: 100` is allowed but remains `est 100%`.
- A progress estimate never changes goal status.
- `status: complete` continues to use existing completion gates/floors/proofs.
- Progress estimates do not satisfy ISSUE-021 completion proofs or ISSUE-024 audit requirements.

### UI behavior

Progress is hidden when unset.

When set:

- footer status appends compact `est <percent>%`;
- `/goal`, `get_goal`, and `update_goal` output include `Progress estimate: <percent>%` plus note when present;
- framed widget mode adds one conditional progress row after the objective row;
- compact widget mode adds one conditional progress row after the status/objective row;
- all widget rendering must obey ISSUE-011 width rules and use `visibleWidth`/`truncateToWidth`.

No stale/expired visual styling in first release. Store `progressUpdatedAt` for future use.

### Safety counters

Progress-only `update_goal` calls must not count as productive work for no-progress safety counters.

Implementation should expose structured update metadata from `update_goal` so lifecycle can distinguish progress-only changes from substantive status/objective/budget/floor changes.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Store in telemetry | User-facing estimate should replay with goal state and appear in goal details. |
| Add separate progress stream first | Current state events already provide branch-local persistence and reactive UI. |
| Require notes for every update | Too heavy for quick estimates; optional bounded note is enough. |
| Restrict active goals to `0..99` | `100` can be useful as a subjective estimate; completion gates remain authoritative. |
| Auto-expire stale estimates | Adds time/display policy not needed for first release. |
| Count progress-only updates as progress | Would let agents avoid no-progress safety by changing subjective estimates. |

## TOON synthesis

```toon
toon.version: 1
issue{id,status,kind,goal}:
  "ISSUE-014",open,feature,"optional advisory goal progress estimates"
locked_requirements[6]{id,requirement}:
  "lr1","progress estimates are hidden until explicitly set"
  "lr2","progress persists branch-locally on GoalState and replays with the goal"
  "lr3","update_goal validates percent range, note length, clear semantics, and no-op cases"
  "lr4","progress_percent 100 never completes a goal or bypasses completion gates"
  "lr5","progress renders in footer, summaries, and widget without violating ISSUE-011 width rules"
  "lr6","progress-only updates do not count as productive work for no-progress safety"
invariants[5]{id,invariant}:
  "inv1","completion status remains controlled by status complete plus completion gates"
  "inv2","telemetry remains internal runtime accounting, not subjective user-facing estimate storage"
  "inv3","unset progress produces no empty placeholder UI"
  "inv4","all rendered progress rows are visible-width safe"
  "inv5","agent-facing output labels progress as estimate/advisory"
implementation_surfaces[7]{id,path,change}:
  "s1",".pi/extensions/goal/types.ts","add optional progress fields and update result metadata types"
  "s2",".pi/extensions/goal/state.ts","replay/parse optional progress fields safely"
  "s3",".pi/extensions/goal/tools.ts","add update_goal params, validation, clear semantics, and update classification"
  "s4",".pi/extensions/goal/tool-results.ts","show progress estimate in tool output and details"
  "s5",".pi/extensions/goal/format.ts","render progress in footer and slash summary"
  "s6",".pi/extensions/goal/widget.ts","render conditional progress row using ISSUE-011 framed/compact rules"
  "s7",".pi/extensions/goal/lifecycle.ts","ignore progress-only updates for productive-turn accounting"
```

## Implementation checklist

- [ ] Add optional `progressPercent`, `progressNote`, and `progressUpdatedAt` fields to `GoalState`.
- [ ] Add `progress_percent` and `progress_note` params to `UpdateGoalParams` and `UpdateGoalInput`.
- [ ] Implement validation/normalization for range, note length, note-only, clear, and no-op cases.
- [ ] Ensure progress update persists through existing `persistUpdateGoal()` / replay path.
- [ ] Add structured result metadata so lifecycle can detect progress-only updates.
- [ ] Update lifecycle no-progress accounting so progress-only updates do not increment `progressCount`.
- [ ] Render progress in footer, tool output, slash summary, and widget only when set.
- [ ] Respect ISSUE-011 compact/framed widget rendering rules.
- [ ] Update README wording so progress metadata claim is true and advisory.
- [ ] Add validation probes for update, replay, completion boundary, safety, and rendering.

## Acceptance criteria

- [ ] Goals without a progress estimate show no progress placeholder in footer, widget, `/goal`, or tool output.
- [ ] `update_goal({ progress_percent: 35 })` persists and immediately updates UI/tool output.
- [ ] `update_goal({ progress_percent: 35, progress_note: "..." })` stores and renders the note within length bounds.
- [ ] Invalid progress values (`-1`, `101`, fractions, note-only without existing percent) are rejected.
- [ ] `progress_percent: null` clears the estimate and hides progress UI again.
- [ ] `progress_percent: 100` does not mark the goal complete or bypass completion floors/proofs.
- [ ] Progress-only updates do not reset no-progress safety counters.
- [ ] Widget rendering with progress passes ISSUE-011 width/status coverage.
- [ ] `npm run quality:goal` passes.

## Proof threat model

See `.ai/docs/issue-workflow/ISSUE-014-goal-progress-estimates/04-proof-threat-model.md`.

## Required proofs

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

## Live probe requirement

Because this feature changes model-tool behavior and persistent UI rendering, implementation should normally validate on the live probe surface described by `.ai/docs/pi-goals-live-probe-testing.md`. A deterministic-only skip is acceptable only with a closeout explanation that exhaustive helper-level probes cover all changed seams.

## Non-goals

- Automatic model-judged progress without explicit user/agent update.
- Treating progress as objective completion proof.
- Multi-subgoal progress aggregation before subgoal runtime is implemented.
- Stale/expired progress display styling in the first release.
