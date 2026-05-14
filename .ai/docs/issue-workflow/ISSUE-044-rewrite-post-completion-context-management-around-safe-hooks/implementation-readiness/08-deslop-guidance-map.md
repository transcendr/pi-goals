# 08 — Deslop guidance map for ISSUE-044

## Purpose

This map translates the deslop skill and TypeScript deslop reference into ISSUE-044-specific review points. It is intended to be used during implementation and post-implementation review of the safe-hooks rewrite.

Inputs reviewed:

- `~/.codex/deslop/SKILL.md`
- `~/.codex/deslop/references/typescript.md`
- `.ai/issues/open/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/02-live-surface-research.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/03-implementation-design-lock.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/04-patch-sequence.md`
- `.ai/docs/issue-workflow/ISSUE-044-rewrite-post-completion-context-management-around-safe-hooks/implementation-readiness/05-proof-plan.md`
- `AGENTS.md`
- `package.json`

Tooling note: `python3 ~/.codex/deslop/scripts/deslop-map.py .pi/extensions/goal` identified TypeScript as the primary reference and JSON/TOML as incidental read-only references due `.sentrux` config/baseline files. ISSUE-044 implementation is TypeScript plus Markdown/probe updates; no JSON/TOML hand-edit is planned.

## High-risk deslop focus summary

```toon
toon.version: 1
focus[12]{id,deslop_point,issue044_application,primary_surfaces,review_gate}:
  "d1","behavior first","preserve successful ISSUE-043 reset semantics while changing failure from blocking to nonblocking","context-reset.ts;lifecycle.ts;terminal-workflow.ts;post-completion-actions.ts","context reset probes + nonblocking failure probe + live probe"
  "d2","semantic slop","do not merely catch reset errors; prove continuation ticket still dispatches expected queue work","continuation-ticket.ts;terminal-workflow.ts;lifecycle.ts;tools.ts;queue-tools.ts;continuation.ts","continuation-ticket and action-failure probes"
  "d3","integration slop","respect Pi extension lifecycle, navigateTree command context, TypeBox schemas, queue steering, compaction retry behavior","index.ts;context-reset.ts;tools.ts;queue-tools.ts;continuation.ts","npm run quality:goal + live probe"
  "d4","Type/API slop","represent actions with discriminated unions and narrow runtime persisted/tool data without escape-hatch casts","types.ts;goal-intent.ts;state.ts;queue-state.ts;tools.ts;queue-tools.ts","typecheck + slop guard"
  "d5","architecture slop","new modules must be real boundaries, not speculative managers or one-caller indirection","goal-intent.ts;post-completion-actions.ts;continuation-ticket.ts;terminal-workflow.ts;feature-flags.ts","Sentrux gate/check + internal phase review"
  "d6","duplication slop","remove duplicated parser/reset-gate/handoff decisions rather than copying more conditionals","context-reset.ts;goal-intent.ts;lifecycle.ts;tools.ts;queue-tools.ts;continuation.ts","rg old gate imports + queue/compaction probes"
  "d7","error-handling slop","runner exceptions become typed failed action states and actionable warnings, never success-shaped defaults","post-completion-actions.ts;context-reset.ts;ui.ts","failure-nonblocking probe"
  "d8","security/input boundary","treat tool params, template args, queue block text, persisted state, and env vars as untrusted","goal-intent.ts;tools.ts;queue-tools.ts;state.ts;queue-state.ts;feature-flags.ts","negative parser/schema/legacy replay probes"
  "d9","test slop","prefer observable behavior/probes over source-string-only assertions; include unhappy paths and conflicts",".ai/validation/*.mjs","all new probes + updated old probes"
  "d10","no dependency theater","use existing TypeBox/TypeScript/Pi APIs; do not add packages or private Pi casts","package.json;context-reset.ts;tools.ts","git diff dependency audit + no escape-hatch grep"
  "d11","template-as-code hygiene","examples/docs/probes must not accidentally trigger parser rules being tested","README.md;.ai/validation/*.mjs;.ai/.pi-goals only if touched","TOON/README review + raw directive negative cases"
  "d12","report honestly","final closeout separates changed files, behavior change, validation, live probe, and residual risks","final response;implementation closeout","completion audit"
```

