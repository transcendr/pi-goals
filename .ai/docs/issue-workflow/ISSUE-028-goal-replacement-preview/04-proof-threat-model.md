# 04 — Proof threat model

Primary invariant:
- When `/goal <text/template>` is submitted while a goal exists, the user sees the fully resolved candidate objective before choosing Replace, Queue, or Cancel.

False-green risks:
- Test only checks that Replace/Queue/Cancel exists, not that preview text is shown.
- Preview shows raw template invocation instead of resolved prompt text.
- Preview appears for freeform text but not template-expanded objectives.
- Queue option regresses while restoring preview.

Proof strategy:
- Add or update a focused command handler probe that stubs `ctx.ui.select()` and captures its prompt.
- The probe should invoke a template-backed `/goal` request with an existing goal and assert the select prompt includes resolved template content and the Replace/Queue/Cancel options are still offered.
- Run full `npm run quality:goal` after implementation.

required_proofs[2]{name,command,condition}:
  replacement_preview_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-replacement-preview-probe.cjs","exit 0; select prompt includes resolved objective preview and still offers Replace Queue Cancel"
  quality_goal,"npm run quality:goal","exit 0; Sentrux slop TypeScript and Pi load gates pass"
