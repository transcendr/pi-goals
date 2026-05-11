# 18 — Proof-gate tool API design

This artifact adds concrete model-tool API planning grounded in `.pi/extensions/goal/tools.ts`.

## Current tool registration pattern

`tools.ts` registers one TypeBox schema per model tool and keeps execution in local helpers:

- `get_goal`
- `list_goal_templates`
- `create_goal`
- `create_goal_from_template`
- `update_goal`
- queue tools via `registerGoalQueueTools(...)`
- `clear_goal`

Tool guidelines are explicit and user-intent constrained. `update_goal` already accepts optional state fields and delegates validation/build/persistence to helper functions before returning structured `ToolDetails`.

## Module placement recommendation

Do not add all proof tool registration and execution logic directly to `tools.ts`. The file already owns core goal lifecycle tools and previously needed extraction to avoid Sentrux file-size/coupling pressure. Mirror the existing queue-tool pattern instead:

- `proof-tools.ts`: registers proof model tools and owns tool parameter schemas.
- `proof-tool-results.ts` or additions to `tool-results.ts`: formats compact proof summaries.
- `proofs.ts`: pure proof readiness/condition/freshness logic.
- `proof-runner.ts`: command execution and result construction.
- `tools.ts`: imports and calls `registerGoalProofTools(...)` alongside `registerGoalQueueTools(...)`.

This keeps proof-gate work modular and makes Sentrux failures easier to localize.

## Recommended first-release proof tools

### `list_goal_proofs`

Purpose: inspect configured proof gates and latest results without running commands.

Parameters: empty.

Returns:

- current goal;
- compact proof readiness summary;
- per-gate latest result status: `missing`, `fresh_pass`, `fresh_fail`, `stale`, or `timeout`.

Guideline: use before completion audits when proof gates exist.

### `configure_goal_proof`

Purpose: add or replace one proof gate explicitly.

Parameters:

- `id: string`
- `source: string` describing the trusted requirement source, e.g. `ISSUE-021 required_proofs row proof_runner_probe`
- `command: string`
- `condition: object` with discriminated `kind`
- `cwd?: string`
- `timeout_ms?: number`
- `output_cap_bytes?: number`
- `required?: boolean` default true
- `freshness?: "goal_state" | "worktree_status"` default `goal_state`

Validation:

- id must be stable, short, and unique per goal;
- command must be non-empty and under a fixed length cap;
- timeout/output caps must be positive and below max constants;
- regex pattern/flags must be bounded and valid;
- same-call configure+complete is impossible because this is a separate tool.

Guideline: use only when the user/objective/template explicitly requires durable command proof, or when issue execution requirements name required proofs.

### `remove_goal_proof`

Purpose: remove a proof gate explicitly and audibly.

Parameters:

- `id: string`
- `rationale: string`

Validation:

- gate must exist;
- rationale is required because removing a proof weakens completion safeguards.

Guideline: use only on explicit user instruction or when replacing an incorrectly configured proof gate in the same task context.

### `run_goal_proof`

Purpose: execute one proof gate or all required gates through the bounded runner.

Parameters:

- `id?: string`
- `required_only?: boolean` default true

Returns:

- structured result(s);
- aggregate readiness;
- truncated stdout/stderr excerpts;
- stale/fresh metadata.

Validation:

- active goal must exist;
- requested gate(s) must exist;
- do not auto-run if goal is budget-limited or not active unless a future explicit user command allows it;
- before spawning a proof command, evaluate budget pressure and refuse proof execution if the goal is already budget-exhausted/hard-stopped; proof-blocked completion should explain the proof is missing/stale without spending more budget.

Guideline: run before attempting completion when required proofs are missing/stale/failed, but do not use proof execution to bypass budget-limited safety.

## Why separate tools instead of extending `update_goal`

- Keeps proof edits auditable as intentional proof operations.
- Prevents same-call proof removal plus completion.
- Keeps `update_goal` focused on goal lifecycle/status/budget/floor state.
- Makes proof execution visible as proof execution, not hidden inside completion.

## ToolDetails additions

Extend `ToolDetails` with a compact proof summary instead of embedding full proof outputs:

```ts
proofs?: GoalProofSummary;
completion_blocked_by_proof?: boolean;
blocking_proofs?: Array<{ id: string; reason: "missing" | "stale" | "failed" | "timeout" }>;
```

## Prompt-guideline additions

