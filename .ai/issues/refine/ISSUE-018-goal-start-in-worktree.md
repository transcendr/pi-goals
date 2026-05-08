# ISSUE-018 — Refine option to start a new goal in a worktree

Status: refine — needs design decision before execution
Priority: P2
Owner: unassigned
Created: 2026-05-08
Next best session: design refinement pass for worktree goal launches
Next best session rationale: Worktree creation/session handoff and cleanup policy must be locked before implementation.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: none

Goal: Design an option for a new goal to run in its own Git worktree, isolating changes and making long-running goal work safer to review or discard.

## Problem

Long-running goals can touch many files. Running them in the current worktree risks mixing goal changes with unrelated user work. A worktree option would isolate changes, support parallel experimentation, and make cleanup/review easier.

## Desired behavior sketch

- `/goal --worktree <objective>` or `/goal start --worktree ...` creates a new worktree and launches or switches a Pi session there.
- Goal state records worktree path, branch name, and origin repo.
- User can choose branch naming policy or accept a generated name.
- Clearing/completing a goal does not delete the worktree without explicit confirmation.

## Open design questions

1. Is worktree creation part of this extension, or should it call an external worktree helper?
2. Should the current Pi session move into the worktree, or spawn a new Pi session there?
3. What branch naming and cleanup policy is safe by default?
4. How are uncommitted changes in the source worktree handled?
5. How does this interact with multiple parallel goals?

## Candidate acceptance criteria after refinement

- Worktree option never overwrites or loses user work.
- Generated branch/path names are deterministic enough to inspect and unique enough to avoid collisions.
- Goal UI shows the associated worktree when applicable.
- Cleanup/delete requires explicit user confirmation.
- Validation covers dirty working tree, existing path, branch collision, and completion/clear cleanup semantics.

## Non-goals for first refinement

- Parallel multi-agent orchestration; see ISSUE-019.
- Automatic merge/PR creation.
- Deleting worktrees automatically on goal complete.

## Refinement todos

- [ ] Decide command/tool surface for worktree starts.
- [ ] Define path/branch naming policy.
- [ ] Define session handoff/spawn behavior.
- [ ] Define cleanup and failure recovery UX.
- [ ] Identify Pi APIs needed for spawning or switching sessions.
