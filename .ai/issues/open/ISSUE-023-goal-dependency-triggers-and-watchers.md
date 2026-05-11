# ISSUE-023 — Goal dependency triggers and external watchers

Status: open — execution-ready for bounded watcher implementation pass
Priority: P2
Owner: pi-goal automation
Created: 2026-05-08
Updated: 2026-05-11
Next best session: implement and validate extension-owned goal wait-condition watchers
Next best session rationale: The first watcher release is now bounded: extension-owned, per-local-active-goal, one-shot watchers for file existence/change/contains and argv command exit, with durable replay, stale-guarded delivery, resource caps, and explicit list/cancel surfaces.
Target bucket: open
Issue kind: feature
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on:
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
Related:
- `.ai/issues/open/ISSUE-019-parallel-multiple-goals.md`
- `.ai/issues/open/ISSUE-018-goal-start-in-worktree.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`
- `.ai/issues/fixed/ISSUE-027-goal-queue.md`

## Goal

Add optional external dependency watchers so an active idle-tolerant goal can be nudged when a bounded, visible, cancelable wait condition is satisfied, without turning `pi-goal` into an unbounded scheduler, hidden process runner, or cross-agent orchestration system.

First release target: extension-owned, per-local-active-goal, one-shot watcher registrations for file existence/change/contains and argv command exit. Watcher satisfaction persists durable state and delivers at most one stale-guarded nudge to the correct active goal.

## Problem/context

ISSUE-016 gives goals an active-but-waiting mode with delayed reassessment nudges. Time-based nudges are useful but inefficient for waits with concrete conditions: a file appears, a log line lands, a command finishes, or a build artifact changes.

The original refine issue identified the need for dependency triggers but left major design forks open: which watcher types are safe, who executes them, how they persist across reload, what resource caps apply, and how they interact with worktrees/multiple goals. This promoted issue locks those forks for a bounded first implementation.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/06-final-audit.md`
- Acceptance traceability: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/07-acceptance-traceability.md`
- Implementation handoff: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/08-implementation-handoff.md`
- Completion audit: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/09-completion-audit.md`
- Non-implementation boundary: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/10-nonimplementation-boundary.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/commands.log`
- Pre-refinement invariant gap probe: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/pre-refinement-invariant-gap.log`
- Grounded research command log: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/grounded-research-commands.log`
- Design/proof invariant probe: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/design-proof-invariant-probe.log`
- Traceability/handoff probe: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/traceability-handoff-probe.log`
- Protocol coverage probe: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/protocol-coverage-probe.log`
- Completion audit probe: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/completion-audit-probe.log`
- Comprehensive completion probe: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/comprehensive-completion-probe.log`
- Non-implementation boundary probe: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/nonimplementation-boundary-probe.log`
- Final inventory log: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/final-inventory.log`
- Stale reference scan before promotion: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/stale-references-before.log`
- Stale reference audit: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/stale-reference-audit.log`
- Quality gate log: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/quality-goal-open-promotion.log`
- Final validation log: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/raw/final-validation.log`

## Desired behavior

### Watcher registration model

- Watchers are explicit per-goal registrations bound to:
  - watcher id;
  - goal id;
  - watcher kind;
  - effective cwd/worktree at registration;
  - polling interval and timeout;
  - resource caps;
  - current status/delivery state;
  - registration generation.
- Store watcher events in a dedicated replay stream such as `pi-goal-watchers` rather than directly inside `GoalState`.
- Rehydrate active watcher timers on `session_start` and `session_tree` after goal state replay.
- Watchers are one-shot by default and terminal after `satisfied`, `cancelled`, `timed_out`, `failed`, `delivery_expired`, or `blocked` states unless explicitly re-armed.

### First-version watcher kinds

- `file_exists`: resolved path exists.
- `file_changed`: resolved path mtime/size differs from registration baseline.
- `file_contains`: bounded file read contains a literal string or explicitly configured regex.
- `command_exit`: explicit argv command exits with expected code, default `0`.

Deferred watcher kinds:

- generic shell strings;
- network polling;
- recurring schedules;
- process/session signal protocols;
- cross-agent completion signals.

### Execution ownership and safety

- The extension runtime owns polling, command execution, satisfaction state, cancellation, and delivery.
- Agents/users only register/list/cancel through explicit tools or slash commands.
- Command watchers must be argv-based, non-interactive, timeout-limited, output-capped, cwd/worktree-bound, and stdin-disabled.
- File watchers must resolve paths against the goal's effective cwd/worktree and obey file read caps.
- Registration rejects unsafe/missing inputs with actionable errors.

