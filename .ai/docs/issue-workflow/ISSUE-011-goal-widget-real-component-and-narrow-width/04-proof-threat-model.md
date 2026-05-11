# 04 — Proof threat model

Issue: ISSUE-011 — goal widget component/layout strategy
Date: 2026-05-10

## Claim under test

After implementation, the goal widget should render as an honest Pi TUI component with deterministic framed/compact layouts and no narrow-width border corruption.

## Proof threats

| Threat | Failure mode | Required mitigation |
|---|---|---|
| Width math lies with ANSI/emoji | lines appear longer than terminal width despite string length checks | use `visibleWidth` in render probes, not `line.length` |
| Border/header truncation remains hidden | top/bottom border gets ellipsis at budget-limited or narrow widths | probe each status at widths around the threshold; assert no ellipsis on border lines in framed mode |
| Compact fallback not exercised | implementation only works at normal terminal widths | probe widths below 32, including very narrow widths like 8/12/20/28/31 |
| Status-specific width regression | active passes but budget-limited fails | probe all statuses: active, paused, budgetLimited, complete |
| Component contract regresses | widget returns ad hoc shape but loses Pi TUI compatibility | typecheck with public `Component` contract and extension load validation |
| Docs continue claiming `card` | future implementer searches for nonexistent component or preserves misleading language | static grep for `MIN_CARD_WIDTH` and user-facing card terminology in goal widget docs/code |
| Quality gate misses runtime UI behavior | TypeScript compiles but live widget surface fails | deterministic render probe plus live probe note/validation when implementation changes runtime UI |
| Overengineering via Box/Text rewrite | implementation adds wrapping/composition complexity and unpredictable height | acceptance requires small seam changes and keeps fixed compact rows |

## Required proof shape

The implementation issue must include TOON-style `required_proofs[]` that are objective, runnable, and specific to widget rendering.

Minimum proof set:

```toon
required_proofs[]:
  - id: sentrux_gate_goal
    command: sentrux gate --save .pi/extensions/goal
    evidence: raw log path under .ai/docs/issue-workflow/ISSUE-011-goal-widget-real-component-and-narrow-width/raw/
    must_pass: true
  - id: widget_render_probe
    command: node .ai/validation/goal-widget-render-probe.mjs
    covers: [active, paused, budgetLimited, complete, widths_8_12_20_24_28_31_32_33_72_100]
    assertions: [visible_width_lte_render_width, compact_below_32, framed_at_or_above_32, no_border_ellipsis_in_framed_mode]
    must_pass: true
  - id: static_card_language_probe
    command: rg -n "MIN_CARD_WIDTH|MAX_CARD_WIDTH|card" .pi/extensions/goal README.md .ai/issues/open/ISSUE-011-goal-widget-real-component-and-narrow-width.md
    expected: no implementation/user-facing card terminology except historical issue context if explicitly marked
    must_pass: true
  - id: quality_goal
    command: npm run quality:goal
    must_pass: true
  - id: live_probe_widget_scope
    command: follow .ai/docs/pi-goals-live-probe-testing.md or record a deterministic-coverage skip reason
    must_pass: true
```

## Live probe stance

Because this issue affects persistent TUI/status rendering, a live probe is normally valuable after implementation. A deterministic-only skip is acceptable only if the change is purely local render math with exhaustive render probes and the closeout explains why no live Pi runtime behavior was at risk.
