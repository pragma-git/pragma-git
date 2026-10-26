#!/usr/bin/env node
/**
 * test_01_repo_settings.js - Test repository settings normalization and validation from app.js
 *
 * Verifies:
 *   1. fixRepoSettingWithDefault injects defaults for empty objects
 *   2. fixRepoSettingWithDefault preserves existing customized values
 *   3. isDecimal validates valid numeric strings and rejects invalid inputs
 *   4. isNullOrWhitespace correctly identifies empty, null, and whitespace inputs
 *   5. typeOfRepoServer classifies local repository paths as 'Local'
 *   6. draftMessage maintains per-repo isolation and survives JSON serialization roundtrip
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

const sandbox = {
    URL: global.URL,
    fs_existsSync: async () => false
};

const fnNames = [
    'fixRepoSettingWithDefault',
    'setting',
    'isDecimal',
    'isNullOrWhitespace',
    'typeOfRepoServer'
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
        console.log('--- Running test_01_repo_settings.js ---');
    }

    // Test 1: fixRepoSettingWithDefault with empty object
    const emptySettings = sandbox.fixRepoSettingWithDefault({});
    assert(
        emptySettings.localFolder === '' &&
        emptySettings.remoteURL === '' &&
        emptySettings.forkedFromURL === '' &&
        emptySettings.sshKey === '' &&
        emptySettings.group === '' &&
        emptySettings.lastOpened === '' &&
        emptySettings.authorName === '' &&
        emptySettings.authorEmail === '' &&
        emptySettings.allowPushToRemote === true &&
        emptySettings.autoPushToRemote === true &&
        emptySettings.NoFF_merge === true &&
        emptySettings.draftMessage === '' &&
        Array.isArray(emptySettings.hiddenBranches) && emptySettings.hiddenBranches.length === 0,
        'fixRepoSettingWithDefault populates default values for all missing keys including draftMessage'
    );

    // Test 2: fixRepoSettingWithDefault preserves existing customized values
    const customInput = {
        localFolder: '/Users/test/custom-repo',
        remoteURL: 'https://github.com/example/custom.git',
        sshKey: '~/.ssh/custom_id_rsa',
        group: 'Personal',
        draftMessage: 'Mental note: implement feature X',
        allowPushToRemote: false,
        hiddenBranches: ['wip', 'experiment']
    };
    const customized = sandbox.fixRepoSettingWithDefault(customInput);
    assert(
        customized.localFolder === '/Users/test/custom-repo' &&
        customized.remoteURL === 'https://github.com/example/custom.git' &&
        customized.sshKey === '~/.ssh/custom_id_rsa' &&
        customized.group === 'Personal' &&
        customized.draftMessage === 'Mental note: implement feature X' &&
        customized.allowPushToRemote === false &&
        customized.hiddenBranches.length === 2 &&
        customized.hiddenBranches[0] === 'wip' &&
        customized.NoFF_merge === true,
        'fixRepoSettingWithDefault preserves customized fields including draftMessage and injects missing defaults'
    );

    // Test 3: isDecimal validation
    const validDecimals = sandbox.isDecimal('1.0') && sandbox.isDecimal('0.85') && sandbox.isDecimal('100');
    const invalidDecimals = !sandbox.isDecimal('') && !sandbox.isDecimal('   ') && !sandbox.isDecimal('abc') && !sandbox.isDecimal('NaN');
    assert(validDecimals && invalidDecimals, 'isDecimal properly validates numeric strings and rejects invalid inputs');

    // Test 4: isNullOrWhitespace validation
    const emptyCheck = sandbox.isNullOrWhitespace('') &&
        sandbox.isNullOrWhitespace('   ') &&
        sandbox.isNullOrWhitespace('\t\n') &&
        sandbox.isNullOrWhitespace(null) &&
        sandbox.isNullOrWhitespace(undefined);
    const nonEmptyCheck = !sandbox.isNullOrWhitespace('valid') && !sandbox.isNullOrWhitespace('  text  ');
    assert(emptyCheck && nonEmptyCheck, 'isNullOrWhitespace correctly flags empty/whitespace inputs');

    // Test 5: typeOfRepoServer for local paths
    const localType1 = await sandbox.typeOfRepoServer('/Users/jan/repo');
    const localType2 = await sandbox.typeOfRepoServer('C:\\Users\\jan\\repo');
    assert(localType1 === 'Local' && localType2 === 'Local', 'typeOfRepoServer identifies local filesystem paths as "Local"');

    // Test 6: draftMessage per-repo isolation and JSON serialization roundtrip
    const repoA = sandbox.fixRepoSettingWithDefault({ localFolder: '/repoA', draftMessage: 'Note for repo A' });
    const repoB = sandbox.fixRepoSettingWithDefault({ localFolder: '/repoB', draftMessage: '' });
    const serialized = JSON.stringify([repoA, repoB]);
    const parsed = JSON.parse(serialized).map(r => sandbox.fixRepoSettingWithDefault(r));
    assert(
        parsed[0].draftMessage === 'Note for repo A' &&
        parsed[1].draftMessage === '' &&
        parsed[0].localFolder === '/repoA' &&
        parsed[1].localFolder === '/repoB',
        'draftMessage maintains per-repo isolation and survives JSON serialization roundtrip'
    );

    printSuiteResult();
}

runTests();
