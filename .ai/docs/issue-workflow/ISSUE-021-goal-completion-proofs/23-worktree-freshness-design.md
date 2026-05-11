# 23 — Worktree freshness design

## Purpose

`freshness: "worktree_status"` prevents a proof result from being reused after the repository state changes.

## Fingerprint command

First release can use the same command already common in this repo's workflows:

```bash
git status --short --untracked-files=all
```

Record the exact stdout string plus the resolved cwd. If the command fails because the cwd is not a git worktree, fail proof configuration for `worktree_status` gates by default. A future explicit option may allow fallback to `goal_state` with a warning, but silent fallback weakens the user's requested freshness policy.

## Capture timing

Capture the worktree fingerprint after the proof command finishes, not before it starts. The proof result should describe the state that was actually validated. If the proof command itself creates or updates files, those changes become part of the post-proof fingerprint; later changes stale the proof.

## Staleness check

At completion time, recompute the fingerprint in the same resolved cwd. A required proof is stale when:

- gate hash changed;
- goal content/proof-config fingerprint changed;
- stored worktree fingerprint differs from current fingerprint;
- proof result lacks a fingerprint for a `worktree_status` gate.

## Probe implication

`goal-proof-replay-probe.mjs` should include two worktree freshness cases:

1. same stored/current fingerprint => fresh if other fingerprints match;
2. different stored/current fingerprint => stale even if the proof command previously passed.

The probe can exercise pure evaluator seams without mutating a real git worktree.
