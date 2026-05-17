# pi-goals

Persistent goal tracking for [Pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent).

Inspired by Codex CLI’s `/goal`, `pi-goals` adds Pi-native goal management: durable objectives, queues, execution limits, reusable prompt templates, churn monitoring, context cleanup, and compact status integration.

> Early preview: `pi-goals` is usable, but install ergonomics and APIs may change before `1.0.0`.

## What’s new

Goals can now clean up their own execution context when they finish.

You can ask Pi to remove a completed goal’s execution branch from the active session and keep only a compact summary. This works for a single long-running goal or for a queue of many goals.

That lets a queue keep moving without carrying every previous goal’s full branch forward, and without requiring a full-session compaction between goals.

See the [changelog](CHANGELOG.md) for details.

## Features

- `/goal` command for creating, pausing, resuming, replacing, and clearing a persistent objective.
- Goal state that survives reloads, compaction, context-overflow recovery, and `/tree` navigation.
- Queue handoff recovery for completed goals, satisfied orchestration queue items, and compaction/context-overflow recovery, so queued work does not strand silently.
- Maximum execution limits with warning and cutoff enforcement.
- Minimum work thresholds that require a goal to run for at least a configured amount of time or tokens before completion is allowed.
- Reusable token-aware prompt templates from bounded `.pi-goals/` and `.ai/.pi-goals/` directories.
- Durable FIFO goal queue for sequential goal work.
- Agent-friendly queue controls for listing, enqueuing, starting, dequeuing, and removing queued goals.
- Natural-language reusable prompt discovery, so agents can turn project workflows into concrete goals.
- Natural-language goal inspection and updates.
- Automated churn monitoring for long-running goals.
- Compact Pi status/widget integration.

## Install

Install globally for your Pi environment:

```bash
pi install npm:pi-goals
```

Install project-locally:

```bash
pi install -l npm:pi-goals
```

## Suggested AGENTS.md

Without prior context, the agent sometimes will not route natural language to goal templates automatically. This short snippet helps it resolve queued prose through reusable workflows instead of treating every queue item as a one-off task.

