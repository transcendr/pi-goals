#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';
const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { getGoalFeatureFlags } = jiti('./.pi/extensions/goal/feature-flags.ts');
const { createContextResetActionRunner, captureContextResetCommandContext, clearContextResetCommandContext } = jiti('./.pi/extensions/goal/context-reset.ts');
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
const defaultFlags = getGoalFeatureFlags({});
assert('clear reset defaults disabled', defaultFlags.contextReset === true && defaultFlags.contextResetClear === false);
assert('explicit clear enable works', getGoalFeatureFlags({ PI_GOAL_CONTEXT_RESET_CLEAR:'1' }).contextResetClear === true);
for (const value of ['0','false','no','off','FALSE']) assert(`disabled clear value ${value}`, getGoalFeatureFlags({ PI_GOAL_CONTEXT_RESET_CLEAR:value }).contextResetClear === false);
let navigated = false;
clearContextResetCommandContext();
captureContextResetCommandContext({ navigateTree: async () => { navigated = true; return { cancelled:false }; } });
let runner = createContextResetActionRunner(defaultFlags);
let result = await runner.run({ goal:{ goalId:'g1' }, action:{ id:'a1', type:'context.reset', mode:'clear', status:'pending', anchorEntryId:'leaf' }, ctx:{} });
assert('disabled clear skips without navigating', result.ok && result.status === 'skipped' && /PI_GOAL_CONTEXT_RESET_CLEAR/.test(result.message ?? '') && navigated === false);
runner = createContextResetActionRunner(getGoalFeatureFlags({ PI_GOAL_CONTEXT_RESET_CLEAR:'true' }));
result = await runner.run({ goal:{ goalId:'g1' }, action:{ id:'a1', type:'context.reset', mode:'clear', status:'pending', anchorEntryId:'leaf' }, ctx:{} });
assert('explicitly enabled clear navigates', result.ok && result.status === 'done' && navigated === true);
console.log('PASS goal_context_reset_clear_default_off_probe');
