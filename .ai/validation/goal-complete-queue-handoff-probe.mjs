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
const queueTools = read('.pi/extensions/goal/queue-tools.ts');
const steering = read('.pi/extensions/goal/queue-steering.ts');
const index = read('.pi/extensions/goal/index.ts');

assert('lifecycle complete path uses terminal workflow handoff', lifecycle.includes('processTerminalGoalWorkflow(pi, ctx, { goal') && lifecycle.includes('goal?.status === "complete"'));
assert('sendQueueHandoff triggers turn by default', steering.includes('triggerTurn: opts.triggerTurn ?? true'));
assert('tools complete update defers terminal workflow to turn_end', tools.includes('updatedGoal.status === "complete"') && tools.includes('handleToolResult marks the turn as completed') && !tools.includes('processTerminalGoalWorkflow'));
assert('tools only complete-hand off on transition to complete', tools.includes('previousGoal.status !== "complete" && updatedGoal.status === "complete"'));
assert('dequeue sends next queue handoff for terminal goals via ticket', queueTools.includes('sendNextQueueHandoffAfterDequeue(pi, runtime)') && queueTools.includes('dispatchContinuationTicket(pi, ticket)'));
assert('agent end catch-up uses deduped terminal workflow instead of forced duplicate', lifecycle.includes('handleAgentEnd(pi, ctx, postCompletionRunner)') && lifecycle.includes('const queueLength = getQueue().length') && lifecycle.includes('queueLength > 0') && lifecycle.includes('lifecycle.agent_end.queueHandoff.scheduled') && lifecycle.includes('lifecycle.agent_end.queueHandoff.dispatch') && lifecycle.includes('force: false') && !lifecycle.includes('processTerminalGoalWorkflow(pi, ctx, { goal, reason: "turn", runner: postCompletionRunner, force: true })'));
assert('create from template still replaces completed goals', tools.includes('replaceCompleted: true') && tools.includes('current.status === "complete"'));
assert('command registration still uses raw queue steering', index.includes('(reason, opts) => sendQueueSteering(pi, reason, opts)'));
assert('tool registration uses deduped queue handoff', index.includes('(reason, opts) => sendQueueHandoff(pi, reason, opts)'));

if (process.exitCode) process.exit(process.exitCode);
console.log('goal-complete-queue-handoff-probe passed');
