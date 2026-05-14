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

const steering = read('.pi/extensions/goal/queue-steering.ts');
const lifecycle = read('.pi/extensions/goal/lifecycle.ts');
const tools = read('.pi/extensions/goal/tools.ts');

assert('dedupe state exists', steering.includes('let lastQueueHandoffKey'));
assert('dedupe key includes reason goal id queue id', steering.includes('`${reason}:${opts.goalId ?? "none"}:${next.queueId}`'));
assert('duplicate key returns false before send', steering.includes('lastQueueHandoffKey === key') && steering.includes('return false;'));
assert('dedupe key updates only after send', steering.includes('if (sent) lastQueueHandoffKey = key'));
assert('lifecycle uses terminal workflow for complete', lifecycle.includes('processTerminalGoalWorkflow(pi, ctx, { goal') && lifecycle.includes('goal?.status === "complete"'));
assert('lifecycle uses deduped helper for budgetLimited', lifecycle.includes('sendQueueHandoff(pi, "goal-budget-limited"'));
assert('tools pass complete updates through terminal workflow', tools.includes('processTerminalGoalWorkflow(pi, ctx, { goal: updatedGoal') && tools.includes('updatedGoal.status === "complete"'));
assert('tools complete and budgetLimited share terminal workflow surface', tools.match(/processTerminalGoalWorkflow\(pi, ctx, \{ goal: updatedGoal/g)?.length >= 2);

if (process.exitCode) process.exit(process.exitCode);
console.log('goal-complete-queue-dedupe-probe passed');
