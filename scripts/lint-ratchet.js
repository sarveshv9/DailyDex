#!/usr/bin/env node
/**
 * ESLint Ratchet Script
 *
 * Enforces that lint errors NEVER increase above the ceiling in lint-baseline.json.
 * Fails if ESLint crashes, fails to produce parseable output, or exceeds threshold.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const baselinePath = path.resolve(__dirname, '../lint-baseline.json');
if (!fs.existsSync(baselinePath)) {
  console.error('❌ Missing lint-baseline.json! Ratchet cannot enforce threshold.');
  process.exit(1);
}

let baseline;
try {
  baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
} catch (e) {
  console.error('❌ Failed to parse lint-baseline.json:', e.message);
  process.exit(1);
}

const MAX_ALLOWED_ERRORS = baseline.maxErrors;
const MAX_ALLOWED_WARNINGS = baseline.maxWarnings;

console.log(`🔍 Running ESLint Ratchet (Ceiling: Max ${MAX_ALLOWED_ERRORS} errors, ${MAX_ALLOWED_WARNINGS} warnings)...`);

let eslintOutput = '';
try {
  eslintOutput = execSync('npx eslint . --format json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 50 * 1024 * 1024,
  });
} catch (error) {
  // ESLint exits with code 1 if any rule errors are present; capture stdout
  eslintOutput = error.stdout || '';
  if (!eslintOutput) {
    console.error('❌ ESLint execution crashed or emitted no output:');
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

if (!eslintOutput || eslintOutput.trim().length === 0) {
  console.error('❌ ESLint produced empty output. Failing ratchet as a safety measure.');
  process.exit(1);
}

let results = [];
try {
  results = JSON.parse(eslintOutput);
} catch (parseError) {
  console.error('❌ Failed to parse ESLint JSON output:', parseError.message);
  process.exit(1);
}

let totalErrors = 0;
let totalWarnings = 0;

for (const file of results) {
  totalErrors += file.errorCount || 0;
  totalWarnings += file.warningCount || 0;
}

console.log(`\n📊 Current ESLint Stats: ${totalErrors} errors, ${totalWarnings} warnings.`);

if (totalErrors > MAX_ALLOWED_ERRORS) {
  console.error(`\n❌ LINT RATCHET FAILED!`);
  console.error(`   Found ${totalErrors} errors, which exceeds the allowed ceiling of ${MAX_ALLOWED_ERRORS}.`);
  console.error(`   You introduced ${totalErrors - MAX_ALLOWED_ERRORS} new lint error(s).\n`);
  process.exit(1);
}

if (totalWarnings > MAX_ALLOWED_WARNINGS) {
  console.error(`\n❌ LINT RATCHET FAILED!`);
  console.error(`   Found ${totalWarnings} warnings, which exceeds the allowed ceiling of ${MAX_ALLOWED_WARNINGS}.`);
  console.error(`   You introduced ${totalWarnings - MAX_ALLOWED_WARNINGS} new lint warning(s).\n`);
  process.exit(1);
}

if (totalErrors < MAX_ALLOWED_ERRORS) {
  console.log(`\n🎉 GREAT NEWS: Error count decreased from ${MAX_ALLOWED_ERRORS} to ${totalErrors}!`);
  console.log(`👉 Please update maxErrors in lint-baseline.json to ${totalErrors} to lower the ceiling.\n`);
}

if (totalWarnings < MAX_ALLOWED_WARNINGS) {
  console.log(`\n🎉 GREAT NEWS: Warning count decreased from ${MAX_ALLOWED_WARNINGS} to ${totalWarnings}!`);
  console.log(`👉 Please update maxWarnings in lint-baseline.json to ${totalWarnings} to lower the ceiling.\n`);
}

console.log(`✅ LINT RATCHET PASSED: Error count (${totalErrors}) is within ceiling (${MAX_ALLOWED_ERRORS}) and warning count (${totalWarnings}) is within ceiling (${MAX_ALLOWED_WARNINGS}).\n`);
process.exit(0);
