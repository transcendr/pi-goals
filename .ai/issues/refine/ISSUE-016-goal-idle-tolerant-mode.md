# ISSUE-016 — Refine idle-tolerant goals with delayed nudges

Status: refine — needs design decision before execution
Priority: P1
Owner: unassigned
Created: 2026-05-08
Next best session: design refinement pass for idle continuation policy
Next best session rationale: The auto-continuation policy/timer semantics need to be decided before runtime changes.
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: `.ai/issues/fixed/ISSUE-003-paused-goal-continuation-guard.md`

Goal: Design an optional per-goal mode that allows the agent to go idle without pausing the goal, while still allowing a max-idle-time nudge to reconsider continuation.

## Problem

Current goal mode is designed around forced auto-continuation: if a goal is active and the agent becomes idle, `pi-goal` schedules continuation. Some workflows need the main agent to wait while another process works, such as another agent, a terminal command, a CI job, or an external human/system action. In those cases, going idle should be allowed without marking the goal paused.

## Desired behavior sketch

- Goal has an optional policy such as `auto_continue: "immediate" | "idle_nudge" | "manual"`.
- `idle_nudge` disables immediate forced auto-continuation.
- After a configured idle duration, e.g. `90s`, the runtime nudges the agent to inspect whether it should continue.
- The goal remains `active`, not `paused`, while waiting.
- The agent can explicitly say it is waiting for an external process and set/refresh idle mode.

## Open design questions

1. What exact policy names and defaults should be used?
2. Is idle-tolerant mode set at goal creation, through `update_goal`, or slash command?
3. Should max idle nudge trigger a full continuation turn or a lightweight status-check prompt?
4. How does this interact with safety counters and no-progress detection?
5. Should the agent be able to set a wait reason and expected wake-up condition?
6. Should idle timers survive reload/session resume?

## Candidate acceptance criteria after refinement

- Default behavior remains current immediate auto-continuation.
- Idle-tolerant goals can become idle without pausing and without immediate continuation.
- Max-idle nudge fires once per idle interval and is stale-guarded by goal id/status.
- User can see that the goal is active but waiting/idling, if the policy is in use.
- Safety counters do not punish intentional idle waits as no-progress loops.

## Non-goals for first refinement

- Full external process monitoring; see watcher issue.
- Multi-agent orchestration; see parallel-goals issue.
- New public goal status beyond existing status union.

## Refinement todos

- [ ] Define policy schema/defaults.
- [ ] Decide update surfaces and model guidance.
- [ ] Specify timer persistence/replay behavior.
- [ ] Define nudge prompt and context-filtering rules.
- [ ] Define UI wording for active-but-idle goals.
