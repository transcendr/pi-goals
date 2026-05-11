# ISSUE-022 — Goal history, checkpoints, and compaction-aware handoffs

Status: open — execution-ready for first checkpoint/history implementation pass
Priority: P2
Owner: pi-goal automation
Created: 2026-05-08
Updated: 2026-05-10
Next best session: focused implementation/validation pass for branch-replayed checkpoints and history UX
Next best session rationale: Storage location, trigger model, authorship, compaction posture, context bounds, export behavior, and proof requirements are locked for a bounded first release. Implementation can proceed without choosing product/API direction.
Target bucket: open
Issue kind: feature
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: none for the bounded first checkpoint/history pass
Related:
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`
- `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`
- `.ai/docs/pi-goals-live-probe-testing.md`

## Goal

Add durable, bounded, branch-replayable goal checkpoints and history surfaces so long-running `pi-goal` work can survive reloads, compaction, handoffs, and branch navigation with a concise timeline of state changes, proof/subgoal summaries when available, blockers, and next action.

First release target: separate checkpoint custom entries plus manual/lifecycle checkpoint creation, compact history list/export UX, and compaction-aware handoff hints. This is intentionally narrower than full transcript archival, project management, or replacing Pi's native compaction.

## Problem/context

`pi-goal` already persists compact state and telemetry into the Pi session branch, but it does not produce human-readable checkpoints. Long goals can span compaction, `/reload`, `/tree`, queue orchestration, budget-limited wrap-up, and handoff between agents. A future maintainer needs a concise timeline without rereading the entire transcript or injecting every historical detail into provider context.

Nearby features make this more important:

- ISSUE-015 adds nested subgoals whose completion/blocker state should appear in handoff checkpoints.
- ISSUE-021 adds proof gates/results whose latest status should be summarized, not duplicated unboundedly.
- ISSUE-016 adds active waiting/idle-nudge semantics that checkpoints should record at lifecycle boundaries.
- ISSUE-024 adds qualitative audit; audit may consume latest checkpoint metadata but should not own history.
- ISSUE-023 watchers will later need history/export hooks for external-trigger handoffs.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/06-final-audit.md`
- Replay and compaction source check: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/07-replay-and-compaction-source-check.md`
- Validation probe plan: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/08-validation-probe-plan.md`
- README update plan: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/09-readme-update-plan.md`
- Package script proof check: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/10-package-script-proof-check.md`
- Acceptance traceability: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/11-acceptance-traceability.md`
- Implementation handoff: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/12-implementation-handoff.md`
- Stale reference audit: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/13-stale-reference-audit.md`
- Stack compatibility review: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/14-stack-compatibility-review.md`
- Non-implementation boundary: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/15-nonimplementation-boundary.md`
- Queue continuation note: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/16-queue-continuation-note.md`
- Final diff snapshot: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/17-final-diff-snapshot.md`
- Closeout summary: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/18-closeout-summary.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/raw/commands.log`

## Desired behavior

### Runtime checkpoint storage

- Checkpoints are stored as separate branch-replayed custom entries, e.g. `pi-goal-checkpoint`, with defensive replay similar to `pi-goal-state`.
- Checkpoints are associated with a `goalId` and ignored when stale for a different effective goal.
- Full checkpoint arrays are not embedded in every `GoalState` snapshot.
- Runtime replay keeps a compact bounded index: latest checkpoint, counts by trigger, and a capped recent list for history views.

### Checkpoint schema

Each checkpoint records bounded deterministic fields, with implementation names tunable while preserving semantics:

- `checkpointId`
- `goalId`
- `trigger`: `manual`, `pause`, `budget_limited`, `complete`, `before_compact`, `after_compact`, or future-safe string enum
- `at`
- `goalStatus`
- `objectiveExcerpt` and/or objective fingerprint, never unbounded objective duplication
- usage/budget/floor summary
- active subgoal summary when fields exist
- latest proof summary when fields exist
- blocker/next-action summary
- optional bounded caller note
- session metadata such as session id, cwd, and branch entry count when available
- schema version and source reason

Caps are mandatory for note, summary, excerpt, recent-list count, and exported line length.

### Command and model-tool UX

