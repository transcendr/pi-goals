# pi-goals

Persistent goal tracking for [Pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent). Inspired by Codex CLI's `/goal`, `pi-goals` adds Pi-native UX, rewindable `/tree`-compatible goal state, time and token budgets, reusable token-aware prompts, automated churn monitoring, and more.

> Early preview: `pi-goals` is usable, but install ergonomics and APIs may change before `1.0.0`.

## Features

- `/goal` command for creating, pausing, resuming, replacing, and clearing a persistent objective.
- Rewindable `/tree`-compatible state persisted into the Pi session branch.
- Time and token budgets with goal-aware continuation behavior.
- Reusable token-aware prompt templates.
- Model tools for inspecting and updating the active goal.
- Automated churn monitoring and steering for long-running goals.
- Compact Pi status/widget integration.

## Install

```bash
npm install pi-goals
```

## Use with Pi

The extension entrypoint is published as TypeScript source at:

```text
.pi/extensions/goal/index.ts
```

Until a packaged loader is finalized, copy or reference the extension directory from:

```text
node_modules/pi-goals/.pi/extensions/goal
```

in your Pi setup.

## Development

```bash
npm install
npm run quality:goal
```

`npm run quality:goal` runs the project quality gate for the extension, including structure checks, TypeScript validation, and Pi extension load validation.

## Status

This is an early public preview intended for collaborators and early testers. Expect rough edges and breaking changes before `1.0.0`.

## License

MIT
