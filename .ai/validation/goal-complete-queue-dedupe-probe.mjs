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
assert('duplicate key returns false before send', steering.includes('if (lastQueueHandoffKey === key) return false'));
assert('dedupe key updates only after send', steering.includes('if (sent) lastQueueHandoffKey = key'));
assert('lifecycle uses deduped helper for complete', lifecycle.includes('sendQueueHandoff(pi, "goal-complete"'));
assert('lifecycle uses deduped helper for budgetLimited', lifecycle.includes('sendQueueHandoff(pi, "goal-budget-limited"'));
assert('tools pass goalId through sender for complete', tools.includes('goalId: updatedGoal.goalId'));
assert('tools complete and budgetLimited share sender surface', tools.includes('"goal-complete"') && tools.includes('"goal-budget-limited"'));

if (process.exitCode) process.exit(process.exitCode);
console.log('goal-complete-queue-dedupe-probe passed');
