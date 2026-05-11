# 01 — Protocol read

## Protocol sources

The create-issue-doc goal template and feature-workflow protocol were read earlier in the current queue stack and are freshly present in session context. Governing requirements applied here:

- Use `$feature-workflow-pipelines`.
- Preserve visible workflow artifacts under `.ai/docs/issue-workflow/ISSUE-016-goal-idle-tolerant-mode/`.
- Ground design claims in inspected files and commands.
- Write the canonical issue only after request, protocol, research, design, and proof artifacts exist.
- Include a proof threat model and TOON-style `required_proofs[]` block for implementation-ready issues.
- Verify artifact visibility with `git status --short --untracked-files=all` and `git check-ignore -v`.

## Project constraints applied

- Keep `.pi/extensions/goal` modular.
- Do not use TypeScript escape-hatch casts in implementation planning.
- Run `npm run quality:goal` after implementation; this issue-doc promotion may record current quality evidence but does not implement runtime code.
