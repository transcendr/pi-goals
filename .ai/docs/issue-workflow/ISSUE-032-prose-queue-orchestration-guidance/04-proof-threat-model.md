# 04 — Proof Threat Model

## Primary invariant

Queued-goal steering must help the agent choose the correct handoff mode for the queue head:

- direct queued goals are started atomically with `start_queued_goal`;
- prose/JIT orchestration queue items are interpreted semantically from current context and remain queued until the requested orchestration work is satisfied.

## Likely false-green outcomes

false_greens[6]{id,risk,why_shallow_checks_miss_it}:
  "fg1","steering still says only start_queued_goal","existing queue tests may pass direct handoff while orchestration prose remains under-guided"
  "fg2","guidance exists only in template branch","template-origin probe passes but plain prose orchestration still lacks instructions"
  "fg3","guidance tells agent to dequeue too early","manual flow appears green but orchestration queue item can be lost before created goals finish"
  "fg4","implementation adds brittle prose parsing","one example phrase works while the general flexible-prose invariant is violated"
  "fg5","implementation adds unnecessary specialized tools","feature works but contradicts locked minimal-tool design"
  "fg6","quality gate passes without behavior coverage","TypeScript and Sentrux cannot prove prompt guidance semantics"

## Proof strategy

- Deterministic focused probe for steering content is sufficient for the prompt-builder behavior because the target change is injected text/guidance, not live UI timing or queue persistence.
- Existing queue handoff probes should continue to cover stale guard and template metadata behavior.
- Full `npm run quality:goal` is required because this repo treats it as the combined architecture/type/load gate.
- No live disposable Pi session is strictly required for this first pass because the recently validated live behavior already covers `start_queued_goal`; this issue only adds steering guidance. A live queue smoke test is useful but optional unless implementation changes more than prompt text/probes.

## Required proof rows to include in the issue

required_proofs[3]{name,source,command,pass_condition,scope,notes}:
  "queue_orchestration_steer_probe","issue doc","NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-orchestration-steer-probe.cjs","exit 0; non-template steering includes direct-vs-orchestration guidance, existing-tool guidance, multi-goal-before-dequeue guidance, and no parser/reorder assumptions",run,"focused behavior proof for the new requirement"
  "queue_template_steer_probe","issue doc","NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-template-steer-probe.cjs","exit 0; template-origin steering still includes start_queued_goal and create_goal_from_template fallback",run,"regression proof for existing template metadata behavior"
  "quality_goal","issue doc","npm run quality:goal","exit 0; Sentrux gate/check, slop guard, TypeScript validation, and Pi extension load validation pass",run,"project required gate"

## Adequacy check

These proofs would fail if the primary invariant were still broken because:

- the new focused probe checks plain/non-template steering, where prose orchestration lives;
- the template probe prevents regressing structured template metadata guidance while adding unconditional prose guidance;
- the quality gate catches architectural/type/load regressions in `.pi/extensions/goal`.
