#!/usr/bin/env node
import { createJiti } from 'jiti';
import path from 'node:path';

const jiti = createJiti(path.join(process.cwd(), 'probe.cjs'), { interopDefault: true });
const { CONTINUATION_MESSAGE_TYPE } = jiti('./.pi/extensions/goal/constants.ts');
const { beginGoalCompaction, finishGoalCompaction, resetContinuationRuntime, scheduleMaybeContinueGoal } = jiti('./.pi/extensions/goal/continuation.ts');
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
  goalId: 'goal-dedupe',
  objective: 'dedupe compaction continuation',
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
const idleCtx = { isIdle: () => true, hasPendingMessages: () => false };
const streamingCtx = { isIdle: () => false, hasPendingMessages: () => false };

scheduleMaybeContinueGoal(pi, idleCtx, 'agentEnd');
beginGoalCompaction(pi, streamingCtx);
finishGoalCompaction(pi, idleCtx);
await sleep(50);

assert('agentEnd timer canceled and prequeue sends only once', pi.messages.length === 1);
const continuationMessages = pi.messages.filter((item) => item.message.customType === CONTINUATION_MESSAGE_TYPE);
assert('only one continuation message exists', continuationMessages.length === 1);
assert('remaining continuation is compacted prequeue', continuationMessages[0]?.message.details?.reason === 'compacted');
assert('prequeued continuation does not trigger immediate fallback duplicate', continuationMessages[0]?.options.triggerTurn !== true);

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS goal_compaction_prequeue_dedupe');
