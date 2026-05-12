#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';

const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { QUEUE_MESSAGE_TYPE } = jiti('./.pi/extensions/goal/constants.ts');
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

function makeGoal(status) {
  return {
    goalId: `goal-${status}`,
    objective: 'queue handoff after compaction',
    status,
    tokensUsed: 0,
    timeUsedSeconds: 0,
    createdAt: 1,
    updatedAt: 1,
  };
}

const queued = { queueId: 'q-precompact', objective: 'next queued goal', source: 'tool', createdAt: 2 };

resetContinuationRuntime();
const completeGoal = makeGoal('complete');
setRuntimeStateForTests({ goal: completeGoal, telemetry: createTelemetry(completeGoal.goalId, 1) });
setQueueForTests({ queue: [queued] });
const pi = makePi();
const ctx = { isIdle: () => false, hasPendingMessages: () => false };
beginGoalCompaction(pi, ctx);
finishGoalCompaction(pi, ctx);

assert('completed goal with queue sends exactly one message', pi.messages.length === 1);
const sent = pi.messages[0];
assert('completed goal sends queue steering message type', sent?.message.customType === QUEUE_MESSAGE_TYPE);
assert('completed goal queues current queue head', sent?.message.details?.queueId === queued.queueId);
assert('completed goal uses followUp delivery for compaction survival', sent?.options.deliverAs === 'followUp');
assert('completed goal does not trigger immediate non-streaming turn', sent?.options.triggerTurn !== true);

resetContinuationRuntime();
const pausedGoal = makeGoal('paused');
setRuntimeStateForTests({ goal: pausedGoal, telemetry: createTelemetry(pausedGoal.goalId, 1) });
setQueueForTests({ queue: [queued] });
const pausedPi = makePi();
beginGoalCompaction(pausedPi, ctx);
assert('paused goal with queue does not prequeue', pausedPi.messages.length === 0);

resetContinuationRuntime();
setRuntimeStateForTests({ goal: completeGoal, telemetry: createTelemetry(completeGoal.goalId, 1) });
setQueueForTests({ queue: [] });
const emptyPi = makePi();
beginGoalCompaction(emptyPi, ctx);
assert('completed goal without queue does not prequeue', emptyPi.messages.length === 0);

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS goal_precompact_completed_queue_handoff');
