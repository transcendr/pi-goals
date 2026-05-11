# ISSUE-019 — Parallel multiple goals

Status: open — execution-ready for bounded multi-goal collection/focus implementation pass
Priority: P1
Owner: pi-goal automation
Created: 2026-05-08
Updated: 2026-05-11
Next best session: focused implementation/validation pass for multi-goal collection, focus/switch, and external-handle tracking
Next best session rationale: The major architecture forks are locked: first pass introduces a multi-goal collection with one local-active goal in the current session, explicit focus/switch semantics, per-goal budgets/proofs/worktree metadata, and metadata-only external parallel handles. It does not silently spawn background model sessions or implement a full team runtime inside `pi-goal`.
Target bucket: open
Issue kind: feature
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/issues/open/ISSUE-018-goal-start-in-worktree.md`
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
Related:
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`
- `.ai/issues/open/ISSUE-023-goal-dependency-triggers-and-watchers.md`
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`

## Goal

Add first-class support for multiple top-level `pi-goal` records so users/agents can maintain named independent goals, focus/switch among them, run sequential multi-goal plans safely, and track explicitly launched external parallel work without cross-goal steering, budget, proof, or worktree leakage.

First release target: a bounded multi-goal collection with one `local_active` goal per Pi session, explicit focus/switch/list/add/update surfaces, external-session/worktree handles for user-mediated parallel work, and no automatic background model spawning.

## Problem/context

The current extension intentionally supports one branch-local goal. Larger workflows need multiple independent top-level goals: release checklist items, parallel investigation paths, implementation shards, or external worktree sessions. This cannot be bolted onto the single `GoalState` casually because state, UI, continuation, budgets, proofs, and worktree/session ownership become multi-tenant.

This issue is distinct from nearby features:

- ISSUE-015 nested subgoals are one-level child workflows inside a parent goal, not independent top-level goals.
- ISSUE-018 worktree starts provide safe one-goal worktree preparation/adoption and explicitly defer automatic multi-agent orchestration.
- ISSUE-027 queue is durable FIFO future work, not a visible set of active named goals.
- ISSUE-023 dependency triggers/watchers should later consume multi-goal status but should not define the first multi-goal state model.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/06-final-audit.md`
- Acceptance traceability: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/07-acceptance-traceability.md`
- Implementation handoff: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/08-implementation-handoff.md`
- Completion audit: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/09-completion-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/commands.log`
- Sentrux planning sensor: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/sentrux-gate.log`
- Stale reference scan before promotion: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/stale-019-references-before.log`
- Stale reference audit after promotion: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/stale-reference-audit.log`
- Targeted invariant probe: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/issue019-invariant-probe.log`
- Quality gate log: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/quality-goal-open-promotion.log`
- Final validation log: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/final-validation.log`
- Validation expansion final probe: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/validation-expansion-final.log`
- Protocol coverage probe: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/protocol-coverage-probe.log`
- Comprehensive completion probe: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/comprehensive-completion-probe.log`

## Desired behavior

### Multi-goal collection state

- Preserve `GoalState` as the per-goal record shape.
- Add a collection-level replayed state such as `GoalSetState` with:
  - bounded ordered `goals[]`;
  - stable per-goal ids and short optional names;
  - `focusedGoalId` for default detail/audit/tool context;
  - `localActiveGoalId` for the one goal that current-session continuation/monitor/budget-wrap-up may control;
  - aggregate counts by status/owner;
  - schema version and migration metadata.
- Existing sessions without collection state behave exactly as they do today.
- Creating the first multi-goal collection lazily wraps the current single goal when needed rather than forcing a migration at startup.

### Ownership and status semantics

- `focused`: selected detail target for `/goal`, `get_goal`, audit, and UI drill-down.
- `local_active`: the one goal in this Pi session eligible for normal auto-continuation, churn monitoring, turn accounting, and budget wrap-up.
- `external_active`: a goal whose work is occurring in another explicit session/worktree/process and is only tracked/synchronized by explicit commands/tools in this controller session.
- `paused`, `blocked`, and `complete` remain per-goal control/terminal states.
- At most one goal may be `local_active` in one Pi session in the first pass.

### Sequential mode

- Users/agents can add multiple named top-level goal records.
- `/goal list` and `list_goals` show aggregate state and compact rows.
- `/goal focus <goal-id>` changes the default detail target without resuming or continuing.
- `/goal switch <goal-id>` makes a pending/paused local goal the local active goal only after canceling/pausing the previous local-active owner.
- Completing one goal can optionally suggest the next pending goal but must not auto-start it unless an explicit command/tool path does so.
- Existing queue behavior remains unchanged for simple FIFO future work.

