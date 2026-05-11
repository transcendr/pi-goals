# ISSUE-018 — Goal start in worktree

Status: open — execution-ready for safe worktree preparation/adoption first pass
Priority: P2
Owner: pi-goal automation
Created: 2026-05-08
Updated: 2026-05-11
Next best session: focused implementation/validation pass for explicit worktree goal starts
Next best session rationale: The key product/runtime forks are locked: first release creates a Git worktree through bounded extension-owned Git commands, returns an explicit adoption handoff, records worktree metadata on the adopted goal, and does not silently spawn agents or auto-delete worktrees.
Target bucket: open
Issue kind: feature
Target repo roots: `/Users/bryan/dev/personal/experiments/pi-goals`
Parent issue: `.ai/issues/fixed/ISSUE-001-pi-goal-extension.md`
Depends on: none for the bounded first worktree-start pass
Related:
- `.ai/issues/open/ISSUE-016-goal-idle-tolerant-mode.md`
- `.ai/issues/open/ISSUE-019-parallel-multiple-goals.md`
- `.ai/issues/open/ISSUE-021-goal-completion-proofs.md`
- `.ai/issues/open/ISSUE-022-goal-history-checkpoints-and-compaction.md`
- `.ai/issues/open/ISSUE-024-goal-audit-command.md`

## Goal

Add a safe way to prepare and adopt a persistent `pi-goal` inside its own Git worktree so long-running work can be isolated from unrelated source-worktree changes while preserving explicit user control over session launch and cleanup.

First release target: one goal, one explicit Git worktree, user-mediated session launch/adoption, durable worktree metadata on the adopted goal, and no automatic multi-agent orchestration.

## Problem/context

Long-running goals can touch many files. Running them in the current worktree risks mixing goal changes with unrelated user work. Git worktrees are a natural isolation boundary, but the extension currently has no worktree-aware command/tool path.

The existing refine issue identified the right problem but left product/runtime forks open: should the extension create worktrees, should it switch the current session, how should branch/path names be generated, what happens with dirty source changes, and how cleanup should work. Those choices are now locked here so implementation can proceed without making architecture decisions accidentally.

This issue also sets up ISSUE-019: parallel/multiple goals should consume explicit worktree/session ownership metadata rather than inventing it later.

## Transcript artifacts

