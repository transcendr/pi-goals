# 04 — Proof threat model

Primary invariant:
- `/goal queue <text/template>` directly enqueues the resolved objective and never presents the Replace/Queue/Cancel prompt.

False-green risks:
- Test calls `handleQueueCommand()` directly and bypasses dispatch, missing the real bug.
- Test covers `/goal queue` list-only but not trailing text.
- Test checks enqueue count but not that `ctx.ui.select()` was not called.
- Template queue path enqueues raw invocation instead of resolved template text.

Proof strategy:
- Add a command dispatch probe that invokes registered `/goal` handler with `queue <text>` while an active goal exists.
- Stub `ctx.ui.select()` to fail if called.
- Assert queue length increases and active goal is unchanged.
- Include a template-backed queue case when practical.

required_proofs[2]{name,command,condition}:
  queue_direct_enqueue_probe,"NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-direct-enqueue-probe.cjs","exit 0; /goal queue text dispatch enqueues directly without select prompt"
  quality_goal,"npm run quality:goal","exit 0; Sentrux slop TypeScript and Pi load gates pass"