## Deslop non-negotiables mapped to ISSUE-044

| Deslop principle | Why it is especially relevant to ISSUE-044 | Applies to planned implementation | Concrete guard |
|---|---|---|---|
| Evidence before edits | ISSUE-044 changes lifecycle/queue semantics; intuition about existing reset behavior is unsafe. | Start Phase 1 with `git status --short --untracked-files=all` and `sentrux gate --save .pi/extensions/goal`; inspect callers/callees before each phase. | `04-patch-sequence.md` Phase 1; Sentrux baseline; command log. |
| Smallest safe patch | The rewrite is architectural, but must stay bounded to post-completion actions/tickets and not become a full queue rewrite. | New modules are limited to `goal-intent.ts`, `post-completion-actions.ts`, `continuation-ticket.ts`, `feature-flags.ts`, `terminal-workflow.ts`. | Sentrux size/coupling review after module creation; no unrelated queue behavior changes. |
| Behavior first | The intentional behavior change is only failure semantics and raw-template directive preservation; successful clear/summarize reset semantics must remain. | `context-reset.ts` adapter, action runner, README, old context-reset probes. | Existing `goal-context-reset-*.mjs` updated and passing; live probe direct slash summarize. |
| No fake certainty | Pi settings API, TypeBox schema behavior, and navigateTree context are live constraints. | Feature flag source is env kill switch; TypeBox action arrays must be proven; context reset must use available command context only. | Stop conditions `s2`/`s4`; tool schema probe; live probe. |
| No dependency theater | Existing dependencies already include TypeBox, TypeScript, Pi APIs; adding config/schema libraries would be slop. | `package.json`, `tools.ts`, `queue-tools.ts`, `feature-flags.ts`. | Diff audit: no new dependencies unless explicitly justified; `npm run quality:goal`. |
| Tests are part of the patch | The change is about edge/failure semantics, so tests/probes are required before trust. | Eight new probes plus updated context-reset probes. | `05-proof-plan.md` required proofs. |
| Security is not optional | Tool inputs, template args, queue block text, persisted JSON-like state, and env vars cross trust boundaries. | Intent normalization, schema parsing, state replay, flags. | Conflict/unsupported/legacy-negative tests; no dynamic eval; no shell execution in extension. |
| Respect project style | Project explicitly requires modular extension architecture, Sentrux, no casts, `npm run quality:goal`. | All `.pi/extensions/goal/*.ts` edits. | Sentrux before/after; `! rg -n 'as unknown as|as any' .pi/extensions/goal`. |
| Report honestly | A partial deterministic pass is insufficient if live Pi tree/queue behavior is unproven. | Final handoff/closeout. | Separate deterministic validation from live probe result and residual risks. |

## Deslop class map

### Semantic slop

Risk: code looks like it handles reset failures because it catches errors or marks actions failed, but queue continuation is still lost in one path.

Applies to:

- `terminal-workflow.ts`: ticket must be decided before actions and dispatched after revalidation.
- `continuation-ticket.ts`: revalidation must exclude action status/failure/skipped state.
- `lifecycle.ts`: both `turn_end` and `agent_end` paths must use the same terminal workflow semantics.
- `tools.ts`: model-tool completion and budget-limited transitions must not keep old fail-closed behavior.
- `queue-tools.ts`: dequeue handoff must not check old `needsPostCompletionContextReset`.
- `continuation.ts`: compaction prequeue/fallback must not bypass or contradict ticket semantics.

Implementation review questions:

- Can an action failure, missing capability, skipped flag, or thrown adapter exception appear in a branch condition that returns before queue handoff?
- Does budget-limited queue handoff skip post-completion actions while still using ticket/revalidation semantics?
- Are completed-goal actions limited to `goal.status === "complete"`?

Required proofs:

- `goal-continuation-ticket-probe.mjs`
- `goal-post-completion-action-failure-nonblocking-probe.mjs`
- `goal-compaction-continuation-ticket-probe.mjs`
- existing queue handoff/dedupe probes
- live probe disabled/failed reset + next queued goal starts

### Integration slop