- Request intake: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/00-request.md`
- Protocol read: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/01-protocol-read.md`
- Grounded research: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/02-grounded-research.md`
- Design lock: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/03-design-lock.md`
- Proof threat model: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/04-proof-threat-model.md`
- Issue writeback: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/05-issue-writeback.md`
- Final audit: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/06-final-audit.md`
- Raw command log: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/raw/commands.log`
- Sentrux planning sensor: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/raw/sentrux-gate.log`
- Stale reference scan before promotion: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/raw/stale-018-references-before.log`
- Stale reference audit after promotion: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/raw/stale-reference-audit.log`

## Desired behavior

### Worktree preparation

- `/goal start --worktree [--base <ref>] [--branch <name>] [--path <path>] [--allow-dirty-source] -- <objective>` prepares a Git worktree for a new isolated goal.
- The extension validates that the current cwd is inside a Git worktree and resolves the source repo root.
- The extension runs bounded Git preflight commands through `pi.exec`, not raw model-managed shell snippets.
- The extension refuses branch/path collisions and reports actionable structured errors.
- Default source base is the current `HEAD` unless `--base` is explicitly supplied.
- Default branch/path names are generated from a bounded objective slug plus collision-resistant worktree id.
- The default path is a sibling directory outside the source worktree, e.g. `../<repo-name>-worktrees/<slug>-<id>`.

### Dirty source handling

- By default, worktree preparation refuses to proceed if `git status --short --untracked-files=all` in the source worktree is non-empty.
- `--allow-dirty-source` permits creation from the selected base/HEAD but warns that uncommitted source changes are not copied into the new worktree.
- No auto-stash, auto-copy, or auto-commit behavior is included in the first pass.

### Session/adoption handoff

- First release does **not** silently spawn a new Pi agent/session.
- After worktree creation, the command/tool returns a precise handoff instruction to start Pi from the new worktree and adopt the prepared metadata.
- The adoption path creates the actual active `GoalState` in the worktree session, e.g. `/goal start --adopt-worktree --origin <repo-root> --worktree <path> --branch <branch> --worktree-id <id> -- <objective>`.
- Existing `/goal <objective>` behavior remains unchanged.
- If a future Pi API supports safe cwd-aware session replacement, that can be a later enhancement, not part of this first release.

### State, tool output, and UI

- Adopted worktree goals store bounded worktree binding metadata on `GoalState`:
  - worktree id;
  - origin repo root;
  - source branch and source HEAD;
  - base ref/base HEAD;
  - worktree path;
  - worktree branch;
  - created/adopted timestamps;
  - status such as `prepared`/`adopted`/`removed` if needed.
- No-worktree goals replay/render exactly as before.
- `get_goal` and related tool output summarize worktree path/branch when present.
- Compact UI/widget/footer may show only a short branch/path indicator to avoid crowding.
- If source-session launch records are kept, they live in a separate bounded custom-entry stream and must not pretend that the source session owns an active worktree goal.

### Cleanup safety

- Completing, pausing, clearing, or budget-limiting a goal never deletes a worktree.
- Any cleanup helper must be explicit and confirmation-gated.
- Cleanup must refuse dirty target worktrees unless a separate explicit force path is added later.
- First release may return manual cleanup instructions instead of implementing removal; if removal is implemented, it must be covered by cleanup safety proofs.

### ISSUE-019 boundary

ISSUE-018 owns safe creation/adoption metadata for one worktree goal. ISSUE-019 owns parallel/multiple active goals, automatic agent/session orchestration, aggregate UI, cross-goal scheduling, and parallel spend controls.

## Grounded research findings

Source artifact: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/02-grounded-research.md`.

Current facts:

- `command.ts` supports `pause`, `resume`, `clear`, and `queue`; there is no `start` subcommand or worktree option today.
- `tools.ts` exposes goal creation/update/clear and queue tools; there is no worktree tool today.
- `GoalState` has no worktree/session ownership fields today.
- `state.ts` persists and replays branch-local custom entries defensively, which is the right seam for bounded optional metadata.
- `lifecycle.ts` replays goal, monitor, and queue state on `session_start`/`session_tree`; no worktree ownership handling exists.
- Pi extension API exposes `pi.exec` for bounded command execution and `ctx.newSession`/`ctx.switchSession`, but the inspected type definitions did not expose a cwd override for new/switch session.
- The local repo currently has one Git worktree on `develop` at `/Users/bryan/dev/personal/experiments/pi-goals`.
- Sentrux planning sensor: `sentrux gate --save .pi/extensions/goal` exited `0` with quality `6241`.

## Locked design choices

