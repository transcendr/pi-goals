# 04-proof-threat-model — adversarial validation design

## Step actually performed

Built proof expectations around the user-visible invariant instead of generic green checks.

## Primary invariant

```toon
invariant{id,text}:
  line_safe_widget,"renderGoalWidget() must never return strings with embedded CR/LF and must keep every returned line within width for any objective text"
```

## False-green risks

```toon
false_greens[5]{id,risk,proof_countermeasure}:
  fg1,"test only long single-line objectives","probe must use short multiline objective"
  fg2,"fix normal card width but miss compact mode","probe must render both normal and compact widths"
  fg3,"sanitize after padding/truncation math","code review plus width assertions catch broken line construction"
  fg4,"Pi extension loads but widget invariant still broken","focused widget probe required"
  fg5,"reject multiline objectives instead of fixing rendering","acceptance criteria require multiline objectives remain valid"
```

## Required proof rows

```toon
required_proofs[4]{name,command,condition}:
  widget_multiline_probe,"NODE_PATH=~/dev/_state/personal/npm-tools/pi/lib/node_modules/@earendil-works/pi-coding-agent/node_modules node /tmp/pi-goal-widget-multiline-probe.cjs",exit 0
  quality_goal,"npm run quality:goal",exit 0
  no_escape_hatch_casts,"npm run slop:goal",exit 0
  pi_load,"pi --offline --no-session --no-tools -e .pi/extensions/goal/index.ts --list-models",exit 0
```
