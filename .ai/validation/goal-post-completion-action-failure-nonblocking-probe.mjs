#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';
const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { processTerminalGoalWorkflow } = jiti('./.pi/extensions/goal/terminal-workflow.ts');
const { setRuntimeStateForTests } = jiti('./.pi/extensions/goal/state.ts');
const { setQueueForTests } = jiti('./.pi/extensions/goal/queue-state.ts');
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
const goal = { goalId:'g1', objective:'done', status:'complete', tokensUsed:0, timeUsedSeconds:0, createdAt:1, updatedAt:2, postCompletionActions:[{ id:'a1', type:'context.reset', mode:'clear', status:'pending' }] };
setRuntimeStateForTests({ goal, telemetry:null });
setQueueForTests({ queue:[{ queueId:'q1', objective:'next', source:'tool', createdAt:3 }] });
const pi = { entries:[], messages:[], appendEntry(type,data){ this.entries.push({ type, data }); }, sendMessage(message, options){ this.messages.push({ message, options }); } };
const ctx = { sessionManager:{ getLeafId(){ return 'leaf'; } }, ui:{ notify(){}, setStatus(){}, setWidget(){} } };
const runner = { async run(input){ return { ok:false, actionId:input.action.id, status:'failed', severity:'warning', message:'forced failure' }; } };
await processTerminalGoalWorkflow(pi, ctx, { goal, reason:'tool', runner, triggerTurn:true });
assert('failed action state persisted', pi.entries.some(e => e.data?.goal?.postCompletionActions?.some(a => a.status === 'failed' && /forced/.test(a.failure ?? ''))));
assert('queue handoff still dispatched', pi.messages.some(m => m.message.customType === 'pi-goal-queue-steer' && m.options?.triggerTurn === true));
console.log('PASS goal_post_completion_action_failure_nonblocking_probe');
