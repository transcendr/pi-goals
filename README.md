# pi-goals

Persistent goal tracking for [Pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent). Inspired by Codex CLI's `/goal`, `pi-goals` adds Pi-native UX, goals that survive reloads and `/tree` navigation, time and token budgets, reusable token-aware prompts, automated churn monitoring, and more.

> Early preview: `pi-goals` is usable, but install ergonomics and APIs may change before `1.0.0`.

## What's new

Completion floors, stronger queue orchestration, larger planning goals, and reusable workflow prompts make `pi-goals` safer for long-running agent work. See the [changelog](CHANGELOG.md) for details.

## Features

- `/goal` command for creating, pausing, resuming, replacing, and clearing a persistent objective.
- Goal state that survives reloads and stays aligned with `/tree` navigation.
- Time and token budgets with goal-aware continuation and wrap-up behavior.
- Optional completion floors that prevent premature wrap-up until minimum goal-directed work has happened.
- Reusable token-aware prompt templates from `.pi-goals/` directories.
- Durable FIFO goal queue for sequential goal work.
- Agent-friendly queue controls for listing, enqueuing, starting, dequeuing, and removing queued goals.
- Natural-language reusable prompt discovery, so agents can turn project workflows into concrete goals.
- Natural-language goal inspection and updates.
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

Use `/goal` to create and manage a persistent objective that survives across turns, reloads, and `/tree` navigation.

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

Agents can also inspect, create, update, pause, resume, complete, clear, or queue goals from natural-language instructions without requiring users to type slash commands for every operation.

## Goal queue

`pi-goals` supports a durable FIFO queue for sequential work. Queued goals survive reloads and stay aligned with the rest of the session history.

```text
/goal queue
/goal queue write the release notes
/goal queue fix-issue --issue ISSUE-123 -- verify the fix
```

For larger batches, `/goal queue` also accepts multi-item queue blocks, so agents can enqueue an ordered stack before executing it head-to-tail.

Agents can also manage the queue from natural language: list queued work, add items, start the next direct goal, or remove a queue item after it is satisfied.

For queued prose that looks like a reusable workflow, agents can resolve it through your reusable prompt templates, work the resulting concrete goal, then dequeue the original queue item after it is satisfied. Manual dequeues require a rationale and authority so queue history remains auditable.

## Natural language goal management

You do not have to use explicit `/goal` commands for every operation. The Pi agent can manage goals from ordinary natural language instructions.

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

## Completion floors

Completion floors let you ask an agent to do at least a certain amount of goal-directed work before normal wrap-up. For example, you can ask it to keep working for at least 10 minutes, or to spend a meaningful token budget, before deciding the goal is complete.

These are floors, not quota targets. If an agent tries to mark a goal complete too early, completion is deferred, the goal stays active, and `pi-goals` nudges the agent toward a useful next pass such as checking requirement gaps, adding validation evidence, reviewing edge cases, simplifying the work, or improving handoff notes.

Budgets remain a safety stop. If the agent runs out of the time or tokens you allowed, `pi-goals` prioritizes a clear wrap-up over forcing more work just to satisfy a floor. That gives you both controls: floors reduce premature "done" claims, while budgets keep runaway sessions bounded.

## Reusable `.pi-goals` prompts

`pi-goals` can turn project prompt templates into reusable goal objectives. Put Markdown, `.markdown`, or `.txt` templates under one of the bounded template directories at your workspace root:

```text
.pi-goals/
  fix-issue.md
  release/checklist.md
.ai/.pi-goals/
  create-issue-doc.md
```

`pi-goals` intentionally checks only these root-level template directories instead of recursively searching the whole workspace. This keeps `/goal` autocomplete responsive when Pi is started from large folders such as a home directory.

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

Reusable templates are available to both slash commands and natural-language agent workflows. Agents can discover available templates, fill in required values from your request, and create a concrete goal from the resolved prompt. Template invocations also work through `/goal queue`.

## This repository as a reference

This repository is both the source for the `pi-goals` Pi extension and a working reference for how the maintainer uses `pi-goals` in real project work. The source repo intentionally includes:

- reusable goal templates in [`.ai/.pi-goals/`](.ai/.pi-goals/), including release review, issue workflow, queue-stack, and deslop examples;
- issue docs in [`.ai/issues/`](.ai/issues/) that show how larger goal-driven changes are planned;
- issue workflow artifacts in [`.ai/docs/issue-workflow/`](.ai/docs/issue-workflow/) that show the evidence, design choices, and handoffs produced while working those goals;
- a [prompt template authoring guide](.ai/docs/prompt-template-authoring.md) for creating strong project-local goal templates.

If you want to build your own reusable goal workflows, point your agent at the authoring guide and nearby templates, then ask it to adapt the patterns to your project rather than copying them blindly.

## Automated churn monitor

Long-running goals can drift, loop, or stall. `pi-goals` runs a lightweight goal-scoped churn monitor that periodically checks whether the agent is still making useful progress toward the active objective.

The monitor can:

- detect no-progress loops and repeated automatic turns,
- steer the worker back toward the objective,
- escalate when a safety pause is needed,
- keep a compact history of recent monitor decisions,
- distinguish useful follow-up work from busywork done only to satisfy a floor.

Monitor history stays tied to the active goal, so reloads and `/tree` navigation keep the right context.

## Roadmap

Current execution-ready roadmap items include durable completion proofs, `/goal audit`, agent-managed subgoals, idle-tolerant waiting, dependency watchers, worktree starts, multi-goal collections, history/checkpoints, progress estimates, widget hardening, safer natural-language `/goal update` edits, and stronger queue continuation/dequeue reminders.

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
