# ISSUE-044 — Rewrite post-completion context management around safe hooks

Status: implementation-ready
Priority: P1
Owner: pi-goal automation
Created: 2026-05-14
Updated: 2026-05-14
Next best session: execute-issue-stack
Next best session rationale: Architecture, implementation surfaces, patch order, validation order, rollout flag contract, and required proofs are locked. The next session can implement ISSUE-044 without choosing architecture, ownership, or proof shape.
Target bucket: open
Issue kind: feature
Target repo roots:
- `~/dev/personal/experiments/pi-goals`
Parent issue: none
Depends on: none
Related:
- `.ai/issues/open/ISSUE-043-per-goal-post-completion-context-reset.md`
- `.ai/docs/issue-workflow/ISSUE-043-per-goal-post-completion-context-reset/`
- `.ai/docs/pi-goals-live-probe-testing.md`
- `.pi/extensions/goal/context-reset.ts`
- `.pi/extensions/goal/lifecycle.ts`
- `.pi/extensions/goal/continuation.ts`
- `.pi/extensions/goal/tools.ts`
- `.pi/extensions/goal/queue-tools.ts`
- `.pi/extensions/goal/command.ts`
- `.pi/extensions/goal/templates.ts`

## Goal

Rewrite pi-goals post-completion context management as an isolated, flagged, best-effort post-completion action/hook subsystem while preserving guaranteed goal/queue continuation in expected auto-continuation scenarios.

The rewrite should treat the current ISSUE-043 implementation as concrete research and anti-pattern evidence, not as the architecture to patch around. The desired design starts from the invariant that core goal processing and queue handoff are the primary workflow; context reset is an optional post-completion effect that must be visible on failure but must not be able to strand queued work.

## Transcript artifacts

Execution-readiness artifacts:

- Request intake: `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/raw/commands.log`

## Problem/context

ISSUE-043 successfully landed per-goal post-completion context reset, but post-implementation testing and discussion exposed an architectural mismatch:

- context reset is implemented as a single-purpose policy (`postCompletionContext`) plus reset-specific state fields;
- prose directives are parsed after template expansion in some paths, so template invocations can lose `and summarize context` / `and clear context` intent;
- model tools have no structured post-completion parameter, forcing agents to smuggle control behavior through objective prose;
- reset failure currently gates queue handoff and can strand queued work;
- lifecycle, tool, queue, and compaction paths have inconsistent reset/handoff decisions;
- future lifecycle hooks would likely add more special cases unless this becomes a generic post-completion action boundary.

The desired rewrite should make continuation the protected core invariant and isolate context reset behind a safe, feature-flagged action runner.

## Why it matters

Goal queues are only trustworthy if queued work continues predictably. Context reset is valuable for context hygiene, but it is a secondary effect. If reset bugs, template parsing bugs, missing command-context capability, or live tree-navigation failures can prevent queue handoff, then the feature makes the core goal queue less reliable.

The rewrite should make the following user expectation true:

> A post-completion context reset may fail and warn me, but it must not silently prevent the next queued goal from being processed in normal auto-continuation cases.

## Desired behavior

### Ingress normalization

All goal creation/start/enqueue paths should normalize into one canonical intent model before mutating goal or queue state:

- `/goal <objective>`
- `/goal <template> ...`
- `/goal queue <objective-or-template>`
- `/goal queue` multi-item blocks
- `create_goal`
- `create_goal_from_template`
- `enqueue_goal`
- `start_queued_goal`

Trailing prose directives remain supported, but directive extraction happens against the raw invocation/queue item before template expansion can move `{{args}}` into the middle of the final objective.

### Structured tool API

Model tools should expose structured post-completion action input rather than requiring objective-prose smuggling. The exact schema should be locked during implementation readiness, but the preferred internal shape is action-based:

```ts
type PostCompletionActionSpec =
  | { type: "context.reset"; mode: "clear" | "summarize" };
```

A temporary compatibility field such as `post_completion_context` may be accepted if normalized immediately into the action model, but the canonical internal model should be action-based.

Conflict handling must be explicit:

- same prose + structured action is accepted/idempotent;
- conflicting prose vs structured action is rejected actionably;
- unsupported action types are rejected actionably;
- missing reset capability is an action-runner warning/failure, not a reason to skip continuation.

### Post-completion action model

Goal and queued-goal state should represent post-completion behavior as actions, not a single context reset field:

```ts
type PostCompletionActionState = PostCompletionActionSpec & {
  id: string;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  failure?: string;
  completedAt?: number;
};
```

Existing ISSUE-043 state must replay safely. Implementation may either migrate old fields into action states during replay or support legacy fields behind a compatibility adapter until older state naturally disappears.

### Continuation ticket / outbox-style handoff

When a goal reaches a terminal state, the core lifecycle should decide the expected continuation before optional post-completion actions run:

```ts
type ContinuationTicket =
  | { kind: "queueHandoff"; reason: "goal-complete" | "goal-budget-limited"; goalId: string; queueId: string }
  | { kind: "continueGoal"; goalId: string; reason: ContinuationReason }
  | { kind: "none"; reason: string };
```

The ticket may be in-process if implementation research proves existing compaction/retry recovery remains sufficient, but the design must behave like an outbox command:

1. decide/capture continuation from stable goal/queue state;
2. run optional post-completion actions safely;
3. revalidate the ticket by goal id and queue id;
4. dispatch the ticket unless it is stale for normal state-machine reasons.

Action failure must never be the reason the ticket is lost.

### Safe action runner boundary

Context reset should run through a `PostCompletionActionRunner` port. The Pi `navigateTree` behavior is an adapter, not core lifecycle logic.

The runner contract:

- returns typed results;
- catches unexpected exceptions and converts them to failed action results;
- can enforce a timeout if needed;
- updates action state/telemetry/UI;
- never throws through the lifecycle orchestrator;
- never directly decides queue continuation.

### Feature flag / strategy boundary

Post-completion actions must be gated behind a feature flag or equivalent runtime strategy selector. The flag should be selected at composition/runner construction, not scattered through lifecycle code.

Required behavior:

- disabled flag selects a no-op/skipping runner;
- disabled/skipped actions do not block queue continuation;
- context reset can be independently disabled if future action types exist;
- user-visible messaging should make disabled/skipped action status inspectable enough for debugging.

### Context reset semantics to preserve

The rewrite should preserve the useful semantics from ISSUE-043:

- reset anchor recorded after goal start;
- queued-goal reset anchor recorded after dequeue/start, not while still queued;
- same-session tree navigation, not new sessions;
- clear mode navigates with no completed-branch summary;
- summarize mode navigates with bounded goal-specific instructions;
- replay/repaired state after tree navigation;
- actionable warnings when reset cannot be performed.

The key change is failure semantics: reset failure is visible but non-blocking for expected queue continuation.

## Grounded research findings

See the grounded research artifact for command output and source evidence:

- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/02-grounded-research.md`

Key code facts:

```toon
toon.version: 1
current_facts[10]{id,surface,fact}:
  "cf1","state","GoalState has reset-specific fields: postCompletionContext, contextResetAnchorEntryId, contextResetStatus, failure/completedAt"
  "cf2","queue","QueuedGoal mixes objective text, optional template metadata, budgets, and postCompletionContext"
  "cf3","parser","parsePostCompletionContextDirective only recognizes final trailing and summarize/clear context phrases"
  "cf4","templates","template args are interpolated before final objective parsing, so raw invocation directives can be relocated"
  "cf5","tools","create_goal/create_goal_from_template/enqueue_goal schemas lack structured post-completion action fields"
  "cf6","lifecycle","turn_end and agent_end return on reset failure before queue handoff"
  "cf7","ui","failure warning explicitly says queued goal handoff was blocked"
  "cf8","pending check","needsPostCompletionContextReset treats failed/non-done reset as still needing reset"
  "cf9","compaction","continuation.ts can prequeue/fallback send queue handoff without consulting reset pending state"
  "cf10","flags","no post-completion action/context-reset feature flag exists today"
