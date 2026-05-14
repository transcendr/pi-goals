#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';
const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { decideTerminalContinuationTicket, revalidateContinuationTicket } = jiti('./.pi/extensions/goal/continuation-ticket.ts');
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
const goal = { goalId:'g1', objective:'done', status:'complete', tokensUsed:0, timeUsedSeconds:0, createdAt:1, updatedAt:2, postCompletionActions:[{ id:'a1', type:'context.reset', mode:'clear', status:'failed' }] };
const queue = [{ queueId:'q1', objective:'next', source:'tool', createdAt:3 }];
const ticket = decideTerminalContinuationTicket(goal, queue, { triggerTurn:true });
assert('ticket captures queue head and goal before actions', ticket.kind === 'queueHandoff' && ticket.goalId === 'g1' && ticket.queueId === 'q1' && ticket.reason === 'goal-complete');
assert('failed action does not invalidate ticket', revalidateContinuationTicket(ticket, goal, queue).ok);
assert('queue head change invalidates ticket', !revalidateContinuationTicket(ticket, goal, [{ ...queue[0], queueId:'q2' }]).ok);
assert('goal change invalidates ticket', !revalidateContinuationTicket(ticket, { ...goal, goalId:'g2' }, queue).ok);
console.log('PASS goal_continuation_ticket_probe');