### Satisfaction and delivery

- When a watcher condition is satisfied, persist satisfaction, cancel polling, and create a pending watcher-nudge delivery record.
- Delivery uses the continuation/follow-up path with watcher-specific reason/details.
- Delivery is stale-guarded by watcher id, goal id, active status, local-active ownership when multi-goal state exists, non-budget-limited state, unchanged watcher generation, safe idle context, no pending messages, and cwd/worktree match.
- At most one nudge is delivered per watcher unless a user explicitly re-arms or recreates it.
- If delivery is unsafe because context is busy/pending, keep satisfaction visible as pending and retry only at bounded safe lifecycle points until delivery expires.

### UI/tool/command surface

Slash commands:

- `/goal watch add file-exists --path <path> [--timeout-seconds N] [--interval-seconds N]`
- `/goal watch add file-changed --path <path> [--timeout-seconds N] [--interval-seconds N]`
- `/goal watch add file-contains --path <path> --text <literal> [--regex] [--timeout-seconds N]`
- `/goal watch add command-exit [--timeout-seconds N] [--interval-seconds N] [--expected-exit N] [--cwd <path>] -- <cmd> [args...]`
- `/goal watch list`
- `/goal watch cancel <watcher-id>`

Model tools:

- `add_goal_watcher`
- `list_goal_watchers`
- `cancel_goal_watcher`

List output is compact and AXI-friendly: id, kind, status, goal id, path/command summary, timeout remaining, next poll or terminal state, and last result summary.

### Worktree and multi-goal boundaries

- First implementation only auto-drives the current local-active goal in the current Pi session.
- Watchers bind to effective goal id and cwd/worktree at registration time.
- Watchers must not nudge external-session/external-process goals from ISSUE-019.
- Worktree/cwd mismatch after reload or adoption puts the watcher in a visible blocked state until user cancels or re-arms it.

## Grounded research findings

Source artifact: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/02-grounded-research.md`.

Current facts:

- `GoalState` has no idle policy fields and no watcher/dependency registration fields today.
- `state.ts` persists one goal runtime stream through `pi-goal-state` events and stale-guards updates by goal id.
- `continuation.ts` owns immediate continuation and budget wrap-up timers; `maybeContinueGoal()` already stale-guards by goal id, active status, idle context, pending messages, and safety counters.
- `lifecycle.ts` schedules continuation/monitor behavior and filters stale goal steering messages by `customType`, `goalId`, `kind`, and current status.
- `tools.ts` and `command.ts` have no watcher command/tool surface today.
- ISSUE-016 locks idle waiting and delayed reassessment nudges as the dependency baseline.
- ISSUE-019 locks one current-session `local_active` goal plus explicit external handles; watcher triggers must not auto-drive non-local/external goals.
- Sentrux planning sensor reported quality `6241` and saved baseline for `.pi/extensions/goal`.

## Locked design choices

Source artifact: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/03-design-lock.md`.

- First watcher kinds: `file_exists`, `file_changed`, `file_contains`, and argv-only `command_exit`.
- The extension runtime owns watcher polling/execution/delivery; the agent does not poll ad hoc in conversation.
- Watcher state uses a dedicated append-only replay stream/module.
- Watchers are one-shot by default and deliver at most one nudge.
- Satisfaction and delivery are separate persisted states.
- Delivery is stale-guarded by watcher id, goal id, active/local-active status, generation, idle context, pending messages, budget state, and cwd/worktree match.
- Hard caps are required for intervals, timeouts, output capture, file reads, active watchers per goal, and active watchers per session.
- Watchers only auto-drive the local-active current-session goal; external/multi-goal automation is deferred.

Rejected/deferred alternatives:

- generic shell-string watchers;
- unbounded command execution;
- network polling;
- process/session signal watchers;
- cross-agent completion signals;
- recurring/cron scheduling;
- auto-driving external goals.

## Implementation checklist

