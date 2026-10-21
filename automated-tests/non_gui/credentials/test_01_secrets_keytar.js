#!/usr/bin/env node
// test_01_secrets_keytar.js - Unit tests for pragma-secrets-lib (keytar credential storage)

const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../../..');

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

async function runTests() {
    console.log('Running Suite: Keychain & Secret Management (pragma-secrets-lib)');

    const keytar = require('@hackolade/keytar');
    const SERVICE_NAME = 'Pragma-git secret test';
    const testUrl = `https://test-credentials.pragma-git.local/repo-${process.pid}.git`;
    const testSecret = { token: 'ghp_dummy_token_12345', username: 'test-user', extra: 'meta' };

    try {
        // Test 1: Save secret to system keychain
        await keytar.setPassword(SERVICE_NAME, testUrl, JSON.stringify(testSecret));
        assertPass('1.1: Successfully save serialized JSON secret to keychain via keytar');

        // Test 2: Retrieve stored secret and parse
        const raw = await keytar.getPassword(SERVICE_NAME, testUrl);
        assert.ok(raw, 'Raw secret string retrieved from keychain');
        const parsed = JSON.parse(raw);
        assert.strictEqual(parsed.token, testSecret.token);
        assert.strictEqual(parsed.username, testSecret.username);
        assertPass('1.2: Retrieve and deserialize secret with integrity match');

        // Test 3: Delete secret from keychain
        const deleted = await keytar.deletePassword(SERVICE_NAME, testUrl);
        assert.strictEqual(deleted, true, 'Delete operation returned true');

        const shouldBeNull = await keytar.getPassword(SERVICE_NAME, testUrl);
        assert.strictEqual(shouldBeNull, null, 'Secret no longer exists after deletion');
        assertPass('1.3: Delete secret and verify absence in keychain');

    } catch (err) {
        assertFail('Failure in secrets keytar tests', err.stack);
    } finally {
        try {
            await keytar.deletePassword(SERVICE_NAME, testUrl);
        } catch (e) {}
    }

    console.log(`Suite Result: ${passCount}/${passCount + failCount} passed, ${failCount} failed`);
    process.exit(failCount === 0 ? 0 : 1);
}

runTests();
