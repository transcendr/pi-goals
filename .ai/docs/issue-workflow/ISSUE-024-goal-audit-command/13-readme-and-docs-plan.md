# 13 — README and docs plan

## Source inspected

- `README.md`

## Finding

README documents `/goal`, `/goal queue`, `/goal pause`, `/goal resume`, `/goal clear`, natural-language model tools, budgets/floors, reusable templates, and churn monitoring. It does not document `/goal audit` or an audit model tool.

## Implementation closeout requirement

After implementing ISSUE-024, update README to cover:

- `/goal audit` in the command list and subcommand descriptions;
- `audit_goal` in model-tool descriptions if README names tools explicitly;
- audit purpose: bounded completion-readiness review;
- audit non-behavior: does not complete the goal and does not continue work automatically;
- relationship to proof gates and churn monitor.

## Proof implication

`quality_goal` plus a doc/static probe should fail if README omits `/goal audit` after implementation.
