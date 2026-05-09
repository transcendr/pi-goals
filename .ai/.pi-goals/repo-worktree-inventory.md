---
description: Read-only inventory of current git worktree state with grouping and cleanup recommendations
aliases: worktree-inventory,dirty-inventory,repo-dirty-inventory
usage: /goal repo-worktree-inventory -- current repo state
examples: /goal worktree-inventory -- current repo state
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
Produce a read-only worktree inventory report.

<context>
{{args}}
</context>

Use this initial snapshot, then inspect targeted details as needed:

<git_status>
!`git status --short --untracked-files=all`
</git_status>

<staged_diff_stat>
!`git diff --cached --stat || true`
</staged_diff_stat>

<unstaged_diff_stat>
!`git diff --stat || true`
</unstaged_diff_stat>

<untracked_files>
!`git ls-files --others --exclude-standard`
</untracked_files>

Report:
- staged changes
- unstaged changes
- untracked files
- likely coherent work groups
- cleanup or commit recommendations
- ambiguities that need owner input

This is an inventory/report goal, not a cleanup execution goal. Do not stage files, modify files, discard changes, or commit.
