# 16 — Acceptance traceability

| Acceptance criterion | Locked design source | Proof row |
| --- | --- | --- |
| `/goal audit` registered/autocompletes | `03-design-lock.md` fork 2 | `audit_command_probe` |
| `audit_goal` model tool parity | `03-design-lock.md` fork 2 | `audit_tool_probe` |
| Dedicated audit prompt, not continuation/monitor | `03-design-lock.md` forks 1 and 3 | `audit_prompt_guard_probe`, `audit_command_probe` |
| Audit cannot complete goal | `03-design-lock.md` fork 3 | `audit_prompt_guard_probe` |
| Audit does not schedule continuation | `03-design-lock.md` fork 3 | `audit_command_probe`, `paused_budget_audit_probe` |
| Evidence states present | `03-design-lock.md` locked first-pass design | `audit_prompt_guard_probe` |
| Stale/status guarded | `09-lifecycle-filter-source-recheck.md` | `audit_command_probe`, `paused_budget_audit_probe` |
| Bounded replay-safe metadata | `03-design-lock.md` fork 4 | `audit_replay_probe` |
| Proof/subgoal/floor/budget state considered | `02-grounded-research.md`, ISSUE-021/015 dependency notes | `audit_prompt_guard_probe`, `audit_tool_probe` |
| README documented | `13-readme-and-docs-plan.md` | `quality_goal` plus implementation static checks |

## Traceability conclusion

Every acceptance criterion has a design source and an associated proof row. No acceptance criterion depends on an unresolved design fork.
