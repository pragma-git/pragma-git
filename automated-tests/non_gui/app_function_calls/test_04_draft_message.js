#!/usr/bin/env node
/**
 * test_04_draft_message.js - Test repository-specific draft/mental note memory from app.js
 *
 * Verifies:
 *   1. getRepoDraftMessage returns empty string when no draft or invalid index
 *   2. getRepoDraftMessage returns repository-specific draft note
 *   3. saveCurrentRepoDraftMessage saves current draft note at HEAD
 *   4. saveCurrentRepoDraftMessage does NOT overwrite draft when in HISTORY mode
 *   5. restoreRepoDraftMessage populates message and updates mode when at HEAD
 *   6. Multi-repo draft switching preserves distinct drafts per repository
 *   7. Committing clears draftMessage for active repository
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

// Set up sandbox environment mirroring app.js runtime
let savedSettingsCallCount = 0;
let currentMode = 'NO_FILES_TO_COMMIT';

const messageElement = {
    value: '',
    placeholder: '',
    readOnly: false,
    style: {}
};

const sandbox = {
    state: {
        repoNumber: 0,
        repos: [
            { localFolder: '/repo-alpha', draftMessage: '' },
            { localFolder: '/repo-beta', draftMessage: 'Working on login page' }
        ]
    },
    localState: {
        historyNumber: -1,
        mode: 'NO_FILES_TO_COMMIT'
    },
    textOutput: {
        value: '',
        placeholder: '',
        readOnly: false
    },
    document: {
        getElementById: (id) => {
            if (id === 'message') return messageElement;
            return { value: '', style: {} };
        }
    },
    getMode: () => currentMode,
    _setMode: (mode) => { currentMode = mode; sandbox.localState.mode = mode; },
    saveSettings: () => { savedSettingsCallCount++; },
    clearTimeout: global.clearTimeout,
    setTimeout: global.setTimeout,
    _saveDraftTimeout: null,
    os: require('os'),
    console: console
};

const fnNames = [
    'readMessage',
    'writeTextOutput',
    'getRepoDraftMessage',
    'saveCurrentRepoDraftMessage',
    'restoreRepoDraftMessage'
];

let compiledCode = '';
for (const fn of fnNames) {
    compiledCode += extractFunction(fn) + '\n';
}

vm.runInNewContext(compiledCode, sandbox);

const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

function assert(condition, message) {
    if (condition) {
        assertPass(message);
    } else {
        assertFail(message);
    }
}

async function runTests() {
    if (process.env.VERBOSE === 'true') {
        console.log('--- Running test_04_draft_message.js ---');
    }

    // Test 1: getRepoDraftMessage returns empty string when empty or invalid
    assert(
        sandbox.getRepoDraftMessage(0) === '' &&
        sandbox.getRepoDraftMessage(-1) === '' &&
        sandbox.getRepoDraftMessage(99) === '',
        'getRepoDraftMessage returns empty string for repos with no draft or invalid index'
    );

    // Test 2: getRepoDraftMessage returns existing repo draft note
    assert(
        sandbox.getRepoDraftMessage(1) === 'Working on login page',
        'getRepoDraftMessage returns repository-specific draft note'
    );

    // Test 3: saveCurrentRepoDraftMessage saves current draft note at HEAD
    messageElement.value = 'Fixing auth bug #42';
    sandbox.saveCurrentRepoDraftMessage(true, 0);
    assert(
        sandbox.state.repos[0].draftMessage === 'Fixing auth bug #42' &&
        savedSettingsCallCount > 0,
        'saveCurrentRepoDraftMessage saves draft message to active repo state and invokes saveSettings'
    );

    // Test 4: saveCurrentRepoDraftMessage does NOT overwrite draft when in HISTORY mode
    sandbox.localState.historyNumber = 2;
    currentMode = 'HISTORY';
    messageElement.value = 'Historical commit message from 2024';
    sandbox.saveCurrentRepoDraftMessage(true, 0);
    assert(
        sandbox.state.repos[0].draftMessage === 'Fixing auth bug #42',
        'saveCurrentRepoDraftMessage ignores updates while browsing commit history'
    );

    // Test 5: restoreRepoDraftMessage populates message and updates mode when at HEAD
    sandbox.localState.historyNumber = -1;
    currentMode = 'CHANGED_FILES';
    messageElement.value = '';
    sandbox.restoreRepoDraftMessage(0);
    assert(
        messageElement.value === 'Fixing auth bug #42' &&
        currentMode === 'CHANGED_FILES_TEXT_ENTERED',
        'restoreRepoDraftMessage restores note into textarea and elevates mode to CHANGED_FILES_TEXT_ENTERED'
    );

    // Test 6: Multi-repo draft switching preserves distinct drafts per repository
    // Save draft for repo 0
    messageElement.value = 'Alpha draft note';
    sandbox.saveCurrentRepoDraftMessage(true, 0);
    // Switch active repo to 1
    sandbox.state.repoNumber = 1;
    sandbox.restoreRepoDraftMessage(1);
    const repo1Restored = messageElement.value;
    // Switch back to 0
    sandbox.state.repoNumber = 0;
    sandbox.restoreRepoDraftMessage(0);
    const repo0Restored = messageElement.value;
    assert(
        repo1Restored === 'Working on login page' &&
        repo0Restored === 'Alpha draft note' &&
        sandbox.state.repos[0].draftMessage === 'Alpha draft note' &&
        sandbox.state.repos[1].draftMessage === 'Working on login page',
        'Multi-repo draft switching preserves distinct mental notes per repository'
    );

    // Test 7: Committing clears draftMessage for active repository
    sandbox.state.repos[0].draftMessage = '';
    sandbox.restoreRepoDraftMessage(0);
    assert(
        sandbox.getRepoDraftMessage(0) === '' &&
        messageElement.value === '',
        'Committing clears draftMessage and resets scratch textarea'
    );

    // Test 8: restoreRepoDraftMessage on empty draft sets ongoing placeholder and editable state when returning to HEAD
    sandbox.localState.historyNumber = -1;
    currentMode = 'HISTORY';
    messageElement.value = 'Historical commit from history';
    messageElement.placeholder = '';
    messageElement.readOnly = true;
    sandbox.restoreRepoDraftMessage(0);
    assert(
        messageElement.value === '' &&
        messageElement.readOnly === false &&
        messageElement.placeholder.includes('You may write what is ongoing here'),
        'restoreRepoDraftMessage immediately clears historical text and displays ongoing placeholder'
    );

    printSuiteResult();
}

runTests();
