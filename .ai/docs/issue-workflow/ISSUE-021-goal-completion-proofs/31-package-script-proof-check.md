# 31 — Package script proof check

## Purpose

Verify that required proof rows referencing package scripts still align with `package.json`.

## Checked file

- `package.json`

## Findings

- `npm run quality:goal` exists and runs Sentrux gate/check, slop guard, TypeScript validation, and Pi extension load validation.
- `npm run slop:goal` exists and rejects `as unknown as` / `as any` under `.pi/extensions/goal`.
- The required proof row `floor_budget_regression` uses `npm run quality:goal`, which remains valid.
- The required proof row `slop_guard` uses `npm run slop:goal`, which remains valid and directly supports the AGENTS.md no-escape-hatch constraint.

## Executed check

`npm run slop:goal` was executed during the promotion pass and exited `0`; raw output is saved at `raw/slop-goal-proof-check.log`.

`npm run typecheck:goal` was also executed and exited `0`; raw output is saved at `raw/typecheck-goal-proof-check.log`.

`npm run quality:goal` was executed after open promotion/downstream reference updates and exited `0`; raw output is saved at `raw/quality-goal-open-promotion.log`.

## Result

Package-script proof references in ISSUE-021 are current.
