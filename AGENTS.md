# AGENTS — pi-goals

## Project Goal

This repo is implementing `pi-goal`, a project-local Pi extension that ports Codex CLI's `/goal` runtime into Pi.

Authoritative planning docs:

- `.ai/issues/open/ISSUE-001-pi-goal-extension.md`
- `.ai/docs/codex-goal-command-research.md`

Implementation target:

- `.pi/extensions/goal/index.ts`

Use the modular source layout below from the start for maintainability and extensibility:

```text
.pi/extensions/goal/
  index.ts
  command.ts
  constants.ts
  continuation.ts
  format.ts
  lifecycle.ts
  prompts.ts
  state.ts
  telemetry.ts
  tools.ts
  types.ts
  ui.ts
```

## Module Responsibilities

- `index.ts`: small extension entrypoint; import modules and register command, tools, lifecycle hooks.
- `types.ts`: `GoalState`, `GoalStatus`, `PiGoalStateEvent`, `GoalTelemetrySnapshot`, turn/accounting snapshots, prompt/steering metadata types.
- `constants.ts`: custom entry/message type names, objective limit, safety caps, telemetry schema version, UI IDs, prompt IDs.
- `state.ts`: branch replay from `ctx.sessionManager.getBranch()`, `pi.appendEntry("pi-goal-state", event)` persistence, mutation helpers, stale `goalId` guards.
- `telemetry.ts`: telemetry snapshot creation/replay helpers, turn-origin tracking, consecutive auto/no-progress counters, skip/schedule reasons, safety-pause metadata.
- `format.ts`: objective validation, XML escaping, elapsed formatting, compact token formatting, status labels, objective excerpts, command hints.
- `prompts.ts`: Codex-style continuation and budget-limit prompt builders with untrusted objective wrapping.
- `ui.ts`: `ctx.ui.setStatus`, `ctx.ui.setWidget`, bare `/goal` summary rendering, user notices, paused-goal resume prompt helper.
- `command.ts`: `/goal` parser and handler; create/replace/pause/resume/clear behavior; replacement confirmation.
- `tools.ts`: `get_goal`, `create_goal`, `update_goal`, TypeBox schemas, tool result formatting and restrictions.
- `lifecycle.ts`: `session_start`, `session_tree`, `turn_start`, `turn_end`, `agent_end`, `tool_call`, `context` wiring.
- `continuation.ts`: deferred `scheduleMaybeContinueGoal`, `maybeContinueGoal`, idle/pending/safety rechecks, hidden custom message sending, budget-limit wrap-up scheduling.

## Required Sentrux Usage

Use the global `$sentrux` skill for general CLI workflow and interpretation guidance.

For this project, run Sentrux against the extension directory, not the repo root, because the repo contains large reference material under `references/codex`.

Target directory:

```bash
.pi/extensions/goal
```

Before non-trivial implementation work:

```bash
sentrux gate --save .pi/extensions/goal
```

After implementation work:

```bash
sentrux gate .pi/extensions/goal
sentrux check .pi/extensions/goal
```

Rules file:

```text
.pi/extensions/goal/.sentrux/rules.toml
```

If Sentrux reports degradation or rule failures, fix the structural cause before claiming completion unless the user explicitly accepts the tradeoff.

## Architecture Expectations

`pi-goal` is a runtime, not only a slash command. Keep command parsing, model tools, UI rendering, state persistence, prompt construction, telemetry, and runtime scheduling separated by the module responsibilities above.

Sentrux is a quality sensor and regression gate. It complements tests and manual Pi validation; it does not replace them.

## Quality Control

For each task/todo:

1. Read the relevant task section in the issue doc.
2. Save a Sentrux baseline before substantial code changes.
3. Implement the smallest coherent slice.
4. Run Sentrux gate/check on `.pi/extensions/goal`.
5. Run any available TypeScript/Pi reload validation.
6. Report commands run and remaining failures.

## Solo Todos

This project has Solo todos in instance `solo-pi_goals`. If using `solo-mcp`, first verify the project id; current discovery shows project `2` for `pi-goals` even if older notes mention project `1`.

Useful command:

```bash
solo-mcp todos --instance solo-pi_goals --project 2 --status open
```
