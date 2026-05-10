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

const steering = read('.pi/extensions/goal/floor-steering.ts');
const prompts = read('.pi/extensions/goal/prompts.ts');
const monitorPrompts = read('.pi/extensions/goal/monitor-prompts.ts');
const monitor = read('.pi/extensions/goal/monitor.ts');
const telemetry = read('.pi/extensions/goal/telemetry.ts');
const report = read('.pi/extensions/goal/monitor-report.ts');

const expectedCards = [
  'requirement_gap_audit',
  'adversarial_review',
  'alternate_perspective',
  'research_expansion',
  'validation_expansion',
  'simplification_deslop',
  'compatibility_review',
  'docs_handoff_evidence',
];
for (const id of expectedCards) assert(`catalog contains ${id}`, steering.includes(`id: "${id}"`));

assert('catalog exported', /export const FLOOR_VALUE_PASS_CATALOG/.test(steering));
assert('FloorWorkCard exported', /export type FloorWorkCard/.test(steering));
assert('selector avoids immediate repeat', /card\.id !== last/.test(steering));
assert('selector avoids completed cards', /!completed\.has\(card\.id\)/.test(steering));
assert('completion refusal starts with required phrase', /Completion deferred by goal floor\. The goal remains active\./.test(steering));
assert('continuation asks for next_floor_pass', /choose exactly one next_floor_pass/.test(steering));
assert('autonomous rule forbids asking user merely for floor', /Do not ask the user what else to do/.test(steering));
assert('explicit user fallback helper is conservative', /objectiveAllowsUserFloorFallback/.test(steering) && /ask me/.test(steering) && !/discuss/.test(steering));
assert('continuation prompt includes floor guidance only via helper', /floorContinuationSection/.test(prompts) && /buildFloorContinuationGuidance/.test(prompts));
assert('budget wrap-up remains floor-free', /buildBudgetLimitPrompt[\s\S]*Budget limit reached/.test(prompts) && !/buildBudgetLimitPrompt[\s\S]*next_floor_pass[\s\S]*function budgetLines/.test(prompts));

const patterns = [
  'floor_ignored_early_wrapup',
  'quota_filling_churn',
  'repeated_floor_pass_no_new_evidence',
  'productive_floor_deepening',
  'floor_blocked_autonomous_fallback_needed',
  'floor_quality_exhausted',
];
for (const pattern of patterns) assert(`monitor prompt names ${pattern}`, monitorPrompts.includes(pattern));
assert('monitor report renders floor block', /function renderFloor/.test(monitorPrompts) && /<completion_blocked_by_floor>/.test(monitorPrompts));
assert('monitor report builds floor object', /buildFloorReport/.test(report) && /completionBlockedByFloor/.test(report));
assert('monitor persists accepted floor telemetry', /persistAcceptedMonitorFloorTelemetry/.test(monitor) && /current\.updatedAt !== report\.goal\.updatedAt/.test(monitor));
assert('telemetry tracks productive floor deepening', /productive_floor_deepening/.test(telemetry) && /noteProductiveFloorWork/.test(telemetry));
assert('telemetry tracks quota-filling churn', /quota_filling_churn/.test(telemetry) && /noteFloorChurnSteer/.test(telemetry));
assert('telemetry tracks floor quality exhausted', /floor_quality_exhausted/.test(telemetry) && /noteFloorQualityExhausted/.test(telemetry));

if (process.exitCode) process.exit(process.exitCode);
console.log('goal-floor-steering-probe passed');
