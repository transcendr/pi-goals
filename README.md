# pi-goals

Persistent goal tracking for [Pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent). Inspired by Codex CLI's `/goal`, `pi-goals` adds Pi-native UX, goals that survive reloads and `/tree` navigation, time and token budgets, reusable token-aware prompts, automated churn monitoring, and more.

> Early preview: `pi-goals` is usable, but install ergonomics and APIs may change before `1.0.0`.

## What's new

Bounded reusable prompt discovery keeps `/goal` autocomplete responsive in large workspaces, and active goals now resume safely after Pi compaction. See the [changelog](CHANGELOG.md) for details.

## Features

- `/goal` command for creating, pausing, resuming, replacing, and clearing a persistent objective.
- Goal state that survives reloads, compaction, and `/tree` navigation.
- Time and token budgets with goal-aware continuation and wrap-up behavior.
- Optional completion floors that prevent premature wrap-up until minimum goal-directed work has happened.
- Reusable token-aware prompt templates from bounded `.pi-goals/` and `.ai/.pi-goals/` directories.
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

## Suggested AGENTS.md

Without previous context, sometimes the agent won't automatically route natural language to goal templates.  This little blurb fixes that. Everything else should work out of the box and is driven by "just in time" internal agent instructions.

```
## Goal queue prompt routing

When handling queued pi-goal prose, treat `.ai/.pi-goals/*` as reusable workflows. Before `start_queued_goal` for an abstract/task-type queue item, call `list_goal_templates` and match by name, aliases, description, and placeholders. If exactly one template fits and inputs are available, use `create_goal_from_template`; dequeue the prose item only after that concrete goal is satisfied. Use `start_queued_goal` only for direct one-off goals.

Never discard queued work. Do not call `dequeue_goal` unless the queue head is actually satisfied or the user explicitly authorizes removing that specific queued item. If uncertain, leave it queued and report the blocker.
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

## Goal queue

`pi-goals` supports a durable FIFO queue for sequential work. Queued goals survive reloads and stay aligned with the rest of the session history.

```text
/goal queue
/goal queue write the release notes
/goal queue fix-issue --issue ISSUE-123 -- verify the fix
```

For larger batches, `/goal queue` also accepts multi-item queue blocks, so agents can enqueue an ordered stack before executing it head-to-tail.

You can do it like: 

```md
/goal queue --start -- [1] do thing one
[2] do thing two
[3] do thing 3
```

> IMPORTANT: the goal queue list pattern is any line starting with `[N]` will be parsed as a new a goal to enqueue immediately.

Or in natural language is even easier. Here's a realer-world example:

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

> NOTE: when I mention tags like `deslop-pipeline` those are reference to dynamic goal templates.  You can create a `.pi-goals` directory in your project and place your goal templates inside.  See [these examples](.ai/.pi-goals) for a good starting point for how pi-goals goal templates work. Point your agent at this repo and these examples to have your agent create its owns.

Agents can manage the queue just like individual goals from natural language: list queued work, add items, start the next direct goal, or remove a queue item after it is satisfied.

For queued prose that looks like a reusable workflow, agents can resolve it through your reusable prompt templates, work the resulting concrete goal, then dequeue the original queue item after it is satisfied. Manual dequeues require a rationale and authority so queue history remains auditable.

## Minimum / Maximum effort goals 

Minimum effort (completion floor) goals let you ask an agent to do at least a certain amount of goal-directed work for a specified time or number of tokens before normal wrap-up. For example, you can ask it to keep working for at least 10 minutes, or to spend 10 million tokens, at a minimum before considering the goal complete.

These are internally enfored. If an agent tries to mark a goal complete or stop working too early, those actions are deferred, the goal stays active, and the agent is sent a steering message to keep working. But `pi-goals` nudges the agent toward a quality, useful next pass such as checking requirement gaps, adding validation evidence, reviewing edge cases, simplifying the work and does not allow the agent to fall into a pattern of churning just to fill quota.

Max time/token budgets remain a safety stop even when a floor is set and supercedes an y floor. If a max budgeit is set cannot go past it, period. Maximum time/token budgets are have a trigger on 10% of either side of the target.  At 10% before the total max budget target, it sends a warning message to the agent to start wrapping up. If by 10% over the stated max target budget the agent it still running, there's a hard kill switch. 

Combining max with minimum time/token budgets gives you both controls: floors reduce premature "done" claims, while budgets keep runaway sessions bounded.

> NOTE: there is currently no `/goal` command argument to set these max or min budgets.  You can ask your agent in natural language to do so, even when the current goal is running. For example: "Start working on the goal, and when you finish the initial implementation, set a time floor for 8 minutes more than the current elapsed time." or simply, "create a goal for xyz and work on it for a minimum of 10 minutes."

These ergonomics will improve soon!

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

> NOTE: the churn monitor agent runs in the background as an invisible (headless) pi agent session. This is still experimental and needs work, but does do a pretty good job at present.  If you see messages appear in the pi chat window in yellow while a goal is running, these are notices of what the churn monitor is doing. These are only visible to you and not your agent.  Separate steering messages that are sent directly to and visible by the agent can be seen by looking at `/tree`.

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
