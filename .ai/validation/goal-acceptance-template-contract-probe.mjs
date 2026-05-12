#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createJiti } = require('jiti');
const jiti = createJiti(join(process.cwd(), 'goal-acceptance-template-contract-probe.mjs'), { interopDefault: true });
const templates = jiti(join(process.cwd(), '.pi/extensions/goal/templates.ts'));

function read(path) { return readFileSync(path, 'utf8'); }
function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`ok ${name}`);
  }
}

const pipeline = read('.ai/.pi-goals/verify-acceptance-pipeline.md');
const item = read('.ai/.pi-goals/verify-acceptance-item.md');
const steering = read('.pi/extensions/goal/queue-steering.ts');

assert('pipeline spawns strong materialized Pi worker', pipeline.includes('--profile solo-researcher-strong') && pipeline.includes('--custom-agent-tool') && pipeline.includes('materialized') && pipeline.includes('--materialized-args-mode') && pipeline.includes('replace') && pipeline.includes('--strict-profile'));
assert('pipeline switches model before prompt', pipeline.includes('send_model_selection') && pipeline.includes('/model opencode-go/glm-5.1') && pipeline.indexOf('send_model_selection') < pipeline.indexOf('send_acceptance_prompt'));
assert('pipeline verifies model selection', pipeline.includes('verify_worker_status_after_model_selection') && pipeline.includes('model_selection_output_check'));
assert('pipeline forbids invented budgets', pipeline.includes('Do not pass `token_budget`') && pipeline.includes('Do not invent budget or floor params'));
assert('queue steering forbids invented budgets', steering.includes('Budgets: none means omit budget/floor params') && steering.includes('Do not pass token_budget') && steering.includes('Do not invent token_budget'));
assert('pipeline has mandatory no-batch instruction', pipeline.includes('IMPORTANT: NO BATCH CHECKS') && pipeline.includes('Processing AC-N..AC-M together for efficiency is a workflow violation'));
assert('pipeline defines ledger schema', pipeline.includes('acceptance_item_ledger[0]{id,enqueued,template_matched,concrete_goal_created,item_result_captured,concrete_goal_complete,orchestration_dequeued}'));
assert('pipeline ledger gates final report', pipeline.includes('final report is invalid until every extracted criterion has a complete ledger row'));
assert('pipeline rejects aggregate substitution', pipeline.includes('Aggregate all-items inspection may be used only for orientation') && pipeline.includes('must never be the source of green rows'));
assert('pipeline rerun repeats no-batch ledger discipline', pipeline.includes('execute the queue head-to-tail with IMPORTANT: NO BATCH CHECKS') && pipeline.includes('maintain the same `acceptance_item_ledger` fields'));
assert('pipeline rejects green with material gap', pipeline.includes('Reject green-with-real-gap rows') && pipeline.includes('Do not aggregate such a row as green'));
assert('pipeline statuses make unresolved false-green red or blocked', pipeline.includes('plausible false-green risk remains unresolved') && pipeline.includes('required evidence that cannot currently be obtained safely'));
assert('item requires proof plan', item.includes('write a concise proof plan') && item.includes('Do not treat the proof plan itself as evidence'));
assert('item requires sufficiency rationale', item.includes('sufficiency rationale') && item.includes('would fail if the criterion were false'));
assert('item rejects weak string presence', item.includes('string-presence-only') && item.includes('return `red` or `blocked`'));
assert('item green requires false-green risk ruling', item.includes('false-green risk you ruled out'));
assert('item green forbids material gap', item.includes('A `green` result must not carry an unresolved material gap') && item.includes('gap` to `none'));

const pipelineResolved = templates.resolveGoalTemplateInvocationArgs('verify-acceptance-pipeline', ' -- ISSUE-041');
assert('resolver smoke: verify-acceptance-pipeline resolves', pipelineResolved.ok && pipelineResolved.template.objective.includes('IMPORTANT: NO BATCH CHECKS'));
const itemResolved = templates.resolveGoalTemplateInvocationArgs('verify-acceptance-item', '--issue .ai/issues/open/ISSUE-041-harden-acceptance-verification-pipeline-workflow.md --item-id AC-1 -- criterion text');
assert('resolver smoke: verify-acceptance-item resolves', itemResolved.ok && itemResolved.template.objective.includes('proof plan'));

if (process.exitCode) process.exit(process.exitCode);
console.log('goal-acceptance-template-contract-probe passed');