Risk: implementation invents a clean internal design but wires it incorrectly into Pi extension runtime, TypeBox schemas, existing queue steering, or compaction retry behavior.

Applies to:

- `index.ts`: construct flags/runner once and pass dependencies explicitly.
- `context-reset.ts`: use actual `navigateTree` command context/capability; do not invent session APIs or private casts.
- `tools.ts` / `queue-tools.ts`: TypeBox schemas must expose structured params in model tools and parse runtime values safely.
- `lifecycle.ts` / `continuation.ts`: preserve current scheduling, retry, telemetry, and `sendQueueHandoff` delivery behavior unless intentionally routed through ticket dispatch.
- `README.md`: document real behavior, not idealized internals.

Implementation review questions:

- Does every prior caller of reset gating/handoff still have a path through new workflow/tickets?
- Does extension load validation prove the TypeBox schemas are accepted by Pi?
- Does live probe cover the tree navigation behavior that unit probes cannot prove?

Required proofs:

- `npm run quality:goal` including Pi offline extension load.
- Live probe following `.ai/docs/pi-goals-live-probe-testing.md`.
- `rg` audit for old reset-gate imports/calls after refactor.

### Type/API slop

Risk: action schemas and state replay look typed but trust external data or silence mismatches with casts.

Applies to:

- `types.ts`: discriminated unions for `PostCompletionActionSpec` and `PostCompletionActionState`.
- `goal-intent.ts`: normalized `GoalIntentResult`/`ActionSpecResult` must be typed success/failure, not thrown strings or broad objects.
- `state.ts` / `queue-state.ts`: persisted data is runtime data; parse/narrow before accepting.
- `tools.ts` / `queue-tools.ts`: TypeBox params represent runtime boundary; normalize into canonical action specs immediately.
- `feature-flags.ts`: env strings are runtime data; normalize case-insensitively and default safely.

TypeScript hazards to check:

- No `as any`, `as unknown as`, or broad `object`/raw map handling in touched `.pi/extensions/goal` code.
- No non-null assertions used to bypass missing queue/goal/action state.
- No optional calls followed by logs/state updates that assume the call ran; if a dependency is optional, branch explicitly.
- No structurally-compatible callback miswiring: context reset runner, no-op runner, ticket dispatcher, and queue steering sender have distinct behavior contracts.
- Tool param arrays are validated/narrowed at the boundary before core logic sees them.

Required proofs:

- `npm run typecheck:goal`
- `! rg -n 'as unknown as|as any' .pi/extensions/goal`
- tool schema/actions probe and legacy replay probe

### Architecture slop

Risk: the rewrite overcorrects by introducing managers/factories/layers that are generic in name only, or by growing already-large files.

Applies to planned modules:

- `goal-intent.ts`: justified because all ingress paths need one anti-corruption layer.
- `post-completion-actions.ts`: justified because action state and safe runner semantics are shared across lifecycle/tool paths.
- `continuation-ticket.ts`: justified because queue handoff must be decided/revalidated consistently across lifecycle/tools/compaction.
- `feature-flags.ts`: justified because flag parsing/strategy selection must not sprawl.
- `terminal-workflow.ts`: justified only if it keeps `lifecycle.ts`, `tools.ts`, and `queue-tools.ts` thin; avoid turning it into a god orchestrator.

Architecture review questions:

- Does each new module have multiple real consumers or a clearly isolated boundary?
- Are any new abstractions named more broadly than the actual supported behavior?
- Are dependencies passed through a named runtime/deps object if wiring grows past a few arguments?
- Did `lifecycle.ts`, `tools.ts`, `command.ts`, and `continuation.ts` shrink or at least avoid meaningful complexity growth?

Required proofs:

- `sentrux gate --save .pi/extensions/goal` before implementation.
- `sentrux gate .pi/extensions/goal` and `sentrux check .pi/extensions/goal` after implementation.
- Internal review after Phases 3, 6, and 7.

### Duplication slop

Risk: old parsing/gating/handoff logic is copied into new files, creating two subtly different systems.

Applies to:

