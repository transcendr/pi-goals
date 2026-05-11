# 18 — Command source recheck

## Source inspected

- `.pi/extensions/goal/command.ts`

## Finding

The slash command currently supports top-level create/view and control subcommands (`pause`, `resume`, `clear`, `queue`). Goal creation from slash command creates `GoalState` with only objective/budget defaults and schedules immediate continuation on create/resume.

## Impact

The first idle-nudge pass can ship model-tool support first without slash command flags. If slash flags are later added, `/goal resume` must preserve idle policy semantics rather than always forcing immediate continuation.
