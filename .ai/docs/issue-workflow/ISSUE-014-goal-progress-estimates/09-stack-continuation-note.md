# 09 — Stack continuation note

Issue: ISSUE-014 — agent-estimated goal progress percentage
Date: 2026-05-10

## Parent orchestration status

ISSUE-014 is satisfied for the refine-to-open stack. The parent queue orchestration item should remain queued because one refine issue still needs promotion:

1. `.ai/issues/open/ISSUE-013-goal-update-natural-language.md`

## Dependency update for next issue

ISSUE-013 designs natural-language update UX over the same goal mutation surface. It should treat the promoted ISSUE-014 path as current planning truth if it touches progress fields:

- `.ai/issues/open/ISSUE-014-goal-progress-estimates.md`

Natural-language updates must not infer progress edits unless the user explicitly asks to update progress, and must preserve the advisory-only/completion-boundary semantics from ISSUE-014.

## Queue handling note

If a stale child queue entry later asks to create/refine ISSUE-014 again, treat it as already satisfied because the canonical open issue now exists and the refine source was removed.