- Parser ownership moves from `context-reset.ts` to `goal-intent.ts`; do not leave two active trailing directive parsers.
- Handoff decision moves to `continuation-ticket.ts`; do not leave independent queue head checks in lifecycle/tools/queue-tools/continuation except as wrappers around ticket helpers.
- Feature flag checks should live in `feature-flags.ts`/runner strategy, not scattered in every path.
- Legacy reset field synthesis should be helper-driven, not duplicated differently in `state.ts` and `queue-state.ts`.

Review commands/leads:

```bash
rg -n 'parsePostCompletionContextDirective|needsPostCompletionContextReset|attemptPostCompletionContextReset|postCompletionContext|sendQueueHandoff' .pi/extensions/goal
rg -n 'PI_GOAL_POST_COMPLETION_ACTIONS|PI_GOAL_CONTEXT_RESET' .pi/extensions/goal
```

Expected outcome: legacy fields may remain for replay/docs, but active logic should converge through intent/actions/tickets.

### Error-handling slop

Risk: errors are swallowed, logged as warnings without state, or converted into success-like continuation behavior without visible action status.

Applies to:

- `runPostCompletionActionsSafely`: catch unexpected runner exceptions and convert them to `{ ok: false, status: "failed", severity: "warning" }`.
- `createContextResetActionRunner`: return typed failure for missing capability/navigation failure; typed skipped result for disabled flag.
- `ui.ts`: warning text must be actionable and nonblocking; it must not claim handoff was blocked.
- `state.ts`: failed/skipped/done actions are terminal for action execution and must not be reinterpreted as pending reset.

Review questions:

- Is failure context preserved enough to debug `/goal anchor` or navigateTree issues?
- Is there any success log/message after an optional runner/dispatcher call that may not have run?
- Does the safe runner persist action state before/after transitions consistently?

Required proofs:

- `goal-post-completion-action-failure-nonblocking-probe.mjs`
- `goal-post-completion-feature-flag-probe.mjs`
- updated `goal-context-reset-failure-probe.mjs`

### Security/input-boundary slop

Risk: because this is local extension code, user/template/tool/state inputs are treated as trusted and parsed too loosely.

Applies to:

- `goal-intent.ts`: raw objective/template args/queue block text are user-controlled; directive parser must be trailing-only and must not match inline code or mid-objective mentions.
- `tools.ts` / `queue-tools.ts`: model tool params can be malformed; TypeBox helps schema declaration but core logic still needs typed normalization results.
- `state.ts` / `queue-state.ts`: persisted state may be old, partial, or manually edited; replay compatibility should reject/ignore invalid shapes safely.
- `feature-flags.ts`: env values are strings; disabled values are exact normalized set `0,false,no,off`; unknown/truthy values enabled.
- `README.md` / validation docs: examples containing `and summarize context` should not mask parser false positives.

Review questions:

- Are unsupported action types rejected actionably at tool/intent boundary?
- Does `none` conflict with non-empty action lists rather than silently winning or losing?
- Are clear-vs-summarize conflicts rejected instead of arbitrary precedence?
- Are strings from persisted state length/shape constrained enough for the local domain?

Required proofs:

- intent normalization negative cases
- tool schema conflict cases
- legacy replay malformed/old-shape cases where practical

### Test slop

Risk: probes only assert source strings or happy paths, so implementation passes while one real ingress path remains broken.

Applies to all `.ai/validation/goal-*.mjs` additions/edits.

Probe design requirements:

- Prefer exported pure helper behavior for `goal-intent`, `feature-flags`, `continuation-ticket`, and action state helpers.
- Use source-string checks only where module loading/export constraints make behavior probes impractical, and pair them with at least one behavioral/import check.
- Include unhappy paths: conflicting actions, non-trailing directive mention, unsupported action type, disabled flag, failed runner, stale ticket.
- Existing source-string probes that name `sendQueueHandoff` will need careful updates so they do not pass on old direct-handoff paths after tickets are introduced.

False-green probes already identified in `05-proof-plan.md` must remain mandatory.

### Performance/resource slop

Risk is lower than correctness risk, but still relevant at lifecycle boundaries.

Applies to:

