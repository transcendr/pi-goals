#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';
const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { getGoalFeatureFlags } = jiti('./.pi/extensions/goal/feature-flags.ts');
const { createNoopPostCompletionActionRunner } = jiti('./.pi/extensions/goal/post-completion-actions.ts');
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
assert('flags default on except clear reset', getGoalFeatureFlags({}).postCompletionActions === true && getGoalFeatureFlags({}).contextReset === true && getGoalFeatureFlags({}).contextResetClear === false);
for (const value of ['0','false','no','off','FALSE']) {
  const flags = getGoalFeatureFlags({ PI_GOAL_POST_COMPLETION_ACTIONS:value, PI_GOAL_CONTEXT_RESET:value });
  assert(`disabled value ${value}`, flags.postCompletionActions === false && flags.contextReset === false && flags.contextResetClear === false);
}
assert('explicit clear reset enable', getGoalFeatureFlags({ PI_GOAL_CONTEXT_RESET_CLEAR:'true' }).contextResetClear === true);
assert('unknown values stay enabled except clear', getGoalFeatureFlags({ PI_GOAL_POST_COMPLETION_ACTIONS:'typo', PI_GOAL_CONTEXT_RESET:'1', PI_GOAL_CONTEXT_RESET_CLEAR:'typo' }).postCompletionActions === true && getGoalFeatureFlags({ PI_GOAL_CONTEXT_RESET_CLEAR:'typo' }).contextResetClear === false);
const runner = createNoopPostCompletionActionRunner('disabled');
const result = await runner.run({ goal:{}, action:{ id:'a1', type:'context.reset', mode:'clear', status:'pending' }, ctx:{} });
assert('noop runner skips action successfully', result.ok && result.status === 'skipped');
console.log('PASS goal_post_completion_feature_flag_probe');
