# 04 — Proof threat model

## Primary invariant

A goal with required proof gates cannot be marked complete until every required proof has a fresh passing result that matches the current gate definition and goal/repo freshness rules.

## False-green risks

- Completion succeeds because a model claims it ran tests, but no durable proof result exists.
- Completion succeeds using a stale proof result from before relevant files changed.
- A proof command exits non-zero but output contains a success string and is incorrectly accepted.
- A gate definition changes but an old result is reused.
- A malicious/untrusted prompt template injects arbitrary proof commands without explicit user/tool confirmation.
- Output caps hide failure details and make diagnosis impossible.
- Proof execution hangs or requests interactivity.

## Proof strategy

- Deterministic probes for missing/failed/stale/passing proof gate decisions.
- Runner probe for timeout/output cap/exit code/contains condition handling.
- Replay probe proving proof gates/results survive branch replay and stale guards.
- Live probe creating a disposable goal with a proof gate that initially fails, blocks completion, then passes after a file/command change and allows completion.

## Adversarial review addendum

A final adversarial review checked for false-green and unsafe-runner risks. It emphasized trust-boundary mistakes, contains-condition masking of non-zero exits, unbounded result growth, over-aggressive staleness on usage accounting, and completion side effects before proof deferral. Details: `15-adversarial-review.md`.
