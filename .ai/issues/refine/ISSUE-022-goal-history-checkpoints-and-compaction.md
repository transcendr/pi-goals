# ISSUE-022 — Refine goal history, checkpoints, and compaction-aware handoffs

Status: refine — needs design decision before execution
Priority: P2
Owner: unassigned
Created: 2026-05-08
Next best session: design refinement pass for checkpoints/history
Next best session rationale: Storage location, checkpoint authorship, triggers, and context bounds need to be decided.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: `.ai/issues/refine/ISSUE-015-goal-subgoals.md`

Goal: Design durable goal history/checkpoint artifacts that improve reload, compaction, handoff, and auditability without bloating provider context.

## Problem

`pi-goal` persists compact state and telemetry, but it does not produce durable human-readable checkpoints. Long goals can span compaction, reload, handoffs, and branch navigation. A future maintainer may need a concise timeline: objective changes, subgoals completed, proofs run, blockers, and next action.

## Desired behavior sketch

- `/goal checkpoint` creates a compact durable checkpoint custom entry or markdown artifact.
- Automatic checkpoints may occur on pause, budget limit, completion, or compaction-adjacent events.
- Checkpoints summarize current goal state, current subgoal, recent proof results, remaining work, and next action.
- Goal history can be viewed/exported without injecting the whole history into every model turn.

## Open design questions

1. Should checkpoints live as `pi-goal-state` events, separate custom entries, or files under `.ai/docs` / `.pi-goals`?
2. What triggers automatic checkpoints?
3. Should the model write checkpoint summaries, or should the extension build deterministic summaries only?
4. How are checkpoints kept compact and non-sensitive?
5. How should branch-local history differ from exported durable history?

## Candidate acceptance criteria after refinement

- Checkpoints are opt-in or triggered only at clear lifecycle boundaries.
- Provider context remains bounded; old checkpoints are not blindly injected.
- User can view/export a concise goal timeline.
- Checkpoints survive reload/branch replay where intended.
- Completion and handoff flows can reference the latest checkpoint.

## Non-goals for first refinement

- Full transcript archival.
- Replacing Pi's native compaction behavior.
- Project-management issue tracking.

## Refinement todos

- [ ] Decide storage location and event type.
- [ ] Define checkpoint schema and size caps.
- [ ] Decide manual vs automatic triggers.
- [ ] Define view/export UI or command surface.
- [ ] Coordinate with subgoals and completion proofs.
