#!/usr/bin/env node
// test_01_string_and_array.js - Unit tests for util_module string & array functions

const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const util = require(path.join(REPO_ROOT, 'util_module.js'));
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

console.log('Running Suite: util_module String & Array Functions');

// Test 1: isEmptyString
try {
    assert.strictEqual(util.isEmptyString(undefined), true, 'undefined should be empty');
    assert.strictEqual(util.isEmptyString(''), true, 'empty string should be empty');
    assert.strictEqual(util.isEmptyString(null), true, 'null should be empty');
    assert.strictEqual(util.isEmptyString('   \t\n  '), true, 'whitespace only should be empty');
    assert.strictEqual(util.isEmptyString('a'), false, 'single char should not be empty');
    assert.strictEqual(util.isEmptyString(' hello '), false, 'spaced word should not be empty');
    assertPass('1.1: isEmptyString handles empty, null, undefined, whitespace, and valid strings');
} catch (err) {
    assertFail('1.1: isEmptyString', err.message);
}

// Test 2: cleanDuplicates
try {
    const listWithDupes = [
        { localFolder: '/repo/one', name: 'First' },
        { localFolder: '/repo/two', name: 'Second' },
        { localFolder: '/repo/one', name: 'First Duplicate' },
        { localFolder: '/repo/three', name: 'Third' }
    ];
    const cleaned = util.cleanDuplicates(listWithDupes, 'localFolder');
    assert.strictEqual(cleaned.length, 3, 'Should reduce 4 items with 1 dupe to 3 items');
    const folders = cleaned.map(item => item.localFolder);
    assert.ok(folders.includes('/repo/one'), 'Contains /repo/one');
    assert.ok(folders.includes('/repo/two'), 'Contains /repo/two');
    assert.ok(folders.includes('/repo/three'), 'Contains /repo/three');
    assertPass('1.2: cleanDuplicates removes duplicate objects by specified key');
} catch (err) {
    assertFail('1.2: cleanDuplicates', err.message);
}

// Test 3: findObjectIndex
try {
    const repos = [
        { id: 10, path: '/a' },
        { id: 20, path: '/b' },
        { id: 30, path: '/c' }
    ];
    const idxB = util.findObjectIndex(repos, 'path', '/b');
    assert.strictEqual(idxB, 1, 'Index of /b should be 1');
    const idxMissing = util.findObjectIndex(repos, 'path', '/nonexistent');
    assert.ok(Number.isNaN(idxMissing) || idxMissing === undefined, 'Missing element index should be NaN or undefined');
    assertPass('1.3: findObjectIndex finds matching item index correctly');
} catch (err) {
    assertFail('1.3: findObjectIndex', err.message);
}

// Test 4: findObjectIndexStartsWith & findOAllbjectsIndexStartsWith
try {
    const branches = [
        { name: 'main' },
        { name: 'feature/login' },
        { name: 'feature/checkout' },
        { name: 'bugfix/typo' }
    ];
    const firstFeature = util.findObjectIndexStartsWith(branches, 'name', 'feature/');
    assert.ok(firstFeature === 1 || firstFeature === 2, 'Should find an index starting with feature/');
    
    const allFeatures = util.findOAllbjectsIndexStartsWith(branches, 'name', 'feature/');
    assert.strictEqual(allFeatures.length, 2, 'Should find exactly 2 feature branches');
    assert.ok(allFeatures.includes(1) && allFeatures.includes(2), 'Found indices 1 and 2');
    assertPass('1.4: findObjectIndexStartsWith & findOAllbjectsIndexStartsWith match prefix correctly');
} catch (err) {
    assertFail('1.4: findObjectIndexStartsWith', err.message);
}

printSuiteResult();
