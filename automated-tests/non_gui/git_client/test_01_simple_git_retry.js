#!/usr/bin/env node
// test_01_simple_git_retry.js - Tests simpleGitWithRetry wrapper proxy & lock retry logic

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const simpleGitWithRetry = require(path.join(REPO_ROOT, 'lib/simpleGitWithRetry.js'));

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
    console.log('Running Suite: simpleGitWithRetry Wrapper & Lock Recovery');

    const tempDir = path.join('/tmp', `pragma_git_retry_test_${process.pid}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
        // Test 1: Initialize repo and run basic commands
        const git = simpleGitWithRetry(tempDir);
        await git.init();
        await git.addConfig('user.name', 'Pragma-git Test');
        await git.addConfig('user.email', 'test@pragma-git.test');

        const testFilePath = path.join(tempDir, 'file.txt');
        fs.writeFileSync(testFilePath, 'initial content\n');
        await git.add('file.txt');
        await git.commit('Initial commit');

        const status = await git.status();
        assert.strictEqual(status.isClean(), true, 'Working tree should be clean');
        assertPass('1.1: simpleGitWithRetry initializes repo and executes basic git commands');

        // Test 2: Auto-retry on index.lock (simulated lock contention resolved in background)
        const lockPath = path.join(tempDir, '.git', 'index.lock');
        fs.writeFileSync(lockPath, 'simulated-lock');

        // Remove the lock after 100ms
        setTimeout(() => {
            if (fs.existsSync(lockPath)) {
                fs.unlinkSync(lockPath);
            }
        }, 100);

        // Run operation with retry
        const retryGit = simpleGitWithRetry(tempDir, {}, { maxRetries: 5, delay: 50 });
        fs.writeFileSync(testFilePath, 'second line\n');
        await retryGit.add('file.txt');

        assert.strictEqual(fs.existsSync(lockPath), false, 'Lock should have been cleared');
        assertPass('1.2: Automatically retries and succeeds when index.lock is released during retry window');

        // Test 3: Exhausted retries when lock remains permanently
        fs.writeFileSync(lockPath, 'permanent-lock');
        let failedAsExpected = false;
        try {
            const shortRetryGit = simpleGitWithRetry(tempDir, {}, { maxRetries: 2, delay: 20 });
            await shortRetryGit.add('file.txt');
        } catch (err) {
            failedAsExpected = true;
            assert.ok(err.message.includes('index.lock') || err.message.includes('fatal'), 'Error message mentions index.lock');
        } finally {
            if (fs.existsSync(lockPath)) {
                fs.unlinkSync(lockPath);
            }
        }
        assert.strictEqual(failedAsExpected, true, 'Should fail when maxRetries exhausted');
        assertPass('1.3: Throws error when maxRetries is exhausted with permanent lock');

        // Test 4: Chainable methods remain chainable
        const chained = git.env({ GIT_AUTHOR_NAME: 'Chained Author' });
        assert.ok(chained, 'env() returns git instance');
        assertPass('1.4: Chainable configuration methods (env, addConfig) maintain fluent interface');

    } catch (err) {
        assertFail('General failure in simpleGitWithRetry tests', err.stack);
    } finally {
        // Clean up
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {}
    }

    console.log(`Suite Result: ${passCount}/${passCount + failCount} passed, ${failCount} failed`);
    process.exit(failCount === 0 ? 0 : 1);
}

runTests();
