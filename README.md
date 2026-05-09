# pi-goals

Persistent goal tracking for [Pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent). Inspired by Codex CLI's `/goal`, `pi-goals` adds Pi-native UX, rewindable `/tree`-compatible goal state, time and token budgets, reusable token-aware prompts, automated churn monitoring, and more.

> Early preview: this package is being prepared for open-source release. APIs and install ergonomics may change before `1.0.0`.

## What it provides

- `/goal` command for creating, pausing, resuming, replacing, and clearing a persistent objective.
- Rewindable `/tree`-compatible goal state persisted into the Pi session branch.
- Time/token budgets plus goal-aware runtime continuation and monitoring hooks.
- Reusable token-aware prompt templates.
- Model tools for inspecting and updating the active goal.
- Compact Pi UI status/widget integration.

## Install

```bash
npm install pi-goals
```

## Use with Pi

The extension entrypoint is published as TypeScript source at:

```text
.pi/extensions/goal/index.ts
```

Until a packaged loader is finalized, copy or reference the extension directory from `node_modules/pi-goals/.pi/extensions/goal` in your Pi setup.

For local validation:

```bash
npm run quality:goal
```

## Status

This is an early release intended to claim the public package name and make the current implementation available for collaborators and early testers.

## License

MIT
