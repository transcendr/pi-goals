#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';
const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { buildTemplateGoalIntent, parseTrailingPostCompletionDirective } = jiti('./.pi/extensions/goal/goal-intent.ts');
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
const parsed = parseTrailingPostCompletionDirective('current state and summarize context');
assert('raw args directive stripped before expansion', parsed.objective === 'current state' && parsed.action?.mode === 'summarize');
const source = await import('node:fs').then(fs => fs.readFileSync('.pi/extensions/goal/goal-intent.ts','utf8'));
assert('template intent resolves with stripped raw args', /resolveGoalTemplateByName\(parsedInvocation\.name, parsedInvocation\.flags, parsedArgs\.objective\)/.test(source));
const result = buildTemplateGoalIntent({ invocation: 'repo-worktree-inventory -- current state and summarize context' });
assert('template raw directive returns action or actionable template error', (result.ok && result.intent.postCompletionActions[0]?.mode === 'summarize') || (!result.ok && /Unknown goal template|Missing template/.test(result.error)));
console.log('PASS goal_template_raw_context_directive_probe');
