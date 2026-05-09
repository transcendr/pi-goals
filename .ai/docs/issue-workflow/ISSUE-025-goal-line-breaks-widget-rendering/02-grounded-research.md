# 02-grounded-research — live code and screenshot evidence

## Step actually performed

Inspected the screenshot artifact and relevant live source files, then mapped symptom to likely code path.

## Commands and raw output

See raw transcript:

```text
.ai/docs/issue-workflow/ISSUE-025-goal-line-breaks-widget-rendering/raw/commands.log
```

Key raw command snippets captured there:

```text
$ rg -n "objectiveExcerpt|renderGoalWidget|contentLine|compactLines" .pi/extensions/goal/widget.ts .pi/extensions/goal/format.ts
```

## Evidence read

```toon
evidence[4]{source,type,finding}:
  screenshot,"image","objective text with line break escapes bordered widget; continuation line starts outside left border"
  ".pi/extensions/goal/widget.ts","code","objective row calls objectiveExcerpt(goal.objective, contentWidth) inside a single contentLine"
  ".pi/extensions/goal/format.ts","code","objectiveExcerpt truncates by character count but preserves hard line breaks"
  ".pi/extensions/goal/ui.ts","code","syncGoalUi correctly registers widget factory; bug is render-line safety, not registration"
```

## Root cause hypothesis grounded in code

`renderGoalWidget()` returns `string[]`; each element must be one terminal row. If `objectiveExcerpt()` returns a string containing `
`, `contentLine()` wraps it as if it were one row, but terminal rendering treats it as multiple physical rows. This breaks border alignment exactly like the screenshot.

## Current live behavior risk

A short multiline objective is especially risky because `objectiveExcerpt()` returns the objective unchanged when character count is under the limit, preserving the newline with no truncation.
