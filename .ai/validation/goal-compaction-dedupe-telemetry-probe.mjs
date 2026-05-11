#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const continuation = readFileSync('.pi/extensions/goal/continuation.ts', 'utf8');

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
const finish = index('finishGoalCompaction', 'export function finishGoalCompaction');
const schedule = index('post-compaction schedule reason', 'scheduleMaybeContinueGoal(pi, ctx, "compacted");');
assert('begin clears stale pending timer before finish schedules replacement', begin >= 0 && clear > begin && finish > clear && schedule > finish);
assert('schedule path emits scheduled telemetry', /const telemetry = noteContinuationScheduled\(getTelemetry\(\), reason\);/.test(continuation));
assert('skip path emits skip telemetry', /const telemetry = noteContinuationSkipped\(getTelemetry\(\), reason\);/.test(continuation));
assert('finish only schedules active goal', /if \(!goal \|\| goal\.status !== "active"\) return;/.test(continuation));
assert('finish refuses mismatched deferred goal', /if \(deferredGoalId && deferredGoalId !== goal\.goalId\) return;/.test(continuation));

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS goal_compaction_dedupe_telemetry');
console.log('PASS goal_compaction_dedupe_telemetry_probe');
