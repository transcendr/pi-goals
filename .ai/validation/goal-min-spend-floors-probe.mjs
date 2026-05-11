#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const files = {
  types: '.pi/extensions/goal/types.ts',
  tools: '.pi/extensions/goal/tools.ts',
  gate: '.pi/extensions/goal/completion-gate.ts',
  floor: '.pi/extensions/goal/floor.ts',
  state: '.pi/extensions/goal/state.ts',
  queueState: '.pi/extensions/goal/queue-state.ts',
  continuation: '.pi/extensions/goal/continuation.ts',
};

function read(path) { return readFileSync(path, 'utf8'); }
function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`ok ${name}`);
  }
}
function indexOfOrFail(name, text, needle) {
  const index = text.indexOf(needle);
  assert(`${name} present`, index >= 0);
  return index;
}

const types = read(files.types);
const tools = read(files.tools);
const gate = read(files.gate);
const floor = read(files.floor);
const state = read(files.state);
const queueState = read(files.queueState);
const continuation = read(files.continuation);

assert('GoalState has token floor', /minTokensBeforeWrapUp\?: number/.test(types));
assert('GoalState has time floor', /minTimeSecondsBeforeWrapUp\?: number/.test(types));
assert('telemetry records floor work history', /lastFloorCardId\?: FloorValuePassId/.test(types) && /floorQualityState\?: FloorQualityState/.test(types));
assert('queue preserves floor metadata', /minTokensBeforeWrapUp\?: number/.test(queueState) && /minTimeSecondsBeforeWrapUp\?: number/.test(queueState));
assert('floor helper evaluates all floors', /allFloorsMet: tokenFloorMet && timeFloorMet/.test(floor));
assert('floor validation bounds minimum by maximum token budget', /min_tokens_before_wrap_up must be less than or equal to token_budget/.test(floor));
assert('floor validation bounds minimum by maximum time budget', /min_time_seconds_before_wrap_up must be less than or equal to time_budget_seconds/.test(floor));
assert('completion gate has defer decision', /kind: "defer_and_steer"/.test(gate));
assert('completion gate honors max budget precedence', /isBudgetExhausted\(input\.currentGoal\)/.test(gate));
assert('completion gate uses current goal floor', /evaluateCompletionFloor\(input\.currentGoal\)/.test(gate));
assert('tool schema exposes create floor params', /min_tokens_before_wrap_up: Type\.Optional\(Type\.Number/.test(tools) && /min_time_seconds_before_wrap_up: Type\.Optional\(Type\.Number/.test(tools));
assert('update schema allows null floor removal', /min_tokens_before_wrap_up: Type\.Optional\(NullableNumber\)/.test(tools) && /min_time_seconds_before_wrap_up: Type\.Optional\(NullableNumber\)/.test(tools));
assert('same-call floor edit plus complete blocked', /Floor edits and status complete must be separate update_goal calls/.test(tools));
assert('deferred completion details include completion_blocked_by_floor', /completion_blocked_by_floor: true/.test(tools));
assert('state createGoalState uses options object', /export function createGoalState\(input: CreateGoalStateInput\)/.test(state));
assert('agentEnd no-progress suppression checks active floors', /evaluateCompletionFloor\(goal\)/.test(continuation) && /floor\.anyFloorConfigured && !floor\.allFloorsMet/.test(continuation));
assert('agentEnd floor steering respects max budget and exhaustion escapes', /!isBudgetExhausted\(goal\)/.test(continuation) && /telemetry\.floorQualityState !== "exhausted"/.test(continuation));

const decision = indexOfOrFail('completion decision call', tools, 'const completionDecision = decideGoalCompletion');
const cancel = indexOfOrFail('status cancellation', tools, 'runtime.cancelContinuation?.(goal.goalId, "tool-status")');
const persist = indexOfOrFail('persist update', tools, 'persistUpdateGoal(pi, update.goal');
assert('completion gate runs before cancellation', decision >= 0 && cancel >= 0 && decision < cancel);
assert('completion gate runs before persistence', decision >= 0 && persist >= 0 && decision < persist);

if (process.exitCode) process.exit(process.exitCode);
console.log('goal-min-spend-floors-probe passed');
