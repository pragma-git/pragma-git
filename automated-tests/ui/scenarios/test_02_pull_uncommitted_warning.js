#!/usr/bin/env node
// test_02_pull_uncommitted_warning.js - UI Test Suite: Pull Warning on Uncommitted Changes
//
// Usage:
//   node test_02_pull_uncommitted_warning.js [options]
//
// Options:
//   --step, -i       Interactive step-by-step mode with verification instructions
//   --port=<num>     CDP remote debugging port (default: 9333)

const path = require('path');
const { runUiScenario } = require(path.join(__dirname, '../lib/run_ui_tests.js'));

runUiScenario('test_02_pull_uncommitted_warning.yaml');
