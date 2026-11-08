#!/usr/bin/env node
// test_03_merge_upstream.js - UI Test Suite: Merge Upstream Remote Updates
//
// Usage:
//   node test_03_merge_upstream.js [options]
//
// Options:
//   --step, -i       Interactive step-by-step mode with verification instructions
//   --port=<num>     CDP remote debugging port (default: 9333)

const path = require('path');
const { runUiScenario } = require(path.join(__dirname, '../lib/run_ui_tests.js'));

runUiScenario('test_03_merge_upstream.yaml');
