#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';
const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { createContextResetActionRunner, captureContextResetCommandContext, clearContextResetCommandContext } = jiti('./.pi/extensions/goal/context-reset.ts');
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
clearContextResetCommandContext();
let runner = createContextResetActionRunner({ postCompletionActions:true, contextReset:false, contextResetClear:false });
let result = await runner.run({ goal:{ goalId:'g1' }, action:{ id:'a1', type:'context.reset', mode:'clear', status:'pending' }, ctx:{} });
assert('disabled context reset skips', result.ok && result.status === 'skipped');
runner = createContextResetActionRunner({ postCompletionActions:true, contextReset:true, contextResetClear:false });
result = await runner.run({ goal:{ goalId:'g1' }, action:{ id:'a1', type:'context.reset', mode:'summarize', status:'pending' }, ctx:{} });
assert('missing capability fails actionably', !result.ok && /requires/.test(result.message));
let navigated = false;
captureContextResetCommandContext({ navigateTree: async () => { navigated = true; return { cancelled:false }; } });
result = await runner.run({ goal:{ goalId:'g1' }, action:{ id:'a1', type:'context.reset', mode:'summarize', status:'pending', anchorEntryId:'leaf' }, ctx:{} });
assert('available context reset runs summarize adapter', result.ok && result.status === 'done' && navigated);
console.log('PASS goal_context_reset_action_runner_probe');
