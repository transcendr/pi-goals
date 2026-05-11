# 05 — Issue writeback for ISSUE-018

## Canonical issue written

- Wrote promoted canonical issue: `.ai/issues/open/ISSUE-018-goal-start-in-worktree.md`
- Removed stale refine copy: `.ai/issues/refine/ISSUE-018-goal-start-in-worktree.md`

## Major changes from refine draft

The refine draft was a short design sketch with open questions. The promoted issue now includes:

- execution-ready status and next best session;
- explicit target bucket/kind and target repo root;
- related issue links to promoted/open dependencies;
- transcript artifact links;
- grounded research findings from inspected code/API/docs;
- locked worktree command/tool/session/naming/dirty-source/cleanup decisions;
- implementation checklist;
- acceptance criteria;
- proof threat model;
- real TOON synthesis;
- importable `required_proofs[]` TOON block.

## Locked writeback decisions

Written into the canonical issue:

- First pass uses `/goal start --worktree ... -- <objective>` plus an adoption path.
- Worktree creation is extension-owned through bounded `pi.exec("git", ...)`.
- The first release prepares and hands off; it does not silently spawn background Pi/model sessions.
- Dirty source worktrees block by default; override warns and does not copy/stash uncommitted changes.
- Generated branch/path values are bounded and collision-checked.
- Adopted goals persist worktree metadata on `GoalState`.
- Completion/clear never deletes worktrees.
- Parallel/multiple goal orchestration stays in ISSUE-019.

## Downstream reference updates

Updated stale references from refine to open path:

- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`
- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/01-open-promotion-addendum.md`
- `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`

Reference scan evidence:

- Before update: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/raw/stale-018-references-before.log`
- After update: `raw/commands.log` section `writeback and promotion operations`, plus `raw/stale-reference-audit.log`

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
