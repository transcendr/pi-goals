# Changelog

## 0.5.1 - 2026-05-15

### Changed

- Renamed the context setup command from `/goal anchor` to `/goal tools`, matching the user-facing purpose: enabling pi-goals tool-created goals to manage context.
- Rewrote README guidance for between-goal context management to explain branch cleanup and compaction in user terms.

## 0.5.0 - 2026-05-15

### Highlights

- Goals can now manage their own context as they finish: Pi removes a completed goal's execution branch from the active session and keeps only a compact summary, for individual goals and queued goal stacks.
- Queue handoffs are safer after branch compaction: the next queued goal starts once instead of getting skipped or started twice.
- If Pi cannot compact the finished branch, it warns and keeps the queue moving.

### Added

- Between-goal context management requested with trailing `and summarize context` on `/goal`, `/goal queue`, and template invocations.
- `/goal tools` captures the internal Pi context object needed to navigate the session tree; this works around the Pi limitation that tool-created goals cannot capture that context object by themselves.
- Summary-aware queue handoff preserves the next queued goal while Pi replaces the finished goal's branch with compact context.
- Release live probes now cover slash-created goals, queued goals, templates, plain-language-created goals, and queue follow-up behavior.

### Changed

- `summarize` is the recommended way to keep long goal queues small and focused between tasks.
- Queue handoffs now ignore stale steering from older queue states, preventing duplicate starts.
- `update_goal` waits until the end of the turn before starting navigation-sensitive queue handoff work.

### Fixed

- Completed goals with queued work no longer spawn repeated stale queue-steer branches after branch compaction.
- Agent-end queue catch-up uses revision-aware deduplication instead of forced duplicate handoff, avoiding double-starts of the same queued goal.

## 0.4.1 - 2026-05-13

### Highlights

- Hardened queue continuation so completed goals with remaining queued work continue at turn end and satisfied orchestration queue items hand off to the next queued goal.

### Changed

- Documented a reusable live probe scenario for terminal-goal queue handoff validation.
- Clarified project agent guidance for repo artifact hygiene and Solo scratchpad usage.

### Fixed

- `dequeue_goal` now triggers a deduplicated queue handoff when it consumes an orchestration item and more queued work remains.
- `agent_end` now schedules a post-turn queue handoff for terminal goals with queued work, avoiding idle sessions that require manual `/goal resume`.
- Tool-completion queue handoffs now use the deduplicated handoff path consistently.

## 0.4.0 - 2026-05-12

### Highlights

- Added reusable acceptance verification workflows for issue acceptance criteria and full acceptance pipelines.
- Hardened compaction recovery so active goals and completed-goal queue handoffs continue after normal compaction and context-overflow recovery.
- Added implementation-readiness workflow helpers and stronger issue-selector resolution for repo-local goal templates.

### Added

- New `verify-acceptance-item` and `verify-acceptance-pipeline` goal templates for adversarial, evidence-backed acceptance verification.
- New `implementation-ready-issue` goal template plus issue-doc resolution helper for turning execution-ready issues into implementation-ready patch plans.
- Opt-in compaction continuation debug logging via `PI_GOAL_COMPACTION_DEBUG=1` or `PI_GOAL_COMPACTION_DEBUG_LOG=/path/to/log`.

### Changed

- `deslop-pipeline` now tells boomerang workers to execute the created deslop goal immediately instead of stopping after goal creation.
- Acceptance verification templates now reject green results that still contain material gaps, required next actions, or unresolved false-green risks.
- README guidance now calls out queue handoff recovery after compaction/context overflow and bundled acceptance-verification workflow examples.

### Fixed

- Completed goals with queued work now recover the queue handoff after compaction even when Pi reports the session idle before compaction starts.
- Queue handoff fallback force-sends the post-compaction steering message so stale pre-compaction dedupe keys do not strand queued work.
- Active-goal continuation preserves floor steering when an agent turn ends.

## 0.3.1 - 2026-05-11

### Highlights

- Bounded reusable goal template discovery so `/goal` and `/goal queue` autocomplete stay responsive in large workspaces.
- Active goals now recover continuation after Pi compaction instead of silently stopping with the widget still active.

### Changed

- Reusable goal templates are discovered only from the workspace-root `.pi-goals/` and `.ai/.pi-goals/` directories, while still collecting template files recursively inside those explicit roots.
- README release guidance now documents bounded template roots and compaction-safe goal continuation.

### Fixed

- Prevented template autocomplete from recursively scanning broad directories such as `$HOME`, reducing freeze risk and avoiding unrelated filesystem/privacy prompts.
- Added compaction lifecycle handling so active goals defer continuation during compaction and resume once compaction completes.

