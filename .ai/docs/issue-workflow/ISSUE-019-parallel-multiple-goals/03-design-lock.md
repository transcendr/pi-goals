# 03 — Design lock for ISSUE-019

## Execution-ready decision

ISSUE-019 is execution-ready for a bounded first pass after locking the feature as **a multi-goal collection with one locally focused active goal plus explicit external-session goal handles**, not a hidden autonomous team runtime.

This gives users named multiple-goal state, sequential focus/switching, and safe tracking of explicitly launched parallel work without silently spawning paid/background model sessions. True automatic parallel agent orchestration remains a later issue or belongs to an external `$agent-team`/subagent-style runtime.

## Locked choices

### 1. State model

Chosen:

- Preserve `GoalState` as the per-goal record shape.
- Introduce a new collection-level state concept, e.g. `GoalSetState`, that owns:
  - ordered bounded `goals[]` records;
  - `focusedGoalId` for UI/tool/detail context;
  - `localActiveGoalId` for the one goal that this Pi session may auto-continue;
  - aggregate counters by status;
  - schema version and migration metadata.
- Keep backward compatibility by treating existing single-goal branch state as an implicit one-goal collection until explicit multi-goal state exists.
- Store collection changes in a dedicated replay path/module rather than stuffing multiple top-level goals into one objective string.

Rationale: Current `runtimeState.goal` and `GoalState` are one-goal. A collection wrapper gives real multi-goal identity/focus without discarding existing per-goal fields or breaking older sessions.

Rejected:

- Add `children`/parallel peers directly onto the current single `GoalState`: blurs subgoals vs independent top-level goals and makes replay/migration hard.
- Reuse queue items as active goals: queue is future-work FIFO, not active named-goal state.
- Arbitrary nested goal graph: too large and overlaps ISSUE-015 subgoals/dependency-watchers.

### 2. Meaning of active/focused/running

Chosen terminology:

- `focused`: the goal shown by default in `get_goal`, `/goal`, audit, and detailed UI.
- `local_active`: the one goal in the current Pi session that may receive normal continuation, monitor, budget-wrap-up, and turn accounting.
- `external_active`: a goal whose work is occurring in another explicit session/worktree/process and is only tracked by this controller until synchronized by explicit tool/command updates.
- `paused`/`blocked`/`complete` remain per-goal terminal or control states.

Rationale: The word “active” becomes ambiguous with parallelism. Explicit local vs external ownership prevents one session from injecting steering into another goal.

Rejected:

- Multiple local-active goals in one Pi session: current lifecycle has one turn, one context stream, one continuation timer, and one widget; trying to multiplex LLM context would be unsafe in the first pass.
- Treat focus as equivalent to active: users need to inspect paused/external goals without resuming them.

### 3. Sequential mode

Chosen:

- First pass supports named sequential goal sets in one session.
- Users/agents can create multiple goal records, focus one, pause/resume/switch focus, and advance to the next pending goal after completion.
- Existing FIFO queue remains available for simple future work; multi-goal sets are for visible named goals with per-goal state.
- `start_queued_goal` semantics stay unchanged; queue-to-multi-goal import can be a later convenience.

Rationale: Sequential multi-goal state is the safest first implementation slice and provides immediate value for release checklists or multi-shard plans without parallel spend risk.

### 4. Parallel mode first pass

Chosen:

- First pass supports **explicit external parallel goal handles**, not automatic background spawning.
- A goal record can have `executionOwner: "local" | "external_session" | "external_process"` and optional `sessionRef`/`worktree` metadata.
- The controller can list and audit metadata for external goals, but it does not auto-continue, budget-wrap-up, or monitor them from the current session.
- External goals are created/adopted only by explicit user/agent action, using ISSUE-018 worktree adoption or a future explicit subagent/team tool.

Rationale: Pi can spawn subagent processes technically, but embedding hidden paid-session orchestration into `pi-goal` is too risky for first pass. ISSUE-018 explicitly chose user-mediated worktree adoption. This issue should build on that safety model.