- `/goal checkpoint [note]` creates a manual checkpoint for the current goal.
- `/goal history` lists a compact bounded history for the current goal.
- A model tool such as `create_goal_checkpoint` creates an explicit handoff checkpoint with optional bounded note/next action.
- A model tool or command such as `export_goal_history` explicitly writes a markdown timeline when requested.
- No checkpoint/history command should resume, continue, complete, clear, or dequeue goals.

### Lifecycle triggers

- Automatic checkpoints occur only at clear lifecycle boundaries:
  - pause;
  - budget-limited transition;
  - successful completion;
  - before/after compaction events.
- Automatic checkpoints are deduplicated by goal id + trigger + relevant status transition/compaction event so repeated handlers do not create churn.
- No every-turn, timer-based, or monitor-driven checkpoints in the first release.

### Compaction-aware handoff

- Register `session_before_compact` and/or `session_compact` handling in the goal lifecycle.
- Create a compact checkpoint around compaction when a goal exists.
- If the extension API supports safe compaction-instruction mutation, include at most the latest checkpoint id/short summary and current goal status; never inject the full checkpoint history.
- If safe instruction mutation is not supported, still create bounded before/after compaction checkpoints and expose them through history/export surfaces.
- Do not replace Pi's native compaction behavior.

### Context and export bounds

- Normal continuation/provider context does not receive full checkpoint history.
- Prompts/tools may include only latest checkpoint metadata or small counts where useful.
- Exported markdown is derived from replayed checkpoint entries and written only by explicit command/tool invocation.
- Branch replay remains the source of truth; exported files are handoff artifacts, not runtime state.

## Grounded research findings

Source artifact: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/02-grounded-research.md`.

Inspected surfaces:

- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/tool-results.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/monitor-report.ts`
- `.pi/extensions/goal/constants.ts`
- `.pi/extensions/goal/index.ts`
- Pi extension API type definitions for compaction/session events
- `README.md`
- promoted issue docs for ISSUE-015, ISSUE-016, ISSUE-021, and ISSUE-024

Current facts:

- `GoalState` has no checkpoint/history fields today.
- `GoalTelemetrySnapshot` is useful as compact input but is not a human-readable timeline.
- `state.ts` persists and replays branch-local custom entries defensively; checkpoint replay should copy this pattern.
- Pi extension APIs expose `session_before_compact` and `session_compact`; current goal lifecycle does not listen to them.
- `monitor-state.ts` provides a dedicated replayed custom-entry precedent with capped evidence summaries and bounded recent-list access.
- `queue-state.ts` demonstrates defensive optional-field parsing but intentionally reuses `STATE_ENTRY_TYPE`; checkpoint history should use a dedicated entry type instead of overloading goal/queue state events.
- `monitor-report.ts` provides a proven bounded-summary pattern over branch entries, telemetry, monitor logs, floor state, and session metadata.
- `command.ts` has no `checkpoint`/`history` subcommands.
- `tools.ts` has no checkpoint creation/list/export tools.
- `README.md` documents replayable state and monitor logs, but not human-readable checkpoints/history.
- Sentrux planning sensor: `sentrux gate --save .pi/extensions/goal` saved baseline quality `6241`.

## Locked design choices

