#!/usr/bin/env node
// test_01_ssh_clone_repo.js - UI Test Suite: SSH Clone Remote Repository
//
// Usage:
//   node test_01_ssh_clone_repo.js [options]
//
// Options:
//   --step, -i       Interactive step-by-step mode with verification instructions
//   --port=<num>     CDP remote debugging port (default: 9333)

const path = require('path');
const { runUiScenario } = require(path.join(__dirname, '../lib/run_ui_tests.js'));

runUiScenario('test_01_ssh_clone_repo.yaml');
