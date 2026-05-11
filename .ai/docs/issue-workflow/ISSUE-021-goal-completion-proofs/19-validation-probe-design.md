# 19 — Validation probe design

This artifact grounds ISSUE-021's required probes in the existing `.ai/validation` style.

## Existing probe style observed

Inspected:

- `.ai/validation/goal-min-spend-floors-probe.mjs`
- `.ai/validation/goal-floor-steering-probe.mjs`

Both are lightweight Node scripts that read source files as text and assert structural invariants. They are intentionally cheap and deterministic:

- print `ok <name>` / `FAIL <name>`;
- set `process.exitCode` on failures;
- use textual ordering checks for critical side-effect order;
- avoid needing a live Pi runtime for structural regressions;
- complement, but do not replace, live probes.

## ISSUE-021 probe shape

### `goal-proof-gate-decision-probe.mjs`

Recommended assertions:

- `types.ts` declares proof gate/result domain fields or imports them from a proof domain module.
- `completion-gate.ts` has a proof-blocking decision variant distinct from floor deferral.
- `tools.ts` calls the completion gate before cancellation and persistence, as the floor probe already checks.
- proof gates include a trusted `source` field.
- proof-blocked completion details include `completion_blocked_by_proof: true`.
- proof-blocked completion result returns the current active goal rather than a candidate complete goal.
- completion telemetry/queue handoff cannot treat proof-blocked completion as completed.

### `goal-proof-runner-probe.mjs`

Recommended assertions:

- proof runner module exists and exposes bounded runner/evaluator seams.
- timeout constant and output cap constant are named.
- exit-zero condition fails on non-zero exit.
- contains/regex conditions require exit zero by default.
- timeout produces `timedOut: true` and a blocking reason of `timeout`.
- stdout/stderr excerpts are capped.

A deeper version can import pure functions once implementation exists, but the first structural probe can still fail on missing constants/modules/order.

### `goal-proof-replay-probe.mjs`

Recommended assertions:

- `state.ts` defensively parses optional proof gate/result fields.
- stale gate hash or goal/proof-config fingerprint mismatch produces stale readiness.
- token/time usage accounting alone does not stale proof results; probes should fail if raw `goal.updatedAt` is used as the only freshness key.
- worktree fingerprint freshness is opt-in and checked when configured, using the post-proof fingerprint for the resolved cwd.

## Live probe boundary

The live probe should be narrow:

1. create disposable goal with a required proof gate;
2. attempt completion before running proof and verify proof-blocked result;
3. run/fix proof until fresh pass;
4. complete goal;
5. clear/cleanup.

Do not use the live probe to test every condition type; keep condition matrix coverage in deterministic runner probes.
