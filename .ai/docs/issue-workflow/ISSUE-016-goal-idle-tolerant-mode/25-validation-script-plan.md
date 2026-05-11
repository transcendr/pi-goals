# 25 — Validation script plan

## Repository probe inventory

Command used:

```bash
ls .ai/validation && rg -n "continuation|queue|floor|goal" .ai/validation .pi/extensions/goal -g '*.mjs' -g '*.ts' | head -120
```

Current deterministic validation scripts:

- `.ai/validation/goal-floor-steering-probe.mjs`
- `.ai/validation/goal-min-spend-floors-probe.mjs`

## Gap

There is no deterministic validation script for active-goal continuation policy or delayed idle nudges.

## Required implementation probe additions

Add at least one deterministic `.ai/validation/goal-idle-nudge-probe.mjs` (or equivalent tests wired into `npm run quality:goal`) that verifies:

1. `idle_nudge` active goals do not call immediate continuation scheduling on create/resume/update.
2. `manual` active goals do not auto-schedule continuation or delayed nudges.
3. delayed nudge firing validates goal id/status/updated-at/policy before injecting steer.
4. delayed nudge cancellation happens on pause, clear, complete, replace, and budget-limited transitions.
5. tool output exposes enough policy state for the agent to distinguish active waiting from paused.

## Impact

This issue remains execution-ready because the required proofs name these exact deterministic probes; the executor can implement them alongside the feature.