```

Structural sensor:

```toon
sentrux[2]{command,result}:
  "sentrux gate .pi/extensions/goal","pass; quality 6223 -> 6223; coupling 0.14; cycles 0; god files 0"
  "sentrux check .pi/extensions/goal","pass; 33 rules checked"
```

Interpretation: the codebase is structurally healthy enough for a bounded architecture refactor. The issue is not global coupling/cycles; it is that the post-completion context behavior crosses the wrong boundaries.

## Locked design choices

See design-lock artifact:

- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/03-design-lock.md`

Locked choices:

```toon
toon.version: 1
locked_choices[6]{id,choice,consequence}:
  "lc1","Functional Core, Imperative Shell","decision logic for intent/action/ticket is pure; Pi operations stay in adapters"
  "lc2","GoalIntent anti-corruption layer","slash/tool/template/queue ingress converges before domain mutation"
  "lc3","generic post-completion actions","context reset is first action type, not a bespoke lifecycle field pattern"
  "lc4","ContinuationTicket command/outbox model","queue handoff is captured before optional actions and revalidated before dispatch"
  "lc5","Ports and Adapters + Bulkhead","context reset adapter failure is contained as typed result/UI telemetry"
  "lc6","feature flag + strategy","post-completion actions can be disabled by selecting a no-op runner at composition boundary"
```

Rejected alternatives:

```toon
rejected[5]{id,alternative,reason}:
  "r1","keep reset failure as queue-handoff blocker","violates core continuation guarantee"
  "r2","only add post_completion_context tool param","does not solve lifecycle special-casing or future hooks"
  "r3","parse summarize/clear anywhere in objective","too high false-positive risk"
  "r4","continue parsing only after template expansion","known broken for args embedded mid-template"
  "r5","scatter flag checks through lifecycle","creates conditional sprawl instead of an isolated strategy boundary"
```

No meaningful design fork remains open for execution. Implementation readiness may choose exact file names, flag source, and whether the continuation ticket needs durable persistence, but those are implementation details constrained by the locked architecture.

## Target architecture

### Module ownership

Expected new or heavily refactored surfaces:

```toon
toon.version: 1
module_map[8]{module,ownership}:
  "goal-intent.ts","normalize slash/tool/template/queue inputs into GoalIntent and action specs"
  "post-completion-actions.ts","types, action state helpers, safe runner orchestration"
  "continuation-ticket.ts","pure decide/revalidate/dispatch ticket helpers for queue/goal continuation"
  "context-reset.ts","adapter for context.reset action, tree navigation, anchor capture/repair only"
  "command.ts","thin slash ingress, delegates intent parsing and goal/queue mutation"
  "tools.ts","thin model-tool ingress, exposes structured action params, delegates intent parsing"
  "queue-tools.ts","thin queue tool ingress/start/dequeue, uses queued intent/action metadata"
  "lifecycle.ts","terminal workflow orchestration only: decide ticket, run safe actions, dispatch ticket"
```

### Target flow

```text
slash/tool/queue input
  -> GoalIntent anti-corruption layer
  -> template directive extraction before template expansion
  -> direct/template objective resolution
  -> GoalState/QueuedGoal with postCompletionActions
  -> terminal lifecycle
  -> decide ContinuationTicket from goal+queue
  -> run PostCompletionActionRunner safely behind flag/strategy
  -> revalidate ticket
  -> dispatch queue handoff / continuation / noop
```

## Execution checklist

This checklist is execution planning, not a file-by-file implementation plan. The next `implementation-ready-issue` pass should turn it into exact patch/proof order.