- Avoid repeated template parsing/resolution in hot-ish command/tool paths when normalized intent already has cleaned args/action specs.
- Preserve existing retry delays/monitor timers; if new timers/timeouts are added, use named `*_MS` constants.
- Do not add caches for actions/templates/flags; flags can be read once at extension factory, no invalidation needed.
- Keep action runner sequential and explicit unless there is a real need for concurrency; context reset uses Pi tree state and should not race queue handoff state persistence.

Review commands/leads:

```bash
rg -n 'setTimeout\(|setInterval\(|Promise\.all|Map<|new Map|cache' .pi/extensions/goal
```

### Documentation slop

Risk: README or issue docs describe ideal architecture while behavior, flags, or failure semantics differ.

Applies to:

- `README.md`: must document raw-template directive behavior, structured tool params, default-on kill switches, `/goal anchor` as capability capture, and nonblocking failure warnings.
- Issue closeout/final response: must distinguish intentional behavior change from preserved behavior.
- Validation docs/probes: sample commands with directives should be explicit about trailing-only grammar.

Review questions:

- Does documentation tell users that reset failure no longer blocks queue handoff?
- Does documentation avoid implying arbitrary natural language mentions will trigger actions?
- Are env flag disabled values exact and documented?

## TypeScript-specific ISSUE-044 review checklist

### Discriminated unions and invalid states

Apply to `types.ts`, `post-completion-actions.ts`, `continuation-ticket.ts`, and `goal-intent.ts`.

- `PostCompletionActionSpec` is a discriminated union with `type: "context.reset"` and mode `"clear" | "summarize"`.
- `PostCompletionActionState` status is finite: `pending | running | done | failed | skipped`.
- `ContinuationTicket` is a discriminated union; stale/none reasons are explicit strings.
- Return values use `{ ok: true } | { ok: false }`, not nullable sentinel values plus side channels.
- Conflicting params produce typed/actionable errors, not thrown generic exceptions in normal validation paths.

### Runtime boundary narrowing

Apply to `state.ts`, `queue-state.ts`, `tools.ts`, `queue-tools.ts`, and `feature-flags.ts`.

- Persisted action arrays are checked element-by-element.
- Legacy `postCompletionContext` is accepted only for `clear`/`summarize`; invalid values do not create phantom actions.
- Tool arrays from TypeBox are still normalized into domain types; do not pass raw param objects deeply.
- Env disabled values are normalized by a tiny helper with explicit unit tests/probe.

### No escape hatches / no fake casts

Apply to all `.pi/extensions/goal/*.ts` edits.

Forbidden by project and TypeScript deslop reference:

```bash
rg -n 'as unknown as|as any' .pi/extensions/goal
```

Also review manually for avoidable non-null assertions and broad casts. If the implementation feels forced toward `as any`, the correct move is to add a narrowing helper or adjust the domain type.

### Optional-call no-op hazards

High-risk existing pattern: optional runtime dependencies in `tools.ts` and `queue-tools.ts` such as `runtime.sendQueueHandoff?.(...)`, `runtime.scheduleMonitor?.(...)`, and `runtime.getQueueSize?.() ?? 0`.

ISSUE-044 application:

- Terminal workflow should not silently skip dispatch because a sender was optional and then log/return as if continuation was processed.
- If dispatcher/runner/sync dependencies are optional, branch explicitly and return a typed `none`/failed result or warning.
- No UI/state update should claim an action ran if the runner dependency was absent.

### Callback wiring / structural typing hazards

Apply to `index.ts`, `terminal-workflow.ts`, `continuation-ticket.ts`, `post-completion-actions.ts`.

Structural TypeScript will allow functions with matching signatures but different semantics. Keep contracts distinct where behavior differs:

- queue steering sender vs ticket dispatcher;
- context reset runner vs no-op/skipping runner;
- action state persistence helper vs legacy replay synthesis helper;
- command context capture vs reset anchor recording.

Review: ensure functions with same-looking signatures are named by behavior and not passed into the wrong slot via shorthand property mistakes.

### Long positional parameter hazards

Apply to any new wiring from `index.ts` into command/tools/lifecycle/runtime modules.

If a function grows to 5+ runtime/dependency parameters, prefer a named `Runtime`/`Deps` object. This is especially relevant for:

