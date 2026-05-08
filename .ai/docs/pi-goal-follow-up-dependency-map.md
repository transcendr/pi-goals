# pi-goal follow-up dependency map

Status: current after issue-document workflow closeout
Solo project: `2` (`pi-goals`)

## Issue locations

- Fixed/completed baseline: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
- Execution-ready follow-ups:
  - `.ai/issues/open/ISSUE-002-goal-pause-active-turn-interrupt.md`
  - `.ai/issues/open/ISSUE-003-paused-goal-continuation-guard.md`
  - `.ai/issues/open/ISSUE-004-goal-subcommand-fuzzy-autocomplete.md`
  - `.ai/issues/open/ISSUE-005-goal-widget-labels-and-time-budget.md`

## Cross-issue dependencies

```toon
issues[5]{id,status,depends_on,notes}
  ISSUE-001,fixed,"none","implemented modular pi-goal baseline"
  ISSUE-003,open-execution-ready,"ISSUE-001","runtime guard; should land before or with ISSUE-002 because it supplies cancellation/context safeguards"
  ISSUE-002,open-execution-ready,"ISSUE-001, ISSUE-003-shared-cancellation","active pause UX; can share cancellation API from ISSUE-003"
  ISSUE-004,open-execution-ready,"ISSUE-001","independent UX improvement; low coupling"
  ISSUE-005,open-execution-ready,"ISSUE-001","resource accounting/UI extension; independent from pause/autocomplete work"
```

Recommended implementation order:

1. ISSUE-003 — stale continuation guard and cancellation runtime.
2. ISSUE-002 — active-turn pause steering/abort using the cancellation runtime.
3. ISSUE-005 — resource label/time-budget accounting.
4. ISSUE-004 — command autocomplete; can be done anytime after ISSUE-001 because it is low-risk and independent.

## Solo hierarchy and blockers

```toon
solo_todos[20]{issue,role,id,title,blocked_by}
  ISSUE-002,epic,24,"Pause active goal turn promptly","25,26,27,28"
  ISSUE-002,leaf,25,"002.1 Verify active-turn control surface",""
  ISSUE-002,leaf,26,"002.2 Add pause cancellation and active-run steering","25"
  ISSUE-002,leaf,27,"002.3 Harden lifecycle handling for pause state","26"
  ISSUE-002,leaf,28,"002.4 Validate active pause and resume behavior","27"
  ISSUE-003,epic,29,"Guard paused goals from stale continuations","30,31,32,33"
  ISSUE-003,leaf,30,"003.1 Add goal-scoped continuation cancellation API",""
  ISSUE-003,leaf,31,"003.2 Apply cancellation from command and lifecycle mutations","30"
  ISSUE-003,leaf,32,"003.3 Make context filtering status-aware","31"
  ISSUE-003,leaf,33,"003.4 Validate stale-message regression","32"
  ISSUE-004,epic,34,"Fuzzy autocomplete for /goal subcommands","35,36,37,38"
  ISSUE-004,leaf,35,"004.1 Add declarative goal subcommand table",""
  ISSUE-004,leaf,36,"004.2 Register command-local argument completions","35"
  ISSUE-004,leaf,37,"004.3 Implement scoped fuzzy matching guard","36"
  ISSUE-004,leaf,38,"004.4 Validate autocomplete UX","37"
  ISSUE-005,epic,39,"Resource labels and time budget support","40,41,42,43"
  ISSUE-005,leaf,40,"005.1 Replace ambiguous widget resource labels",""
  ISSUE-005,leaf,41,"005.2 Add timeBudgetSeconds state and tool validation","40"
  ISSUE-005,leaf,42,"005.3 Enforce time-budget accounting and prompts","41"
  ISSUE-005,leaf,43,"005.4 Validate resource budgets end-to-end","42"
```

## Validation commands used for this dependency map

```bash
find .ai/issues -maxdepth 2 -type f | sort
rg -n "Status:|Open questions|Research questions|Initial design preference|refine|draft|execution-ready|fixed" .ai/issues/open .ai/issues/fixed
solo-mcp --instance solo-pi_goals todos --project 2 --status open
```
