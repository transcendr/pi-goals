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

const types = read('.pi/extensions/goal/types.ts');
const steering = read('.pi/extensions/goal/queue-steering.ts');
const lifecycle = read('.pi/extensions/goal/lifecycle.ts');
const tools = read('.pi/extensions/goal/tools.ts');
const queueTools = read('.pi/extensions/goal/queue-tools.ts');
const index = read('.pi/extensions/goal/index.ts');

assert('types include budget-limited queue steering reason', types.includes('"goal-budget-limited"'));
assert('queue steering exposes sendQueueHandoff', /export function sendQueueHandoff/.test(steering));
assert('queue handoff triggers turns by default', /triggerTurn: opts\.triggerTurn \?\? true/.test(steering));
assert('lifecycle message_update hard stop hands off queue', lifecycle.includes('sendQueueHandoff(pi, "goal-budget-limited", { goalId: goal.goalId })'));
assert('lifecycle enforce hard stop hands off queue', lifecycle.includes('sendQueueHandoff(pi, "goal-budget-limited", { goalId: result.goal.goalId })'));
assert('lifecycle mark reached skips wrap-up when queue handoff sent', lifecycle.includes('const handedOff = sendQueueHandoff(pi, "goal-budget-limited"') && lifecycle.includes('if (!handedOff) scheduleBudgetLimitWrapUp'));
assert('tools permit template replacement over budgetLimited queued work', tools.includes('replaceBudgetLimitedForQueuedWork: true') && tools.includes('current.status === "budgetLimited"') && tools.includes('runtime.getQueueSize?.() ?? 0'));
assert('tools report budget-limited replacement explicitly', tools.includes('Goal created; replaced budget-limited goal for queued work.'));
assert('tools hand off after budget edit to budgetLimited without terminal workflow navigation', tools.includes('updatedGoal.status === "budgetLimited"') && tools.includes('runtime.sendQueueHandoff?.("goal-budget-limited", { goalId: updatedGoal.goalId, triggerTurn: true })') && !tools.includes('processTerminalGoalWorkflow'));
assert('queue tools allow start over budgetLimited terminal goal', queueTools.includes('current.status !== "complete" && current.status !== "budgetLimited"'));
assert('index passes handoff sender to tools', index.includes('sendQueueHandoff') && index.includes('(reason, opts) => sendQueueHandoff(pi, reason, opts)'));

if (process.exitCode) process.exit(process.exitCode);
console.log('goal-budget-limited-queue-handoff-probe passed');
