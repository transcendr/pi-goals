---
description: Review a dirty worktree and create focused, non-destructive conventional commits
aliases: dirty-cleanup,worktree-cleanup,commit-cleanup
usage: /goal dirty-cleanup -- Review current dirty changes and split them into focused commits
examples: /goal dirty-cleanup -- group the issue-doc prompt changes separately from unrelated issue docs; /goal worktree-cleanup -- inspect all dirty changes, stage by hunk when needed, and commit coherent work only
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 30000
---
Create a goal to clean up the current dirty git worktree by reviewing all uncommitted changes and making focused, coherent commits.

<context>
{{args}}
</context>

This is a non-destructive cleanup workflow. The worktree may contain changes from different workstreams, different agents, or earlier sessions. Do not assume unfamiliar changes are junk. Never discard, checkout, reset, restore, overwrite, or otherwise delete changes unless the user explicitly grants permission for that exact destructive action, or the scenario is clear and unambiguous beyond reasonable doubt.

The following worktree snapshot has already been collected by this prompt. Use it as initial context; do not rerun these same broad discovery commands merely to recreate the snapshot unless the worktree may have changed or you need fresh state after a commit.

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

Required workflow:

1. Build a worktree inventory from the injected snapshot, then inspect targeted diffs/files for changed and untracked paths before staging them.
2. Group changes by coherent work item, not by convenience.
3. If one file contains hunks from separate work items, stage only the relevant hunks for each commit using `git add -p` or an equivalent precise staging method. Do not lump unrelated hunks together just because they share a file.
4. Make focused commits. No big monolith commits unless the worktree genuinely contains one coherent change.
5. Use strongly formatted Conventional Commit messages:
   - title format: `<type>: <strong contextual title>`
   - examples: `fix: preserve multiline goal widget borders`, `docs: add issue workflow prompt artifacts`, `chore: track issue workflow artifacts`
   - include a commit body when helpful, especially to explain grouping, safety decisions, validation, or why files belong together
6. Before every commit, verify the staged set:
   - `git diff --cached --stat`
   - `git diff --cached --name-status`
   - targeted `git diff --cached -- <path>` when hunks are subtle or mixed
7. After every commit, refresh the remaining worktree state and continue grouping until no requested cleanup work remains.
8. Leave unrelated, ambiguous, or unsafe-to-classify changes unstaged and report them clearly instead of forcing them into a commit.

Commit message guidance:

- Prefer precise types: `fix`, `feat`, `docs`, `refactor`, `test`, `chore`.
- Titles must be specific enough to identify the actual work, not generic (`fix stuff`, `update files`, `cleanup`).
- Use a body for non-obvious commits:
  - what changed
  - why this grouping is coherent
  - validation run or intentionally skipped
  - any intentionally unstaged leftovers

Safety rules:

- No `git reset`, `git checkout --`, `git restore`, `git clean`, file deletion, or overwrite as cleanup unless explicitly authorized by the user for the specific path/action.
- Do not discard changes because you do not recognize them.
- Do not stage secrets, credentials, local-only files, editor junk, or generated noise without inspecting and justifying them.
- Do not amend or rewrite existing commits unless the user explicitly asks.
- Do not hide uncertainty. If ownership or grouping is unclear, leave the change uncommitted and report the ambiguity.

Completion standard:

- Every commit made is focused and conventional.
- Any mixed-file changes are staged by hunk or intentionally left unstaged with explanation.
- No unrelated work is bundled together.
- No destructive git operation was used without explicit permission.
- Final response includes:
  - commits created with hashes and titles
  - validation/check commands run
  - remaining dirty files, if any, with reason they were left uncommitted
  - any user decisions needed
