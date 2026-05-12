#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }
function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`ok ${name}`);
  }
}

const lifecycle = read('.pi/extensions/goal/lifecycle.ts');
const tools = read('.pi/extensions/goal/tools.ts');
const steering = read('.pi/extensions/goal/queue-steering.ts');
const index = read('.pi/extensions/goal/index.ts');

assert('lifecycle complete path uses queue handoff', lifecycle.includes('sendQueueHandoff(pi, "goal-complete", { goalId: goal.goalId })'));
assert('sendQueueHandoff triggers turn by default', steering.includes('triggerTurn: opts.triggerTurn ?? true'));
assert('tools complete update sends triggered queue handoff', tools.includes('runtime.sendQueueSteering?.("goal-complete", { triggerTurn: true, goalId: updatedGoal.goalId })'));
assert('tools only complete-hand off on transition to complete', tools.includes('previousGoal.status !== "complete" && updatedGoal.status === "complete"'));
assert('create from template still replaces completed goals', tools.includes('replaceCompleted: true') && tools.includes('current.status === "complete"'));
assert('command registration still uses raw queue steering', index.includes('(reason, opts) => sendQueueSteering(pi, reason, opts)'));
assert('tool registration uses deduped queue handoff', index.includes('(reason, opts) => sendQueueHandoff(pi, reason, opts)'));

if (process.exitCode) process.exit(process.exitCode);
console.log('goal-complete-queue-handoff-probe passed');
