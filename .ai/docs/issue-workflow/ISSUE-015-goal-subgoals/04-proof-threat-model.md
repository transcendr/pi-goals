# 04 — Proof threat model

## Primary invariant

A parent goal cannot be honestly completed while a blocking child subgoal remains active, incomplete, failed, or unresolved; completing/escalating a child must leave durable, replayable evidence and a clear return-to-parent point.

## False-green risks

1. Parent `update_goal(status:"complete")` succeeds even though an active child subgoal remains unfinished.
2. A child workflow rendered from a reusable template replaces or queues a top-level goal instead of staying nested under the parent.
3. Reload/replay loses the active child or its terminal evidence, causing parent completion to appear safe.
4. UI/tool output hides the active child, so the agent/user believes only the parent objective matters.
5. Abandoned/blocked child states become loopholes for parent completion without explicit reason or escalation evidence.
6. Narrow widget/status rendering becomes noisy or broken when subgoal rows are added.

## Deterministic proof strategy

- Add a targeted replay/tool probe that creates a parent, creates/enters a child, replays state, and asserts the child remains attached and active.
- Add a completion-gate probe that attempts parent completion with active/pending/blocked child states and expects structured refusal.
- Add a template-child probe that configures a subgoal from a reusable template and asserts no top-level goal replacement/dequeue path is used.
- Add widget/format probes for no-subgoal, active-child, and completed-count rendering at narrow and normal widths.
- Run `npm run quality:goal` after implementation.

## Live proof strategy

Because this changes runtime tool behavior and UI/status rendering, use the pi-goals live probe unless deterministic coverage is unusually complete and explicitly justified. The live probe should create a disposable parent goal, enter a child, verify visible status/tool details, then clean up.

## Required proof rows for issue doc

The canonical issue should include importable proof rows for:
- quality gate;
- replay/tool subgoal state probe;
- completion-blocked-by-child probe;
- template child workflow containment probe;
- live probe or explicit documented skip rationale.
