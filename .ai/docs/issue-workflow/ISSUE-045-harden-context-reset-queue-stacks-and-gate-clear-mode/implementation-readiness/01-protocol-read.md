# 01 — Protocol read

## Files/resources read

Project/workflow:

- `AGENTS.md`
- `.ai/.pi-goals/implementation-ready-issue.md`
- `.ai/issues/open/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/00-request.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/01-protocol-read.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/02-grounded-research.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/03-design-lock.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/04-proof-threat-model.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/05-issue-writeback.md`
- `.ai/docs/issue-workflow/ISSUE-045-harden-context-reset-queue-stacks-and-gate-clear-mode/execution-readiness/06-final-audit.md`
- `.ai/docs/live-probe-scenarios/post-completion-context-reset-full-suite.md`
- `/tmp/issue044-full-context-live-probe-20260514T215821Z/closeout.md`

Feature-workflow references, freshly present/read in this planning stack:

- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/canonical-issue-docs-and-toon-synthesis.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/research-pass.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/design-landscape-exploration-and-choice-locking.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/toon-for-issues-and-execution-planning.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/feature-workflow-pipelines/references/execution-planning-vs-implementation-planning.md`

Deslop/AXI:

- `/Users/bryan/.pi/agent/.cache/codex-skills/deslop/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/deslop/references/typescript.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/deslop/references/json.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/deslop/references/toml.md`
- `/Users/bryan/.agents/skills/axi/SKILL.md`
- `/Users/bryan/.pi/agent/.cache/codex-skills/axi-toon-cli/SKILL.md`

Deslop helper:

```bash
python3 /Users/bryan/.pi/agent/.cache/codex-skills/deslop/scripts/deslop-map.py .pi/extensions/goal
```

Result recorded in `raw/commands.log`; it selected TypeScript plus JSON/TOML because `.pi/extensions/goal` contains TypeScript source and Sentrux config/baseline files. Implementation surfaces are TypeScript; JSON/TOML refs are relevant only if validation artifacts or Sentrux config are touched.

## Extracted requirements

```toon
toon.version: 1
requirements[8]{id,requirement}:
  "r1","produce implementation-readiness artifacts 00 through 08 plus raw/commands.log"
  "r2","verify the issue is execution-ready before marking implementation-ready"
  "r3","name exact files/modules/functions to edit or create"
  "r4","write exact patch sequence and validation order"
  "r5","strengthen false-green proof coverage for exact implementation plan"
  "r6","write issue-specific deslop guidance map grounded in planned surfaces"
  "r7","validate changed TOON blocks"
  "r8","verify artifacts are visible to git/status and not ignored"
```

## TypeScript/deslop hazards to carry forward

- No `as unknown as` or `as any` in `.pi/extensions/goal`.
- Avoid optional-call no-op success assumptions around `ctx.navigateTree`, `sendQueueHandoff`, `persist*`, and UI notification paths.
- Avoid long positional wiring; use named runtime/deps objects for new terminal/repair helpers.
- Model runtime branch state with discriminated unions instead of loose booleans.
- Do not add speculative managers/factories; keep modules aligned with current architecture.
- Add behavior probes for queue repair/stale steer edge cases; do not rely on snapshots or source-string-only probes.
