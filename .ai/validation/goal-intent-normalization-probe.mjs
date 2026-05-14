#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';
const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { buildDirectGoalIntent, buildTemplateGoalIntent } = jiti('./.pi/extensions/goal/goal-intent.ts');
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
const direct = buildDirectGoalIntent({ objective: 'ship docs and summarize context' });
assert('direct parses trailing summarize', direct.ok && direct.intent.postCompletionActions[0]?.mode === 'summarize' && direct.intent.objective === 'ship docs');
const negative = buildDirectGoalIntent({ objective: 'write about how to summarize context carefully' });
assert('non-trailing mention is preserved', negative.ok && negative.intent.postCompletionActions.length === 0 && /summarize context/.test(negative.intent.objective));
const conflict = buildDirectGoalIntent({ objective: 'ship and clear context', postCompletionActions: [{ type: 'context.reset', mode: 'summarize' }] });
assert('conflicting prose and structured actions reject', !conflict.ok && /Conflicting/.test(conflict.error));
const structured = buildDirectGoalIntent({ objective: 'ship', postCompletionContext: 'clear' });
assert('structured context normalizes', structured.ok && structured.intent.postCompletionActions[0]?.mode === 'clear');
const template = buildTemplateGoalIntent({ invocation: 'repo-worktree-inventory -- current state and summarize context' });
assert('template-shaped invocation handled without parser crash', template.ok || /Unknown goal template|Missing template/.test(template.error));
console.log('PASS goal_intent_normalization_probe');
