#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const lifecycle = readFileSync('.pi/extensions/goal/lifecycle.ts', 'utf8');
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

assert('ContinuationReason includes compacted', /ContinuationReason = .*"compacted"/.test(types));
assert('lifecycle subscribes session_before_compact with ctx', /pi\.on\("session_before_compact", \(_event, ctx\) => \{ beginGoalCompaction\(pi, ctx\); \}\)/.test(lifecycle));
assert('lifecycle subscribes session_compact', /pi\.on\("session_compact", async \(_event, ctx\) => handleSessionCompact\(pi, ctx\)\)/.test(lifecycle));
assert('session_compact replays goal state before finish', lifecycle.indexOf('const state = replayGoalState(ctx);') >= 0 && lifecycle.indexOf('finishGoalCompaction(pi, ctx);') > lifecycle.indexOf('const state = replayGoalState(ctx);'));
assert('beginGoalCompaction prequeues compaction work', /prequeueCompactionWork\(pi, compactionWork\)/.test(continuation));
assert('finishGoalCompaction schedules fallback retry for uncompensated work', /scheduleCompactionFallbackRetry\(pi, ctx, work\);/.test(continuation));
assert('continuation follow-up details keep reason', /details: \{ \.\.\.prompt\.details, reason \}/.test(continuation));

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS goal_compaction_post_continuation');
console.log('PASS goal_compaction_continuation_probe');