- [ ] Run `sentrux gate --save .pi/extensions/goal` before substantial implementation.
- [ ] Introduce shared intent/action types in `types.ts` or dedicated modules without TypeScript escape-hatch casts.
- [ ] Add a `GoalIntent` normalization layer used by command/tool/queue/template paths.
- [ ] Parse trailing prose directives from raw direct/template/queue input before template expansion; keep trailing-only grammar for prose.
- [ ] Add structured model-tool parameters for post-completion actions, normalizing into action specs.
- [ ] Define conflict handling between prose directives and structured params.
- [ ] Replace or bridge `postCompletionContext` with `postCompletionActions`/action state while preserving legacy replay.
- [ ] Refactor `context-reset.ts` into a context-reset action adapter; keep anchor/tree/repair details there.
- [ ] Add a safe post-completion action runner that returns typed results and never throws through lifecycle.
- [ ] Add feature flag/strategy selection for action runner and context reset runner.
- [ ] Add continuation-ticket decision/revalidation/dispatch helpers.
- [ ] Refactor `lifecycle.ts`, `tools.ts`, `queue-tools.ts`, and `continuation.ts` so handoff decisions use the continuation-ticket path instead of ad hoc reset gates.
- [ ] Invert old fail-closed tests: action failure warns/records state but expected queue handoff still occurs.
- [ ] Update README and tool descriptions to explain trailing prose directives, structured params, template semantics, feature flag behavior, and nonblocking failure semantics.
- [ ] Add deterministic probes listed below.
- [ ] Run `npm run quality:goal`.
- [ ] Run bounded live probe and cleanup.

## Acceptance criteria

- All goal creation/start/enqueue ingress paths use one canonical intent/action normalization path.
- `/goal repo-worktree-inventory -- current state and summarize context` sets summarize context action metadata even if the template expands `{{args}}` before the final objective tail.
- Prose context directives remain trailing-only and do not parse arbitrary mentions of summarize/clear context inside ordinary objective text.
- `create_goal`, `create_goal_from_template`, and `enqueue_goal` expose structured post-completion action input and normalize it to the same internal action model as prose directives.
- Conflicting prose and structured action directives fail with an actionable error.
- `GoalState`/`QueuedGoal` can represent post-completion actions and action run state.
- Existing ISSUE-043 persisted state replays safely through compatibility/migration.
- Context reset runs behind a `PostCompletionActionRunner`/adapter boundary and cannot throw through lifecycle.
- A feature flag or strategy selector can disable post-completion actions/context reset without disabling goal/queue continuation.
- Queue handoff/continuation is decided as a continuation ticket before optional actions run.
- Action failures record visible warning/failure state but do not block expected queue handoff.
- Compaction prequeue/fallback and other auto-continuation recovery paths use the same continuation-ticket semantics or are proven not to bypass them.
- Same-session clear/summarize navigation semantics from ISSUE-043 are preserved when the context reset action succeeds.
- README/tool docs explain structured model-tool params and template raw-directive semantics.
- No TypeScript escape-hatch casts are introduced in `.pi/extensions/goal`.
- `npm run quality:goal` passes.
- Live probe demonstrates template directive extraction, action failure/disabled-runner nonblocking continuation, and cleanup.

## Proof threat model

See `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/execution-readiness/04-proof-threat-model.md`.

Primary invariant: optional post-completion action failures must never be able to prevent expected goal/queue continuation.

False-green risks include:

- adding structured schema without centralizing parsing;
- fixing direct slash goals but not template or queued template invocations;
- catching reset errors while `needsPostCompletionContextReset` still suppresses handoff;
- covering turn_end but missing agent_end/compaction/dequeue continuation paths;
- disabling action runner but accidentally disabling continuation;
- breaking replay of existing ISSUE-043 sessions;
- relying only on source string probes.

## Required proofs

