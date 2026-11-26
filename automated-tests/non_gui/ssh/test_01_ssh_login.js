#!/usr/bin/env node
/**
 * test_01_ssh_login.js - Tests sshTestLogin against an ephemeral SSH test server
 */

'use strict';

const path = require('path');
const { REPO_ROOT, startEphemeralSshServer } = require('./ssh_test_helper.js');
const sshLib = require(path.join(REPO_ROOT, 'ssh_folder/ssh-folder-lib.js'));
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

console.log('Running Suite: SSH Login & Authentication Tests');

(async () => {
    const env = startEphemeralSshServer();
    try {
        const sshUrl = env.makeSshUrl(env.sandboxDir);

        // Test 1: Passwordless login with default key in ~/.ssh
        const status1 = await sshLib.sshTestLogin(sshUrl);
        if (status1 === 'STATUS:OK') {
            assertPass(`1.1: Default passwordless login to ${env.user}@127.0.0.1:${env.port}`);
        } else {
            assertFail(`1.1: Default passwordless login`, `Got: ${status1}`);
        }

        // Test 2: Login with explicit key path
        const customKey = path.join(env.sandboxDir, 'explicit_key');
        sshLib.generateLocalSshKey(customKey);
        env.injectKey(`${customKey}.pub`);
        const status2 = await sshLib.sshTestLogin(sshUrl, customKey);
        if (status2 === 'STATUS:OK') {
            assertPass('1.2: Explicit key login succeeds with STATUS:OK');
        } else {
            assertFail('1.2: Explicit key login', `Got: ${status2}`);
        }

        // Test 3: Unauthorized key rejection
        const unauthKey = path.join(env.sandboxDir, 'unauth_key');
        sshLib.generateLocalSshKey(unauthKey);
        const status3 = await sshLib.sshTestLogin(sshUrl, unauthKey);
        if (status3 === 'STATUS:KEY_NEEDED') {
            assertPass('1.3: Unauthorized key is rejected with STATUS:KEY_NEEDED');
        } else {
            assertFail('1.3: Unauthorized key rejection', `Got: ${status3}`);
        }

        // Test 4: Unreachable / non-existing host
        const status4 = await sshLib.sshTestLogin(`ssh://${env.user}@non-existing-host-pragma-test.invalid/tmp`, env.defaultKey);
        if (status4.startsWith('STATUS:ERROR') || status4 === 'STATUS:TIMEOUT') {
            assertPass(`1.4: Non-existing hostname reports connection failure (${status4.slice(0, 60)})`);
        } else {
            assertFail('1.4: Non-existing hostname failure', `Got: ${status4}`);
        }

        // Test 5: Wrong port (connection refused)
        const status5 = await sshLib.sshTestLogin(`ssh://${env.user}@127.0.0.1:59998/tmp`, env.defaultKey);
        if (status5.startsWith('STATUS:ERROR') || status5.toLowerCase().includes('refused')) {
            assertPass(`1.5: Inaccessible port reports connection refused (${status5.slice(0, 60)})`);
        } else {
            assertFail('1.5: Inaccessible port failure', `Got: ${status5}`);
        }
    } catch (err) {
        assertFail('1.x: Unexpected error in SSH login suite', err.stack || err.message);
    } finally {
        env.stop();
        printSuiteResult();
    }
})();