- [ ] Add watcher domain types such as `GoalWatcher`, `GoalWatcherKind`, `GoalWatcherStatus`, and watcher event types.
- [ ] Add `.pi/extensions/goal/watchers-state.ts` for replay, normalization, cap enforcement, and persistence.
- [ ] Add `.pi/extensions/goal/watchers-runtime.ts` for polling timers, command/file checks, satisfaction, cancellation, reload rehydration, and delivery scheduling.
- [ ] Add watcher constants for interval, timeout, command output, file read, per-goal, and per-session caps.
- [ ] Add watcher nudge prompt/details type and extend continuation/steering reason handling safely.
- [ ] Add `add_goal_watcher`, `list_goal_watchers`, and `cancel_goal_watcher` tools.
- [ ] Add `/goal watch add/list/cancel` command paths.
- [ ] Add UI/tool formatting for compact watcher rows and terminal states.
- [ ] Hook session lifecycle to replay watcher state and rehydrate/cancel timers.
- [ ] Ensure pause/clear/complete/budget-limit/cwd-mismatch/external-goal paths cancel or block watchers.
- [ ] Keep ISSUE-016 idle-nudge behavior backward-compatible.
- [ ] Keep ISSUE-019 local-active/external boundaries intact.
- [ ] Update README with watcher safety model and commands.
- [ ] Add deterministic probes under `.ai/validation/` matching required proofs.
- [ ] Run `npm run quality:goal`.
- [ ] Run a live watcher probe if runtime polling/command execution is implemented; otherwise create an explicit deterministic-coverage skip closeout.

## Acceptance criteria

- Users/agents can add/list/cancel watcher registrations for the four first-version kinds.
- Watchers are opt-in, visible, one-shot, timeout-limited, and cancelable.
- Watcher registrations survive reload without duplicate polling or lost terminal state.
- Watcher satisfaction produces at most one stale-guarded nudge for the correct active local goal.
- Watchers do not nudge after pause, clear, complete, budget limit, replacement, pending messages, busy context, timeout, cancel, cwd mismatch, or external-goal ownership.
- Command watchers reject shell strings and enforce argv, cwd, timeout, no-stdin, output cap, and expected-exit semantics.
- File watchers enforce path resolution and read caps.
- List/cancel output is compact, actionable, and idempotent where safe.
- Existing single-goal and idle-nudge behavior remains backward compatible.
- README documents watcher safety boundaries.
- `npm run quality:goal` passes.

## Proof threat model

Source artifact: `.ai/docs/issue-workflow/ISSUE-023-goal-dependency-triggers-and-watchers/04-proof-threat-model.md`.

Primary invariant: watcher registrations are opt-in, bounded, visible, cancelable, reload-safe, and bound to one effective local-active goal; when a condition is satisfied, at most one stale-guarded nudge is delivered to the correct active goal, and no watcher can execute unbounded work or wake a paused, complete, budget-limited, external, stale, or wrong-worktree goal.

High-risk false greens:

- reload duplicates timers or loses registrations;
- a satisfied watcher nudges the wrong goal after replacement/focus/switch/stale replay;
- a watcher fires after pause/clear/complete/budget/timeout/cancel;
- command watchers become an unbounded shell/job-runner surface;
- file contains watchers read unbounded files or hide no-match states;
- busy context receives a follow-up turn;
- external or non-local-active goals receive current-session nudges;
- list/cancel output hides active or terminal watcher state.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,target_session,goal}:
  "ISSUE-023","execution-ready-first-pass","implement bounded goal watchers","active idle-tolerant goals can wait on bounded external conditions and receive one stale-guarded nudge"
locked_requirements[8]{id,requirement}:
  "lr1","first watcher kinds are file_exists, file_changed, file_contains, and argv command_exit"
  "lr2","extension runtime owns polling, command execution, satisfaction, cancellation, replay, and delivery"
  "lr3","watcher state persists in a dedicated replay stream rather than inside GoalState"
  "lr4","all watchers are opt-in, visible, cancelable, timeout-limited, and one-shot by default"
  "lr5","command watchers are argv-only, no-stdin, timeout-limited, output-capped, and cwd/worktree-bound"
  "lr6","satisfaction and delivery are separate states; at most one nudge is delivered per watcher"
  "lr7","delivery is stale-guarded by goal id, watcher id, active/local-active ownership, generation, idle/pending context, budget state, and cwd/worktree match"
  "lr8","external/non-local-active goals are never auto-driven by current-session watchers"