Source artifact: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/03-design-lock.md`.

- Canonical command surface is `/goal start --worktree ... -- <objective>` plus an adoption path for the new worktree session.
- Worktree creation is extension-owned through bounded `pi.exec("git", ...)` calls.
- First release prepares and hands off; it does not silently spawn a paid/background Pi session.
- Generated branch/path names use bounded objective slugs plus a collision-resistant worktree id.
- Default worktree path is outside the source repo under a sibling worktrees directory.
- Dirty source worktrees block by default; explicit override warns and does not copy/stash changes.
- Completing/clearing a goal never deletes the worktree.
- Adopted goals store bounded worktree binding metadata on `GoalState`.
- Parallel/multiple goal orchestration is deferred to ISSUE-019.

Rejected alternatives:

- Make `/goal --worktree` the only surface.
- Overload `create_goal` with Git worktree mutation in the first pass.
- Require an external worktree helper before core UX exists.
- Manually ask the model to run raw `git worktree` commands.
- Switch the current Pi session into the worktree without a cwd-aware API.
- Spawn background Pi sessions with shell tricks.
- Auto-stash/copy dirty source changes.
- Auto-remove worktrees on goal complete.

## Implementation checklist

- [ ] Add worktree metadata types/caps to `.pi/extensions/goal/types.ts`.
- [ ] Add worktree metadata normalization/replay support in `.pi/extensions/goal/state.ts` without relying on broad unsafe object spread for new fields.
- [ ] Add a focused worktree helper module, e.g. `.pi/extensions/goal/worktree.ts`, for slug/id generation, path/branch validation, preflight, and Git command wrappers.
- [ ] Add `/goal start --worktree ...` parsing in `.pi/extensions/goal/command.ts` while keeping existing `/goal <objective>` behavior unchanged.
- [ ] Add `/goal start --adopt-worktree ...` or equivalent adoption path that creates the active goal with worktree binding metadata from inside the worktree session.
- [ ] Add a dedicated model tool such as `prepare_goal_worktree` with explicit-use guidelines and structured errors.
- [ ] Ensure worktree preparation refuses dirty source state by default and supports explicit `--allow-dirty-source` warning behavior.
- [ ] Ensure branch/path collisions fail without mutation.
- [ ] Ensure source-session preparation does not schedule continuation, start queued work, mark goals complete, or pretend a background agent was launched.
- [ ] Extend `tool-results.ts`, `format.ts`, `ui.ts`, and `widget.ts` with compact worktree metadata rendering where applicable.
- [ ] Update README with worktree command/tool behavior, dirty-source rule, handoff/adoption flow, and cleanup policy.
- [ ] Add deterministic probes under `.ai/validation/` matching required proofs.
- [ ] Add a bounded disposable live worktree probe with cleanup.
- [ ] Run `npm run quality:goal`.

## Acceptance criteria

- Existing `/goal <objective>` behavior remains backward compatible.
- `/goal start --worktree -- <objective>` creates a Git worktree only after preflight succeeds.
- Worktree branch/path generation is bounded, readable, unique enough to avoid collisions, and collision-checked before mutation.
- Dirty source worktrees block by default; explicit override warns that dirty changes are not copied.
- The command/tool returns an explicit handoff/adoption instruction and does not silently spawn a background Pi/model session.
- Adoption creates an active goal in the worktree session with persisted worktree metadata.
- `get_goal`/UI summaries show associated worktree metadata when present and stay unchanged for normal goals.
- Completion, pause, budget limit, clear, and queue steering do not remove the worktree.
- Cleanup, if implemented, is explicit and refuses dirty target worktrees by default.
- README documents the feature and safety model.
- `npm run quality:goal` passes.

## Proof threat model

Source artifact: `.ai/docs/issue-workflow/ISSUE-018-goal-start-in-worktree/04-proof-threat-model.md`.

Primary invariant: a worktree-start flow must isolate a new goal into an explicit Git worktree without losing or mixing user work, without silently spawning paid/background sessions, and with enough durable metadata for proof/audit/history surfaces to resolve the correct worktree cwd later.

High-risk false greens:

- The command appears to create a worktree goal but starts the goal in the source cwd.
- Dirty source changes are silently omitted without warning/override.
- Branch/path collisions overwrite or confuse existing worktrees.
- Completion or clear deletes the worktree.
- Worktree metadata is not persisted/replayed.
- Implementation auto-spawns a background model process without explicit user action.

## TOON synthesis

```toon
toon.version: 1
issue{id,status,target_session,goal}:
  "ISSUE-018","execution-ready-first-pass","implement safe worktree preparation and adoption","isolate a persistent pi-goal into an explicit Git worktree without silent spawning or cleanup surprises"
locked_requirements[7]{id,requirement}:
  "lr1","/goal start --worktree prepares a Git worktree through bounded extension-owned Git commands"
  "lr2","dirty source worktrees block by default and require explicit override with warning"
  "lr3","branch/path names are bounded, collision-resistant, human-readable, and collision-checked"
  "lr4","first release returns explicit handoff/adoption instructions instead of silently spawning a background Pi session"
  "lr5","adopted worktree goals persist origin/path/branch/base metadata on GoalState"
  "lr6","complete, pause, budget limit, clear, and queue steering never delete worktrees"
  "lr7","parallel/multiple goal orchestration remains deferred to ISSUE-019"
