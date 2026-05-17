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

First ground yourself in the actual diff and current repo state. Use these embedded snapshots as starting evidence, then inspect files directly before changing anything. If the range resolution reports `unresolved`, do not treat empty diff/log output as evidence; resolve a valid anchor from tags, branches, or recent commits before patching.

<repo_status>
!`git status --short`
</repo_status>

<commit_range_resolution>
!`range='{{args}}'; if case "$range" in *..*) left="${range%%..*}"; right="${range##*..}"; git rev-parse --verify "$left^{commit}" >/dev/null 2>&1 && git rev-parse --verify "$right^{commit}" >/dev/null 2>&1 ;; *) git rev-parse --verify "$range^{commit}" >/dev/null 2>&1 ;; esac; then echo "ok $range"; else echo "unresolved $range"; echo "recent tags:"; git tag --list --sort=-creatordate | head -20; echo "recent commits:"; git log --oneline -20; fi`
</commit_range_resolution>

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
1. Read `AGENTS.md`, the `$deslop` skill, and the full TypeScript deslop reference (`references/typescript.md` under the `$deslop` skill directory) before editing. Name the TypeScript slop signatures and correctness traps you will check.
2. Validate that `{{args}}` resolves to a real commit range. If not, resolve the intended base/head from tags, branches, or recent commits before relying on diff output.
3. Build a commit-range triage map before editing:
   - `introduced-by-range`: the issue is in `git diff {{args}}` or follows directly from behavior changed by the range;
   - `adjacent-to-range`: the issue is not clearly introduced by the range, but is in a touched code path, caller/callee, or shared contract that must be adjusted for a safe behavior-preserving cleanup;
   - `pre-existing`: the issue existed before the range or is outside the touched paths.
   - Fix introduced and necessary adjacent issues first.
   - Only fix pre-existing issues when they block required validation or are required for the smallest safe cleanup; otherwise report them separately.
4. Read the relevant changed files and adjacent call sites/callees.
5. Run `sentrux gate --save .pi/extensions/goal` before non-trivial edits.
6. Inspect `git diff {{args}}` and current working tree changes.
7. Make the smallest coherent behavior-preserving cleanup.
8. Run the combined gate: `npm run gates:quality`.
9. If focused probes exist for touched behavior, run them too.
10. If any gate fails, fix the structural/type/behavioral cause rather than weakening checks.
11. Stage and commit the deslop cleanup with a concise commit message.
12. Report the exact commands run, pass/fail results, commit hash, which language reference(s) were read, which findings were introduced/adjacent/pre-existing, and any remaining risks.

Completion standard:
- Working tree is clean after the commit.
- `npm run gates:quality` passes.
- The full TypeScript deslop reference was read before patching.
- The final report separates introduced/adjacent fixes from pre-existing risks or validation blockers.
- No `as unknown as`, `as any`, or unproven `expr!` non-null assertions appear under `.pi/extensions/goal`.
- The cleanup is limited to behavior-preserving deslop unless the user explicitly approves a behavior change.
