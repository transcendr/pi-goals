#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';
const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { sendQueueSteering, queueSteeringStillValid } = jiti('./.pi/extensions/goal/queue-steering.ts');
const { setQueueForTests, getQueueRevision, dequeueGoal } = jiti('./.pi/extensions/goal/queue-state.ts');
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
assert('queue revision exported', typeof getQueueRevision === 'function');
setQueueForTests({ queue:[{ queueId:'q1', objective:'next', source:'tool', createdAt:1 }], revision:5 });
const pi = { messages:[], sendMessage(message, options){ this.messages.push({ message, options }); } };
sendQueueSteering(pi, 'goal-complete');
const message = pi.messages[0]?.message;
assert('fresh queue steer carries revision', typeof message?.details?.queueRevision === 'number' && message.details.queueRevision === getQueueRevision());
assert('fresh queue steer is valid', queueSteeringStillValid(message));
assert('legacy queue steer without revision is invalid', !queueSteeringStillValid({ details:{ queueId:'q1' } }));
const oldRevision = message.details.queueRevision;
dequeueGoal();
assert('dequeue increments queue revision', getQueueRevision() > oldRevision);
assert('old queue steer invalid after dequeue', !queueSteeringStillValid(message));
console.log('PASS goal_queue_steer_generation_probe');
