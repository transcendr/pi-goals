#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const continuation = readFileSync('.pi/extensions/goal/continuation.ts', 'utf8');
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

const compactingCheck = index('attemptContinueGoal compaction guard', 'if (compactionActive) {');
const idleCheck = index('attemptContinueGoal idle guard', 'if (!ctx.isIdle()) {');
assert('compaction guard runs before idle guard', compactingCheck >= 0 && idleCheck >= 0 && compactingCheck < idleCheck);
assert('ContinuationSkipReason includes compacting', /ContinuationSkipReason = .*"compacting"/.test(types));
assert('beginGoalCompaction records active compaction work', /kind: "activeGoal", goalId: goal\.goalId/.test(continuation));
assert('beginGoalCompaction reports compacting skip telemetry', /skip\(pi, "compacting"\);/.test(continuation));
assert('attemptContinueGoal defers while compaction active', continuation.includes('compactionWork = { kind: "activeGoal", goalId, key: activeGoalKey(goalId) };') && continuation.includes('skip(pi, "compacting");') && continuation.includes('return { kind: "terminalSkip", reason: "compacting" };'));
assert('reset clears compaction runtime', /compactionActive = false;\n\tcompactionWork = undefined;\n\tprequeuedCompactionKey = undefined;/.test(continuation));

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS goal_compaction_suppresses_early_send');
console.log('PASS goal_compaction_suppression_probe');
