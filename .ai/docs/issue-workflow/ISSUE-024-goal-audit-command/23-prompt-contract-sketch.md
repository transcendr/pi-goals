# 23 — Prompt contract sketch

## Audit prompt must include

- Current goal id and status.
- Objective in an untrusted-data wrapper.
- Explicit stale guard: inspect `get_goal` if needed and stop if the goal id differs or no goal exists.
- Explicit non-mutation rule: do not call `update_goal(status:"complete")` during audit.
- Explicit no-continuation rule: do not continue substantive work unless the user asks after the audit.
- Evidence-state checklist requirement.
- Proof/subgoal/floor/budget state summary requirement when available.

## Suggested visible output shape

```text
Goal audit
- Goal/status checked: ...
- Recommendation: continue | pause/escalate | ready-to-complete-by-user-choice

Requirements:
1. [verified|missing|weak|blocked|not_applicable] Requirement — evidence/path/command

Proof/subgoal/floor/budget notes:
- ...

Next safest action:
- ...
```

## Avoid

- Long essays without checklist states.
- Treating tests/quality gates as sufficient without mapping them to requirements.
- Marking complete or invoking follow-up tools.
