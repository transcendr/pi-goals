# 03 — Design lock for ISSUE-018

## Execution-ready decision

ISSUE-018 is execution-ready for a bounded first pass after locking the feature as **safe worktree preparation plus explicit worktree-session adoption**, not silent automatic multi-agent spawning.

The first release should make it easy and safe to start a goal in a separate Git worktree, while avoiding accidental paid/background model sessions and avoiding current-session cwd illusions that the Pi extension API does not currently expose.

## Locked choices

### 1. Command surface

Chosen:

- Add a command path centered on `start`:
  - `/goal start --worktree [--base <ref>] [--branch <name>] [--path <path>] [--allow-dirty-source] -- <objective>`
  - `/goal start --adopt-worktree --origin <repo-root> --worktree <path> --branch <branch> --worktree-id <id> -- <objective>`
- Keep existing `/goal <objective>` behavior unchanged.
- Support `/goal --worktree ...` only as optional syntactic sugar if it does not complicate parsing; the canonical documented surface is `start --worktree`.

Rationale: `command.ts` currently treats unknown first tokens as objectives. A distinct `start` subcommand avoids ambiguity with ordinary objective text and leaves room for future `start --template`/`start --worktree` behavior.

Rejected:

- Making `/goal --worktree <objective>` the only surface: easier to collide with current objective parsing and less extensible.
- Replacing default `/goal <objective>` with worktree prompts: unsafe migration and too disruptive.

### 2. Model-tool surface

Chosen:

- Add a dedicated tool, tentatively `prepare_goal_worktree`, rather than overloading `create_goal`.
- Add/extend goal creation with an adoption path only when running inside the created worktree, e.g. a command or tool path that creates a normal active `GoalState` with worktree binding metadata.
- Tool usage guidelines must say: use only when the user explicitly asks for worktree isolation; do not infer worktrees for ordinary tasks.

Rationale: worktree creation mutates Git/filesystem state and has more preflight/collision semantics than ordinary goal creation. A separate tool keeps errors and proof probes precise.

Rejected:

- Adding optional worktree flags to `create_goal` in the first pass: it would mix goal state mutation, Git mutation, and session-handoff semantics in a high-risk tool.

### 3. Worktree creation owner

Chosen: the extension runtime owns the first-pass Git worktree creation through bounded `pi.exec("git", ...)` calls.

Rationale: `pi.exec` is available in the extension API and is already used by Pi extension examples for Git operations. Extension ownership allows structured, bounded, replayable preflight and error messages instead of shell snippets pasted into prompts.

Rejected:

- External helper as the only implementation path: adds installation/discovery risk before the core UX exists.
- Model manually running `git worktree` commands: not durable or consistently safe enough.

### 4. Session handoff/spawn behavior

Chosen first release: **do not silently spawn a new Pi agent/session**. Prepare the worktree and return a precise handoff command/instruction for the user or agent to run from that worktree. The handoff uses the adoption command to create the actual active goal in the worktree session.

Rationale:

- `ExtensionCommandContext.newSession()` and `switchSession()` were inspected, but no cwd override was found in the type definitions. Starting a new Pi session in the same cwd would falsely imply isolation.
- Silent automatic spawning of paid model sessions is explicitly unsafe and is deferred to ISSUE-019 or a later orchestration issue.
- A visible handoff preserves user control and makes cleanup/audit straightforward.

Rejected:

- Switching the current session into the worktree: no inspected API supports changing process cwd/session root safely.
- Spawning background Pi with `nohup`/shell tricks: too opaque for first release and hard to test/clean up.
- Treating the source session's goal as active while work happens elsewhere: would mix telemetry, cwd, proofs, and UI state.

### 5. Naming and path policy

Chosen defaults:

- Generate a short stable worktree id such as `crypto.randomUUID()` excerpt or equivalent collision-resistant id.
- Slug objective text to a bounded filesystem-safe label.
- Default branch: `pi-goal/<slug>-<id>`.
- Default path: sibling directory outside the source worktree, e.g. `../<repo-name>-worktrees/<slug>-<id>`.
- Allow explicit `--branch` and `--path`, but fail on branch/path collisions.
- Record origin repo root, source branch, source HEAD, base ref, created branch, worktree path, and generated worktree id.

Rationale: a sibling worktree directory avoids nesting Git worktrees inside the primary repo while still being inspectable and easy to remove. The id prevents collisions; the slug makes human review easier.

Rejected:

- Path inside the main repo by default: risks ignored/nested working tree confusion.
- Pure timestamp branch names: less readable and harder to associate with objectives.
- Reusing the current branch: Git worktree will reject already-checked-out branches and would weaken isolation.

### 6. Dirty source handling

Chosen:

- Default behavior refuses to create a worktree when `git status --short --untracked-files=all` in the source repo is non-empty.
- `--allow-dirty-source` permits creation from the selected base/HEAD but must warn that uncommitted source changes are not copied into the new worktree.
- The tool/command output includes a bounded source status summary or fingerprint when dirty-source override is used.

Rationale: worktree creation itself does not overwrite source changes, but starting from HEAD while source has uncommitted changes is a common false-green/missing-context risk.

Rejected:

- Auto-stashing or copying dirty changes: high risk of data loss or unexpected patch content.
- Silently ignoring dirty source state: likely to confuse long-running goals.

### 7. Cleanup policy

Chosen:

- Completing, clearing, or pausing a goal never deletes a worktree.
- Any cleanup helper must require explicit confirmation and must refuse removal when the target worktree has uncommitted changes unless a separate explicit force path is added later.
- First implementation may provide only safe metadata and manual cleanup instructions; if it adds `remove_goal_worktree`, that command/tool must be explicit and guarded.

Rejected:

- Auto-remove on goal complete: unsafe because review/merge often happens after completion.
- Force removal by default: unacceptable data-loss risk.

### 8. State and UI metadata

Chosen:

- Add optional bounded worktree binding metadata to `GoalState` for adopted goals running in a worktree.
- If source-session launch records are kept, store them in a separate bounded custom entry stream rather than pretending the source session owns an active worktree goal.
- Tool output and compact UI should show the associated worktree path/branch only when metadata exists; no-worktree goals render as before.

Rationale: adopted worktree goal state must be visible to proof gates, audit, history, and human review, but source-session preparation should not pollute the normal active-goal lifecycle.

### 9. Boundary with ISSUE-019

Chosen:

- ISSUE-018 owns one goal in one explicit worktree with user-mediated session launch/adoption.
- ISSUE-019 owns multiple simultaneous goals, automatic agent/session orchestration, parallel spend controls, aggregate UI, and cross-goal scheduling.

Rationale: Worktree metadata and safe creation are prerequisites for parallel goals, but parallel orchestration is too broad for this first pass.

## Why execution-ready now

The implementation no longer needs to choose product/API direction. It can implement the locked first pass:

1. preflight source repo;
2. generate/validate branch and path;
3. create the Git worktree with bounded `pi.exec`;
4. return an explicit adoption handoff;
5. create a normal active goal with worktree binding when adoption is invoked from the worktree;
6. render/validate worktree metadata;
7. never auto-delete or auto-spawn.

Remaining implementation details such as exact helper names, parser internals, and UI wording are downstream engineering choices, not unresolved architecture forks.
