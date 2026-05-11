# 09 — Stack continuation note

Issue: ISSUE-011 — goal widget component/layout strategy
Date: 2026-05-10

## Parent orchestration status

ISSUE-011 is satisfied for the refine-to-open stack. The parent queue orchestration item should remain queued because two refine issues still need promotion:

1. `.ai/issues/open/ISSUE-014-goal-progress-estimates.md`
2. `.ai/issues/open/ISSUE-013-goal-update-natural-language.md`

## Dependency update for next issue

ISSUE-014 now depends on the promoted open ISSUE-011 path:

- `.ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md`

This means the next `create-issue-doc` goal can refine ISSUE-014 using the locked widget layout as an input, especially its compact rendering constraints:

- progress must remain hidden by default;
- if progress is rendered in the widget, it must respect the ISSUE-011 framed/compact split;
- progress rendering should not reintroduce `card` terminology or a nonexistent component dependency.

## Queue handling note

If a stale child queue entry later asks to create/refine ISSUE-011 again, treat it as already satisfied because the canonical open issue now exists and the refine source was removed.
