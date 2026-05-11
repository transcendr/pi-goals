# 14 — Stack compatibility review for ISSUE-022

## Remaining refine issues reviewed

- `.ai/issues/refine/ISSUE-018-goal-start-in-worktree.md`
- `.ai/issues/refine/ISSUE-019-parallel-multiple-goals.md`
- `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`
- `.ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md`
- `.ai/issues/open/ISSUE-014-goal-progress-estimates.md`
- `.ai/issues/open/ISSUE-013-goal-update-natural-language.md`

## Compatibility findings

- ISSUE-018 worktree goals should later add worktree/session metadata to checkpoints, but ISSUE-022 first pass must not create/delete worktrees or choose worktree launch behavior.
- ISSUE-019 parallel/multi-goal support should later partition checkpoint history by goal/worktree/session, but ISSUE-022 first pass should preserve the current single active branch-local goal model.
- ISSUE-023 watchers should later create checkpoints on watcher satisfaction/timeouts if that design chooses it; ISSUE-022 first pass intentionally rejects watcher-triggered checkpoints until watcher safety is locked.
- ISSUE-011 widget layout affects how latest checkpoint/count hints may render later, but ISSUE-022 should keep widget changes minimal and prefer detailed history in tool/command output.
- ISSUE-014 progress estimates should not be treated as checkpoint truth or completion proof. If progress fields exist later, checkpoints may summarize them as subjective state only.
- ISSUE-013 natural-language update parsing should not mutate checkpoint history silently. Future `/goal update ...` commands may create checkpoints around significant objective/budget changes only if that feature explicitly chooses it.

## Issue impact

The open ISSUE-022 design remains compatible with the rest of the stack because it defines checkpoints as bounded branch-local history for the current goal and explicitly defers worktree, parallel-goal, watcher, widget-heavy, progress-proof, and natural-language mutation behavior to their own issues.

## Compatibility matrix

```toon
toon.version: 1
compatibility[6]{issue,relationship,boundary}:
  "ISSUE-018","future checkpoints may include worktree/session metadata","do not implement worktree creation or cleanup"
  "ISSUE-019","future multi-goal history partitions by goal/session/worktree","preserve single-goal default and avoid shared mutable history"
  "ISSUE-023","future watchers may checkpoint satisfaction/timeouts","no watcher-triggered checkpoints in first pass"
  "ISSUE-011","future widget can render latest checkpoint hints","keep first-pass history detail in command/tool output"
  "ISSUE-014","future progress may be summarized subjectively","progress/checkpoints never prove completion"
  "ISSUE-013","future NL updates may create mutation checkpoints","no silent checkpoint mutation through prose parsing"
```
