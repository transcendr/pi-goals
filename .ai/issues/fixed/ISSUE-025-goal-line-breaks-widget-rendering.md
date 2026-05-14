# ISSUE-025 — Goal with line breaks widget rendering breaks

Status: fixed — implemented
Priority: P1
Owner: pi-goal automation
Created: 2026-05-09
Next best session: none — fixed
Next best session rationale: Implemented in commit b6d56f4 with multiline widget probe and npm run quality:goal.
Target bucket: fixed
Issue kind: bug
Target repo roots: `~/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Related:
- `.ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md`

Goal: Fix pi-goal widget rendering so multiline goal objectives cannot break the widget card layout. The widget renderer must return one terminal-safe string per rendered line, with no embedded line breaks and no line exceeding the requested width.

## Problem/context

Using `/goal` with line breaks in the goal description can mess up the pi-goal widget rendering. Screenshot evidence from the user:

- `/var/folders/8j/f35z086s553cjd2cbqzj94hw0000gn/T/soloterm-clipboard/paste-1778324234575-6143-0.png`

The screenshot shows the objective text escaping the intended bordered card: the first line appears within the widget, then later objective text starts at the far left outside the border while the right border continues lower on the screen. This is consistent with an embedded newline inside a single widget-rendered string.

## Transcript artifacts

Visible workflow artifacts proving this issue was created through the requested workflow:

- Request parsing: `.ai/docs/issue-workflow/ISSUE-025-goal-line-breaks-widget-rendering/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-025-goal-line-breaks-widget-rendering/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-025-goal-line-breaks-widget-rendering/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-025-goal-line-breaks-widget-rendering/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-025-goal-line-breaks-widget-rendering/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-025-goal-line-breaks-widget-rendering/05-issue-writeback.md`
- Final protocol audit: `.ai/docs/issue-workflow/ISSUE-025-goal-line-breaks-widget-rendering/06-final-audit.md`
- Raw command transcript: `.ai/docs/issue-workflow/ISSUE-025-goal-line-breaks-widget-rendering/raw/commands.log`

## Research findings

Relevant code paths inspected:

- `.pi/extensions/goal/widget.ts`
- `.pi/extensions/goal/format.ts`
- `.pi/extensions/goal/ui.ts`

Likely root cause:

- `widget.ts` renders the objective row with `objectiveExcerpt(goal.objective, contentWidth)` inside `contentLine(...)`.
- `format.ts` `objectiveExcerpt()` truncates by character count but preserves hard line breaks.
- `renderGoalWidget()` returns a `string[]` intended to represent terminal rows. If any string contains `\n` or `\r`, the terminal can render multiple physical lines from one widget array element, bypassing border/padding/width logic.

Current relevant code:

```ts
contentLine(theme.fg("dim", objectiveExcerpt(goal.objective, contentWidth)), contentWidth, theme)
```

and:

```ts
export function objectiveExcerpt(objective: string, maxChars = OBJECTIVE_EXCERPT_CHARS): string {
  const chars = [...objective];
  if (chars.length <= maxChars) return objective;
  return `${chars.slice(0, Math.max(0, maxChars - 1)).join("")}…`;
}
```

## Desired behavior

- Multiline goal objectives remain valid goal objectives.
- Widget display collapses objective whitespace into a single-line excerpt before rendering that excerpt inside the card.
- `renderGoalWidget(goal, theme, width)` never returns a line containing `\n` or `\r`.
- Every rendered line remains within the requested/rendered width.
- The fix covers both normal card mode and compact/narrow mode.
- `/goal` summary/notification behavior should not be changed unless deliberately justified by the implementation.

## Locked design choices

- Implement a narrow rendering correctness fix, not a widget redesign.
- Add a small reusable helper for line-safe objective excerpts, either:
  - `objectiveWidgetExcerpt(objective, maxChars)`, or
  - generic `singleLineExcerpt(value, maxChars)` used by the widget objective row.
- Sanitize line breaks before width-aware truncation/padding.
- Preserve existing multiline objective acceptance in validation.

Rejected alternatives:

- Do not reject multiline `/goal` objectives.
- Do not broaden into ISSUE-011 card/Box/narrow-width refinement.
- Do not render multiline objectives as multiple widget rows in this bugfix; that is a larger layout decision.
- Do not rely on truncation alone, because short multiline objectives can preserve newlines without truncating.

## Implementation result

Implemented in commit `b6d56f4 fix: collapse multiline objectives in widget rendering`.

Summary:
- Added line-safe objectiveExcerpt in format.ts that collapses newlines and carriage returns into single spaces before width-aware truncation.
- Normal-width and compact widget modes both use the line-safe excerpt.
- Existing multiline objective acceptance in validation is unchanged.

Validation passed:
- /tmp/pi-goal-widget-multiline-probe.cjs (12 assertions)
- npm run quality:goal

## Implementation checklist

- [ ] Add a line-safe objective excerpt helper in `format.ts` or a widget-local helper.
- [ ] Update `widget.ts` objective rendering to use the line-safe helper.
- [ ] Ensure compact widget mode also cannot return embedded newlines.
- [ ] Add a focused widget probe for multiline objective rendering.
- [ ] Run `npm run quality:goal`.
- [ ] Record validation results in this issue before moving to fixed.

## Acceptance criteria

- A goal objective containing hard line breaks does not break the pi-goal widget card.
- Normal-width widget render returns only single physical lines: no returned string contains `\n` or `\r`.
- Compact/narrow widget render returns only single physical lines: no returned string contains `\n` or `\r`.
- All returned widget lines have visible width less than or equal to the render width.
- Existing active/paused/budget-limited/complete labels and command hints still render.
- `npm run quality:goal` passes.
- Focused multiline widget probe passes.

## Proof threat model

Primary invariant: widget rendering must be terminal-line safe regardless of objective content. User-provided objective text must not be able to inject physical line breaks into a single widget row.

Likely false greens:

- Testing only long single-line objectives, not short multiline objectives.
- Fixing card mode but leaving compact mode vulnerable.
- Sanitizing after visible-width/padding calculations.
- Passing Pi extension load while widget line invariants remain untested.
- Accidentally changing goal validation to reject multiline objectives instead of fixing rendering.

Required proof shape:

- A deterministic probe constructs a `GoalState` with objective text containing multiple lines.
- The probe calls `renderGoalWidget()` at both normal and compact widths.
- It asserts every returned line contains no `\n` or `\r`.
- It asserts `visibleWidth(line) <= width` for every returned line.
- The combined project quality gate passes.

## Required proofs

required_proofs[4]{name,command,condition}:
  widget_multiline_probe,"NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-widget-multiline-probe.cjs",exit 0; proves multiline objectives produce no embedded newlines and no over-width widget lines
  quality_goal,"npm run quality:goal",exit 0
  no_escape_hatch_casts,"npm run slop:goal",exit 0
  pi_load,"pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models",exit 0
