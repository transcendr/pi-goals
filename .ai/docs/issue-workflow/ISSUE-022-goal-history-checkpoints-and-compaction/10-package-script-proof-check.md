# 10 — Package script proof check for ISSUE-022

## Source inspected

- `package.json`

## Relevant scripts

```json
{
  "typecheck:goal": "tsc --noEmit --target ES2022 --module ESNext --moduleResolution node --ignoreDeprecations 6.0 --types node --strict --skipLibCheck .pi/extensions/goal/*.ts",
  "slop:goal": "if rg -n 'as unknown as|as any' .pi/extensions/goal; then exit 1; else exit 0; fi",
  "quality:goal": "sentrux gate .pi/extensions/goal && sentrux check .pi/extensions/goal && npm run slop:goal && npm run typecheck:goal && pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models >/tmp/pi-goal-quality-load.txt"
}
```

## Finding

The canonical issue's `quality_goal` proof command is valid for this repository. `npm run quality:goal` covers:

- Sentrux structural gate against `.pi/extensions/goal`;
- Sentrux rule check against `.pi/extensions/goal`;
- TypeScript escape-hatch slop guard for `.pi/extensions/goal`;
- strict TypeScript validation for goal extension files;
- Pi extension load validation through `pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models`.

## Impact on issue

ISSUE-022's first proof row should stay `quality_goal` rather than split into separate required proof rows. The issue-specific probes should focus on checkpoint/history invariants; `quality_goal` remains the full integration/quality gate after implementation.
