# ISSUE-001 — Feature-complete `pi-goal` extension for Codex-style `/goal`

Status: open — execution-ready  
Priority: high  
Next best session: implementation-focused pi extension build session  
Next best session rationale: The feature can be delivered as a project-local TypeScript extension under `.pi/extensions/goal/index.ts`; the remaining work after this planning pass should be coding and local validation, not product/API selection.  
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`  
Parent issue: none  
Depends on: `.ai/docs/codex-goal-command-research.md` and local pi extension APIs  
Goal: Implement a feature-complete pi extension named `pi-goal` that ports Codex CLI's `/goal` mode as closely as possible while using the best pi-native UX surfaces.

## Problem

Codex CLI recently added a built-in `/goal` feature that turns a normal chat session into a long-running goal pursuit mode. It persists a goal, shows status indicators such as `Pursuing goal (2m)` and `Goal paused (/goal resume)`, gives the model goal-aware tools, and automatically continues work until the goal is complete, paused, cleared, or budget-limited.

Pi does not currently have this project-local behavior. A direct slash-command-only port would miss the core feature: a small runtime that owns state, accounting, UI status, continuation scheduling, and goal model tools.

## Why it matters

The user wants `pi-goal` as a parity baseline before expanding beyond Codex into richer pi-native workflows such as visual progress tracking, system inputs, multiple goals, subgoals, and goal history. The first implementation should therefore be close enough to Codex that future extensions build on a reliable mental model instead of on a shallow command wrapper.

## Desired behavior

- `/goal` command exists in pi and supports bare summary, objective set, `pause`, `resume`, and `clear`.
- One active persisted goal exists per pi session branch for the first implementation.
- Goal status values are `active`, `paused`, `budgetLimited`, and `complete`.
- Goal state survives `/reload`, `/resume`, tree navigation, and compaction where pi session persistence makes this possible.
- The model receives `get_goal`, `create_goal`, and `update_goal` tools with Codex-like restrictions.
- Automatic continuation starts when the agent becomes idle and the goal is active.
- Footer/widget UI shows Codex-like labels using pi-native status and optional widget surfaces.
- Token and time accounting are implemented with the best available pi equivalents.
- Compact, task-independent goal telemetry is recorded for first-landing safety behavior and future overseer/churn-monitor extensions.
- User-facing behavior is feature-complete for the initial parity target; later multi-goal/subgoal/overseer ideas are logged but not required for first landing.

## Current planning status

This issue is the canonical execution plan for the initial implementation. Seven reviewable loops have grounded the design against Codex source, pi docs/source, and future-extension stress testing. All meaningful product/API/runtime forks are locked.

Implementation status: first complete modular version implemented under `.pi/extensions/goal/`. Structural Sentrux gate/check and non-interactive extension load validation pass. Full interactive `/goal` behavior validation remains recommended in a live Pi TUI session.

Implemented source files:

- `.pi/extensions/goal/index.ts`
- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/constants.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/prompts.ts`
- `.pi/extensions/goal/state.ts`
- `.pi/extensions/goal/telemetry.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/types.ts`
- `.pi/extensions/goal/ui.ts`

Validation notes:

- `sentrux gate .pi/extensions/goal` passes.
- `sentrux check .pi/extensions/goal` passes all configured rules.
- Direct Jiti import of `.pi/extensions/goal/index.ts` succeeds.
- `pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models` loads the extension successfully.
- Mock extension harness validated command/tool registration and core behavior: no-goal usage, goal create/summary/pause/resume/replace/clear, `get_goal`, `create_goal`, `update_goal`, token-budget transition to `budgetLimited`, and budget wrap-up message scheduling.
- Live goal-session observation: sending `/goal resume` alone resumed and continued the goal work without requiring a separate follow-up user message.

Accepted deviations / follow-ups:

- Full interactive TUI `/reload`, manual live `/goal` scenarios, and live abort interruption remain recommended follow-up validation because this closeout ran in a non-interactive context.
- `.ai/issues/refine/ISSUE-002-goal-pause-active-turn-interrupt.md` tracks improving pause behavior during an active goal turn.
- `.ai/issues/refine/ISSUE-003-paused-goal-continuation-guard.md` tracks guarding against stale/pasted/queued continuations when a goal is paused.
- `.ai/issues/refine/ISSUE-004-goal-subcommand-fuzzy-autocomplete.md` tracks fuzzy autocomplete for `/goal` subcommands.

## Source artifacts already available