Rejected:

- Silent automatic spawning of Pi agents.
- Background shell-spawned model processes without an auditable owner.
- A full internal team runtime inside `pi-goal`.

### 5. Focus/context isolation

Chosen:

- Continuation, monitor, pause steering, budget wrap-up, and completion gates operate only on `localActiveGoalId`.
- `get_goal` returns the focused goal plus compact aggregate/multi-goal metadata when a collection exists.
- New tools/commands list all goals and require `goal_id` for mutations that are not unambiguously focused-goal operations.
- Context filtering must include goal id and steering kind; stale steering for non-focused/non-local goals is removed.
- Audit/proof/history surfaces default to the focused goal but can explicitly target a goal id once those features support multi-goal metadata.

Rationale: Cross-goal steering leakage is the main false-green risk. Defaulting to focused details while requiring ids for mutations keeps agent ergonomics manageable.

### 6. Budget, proof, and history partitioning

Chosen:

- Budgets, floors, telemetry, proof gates/results, subgoals, worktree metadata, and checkpoints are per goal record.
- Collection-level budget controls are optional caps, e.g. `maxConcurrentLocalActive = 1` for first pass and optional aggregate advisory spend summary.
- Parent/child subgoal budgets remain constrained by their parent goal per ISSUE-015; they are not promoted to collection-level goals.
- Proof gates for external goals must resolve cwd/session/worktree from that goal's metadata; proof results never satisfy another goal.

Rejected:

- Shared proof/budget state across goals.
- Progress aggregation as completion evidence.

### 7. Command/tool surface

Chosen first-pass surfaces:

- `/goal list` — compact list of multi-goal records; if no collection exists, shows the single current goal.
- `/goal focus <goal-id>` — changes focused detail target; does not resume or continue by itself.
- `/goal switch <goal-id>` — makes a paused/pending local goal the local active goal after pausing/canceling the previous local active goal.
- `/goal add [--mode local|external_session] [--worktree ...] -- <objective>` — creates a named goal record; local add may become active only through explicit switch/resume semantics.
- Model tools should mirror these with structured ids, e.g. `list_goals`, `create_multi_goal`, `focus_goal`, `switch_active_goal`, `update_multi_goal`.

Rationale: AXI favors content-first list/detail surfaces and explicit mutation flags. Separate focus vs switch avoids accidental resume.

Rejected:

- Overloading existing `update_goal` with arbitrary `goal_id` in the first pass: too likely to mutate the wrong goal.
- Making `/goal <objective>` create a multi-goal record by default: backward incompatible.

### 8. UI/listing strategy

Chosen:

- Narrow widget/footer remains focused/local-active oriented with a small aggregate suffix such as `goals 1 active / 2 paused / 1 external`.
- Detailed multi-goal tables live in `/goal list` and `list_goals` tool output.
- The first pass does not implement a full dashboard; ISSUE-011 can later improve component layout.

Rationale: Widget space is already dense. A detailed table would be unreadable in narrow terminal layouts.

### 9. Migration and compatibility

Chosen:

- Existing sessions without multi-goal collection state behave exactly as before.
- Multi-goal creation lazily wraps the current single goal into a collection only when requested.
- Clearing a focused goal must not clear unrelated goal records unless the user explicitly requests collection clear.
- A rollback path should let users export/list records and clear only the collection metadata if needed.

## Why execution-ready now

The implementer no longer needs to decide the product/API direction. The first pass is bounded:

1. add collection state and replay with compatibility wrapper;
2. add list/focus/switch/add/update tools and commands;
3. route continuation/monitor/budget wrap-up only to `localActiveGoalId`;
4. preserve queue, subgoal, worktree, proof, audit, and checkpoint boundaries;
5. add compact aggregate UI;
6. validate focus isolation and no silent spawn.

Remaining choices such as exact helper module names, CLI parser details, and final table column order are implementation details rather than unresolved architecture forks.