## 0.3.0 - 2026-05-11

### Highlights

- Added completion floors so agents can be kept from marking long-running goals complete before enough goal-directed work has happened.
- Improved goal queue reliability with multi-item queue blocks, safer resume behavior, audited dequeue operations, and clearer guidance for reusable-workflow queues.
- Expanded reusable `.pi-goals` workflow support with easier discovery, natural-language goal creation, and bundled workflow prompts for release review, goal-stack enqueueing, and supervised deslop review.
- Raised the goal objective character limit to support larger planning prompts.

### Added

- Completion floors for asking agents to spend a minimum amount of time or tokens on a goal before normal completion.
- Completion deferrals that keep the goal active and suggest a useful next improvement pass.
- Multi-item `/goal queue` input for enqueueing ordered goal stacks from prose or lists.
- Manual queue dequeues now require a rationale and authority, making queue history easier to audit.
- Queue resume behavior that can restart queued work after the current goal is complete or cleared.
- New reusable goal prompts:
  - `deslop-pipeline`
  - `enqueue-goal-stack`
  - `release-readme-review`
- Clearer queue guidance for workflow-like queued prose, reducing the chance that agents start the wrong kind of goal.

### Changed

- Goal objective validation now allows substantially larger objectives.
- Churn monitoring now understands completion floors and can better distinguish real progress from busywork.
- Reusable prompt behavior is more consistent between slash-command and natural-language usage.
- Queues are more reliable across reloads and template-heavy projects.

### Fixed

- Resuming can continue queued work instead of stopping at a completed or absent active goal.
- Direct queued goals are removed from the queue only after the next goal is successfully created.
- Planning-only continuations are less likely to loop unnecessarily.
- Multi-item queue blocks and queue steering avoid discarding unsatisfied queued work.

### Notable roadmap items

The current open issue set is execution-ready for the next wave of `pi-goals` capabilities:

- Durable completion proofs.
- `/goal audit` readiness reviews.
- Agent-managed subgoals.
- Idle-tolerant goals and dependency watchers.
- Goal worktree starts and multi-goal collections.
- Goal history/checkpoints and compaction-aware handoffs.
- Advisory progress estimates and improved widget rendering.
- Safer natural-language `/goal update` edits.
- Queue auto-continuation and stronger dequeue reminders for orchestration workflows.

## 0.2.0 - 2026-05-10

### Highlights

- Added a durable goal queue for sequential agent work.
- Added reusable workflow prompts so projects can turn common procedures into goal-ready instructions.
- Improved long-running goal behavior around budgets, reusable prompts, and widget display.

### Added

- `/goal queue` for listing and enqueueing follow-up goals.
- Queue support for direct objectives and reusable workflow invocations.
- Natural-language queue management, so agents can continue an ordered work stack without requiring every step to be typed as a slash command.
- Reusable workflow prompt examples for issue creation, issue-stack execution, dirty-worktree cleanup, and commit-range deslop review.
- Support for creating goals from reusable templates discovered in `.pi-goals/` directories.
- Planning docs and follow-up issues for queue hardening, reusable prompt discovery, and multiline widget behavior.

### Changed

- Reusable prompt invocation became more robust, including better handling for trailing arguments and completed-goal replacement.
- Goal queue implementation was split into focused modules to keep queue behavior easier to maintain.
- Public README documentation was expanded for queue and reusable workflow usage.

### Fixed

- Queued goals are started more safely, avoiding cases where a queue item could be lost before the next goal exists.
- Workflow-like queued prose is routed through reusable prompts instead of being treated as a literal direct goal.
- Clearing an active goal no longer clears queued work unexpectedly.
- Budget-limited goals wrap up and resume more reliably.
- Multiline objectives render more cleanly in the status widget.
- Churn monitoring better respects goal-specific instructions.

## 0.1.1 - 2026-05-09

### Fixed

- Removed internal-only documentation from the public package preview.

## 0.1.0 - 2026-05-09

Initial public preview release.

### Added

- `/goal` command for creating, viewing, pausing, resuming, replacing, and clearing a persistent objective.
- Goal state that survives normal Pi session flow and stays compatible with `/tree` navigation.
- Time and token budgets for bounding long-running agent work.
- Budget guardrails that steer agents toward wrap-up and interrupt runaway work when needed.
- Natural-language goal management through Pi's agent workflow.
- Goal status/widget display in the Pi interface.
- Reusable `.pi-goals` prompt templates for project-specific workflows.
- Automated churn monitoring for detecting loops, stalls, and low-progress continuation.
- Development quality checks for the goal extension.
