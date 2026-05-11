# 05 — Issue writeback for ISSUE-023

## Canonical issue written

- Wrote promoted canonical issue: `.ai/issues/open/ISSUE-023-goal-dependency-triggers-and-watchers.md`
- Removed stale refine copy: `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`

## Major changes from refine draft

The refine draft was a short design sketch with open questions. The promoted issue now includes:

- execution-ready status and next best session;
- explicit target bucket/kind and repo root;
- updated dependency/related links;
- transcript artifact links;
- grounded research findings from inspected code/issues;
- locked watcher types, executor ownership, persistence, limits, delivery, UI, worktree, and multi-goal boundaries;
- rejected/deferred alternatives;
- implementation checklist;
- acceptance criteria;
- proof threat model;
- TOON synthesis;
- importable `required_proofs[]` TOON block.

## Locked writeback decisions

Written into the canonical issue:

- First watcher kinds are `file_exists`, `file_changed`, `file_contains`, and argv-only `command_exit`.
- The extension runtime owns polling, command execution, satisfaction, cancellation, replay, and delivery.
- Watcher state persists in a dedicated replay stream, not directly inside `GoalState`.
- Watchers are one-shot by default and deliver at most one stale-guarded nudge.
- Command watchers require argv/no-stdin/timeout/output caps/cwd binding.
- File watchers require path resolution and read caps.
- Watchers only auto-drive the current local-active goal in the current session.
- Network/process/session/cross-agent/recurring watchers are deferred.

## Downstream/reference updates

Updated stale references from refine to open path in:

- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`
- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/01-open-promotion-addendum.md`
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
- `.ai/issues/open/ISSUE-019-parallel-multiple-goals.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`

Reference scan evidence:

- Before update: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/stale-references-before.log`
- After update: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/stale-reference-audit.log`

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
