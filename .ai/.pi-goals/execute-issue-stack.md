---
description: Execute one or more issue docs with a resolved Solo/markdown todo graph, playbook, and per-issue active goals
aliases: execute-issues,issue-stack,run-issues,solo-issue-stack
usage: /goal issue-stack -- issue 026 through 028 and 035
examples: /goal execute-issues -- 25-26; /goal issue-stack -- ISSUE-012,ISSUE-025,ISSUE-026; /goal execute-issue-stack -- issue 026 through 028 and 035
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 60000
---
!`ISSUE_SELECTOR=$(cat <<'PI_GOAL_ISSUE_SELECTOR'
{{args}}
PI_GOAL_ISSUE_SELECTOR
) python3 .ai/.pi-goals/scripts/render_issue_stack_prompt.py`