For proof tools:

- Do not claim a proof gate passed unless `run_goal_proof` or `list_goal_proofs` shows a fresh pass.
- Do not remove proof gates to complete faster unless explicitly instructed by the user.
- If completion is blocked by a proof, run or fix the proof rather than marking the goal complete.
- Proof gates are evidence requirements, not substitutes for the qualitative completion audit.

For `update_goal`:

- Before `status: complete`, inspect required proof status when proof gates exist.
- If completion is proof-blocked, treat the tool result as active-goal continuation, not as success.
- Do not immediately remove proof gates after a proof-blocked result unless the user explicitly directs that change.

## Lifecycle false-green seam discovered after monitor steering

Inspected `.pi/extensions/goal/lifecycle.ts` around `handleToolResult`, `noteGoalUpdateResult`, `handleTurnEnd`, and `finishTurnGoal` as an unreviewed adjacent completion path.

Finding: completion telemetry is driven from tool result details, not merely from a requested `update_goal(status:"complete")`, which is good. However, proof-blocked completion must preserve that invariant by returning a normal tool result whose `details.goal.status` remains the pre-completion active status and whose details include `completion_blocked_by_proof: true`. If a proof-blocked result accidentally returned a candidate complete goal in `details.goal`, `noteGoalUpdateResult` would set `activeTurn.completedGoal = true`; then `finishTurnGoal` could treat the turn as a completion turn and interact badly with queue handoff/telemetry.

Implementation implication: the proof deferral result should mirror `floorCompletionDeferredResult(...)`: keep `goal` equal to the current active goal, add proof-specific blocked details, sync UI without persisting complete status, and never expose a candidate complete goal in tool details. Add a probe assertion that a proof-blocked `update_goal(status:"complete")` result does not set completion telemetry or queue-completion handoff.

## Slash-command scope after inspecting `command.ts`

`command.ts` currently exposes a deliberately small slash-command surface: view goal, `pause`, `resume`, `clear`, and `queue`, plus template/objective creation. It does not expose budget/floor editing through `/goal`; those are model-tool operations. Adding `/goal proof ...` in the first proof-gate pass would expand parsing, autocomplete, validation, and user-facing UX at the same time as adding state, runner, and completion-gate semantics.

Recommendation: first release should implement proof gates through model tools only (`configure_goal_proof`, `remove_goal_proof`, `list_goal_proofs`, `run_goal_proof`). Defer slash-command proof management until the runtime semantics are stable, or create a separate follow-up issue for `/goal proof` UX. This keeps ISSUE-021 focused on the anti-false-green invariant and avoids coupling proof execution correctness to a new command parser surface.

## TypeBox schema sketch

Keep the first tool schema explicit and boring; avoid a complex condition DSL.

```ts
const ProofConditionParams = Type.Object({
  kind: Type.Union([
    Type.Literal("exit_zero"),
    Type.Literal("stdout_contains"),
    Type.Literal("stderr_contains"),
    Type.Literal("output_contains"),
    Type.Literal("stdout_regex"),
  ]),
  value: Type.Optional(Type.String()),
  require_exit_zero: Type.Optional(Type.Boolean()),
});

const ConfigureGoalProofParams = Type.Object({
  id: Type.String(),
  source: Type.String(),
  command: Type.String(),
  condition: ProofConditionParams,
  cwd: Type.Optional(Type.String()),
  timeout_ms: Type.Optional(Type.Number()),
  output_cap_bytes: Type.Optional(Type.Number()),
  required: Type.Optional(Type.Boolean()),
  freshness: Type.Optional(Type.Union([Type.Literal("goal_state"), Type.Literal("worktree_status")])),
});
```

Validation should enforce that `value` is absent for `exit_zero` and present for contains/regex conditions. Keep that validation in proof-domain helpers instead of relying on TypeBox alone. Require `source` so proof gates are tied to a trusted requirement rather than invented as self-justifying completion shortcuts.

## Queue interaction after inspecting `queue-tools.ts`

Queue metadata currently carries objective, template data, budgets, and completion floors, but no arbitrary extension payload. First proof-gate release should not expand queued goal metadata unless explicitly needed. For issue-stack/reusable-template workflows, required proofs are present in the rendered objective/issue doc; the worker should configure proof gates after the concrete goal starts. This avoids adding proof serialization to queue start/dequeue semantics in the same implementation pass.
