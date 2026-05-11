# 03 — Design lock for ISSUE-023

## Execution-ready decision

ISSUE-023 is execution-ready for a bounded first watcher implementation pass if the feature is scoped as **extension-owned, per-local-active-goal wait-condition watchers that produce at-most-once stale-guarded nudges**, not as a general scheduler, background job runner, network poller, or cross-agent protocol.

## Locked choices

### 1. First-version watcher types

Chosen first release watcher kinds:

- `file_exists`: a resolved path exists.
- `file_changed`: a resolved path's mtime/size differs from the registration baseline.
- `file_contains`: a bounded file read contains a literal string or explicitly configured regex.
- `command_exit`: an explicit argv command exits with the expected code, default `0`.

Rationale: these cover the common waits in the refine issue — file appears, log contains text, command exits — while keeping process/session/network/cross-agent protocols out of the first pass.

Rejected/deferred:

- Generic shell string watchers: too easy to create quoting, injection, and interactive-command ambiguity.
- Network polling: requires separate opt-in, rate limiting, and privacy/error semantics.
- Process/session signal watchers: depends on a signal identity/protocol not yet designed.
- Cross-agent completion signals: should follow multi-goal/external-session groundwork rather than invent a parallel protocol here.

### 2. Execution ownership

Chosen:

- The extension runtime owns registration replay, polling timers, command execution, satisfaction state, cancellation, and nudge delivery.
- The agent registers/list/cancels watchers through explicit tools or slash commands; it does not perform ad hoc polling in conversation.
- Command watchers execute only argv-form commands with resolved cwd/worktree metadata, bounded timeout, bounded output capture, and no interactive stdin.

Rationale: agent-run polling would be nondurable and duplicate-prone across reloads. Extension-owned polling can centralize stale guards, resource caps, and cancellation.

### 3. Persistence and reload

Chosen:

- Add a dedicated replay stream such as `pi-goal-watchers` and a focused module such as `.pi/extensions/goal/watchers-state.ts`.
- Persist registrations, satisfaction, cancellation, timeout, failure, and delivery state as append-only events.
- Rehydrate active watcher runtime timers on `session_start` and `session_tree` after replaying goal state.
- Do not store watcher arrays directly inside `GoalState`; store per-goal watcher records adjacent to goal state.

Rationale: dedicated watcher replay keeps `GoalState` stable and avoids entangling top-level goal replay with a growing scheduler/event log.

### 4. Polling/resource limits

Chosen default limits:

- minimum poll interval: 5 seconds;
- default poll interval: 15 seconds;
- maximum watcher timeout: 24 hours;
- default watcher timeout: 30 minutes;
- command timeout: default 10 seconds, hard max 60 seconds;
- command output capture cap: default 8 KiB, hard max 64 KiB;
- file read cap for `file_contains`: default 256 KiB, hard max 1 MiB;
- maximum active watchers per goal: 8;
- maximum active watchers per session: 16.

Implementation may tune these exact constants, but it must keep hard caps and expose them in validation.

### 5. Satisfaction and nudge delivery

Chosen:

- Watchers are one-shot by default.
- On condition satisfaction, persist `satisfiedAt`, cancel polling for that watcher, and create a `deliveryState: "pending"` watcher-nudge record.
- Delivery attempts use the existing continuation/follow-up path with a new watcher reason/details shape.
- Delivery is stale-guarded by watcher id, goal id, goal status `active`, local-active ownership when ISSUE-019 is present, non-budget-limited state, unchanged watcher generation, safe idle context, and no pending user/model messages.
- At most one nudge is delivered per watcher unless a user explicitly re-arms or recreates it.
- If delivery is unsafe because context is busy, keep the watcher satisfied/pending and retry only at bounded safe lifecycle points; if the delivery window expires, mark `delivery_expired` and show it in list output.

Rationale: separating satisfaction from delivery avoids losing real external events while still preventing unsafe mid-turn injection.

### 6. UI/list/cancel surface

Chosen slash-command surface:

- `/goal watch add file-exists --path <path> [--timeout-seconds N] [--interval-seconds N]`
- `/goal watch add file-changed --path <path> [--timeout-seconds N] [--interval-seconds N]`
- `/goal watch add file-contains --path <path> --text <literal> [--regex] [--timeout-seconds N]`
- `/goal watch add command-exit -- <cmd> [args...]` with flags before `--` for timeout/interval/expected exit/cwd.
- `/goal watch list`
- `/goal watch cancel <watcher-id>`

Chosen tool surface:

- `add_goal_watcher`
- `list_goal_watchers`
- `cancel_goal_watcher`

AXI constraints:

- list output must be compact and include id, kind, status, next poll or terminal state, goal id, path/command summary, timeout remaining, and last result summary.
- mutation output must be idempotent where safe; canceling an already terminal watcher returns a no-op success.
- errors must name the invalid field and the safe correction.

### 7. Worktree and multi-goal boundaries

Chosen:

- Watchers bind to the effective goal id and an effective cwd/worktree at registration time.
- First implementation only auto-drives the current local-active goal in the current Pi session.
- External-session/external-process goals from ISSUE-019 may display/adopt watcher metadata later, but current-session watchers must not nudge external goals.
- On worktree mismatch after reload/adoption, watcher list shows `blocked_cwd_mismatch` until user cancels or re-arms with the new cwd.

Rationale: watcher triggers are automation. They must follow the same local-active boundary as continuation and monitor side effects.

### 8. Relationship to ISSUE-016

Chosen:

- ISSUE-023 consumes ISSUE-016's active waiting model.
- Watchers should normally be registered when a goal is in `idle_nudge` or `manual` mode, but the implementation may allow registration on active immediate goals if it does not suppress normal continuation.
- Watcher nudges are not ordinary immediate `agent_end` continuations; they are condition-driven reassessment nudges with explicit watcher details.

### 9. Non-goals for first implementation

- General cron/scheduler replacement.
- Unbounded command execution or generic shell strings.
- Network polling.
- Cross-agent protocol or external session control.
- Repeating watchers/recurring schedules.
- Watchers for paused, complete, budget-limited, external, or non-local-active goals.

## Why execution-ready now

The major forks are locked:

1. first watcher kinds are selected;
2. extension runtime owns polling/execution/delivery;
3. watcher state uses a dedicated replay stream;
4. hard resource caps are required;
5. satisfaction and nudge delivery are one-shot and stale-guarded;
6. UI/tool surfaces are explicit list/add/cancel paths;
7. worktree and multi-goal boundaries follow local-active ownership;
8. process/session/network/cross-agent watchers are deferred.

Implementation can now choose helper names and exact parser details without deciding product/API direction.
