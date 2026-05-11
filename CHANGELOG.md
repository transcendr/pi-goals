# Changelog

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
