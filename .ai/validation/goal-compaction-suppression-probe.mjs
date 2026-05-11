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

const compactingCheck = index('maybeContinueGoal compaction guard', 'if (compactionActive) {');
const idleCheck = index('maybeContinueGoal idle guard', 'if (!ctx.isIdle()) return skip(pi, "notIdle");');
assert('compaction guard runs before idle guard', compactingCheck >= 0 && idleCheck >= 0 && compactingCheck < idleCheck);
assert('ContinuationSkipReason includes compacting', /ContinuationSkipReason = .*"compacting"/.test(types));
assert('beginGoalCompaction records deferred active goal', /deferredCompactionGoalId = goal\.goalId;/.test(continuation));
assert('beginGoalCompaction reports compacting skip telemetry', /skip\(pi, "compacting"\);/.test(continuation));
assert('maybeContinueGoal defers timer during compaction', /deferredCompactionGoalId = goalId;\n\t\treturn skip\(pi, "compacting"\);/.test(continuation));
assert('reset clears compaction runtime', /compactionActive = false;\n\tdeferredCompactionGoalId = undefined;/.test(continuation));

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS goal_compaction_suppresses_early_send');
console.log('PASS goal_compaction_suppression_probe');
