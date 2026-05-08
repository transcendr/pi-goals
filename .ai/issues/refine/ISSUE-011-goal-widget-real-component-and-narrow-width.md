# ISSUE-011 — Refine goal widget component/layout strategy

Status: refine — needs design decision before execution
Priority: P2
Owner: unassigned
Created: 2026-05-08

## Problem

The current widget is safer after restoring Pi TUI `visibleWidth` / `truncateToWidth`, but it is still a custom `Component` returning handcrafted terminal lines. It is not a higher-level card component.

Findings:

- At narrow widths, the framed header can degrade or truncate instead of switching to a clean compact layout.
- The project previously implied a “card” UI even though Pi TUI may only provide lower-level `Box`, `Text`, `Container`, etc.
- Pi TUI has built-in components such as `Box`, `Text`, and `Container`, but no confirmed built-in bordered card component yet.

## Requirement

Set this aside in `issues/refine` until the UI strategy is clarified. Do not execute as part of the immediate budget/runtime fixes.

## Open design questions

1. Does Pi TUI have a real bordered/card component not yet discovered?
2. If not, should `pi-goal` use built-in `Box`/`Text`/`Container` for background/padding but keep custom border rendering?
3. Should the UI stop claiming “card” and call this a bordered text widget?
4. What is the minimum width at which framed mode is allowed for each status label?
5. What exact compact layout should be shown below that minimum?

## Candidate acceptance criteria after refinement

- No header/border line truncates with ellipsis in framed mode.
- Widths below the viable framed minimum switch to compact unframed rows.
- The implementation uses Pi TUI built-ins where they provide real value.
- Documentation/issue language accurately describes the rendering approach.
- Render probes cover narrow widths for all statuses.
- Sentrux gate/check pass.

## Refinement todos

- [ ] 011.1 Re-check Pi TUI exports/source for any real card/border/layout component.
- [ ] 011.2 Decide whether to use `Box`/`Text`/`Container`, custom border rendering, or compact-only rendering.
- [ ] 011.3 Specify exact width thresholds and compact layout for each status.
- [ ] 011.4 Move to open only after design decision and execution plan are locked.
