#!/usr/bin/env node
// test_02_parsing_and_filtering.js - Tests parsing & branch filtering functions

const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const util = require(path.join(REPO_ROOT, 'util_module.js'));

let passCount = 0;
let failCount = 0;

function assertPass(desc) {
    console.log(`  [PASS] ${desc}`);
    passCount++;
}

function assertFail(desc, details) {
    console.log(`  [FAIL] ${desc}`);
    if (details) console.log(`         ${details}`);
    failCount++;
}

console.log('Running Suite: util_module Parsing & Branch Filtering');

// Test 1: parseKeyValuePairsFromString
try {
    const raw = `
user.name=Jan Axelsson
user.email=jan@example.com
remote.origin.url=https://github.com/test/repo.git?token=abc=123
empty_val=
`.trim();

    const parsed = util.parseKeyValuePairsFromString(raw);
    assert.strictEqual(parsed['user.name'], 'Jan Axelsson');
    assert.strictEqual(parsed['user.email'], 'jan@example.com');
    assert.strictEqual(parsed['remote.origin.url'], 'https://github.com/test/repo.git?token=abc=123', 'Preserves = in value');
    assert.strictEqual(parsed['empty_val'], '');
    assertPass('2.1: parseKeyValuePairsFromString parses multiline key-value configs and preserves embedded =');
} catch (err) {
    assertFail('2.1: parseKeyValuePairsFromString', err.message);
}

// Test 2: branchCharFilter
try {
    // Branch names in git cannot contain ^, ~, ?, :, *, [, space, consecutive dots (..), @{
    const inputBad = "feature/test:new*branch~1^fix?name[1] space..dots@{head";
    const cleaned = util.branchCharFilter(inputBad);
    
    // Forbidden characters check
    assert.ok(!/[~?:*[\^]/.test(cleaned), 'Should not contain ^ ~ ? : * [');
    assert.ok(!cleaned.includes('..'), 'Should not contain consecutive dots ..');
    assert.ok(!cleaned.includes('@{'), 'Should not contain @{');
    assert.ok(!cleaned.includes(' '), 'Should have replaced space with _');
    
    assertPass('2.2: branchCharFilter strips forbidden git branch characters and sanitizes names');
} catch (err) {
    assertFail('2.2: branchCharFilter', err.message);
}

// Test 3: isHiddenBranch
try {
    const hiddenList = ['origin/HEAD', 'feature/secret', 'archive/old'];
    assert.strictEqual(util.isHiddenBranch(hiddenList, 'feature/secret'), true, 'Should detect hidden branch');
    assert.strictEqual(util.isHiddenBranch(hiddenList, 'main'), false, 'Main should not be hidden');
    assert.strictEqual(util.isHiddenBranch(undefined, 'main'), false, 'Undefined list returns false');
    assertPass('2.3: isHiddenBranch identifies hidden and visible branches');
} catch (err) {
    assertFail('2.3: isHiddenBranch', err.message);
}

console.log(`Suite Result: ${passCount}/${passCount + failCount} passed, ${failCount} failed`);
process.exit(failCount === 0 ? 0 : 1);
