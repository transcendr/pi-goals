# 18 — Proof command sanity

## Checked commands

The issue's required proof commands use concrete paths under this repo:

- `npm run quality:goal`
- `node .ai/validation/goal-audit-command-probe.mjs`
- `node .ai/validation/goal-audit-prompt-guard-probe.mjs`
- `node .ai/validation/goal-audit-tool-probe.mjs`
- `node .ai/validation/goal-audit-replay-probe.mjs`
- `node .ai/validation/goal-audit-status-probe.mjs`
- `test -s .ai/validation/goal-audit-live-probe-closeout.md`

## Current state

These audit-specific probe scripts do not exist before implementation; that is intentional. They are required deliverables for the implementation pass and should be created failing-first or alongside the feature.

## Pass-condition shape

Each probe has a named `PASS ...` output expectation. This makes false-green command success less likely than a bare exit-code check.

## Quality gate

`npm run quality:goal` already exists and passed during this planning pass; it remains the final implementation quality gate.