### Parallel/external mode

- First pass supports explicit external parallel goal handles, not silent model/session spawning.
- External goal records may include:
  - `executionOwner: "external_session" | "external_process"`;
  - worktree metadata from ISSUE-018;
  - session path/id when known;
  - last known status and sync timestamp;
  - optional external command/process metadata if a future explicit runner provides it.
- The current session lists and audits external metadata but does not auto-continue, monitor, budget-wrap-up, or complete external goals without explicit synchronization.
- Any real process/session launch beyond metadata adoption requires explicit user/agent action, concurrency caps, and live proof/cleanup evidence.

### Focus/context isolation

- Continuation, monitor, pause steering, budget wrap-up, and completion gates operate only on `localActiveGoalId`.
- Steering messages include goal id and steering kind; context filtering removes stale steering for non-local/non-current goals.
- Mutating commands/tools require `goal_id` unless they clearly target the focused goal by documented default.
- Proof, checkpoint/history, audit, subgoal, and worktree metadata are partitioned per goal.
- External goals never receive current-session follow-up messages by accident.

### UI/tool output

- `get_goal` returns the focused goal plus compact multi-goal aggregate metadata when a collection exists.
- `list_goals` uses a small AXI-friendly schema: id/name/status/owner/focus/local-active/worktree-or-session summary/budget summary.
- Narrow widget/footer remains focused/local-active oriented and may add a compact aggregate suffix such as `goals 1 active / 2 paused / 1 external`.
- Detailed multi-goal tables live in `/goal list` and `list_goals`, not in the narrow widget.
- No-collection/single-goal rendering remains unchanged.

## Grounded research findings

Source artifact: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/02-grounded-research.md`.

Current facts:

- `GoalState` currently represents exactly one top-level goal with one status/objective/budget/floor/usage set.
- `state.ts` keeps a single `runtimeState: { goal, telemetry }`; replay applies branch-local events and ignores stale goal-id updates.
- `tools.ts` `create_goal` refuses creation when any non-complete goal exists.
- `command.ts` `/goal <objective>` creates one active goal or asks `Replace`, `Queue`, `Cancel` when a goal already exists.
- Queue state is durable FIFO future work but not active named-goal state.
- `continuation.ts`, `lifecycle.ts`, monitor reports, UI, and widget rendering are all single-local-goal oriented today.
- Pi docs expose replacement sessions and explicit `sendUserMessage`, but ISSUE-018 found no cwd override for safe automatic worktree session replacement.
- Pi's example `subagent` extension proves separate Pi process spawning is technically possible with cwd and concurrency limits, but that is a larger explicit runtime than this first pass should hide inside `pi-goal`.
- Sentrux planning sensor: `sentrux gate --save .pi/extensions/goal` exited `0` with quality `6241`.

## Locked design choices

Source artifact: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/03-design-lock.md`.

- Add a collection-level `GoalSetState` concept while preserving `GoalState` as the per-goal record shape.
- Existing single-goal sessions remain backward compatible and are treated as implicit one-goal collections only when needed.
- First pass permits exactly one `local_active` goal in the current Pi session.
- Parallel first pass means explicit external-session/worktree handles, not automatic background model spawning.
- Focus and local active are separate: focus is for detail/inspection; local active is for continuation/monitor/turn side effects.
- Budgets, floors, telemetry, proofs, subgoals, checkpoints, and worktree metadata are per goal.
- Queue items and ISSUE-015 subgoals remain separate mechanisms, not top-level parallel goals.
- UI is aggregate/list-first and compact in the widget/footer.

Rejected alternatives:

- Multiple local-active goals in one Pi session.
- Reusing queue items as active named goals.
- Treating subgoals as parallel top-level goals.
- Silent automatic spawning of Pi/model sessions.
- A full team runtime inside `pi-goal`.
- Shared proof/budget state across goals.
- Replacing `/goal <objective>` default behavior.

## Implementation checklist

