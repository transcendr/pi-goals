# 04 — Proof threat model

Primary invariant:
- `/goal queue <template-prefix>` exposes the same fuzzy reusable-template autocomplete candidates as root `/goal <template-prefix>`, with queue-prefixed completion values.

False-green risks:
- Root template autocomplete still works but queue autocomplete returns `null`.
- Queue autocomplete suggests the `queue` subcommand only, not templates.
- Queue template completions return bare template names, causing insertion to replace `queue` instead of completing after it.
- Matching by template name works but aliases do not.
- Fix breaks root subcommand/template autocomplete.

Proof strategy:
- Add focused autocomplete probe that imports `goalArgumentCompletions()`.
- Create temporary `.pi-goals` templates with aliases.
- Assert root query returns template candidate.
- Assert `queue <prefix>` returns the same template candidate with `value` prefixed by `queue `.
- Assert alias matching works after queue.
- Run full quality gate.

required_proofs[2]{name,command,condition}:
  queue_template_autocomplete_probe,"NODE_PATH=/Users/bryan/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-queue-template-autocomplete-probe.cjs","exit 0; queue template autocomplete matches names aliases and returns queue-prefixed values"
  quality_goal,"npm run quality:goal","exit 0; Sentrux slop TypeScript and Pi load gates pass"
