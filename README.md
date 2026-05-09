# pi-goals

Persistent goal tracking for [Pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent). Inspired by Codex CLI's `/goal`, `pi-goals` adds Pi-native UX, rewindable `/tree`-compatible goal state, time and token budgets, reusable token-aware prompts, automated churn monitoring, and more.

> Early preview: `pi-goals` is usable, but install ergonomics and APIs may change before `1.0.0`.

## Features

- `/goal` command for creating, pausing, resuming, replacing, and clearing a persistent objective.
- Rewindable `/tree`-compatible state persisted into the Pi session branch.
- Time and token budgets with goal-aware continuation and wrap-up behavior.
- Reusable token-aware prompt templates from `.pi-goals/` directories.
- Durable FIFO goal queue for sequential goal work.
- Queue-aware model tools for listing, enqueuing, starting, dequeuing, and removing queued goals.
- Natural-language reusable prompt discovery via `list_goal_templates` and `create_goal_from_template`.
- Model tools for inspecting and updating the active goal.
- Automated churn monitoring and steering for long-running goals.
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

## `/goal` command

Use `/goal` to create and manage a persistent objective that survives across turns and is persisted into the Pi branch so `/tree` rewind/replay semantics stay coherent.

```text
/goal
/goal <objective>
/goal queue
/goal queue <objective-or-template>
/goal pause
/goal resume
/goal clear
```

Subcommands:

- `/goal` — show the current goal summary, status, budgets, and progress metadata.
- `/goal <objective>` — create a new active goal. If a goal already exists, Pi asks before replacing it.
- `/goal queue` — list queued goals.
- `/goal queue <objective-or-template>` — enqueue a direct objective or reusable template invocation for later.
- `/goal pause` — pause continuation and churn monitoring. If a goal-driven turn is active, Pi interrupts it.
- `/goal resume` — resume a paused goal and schedule continuation/monitoring again.
- `/goal clear` — remove the current goal from active state.

The extension also exposes model tools so agents can inspect, create, update, pause, resume, complete, clear, or queue goals without string-parsing the slash command.

## Goal queue

`pi-goals` supports a durable FIFO queue for sequential work. Queued goals are persisted into the Pi branch alongside goal state, so replay and `/tree` semantics remain coherent.

```text
/goal queue
/goal queue write the release notes
/goal queue fix-issue --issue ISSUE-123 -- verify the fix
```

Agents can also manage the queue through model tools:

- `list_goal_queue`
- `enqueue_goal`
- `start_queued_goal`
- `dequeue_goal`
- `remove_queued_goal`

For queued prose that looks like a reusable workflow, agents can list templates with `list_goal_templates`, create a concrete goal with `create_goal_from_template`, then dequeue the original queue item after the concrete goal is satisfied.

## Natural language goal management

You do not have to use explicit `/goal` commands for every operation. Because `pi-goals` exposes goal management as Pi model tools, the Pi agent can manage goals from ordinary natural language instructions.

Examples:

```text
Keep working toward shipping this release, but pause the persistent goal while I answer email.
```

```text
Set a goal to finish the README cleanup with a 30 minute budget, then keep going until it is done or blocked.
```

```text
Mark the current goal complete and summarize what changed.
```

Use `/goal` when you want direct command control; use natural language when you want the agent to decide the right goal operation in context.

When a goal reaches its time or token budget, `pi-goals` steers the agent into wrap-up instead of silently continuing. Exhausted goals cannot be resumed until the budget is raised or the goal is cleared.

## Reusable `.pi-goals` prompts

`pi-goals` can turn project prompt templates into reusable goal objectives. Put Markdown, `.markdown`, or `.txt` templates under any `.pi-goals/` directory in your workspace:

```text
.pi-goals/
  fix-issue.md
  release/checklist.md
```

Then invoke a template by name through `/goal`:

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
- Inline shell snippets with ``!`command` `` are supported only when `allow_commands: true`; commands are bounded by timeout and output limits.

Reusable templates are available to both slash commands and model tools. Agents can call `list_goal_templates` to discover templates and `create_goal_from_template` to create a concrete goal from one. Template invocations also work through `/goal queue`.

## Automated churn monitor

Long-running goals can drift, loop, or stall. `pi-goals` runs a lightweight goal-scoped churn monitor that periodically reviews sparse session context, recent goal telemetry, and recent monitor decisions.

The monitor can:

- detect no-progress loops and repeated automatic turns,
- steer the worker back toward the objective,
- escalate when a safety pause is needed,
- keep its own bounded churn log in the Pi branch.

Monitor state is goal-scoped and replayable, so branching and `/tree` operations stay aligned with the active goal history.

## Development

```bash
npm install
npm run quality:goal
```

`npm run quality:goal` runs the project quality gate for the extension, including [Sentrux](https://github.com/sentrux/sentrux) structure checks, TypeScript validation, and Pi extension load validation.

Development quality checks require the `sentrux` CLI to be available on `PATH`.

## Status

This is an early public preview intended for collaborators and early testers. Expect rough edges and breaking changes before `1.0.0`.

## License

MIT