- `.ai/docs/codex-goal-command-research.md` — prior durable Codex `/goal` research handoff.
- `.ai/docs/pi-goal-future-churn-overseer.md` — self-contained future overseer/churn-controller concept note and telemetry rationale.
- `references/codex` — cloned OpenAI Codex source repo.
- Pi docs read in this pass:
  - `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
  - `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/tui.md`
  - `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/session-format.md`
  - `/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/docs/compaction.md`

## Grounded research and design-loop log

### Loop 1 — Initial Codex/pi surface map

Research performed:

- Re-read `.ai/docs/codex-goal-command-research.md`.
- Re-read Codex prompt templates:
  - `references/codex/codex-rs/core/templates/goals/continuation.md`
  - `references/codex/codex-rs/core/templates/goals/budget_limit.md`
- Re-read Codex tool specs and goal UI helpers:
  - `references/codex/codex-rs/core/src/tools/handlers/goal_spec.rs`
  - `references/codex/codex-rs/tui/src/chatwidget/slash_dispatch.rs`
  - `references/codex/codex-rs/tui/src/chatwidget/goal_validation.rs`
  - `references/codex/codex-rs/tui/src/chatwidget/goal_menu.rs`
  - `references/codex/codex-rs/tui/src/chatwidget/goal_status.rs`
  - `references/codex/codex-rs/tui/src/goal_display.rs`
- Read pi extension docs, TUI docs, session format, compaction docs, and relevant examples:
  - `examples/extensions/status-line.ts`
  - `examples/extensions/todo.ts`
  - `examples/extensions/send-user-message.ts`
  - `examples/extensions/message-renderer.ts`
  - `examples/extensions/plan-mode/index.ts`
- Inspected pi generated type definitions and runtime implementation around:
  - `ExtensionContext.isIdle()`
  - `ExtensionContext.hasPendingMessages()`
  - `pi.sendMessage()` / `pi.sendUserMessage()`
  - `pi.appendEntry()`
  - `ctx.ui.setStatus()` / `ctx.ui.setWidget()`
  - custom messages and LLM conversion

Findings:

- Codex `/goal` is a runtime, not just a command: persisted state, lifecycle accounting, auto-continuation, model tools, status UI, and budget-limit steering are coupled.
- Pi has all high-level extension primitives needed for a project-local implementation: commands, tools, event hooks, hidden/displayed custom messages, persistent custom entries, status/footer widgets, and idle/pending-message checks.
- Pi custom messages are persisted and can be hidden from the TUI, but `convertToLlm()` maps custom messages to user-role model messages. There is no direct extension-facing developer-role message injection API visible in the docs/types.
- Pi `before_agent_start` can modify system prompt for normal user-message turns, but `pi.sendMessage(..., { triggerTurn: true })` calls the underlying agent with a custom message directly and does not go through the same `before_agent_start` path in `AgentSession.prompt()`.
- Pi footer already computes cumulative assistant usage from all assistant message entries; `pi-goal` can use the same assistant `usage` fields for token accounting.

Design forks surfaced:

1. Continuation injection priority: hidden custom user-role steering vs visible/marker user message plus system-prompt modification vs provider-payload rewriting.
2. Token budget semantics: exact Codex total-token deltas vs pi assistant-message usage deltas/context estimates.
3. Persistence shape: append-only custom entries vs tool-result details vs external file.
4. UI scope: footer-only parity vs footer plus pi-native widget in first landing.

Loop 1 decisions locked:

- `pi-goal` should be implemented as a project-local extension at `.pi/extensions/goal/index.ts`.
- First implementation is enabled by extension presence; no Codex-style experimental feature gate is required for this project-local port.
- Goal objective validation must preserve Codex's 4,000-character limit and long-instructions-in-file hint.
- Goal tools should use Codex names (`get_goal`, `create_goal`, `update_goal`) unless a later loop finds a pi tool-name collision.

Open after Loop 1:

- Continuation injection strategy.
- Token accounting/budget-limit fidelity.
- Exact state reconstruction and branch semantics.
- Whether first landing includes a widget in addition to footer status.

### Loop 2 — Continuation scheduling and message-role fidelity

Research performed:

- Inspected pi `AgentSession.sendCustomMessage()` in `dist/core/agent-session.js`.
- Inspected pi custom message conversion in `dist/core/messages.js`.
- Inspected pi-agent-core `Agent.prompt()`, `runAgentLoop()`, and event lifecycle in nested `pi-agent-core/dist/agent.js` and `agent-loop.js`.
- Read examples that use `pi.sendMessage(..., { triggerTurn: true })`, especially `examples/extensions/file-trigger.ts` and the game examples.

Findings:

- `pi.sendMessage(..., { triggerTurn: true })` creates a custom message and calls the underlying `agent.prompt()` directly when pi is not streaming.
- Custom messages are converted to LLM-compatible user messages by `convertToLlm()`.
- The `context` hook runs immediately before provider calls and can filter/replace the `AgentMessage[]` before custom messages are converted to user-role LLM messages.
- `agent_end` is emitted before `Agent.finishRun()` clears `isStreaming`; listeners are awaited before the agent is considered idle.
- Calling `pi.sendMessage(...triggerTurn)` synchronously from `agent_end` would see pi as still streaming and route through steer/follow-up behavior rather than reliably starting the next autonomous goal turn.

Design forks resolved:

- F1 continuation injection strategy is locked to hidden custom messages plus deferred idle scheduling and stale-message filtering.

Loop 2 decisions locked:

- Use hidden custom messages for auto-continuation and budget-limit wrap-up.
- Defer auto-continuation from `agent_end`, then re-check `ctx.isIdle()` and `ctx.hasPendingMessages()`.
- Use a `context` hook to keep only the latest pi-goal runtime steering message in model context.
- Do not pursue provider-payload developer-role rewriting in the first implementation.

Open after Loop 2:

- Token accounting/budget-limit fidelity.
- Exact state reconstruction and branch semantics.
- Whether first landing includes a widget in addition to footer status.
- Runaway-loop safety limits.

### Loop 3 — Token/time accounting and budget-limit behavior

Research performed:

- Read Codex `thread_goals` migration and state runtime accounting implementation:
  - `references/codex/codex-rs/state/migrations/0029_thread_goals.sql`
  - `references/codex/codex-rs/state/src/runtime/goals.rs`
- Re-read Codex core goal accounting paths in `references/codex/codex-rs/core/src/goals.rs`.
- Inspected pi footer token accounting in `dist/modes/interactive/components/footer.js`.
- Inspected pi `AssistantMessage.usage` shape in nested `pi-ai/dist/types.d.ts`.
- Inspected `AgentSession.getContextUsage()` to distinguish context-size estimates from billed/response usage.

Findings:

- Codex accounts time and token deltas through runtime snapshots and SQL updates guarded by `goal_id`.
- Codex transitions active goals to `budget_limited` when `tokens_used + token_delta >= token_budget` and can still account in-flight usage after budget limit.
- Pi assistant messages carry per-response `usage` with `input`, `output`, `cacheRead`, `cacheWrite`, and `totalTokens`.
- Pi's built-in footer computes cumulative token totals by summing assistant message usage across all session entries; this validates using assistant usage sums as the pi-native accounting source.
- `ctx.getContextUsage()` estimates current context-window occupancy and is useful for display/safety, but it is not the right primary source for Codex-like token budget consumption.

Design forks resolved:

- F2 token accounting and budget-limit strategy is locked to per-turn assistant usage deltas plus wall-clock time.

Loop 3 decisions locked:

- On `turn_start`, record an in-memory active turn accounting snapshot `{ goalId, startedAtMs }` only when the current goal is active.
- On `turn_end`, if the recorded `goalId` still exists, account elapsed wall-clock seconds plus `event.message.usage.totalTokens` when `event.message.role === "assistant"`; skip token increment for error/aborted assistant messages but still handle abort pause separately.
- If `tokensUsed >= tokenBudget`, transition to `budgetLimited`, update UI, persist the update, and schedule exactly one hidden budget-limit wrap-up message after idle.
- Use pi assistant usage totals as `tokensUsed`; do not use `ctx.getContextUsage()` for budget consumption.
- Preserve Codex-style `goalId` guards: delayed turn accounting must not mutate a replacement goal.
- Token budget from `create_goal` must be a positive integer when present.

Open after Loop 3:

- Exact state reconstruction and branch semantics.
- Whether first landing includes a widget in addition to footer status.
- Runaway-loop safety limits.

### Loop 4 — Persistence, reload, compaction, and branch semantics

Research performed:

- Inspected pi `SessionManager.appendCustomEntry()` and `appendCustomMessageEntry()` implementation in `dist/core/session-manager.js`.
- Re-read `buildSessionContext()` behavior for custom messages vs custom entries.
- Re-read pi session docs for `/tree`, `/fork`, `/clone`, branch summaries, and compaction.
- Re-read stateful extension examples (`todo.ts`, `preset.ts`) for restore patterns.

Findings:

- `pi.appendEntry(customType, data)` creates a `type: "custom"` entry as a child of the current leaf and advances the leaf.
- Custom entries do not participate in LLM context, which is correct for goal state snapshots/accounting.
- `ctx.sessionManager.getBranch()` returns only entries on the active tree path; this enables branch-local goal state restoration.
- `getEntries()` would mix abandoned branches and is not appropriate for reconstructing current goal state.
- Compaction entries do not delete earlier custom entries; current-branch replay can still recover extension state after compaction.
- Tool-result details alone are insufficient because `/goal` commands, accounting, budget transitions, and resume prompts need to mutate/restore state outside model tool calls.

Design forks resolved:

- F3 persistence and branch reconstruction strategy is locked to append-only custom state entries replayed from `getBranch()`.

Loop 4 decisions locked:

- Persist goal runtime state with `pi.appendEntry("pi-goal-state", event)`.
- Reconstruct in-memory state from `ctx.sessionManager.getBranch()` on `session_start`, `session_tree`, and after reload.
- Use event-sourced records that include a full resulting goal snapshot for simple, robust replay and an event reason for auditability.
- Keep `goalId` on every event and ignore stale accounting/update events whose `goalId` does not match the current reconstructed goal.
- Do not store goal state in external files for first landing.
- Do not rely on model tool result details as the source of truth.

Open after Loop 4:

- Whether first landing includes a widget in addition to footer status.
- Runaway-loop safety limits.

### Loop 5 — UI scope and runaway-loop safety

Research performed:

- Re-read pi TUI docs for `ctx.ui.setStatus()`, `ctx.ui.setWidget()`, working indicators, and custom UI.
- Read pi examples:
  - `examples/extensions/widget-placement.ts`
  - `examples/extensions/working-indicator.ts`
  - `examples/extensions/border-status-editor.ts`
- Re-read Codex footer implementation in `references/codex/codex-rs/tui/src/bottom_pane/footer.rs`.
- Re-read Codex goal status mapping in `goal_status.rs` and goal menu display in `goal_menu.rs`.
- Checked Codex runtime comments and abort handling around continuation turns in `core/src/goals.rs`.

Findings:

- Codex status label text is compact and should be matched exactly: `Pursuing goal`, `Goal paused (/goal resume)`, `Goal unmet`, `Goal abandoned`, and `Goal achieved` variants.
- Pi `setStatus()` is the direct footer/status equivalent and supports themed magenta/accent coloring.
- Pi `setWidget()` is a low-cost pi-native UX improvement for objective/status/usage hints without building a custom component.
- Pi has enough event visibility to pause on aborted assistant stop reason and enough local counters to prevent runaway continuation loops.
- Codex relies primarily on goal status, budget, queue checks, and interrupt handling; pi should add bounded safety because the first port cannot inject true developer-role messages and may run provider/model combinations with weaker tool discipline.

Design forks resolved:

- F4 UI scope is locked to footer status plus a compact widget in first landing.
- F5 runaway safety is locked to conservative consecutive-auto-turn caps and no-progress caps that pause rather than inventing a new status.

Loop 5 decisions locked:

- Implement Codex-like footer status with `ctx.ui.setStatus("pi-goal", ...)` whenever a goal exists; clear it when no goal exists.
- Implement a compact widget with objective excerpt, status, elapsed/tokens, and next command hints for all non-empty goal states; clear on `/goal clear`.
- Do not implement a full custom TUI component in the first landing; use simple widget lines for maintainability.
- Pause active goals when a turn ends with assistant `stopReason === "aborted"`.
- Add local safety caps:
  - max consecutive automatic continuation turns without a user command defaults to 50;
  - max consecutive continuation turns with no tool results and no `update_goal` completion defaults to 3;
  - reaching a cap pauses the goal and emits a visible pi-goal notice telling the user to run `/goal resume` to continue.
- `/goal resume` resets the consecutive auto/no-progress counters.

Open after Loop 5:

- None. Remaining passes should be execution-readiness review passes.

### Loop 6 — Execution-readiness parity review

Research performed:

- Re-read the Codex must-have parity checklist from `.ai/docs/codex-goal-command-research.md`.
- Cross-checked issue decisions against pi extension API evidence for commands, tools, lifecycle hooks, state, UI, hidden messages, idle checks, and context filtering.
- Searched the issue for every Codex parity surface: command behavior, validation, replacement, resume prompt, footer labels, elapsed formatting, model tools, continuation prompt, budget-limit prompt, and abort handling.

Findings:

- The first five loops resolved the major architecture forks, but the acceptance criteria needed explicit coverage for resume prompts, exact elapsed formatting, objective validation, and prompt-template porting.
- Pi has direct APIs for each locked implementation surface except true developer-role continuation; D3 records the chosen provider-agnostic equivalent.
- No remaining issue text leaves a product/API/runtime choice for the implementer.

Loop 6 decisions locked:

- Mark the issue execution-ready after updating acceptance criteria, implementation checklist, and TOON synthesis.
- Implement Codex elapsed-time formatting exactly for seconds/minutes/hours/days, adapted to TypeScript.
- Prompt content must be ported from Codex templates in `.ai/docs/codex-goal-command-research.md` appendices, replacing `thread` with pi `session` where appropriate and XML-escaping objective text.
- Resume prompt is first-landing scope: on `session_start` for an existing paused goal with UI available, prompt `Resume goal` vs `Leave paused`, skipping reload.

Open after Loop 6:

- None. Issue is execution-ready.

### Loop 7 — Future-overseer telemetry stress test

Research performed:

- Captured the user-provided Codex `/goal` churn example in `.ai/docs/pi-goal-future-churn-overseer.md` so later sessions do not depend on chat history.
- Re-checked pi extension surfaces for first-landing telemetry support: `turn_start`, `turn_end`, `agent_end`, `tool_call`, `context`, assistant usage, custom entries, hidden custom messages, and branch replay.
- Reviewed the current issue task graph for workflow leakage and replaced external-tracker-specific planning with an issue-local implementation task graph.
- Evaluated whether telemetry can be added now without implementing the future overseer or weakening Codex parity.

Findings:

- The future churn-controller idea is a valid stress test for first-landing architecture, but the overseer itself should remain deferred.
- First landing should record compact, task-independent telemetry because the already-planned safety caps need similar counters and because future monitors should not have to reread full transcripts.
- Telemetry must stay generic. It should record counts, origins, timestamps, progress flags, and reasons; it must not hard-code scenario-specific classifier names from the browser-helper anecdote.
- Pi exposes enough lifecycle and tool-call hooks for useful telemetry. Where exact tool-result counts are not directly available in a hook, implementation should use conservative counts from visible `tool_call` events and/or branch replay rather than inventing precision.
- External workflow trackers are not part of feature planning. The authoritative execution breakdown belongs in this issue doc as issue-local tasks.

Loop 7 decisions locked:

- Add first-landing telemetry to the implementation scope as compact state/event data, not as a separate monitor.
- Add `GoalTelemetrySnapshot` to the planned domain model and persist it inside relevant `pi-goal-state` events.
- Use telemetry for current safety counters and expose it as a future-overseer seam.
- Keep future overseer/churn-controller behavior deferred to a separate issue/module.
- Keep churn semantics generic and task-independent; any future classifier evidence can mention concrete task details, but stable classifier names must not encode one anecdote.
- Remove external tracker-specific references from the issue-local task hierarchy.

Open after Loop 7:

- None. Issue remains execution-ready with telemetry included in first-landing scope.

## Locked design decisions

This section is authoritative. Implementation sessions should not reopen these decisions unless fresh code research proves them invalid.

### D1 — Extension location and packaging

Chosen: Implement `pi-goal` as a project-local directory extension at `.pi/extensions/goal/index.ts`.

Rationale: Pi auto-discovers `.pi/extensions/*/index.ts`, supports `/reload`, and does not require package distribution for this experiment.

Rejected alternatives:

- Global extension under `~/.pi/agent/extensions/`: wrong scope for this repo experiment.
- `pi -e ./path.ts` temporary extension: useful for smoke tests but not durable enough.
- NPM/git package: premature for initial parity implementation.

### D2 — Feature gate posture

Chosen: Enabled by project-local extension presence, with optional internal config/constants only if implementation needs safety caps.

Rationale: Codex gates goals because it is shipping an experimental built-in feature. In this repo, installing the extension is the gate.

Rejected alternatives:

- Recreate Codex's experimental feature flag in pi settings for first landing: extra config surface without clear value.

### D3 — Continuation injection and scheduling

Chosen: Use hidden pi custom messages with `customType: "pi-goal-continuation"` or `"pi-goal-budget-limit"`, `display: false`, and `pi.sendMessage(..., { triggerTurn: true })` only after confirming the agent is idle. Schedule auto-continuation from `agent_end` via a deferred callback (`setTimeout`/equivalent), because pi-agent-core emits `agent_end` before `finishRun()` clears streaming state. Also call the same scheduler from `/goal resume` and new-goal creation when the command context is already idle.

Rationale: This is the most robust provider-agnostic pi equivalent. Pi has no direct extension-facing developer-role injection API. Hidden custom messages preserve UX better than visible user messages, are persisted for auditability, and trigger a turn without requiring provider-specific payload rewriting. A `context` hook should remove stale older `pi-goal-continuation` and `pi-goal-budget-limit` custom messages from model context, keeping only the latest active runtime steering message so repeated continuations do not bloat future turns.

Important implementation details:

- The content must explicitly identify itself as `pi-goal` runtime steering and must preserve Codex's untrusted-objective wrapper.
- Since pi converts custom messages to user-role LLM messages, the prompt must not rely on role priority for safety; it must state that the objective is task data, not higher-priority instructions.
- `maybeContinueGoal(ctx)` must check active goal, `ctx.isIdle()`, `!ctx.hasPendingMessages()`, and local safety caps immediately before sending.
- Do not call `pi.sendMessage(...triggerTurn)` synchronously inside `agent_end`; defer and re-check.

Rejected alternatives:

- Visible `pi.sendUserMessage()` continuation prompts: stronger `before_agent_start` integration but poor UX and noisy transcript.
- Provider-specific `before_provider_request` mutation to synthesize developer-role messages: closer Codex role parity but brittle across providers/transports and too invasive for first landing.
- Synchronous `agent_end` continuation: unsafe because pi is not idle until awaited `agent_end` listeners settle.

### D4 — Time/token accounting and budget limit

Chosen: Account goal time with wall-clock turn snapshots and account goal tokens from each completed pi assistant message's `usage.totalTokens`.

Rationale: Pi does not expose Codex's exact cumulative total-token runtime snapshot, but it does persist assistant usage per response and its own footer uses assistant usage sums as cumulative session token totals. This is the best pi-native equivalent and keeps budget semantics tied to actual provider usage rather than context-window estimates.

Important implementation details:

- `turn_start` captures `{ goalId, startedAtMs }` only for active goals.
- `turn_end` accounts elapsed seconds and assistant `usage.totalTokens` against that `goalId` if the same goal still exists.
- If the goal was paused or completed mid-turn, still account the in-flight turn if the `goalId` matches; if the goal was cleared or replaced, skip stale accounting.
- If accounting crosses a token budget, set status to `budgetLimited` and schedule a budget-limit wrap-up message after idle.
- `ctx.getContextUsage()` may appear in future UI but must not drive budget consumption.

Rejected alternatives:

- Context-usage budget consumption: measures current prompt occupancy, not Codex-like consumed token budget.
- Tool-result-level token accounting: pi does not expose new provider usage at each tool result.
- Wall-clock-only accounting: easier but fails feature-complete budget parity.

### D5 — Persistent state and branch semantics

Chosen: Use append-only custom entries named `pi-goal-state`, replayed from `ctx.sessionManager.getBranch()` into in-memory state.

Rationale: Goal state changes can be caused by commands, tools, accounting, budget transitions, aborts, resume prompts, and auto-continuation. `appendEntry` is the only pi extension persistence primitive that covers all of those without putting state into the model context or external files. Replaying only the current branch gives the best match to pi's tree semantics.

State event shape target:

```ts
type GoalTelemetrySnapshot = {
  version: 1;
  goalId: string;
  totalTurns: number;
  userTurns: number;
  autoTurns: number;
  consecutiveAutoTurns: number;
  consecutiveNoProgressTurns: number;
  lastTurnOrigin?: "user" | "auto" | "budgetWrapUp";
  lastContinuationReason?: "created" | "resumed" | "agentEnd";
  lastSkipReason?: "notIdle" | "pendingMessages" | "notActive" | "budgetLimited" | "safetyCap";
  lastTurnToolCallCount?: number;
  lastTurnToolResultCount?: number;
  lastTurnCompletedGoal?: boolean;
  budgetWrapUpSent?: boolean;
  lastProgressAt?: number;
  lastSafetyPauseReason?: "maxAutoTurns" | "noProgress" | "abort";
  updatedAt: number;
};

type PiGoalStateEvent = {
  version: 1;
  kind: "set" | "update" | "account" | "telemetry" | "clear";
  goalId?: string;
  goal: GoalState | null;
  telemetry?: GoalTelemetrySnapshot | null;
  delta?: { timeUsedSeconds?: number; tokensUsed?: number };
  reason: "command" | "tool" | "turn" | "budget" | "abort" | "resume" | "reload" | "continuation" | "safety";
  at: number;
};
```

Important implementation details:

- Every non-clear event should include the full resulting `goal` snapshot.
- Events that change safety counters, turn origin, continuation scheduling, budget wrap-up state, or progress flags should include the latest compact `telemetry` snapshot.
- Replay should ignore malformed future/old events rather than crashing extension load.
- `clear` should set current goal and telemetry to null even if a stale goal id is absent.
- Use `crypto.randomUUID()` for `goalId` when creating/replacing goals.
- Use `getBranch()`, not `getEntries()`, for active state reconstruction.

Rejected alternatives:

- External JSON file: poor branch semantics and extra cleanup burden.
- Tool-result details as source of truth: misses command/accounting-only mutations.
- Single mutable state object: not available as a documented extension persistence API and less auditable.

### D6 — UI scope

Chosen: Implement both Codex-like footer status and a compact pi-native widget in the first landing.

Rationale: Footer status is required for Codex parity. A widget is the most useful pi-native enhancement the user explicitly anticipated, and `setWidget()` is simple enough that including it does not create a major implementation fork.

Footer labels:

- Active with usage: `Pursuing goal (<usage>)`
- Active without usage: `Pursuing goal`
- Paused: `Goal paused (/goal resume)`
- Budget-limited with usage: `Goal unmet (<usage>)`
- Budget-limited without usage: `Goal abandoned`
- Complete with usage: `Goal achieved (<usage>)`
- Complete without usage: `Goal achieved`

Widget target:

- One compact title/status line.
- Objective excerpt with truncation.
- Usage line for elapsed time and token budget when available.
- Command hint line matching current status.

Rejected alternatives:

- Footer only: close Codex parity but misses low-cost pi UX improvement.
- Full custom component: unnecessary complexity for first landing.
- Custom footer replacement: too invasive and could conflict with user themes/statusline.

### D7 — Runaway and abort safety

Chosen: Add local safety caps that pause the goal with a user-visible notice rather than adding new statuses.

Rationale: Codex has deeper runtime controls and true developer-role continuation. Pi's first extension port should fail safe if automatic continuations are not making progress.

Safety defaults:

- `MAX_CONSECUTIVE_AUTO_TURNS = 50`
- `MAX_NO_PROGRESS_AUTO_TURNS = 3`

No-progress definition for first landing:

- The turn was an automatic pi-goal continuation.
- It produced no tool results.
- It did not successfully call `update_goal` with `complete`.

Abort behavior:

- If an active goal's assistant message ends with `stopReason === "aborted"`, pause the goal, persist the pause, update UI, and do not schedule continuation.

Rejected alternatives:

- Unlimited auto-continuation with no guard: closest to Codex in spirit but riskier in pi because continuation role priority is weaker.
- New `safetyPaused` status: clearer internally but violates Codex status parity.
- Hard failure on safety cap: worse UX than pausing with `/goal resume` recovery.

### D8 — First-landing telemetry seam for future overseer work

Chosen: Include compact, task-independent telemetry in the first implementation. Store it in memory during live turns and persist bounded snapshots inside relevant `pi-goal-state` events.

Rationale: The first landing already needs counters for auto-continuation and no-progress safety. Persisting a compact telemetry snapshot makes those counters reload-safe and creates a clean future seam for a separate overseer/churn-controller module without implementing that module now. This preserves Codex parity behavior while giving Pi a better foundation for future anti-churn work.

Telemetry target:

- goal id and schema version
- total, user-originated, and automatic turn counts
- consecutive automatic turns
- consecutive no-progress automatic turns
- last turn origin: user, auto, or budget wrap-up
- last continuation reason and last skipped-continuation reason
- last turn tool-call and tool-result counts where Pi exposes them; otherwise conservative best-effort counts
- whether the latest turn completed the goal through `update_goal`
- whether budget wrap-up has been sent
- last progress timestamp
- last safety-pause reason
- updated timestamp

Important implementation details:

- Keep telemetry compact and bounded; do not persist transcript excerpts, tool outputs, large summaries, or model-generated churn analyses in first landing.
- Keep telemetry generic and task-independent. Do not encode scenario-specific classifier labels from any one motivating example.
- Use telemetry for current safety caps rather than maintaining a separate incompatible counter structure.
- Future overseer modules may read this telemetry, but first landing must not spawn an overseer, run a churn-judge prompt, or add cross-session steering.
- If exact tool-result counts are not directly visible from Pi hooks, record conservative counts and document the limitation in code comments rather than faking exactness.

Rejected alternatives:

- No persisted telemetry: simpler, but makes safety counters less reload-safe and leaves future overseer work without a clean low-token input.
- Persist full transcript excerpts or summaries: too large and too close to implementing the future monitor in first landing.
- Hard-coded churn classifier taxonomy in first landing: premature and risks task-specific semantics leaking into a general goal runtime.

## Remaining design forks

- None.

## Authoritative implementation task hierarchy

This is an issue-local implementation task graph. It intentionally does not depend on any external workflow tracker.

Dependency rules:

- `G0` is the umbrella epic and is blocked by every phase anchor.
- Each phase anchor `P*` is blocked by its child implementation tasks.
- Leaf tasks `T*` carry the executable dependency graph by code.
- Implementation should complete leaf tasks first, then phase anchors, then `G0`.
- This hierarchy is authoritative for the initial feature-complete implementation; do not substitute a smaller checklist unless the issue is revised.

### Dependency map

| Code | Title | Depends on |
|---|---|---|
| G0 | G0 EPIC — Implement ISSUE-001 pi-goal extension | P1, P2, P3, P4, P5, P6 |
| P1 | P1 PHASE — Preflight and extension scaffold | T1, T2 |
| P2 | P2 PHASE — Core domain, persistence, formatting, and telemetry model | T3, T4, T5 |
| P3 | P3 PHASE — User command and Pi UI surfaces | T6, T7 |
| P4 | P4 PHASE — Model tools and goal steering prompts | T8, T9 |
| P5 | P5 PHASE — Runtime lifecycle, continuation, safety, and telemetry capture | T10, T11, T12, T13, T14 |
| P6 | P6 PHASE — Integration hardening, validation, and closeout | T15, T16, T17 |
| T1 | Implementation preflight and authority lock | none |
| T2 | Create reloadable `.pi/extensions/goal` scaffold | T1 |
| T3 | Define domain model, constants, state events, and telemetry schema | T2 |
| T4 | Implement branch-local event replay and persistence | T3 |
| T5 | Implement Codex-compatible validation and formatters | T3 |
| T6 | Implement footer status, widget sync, and resume prompt helpers | T4, T5 |
| T7 | Implement `/goal` slash command parity | T4, T5, T6 |
| T8 | Register `get_goal`, `create_goal`, and `update_goal` tools | T4, T5, T6 |
| T9 | Port continuation and budget-limit prompt builders | T5 |
| T10 | Wire session lifecycle, turn accounting, and budget transition | T4, T5, T6 |
| T11 | Implement deferred idle-safe auto-continuation engine | T9, T10 |
| T12 | Filter stale pi-goal runtime steering from model context | T9, T11 |
| T13 | Implement abort handling and runaway safety counters | T8, T10, T11 |
| T14 | Implement compact telemetry snapshots and future-overseer seams | T10, T13 |
| T15 | Integration hardening across commands, tools, lifecycle, telemetry, and branches | T7, T8, T12, T14 |
| T16 | Execute canonical manual validation checklist in Pi | T15 |
| T17 | Final closeout artifact update and handoff | T16 |

### Hierarchical implementation plan

- **G0 — Implement ISSUE-001 pi-goal extension**
  - Scope: umbrella epic for the complete project-local `pi-goal` extension at `.pi/extensions/goal/index.ts`.
  - Completion rule: close only after every phase anchor below is complete and this issue doc is updated with implementation outcome notes.
  - **P1 — Preflight and extension scaffold**
    - Summary: Confirm the implementation authority path and establish a reloadable project-local extension skeleton.
    - Children: T1, T2.
    - **T1 — Implementation preflight and authority lock**
      - Dependencies: none.
      - Scope: Before writing feature code, confirm the exact implementation target, authoritative requirements, and local validation path.
      - Implementation plan:
        - Read this issue doc and `.ai/docs/codex-goal-command-research.md` end to end.
        - Re-open the referenced Pi extension docs/types only where implementation APIs need exact signatures: commands, tools, lifecycle hooks, custom entries/messages, `ctx.ui`, `ctx.sessionManager.getBranch()`.
        - Inspect the repository for existing `.pi/`, package scripts, TypeScript config, and any lint/check command usable for extension validation.
      - Done when:
        - Implementation session knows the canonical doc path, target file path, and validation commands available in this repo.
        - Any API signature uncertainty is resolved before scaffold code is written.
    - **T2 — Create reloadable `.pi/extensions/goal` scaffold**
      - Dependencies: T1.
      - Scope: Create the project-local Pi extension shell without implementing semantics prematurely.
      - Implementation plan:
        - Create `.pi/extensions/goal/index.ts` as the first durable implementation file.
        - Import the documented Pi extension API and TypeBox utilities using patterns from Pi examples.
        - Register a placeholder `/goal` command, the three intended tool names, and lifecycle hooks behind safe no-op or clear-not-implemented behavior only long enough to validate loading.
        - Run the fastest available TypeScript syntax/load check; fix import/path issues before continuing.
      - Done when:
        - Pi can discover/reload the extension file without syntax/import errors.
        - No user-facing behavior claims completeness yet; placeholders are ready to be replaced by later tasks.
  - **P2 — Core domain, persistence, formatting, and telemetry model**
    - Summary: Build the data model, branch-local event replay, Codex-compatible formatting helpers, and compact telemetry schema that all later surfaces reuse.
    - Children: T3, T4, T5.
    - **T3 — Define domain model, constants, state events, and telemetry schema**
      - Dependencies: T2.
      - Scope: Establish canonical TypeScript types and constants used by every command, tool, lifecycle hook, UI renderer, safety counter, and future-overseer telemetry reader.
      - Implementation plan:
        - Define exact status union: `active`, `paused`, `budgetLimited`, `complete`.
        - Define `GoalState`, `PiGoalStateEvent`, `GoalTelemetrySnapshot`, turn accounting snapshot, runtime steering metadata, and safety-counter state.
        - Add constants for custom entry/message types, 4,000-char objective limit, prompt IDs, max auto-turn cap, no-progress cap, objective excerpt length, and telemetry schema version.
        - Keep telemetry generic: counts, timestamps, turn origin, tool activity, progress flags, continuation/budget/safety reasons, and latest compact state. Do not add task-specific churn classifier labels.
        - Use `crypto.randomUUID()` or the Pi-supported equivalent for fresh goal IDs on creation/replacement.
        - Keep all types local in `index.ts` unless file size later justifies helper modules.
      - Done when:
        - All later tasks can import/reuse a single authoritative state and telemetry shape.
        - No non-Codex statuses, alternate persistence types, or task-specific monitor semantics are introduced.
    - **T4 — Implement branch-local event replay and persistence**
      - Dependencies: T3.
      - Scope: Make `pi-goal-state` append-only custom entries the source of truth for branch-local goal state and compact telemetry snapshots.
      - Implementation plan:
        - Implement in-memory current-goal state plus a robust `replayGoalState(ctx)` over `ctx.sessionManager.getBranch()`.
        - Accept only version-1 `pi-goal-state` custom entries; ignore malformed/future events without crashing extension startup.
        - Implement `persistGoalEvent(ctx, event)` using `pi.appendEntry("pi-goal-state", event)` with full resulting goal snapshots on non-clear events and telemetry snapshots whenever available.
        - Implement shared mutation helpers for set/update/account/clear that guard stale `goalId`s and always update memory after persistence succeeds.
        - Ensure clear events set current goal to `null` even when stale ids are absent, matching branch-local user intent.
      - Done when:
        - Reload/session tree reconstruction uses current branch only, never abandoned branches from `getEntries()`.
        - Hot reload can recover all state and compact telemetry needed by later command/tool/UI/runtime tasks.
    - **T5 — Implement Codex-compatible validation and formatters**
      - Dependencies: T3.
      - Scope: Centralize all display, prompt-safety, and validation helpers so commands/tools/UI do not diverge.
      - Implementation plan:
        - Implement objective trimming and validation: non-empty, max 4,000 characters, and exact long-instructions-in-file hint from Codex research.
        - Implement XML escaping for untrusted objective text used in continuation and budget-limit prompts.
        - Implement elapsed formatting matching Codex examples: `59s`, `1m`, `1h 30m`, `2h`, `1d 0h 0m`, `2d 23h 42m`.
        - Implement compact token formatting compatible with Pi/Codex status display expectations.
        - Implement status labels, footer usage suffixes, summary lines, command hints, objective excerpting, and widget line builders.
      - Done when:
        - All user-visible command summaries, footer labels, widget text, and prompt wrappers use shared helpers.
        - Formatting examples in the canonical issue doc are reproducible by helper-level checks or quick local assertions.
  - **P3 — User command and Pi UI surfaces**
    - Summary: Deliver the human-facing `/goal` command, footer status, compact widget, and resume prompt behavior.
    - Children: T6, T7.
    - **T6 — Implement footer status, widget sync, and resume prompt helpers**
      - Dependencies: T4, T5.
      - Scope: Wire Pi-native UI surfaces to the current goal state without yet depending on full command/runtime behavior.
      - Implementation plan:
        - Implement `syncGoalUi(ctx)` to set or clear `ctx.ui.setStatus("pi-goal", ...)` for every goal state.
        - Implement `ctx.ui.setWidget(...)` content with objective excerpt, status, elapsed/tokens/budget, and current command hints.
        - Implement user notices for goal set/updated/cleared/paused/resumed/budget-limited/safety-paused using documented Pi notification/message APIs.
        - Implement a reusable paused-goal resume prompt helper that offers `Resume goal` and `Leave paused` when `ctx.ui.interactive` is true.
        - Ensure UI updates are idempotent and safe when called after reload or state replay.
      - Done when:
        - Any state mutation can call one UI sync function and get Codex-like footer plus compact widget output.
        - No custom full TUI component is introduced.
    - **T7 — Implement `/goal` slash command parity**
      - Dependencies: T4, T5, T6.
      - Scope: Deliver the complete user command behavior: bare summary, create/replace, pause, resume, and clear.
      - Implementation plan:
        - Parse bare `/goal`, `/goal pause`, `/goal resume`, `/goal clear`, and `/goal <objective>` exactly within Pi's command registration API.
        - For bare `/goal`, show usage plus example/no-goal hint when absent, or Codex-like summary when a goal exists.
        - For objective input, trim and validate through T5 helpers; create a new active goal with zero usage and fresh `goalId` when none exists.
        - When a goal exists, require replacement confirmation in interactive UI; in non-interactive mode fail conservatively with a clear message rather than silently replacing.
        - Implement pause/resume/clear mutations with persistence, UI sync, user feedback, telemetry reset/update, and `/goal resume` safety-counter reset.
        - Schedule continuation after new goal creation or resume only through the deferred/idle-safe scheduler added later; leave a hook point if T11 is not complete yet.
      - Done when:
        - Manual command use can create, inspect, pause, resume, and clear goals with branch-local persistence.
        - Replacement semantics match Codex: any existing goal requires confirmation and replacement creates a fresh goal id.
  - **P4 — Model tools and goal steering prompts**
    - Summary: Expose Codex-like goal tools to the model and port continuation/budget-limit prompt builders safely.
    - Children: T8, T9.
    - **T8 — Register `get_goal`, `create_goal`, and `update_goal` tools**
      - Dependencies: T4, T5, T6.
      - Scope: Expose model-facing goal tools with Codex-like schemas, restrictions, structured results, and progress telemetry hooks.
      - Implementation plan:
        - Register exact tool names `get_goal`, `create_goal`, and `update_goal` unless an actual Pi collision is discovered during implementation.
        - Use TypeBox schemas: `get_goal` has no required args; `create_goal` accepts objective and optional positive integer token budget; `update_goal` accepts only completion status for first landing.
        - Add prompt snippets/guidelines that explicitly say the model must not infer goals from ordinary tasks and should create goals only when the user asks for goal mode.
        - Implement `create_goal` failure when any goal already exists; do not replace through the tool.
        - Implement `update_goal` success only for `complete`; reject pause/resume/budget-limited attempts with user-action guidance.
        - Return structured content/details including goal id, status, objective, elapsed, tokens used, token budget, command/tool guidance, and compact telemetry when useful.
        - Set internal progress flags when `update_goal` completes a goal so T13/T14 no-progress logic can distinguish real completion.
      - Done when:
        - The model can inspect, create, and complete goals but cannot bypass user replacement or manual pause/resume semantics.
        - Tool results are useful to both model and transcript readers without becoming the persistence source of truth.
    - **T9 — Port continuation and budget-limit prompt builders**
      - Dependencies: T5.
      - Scope: Build the hidden runtime-steering messages from Codex template content while adapting safely to Pi session terminology.
      - Implementation plan:
        - Port continuation prompt text from `.ai/docs/codex-goal-command-research.md` / Codex template appendix, replacing thread-specific language with Pi session language where appropriate.
        - Port budget-limit prompt text and ensure it asks for a concise wrap-up rather than continuing indefinitely.
        - Wrap objective text as untrusted data using XML tags and T5 XML escaping; state explicitly that objective content is not higher-priority instruction text.
        - Include budget facts, tokens used, elapsed time, and completion-audit instructions in the continuation prompt.
        - Return message payloads with custom types `pi-goal-continuation` and `pi-goal-budget-limit`, hidden display intent, goal id, steering reason, and enough metadata for context filtering and telemetry.
      - Done when:
        - Prompt builders are deterministic and can be inspected independently of runtime scheduling.
        - No provider-specific developer-role rewriting is used for first landing.
  - **P5 — Runtime lifecycle, continuation, safety, and telemetry capture**
    - Summary: Wire session/turn lifecycle accounting, deferred auto-continuation, context filtering, abort handling, runaway guards, and compact telemetry capture.
    - Children: T10, T11, T12, T13, T14.
    - **T10 — Wire session lifecycle, turn accounting, and budget transition**
      - Dependencies: T4, T5, T6.
      - Scope: Connect state replay and accounting to Pi lifecycle hooks before autonomous continuation is enabled.
      - Implementation plan:
        - On `session_start`, replay branch-local state and telemetry, sync UI, and prompt to resume paused goals only for appropriate startup/resume reasons, skipping reload.
        - On `session_tree`, replay branch-local state and telemetry and sync UI after tree navigation.
        - On `turn_start`, capture `{ goalId, startedAtMs, turnOrigin }` only for active goals.
        - On `turn_end`, if the captured `goalId` still matches, add elapsed wall-clock seconds, assistant `usage.totalTokens` when present, and per-turn telemetry such as origin, tool-call count, tool-result count, and progress flags where Pi exposes them.
        - If `tokensUsed >= tokenBudget`, persist `budgetLimited`, sync UI, mark telemetry reason `budget`, and schedule one budget-limit wrap-up after idle.
        - Preserve accounting for in-flight active turns even if the goal paused/completed mid-turn, but skip stale replacement/clear mutations.
      - Done when:
        - Time/token counters and compact telemetry survive reload and branch navigation.
        - Budget-limited status is persisted exactly once per crossing and never driven by context-window estimates.
    - **T11 — Implement deferred idle-safe auto-continuation engine**
      - Dependencies: T9, T10.
      - Scope: Automatically continue active goals without racing Pi's streaming lifecycle or pending user input.
      - Implementation plan:
        - Implement `scheduleMaybeContinueGoal(ctx, reason)` using a deferred callback from `agent_end`, `/goal resume`, and new-goal creation.
        - Implement `maybeContinueGoal(ctx)` to re-check active goal, idle state, no pending messages, budget status, and safety counters immediately before sending.
        - Use hidden custom messages and `pi.sendMessage(..., { triggerTurn: true })` for continuation and budget-limit wrap-up prompts.
        - Never call trigger-turn synchronously inside `agent_end`; Pi is not reliably idle until listeners settle.
        - Update telemetry before/after scheduling so future monitors can distinguish user turns, automatic continuations, skipped continuations, and budget wrap-up turns.
        - Ensure budget-limit wrap-up is sent once and active-goal continuation is not scheduled for paused, complete, cleared, or budget-limited goals.
      - Done when:
        - Active goals continue when idle and stop when user input, pending messages, terminal status, or safety constraints say not to continue.
        - Continuation messages are hidden from the TUI but persisted for auditability.
    - **T12 — Filter stale pi-goal runtime steering from model context**
      - Dependencies: T9, T11.
      - Scope: Prevent repeated hidden continuation/budget messages from bloating or confusing future model contexts.
      - Implementation plan:
        - Register the `context` hook and identify custom messages with types `pi-goal-continuation` and `pi-goal-budget-limit`.
        - For model context, keep only the latest active runtime steering message that is still relevant to the current goal id and steering kind.
        - Drop stale older pi-goal steering messages while preserving ordinary user/assistant/tool/custom messages from other features.
        - Ensure filtering does not mutate persisted transcript entries; it only rewrites the provider-bound context payload.
        - Document in comments why Pi's custom messages become user-role LLM messages and why prompt text carries its own safety framing.
      - Done when:
        - Long-running goals do not accumulate old continuation prompts in model context.
        - Context filtering is scoped narrowly enough not to interfere with other Pi extensions or future overseer steering types.
    - **T13 — Implement abort handling and runaway safety counters**
      - Dependencies: T8, T10, T11.
      - Scope: Fail safe when automatic goal pursuit is interrupted or stops making progress.
      - Implementation plan:
        - Detect assistant `stopReason === "aborted"` where Pi exposes it; pause active goal, persist reason `abort`, sync UI, update telemetry, and do not continue.
        - Track consecutive automatic continuation turns since last explicit user goal command/resume.
        - Track no-progress automatic turns: auto continuation with no tool results and no successful `update_goal` completion.
        - When max auto-turn or no-progress cap is reached, pause the goal, persist a normal paused status, update telemetry with generic safety reason, and emit visible recovery notice telling the user to run `/goal resume`.
        - Reset counters on `/goal resume`, new goal creation/replacement, and meaningful manual goal command activity.
        - Avoid adding any new status such as `safetyPaused`; preserve Codex status parity.
      - Done when:
        - Aborted turns and runaway loops stop cleanly without transcript spam or invented statuses.
        - Users have a visible, simple recovery path: `/goal resume`.
    - **T14 — Implement compact telemetry snapshots and future-overseer seams**
      - Dependencies: T10, T13.
      - Scope: Make first-landing telemetry complete enough for current safety behavior and future generic churn monitors, without implementing the monitor.
      - Implementation plan:
        - Maintain a `GoalTelemetrySnapshot` in memory and persist it on goal state events that change counters, turn summaries, or safety state.
        - Include only generic, task-independent fields: schema version, goal id, total/user/auto turn counts, consecutive auto turns, consecutive no-progress turns, last turn origin, last continuation reason, last skip reason, tool call/result counts, goal-tool completion flag, budget-wrap-up sent flag, last progress timestamp, last safety-pause reason, and updated timestamp.
        - Do not add domain-specific churn classifier names or scenario-specific categories; future classifier evidence can mention specifics outside the stable schema.
        - Keep telemetry compact and bounded; do not persist full transcript excerpts, tool outputs, or large summaries in first landing.
        - Add clear comments that future overseer modules may read this telemetry but are not part of first-landing behavior.
      - Done when:
        - Current safety caps use the same telemetry shape a future monitor can read.
        - The telemetry schema is documented in code and in this issue without coupling `pi-goal` to any external workflow tracker or overseer implementation.
  - **P6 — Integration hardening, validation, and closeout**
    - Summary: Exercise the whole feature in Pi, harden edge cases, validate telemetry, and update durable handoff artifacts.
    - Children: T15, T16, T17.
    - **T15 — Integration hardening across commands, tools, lifecycle, telemetry, and branches**
      - Dependencies: T7, T8, T12, T14.
      - Scope: Exercise the whole implementation as one runtime and fix edge cases before manual acceptance validation.
      - Implementation plan:
        - Run TypeScript syntax/lint/check commands available in the repo or Pi extension environment.
        - Reload the extension and verify command/tool registration does not collide with existing Pi names.
        - Review all mutation paths for persistence-before-UI ordering, stale `goalId` guards, branch replay correctness, telemetry update consistency, and malformed event tolerance.
        - Verify non-interactive replacement behavior is conservative and documented in user-facing messages.
        - Stress edge cases: clear during queued continuation, replace during delayed accounting, budget crossing after completion, reload during paused/budget-limited states, stale hidden messages, and telemetry replay after branch navigation.
        - Split helper files only if `index.ts` has become unmaintainable; preserve the initial cohesive target otherwise.
      - Done when:
        - The feature behaves as a cohesive runtime rather than separate command/tool fragments.
        - Known race, reload, and telemetry consistency cases are handled or explicitly documented in comments/user messages.
    - **T16 — Execute canonical manual validation checklist in Pi**
      - Dependencies: T15.
      - Scope: Run the issue's acceptance scenarios in a live Pi session and capture concise results.
      - Implementation plan:
        - Start Pi with the project-local extension, run `/reload`, and confirm `/goal` appears as an extension command.
        - Validate no-goal usage, goal creation, bare summary, pause, resume, clear, and replacement confirmation.
        - Validate session reload/tree restoration and paused-goal resume prompt when UI is available.
        - Have the model call `create_goal`, `get_goal`, and `update_goal({status:"complete"})`; confirm restrictions and structured results.
        - Exercise budgeted goal behavior until `budgetLimited` and one wrap-up prompt occur.
        - Trigger or observe an aborted assistant response if feasible and confirm active goal pauses.
        - Inspect persisted `pi-goal-state` entries on the active branch and confirm compact telemetry fields update without large transcript payloads.
        - Record validation notes in the issue doc if any behavior intentionally differs from the plan.
      - Done when:
        - Every acceptance criterion in the issue has a live validation result or a documented, owner-approved exception.
        - No unresolved design fork is reopened during validation.
    - **T17 — Final closeout artifact update and handoff**
      - Dependencies: T16.
      - Scope: Keep durable planning and implementation artifacts aligned after implementation and validation.
      - Implementation plan:
        - Update this issue doc with implementation outcome notes, actual file list, and any accepted deviations.
        - Update `.ai/docs/pi-goal-future-churn-overseer.md` only if implementation changes the telemetry seam relevant to future overseer work.
        - Keep future overseer/churn-controller work deferred unless the user explicitly opens a new issue for it.
      - Done when:
        - The issue doc and implementation tell the same final story.
        - A future maintainer can resume from durable artifacts without redoing the research/design decisions.

## Initial implementation surfaces

Expected source layout for the first implementation:

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

Keep `index.ts` as a small entrypoint. Preserve the module boundaries described in the task hierarchy and `.pi/extensions/goal/.sentrux/rules.toml`.

## Acceptance criteria

- `/goal` bare command shows `Usage: /goal <objective>` and an example hint when no goal exists.
- `/goal` bare command shows a Codex-like summary when a goal exists: status, objective, time used, tokens used, optional token budget, and status-appropriate command hints.
- `/goal <objective>` trims and validates objective text: non-empty, max 4,000 characters, and long-instructions-in-file hint on overflow.
- `/goal <objective>` creates a new active goal when no goal exists.
- `/goal <objective>` confirms before replacing an existing goal; replacement resets usage and creates a new `goalId`.
- `/goal pause`, `/goal resume`, and `/goal clear` update state, persistence, and UI.
- Session start with an existing paused goal and UI available prompts `Resume goal` vs `Leave paused`, excluding `/reload`.
- Goal state is restored from current session branch on `session_start` and `session_tree`.
- Goal state values are exactly `active`, `paused`, `budgetLimited`, and `complete`.
- `get_goal`, `create_goal`, and `update_goal` tools exist and return structured content/details.
- `create_goal` validates objective/budget, fails if a goal exists, and instructs the model not to infer goals from ordinary tasks.
- `update_goal` only accepts `complete` and fails for pause/resume/budget-limited attempts.
- Active goals auto-continue when the agent is idle, no pending messages exist, and local safety caps allow continuation.
- Continuation prompt is ported from Codex, includes untrusted objective wrapping, budget facts, and completion audit instructions.
- Budget-limit prompt is ported from Codex and is sent once when token budget is reached.
- Active goals pause on aborted assistant stop reason.
- Compact `GoalTelemetrySnapshot` data is maintained in memory and persisted in relevant `pi-goal-state` events.
- Telemetry fields are generic and bounded; they include counters/reasons/progress flags, not transcript excerpts, tool outputs, model-generated analyses, or task-specific churn classifiers.
- Current safety counters use the telemetry shape that future overseer modules can read.
- Footer status matches Codex wording exactly, including usage suffixes.
- Elapsed-time formatting matches Codex examples: `59s`, `1m`, `1h 30m`, `2h`, `1d 0h 0m`, `2d 23h 42m`.
- Compact widget shows status, objective excerpt, usage, and command hints while a goal exists.
- The extension can be hot-reloaded without losing state already stored in the pi session.

## Implementation checklist

1. Create `.pi/extensions/goal/index.ts` with TypeScript-only pi extension code.
2. Define goal types, state-event types, constants, status enum, customType names, max objective chars, and safety caps.
3. Implement state replay from `ctx.sessionManager.getBranch()` and persistence via `pi.appendEntry("pi-goal-state", event)`.
4. Implement `GoalTelemetrySnapshot` creation, replay, mutation helpers, and compact persistence within relevant `pi-goal-state` events.
5. Implement formatters: XML escaping, elapsed time, compact tokens, footer label, summary lines, widget lines, command hints.
6. Register `/goal` command with bare/objective/pause/resume/clear parsing.
7. Add replace confirmation via `ctx.ui.confirm()` when UI is available; use conservative no-replace behavior or clear error in non-interactive mode.
8. Register `get_goal`, `create_goal`, and `update_goal` tools with TypeBox schemas and Codex-like prompt guidance.
9. Implement continuation and budget-limit prompt builders from Codex template text.
10. Add lifecycle hooks: `session_start`, `session_tree`, `turn_start`, `turn_end`, `agent_end`, `tool_call`, and `context`.
11. In `context`, filter stale older pi-goal continuation/budget custom messages while preserving the latest runtime steering message.
12. In `agent_end`, schedule deferred `maybeContinueGoal(ctx)` and re-check idle/pending/safety before sending hidden custom messages.
13. Update telemetry before/after turn accounting, continuation scheduling/skips, budget wrap-up, abort pause, no-progress pause, and goal completion.
14. Update UI status/widget after every state mutation and after session restore.
15. Pause on abort and on safety-cap reach; notify the user how to continue with `/goal resume`.
16. Validate with local extension reload and manual command/tool scenarios before considering implementation complete.

## Validation checklist

- Start pi with the project-local extension, run `/reload`, and confirm `/goal` appears as an extension command.
- Run `/goal` with no goal and confirm usage/hint.
- Run `/goal improve benchmark coverage` and confirm active status/widget.
- Run `/goal` again and confirm summary lines and command hints.
- Run `/goal pause`, reload, and confirm paused status restores.
- Resume the session with a paused goal and confirm resume prompt appears when UI is available.
- Run `/goal resume` and confirm automatic continuation is scheduled only after idle.
- Run `/goal clear` and confirm status/widget clear.
- Have the model call `create_goal`, `get_goal`, and `update_goal({status:"complete"})` and confirm tool restrictions/results.
- Create a budgeted goal through `create_goal`, run turns until usage crosses budget, and confirm `budgetLimited` plus wrap-up prompt.
- Trigger/observe an aborted assistant response and confirm active goal pauses.
- Inspect persisted `pi-goal-state` custom entries and confirm telemetry snapshots are compact, generic, and reload-safe.
- Use `/tree` or reload after state changes and confirm branch-local state and telemetry reconstruction.

## Idea log for future extensions

- Visual goal dashboard widget with status, objective excerpt, elapsed time, tokens, last action, and next action.
- Goal event timeline rendered as custom messages.
- Multiple named goals with `/goal list`, `/goal switch`, and `/goal archive`.
- Subgoal checklist with model/tool-updatable progress and manual user controls.
- Goal-aware compaction summary that preserves objective, status, audit checklist, evidence, and next action.
- Goal history and export command.
- System-input queue for periodic progress summaries or external events.
- Per-goal safety policy: max turns, max elapsed time, max tool calls, required checkpoints.
- Goal templates for common workflows such as research, green-loop implementation, triage, cleanup, and release prep.
- Richer continuation heuristics that pause when no files/tools changed for N turns.
- Dedicated `/goal audit` command that asks the model to run the Codex-style completion audit without continuing indefinitely.
- Future churn overseer/controller described in `.ai/docs/pi-goal-future-churn-overseer.md`, implemented as a separate issue/module using the first-landing telemetry seam.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,target_repo,next_session,goal}:
  "ISSUE-001","execution-ready","/Users/bryan/dev/personal/experiments/pi-goals","implementation-focused pi extension build","feature-complete Codex-style /goal port as pi-goal extension"

readiness{open_forks,design_locked,implementation_choice_left_to_worker}:
  0,true,false

feature_memory[9]{id,fact}:
  "fm1","Codex /goal combines slash command, persisted state, tools, accounting, auto-continuation, budget steering, and footer status"
  "fm2","Pi extensions provide registerCommand, registerTool, lifecycle hooks, appendEntry, hidden custom messages, status, and widgets"
  "fm3","Pi custom messages are display-controllable but convert to user-role LLM messages"
  "fm4","Agent end fires before pi is idle, so continuation must be deferred and rechecked"
  "fm5","Pi assistant message usage is the best token-budget source; context usage is not budget consumption"
  "fm6","Branch-local state must replay from getBranch rather than getEntries"
  "fm7","First durable implementation target is .pi/extensions/goal/index.ts"
  "fm8","First landing includes compact task-independent telemetry for safety and future overseer seams"
  "fm9","Future churn semantics must be generic; task details belong in evidence not stable classifier names"

locked_requirements[14]{id,requirement}:
  "lr1","implement /goal bare/objective/pause/resume/clear"
  "lr2","validate objective non-empty and <=4000 characters with file hint"
  "lr3","persist one branch-local goal with active paused budgetLimited complete statuses"
  "lr4","confirm replacement and reset usage with a fresh goalId"
  "lr5","prompt to resume existing paused goals on session start except reload"
  "lr6","register get_goal create_goal update_goal with Codex-like restrictions"
  "lr7","account elapsed wall-clock time per active turn"
  "lr8","account tokens from assistant usage.totalTokens per turn"
  "lr9","auto-continue active goals only when idle, no pending messages, and safety permits"
  "lr10","port Codex continuation and budget-limit prompts with untrusted objective wrapping"
  "lr11","show exact Codex footer labels plus compact pi widget"
  "lr12","pause on abort or safety cap without adding non-Codex statuses"
  "lr13","persist compact GoalTelemetrySnapshot data in relevant pi-goal-state events"
  "lr14","keep telemetry bounded generic and free of transcript payloads or task-specific churn classifiers"

design_decisions[8]{id,choice}:
  "d1","project-local .pi/extensions/goal/index.ts"
  "d2","enabled by extension presence, no separate feature flag"
  "d3","hidden custom messages for continuation and budget-limit steering"
  "d4","assistant usage.totalTokens plus wall-clock accounting"
  "d5","append-only pi-goal-state custom entries replayed from current branch"
  "d6","footer status plus compact widget, no full custom component"
  "d7","safety caps pause and notify, /goal resume resets counters"
  "d8","compact generic telemetry is first-landing scope; overseer behavior is deferred"

implementation_surfaces[7]{surface,purpose}:
  "command","register /goal and parse bare objective pause resume clear"
  "tools","register get_goal create_goal update_goal with TypeBox schemas"
  "state","replay and persist pi-goal-state custom entries"
  "telemetry","track generic counters reasons progress flags and bounded snapshots"
  "lifecycle","session_start session_tree turn_start turn_end agent_end tool_call context"
  "ui","setStatus and setWidget with Codex-like labels and hints"
  "prompts","build continuation and budget-limit prompts from Codex templates"

validation_checks[13]{id,check}:
  "v1","/goal with no goal shows usage and example"
  "v2","/goal objective creates active goal and UI status"
  "v3","replacement confirms and creates new goalId"
  "v4","pause resume clear mutate state and UI"
  "v5","reload and tree navigation restore branch-local goal state"
  "v6","paused session start prompts resume vs leave paused"
  "v7","goal tools enforce create/update restrictions"
  "v8","auto-continuation waits for idle and no pending messages"
  "v9","budget crossing sets budgetLimited and sends wrap-up prompt once"
  "v10","abort pauses active goal"
  "v11","elapsed and token formatting match locked examples"
  "v12","safety caps pause with visible recovery notice"
  "v13","telemetry snapshots are compact generic persisted and replayed from branch state"

deferred_ideas[7]{id,idea}:
  "di1","multiple named goals"
  "di2","subgoal checklist and dependency graph"
  "di3","goal event timeline custom renderer"
  "di4","goal-aware compaction summary"
  "di5","goal templates for common workflows"
  "di6","dedicated /goal audit command"
  "di7","separate future churn overseer/controller using first-landing telemetry seam"
```
