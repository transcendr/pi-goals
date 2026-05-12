#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const continuation = readFileSync('.pi/extensions/goal/continuation.ts', 'utf8');
const telemetry = readFileSync('.pi/extensions/goal/telemetry.ts', 'utf8');
const types = readFileSync('.pi/extensions/goal/types.ts', 'utf8');

function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
  }
}
function index(name, needle) {
  const i = continuation.indexOf(needle);
  assert(`${name} present`, i >= 0);
  return i;
}

const begin = index('beginGoalCompaction', 'export function beginGoalCompaction');
const clear = index('pending continuation clear during compaction', 'clearTimeout(pendingContinuation.timer);\n\t\tpendingContinuation = undefined;');
const prequeue = index('prequeue compaction work', 'prequeueCompactionWork(pi, compactionWork)');
const finish = index('finishGoalCompaction', 'export function finishGoalCompaction');
const fallback = index('post-compaction fallback retry', 'scheduleCompactionFallbackRetry(pi, ctx, work);');
assert('begin clears stale pending timer before prequeue and finish fallback', begin >= 0 && clear > begin && prequeue > clear && finish > prequeue && fallback > finish);
assert('schedule path emits scheduled telemetry', /const telemetry = noteContinuationScheduled\(getTelemetry\(\), reason\);/.test(continuation));
assert('skip path emits skip telemetry', /const telemetry = noteContinuationSkipped\(getTelemetry\(\), reason\);/.test(continuation));
assert('compaction telemetry helper exists', /export function noteCompactionContinuation/.test(telemetry));
assert('telemetry stores compaction final reason', /lastCompactionContinuationFinalReason/.test(types));
assert('finish avoids duplicate fallback when prequeue sent', /if \(prequeuedCompactionKey === work\.key\) \{/.test(continuation));
assert('queue handoff key includes queue id', /function queueKey\(queueId: string\): string/.test(continuation));

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS goal_compaction_dedupe_telemetry');
console.log('PASS goal_compaction_dedupe_telemetry_probe');
