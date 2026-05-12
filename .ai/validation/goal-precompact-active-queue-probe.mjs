#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';

const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { CONTINUATION_MESSAGE_TYPE } = jiti('./.pi/extensions/goal/constants.ts');
const { beginGoalCompaction, finishGoalCompaction, resetContinuationRuntime } = jiti('./.pi/extensions/goal/continuation.ts');
const { setRuntimeStateForTests } = jiti('./.pi/extensions/goal/state.ts');
const { createTelemetry } = jiti('./.pi/extensions/goal/telemetry.ts');
const { setQueueForTests } = jiti('./.pi/extensions/goal/queue-state.ts');

function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
  }
}

function makePi() {
  return {
    messages: [],
    entries: [],
    sendMessage(message, options) { this.messages.push({ message, options }); },
    appendEntry(customType, data) { this.entries.push({ customType, data }); },
  };
}

const goal = {
  goalId: 'goal-active-precompact',
  objective: 'continue after compaction',
  status: 'active',
  tokensUsed: 0,
  timeUsedSeconds: 0,
  createdAt: 1,
  updatedAt: 1,
};

resetContinuationRuntime();
setQueueForTests({ queue: [] });
setRuntimeStateForTests({ goal, telemetry: createTelemetry(goal.goalId, 1) });
const pi = makePi();
const ctx = { isIdle: () => false, hasPendingMessages: () => false };
beginGoalCompaction(pi, ctx);
finishGoalCompaction(pi, ctx);

assert('active precompact sends exactly one message', pi.messages.length === 1);
const sent = pi.messages[0];
assert('active precompact uses continuation message type', sent?.message.customType === CONTINUATION_MESSAGE_TYPE);
assert('active precompact hides continuation', sent?.message.display === false);
assert('active precompact marks compacted reason', sent?.message.details?.reason === 'compacted');
assert('active precompact uses followUp delivery', sent?.options.deliverAs === 'followUp');
assert('active precompact does not trigger immediate non-streaming turn', sent?.options.triggerTurn !== true);
assert('finish after prequeue does not duplicate', pi.messages.length === 1);

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS goal_precompact_active_queues_followup');
