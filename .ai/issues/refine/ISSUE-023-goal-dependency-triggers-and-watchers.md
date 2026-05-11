# ISSUE-023 — Refine goal dependency triggers and external watchers

Status: refine — needs design decision before execution
Priority: P2
Owner: unassigned
Created: 2026-05-08
Next best session: design refinement pass for wait-condition watchers
Next best session rationale: Watcher types, execution safety, persistence, and stale-guard behavior need design locking.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`

Goal: Design optional external dependency triggers so an idle-tolerant goal can resume when a watched command, file, process, or agent signal changes.

## Problem

Idle-tolerant goals allow an agent to wait, but a time-based nudge alone may be inefficient. Some waits have concrete external conditions: a command exits, a log contains a string, a file appears, a test server becomes reachable, or another agent posts a completion signal.

## Desired behavior sketch

- Goal can register bounded wait conditions:
  - command exits;
  - file path exists/changes;
  - output contains text;
  - process/session signal arrives.
- When a condition is satisfied, `pi-goal` nudges or resumes the goal if it is still active and waiting.
- Watchers are visible, cancelable, stale-guarded by goal id, and timeout-limited.

## Open design questions

1. Which watcher types are safe for a first version?
2. Are watchers executed by the extension, the agent, or an external helper CLI?
3. How are polling intervals, timeouts, output caps, and resource limits enforced?
4. How are watcher registrations persisted and restored after reload?
5. How does this interact with worktrees and multiple parallel goals?

## Candidate acceptance criteria after refinement

- Watchers are opt-in and never execute unbounded interactive commands.
- Watcher satisfaction triggers at most one stale-guarded nudge/resume event per registration.
- User can list/cancel active wait conditions.
- Watchers do not keep a goal active after pause, clear, complete, or budget limit.
- Validation covers stale goal ids, reload, timeout, command failure, and file-change cases.

## Non-goals for first refinement

- General-purpose cron/scheduler replacement.
- Network polling without explicit user opt-in.
- Cross-agent protocol before the signal shape is designed.

## Refinement todos

- [ ] Choose first watcher types.
- [ ] Define watcher schema and persistence.
- [ ] Define safety/resource limits.
- [ ] Define UI/list/cancel command surface.
- [ ] Coordinate with idle-tolerant mode and completion proofs.
