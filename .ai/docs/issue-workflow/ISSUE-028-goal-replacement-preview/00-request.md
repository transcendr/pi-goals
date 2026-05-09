# 00 — Request intake

User-reported regression: when `/goal <template> ...args` is entered while a current goal exists, the replace prompt used to show the fully resolved goal text/prompt above the selectable options. After queue changes, the preview is gone.

Parsed inputs:
- bucket: open
- kind: fix
- title: Show resolved goal text before replacement choice
- issue: ISSUE-028
- issue path: `.ai/issues/open/ISSUE-028-goal-replacement-preview.md`
- artifact dir: `.ai/docs/issue-workflow/ISSUE-028-goal-replacement-preview/`

Clarification: not needed. The desired behavior is explicit: restore resolved objective preview before Replace/Queue/Cancel.
