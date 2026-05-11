# 02 — Grounded research for ISSUE-023

## Commands/probes run

Primary transcript: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/commands.log`.

Key probes:

- pre-refinement invariant gap probe: `raw/pre-refinement-invariant-gap.log`
- `git status --short --untracked-files=all`
- `rg -n "watch|watcher|dependency|idle|nudge|continuation|monitor|worktree|session|goalId|customType|setTimeout|sendMessage|cancel|list|queue" ...`
- `sentrux gate --save .pi/extensions/goal`

Sentrux planning sensor: `raw/grounded-research-commands.log` shows `Quality: 6241` and baseline saved for `.pi/extensions/goal`.

## Files inspected

Planning/context:

- `.ai/issues/refine/ISSUE-023-goal-dependency-triggers-and-watchers.md`
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
- `.ai/issues/open/ISSUE-019-parallel-multiple-goals.md`
- `.ai/docs/issue-workflow/refine-issue-leverage-order-2026-05-10/final-order.md`

Code surfaces:

- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/command.ts` via search output

## Current behavior facts

- Current `GoalState` has no idle policy fields and no watcher/dependency registration fields.
- `state.ts` persists one goal runtime stream through `pi-goal-state` events and stale-guards updates by goal id.
- `continuation.ts` owns a single immediate continuation timer and budget wrap-up timers; `maybeContinueGoal()` already stale-guards by goal id, active status, idle context, pending messages, and safety counters.
- `lifecycle.ts` schedules continuation on `agent_end`, schedules monitor on active goals, cancels monitor/continuation on pause/budget/clear/complete paths, and filters stale goal steering messages by `customType`, `goalId`, `kind`, and current status.
- `tools.ts` currently exposes only single-goal create/update/clear/get plus queue/template tools; no watcher command/tool surface exists.
- `command.ts` currently has `/goal pause`, `/goal resume`, `/goal clear`, and `/goal queue`; no `/goal watch` or list/cancel watcher subcommand exists.
- ISSUE-016 has locked idle waiting as an active goal mode with `autoContinueMode`, `idle_nudge`, `manual`, delayed stale-guarded nudges, and no new public status.
- ISSUE-019 has locked first-pass multi-goal as one local-active goal plus explicit external handles; watcher triggers must not auto-drive non-local/external goals.
- The refine draft for ISSUE-023 already names key safety properties — opt-in, visible, cancelable, stale-guarded, timeout-limited — but leaves watcher type, executor, persistence, limits, and multi-goal/worktree interaction unresolved.

## Stable seams to reuse

- Goal id stale-guard pattern from `state.ts`, `continuation.ts`, and `lifecycle.ts`.
- Timer/runtime cancellation pattern from `continuation.ts` and monitor scheduling.
- Custom entry replay pattern from `state.ts` and queue/monitor state modules.
- Tool and slash-command registration split from `tools.ts` and `command.ts`.
- Context filtering by custom message type/details from `lifecycle.ts`.
- ISSUE-016 delayed-nudge concept for active-but-waiting behavior.
- ISSUE-019 local-active/focused/external boundaries for multi-goal safety.

## Gaps that the promoted issue must lock

1. First watcher kinds: the refine issue lists command/file/output/process/session possibilities but does not choose a first release subset.
2. Execution ownership: current extension has no watcher scheduler/runner, and agent-executed polling would be non-durable and easy to duplicate after reload.
3. Persistence/reload: current goal state has no watcher registration/event stream and no rehydration hook.
4. Resource limits: command execution needs argv/cwd/timeout/output cap/interval caps or it can become an unbounded job runner.
5. Trigger semantics: watcher satisfaction must send at most one stale-guarded nudge/resume and must not fight existing continuation/budget/pause rules.
6. UI/list/cancel surface: watchers need agent-facing list/detail/cancel outputs with compact statuses and actionable errors.
7. Worktree/multi-goal boundaries: watchers must bind to effective goal id and cwd/worktree; they must not auto-drive external/non-local goals.
8. Validation: proof rows must fail if stale watchers resume wrong goals, survive reload incorrectly, execute unbounded commands, or hide active watchers.

## Research conclusion

ISSUE-023 can be promoted if it locks a bounded first version: extension-owned watcher registrations persisted in a dedicated replay stream; passive file watchers plus bounded argv command-exit watchers; one-shot stale-guarded delivery through the continuation/nudge path; compact list/cancel surfaces; and explicit deferral of process/session/network/cross-agent protocols.
