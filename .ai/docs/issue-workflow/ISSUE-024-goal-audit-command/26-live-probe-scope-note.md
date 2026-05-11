# 26 — Live probe scope note

## Planning pass decision

No live `/goal audit` probe was run during this issue-doc promotion goal because `/goal audit` is not implemented yet. Running a live probe now would only prove absence of the command, not the planned behavior.

## Implementation requirement

The implementation pass must satisfy `live_probe_or_skip` from the issue's required proofs:

```bash
cd /Users/bryan/dev/personal/experiments/pi-goals && test -s .ai/validation/goal-audit-live-probe-closeout.md
```

That closeout file should contain either:

- evidence from a live `/goal audit` run against the current `pi-goals-live-probe` process; or
- a specific deterministic-coverage skip rationale, if the implementation is small and fully covered by deterministic probes.

## Policy alignment

This matches `.ai/docs/pi-goals-live-probe-testing.md`: live probes complement deterministic tests for slash commands and runtime steering, but planning-only issue promotion does not need to run a nonexistent command.
