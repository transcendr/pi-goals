# 00 — Request intake

Issue number/path choice: `ISSUE-038` because the current highest issue number is `ISSUE-037`.

Target issue path: `.ai/issues/open/ISSUE-038-bound-goal-template-autocomplete-discovery.md`

Transcript directory: `.ai/docs/issue-workflow/ISSUE-038-bound-goal-template-autocomplete-discovery/`

Parsed inputs:

- bucket: `open`
- kind: `fix`
- title: `Bound goal template autocomplete discovery`
- context: user reported `/goal <string>` autocomplete/search froze Pi when started in `/Users/bryan`, a home folder with no root `.pi-goals`; macOS asked for broad folder permissions; likely caused by recursive `.pi-goals` template discovery during autocomplete.

Assumptions:

- This is a bug/fix issue rather than a feature request because the current behavior can freeze the TUI and trigger OS privacy prompts.
- No clarification is required: bucket, kind, title, affected files, desired behavior, and initial root-cause hypothesis were supplied by the queue/template context.
- The issue should be execution-ready if grounded research confirms the code path.

Clarification result: none asked; required inputs were complete.
