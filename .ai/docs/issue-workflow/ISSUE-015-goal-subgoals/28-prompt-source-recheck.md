# 28 — Prompt source recheck

## Source inspected

- `.pi/extensions/goal/prompts.ts`

## Finding

`buildContinuationPrompt()` currently focuses only on the top-level objective, budget/floor guidance, and completion audit. There is no active-child section or parent return-state guidance today.

## Impact

ISSUE-015's prompt-context requirement remains necessary. Implementation should add active-child context to continuation prompts while preserving the parent objective as untrusted task data and keeping completion-audit guidance focused on both parent and unresolved blocking children.