- [ ] Add multi-goal types/caps such as `GoalSetState`, `GoalRecord`, `GoalExecutionOwner`, and aggregate status helpers in `.pi/extensions/goal/types.ts` or a focused module.
- [ ] Add replay/persistence helpers in a dedicated module such as `.pi/extensions/goal/multi-state.ts`; keep backward-compatible single-goal replay semantics.
- [ ] Add collection adapter helpers that expose focused/local-active goal to existing `get_goal`/completion/continuation paths without losing aggregate metadata.
- [ ] Add `/goal list`, `/goal focus <goal-id>`, `/goal switch <goal-id>`, and `/goal add ... -- <objective>` command paths without changing `/goal <objective>` default behavior.
- [ ] Add model tools such as `list_goals`, `create_multi_goal`, `focus_goal`, `switch_active_goal`, and `update_multi_goal` with explicit `goal_id` requirements for non-focused mutations.
- [ ] Ensure focus changes do not schedule continuation and switch cancels/pauses the previous local-active owner before activating another.
- [ ] Extend continuation, lifecycle turn accounting, monitor scheduling, pause/resume, budget wrap-up, and completion gates to target only `localActiveGoalId`.
- [ ] Ensure external goal handles cannot receive current-session continuation/monitor/budget-wrap-up.
- [ ] Keep queue and subgoal storage/tool paths distinct from multi-goal top-level records.
- [ ] Extend `tool-results.ts`, `format.ts`, `ui.ts`, and `widget.ts` with compact aggregate and focused-goal rendering.
- [ ] Update README with multi-goal list/focus/switch/add behavior, external-handle boundary, and no-silent-spawn guarantee.
- [ ] Add deterministic probes under `.ai/validation/` matching required proofs.
- [ ] Run `npm run quality:goal`.
- [ ] Run a live probe if real external session/process launch is implemented; otherwise create an explicit deterministic-coverage skip closeout.

## Acceptance criteria

- Existing single-goal sessions and `/goal <objective>` behavior remain backward compatible.
- A multi-goal collection can store multiple named top-level goal records with stable ids and per-goal budgets/floors/status.
- `/goal list`/`list_goals` shows all goal records with focus/local-active/external ownership state.
- Focus changes the default detail target without resuming, continuing, or mutating status.
- Switch activates exactly one local goal and cancels/pauses the previous local-active owner safely.
- Continuation, monitor, pause steering, budget wrap-up, and completion operate only on the local-active goal.
- External goal records can be tracked with session/worktree metadata but are never auto-driven by the current session.
- Clearing/updating/completing one goal does not mutate unrelated goals.
- Queue items and subgoals remain separate from top-level multi-goal records.
- Per-goal proof/budget/worktree/checkpoint metadata cannot satisfy or affect another goal.
- UI/widget rendering remains readable and no-collection rendering stays unchanged.
- README documents the feature and safety boundaries.
- `npm run quality:goal` passes.

## Proof threat model

