# 03-design-lock — chosen fix shape and rejected alternatives

## Step actually performed

Converted the grounded research into a locked implementation direction. No owner clarification was needed because the research did not expose a meaningful product/API fork.

## Chosen design

```toon
locked_choice{id,choice,reason}:
  widget_single_line_excerpt,"sanitize objective text to a single-line excerpt before widget row rendering","fixes terminal-line injection without restricting multiline objectives or redesigning the widget"
```

Implementation should add a small helper such as `singleLineExcerpt()` or `objectiveWidgetExcerpt()` and use it in the widget objective row. Sanitization must happen before width truncation/padding.

## Rejected alternatives

```toon
rejected_alternatives[4]{id,alternative,reason}:
  reject_multiline_objectives,"change validation to reject multiline /goal objectives","unnecessary product restriction; multiline goals are useful"
  widget_redesign,"perform full card/Box/narrow-width redesign","belongs to ISSUE-011 refine, too broad for this bug"
  multiline_widget_rows,"render objective as multiple widget rows","requires layout/product decisions; not needed for correctness fix"
  truncate_only,"only truncate objective earlier","does not remove newline if newline appears inside retained prefix"
```

## Execution-readiness decision

```toon
execution_readiness_gate[4]{check,result}:
  design_choice_locked,pass
  acceptance_aligned,pass
  proofs_aligned,pass
  implementer_not_designer,pass
```

The issue is execution-ready because the target behavior, likely root cause, files, non-goals, and proof shape are all concrete.
