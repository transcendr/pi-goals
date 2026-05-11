# 21 — Pure proof evaluator API

This is an implementation-facing API sketch for `.pi/extensions/goal/proofs.ts`.

## Design goal

Keep completion proof correctness testable without Pi runtime, shell execution, or UI. `proofs.ts` should be pure: input goal/proof state and output readiness decisions.

## Candidate exported types

```ts
export type ProofBlockingReason = "missing" | "stale" | "failed" | "timeout";

export type ProofReadiness =
  | { kind: "fresh_pass"; gateId: string; result: GoalProofResult }
  | { kind: "blocked"; gateId: string; reason: ProofBlockingReason; result?: GoalProofResult };

export type ProofGateSummary = {
  requiredTotal: number;
  requiredFreshPassing: number;
  blocking: Array<{ gateId: string; reason: ProofBlockingReason }>;
};

export type ProofCommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  killed: boolean;
  timedOut: boolean;
  startedAt: number;
  completedAt: number;
};
```

## Candidate exported functions

```ts
export function proofGateHash(gate: GoalProofGate): string;
export function goalContentFingerprint(goal: GoalState): string;
export function proofConfigFingerprint(gates: GoalProofGate[]): string;
export function latestProofResult(gateId: string, results: GoalProofResult[]): GoalProofResult | undefined;
export function evaluateProofCondition(condition: GoalProofCondition, result: ProofCommandResult): boolean;
export function evaluateProofGateReadiness(input: {
  goal: GoalState;
  gate: GoalProofGate;
  result?: GoalProofResult;
  worktreeStatusFingerprint?: string;
}): ProofReadiness;
export function summarizeProofReadiness(goal: GoalState): ProofGateSummary;
```

## Key behavior requirements

- Missing result for a required gate maps to `blocked/missing`.
- Gate hash mismatch maps to `blocked/stale`.
- Goal content/proof config fingerprint mismatch maps to `blocked/stale`.
- Worktree fingerprint mismatch maps to `blocked/stale` only for gates with `freshness: "worktree_status"`.
- `timedOut` or `killed` result maps to `blocked/timeout` when caused by runner timeout/abort; preserve raw `killed` separately for audit.
- `passed: false` maps to `blocked/failed`.
- Optional/non-required gates must be visible in summaries but not block completion.

## Hash/fingerprint caution

Use deterministic stable serialization for hashes. Do not rely on raw object property order unless the implementation normalizes keys first. Keep fingerprints small strings in result metadata, not full serialized goal snapshots.

## Probe targets

`goal-proof-gate-decision-probe.mjs` should import or text-check these exported function names and assert the blocking reason matrix. This gives implementation a clear red/green target without requiring a live Pi session.
