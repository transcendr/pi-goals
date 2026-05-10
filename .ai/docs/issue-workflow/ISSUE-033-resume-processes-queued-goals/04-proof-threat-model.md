# 04 — Proof threat model

## Primary invariant

`/goal resume` is the explicit command that advances an idle non-empty queue, while `/goal queue ...` remains enqueue-only.

## False-green risks

1. **Queue auto-start regression** — implementation accidentally starts processing immediately on enqueue.
2. **No-goal dead zone remains** — `/goal resume` with no current goal still only prints help.
3. **Completed-goal dead zone remains** — `/goal resume` with an uncleared completed goal still asks for `/goal clear` and does not steer the queue.
4. **Blind direct start** — command handler directly calls queue-start behavior or otherwise bypasses queue steering/template classification.
5. **Active goal regression** — `/goal resume` changes behavior for paused/budget-limited/non-complete active goals.
6. **Replay/branch drift** — queue steering or queue events are not persisted/replayed coherently.

## Deterministic proof strategy

Create focused probes or tests around command/runtime behavior:

- enqueue while no goal exists leaves queue non-empty and does not create an active goal;
- `/goal resume` while no goal exists and queue non-empty sends queue steering/startable agent turn;
- enqueue while completed goal exists leaves completed goal in place and queue non-empty;
- `/goal resume` while completed goal exists and queue non-empty sends queue steering/startable agent turn;
- paused/budget-limited resume behavior remains unchanged.

## Live proof strategy

A bounded live Pi probe is required because the target behavior depends on command-triggered agent-turn/steering delivery, not just pure state helpers. The live probe should verify visible behavior with realistic prompts and sparse polling.

## Required proof rows

The issue doc should include importable `required_proofs[]` rows for:

- Sentrux gate before implementation;
- focused deterministic probe/test for no-goal resume queue pump;
- focused deterministic probe/test for completed-goal resume queue pump;
- live probe for `/goal queue ...` then `/goal resume` in both states;
- final `npm run quality:goal`.