invariants[6]{id,invariant}:
  "inv1","no watcher runs or delivers after pause, clear, complete, budget limit, cancel, timeout, or cwd mismatch"
  "inv2","reload never duplicates active watcher timers or loses terminal watcher state"
  "inv3","one satisfied watcher cannot deliver more than one nudge without explicit re-arm"
  "inv4","watcher commands cannot become shell strings or unbounded background jobs"
  "inv5","list/cancel surfaces expose enough state for agents to clean up watchers safely"
  "inv6","watcher automation follows ISSUE-019 local-active ownership boundaries"
implementation_surfaces[8]{id,path,change}:
  "s1",".pi/extensions/goal/types.ts","add watcher domain/event types and continuation reason"
  "s2",".pi/extensions/goal/watchers-state.ts","new watcher replay/normalization/persistence helpers"
  "s3",".pi/extensions/goal/watchers-runtime.ts","new polling, command/file check, satisfaction, cancellation, and delivery runtime"
  "s4",".pi/extensions/goal/lifecycle.ts","rehydrate watchers and cancel/block on status/cwd/ownership changes"
  "s5",".pi/extensions/goal/continuation.ts","support watcher nudge delivery with stale guards"
  "s6",".pi/extensions/goal/tools.ts","register add/list/cancel watcher tools"
  "s7",".pi/extensions/goal/command.ts","add /goal watch add/list/cancel commands"
  "s8",".pi/extensions/goal/format.ts","render compact watcher rows and actionable errors"
verification_checks[7]{id,check,evidence}:
  "v1","schema and hard caps reject unbounded watcher registrations","schema/caps probe"
  "v2","replay/reload preserves watcher state without duplicate timers","replay reload probe"
  "v3","stale guards block invalid nudges across status/context/cwd/ownership changes","stale guard probe"
  "v4","satisfied watchers deliver at most once","one-shot delivery probe"
  "v5","command watchers enforce argv/no-stdin/timeout/output caps","command safety probe"
  "v6","list/cancel output is compact and idempotent/actionable","render cancel probe"
  "v7","live runtime polling/command integration is proven or explicitly skipped","live probe or skip"
```

## Required proofs

```toon
toon.version: 1
required_proofs[8]{name,source,command,pass_condition,scope,notes}:
  "quality_goal","ISSUE-023","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0","run","full extension quality gate after implementation"
  "watcher_schema_caps_probe","ISSUE-023","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-watcher-schema-caps-probe.mjs","exit 0 and output includes PASS watcher_schema_caps_enforced","run","must fail if watcher kind parsing, interval/timeout/output caps, cwd binding, or per-goal/session counts are unbounded"
  "watcher_replay_reload_probe","ISSUE-023","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-watcher-replay-reload-probe.mjs","exit 0 and output includes PASS watcher_replay_reload_safe","run","must fail if registrations/satisfaction/cancel/timeout/delivery state are lost or duplicated across replay/reload"
  "watcher_stale_guard_probe","ISSUE-023","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-watcher-stale-guard-probe.mjs","exit 0 and output includes PASS watcher_stale_guards_block_invalid_nudges","run","must cover wrong goal id, paused, complete, clear, budget-limited, pending messages, busy context, and cwd mismatch"
  "watcher_one_shot_delivery_probe","ISSUE-023","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-watcher-one-shot-delivery-probe.mjs","exit 0 and output includes PASS watcher_delivers_at_most_once","run","must fail if one satisfied watcher can deliver more than one nudge without explicit re-arm"
  "watcher_command_safety_probe","ISSUE-023","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-watcher-command-safety-probe.mjs","exit 0 and output includes PASS watcher_command_safety_bounds","run","must fail if command watchers accept shell strings, interactive stdin, missing timeouts, output overflow, or unreported nonzero exits"
  "watcher_render_cancel_probe","ISSUE-023","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-watcher-render-cancel-probe.mjs","exit 0 and output includes PASS watcher_render_cancel_axi","run","must fail if list output hides active/terminal watcher state or cancel is not idempotent/actionable"
  "watcher_live_probe_or_skip","ISSUE-023","cd /Users/bryan/dev/personal/experiments/pi-goals && test -s .ai/validation/goal-watcher-live-probe-closeout.md","exit 0","run","record disposable live watcher evidence if runtime polling/command execution is implemented, or an explicit deterministic-coverage skip rationale"
```

## Non-goals for first implementation

- General cron/scheduler replacement.
- Unbounded command execution or generic shell strings.
- Network polling.
- Cross-agent protocol or external session control.
- Recurring/repeating watchers.
- Watchers for paused, complete, budget-limited, external, or non-local-active goals.