```toon
toon.version: 1
required_proofs[11]{name,source,command,pass_condition,scope,notes}:
  "sentrux_baseline","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && sentrux gate --save .pi/extensions/goal","exit 0 before substantial implementation",run,"required project gate"
  "intent_normalization_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-intent-normalization-probe.mjs","exit 0 and covers slash direct, slash template, slash queue block, create_goal, create_goal_from_template, enqueue_goal, and start queued direct/template shapes",run,"must fail if ingress paths parse actions differently"
  "template_raw_directive_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-template-raw-context-directive-probe.mjs","exit 0 and proves trailing directive in raw template args becomes action metadata even when {{args}} expands mid-template",run,"guards reported /goal repo-worktree-inventory -- current state and summarize context bug"
  "structured_tool_actions_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-tool-post-completion-actions-schema-probe.mjs","exit 0 and proves create_goal, create_goal_from_template, and enqueue_goal accept structured post-completion action params plus reject conflicts with prose",run,"guards model-tool API"
  "continuation_ticket_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-continuation-ticket-probe.mjs","exit 0 and proves queue handoff/continue/noop ticket is decided before action execution and revalidated by goalId/queueId",run,"guards outbox-style continuation command"
  "action_failure_nonblocking_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-post-completion-action-failure-nonblocking-probe.mjs","exit 0 and proves action failure records warning/failure state but still dispatches expected queue handoff",run,"inverts old ISSUE-043 fail-closed proof"
  "compaction_handoff_ticket_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-compaction-continuation-ticket-probe.mjs","exit 0 and proves compaction prequeue/fallback uses the same continuation ticket semantics and cannot bypass action isolation",run,"covers auto-continuation recovery path"
  "feature_flag_noop_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-post-completion-feature-flag-probe.mjs","exit 0 and proves disabled runner marks/skips actions without blocking queue continuation",run,"guards kill-switch strategy"
  "legacy_replay_migration_probe","ISSUE-044","cd ~/dev/personal/experiments/pi-goals && node .ai/validation/goal-post-completion-legacy-replay-probe.mjs","exit 0 and proves existing postCompletionContext/contextResetStatus state replays into or coexists with new action model",run,"protects existing sessions"
  "no_ts_escape_hatches","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && ! rg -n 'as unknown as|as any' .pi/extensions/goal","exit 0",run,"project rule"
  "quality_goal","AGENTS.md","cd ~/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0",run,"required final quality gate"
```

Required live proof:

```toon
toon.version: 1
live_proofs[1]{name,source,command,pass_condition,scope,notes}:
  "post_completion_actions_live_probe","ISSUE-044","Use .ai/docs/pi-goals-live-probe-testing.md against the active pi-goals-live-probe process or spawn one if absent","transcript shows template raw directive action extraction, structured tool action path if available from live agent, action failure or disabled-runner nonblocking queue handoff, and cleanup to no active goal/queue",live,"deterministic tests cannot fully prove Pi tree navigation and queue steering behavior"
```

## Implementation-ready plan

Status decision: implementation-ready.

Implementation-readiness transcript artifacts:

- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/00-intake.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/01-protocol-read.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/02-live-surface-research.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/03-implementation-design-lock.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/04-patch-sequence.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/05-proof-plan.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/06-issue-writeback.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/07-final-audit.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/08-deslop-guidance-map.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/raw/commands.log`

Exact implementation surfaces:

- `.pi/extensions/goal/types.ts` — edit — add canonical post-completion action types/states and keep legacy reset fields for replay compatibility.
- `.pi/extensions/goal/goal-intent.ts` — create — normalize direct/template/tool/queue input into `GoalIntent` plus action specs before domain mutation.
- `.pi/extensions/goal/post-completion-actions.ts` — create — action-state creation, anchor recording, safe runner orchestration, no-op runner.
- `.pi/extensions/goal/continuation-ticket.ts` — create — pure queue-handoff ticket decision, revalidation, and dispatch helpers.
- `.pi/extensions/goal/feature-flags.ts` — create — default-on env kill switches: `PI_GOAL_POST_COMPLETION_ACTIONS=0` and `PI_GOAL_CONTEXT_RESET=0` disable action/reset behavior without blocking continuation.
- `.pi/extensions/goal/terminal-workflow.ts` — create — terminal process manager: decide ticket, run safe actions, sync UI, dispatch ticket.
- `.pi/extensions/goal/templates.ts` — edit — export template invocation parser so raw directives can be stripped before expansion.
- `.pi/extensions/goal/context-reset.ts` — edit — become `context.reset` adapter plus command-context/anchor helpers; stop owning generic parsing/gating.
- `.pi/extensions/goal/command.ts` — edit — delegate slash direct/template/queue block normalization to `goal-intent.ts`; create action states; keep `/goal anchor` capability semantics.
- `.pi/extensions/goal/tools.ts` — edit — add structured `post_completion_context` and `post_completion_actions` params; route terminal updates through terminal workflow.
- `.pi/extensions/goal/queue-tools.ts` — edit — add enqueue structured params, store queued action specs, start queued actions consistently, use continuation tickets after dequeue.
- `.pi/extensions/goal/lifecycle.ts` — edit — replace reset-gate branches with terminal workflow calls.
- `.pi/extensions/goal/continuation.ts` — edit — route compaction queue-handoff recovery through continuation ticket semantics.
- `.pi/extensions/goal/state.ts` — edit — parse/persist `postCompletionActions`; synthesize actions from legacy ISSUE-043 fields.
- `.pi/extensions/goal/queue-state.ts` — edit — parse/persist queued action specs; synthesize specs from legacy `postCompletionContext`.
- `.pi/extensions/goal/ui.ts` — edit — change context reset failure messaging from blocked handoff to visible nonblocking action failure/skipped status.
- `README.md` — edit — document raw template directive semantics, structured tool params, default-on kill switches, and nonblocking failure behavior.
- `.ai/validation/goal-*.mjs` — create/edit — add action/ticket/flag/replay probes and invert fail-closed reset probe semantics.

Locked implementation choices:

- Tool schemas expose both `post_completion_context?: "none" | "clear" | "summarize"` and canonical `post_completion_actions?: [{ type: "context.reset", mode: "clear" | "summarize" }]`.
- Prose directives stay trailing-only, but are parsed from raw direct/template/queue input before template expansion.
- Duplicate same-mode action specs dedupe; conflicting clear-vs-summarize or `none` vs non-empty actions fail actionably.
- `GoalState` stores canonical `postCompletionActions?: PostCompletionActionState[]`; `QueuedGoal` stores canonical `postCompletionActions?: PostCompletionActionSpec[]`.
- Legacy ISSUE-043 fields remain readable and are synthesized into action state/specs for compatibility.
- Continuation tickets are in-process and recomputable from persisted goal/queue state; no new persistent ticket event is required for this first implementation.
- Post-completion actions run only for `goal.status === "complete"`; budget-limited queue handoff uses continuation tickets but skips post-completion actions.
- Action failure/skipped/disabled status is terminal for the action and must never block expected queue continuation.

Patch sequence summary:

1. Run `sentrux gate --save .pi/extensions/goal` and create guard probes.
2. Add shared action types and default-on feature flags.
3. Add `goal-intent.ts` and export template invocation parsing.
4. Add state/queue replay compatibility for canonical actions plus legacy fields.
5. Add safe action runner and refactor context reset into an adapter.
6. Add continuation tickets and terminal workflow boundary.
7. Wire lifecycle/tools/queue-tools/continuation through terminal workflow/tickets.
8. Add structured tool params and command/queue normalization.
9. Update README and all probes.
10. Run deterministic gates, `npm run quality:goal`, and bounded live probe.

Validation/proof sequence:

1. `sentrux gate --save .pi/extensions/goal`.
2. New probes: intent normalization, raw template directive, tool action schema, continuation ticket, nonblocking failure, compaction ticket, feature flags, legacy replay.
3. Updated `goal-context-reset-*.mjs` probes.
4. Existing queue/compaction probes.
5. `! rg -n 'as unknown as|as any' .pi/extensions/goal`.
6. `npm run quality:goal`.
7. Live probe through `.ai/docs/pi-goals-live-probe-testing.md`.

Deslop/production-hardening guidance:

- Use `08-deslop-guidance-map.md` during implementation as the issue-specific quality map.
- The map applies deslop and TypeScript hazards to the planned ISSUE-044 surfaces: `goal-intent.ts`, `post-completion-actions.ts`, `continuation-ticket.ts`, `feature-flags.ts`, `terminal-workflow.ts`, `context-reset.ts`, `lifecycle.ts`, `tools.ts`, `queue-tools.ts`, `continuation.ts`, `state.ts`, `queue-state.ts`, README, and validation probes.
- Pause for internal deslop review after non-trivial phase groups: types/flags, intent/template normalization, replay persistence, runner/adapter, tickets/workflow, tool/command integration, and docs/live proof.

Blocker/fallback policy:

- If TypeBox/Pi tools cannot support `post_completion_actions` array cleanly, keep the internal action model and temporarily expose only `post_completion_context`, then record the schema limitation; do not abandon the action architecture.
- If legacy replay cannot be made safe, stop rather than breaking existing sessions.
- If context reset needs private SessionManager casts, stop; do not violate the no escape-hatch rule.
- If any action failure still suppresses expected queue handoff, do not close the issue.

Handoff notes:

- First action: run `git status --short --untracked-files=all` and `sentrux gate --save .pi/extensions/goal`.
- Read `08-deslop-guidance-map.md` before coding and revisit its phase review prompts after each non-trivial implementation phase.
- Do not start by editing lifecycle reset branches in place; create the intent/action/ticket boundaries first.
- Preserve successful ISSUE-043 same-session reset semantics, but invert failure behavior to visible/nonblocking.
- Keep queue continuation as the protected invariant.

## TOON synthesis

```toon
toon.version: 1
issue[1]{id,status,kind,target_session,goal}:
  "ISSUE-044","implementation-ready",feature,"execute-issue-stack","rewrite post-completion context management as safe flagged hooks without risking queue continuation"