```md
## Goal queue prompt routing

When handling queued pi-goals prose, treat `.ai/.pi-goals/*` as reusable workflows. Before `start_queued_goal` for an abstract/task-type queue item, call `list_goal_templates` and match by name, aliases, description, and placeholders. If exactly one template fits and inputs are available, use `create_goal_from_template`; dequeue the prose item only after that concrete goal is satisfied. Use `start_queued_goal` only for direct one-off goals.

Never discard queued work. Do not call `dequeue_goal` unless the queue head is actually satisfied or the user explicitly authorizes removing that specific queued item. If uncertain, leave it queued and report the blocker.

### Goal queue processing and semantics

If you are asked to queue multiple goals at once, you must FIRST enqueue each goal, and then create and individually process each goal on the queue.

Never violate the queue semantics by batching queue work and then dequeuing multiple queued work items at once as if it had run individually. Each goal on the queue MUST be run individually — no exceptions.

Process each queued item as its own concrete goal. If the queued goal objective indicates or references a goal template, treat the goal as an orchestration-type goal and create it with `create_goal_from_template`.
```

## `/goal` command

Use `/goal` to create and manage a persistent objective that survives across turns, reloads, compaction, and `/tree` navigation.

```text
/goal
/goal <objective>
/goal queue
/goal queue <objective-or-template>
/goal pause
/goal resume
/goal clear
/goal tools
```

Subcommands:

- `/goal` — show the current goal summary, status, budgets, and progress metadata.
- `/goal <objective>` — create a new active goal. If a goal already exists, Pi asks before replacing it.
- `/goal queue` — list queued goals.
- `/goal queue <objective-or-template>` — enqueue a direct objective or reusable template invocation for later.
- `/goal pause` — pause continuation and churn monitoring. If a goal-driven turn is active, Pi interrupts it.
- `/goal resume` — resume a paused goal and schedule continuation/monitoring again.
- `/goal clear` — remove the current goal from active state.
- `/goal tools` — enable pi-goals tool-created goals to manage context.

Agents can also inspect, create, update, pause, resume, complete, clear, or queue goals from natural-language instructions without requiring users to type slash commands for every operation.

## Natural-language goal management

You do not have to use explicit `/goal` commands for every operation. The Pi agent can manage goals from ordinary natural-language instructions.

Examples:

```text
Keep working toward shipping this release, but pause the persistent goal while I answer email.
```

```text
Set a goal to finish the README cleanup with a 30-minute budget, then keep going until it is done or blocked.
```

```text
Mark the current goal complete and summarize what changed.
```

Use `/goal` when you want direct command control. Use natural language when you want the agent to choose the right goal operation from context.

Agents can:

- create goals,
- update goals,
- pause and resume goals,
- queue goals,
- complete goals,
- summarize completed work,
- modify execution limits and minimum work thresholds.

## Goal execution limits and minimum work thresholds

`pi-goals` supports both maximum execution limits and minimum required work thresholds.

These solve different problems:

- maximum limits cap total execution,
- minimum thresholds require the agent to spend at least a certain amount of time or tokens working on the goal before completion is allowed.

You can combine both on the same goal.

### Maximum execution limits

Maximum execution limits define the total allowed execution window for a goal.

Both time and token limits are supported.

Enforcement happens in phases:

- Near the configured limit, `pi-goals` sends a warning message asking the agent to begin wrapping up.
- If execution exceeds the configured allowance, a small overage window is allowed.
- After the overage window expires, hard cutoff enforcement terminates the goal automatically.

The warning and cutoff thresholds currently operate at roughly ±10% around the configured maximum.

Goals terminated by hard enforcement cannot continue until the limit is raised or the goal is cleared.

### Minimum work thresholds

Minimum work thresholds require a goal to run for at least a configured amount of time or token usage before completion is allowed.

For example:

- “Work on this for at least 10 minutes.”
- “Spend at least 10 million tokens before considering this complete.”

If an agent attempts to complete a goal before the configured threshold has been satisfied:

- the completion attempt is rejected,
- the goal remains active,
- the agent receives a follow-up instruction telling it to continue working.

`pi-goals` tries to push the agent toward useful additional work instead of allowing meaningless quota-filling churn.

Typical follow-up passes include:

- requirement-gap audits,
- validation expansion,
- edge-case review,
- adversarial review,
- implementation simplification,
- evidence gathering,
- compatibility review,
- documentation and handoff cleanup.

> NOTE: there is currently no `/goal` argument syntax for configuring limits or thresholds directly. They can still be configured through natural-language instructions, including while a goal is already running.

Examples:

```text
Create a goal for xyz and work on it for a minimum of 10 minutes.
```

```text
Start working on the goal, and when you finish the initial implementation, set a time threshold for 8 minutes more than the current elapsed time.
```

## Goal queue

`pi-goals` supports a durable FIFO queue for sequential work.

Queued goals survive reloads and stay aligned with the rest of the session history.

```text
/goal queue
/goal queue write the release notes
/goal queue fix-issue --issue ISSUE-123 -- verify the fix
```

For larger batches, `/goal queue` also accepts multi-item queue blocks so agents can enqueue an ordered stack before executing it head-to-tail.

Example:

```md
/goal queue [1] do thing one
[2] do thing two
[3] do thing three
```

> IMPORTANT: any line beginning with `[N]` is parsed as a new goal to enqueue immediately.

Natural language works too:

```md
queue up this goal stack pls:
1. run execute-issue-stack goal for those two issues
2. run `deslop-pipeline` on the full commit range since the last release 0.3.0.
3. begin prepare pi-goals for release: run `release-readme-review` goal
4. bump version to appropriate next version based on changes
5. run `dirty-worktree-cleanup` goal
6. read and execute everything here `solo://proj/2/scratchpad/pi-goals-release-cyc--10`
7. report on the full goal stack and release readiness status (ready to push, ready to publish) when done
```

> NOTE: tags like `deslop-pipeline` refer to reusable goal templates. You can create a `.pi-goals` directory in your project and place your templates there. See [`.ai/.pi-goals`](.ai/.pi-goals) in this repository for examples.

Agents can manage the queue through natural language just like individual goals:

- list queued work,
- enqueue items,
- start the next queued goal,
- resolve queued prose through reusable templates,
- remove completed items after satisfaction.

Queued prose that looks like a reusable workflow can be resolved through goal templates, worked as a concrete instantiated goal, and only then removed from the queue.

Manual dequeues require rationale and authority so queue history remains auditable.

## Reusable `.pi-goals` prompts

`pi-goals` can turn project-local prompt templates into reusable goal workflows.

Supported template directories:

```text
.pi-goals/
.ai/.pi-goals/
```

Example structure:

```text
.pi-goals/
  fix-issue.md
  release/checklist.md

.ai/.pi-goals/
  create-issue-doc.md
```

`pi-goals` intentionally checks only these bounded root-level directories instead of recursively scanning the entire workspace. This keeps autocomplete responsive even when Pi is started from very large folders such as a home directory.

Invoke templates through `/goal`:

```text
/goal fix-issue --issue ISSUE-123 -- verify the fix and update docs
/goal release/checklist --version 0.1.1
```

Templates support simple frontmatter:

```markdown
---
description: Fix an issue using the repo workflow
aliases: fix, issue
allow_commands: false
---
Fix {{issue}}.

Extra context: {{args}}
```

Template features:

- `{{name}}` placeholders resolve from `--name value` or `--name=value` flags.
- `{{args}}` resolves to text after ` -- `.
- `description` appears in command completion.
- `aliases` provide alternate invocation names.
- Inline shell snippets using ``!`command` `` are supported only when `allow_commands: true`.
- Shell execution is bounded by timeout and output limits.

Reusable templates work through both slash commands and natural-language workflows.

Agents can:

- discover templates,
- match aliases/descriptions/placeholders,
- fill required values from user requests,
- create concrete goals from resolved prompts,
- enqueue template invocations for later execution.

## Between-goal context management

Long-running queues can accumulate large amounts of one-off execution detail.

`pi-goals` can remove completed execution branches from the active session and replace them with compact summaries before continuing to the next queued goal.

This keeps queue execution moving without forcing every previous execution branch to remain in active context.

### Direct `/goal` commands

```text
/goal write the release notes and summarize context
/goal repo-worktree-inventory -- current state and summarize context
/goal queue clean the worktree and summarize context
```

Templates behave the same way.

When a template invocation includes “summarize context,” the summarization instruction is removed before template expansion so the workflow prompt itself stays clean.

### Plain-language goal creation

Example:

```text
Create a goal to triage the release notes, summarize context before the next queued goal, then continue the queue.
```

Pi currently exposes the internal session-tree context object only to slash-command handlers.

Natural-language requests create goals through pi-goals tool calls. Those tool calls can create goals, but they cannot independently capture the navigation context object needed for later branch cleanup.

In a fresh session, run `/goal tools` before creating natural-language goals that summarize context. It captures the internal Pi context object needed to navigate the session tree:

```text
/goal tools
```

Creating any slash-command goal also captures the required context object:

```text
/goal <your first task> and summarize context
```

Once captured, later natural-language-created goals can summarize context correctly.

If summarization fails, `pi-goals` reports the failure and continues processing the queue instead of stopping execution.

## Automated churn monitor

Long-running goals can drift, loop, or stop making meaningful progress.

`pi-goals` runs a lightweight goal-scoped churn monitor that periodically checks whether useful progress is still happening.

The monitor can:

- detect repeated no-progress loops,
- detect repeated automatic turns,
- send corrective follow-up instructions,
- escalate when a safety pause is needed,
- distinguish useful follow-up work from meaningless quota-filling churn,
- maintain compact monitor history tied to the active goal.

Monitor history survives reloads and `/tree` navigation.

> NOTE: the churn monitor currently runs as an invisible headless Pi agent session. This is still experimental, but already works reasonably well. Yellow notices shown in the Pi UI are user-visible monitor notices. Separate instructions sent directly to the worker agent can be inspected through `/tree`.

## This repository as a reference

This repository is both:

1. the source for the `pi-goals` extension;
2. a working reference for real-world goal-oriented workflows.

The repository intentionally includes:

- reusable goal templates in [`.ai/.pi-goals/`](.ai/.pi-goals/),
- issue docs in [`.ai/issues/`](.ai/issues/),
- issue workflow artifacts in [`.ai/docs/issue-workflow/`](.ai/docs/issue-workflow/),
- a prompt-template authoring guide in [`.ai/docs/prompt-template-authoring.md`](.ai/docs/prompt-template-authoring.md).

These examples demonstrate:

- release-review workflows,
- issue execution workflows,
- queue-stack orchestration,
- acceptance verification,
- deslop workflows,
- evidence and handoff patterns.

If you want to build your own reusable workflows, adapt the patterns instead of copying them blindly.

## Roadmap

Current execution-ready roadmap items include:

- durable completion proofs,
- `/goal audit`,
- agent-managed subgoals,
- idle-tolerant waiting,
- dependency watchers,
- worktree starts,
- multi-goal collections,
- history/checkpoints,
- progress estimates,
- widget hardening,
- safer natural-language `/goal update` editing,
- stronger queue continuation and dequeue reminders.

## Development

```bash
npm install
npm run gates:quality
```

`npm run gates:quality` runs the project quality gate for the extension, including:

- Sentrux structure checks,
- TypeScript validation,
- Pi extension load validation.

Development quality checks require the `sentrux` CLI to be available on `PATH`.

## Status

This is an early public preview intended for collaborators and early testers.

Expect rough edges and breaking changes before `1.0.0`.

## License

MIT