Source artifact: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/03-design-lock.md`.

- Checkpoints live in a separate replayed custom-entry stream, not as full arrays on `GoalState`.
- Manual command/tool checkpointing is first-class.
- Automatic checkpoints are limited to pause, budget-limited transition, completion, and compaction-adjacent lifecycle events.
- Checkpoint summaries are deterministic extension-built summaries; optional caller notes are bounded and non-authoritative.
- Normal provider context receives no full history; explicit list/export surfaces own history disclosure.
- Branch-local custom entries are the source of truth; markdown export is explicit and derived.
- Compaction handling adds bounded handoff metadata only and does not replace Pi compaction.

Rejected alternatives:

- Full checkpoint arrays embedded in `GoalState`.
- Markdown files as the runtime source of truth.
- Unbounded model-written checkpoint prose.
- Every-turn/timer/monitor-driven checkpoint creation.
- Full history injection into continuation/monitor prompts.

## Implementation checklist

- [ ] Add checkpoint constants, types, caps, and helpers in a dedicated module such as `.pi/extensions/goal/checkpoints.ts` plus minimal shared types in `types.ts`.
- [ ] Add custom entry type such as `pi-goal-checkpoint` and schema version constant.
- [ ] Implement defensive branch replay for checkpoint entries with goal-id filtering, cap enforcement, and stale-entry ignoring.
- [ ] Register lifecycle hooks for pause, budget-limited transition, completion, `session_before_compact`, and/or `session_compact`.
- [ ] Add dedupe keys so automatic lifecycle checkpoints do not repeat for the same transition/event.
- [ ] Add `/goal checkpoint` and `/goal history` command paths without changing existing `/goal` default behavior.
- [ ] Add model tools for checkpoint creation and history/export, or a dedicated checkpoint tool module registered from `tools.ts`.
- [ ] Extend `tool-results.ts`/format helpers with compact latest-checkpoint and history-count summaries.
- [ ] Ensure prompt builders do not inject full checkpoint history; include only latest checkpoint metadata if needed.
- [ ] Add explicit markdown export that writes only when requested and uses predictable bounded output.
- [ ] Update README with checkpoint/history UX, branch-local source of truth, export behavior, and context-bound guarantee.
- [ ] Add deterministic probes under `.ai/validation/` matching required proofs.
- [ ] Run `npm run quality:goal`.
- [ ] Run a live probe or record a deterministic-coverage skip rationale per `.ai/docs/pi-goals-live-probe-testing.md`.

## Acceptance criteria

- Manual checkpoint creation works for an active, paused, budget-limited, or complete goal without changing goal status.
- `/goal history` or equivalent tool lists a bounded branch-local checkpoint timeline for the current goal.
- Checkpoints replay correctly after reload and `/tree` navigation.
- Full checkpoint history is not appended to `GoalState` snapshots.
- Automatic checkpoints occur only at selected lifecycle boundaries and dedupe repeated events.
- Compaction creates or references a bounded checkpoint/handoff summary without replacing Pi compaction.
- Normal continuation/provider prompts do not include full history.
- Checkpoints summarize proof/subgoal/floor/budget/telemetry state when present but do not satisfy proof gates or completion audits by themselves.
- Exported markdown history is explicit, bounded, and derived from replayed checkpoint entries.
- README documents the feature.
- `npm run quality:goal` passes.

## Proof threat model

Source artifact: `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/04-proof-threat-model.md`.

Primary invariant: goal checkpoints provide a bounded, branch-replayable, human-readable timeline for handoff/compaction/reload without bloating `GoalState` snapshots or normal provider context, and without weakening completion/proof/subgoal semantics.

High-risk false greens:

- Checkpoints stored as unbounded arrays on `GoalState`.
- Replay loses checkpoints after reload/tree/compaction.
- Automatic triggers create every-turn or repeated checkpoint churn.
- Compaction still lacks checkpoint/handoff integration.
- Full history is injected into continuation/monitor prompts.
- Checkpoints are treated as completion proof.
- Notes or summaries store unbounded transcript/sensitive content.
- Export happens automatically or to unpredictable paths.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,target_session,goal}:
  "ISSUE-022","execution-ready-first-pass","implement checkpoint/history core","bounded branch-replayed checkpoints improve handoff and compaction without context bloat"
locked_requirements[7]{id,requirement}:
  "lr1","store checkpoints as separate branch-replayed custom entries, not full arrays on GoalState"
  "lr2","manual checkpoint command/tool creates bounded deterministic summaries with optional capped note"
  "lr3","automatic checkpoints occur only on pause, budget-limited transition, completion, and compaction-adjacent events"
  "lr4","history list/export is explicit, bounded, and derived from replayed checkpoint entries"
  "lr5","normal continuation/provider context never receives full checkpoint history"
  "lr6","checkpoints summarize proof/subgoal/floor/budget/telemetry state when present but never satisfy completion proof gates"
  "lr7","compaction handling adds bounded handoff metadata without replacing Pi compaction"
invariants[5]{id,invariant}:
  "inv1","branch replay remains source of truth for runtime checkpoint history"
  "inv2","checkpoint notes/summaries/excerpts are capped before persistence"
  "inv3","checkpoint commands/tools do not resume, continue, complete, clear, or dequeue goals"
  "inv4","automatic lifecycle checkpoints are deduped per relevant transition/event"
  "inv5","older goals without checkpoints render and replay exactly as before"
implementation_surfaces[7]{id,path,change}:
  "s1",".pi/extensions/goal/constants.ts","add checkpoint custom entry type and caps"
  "s2",".pi/extensions/goal/types.ts","add checkpoint event/record/replay summary types"
  "s3",".pi/extensions/goal/checkpoints.ts","new module for checkpoint creation, caps, replay, dedupe, export formatting"
  "s4",".pi/extensions/goal/lifecycle.ts","register lifecycle and compaction checkpoint hooks"
  "s5",".pi/extensions/goal/command.ts","add checkpoint/history subcommands"
  "s6",".pi/extensions/goal/tools.ts","register checkpoint model tools or delegate to checkpoint tool module"
  "s7","README.md","document checkpoint/history behavior and context bounds"
verification_checks[7]{id,check,evidence}:
  "v1","checkpoint records are capped and separate from GoalState arrays","schema probe"
  "v2","checkpoint replay preserves branch-local latest/list summaries","replay probe"
  "v3","automatic lifecycle triggers dedupe repeated events","trigger probe"
  "v4","continuation/monitor prompts do not include full checkpoint history","context-bound probe"
  "v5","compaction hooks create bounded handoff metadata","compaction probe"
  "v6","checkpoint presence does not bypass completion floors/proofs","completion-gate probe"
  "v7","markdown export only occurs on explicit export path","export probe"
```

