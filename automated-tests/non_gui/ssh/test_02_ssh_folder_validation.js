#!/usr/bin/env node
/**
 * test_02_ssh_folder_validation.js - Tests fs_existsSync and remote folder/repo/error detection
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { REPO_ROOT, startEphemeralSshServer } = require('./ssh_test_helper.js');
const sshLib = require(path.join(REPO_ROOT, 'ssh_folder/ssh-folder-lib.js'));
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

console.log('Running Suite: SSH Folder & Repository Validation Tests');

(async () => {
    const env = startEphemeralSshServer();
    try {
        // Test 1: Existing directory on server
        const existingDir = path.join(env.sandboxDir, 'existing_dir');
        fs.mkdirSync(existingDir, { recursive: true });
        const exists1 = await sshLib.fs_existsSync(env.makeSshUrl(existingDir));
        if (exists1 === true && sshLib.fs_existsSync.lastReason === '') {
            assertPass('2.1: Existing directory on server detected accurately');
        } else {
            assertFail('2.1: Existing directory detection', `exists=${exists1}, reason=${sshLib.fs_existsSync.lastReason}`);
        }

        // Test 2: Non-existing directory on server
        const missingDir = path.join(env.sandboxDir, 'missing_dir_xyz');
        const exists2 = await sshLib.fs_existsSync(env.makeSshUrl(missingDir));
        if (exists2 === false && sshLib.fs_existsSync.lastReason === 'not a folder') {
            assertPass('2.2: Non-existing directory detected as missing (reason: not a folder)');
        } else {
            assertFail('2.2: Non-existing directory detection', `exists=${exists2}, reason=${sshLib.fs_existsSync.lastReason}`);
        }

        // Test 3: Existing non-repo directory (missing .git/HEAD)
        const plainDir = path.join(env.sandboxDir, 'plain_dir');
        fs.mkdirSync(plainDir, { recursive: true });
        const exists3 = await sshLib.fs_existsSync(`${env.makeSshUrl(plainDir)}/.git/HEAD`);
        if (exists3 === false) {
            assertPass('2.3: Non-repo folder identified accurately (missing .git/HEAD)');
        } else {
            assertFail('2.3: Non-repo folder check', `exists=${exists3}`);
        }

        // Test 4: Existing valid Git repo (.git/HEAD exists)
        const repoDir = path.join(env.sandboxDir, 'valid_git_repo');
        fs.mkdirSync(repoDir, { recursive: true });
        execSync(`git -C "${repoDir}" init -b main`, { stdio: 'ignore' });
        const exists4 = await sshLib.fs_existsSync(`${env.makeSshUrl(repoDir)}/.git/HEAD`);
        if (exists4 === true) {
            assertPass('2.4: Valid Git repo identified accurately (.git/HEAD exists)');
        } else {
            assertFail('2.4: Valid Git repo check', `exists=${exists4}`);
        }

        // Test 5: Rejected key sets lastReason = 'key not accepted' (or 'key rejected')
        const badKey = path.join(env.sandboxDir, 'unauth_key');
        sshLib.generateLocalSshKey(badKey);
        const exists5 = await sshLib.fs_existsSync(env.makeSshUrl(existingDir), badKey);
        if (exists5 === false && (sshLib.fs_existsSync.lastReason === 'key not accepted' || sshLib.fs_existsSync.lastReason === 'key rejected')) {
            assertPass('2.5: Unauthorized SSH key sets fs_existsSync.lastReason = "key not accepted"');
        } else {
            assertFail('2.5: Rejected key classification', `exists=${exists5}, reason=${sshLib.fs_existsSync.lastReason}`);
        }

        // Test 6: Unreachable host sets lastReason = 'no network'
        const exists6 = await sshLib.fs_existsSync(`ssh://${env.user}@invalid-host-pragma-test.invalid/tmp`, env.defaultKey);
        if (exists6 === false && sshLib.fs_existsSync.lastReason === 'no network') {
            assertPass('2.6: Inaccessible host handled cleanly (reason: no network)');
        } else {
            assertFail('2.6: Inaccessible host classification', `exists=${exists6}, reason=${sshLib.fs_existsSync.lastReason}`);
        }
    } catch (err) {
        assertFail('2.x: Unexpected error in folder validation suite', err.stack || err.message);
    } finally {
        env.stop();
        printSuiteResult();
    }
})();