invariants[6]{id,invariant}:
  "inv1","normal /goal objective creation remains backward compatible"
  "inv2","source dirty state is never hidden when creating a worktree from HEAD/base"
  "inv3","source session does not claim to own active work happening in another cwd"
  "inv4","worktree metadata is bounded and replay-safe"
  "inv5","cleanup is explicit and refuses dirty targets by default"
  "inv6","no automatic paid/background model session is spawned by worktree preparation"
implementation_surfaces[7]{id,path,change}:
  "s1",".pi/extensions/goal/types.ts","add bounded worktree binding metadata types"
  "s2",".pi/extensions/goal/state.ts","normalize/replay optional worktree metadata safely"
  "s3",".pi/extensions/goal/worktree.ts","add Git worktree planning/preflight/create helpers"
  "s4",".pi/extensions/goal/command.ts","add start --worktree and adopt-worktree command paths"
  "s5",".pi/extensions/goal/tools.ts","register prepare_goal_worktree or delegate to a worktree tool module"
  "s6",".pi/extensions/goal/tool-results.ts","include compact worktree metadata in tool results"
  "s7","README.md","document worktree start, dirty-source behavior, handoff, and cleanup policy"
verification_checks[6]{id,check,evidence}:
  "v1","safe names and path/branch collision refusal","deterministic plan/collision probes"
  "v2","dirty source blocks by default and override warns","dirty-source probe"
  "v3","adopted GoalState persists worktree binding through replay","adoption replay probe"
  "v4","prepare command/tool does not schedule continuation or background session","command/tool side-effect probe"
  "v5","complete/clear do not remove worktree","cleanup safety probe"
  "v6","real disposable Git worktree can be created, verified, and cleaned by the test fixture","live disposable worktree probe"
```

## Required proofs

```toon
toon.version: 1
required_proofs[7]{name,source,command,pass_condition,scope,notes}:
  "quality_goal","ISSUE-018","cd /Users/bryan/dev/personal/experiments/pi-goals && npm run quality:goal","exit 0","run","full extension quality gate after implementation"
  "worktree_plan_probe","ISSUE-018","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-worktree-plan-probe.mjs","exit 0 and output includes PASS worktree_plan_safe_names","run","must fail if generated branch/path/id values are unsafe, unbounded, or collide silently"
  "dirty_source_probe","ISSUE-018","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-worktree-dirty-source-probe.mjs","exit 0 and output includes PASS dirty_source_blocks_by_default","run","must fail if dirty source worktrees are created without explicit override/warning"
  "collision_probe","ISSUE-018","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-worktree-collision-probe.mjs","exit 0 and output includes PASS worktree_collisions_refuse_overwrite","run","must fail if branch/path collisions overwrite or reuse existing targets"
  "adoption_replay_probe","ISSUE-018","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-worktree-adoption-replay-probe.mjs","exit 0 and output includes PASS worktree_binding_replays","run","must fail if adopted GoalState loses worktree path/branch/origin metadata"
  "cleanup_safety_probe","ISSUE-018","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-worktree-cleanup-safety-probe.mjs","exit 0 and output includes PASS complete_clear_do_not_remove_worktree","run","must fail if completion/clear deletes or schedules deletion of the worktree"
  "live_disposable_worktree_probe","ISSUE-018","cd /Users/bryan/dev/personal/experiments/pi-goals && node .ai/validation/goal-worktree-live-probe.mjs","exit 0 and output includes PASS disposable_worktree_created_and_cleaned","run","must create a disposable worktree/branch, verify isolation, and clean up its own fixture"
```

## Non-goals for first implementation

- Parallel/multiple active goals or automatic multi-agent orchestration; see ISSUE-019.
- Silent background Pi/model process spawning.
- Automatic merge, PR creation, or branch deletion.
- Auto-stash, auto-copy, or auto-commit of dirty source changes.
- Auto-removal of worktrees on goal complete/clear.
- Full worktree lifecycle dashboard beyond compact metadata rendering.