## Required proofs

Probe intent is expanded in `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/08-validation-probe-plan.md`.

```toon
toon.version: 1
required_proofs[9]{name,source,command,pass_condition,scope,notes}:
  "quality_goal","ISSUE-022","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0","run","full extension quality gate after implementation"
  "checkpoint_schema_probe","ISSUE-022","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-checkpoint-schema-probe.mjs","exit 0 and output includes PASS checkpoint_schema_bounded_separate_entries","run","must fail if checkpoint history is unbounded or stored as full arrays on GoalState"
  "checkpoint_replay_probe","ISSUE-022","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-checkpoint-replay-probe.mjs","exit 0 and output includes PASS checkpoint_replay_branch_local","run","must fail if replay loses latest/list summaries or accepts stale goal ids"
  "checkpoint_trigger_dedupe_probe","ISSUE-022","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-checkpoint-trigger-dedupe-probe.mjs","exit 0 and output includes PASS checkpoint_triggers_deduped","run","must fail if pause/budget/complete hooks repeatedly emit duplicate checkpoints"
  "checkpoint_context_bound_probe","ISSUE-022","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-checkpoint-context-bound-probe.mjs","exit 0 and output includes PASS checkpoint_history_not_injected","run","must fail if continuation or monitor prompts include full checkpoint history"
  "checkpoint_compaction_probe","ISSUE-022","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-checkpoint-compaction-probe.mjs","exit 0 and output includes PASS checkpoint_compaction_handoff_bounded","run","must fail if compaction hooks are absent or inject unbounded history"
  "checkpoint_not_completion_proof_probe","ISSUE-022","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-checkpoint-not-completion-proof-probe.mjs","exit 0 and output includes PASS checkpoint_not_completion_proof","run","must fail if checkpoint presence lets update_goal complete bypass floors/proofs/subgoal blockers"
  "checkpoint_export_probe","ISSUE-022","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-checkpoint-export-probe.mjs","exit 0 and output includes PASS checkpoint_export_explicit_bounded","run","must fail if export writes automatically or outside bounded explicit output"
  "live_probe_or_skip","ISSUE-022","cd /Users/bryan/dev/personal/experiments/pi-goals && test -s .ai/validation/goal-checkpoint-live-probe-closeout.md","exit 0","run","record live /goal checkpoint/history evidence or explicit deterministic-coverage skip rationale"
```

## Non-goals for first implementation

- Full transcript archival.
- Replacing Pi native compaction.
- Project-management issue tracking.
- Arbitrary checkpoint search/query DSL.
- Watcher-triggered history automation before ISSUE-023.
- Progress percentage or subjective completion scoring; see ISSUE-014.
- Parallel/multi-goal history partitioning beyond preserving current single-goal branch-local behavior; see ISSUE-019.
