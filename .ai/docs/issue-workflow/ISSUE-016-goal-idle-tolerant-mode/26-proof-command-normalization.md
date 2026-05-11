# 26 — Proof command normalization

## Source inspected

- `package.json`

## Existing quality gate

`npm run quality:goal` expands to:

```bash
sentrux gate .pi/extensions/goal && sentrux check .pi/extensions/goal && npm run slop:goal && npm run typecheck:goal && pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models >/tmp/pi-goal-quality-load.txt
```

## Required proof policy for ISSUE-016 executor

- Keep `npm run quality:goal` as the final full gate.
- Add idle-nudge deterministic probes either as individually invoked `.ai/validation/*.mjs` scripts or wire them into `quality:goal` if the project chooses to make them permanent.
- Do not weaken `slop:goal`; idle policy implementation must avoid `as unknown as` and `as any` in `.pi/extensions/goal`.
- If validation scripts import extension internals, prefer simple static/behavior probes that fail loudly with specific `PASS`/`FAIL` labels, matching current `.ai/validation` style.

## Execution-ready conclusion

The proof commands in the issue are concrete enough for an executor to implement failing-first probes, then satisfy them during implementation.
