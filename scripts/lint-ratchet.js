#!/usr/bin/env node
/**
 * ESLint Ratchet Script
 *
 * Enforces that lint errors NEVER increase above the ratchet threshold.
 * As screens are refactored, MAX_ALLOWED_ERRORS is lowered.
 */
const { execSync } = require('child_process');

const MAX_ALLOWED_ERRORS = 128;
const MAX_ALLOWED_WARNINGS = 65;

console.log(`🔍 Running ESLint Ratchet (Threshold: Max ${MAX_ALLOWED_ERRORS} errors, ${MAX_ALLOWED_WARNINGS} warnings)...`);

let eslintOutput = '';
try {
  eslintOutput = execSync('npx eslint . --format json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 50 * 1024 * 1024,
  });
} catch (error) {
  // ESLint exits with code 1 if any error is found; capture stdout
  eslintOutput = error.stdout || '';
}

let results = [];
try {
  results = JSON.parse(eslintOutput);
} catch (parseError) {
  console.error('❌ Failed to parse ESLint JSON output:', parseError);
  process.exit(1);
}

let totalErrors = 0;
let totalWarnings = 0;
const errorFiles = [];

for (const file of results) {
  totalErrors += file.errorCount || 0;
  totalWarnings += file.warningCount || 0;
  if (file.errorCount > 0) {
    errorFiles.push({
      filePath: file.filePath,
      errorCount: file.errorCount,
      messages: file.messages.filter((m) => m.severity === 2),
    });
  }
}

console.log(`\n📊 Current ESLint Stats: ${totalErrors} errors, ${totalWarnings} warnings.`);

if (totalErrors > MAX_ALLOWED_ERRORS) {
  console.error(`\n❌ LINT RATCHET FAILED!`);
  console.error(`   Found ${totalErrors} errors, which exceeds the allowed ceiling of ${MAX_ALLOWED_ERRORS}.`);
  console.error(`   You introduced ${totalErrors - MAX_ALLOWED_ERRORS} new lint error(s).\n`);
  process.exit(1);
}

if (totalErrors < MAX_ALLOWED_ERRORS) {
  console.log(`\n🎉 GREAT NEWS: Error count decreased from ${MAX_ALLOWED_ERRORS} to ${totalErrors}!`);
  console.log(`👉 Please update MAX_ALLOWED_ERRORS in scripts/lint-ratchet.js to ${totalErrors} to ratchet down the ceiling.\n`);
}

console.log(`✅ LINT RATCHET PASSED: Error count (${totalErrors}) is within ceiling (${MAX_ALLOWED_ERRORS}).\n`);
process.exit(0);
