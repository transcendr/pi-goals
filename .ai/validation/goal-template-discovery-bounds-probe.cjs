#!/usr/bin/env node
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createJiti } = require('jiti');

const repo = process.cwd();
const jiti = createJiti(join(repo, 'probe.cjs'), { interopDefault: true });
const templates = jiti(join(repo, '.pi/extensions/goal/templates.ts'));
const command = jiti(join(repo, '.pi/extensions/goal/command.ts'));

function assert(name, condition, details) {
  if (!condition) {
    console.error(`FAIL ${name}${details ? `: ${details}` : ''}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
  }
}

const root = mkdtempSync(join(tmpdir(), 'pi-goal-template-bounds-'));
try {
  mkdirSync(join(root, '.pi-goals'), { recursive: true });
  mkdirSync(join(root, '.ai/.pi-goals'), { recursive: true });
  mkdirSync(join(root, 'nested/project/.pi-goals'), { recursive: true });
  writeFileSync(join(root, '.pi-goals/root-template.md'), 'Root template body\n');
  writeFileSync(join(root, '.ai/.pi-goals/ai-template.md'), 'AI template body\n');
  writeFileSync(join(root, 'nested/project/.pi-goals/decoy-template.md'), 'Decoy template body\n');

  const found = templates.discoverGoalTemplates(root).map((template) => template.name).sort();
  assert('bounded discovery includes root .pi-goals', found.includes('root-template'), found.join(','));
  assert('bounded discovery includes .ai/.pi-goals', found.includes('ai-template'), found.join(','));
  assert('bounded discovery ignores nested decoy .pi-goals', !found.includes('decoy-template'), found.join(','));

  const previousCwd = process.cwd();
  process.chdir(root);
  try {
    const rootCompletions = command.goalArgumentCompletions('ai') ?? [];
    const queueCompletions = command.goalArgumentCompletions('queue ai') ?? [];
    assert('root autocomplete finds .ai template', rootCompletions.some((item) => item.value === 'ai-template'), JSON.stringify(rootCompletions));
    assert('queue autocomplete finds .ai template with queue prefix', queueCompletions.some((item) => item.value === 'queue ai-template'), JSON.stringify(queueCompletions));
  } finally {
    process.chdir(previousCwd);
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS bounded_template_discovery_probe');
