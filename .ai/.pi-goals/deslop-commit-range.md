---
description: Run a deslop boomerang review over a commit range
aliases: deslop-range,deslop-commits
usage: /goal deslop-range -- HEAD~5..HEAD
examples: /goal deslop-commits -- 5ed1650..HEAD; /goal deslop-range -- 440a9ae^..440a9ae
allow_commands: true
command_timeout_ms: 10000
command_output_limit: 20000
---
Run a rigorous deslop pass over this commit range:

<commit_range>
{{args}}
</commit_range>

Use the `$deslop` skill, including the TypeScript-specific guidance, and use `$sentrux` as the structural quality gate. Treat this as a behavior-preserving cleanup and hardening pass, not feature work.

First ground yourself in the actual diff and current repo state. Use these embedded snapshots as starting evidence, then inspect files directly before changing anything:

<repo_status>
!`git status --short`
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

Scope:
- Primary code scope: `.pi/extensions/goal/**/*.ts`.
- Include adjacent project files only when needed for validation or quality gates, such as `package.json`, `package-lock.json`, `AGENTS.md`, and `.pi/extensions/goal/.sentrux/rules.toml`.
- Do not broaden into `references/codex` or unrelated backlog/docs unless the diff proves it is necessary.

Deslop objectives:
- Remove AI slop, overengineering, brittle abstractions, duplicated logic, vague names, and unnecessary indirection.
- Preserve runtime behavior and public command/tool semantics.
- Do not add TypeScript escape-hatch casts such as `as unknown as` or `as any`.
- Prefer narrow, typed helpers over casts.
- Keep modules aligned with `AGENTS.md` responsibilities and Sentrux layering.

Workflow:
1. Read `AGENTS.md` and the relevant changed files.
2. Run `sentrux gate --save .pi/extensions/goal` before non-trivial edits.
3. Inspect `git diff {{args}}` and current working tree changes.
4. Make the smallest coherent behavior-preserving cleanup.
5. Run the combined gate: `npm run quality:goal`.
6. If focused probes exist for touched behavior, run them too.
7. If any gate fails, fix the structural/type/behavioral cause rather than weakening checks.
8. Stage and commit the deslop cleanup with a concise commit message.
9. Report the exact commands run, pass/fail results, commit hash, and any remaining risks.

Completion standard:
- Working tree is clean after the commit.
- `npm run quality:goal` passes.
- No `as unknown as` or `as any` appears under `.pi/extensions/goal`.
- The cleanup is limited to behavior-preserving deslop unless the user explicitly approves a behavior change.
