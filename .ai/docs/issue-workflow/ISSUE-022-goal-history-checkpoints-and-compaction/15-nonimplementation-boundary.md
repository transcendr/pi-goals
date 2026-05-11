# 15 — Non-implementation boundary for ISSUE-022

## What changed in this goal

This goal refined and promoted the issue document only. It did not implement checkpoint/history runtime code.

Changed planning artifacts include:

- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/docs/issue-workflow/ISSUE-022-goal-history-checkpoints-and-compaction/**`
- canonical references from old refine path to new open path where appropriate

The old refine issue was removed:

- `.ai/issues/refine/ISSUE-022-goal-history-checkpoints-and-compaction.md`

## What did not change

No `.pi/extensions/goal/*.ts` source file was edited for checkpoint/history behavior in this goal. The Sentrux baseline file changed because `sentrux gate --save .pi/extensions/goal` was run as a planning sensor, not because extension architecture was modified.

## Implementation not yet done

The following remain future implementation work for the executor:

- add checkpoint custom entry type and replay module;
- add checkpoint/history command and tool surfaces;
- add lifecycle/compaction hooks;
- add validation probes under `.ai/validation/`;
- update README;
- run live probe or record deterministic skip.

## Boundary rationale

Keeping this goal planning-only preserves the queue stack contract: each `create-issue-doc` goal is satisfied when the issue becomes execution-ready and moves from `issues/refine` to `issues/open`. Implementation belongs to a later execution goal/session using the open issue and its required proofs.
