#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';
const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { replayQueueState, getQueue, restoreQueueHeadForRepair } = jiti('./.pi/extensions/goal/queue-state.ts');
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
assert('repair helper exported', typeof restoreQueueHeadForRepair === 'function');
const enqueueEntry = { type:'custom', customType:'pi-goal-state', data:{ version:1, kind:'enqueue', queueId:'q-after', reason:'enqueue', at:2, goal:{ queueId:'q-after', objective:'queued after branch point', source:'tool', createdAt:2 } } };
replayQueueState({ sessionManager:{ getBranch(){ return [enqueueEntry]; } } });
assert('branch containing enqueue replays queue', getQueue()[0]?.queueId === 'q-after');
replayQueueState({ sessionManager:{ getBranch(){ return []; } } });
assert('manual branch replay before enqueue removes queue mutation', getQueue().length === 0);
const pi = { entries:[], appendEntry(type,data){ this.entries.push({ type, data }); } };
const repaired = restoreQueueHeadForRepair(pi, { queueId:'q-after', objective:'queued after branch point', source:'tool', createdAt:2 }, 'explicit_automated_reset_repair');
assert('queue returns only through explicit automated repair helper', repaired.status === 'restored' && getQueue()[0]?.queueId === 'q-after');
console.log('PASS goal_queue_manual_tree_replay_probe');
