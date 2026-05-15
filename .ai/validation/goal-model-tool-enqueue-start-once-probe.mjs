#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';
const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { registerGoalQueueTools } = jiti('./.pi/extensions/goal/queue-tools.ts');
const { setRuntimeStateForTests } = jiti('./.pi/extensions/goal/state.ts');
const { setQueueForTests, getQueue, getQueueRevision } = jiti('./.pi/extensions/goal/queue-state.ts');
const { sendQueueSteering, queueSteeringStillValid } = jiti('./.pi/extensions/goal/queue-steering.ts');
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
assert('queue revision exported', typeof getQueueRevision === 'function');
const completed = { goalId:'g-complete', objective:'done', status:'complete', tokensUsed:0, timeUsedSeconds:0, createdAt:1, updatedAt:2 };
setRuntimeStateForTests({ goal: completed, telemetry:null });
setQueueForTests({ queue:[{ queueId:'q1', objective:'count to 2', source:'tool', createdAt:3 }], revision:1 });
const piForSteer = { messages:[], sendMessage(message, options){ this.messages.push({ message, options }); } };
sendQueueSteering(piForSteer, 'goal-complete');
const staleMessage = piForSteer.messages[0]?.message;
const tools = new Map();
const pi = { entries:[], registerTool(tool){ tools.set(tool.name, tool); }, appendEntry(type,data){ this.entries.push({ type, data }); } };
registerGoalQueueTools(pi, {});
const startTool = tools.get('start_queued_goal');
assert('start queued tool registered', Boolean(startTool));
const ctx = { sessionManager:{ getLeafId(){ return 'leaf'; } }, ui:{ setStatus(){}, setWidget(){}, notify(){} } };
const result = await startTool.execute('call-1', {}, undefined, undefined, ctx);
assert('started goal records sourceQueueId', result.details?.goal?.sourceQueueId === 'q1');
assert('queue item consumed once', getQueue().length === 0 && result.details?.started?.queueId === 'q1');
assert('dequeue event persisted with q1', pi.entries.some(e => e.data?.kind === 'dequeue' && e.data?.queueId === 'q1'));
assert('stale queue steer invalid after start/dequeue', !queueSteeringStillValid(staleMessage));
console.log('PASS goal_model_tool_enqueue_start_once_probe');
