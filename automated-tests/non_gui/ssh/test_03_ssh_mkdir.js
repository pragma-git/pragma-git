#!/usr/bin/env node
/**
 * test_03_ssh_mkdir.js - Tests fs_mkdir remote directory creation via SshConnectionPool
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { REPO_ROOT, startEphemeralSshServer } = require('./ssh_test_helper.js');
const sshLib = require(path.join(REPO_ROOT, 'ssh_folder/ssh-folder-lib.js'));
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

console.log('Running Suite: SSH Remote Directory Creation (fs_mkdir) Tests');

(async () => {
    const env = startEphemeralSshServer();
    try {
        const baseDir = path.join(env.sandboxDir, 'mkdir_tests');

        // Test 1: Create single directory
        const singleDir = path.join(baseDir, 'single_folder');
        await sshLib.fs_mkdir(env.makeSshUrl(singleDir));
        if (fs.existsSync(singleDir) && fs.statSync(singleDir).isDirectory()) {
            assertPass('3.1: Create remote directory via fs_mkdir');
        } else {
            assertFail('3.1: Create remote directory via fs_mkdir', `Missing: ${singleDir}`);
        }

        // Test 2: Create nested directories (mkdir -p)
        const nestedDir = path.join(baseDir, 'nested', 'path', 'to', 'folder');
        await sshLib.fs_mkdir(env.makeSshUrl(nestedDir));
        if (fs.existsSync(nestedDir) && fs.statSync(nestedDir).isDirectory()) {
            assertPass('3.2: Create nested remote directories (mkdir -p behavior)');
        } else {
            assertFail('3.2: Create nested remote directories', `Missing: ${nestedDir}`);
        }

        // Test 3: Idempotency
        await sshLib.fs_mkdir(env.makeSshUrl(nestedDir));
        if (fs.existsSync(nestedDir)) {
            assertPass('3.3: Idempotent creation of existing directory succeeds without error');
        } else {
            assertFail('3.3: Idempotent creation failed');
        }

        // Test 4: Paths containing spaces and '--'
        const spaceDir = path.join(baseDir, 'folder -- with spaces');
        await sshLib.fs_mkdir(env.makeSshUrl(spaceDir));
        if (fs.existsSync(spaceDir) && fs.statSync(spaceDir).isDirectory()) {
            assertPass('3.4: Create remote directory containing spaces and "--"');
        } else {
            assertFail('3.4: Create remote directory with spaces', `Missing: ${spaceDir}`);
        }
    } catch (err) {
        assertFail('3.x: Unexpected error in fs_mkdir suite', err.stack || err.message);
    } finally {
        env.stop();
        printSuiteResult();
    }
})();
