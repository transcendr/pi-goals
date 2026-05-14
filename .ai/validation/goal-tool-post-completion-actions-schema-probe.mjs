#!/usr/bin/env node
import fs from 'node:fs';
function assert(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else console.log(`PASS ${name}`); }
const tools = fs.readFileSync('.pi/extensions/goal/tools.ts','utf8');
const queueTools = fs.readFileSync('.pi/extensions/goal/queue-tools.ts','utf8');
const toolSchemas = fs.readFileSync('.pi/extensions/goal/tool-schemas.ts','utf8');
const intent = fs.readFileSync('.pi/extensions/goal/goal-intent.ts','utf8');
assert('create_goal schema exposes post_completion_context', /post_completion_context: Type\.Optional\(PostCompletionContextParam\)/.test(toolSchemas) && tools.includes('CreateGoalParams'));
assert('create_goal schema exposes post_completion_actions', /post_completion_actions: Type\.Optional\(Type\.Array\(PostCompletionActionParam\)\)/.test(toolSchemas) && tools.includes('CreateGoalParams'));
assert('enqueue_goal schema exposes post_completion_context', /post_completion_context: Type\.Optional\(PostCompletionContextParam\)/.test(toolSchemas) && queueTools.includes('CreateGoalParams'));
assert('enqueue_goal schema exposes post_completion_actions', /post_completion_actions: Type\.Optional\(Type\.Array\(PostCompletionActionParam\)\)/.test(toolSchemas) && queueTools.includes('CreateGoalParams'));
assert('tool path normalizes through goal intent', /buildDirectGoalIntent/.test(tools) && /buildTemplateGoalIntent/.test(tools));
assert('conflicts rejected in normalizer', /Conflicting context\.reset actions/.test(intent) && /post_completion_context none conflicts/.test(intent));
console.log('PASS goal_tool_post_completion_actions_schema_probe');
