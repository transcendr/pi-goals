#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';

const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { CONTINUATION_MESSAGE_TYPE } = jiti('./.pi/extensions/goal/constants.ts');
const { beginGoalCompaction, finishGoalCompaction, resetContinuationRuntime, setCompactionFallbackRetryDelaysForTests } = jiti('./.pi/extensions/goal/continuation.ts');
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

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function makePi() {
  return {
    messages: [],
    entries: [],
    sendMessage(message, options) { this.messages.push({ message, options }); },
    appendEntry(customType, data) { this.entries.push({ customType, data }); },
  };
}

const goal = {
  goalId: 'goal-retry',
  objective: 'retry after compaction',
  status: 'active',
  tokensUsed: 0,
  timeUsedSeconds: 0,
  createdAt: 1,
  updatedAt: 1,
};

resetContinuationRuntime();
setCompactionFallbackRetryDelaysForTests([0, 0, 0, 0]);
setQueueForTests({ queue: [] });
setRuntimeStateForTests({ goal, telemetry: createTelemetry(goal.goalId, 1) });
const pi = makePi();
const beforeCtx = { isIdle: () => true, hasPendingMessages: () => false };
const idleValues = [false, true, true];
const pendingValues = [false, true, false];
const afterCtx = {
  isIdle: () => idleValues.length ? idleValues.shift() : true,
  hasPendingMessages: () => pendingValues.length ? pendingValues.shift() : false,
};

beginGoalCompaction(pi, beforeCtx);
assert('idle precompact does not send immediate passive message', pi.messages.length === 0);
finishGoalCompaction(pi, afterCtx);
await sleep(30);

assert('retry eventually sends one continuation', pi.messages.length === 1);
const sent = pi.messages[0];
assert('retry sends continuation message type', sent?.message.customType === CONTINUATION_MESSAGE_TYPE);
assert('retry triggers follow-up turn when idle and no pending messages', sent?.options.triggerTurn === true && sent?.options.deliverAs === 'followUp');
assert('retry recorded multiple attempts', pi.entries.some((entry) => entry.data?.lastCompactionContinuationAttempts >= 2 || entry.data?.telemetry?.lastCompactionContinuationAttempts >= 2));

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS goal_postcompact_retry_transient_skip');
