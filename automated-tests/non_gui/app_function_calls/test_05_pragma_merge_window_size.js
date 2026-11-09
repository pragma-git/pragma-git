#!/usr/bin/env node
/**
 * test_05_pragma_merge_window_size.js - Test default window size persistence for pragma-merge
 *
 * Verifies:
 *   1. Initial settings initialization provides state.pragmaMerge.window object
 *   2. getSensibleMergeWindowSize falls back to default size when no stored size exists
 *   3. updatePragmaMergeWindowSize saves new window dimensions into state.pragmaMerge.window
 *   4. getSensibleMergeWindowSize retrieves the saved dimensions for new windows
 *   5. Clamped/sensible bounds are respected against available screen boundaries
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const appJsPath = path.join(REPO_ROOT, 'app.js');

if (!fs.existsSync(appJsPath)) {
    console.error('FAIL: app.js not found at ' + appJsPath);
    process.exit(1);
}

const appCode = fs.readFileSync(appJsPath, 'utf8');

function extractFunction(name) {
    const match = appCode.match(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{'));
    if (!match) throw new Error('Could not find function ' + name + ' in app.js');
    const start = match.index;
    let openBraces = 0;
    let started = false;
    let end = start;
    for (let i = start; i < appCode.length; i++) {
        if (appCode[i] === '{') {
            openBraces++;
            started = true;
        } else if (appCode[i] === '}') {
            openBraces--;
            if (started && openBraces === 0) {
                end = i + 1;
                break;
            }
        }
    }
    return appCode.slice(start, end);
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  [PASS] ${message}`);
        passed++;
    } else {
        console.error(`  [FAIL] ${message}`);
        failed++;
    }
}

// Sandbox environment
let saveSettingsCalls = 0;
const sandbox = {
    console: console,
    window: {
        screen: {
            availWidth: 1920,
            availHeight: 1080
        }
    },
    state: {
        pragmaMerge: {}
    },
    saveSettings: function() {
        saveSettingsCalls++;
    }
};

// Evaluate getSensibleWindowSize, getSensibleMergeWindowSize, updatePragmaMergeWindowSize
const fnGetSensibleWindowSize = extractFunction('getSensibleWindowSize');
const fnGetSensibleMergeWindowSize = extractFunction('getSensibleMergeWindowSize');
const fnUpdatePragmaMergeWindowSize = extractFunction('updatePragmaMergeWindowSize');

const evalCode = `
${fnGetSensibleWindowSize}
${fnGetSensibleMergeWindowSize}
${fnUpdatePragmaMergeWindowSize}
`;

const runInSandbox = new Function('sandbox', `
    with (sandbox) {
        ${evalCode}
        return {
            getSensibleWindowSize,
            getSensibleMergeWindowSize,
            updatePragmaMergeWindowSize
        };
    }
`);

const funcs = runInSandbox(sandbox);

// Test 1: getSensibleMergeWindowSize with default values
const defaultSize = funcs.getSensibleMergeWindowSize(1200, 850);
assert(defaultSize.width === 1200 && defaultSize.height === 850,
    'getSensibleMergeWindowSize returns default size when no previous size is saved');

// Test 2: updatePragmaMergeWindowSize updates state.pragmaMerge.window and triggers saveSettings
const mockWin = {
    width: 1500,
    height: 950
};
funcs.updatePragmaMergeWindowSize(mockWin);

assert(sandbox.state.pragmaMerge.window &&
       sandbox.state.pragmaMerge.window.width === 1500 &&
       sandbox.state.pragmaMerge.window.height === 950,
    'updatePragmaMergeWindowSize stores window dimensions into state.pragmaMerge.window');

assert(saveSettingsCalls > 0,
    'updatePragmaMergeWindowSize calls saveSettings to persist window size to settings.json');

// Test 3: getSensibleMergeWindowSize now returns the newly saved dimensions as new default
const newDefaultSize = funcs.getSensibleMergeWindowSize(1200, 850);
assert(newDefaultSize.width === 1500 && newDefaultSize.height === 950,
    'getSensibleMergeWindowSize adopts saved window dimensions for subsequent windows');

// Test 4: Clamped by screen dimensions
sandbox.window.screen.availWidth = 1000;
sandbox.window.screen.availHeight = 700;
const clampedSize = funcs.getSensibleMergeWindowSize(1200, 850);
// marginW = 40, marginH = 60 -> max width 960, max height 640
assert(clampedSize.width === 960 && clampedSize.height === 640,
    'getSensibleMergeWindowSize clamps saved window dimensions to available screen boundaries');

// Test 5: Ignored when dimensions are invalid or too small
funcs.updatePragmaMergeWindowSize({ width: 50, height: 50 });
assert(sandbox.state.pragmaMerge.window.width === 1500 && sandbox.state.pragmaMerge.window.height === 950,
    'updatePragmaMergeWindowSize ignores invalid or unreasonably small dimensions (< 200px)');

console.log(`Suite Result: ${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