- `processTerminalGoalWorkflow` input;
- runner construction;
- registration of tools/queue tools;
- continuation ticket dispatch dependencies.

### Regex/parser false positives

Apply to `goal-intent.ts`, `templates.ts`, validation probes, and README examples.

The directive parser is intentionally trailing-only. Tests must cover:

- positive: `objective and summarize context`, with optional punctuation;
- positive: raw template invocation args ending with directive before expansion;
- negative: `summarize context` in the middle of objective text;
- negative: mentions inside inline code/backtick examples where practical;
- negative: template args where directive-like text is not final;
- conflict: prose `clear` plus structured `summarize`.

### Module system / export hazards

Apply to new probe design and new module exports.

- Project package is CommonJS but TypeScript command compiles `.ts` with `--module ESNext`; probes often read source or run via Node `.mjs` conventions.
- Prefer probes that can import compiled-compatible pure helpers only if existing project probe style supports it; otherwise keep source-guard probes focused and pair with typecheck.
- Do not change package module type or build system for ISSUE-044.

## Phase-by-phase internal deslop review prompts

Run these as periodic internal reviews after non-trivial change sets, in addition to planned gates.

### After Phase 2 — types and flags

- Are action/flag types minimal and domain-specific?
- Does env parsing handle only exact disabled values and default enabled?
- Any casts/non-null assertions introduced?
- Does typecheck pass without widening everything to `string` or `object`?

### After Phase 3 — intent/template normalization

- Is there exactly one active trailing directive parser?
- Does raw template directive extraction occur before expansion?
- Are conflict errors actionable and tested?
- Are parser negative cases strong enough to prevent ordinary objective text stripping?

### After Phase 4 — state/queue replay

- Can old ISSUE-043 state replay without migration or data loss?
- Are invalid persisted shapes ignored/rejected safely rather than trusted?
- Are synthesized legacy action states/specs stable enough for probes?
- Is legacy compatibility isolated instead of leaking into new core logic?

### After Phase 5 — runner/adapter

- Can any runner exception escape the safe runner?
- Does missing command-context capability produce visible, actionable failure but no continuation block?
- Are skipped/failed statuses terminal for action execution?
- Does context reset adapter still preserve same-session tree navigation semantics?

### After Phase 6 — tickets/workflow

- Is continuation ticket decided before actions run?
- Does revalidation exclude action failure/skipped/disabled states?
- Did all terminal/handoff paths converge, including agent_end, turn_end, tool update, queue dequeue, and compaction?
- Are direct `sendQueueHandoff` calls still justified, or should they route through ticket dispatch?

### After Phase 7 — tools/commands/queue integration

- Do slash direct, slash template, slash queue block, create_goal, create_goal_from_template, enqueue_goal, and start_queued_goal all normalize through the same intent/action path?
- Are structured tool params accepted, deduped, and conflict-rejected consistently with prose?
- Are queued anchors recorded after dequeue/start, not while queued?
- Did command/tool files avoid growing into god files?

### After Phase 8 and Phase 9 — docs, quality, live probe

- Does README match implemented behavior exactly?
- Did deterministic probes cover all false-green rows?
- Did `npm run quality:goal` pass after Sentrux/typecheck/slop/offline load?
- Did live probe prove real Pi tree/queue behavior and cleanup state?

## Completion-time deslop closeout requirements for ISSUE-044 implementation

Final implementation closeout should include:

```toon
closeout_requirements[8]{id,requirement}:
  "c1","changed files grouped by behavior: intent/actions/tickets/flags/state/tools/docs/probes"
  "c2","explicit preserved behavior list for successful clear/summarize reset, anchors, same-session tree navigation, queue budgets"
  "c3","explicit changed behavior list: failure/skipped reset is visible and nonblocking; raw template directives parsed before expansion; structured tool params accepted"
  "c4","validation results for every required proof in 05-proof-plan.md"
  "c5","Sentrux before/after quality/coupling/cycle comparison"
  "c6","slop guard result proving no TypeScript escape-hatch casts"
  "c7","live probe transcript path or explicit blocker if live probe impossible"
  "c8","residual risks/follow-ups, especially any fallback to post_completion_context-only schema or deferred durable ticket persistence"
```
