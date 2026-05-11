# 05 — Issue writeback for ISSUE-019

## Canonical issue written

- Wrote promoted canonical issue: `.ai/issues/open/ISSUE-019-parallel-multiple-goals.md`
- Removed stale refine copy: `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`

## Major changes from refine draft

The refine draft was a short architecture sketch with open questions. The promoted issue now includes:

- execution-ready status and next best session;
- explicit target bucket/kind and target repo root;
- updated dependency links to now-open ISSUE-018 and ISSUE-015;
- transcript artifact links;
- grounded research findings from inspected code/API/docs;
- locked first-pass multi-goal state/focus/switch/external-handle decisions;
- implementation checklist;
- acceptance criteria;
- proof threat model;
- real TOON synthesis;
- importable `required_proofs[]` TOON block.

## Locked writeback decisions

Written into the canonical issue:

- Preserve `GoalState` as the per-goal record and add collection-level `GoalSetState`.
- Existing single-goal sessions remain backward compatible.
- First pass permits at most one `local_active` goal in the current Pi session.
- Parallel first pass means explicit external-session/worktree handles, not automatic background model spawning.
- Focus and local active are separate: focus is for inspection, local active is for continuation/monitor/turn side effects.
- Budgets, floors, telemetry, proofs, subgoals, checkpoints, and worktree metadata are per goal.
- Queue items and ISSUE-015 subgoals stay separate from top-level multi-goal records.
- UI is aggregate/list-first and compact in the widget/footer.

## Downstream/reference updates

Updated stale references from refine to open path:

- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`
- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/01-open-promotion-addendum.md`
- `.ai/issues/open/ISSUE-018-goal-start-in-worktree.md`
- `.ai/issues/open/ISSUE-015-goal-subgoals.md`
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`

Reference scan evidence:

- Before update: `.ai/docs/issue-workflow/ISSUE-019-parallel-multiple-goals/raw/stale-019-references-before.log`
- After update: `raw/commands.log` section `writeback and promotion operations`

## Section checklist

- [x] Title/status/priority/owner/created/updated
- [x] Next best session and rationale
- [x] Target bucket and issue kind
- [x] Parent/depends/related links
- [x] Goal
- [x] Problem/context
- [x] Desired behavior
- [x] Research findings linked to artifact
- [x] Locked design choices and rejected alternatives
- [x] Implementation checklist
- [x] Acceptance criteria
- [x] Proof threat model
- [x] TOON synthesis
- [x] Required proofs TOON block
- [x] Non-goals
