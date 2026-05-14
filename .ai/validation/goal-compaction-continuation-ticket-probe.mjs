#!/usr/bin/env node
import fs from 'node:fs';
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
const continuation = fs.readFileSync('.pi/extensions/goal/continuation.ts','utf8');
const ticket = fs.readFileSync('.pi/extensions/goal/continuation-ticket.ts','utf8');
assert('compaction still prequeues queue handoff for survival through ticket dispatch', /prequeueCompactionWork/.test(continuation) && /decideCompactionQueueHandoffTicket/.test(continuation) && /dispatchContinuationTicket\(pi, ticket\)/.test(continuation));
assert('continuation ticket revalidation excludes action status', !/postCompletionActions|contextResetStatus|failed|skipped/.test(ticket));
assert('ticket helper supports force/followUp delivery used by compaction', /force\?: boolean/.test(ticket) && /deliverAs\?: "steer" \| "followUp"/.test(ticket));
console.log('PASS goal_compaction_continuation_ticket_probe');
