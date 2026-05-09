# 00-request — ISSUE-026 NL reusable goal prompts

## Parsed request

- Target bucket: `open`
- Issue kind: `feature`
- Requested title: `NL reusable goal prompts`
- Chosen issue number/path: `.ai/issues/open/ISSUE-026-nl-reusable-goal-prompts.md`
- Context: user wants the agent to resolve and start goals from any `.pi-goals/` reusable prompt using natural language, e.g. “create a goal for the create-issue-doc prompt in open that's a new feature that xyz...”, with the agent filling necessary args and creating the fully resolved prompt as the new goal.

## Assumptions

- This is about model/tool support for natural-language goal creation via reusable templates, not only `/goal <template> --flags` command syntax.
- The feature should preserve explicit persistent-goal creation guardrails: tools should not infer goals from ordinary tasks unless the user explicitly asks to create/start a goal.
- The issue belongs in `open` because the user requested a concrete feature issue and the high-level product behavior is clear enough after grounded research/design locking.

## Clarification result

No clarification needed. Required inputs are present: bucket, kind, title, and context.
