# 05 — Issue writeback

Issue: ISSUE-014 — agent-estimated goal progress percentage
Date: 2026-05-10

## Canonical writeback

Promoted canonical issue draft written to:

- `.ai/issues/open/ISSUE-014-goal-progress-estimates.md`

Source refine issue to remove after reference cleanup:

- `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md`

## Design questions resolved

| Refine question | Locked answer |
|---|---|
| State vs telemetry vs event stream | Store optional estimate fields on `GoalState`. |
| Range semantics | Integer `0..100`; `100` remains advisory and does not complete. |
| Note requirement | Optional bounded note, max 160 trimmed characters. |
| Stale/age display | Store `progressUpdatedAt`; no first-release auto-expiry/stale styling. |
| Narrow widget mode | Conditional compact progress row, hidden when unset, ISSUE-011 width rules apply. |
| No-progress counters | Progress-only updates do not count as productive work. |

## Execution-ready sections added

- target bucket/kind and target repo roots;
- grounded research findings with artifact links;
- locked design choices and rejected alternatives;
- valid TOON synthesis block;
- implementation checklist;
- acceptance criteria;
- proof threat model;
- importable TOON-style `required_proofs[]` block;
- live probe requirement.

## Cleanup still required

- update non-raw references from `.ai/issues/refine/ISSUE-014-goal-progress-estimates.md` to `.ai/issues/open/ISSUE-014-goal-progress-estimates.md`;
- remove the old refine issue;
- run final gates/probes;
- record final audit in `06-final-audit.md`.
