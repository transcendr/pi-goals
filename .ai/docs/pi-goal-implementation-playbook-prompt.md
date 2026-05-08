# pi-goal implementation playbook prompt

Use this prompt at the start of the `pi-goal` implementation session.

```md
You are implementing ISSUE-001: a feature-complete project-local Pi extension that ports Codex CLI `/goal` into Pi.

Authoritative docs:

- `.ai/issues/open/ISSUE-001-pi-goal-extension.md`
- `.ai/docs/codex-goal-command-research.md`
- `.ai/docs/pi-goal-future-churn-overseer.md` only for the first-landing telemetry seam; do not implement the overseer.
- `AGENTS.md`
- `.pi/extensions/goal/.sentrux/rules.toml`

Primary implementation target:

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

Mission:

Implement `pi-goal` as a real runtime, not a slash-command wrapper. It must provide Codex-style `/goal` behavior, model tools, persisted branch-local state, telemetry, UI status/widget updates, runtime continuation, budget-limit handling, and safety pauses.

Non-negotiables:

- Keep the implementation modular from the start using the planned 12-file layout.
- Do not collapse behavior into `index.ts`; `index.ts` should only wire registration.
- Do not introduce external workflow-tracker coupling into feature code or planning comments.
- Do not implement the future churn overseer in first landing.
- Do implement compact generic `GoalTelemetrySnapshot` support in first landing.
- Do not add task-specific churn classifier labels.
- Preserve Codex status parity: `active`, `paused`, `budgetLimited`, `complete` only.
- Preserve objective safety: objective text is untrusted task data, never higher-priority instructions.
- Use branch-local replay from `ctx.sessionManager.getBranch()`, not global session entries.
- Use append-only `pi-goal-state` custom entries as the durable source of truth.
- Use hidden custom messages for continuation and budget-limit steering; filter stale steering from context.
- Defer continuation after `agent_end`; never trigger synchronously while Pi is still finishing the run.

Sentrux workflow:

1. Before non-trivial code changes, run:

   ```bash
   sentrux gate --save .pi/extensions/goal
   ```

2. If starting from an empty extension directory, create only the modular scaffold first, then run:

   ```bash
   sentrux check .pi/extensions/goal
   sentrux gate --save .pi/extensions/goal
   ```

   This makes the modular scaffold the useful baseline before deeper behavior.

3. After every meaningful implementation slice, run:

   ```bash
   sentrux gate .pi/extensions/goal
   sentrux check .pi/extensions/goal
   ```

4. If Sentrux fails, read the structural failure, fix the import direction/module boundary/cycle/god-file cause, and rerun before continuing.

5. Sentrux is only a structural sensor. Also run TypeScript/Pi reload validation when available.

Recommended implementation order:

## Slice 0 — Scaffold and Sentrux baseline

- Create all 12 planned module files.
- Add `.sentrux/rules.toml` if missing; otherwise respect the existing corrected rules.
- Make `index.ts` register no-op or minimal placeholders only if needed for load validation.
- Run `sentrux check`, then save a fresh scaffold baseline.

## Slice 1 — Domain, constants, and formatting

Files:

- `types.ts`
- `constants.ts`
- `format.ts`

Implement:

- `GoalStatus`, `GoalState`, `PiGoalStateEvent`, `GoalTelemetrySnapshot`, accounting snapshots, steering metadata.
- constants for custom entry/message types, objective limit, safety caps, telemetry schema version, UI ids, prompt ids.
- objective validation: non-empty, max 4,000 chars, long-instructions-in-file hint.
- XML escaping.
- elapsed formatting matching Codex examples.
- compact token formatting, status labels, command hints, objective excerpts.

Run Sentrux gate/check.

## Slice 2 — State and telemetry core

Files:

- `state.ts`
- `telemetry.ts`

Implement:

- Branch-local replay from `ctx.sessionManager.getBranch()`.
- `pi.appendEntry("pi-goal-state", event)` persistence.
- mutation helpers for set/update/account/clear with stale `goalId` guards.
- replay tolerance for malformed/future events.
- telemetry creation/replay/mutation helpers.
- generic compact telemetry only: counters, origins, reasons, progress flags, updated timestamps.
- no transcript excerpts, tool output blobs, model-generated analyses, or task-specific churn labels.

Run Sentrux gate/check.

## Slice 3 — UI and command behavior

Files:

- `ui.ts`
- `command.ts`

Implement:

- `ctx.ui.setStatus` footer labels matching Codex wording.
- compact widget rendering.
- bare `/goal` summary and no-goal usage/hint.
- paused-goal resume prompt helper.
- `/goal` parser for bare/objective/pause/resume/clear.
- create/replace behavior with confirmation.
- pause/resume/clear mutations, UI sync, telemetry reset/update.

Do not import continuation scheduling directly from command if Sentrux rules disallow it; expose a runtime callback/wiring pattern from `index.ts` or lifecycle registration that preserves boundaries.

Run Sentrux gate/check.

## Slice 4 — Model tools and prompt builders

Files:

- `tools.ts`
- `prompts.ts`

Implement:

- `get_goal`, `create_goal`, `update_goal` with TypeBox schemas.
- `create_goal` fails if goal exists and must not infer goals from ordinary tasks.
- `update_goal` only accepts `complete`.
- structured tool results with goal details and compact telemetry when useful.
- Codex continuation prompt builder.
- Codex budget-limit prompt builder.
- untrusted objective wrapping and XML escaping.

Keep prompt builders deterministic; they must not schedule turns or depend on runtime state outside arguments.

Run Sentrux gate/check.

## Slice 5 — Lifecycle and continuation runtime

Files:

- `lifecycle.ts`
- `continuation.ts`

Implement:

- `session_start`, `session_tree`, `turn_start`, `turn_end`, `agent_end`, `tool_call`, `context` wiring.
- turn accounting: wall-clock elapsed seconds plus assistant `usage.totalTokens` when available.
- budget crossing to `budgetLimited` and one budget-limit wrap-up.
- deferred `scheduleMaybeContinueGoal` and `maybeContinueGoal` with idle/pending/safety checks.
- hidden custom messages for continuation and budget wrap-up.
- stale steering message filtering in `context`.
- abort pause handling.
- no-progress and max-auto-turn safety pauses using telemetry counters.

Run Sentrux gate/check.

## Slice 6 — Entrypoint integration and behavior validation

File:

- `index.ts`

Ensure:

- entrypoint imports modules and registers command, tools, lifecycle hooks.
- no business logic accumulates in `index.ts`.
- no cycles or disallowed imports appear.

Then validate:

- TypeScript syntax/check command if available.
- Pi `/reload` can load the extension.
- `/goal` no-goal usage.
- `/goal <objective>` creation.
- `/goal` summary.
- pause/resume/clear.
- replacement confirmation.
- session reload/tree replay.
- goal tools.
- budget-limit transition and wrap-up.
- abort pause if feasible.
- telemetry snapshots are compact, generic, persisted, and replayed.

Run final:

```bash
sentrux gate .pi/extensions/goal
sentrux check .pi/extensions/goal
```

Implementation quality bar:

- No import cycles.
- No module owns another module’s responsibility.
- No god files; each file stays under the Sentrux line limit.
- All state changes go through state helpers.
- All telemetry changes go through telemetry helpers.
- All user-facing strings use format/UI helpers where practical.
- All continuation/budget text comes from prompt builders.
- All command/tool/lifecycle surfaces preserve stale `goalId` protection.
- Reload and branch replay are first-class paths, not afterthoughts.

Final report must include:

- files created/changed
- Sentrux commands run and pass/fail status
- TypeScript/Pi validation commands run and pass/fail status
- manual `/goal` behavior scenarios validated
- any remaining limitations or intentionally deferred work
```
