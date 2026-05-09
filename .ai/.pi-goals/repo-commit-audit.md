---
description: Read-only audit of a commit range with changed files, intent, risks, and follow-up suggestions
aliases: commit-audit,commit-range-audit,recent-commit-audit
usage: /goal repo-commit-audit -- c8105ef..HEAD
examples: /goal commit-audit -- HEAD~3..HEAD
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
Produce a read-only audit report for this commit range:

<commit_range>
{{args}}
</commit_range>

Use this initial snapshot, then inspect targeted details as needed:

<repo_status>
!`git status --short --untracked-files=all`
</repo_status>

<commit_range_summary>
!`git log --oneline --decorate --no-merges {{args}} 2>/dev/null || true`
</commit_range_summary>

<changed_files>
!`git diff --name-status {{args}} 2>/dev/null || true`
</changed_files>

<diff_stat>
!`git diff --stat {{args}} 2>/dev/null || true`
</diff_stat>

Report:
- commit range resolved
- commits included
- changed files grouped by purpose
- likely intent of the range
- risk notes
- suggested follow-up checks

This is an audit/report goal, not an implementation goal. Do not modify files, stage files, or commit.