feature_memory[6]{id,fact}:
  "fm1","ISSUE-043 added per-goal clear/summarize reset using same-session Pi tree navigation"
  "fm2","current parser only recognizes trailing and summarize/clear context on the final parsed objective"
  "fm3","template expansion can move raw args before final objective tail, losing directive behavior"
  "fm4","tool schemas currently lack structured post-completion action fields"
  "fm5","current lifecycle blocks queue handoff on reset failure"
  "fm6","compaction continuation has queue handoff paths outside the reset gate"

locked_requirements[8]{id,requirement}:
  "lr1","all ingress paths normalize through canonical GoalIntent/action extraction"
  "lr2","raw template invocation directives are extracted before template expansion"
  "lr3","model tools expose structured post-completion action input"
  "lr4","post-completion behavior is represented as action specs/states"
  "lr5","continuation ticket is decided before optional actions run"
  "lr6","action runner failures are visible but nonblocking for expected continuation"
  "lr7","feature flag selects no-op or real runner at strategy boundary"
  "lr8","legacy ISSUE-043 state replays safely"

invariants[7]{id,invariant}:
  "inv1","context reset is optional side effect, not core queue state machine gate"
  "inv2","queue continuation cannot be lost because an action adapter failed"
  "inv3","prose directives stay trailing-only to avoid false positives"
  "inv4","structured/prose conflicts are rejected"
  "inv5","same-session tree reset semantics remain when reset succeeds"
  "inv6","all auto-continuation paths share or respect continuation-ticket semantics"
  "inv7","no TypeScript escape-hatch casts in .pi/extensions/goal"

implementation_surfaces[8]{path,role}:
  ".pi/extensions/goal/types.ts","add intent/action/ticket types or re-export from dedicated modules"
  ".pi/extensions/goal/goal-intent.ts","new canonical normalization boundary"
  ".pi/extensions/goal/post-completion-actions.ts","new action state and runner orchestration boundary"
  ".pi/extensions/goal/continuation-ticket.ts","new pure ticket decision/revalidation/dispatch helpers"
  ".pi/extensions/goal/context-reset.ts","become context.reset adapter rather than lifecycle gate owner"
  ".pi/extensions/goal/command.ts","delegate slash ingress to intent normalization"
  ".pi/extensions/goal/tools.ts","add structured action params and delegate to intent normalization"
  ".pi/extensions/goal/queue-tools.ts","store/start queued intents/actions consistently"

verification_checks[7]{id,check,evidence}:
  "v1","ingress paths normalize same action intent","goal-intent-normalization probe"
  "v2","template raw directive bug fixed","goal-template-raw-context-directive probe"
  "v3","structured tool action params work and conflict rules hold","goal-tool-post-completion-actions-schema probe"
  "v4","action failure does not block queue handoff","goal-post-completion-action-failure-nonblocking probe"
  "v5","compaction recovery respects ticket semantics","goal-compaction-continuation-ticket probe"
  "v6","legacy replay remains compatible","goal-post-completion-legacy-replay probe"
  "v7","live Pi tree/queue behavior works and cleans up","bounded live probe transcript"
```