Source artifact: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/04-proof-threat-model.md`.

Primary invariant: a multi-goal collection must preserve independent goal identity, budgets, proofs, worktree/session ownership, and steering context so that only the selected local-active goal receives local continuation/monitor/budget side effects, while other local/external goals remain inspectable and cannot be accidentally mutated or completed.

High-risk false greens:

- `get_goal`/completion/continuation silently operate on the wrong goal after focus or switch.
- Multiple local goals receive continuation or monitor steering in the same session.
- Clearing/focusing/switching one goal mutates unrelated goals.
- Queue items, subgoals, and top-level goal records are conflated.
- External parallel goal handles are treated as locally controlled.
- Proof/budget/checkpoint state is shared across goals.
- Implementation silently spawns paid/background Pi sessions.
- Existing single-goal sessions regress.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,target_session,goal}:
  "ISSUE-019","execution-ready-first-pass","implement multi-goal collection/focus core","multiple top-level goals are durable and independently controlled without cross-goal steering or silent parallel spend"
locked_requirements[8]{id,requirement}:
  "lr1","preserve GoalState as per-goal record and add collection-level GoalSetState"
  "lr2","existing single-goal sessions remain backward compatible"
  "lr3","only one local_active goal per Pi session receives continuation, monitor, turn accounting, and budget wrap-up"
  "lr4","focus changes inspection/detail target without resuming or continuing"
  "lr5","external parallel goals are explicit metadata/session/worktree handles, not silently spawned model sessions"
  "lr6","budgets, floors, telemetry, proofs, subgoals, checkpoints, and worktree metadata are partitioned per goal"
  "lr7","queue items and subgoals remain distinct from top-level multi-goal records"
  "lr8","list/tool/UI surfaces show aggregate ownership/status without crowding the narrow widget"
invariants[7]{id,invariant}:
  "inv1","no more than one local_active goal exists in one session"
  "inv2","non-local and external goals never receive current-session follow-up steering"
  "inv3","mutating one goal never mutates unrelated goals without explicit collection-wide command"
  "inv4","proof or budget evidence from one goal cannot complete another goal"
  "inv5","focus is not resume and switch is not silent parallel spawn"
  "inv6","single-goal default command behavior remains unchanged"
  "inv7","external launch, if ever implemented, requires explicit action and concurrency caps"
implementation_surfaces[8]{id,path,change}:
  "s1",".pi/extensions/goal/types.ts","add multi-goal collection and execution-owner types"
  "s2",".pi/extensions/goal/multi-state.ts","new replay/persistence helpers for collection state"
  "s3",".pi/extensions/goal/state.ts","preserve single-goal compatibility and adapter boundary"
  "s4",".pi/extensions/goal/command.ts","add list/focus/switch/add command paths"
  "s5",".pi/extensions/goal/multi-tools.ts","add structured list/create/focus/switch/update tools"
  "s6",".pi/extensions/goal/continuation.ts","target only localActiveGoalId and block external handles"
  "s7",".pi/extensions/goal/lifecycle.ts","partition turn accounting/monitor/budget side effects by local-active goal"
  "s8",".pi/extensions/goal/widget.ts","render focused goal plus compact aggregate counts"
verification_checks[7]{id,check,evidence}:
  "v1","collection replay preserves per-goal state and single-goal compatibility","replay probe"
  "v2","focus and switch cannot leave two local-active goals","focus/switch probe"
  "v3","only local-active receives continuation/monitor/budget side effects","continuation isolation probe"
  "v4","clear/update/complete one goal does not mutate unrelated goals","mutation boundary probe"
  "v5","queue items and subgoals are not treated as top-level parallel goals","boundary probe"
  "v6","list/tool/widget output exposes aggregate ownership/status and preserves no-collection rendering","render probe"
  "v7","external launch is absent or explicitly proven with cleanup/concurrency caps","live probe or skip closeout"
```

## Required proofs

```toon
toon.version: 1
required_proofs[8]{name,source,command,pass_condition,scope,notes}:
  "quality_goal","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0","run","full extension quality gate after implementation"
  "multi_goal_replay_probe","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-multi-replay-probe.mjs","exit 0 and output includes PASS multi_goal_collection_replays","run","must fail if collection ids/status/focus/local-active/per-goal budgets are lost or older single-goal replay regresses"
  "focus_switch_probe","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-multi-focus-switch-probe.mjs","exit 0 and output includes PASS focus_switch_isolated","run","must fail if focus schedules continuation or switch leaves two local-active goals"
  "continuation_isolation_probe","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-multi-continuation-isolation-probe.mjs","exit 0 and output includes PASS only_local_active_continues","run","must fail if paused, focused-only, or external goals receive local continuation/monitor/budget side effects"
  "mutation_boundary_probe","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-multi-mutation-boundary-probe.mjs","exit 0 and output includes PASS per_goal_mutations_do_not_leak","run","must fail if clear/update/complete of one goal mutates unrelated goals"
  "queue_subgoal_boundary_probe","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-multi-queue-subgoal-boundary-probe.mjs","exit 0 and output includes PASS queue_subgoal_multi_goal_boundaries","run","must fail if queue items or ISSUE-015 subgoals are treated as parallel top-level goals"
  "multi_goal_render_probe","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-multi-render-probe.mjs","exit 0 and output includes PASS multi_goal_compact_rendering","run","must fail if list/tool/widget summaries hide ownership/status counts or break single-goal rendering"
  "live_parallel_probe_or_skip","ISSUE-019","cd /Users/bryan/dev/personal/experiments/pi-goals && test -s .ai/validation/goal-multi-live-probe-closeout.md","exit 0","run","record live external-session/process evidence if implemented, or an explicit deterministic-coverage skip rationale when first pass has metadata-only external handles"
```

## Non-goals for first implementation

- Silent automatic spawning of paid/background model sessions.
- A full team runtime inside `pi-goal`.
- Multiple local-active goals in one Pi session.
- Cross-goal dependency solving or watcher triggers; see ISSUE-023.
- Treating ISSUE-015 nested subgoals as independent top-level goals.
- Replacing the existing FIFO queue.
- Full dashboard UI beyond compact aggregate/focused-goal rendering.
