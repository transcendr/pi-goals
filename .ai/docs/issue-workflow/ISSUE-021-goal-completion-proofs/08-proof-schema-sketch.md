# 08 — Proof schema sketch

This is not implementation, but an executor-facing schema sketch grounded in the current `GoalState`/`ToolDetails` patterns.

## Candidate types

```ts
export type GoalProofCondition =
  | { kind: "exit_zero" }
  | { kind: "stdout_contains"; value: string; requireExitZero?: boolean }
  | { kind: "stderr_contains"; value: string; requireExitZero?: boolean }
  | { kind: "output_contains"; value: string; requireExitZero?: boolean }
  | { kind: "stdout_regex"; pattern: string; flags?: string; requireExitZero?: boolean };

export type GoalProofFreshness = "goal_state" | "worktree_status";

export type GoalProofGate = {
  id: string;
  source: string;
  command: string;
  cwd?: string;
  timeoutMs: number;
  outputCapBytes: number;
  required: boolean;
  condition: GoalProofCondition;
  freshness: GoalProofFreshness;
  createdAt: number;
  updatedAt: number;
};

export type GoalProofResult = {
  gateId: string;
  gateHash: string;
  goalContentFingerprint: string;
  proofConfigFingerprint: string;
  worktreeStatusFingerprint?: string;
  startedAt: number;
  completedAt: number;
  exitCode: number | null;
  timedOut: boolean;
  passed: boolean;
  stdoutExcerpt: string;
  stderrExcerpt: string;
  error?: string;
};
```

## Candidate `GoalState` addition

```ts
proofGates?: GoalProofGate[];
proofResults?: GoalProofResult[];
```

These should be optional and defensively parsed. Do not rely on the existing broad `...(v as GoalState)` replay cast to accept proof arrays unchecked; add explicit `toProofGateArray(...)` / `toProofResultArray(...)` validators that drop malformed entries and preserve backwards compatibility. The first implementation can choose adjacent persisted proof state instead if Sentrux flags `GoalState` growth, but `completion-gate.ts` still needs one effective source of truth.

## Candidate tool result additions

```ts
completion_blocked_by_proof?: boolean;
proofs?: {
  required_total: number;
  required_passing_fresh: number;
  blocking: Array<{ gate_id: string; reason: "missing" | "stale" | "failed" | "timeout" }>;
};
```

## Constants likely needed

- default proof timeout, e.g. `GOAL_PROOF_DEFAULT_TIMEOUT_MS`.
- max proof timeout.
- default/max output cap.
- max proof gates per goal.
- max retained results per proof gate.

## Result retention and state growth

Because `state.ts` persists full goal snapshots in every `pi-goal-state` update entry, proof results must be trimmed before persistence. Otherwise repeated proof runs would duplicate growing result arrays into every later goal update. Completion only needs the latest result per gate; audit/debug can keep one or two previous failures, but retention must be bounded. If bounded retention still makes `GoalState` too large, use a separate compact proof-result custom event stream plus an effective proof summary on goal state.

## Freshness correction after inspecting `state.ts`

`persistAccountGoal(...)` updates `goal.updatedAt` whenever token/time accounting is persisted at turn end. Therefore `goal.updatedAt` is too broad as a proof freshness key: it would stale valid proof results after ordinary accounting-only turns.

Use stable fingerprints instead:

- `goalContentFingerprint`: objective plus completion-relevant goal configuration, excluding `tokensUsed`, `timeUsedSeconds`, and telemetry-only fields.
- `proofConfigFingerprint`: normalized proof gate definitions.
- `worktreeStatusFingerprint`: only when the gate opts into worktree freshness.

## Telemetry boundary after inspecting `telemetry.ts`

`telemetry.ts` tracks turn counts, safety state, budget warnings, and floor monitor outcomes. Its `isTelemetry(...)` parser is intentionally loose (`version` plus `goalId`), and telemetry is updated frequently for progress accounting. Proof gate definitions/results should not live only in telemetry. Telemetry may hold compact derived counters later, but completion proof authority belongs in effective goal/proof state evaluated by `completion-gate.ts`.

## Validation implication

The deterministic probes should import pure proof evaluation functions rather than requiring a live Pi session for every branch. The live probe should cover only the integration path from configured proof gate to `update_goal(status:"complete")` deferral/allowance.
