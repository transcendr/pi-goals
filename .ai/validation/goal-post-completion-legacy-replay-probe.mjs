#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';
const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { replayQueueState } = jiti('./.pi/extensions/goal/queue-state.ts');
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
const branch = [{ type:'custom', customType:'pi-goal-state', data:{ version:1, kind:'enqueue', reason:'enqueue', at:1, goal:{ queueId:'q1', objective:'legacy', source:'tool', createdAt:1, postCompletionContext:'summarize' } } }];
const state = replayQueueState({ sessionManager:{ getBranch(){ return branch; } } });
assert('legacy queued postCompletionContext synthesizes action spec', state.queue[0]?.postCompletionActions?.[0]?.mode === 'summarize');
const types = await import('node:fs').then(fs => fs.readFileSync('.pi/extensions/goal/types.ts','utf8'));
assert('GoalState retains legacy fields for ISSUE-043 replay', /postCompletionContext\?:/.test(types) && /contextResetStatus\?:/.test(types));
console.log('PASS goal_post_completion_legacy_replay_probe');
