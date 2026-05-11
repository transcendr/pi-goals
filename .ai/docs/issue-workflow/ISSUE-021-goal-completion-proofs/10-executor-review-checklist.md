# 10 — Executor review checklist

Use this checklist before implementing or closing ISSUE-021.

## Pre-implementation

- [ ] Run `sentrux gate --save .pi/extensions/goal` if the implementation session is substantial.
- [ ] Re-read `AGENTS.md` and the issue's `required_proofs[]` block.
- [ ] Confirm whether ISSUE-037 queue handoff is still open; do not mix that fix into ISSUE-021 unless explicitly requested.
- [ ] Confirm no existing proof-gate modules have appeared since this refinement.

## During implementation

- [ ] Keep proof condition evaluation pure and testable.
- [ ] Keep command runner bounded and separate from tool registration.
- [ ] Do not add `as any` or `as unknown as` under `.pi/extensions/goal`.
- [ ] Avoid adding all proof logic to `tools.ts`; extract early.
- [ ] Ensure proof-blocked completion returns normal tool content/details rather than throwing unstructured errors.
- [ ] Ensure failed completion attempts do not set completion telemetry.
- [ ] Keep proof result output excerpts bounded.
- [ ] Stale-guard proof results by gate hash and goal/proof freshness fields.

## Validation

- [ ] `node .ai/validation/goal-proof-gate-decision-probe.mjs`
- [ ] `node .ai/validation/goal-proof-runner-probe.mjs`
- [ ] `node .ai/validation/goal-proof-replay-probe.mjs`
- [ ] `node .ai/validation/goal-min-spend-floors-probe.mjs`
- [ ] `npm run quality:goal`
- [ ] live probe per `.ai/docs/pi-goals-live-probe-testing.md`

## Closeout

- [ ] Add implementation closeout artifact under this workflow dir or a new execution workflow dir.
- [ ] Record live probe evidence path.
- [ ] Move issue to fixed only after required proofs and live proof are complete.
- [ ] If using Solo, close todos with comments linking proof logs and artifacts.
