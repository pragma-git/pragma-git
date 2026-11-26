#!/usr/bin/env node
/**
 * test_08_ssh_multiplexing_and_config.js - Tests SSH2 persistent connection multiplexing,
 * stale-socket auto-reconnect, NTFS-style loose key file permissions, and ~/.ssh/config resolution.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { REPO_ROOT, startEphemeralSshServer } = require('./ssh_test_helper.js');
const sshLib = require(path.join(REPO_ROOT, 'ssh_folder/ssh-folder-lib.js'));
const { getSshConnectionPool } = require(path.join(REPO_ROOT, 'ssh_folder/ssh-connection-pool.js'));
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

console.log('Running Suite: SSH2 Connection Multiplexing & ~/.ssh/config Resolution Tests');

(async () => {
    const env = startEphemeralSshServer();
    try {
        const pool = getSshConnectionPool();
        pool.closeAll();

        const targetDir = path.join(env.sandboxDir, 'mux_target');
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, 'hello.txt'), 'multiplexed\n', 'utf8');
        const sshUrl = env.makeSshUrl(targetDir);

        // Test 1: Multiple sequential & concurrent operations reuse 1 single TCP SSH connection
        const [ex1, ex2, lsRes, cmdRes] = await Promise.all([
            sshLib.fs_existsSync(sshUrl),
            sshLib.fs_existsSync(`${sshUrl}/hello.txt`),
            sshLib.sshLs(sshUrl),
            sshLib.sshExec(sshUrl, 'echo MUX_OK')
        ]);

        if (ex1 && ex2 && lsRes.some(e => e.name === 'hello.txt') && cmdRes.trim() === 'MUX_OK' && pool.entries.size === 1) {
            assertPass('8.1: Concurrent SSH & SFTP operations multiplex over a single persistent ssh2.Client connection');
        } else {
            assertFail('8.1: Multiplexing check', `entries=${pool.entries.size}, ex1=${ex1}, ex2=${ex2}, cmd=${cmdRes}`);
        }

        // Capture first client reference
        const firstEntry = Array.from(pool.entries.values())[0];
        const firstClient = firstEntry.client;

        // Test 2: Subsequent calls reuse the exact same live ssh2.Client instance
        const cmdRes2 = await sshLib.sshExec(sshUrl, 'echo MUX_REUSE');
        const secondEntry = Array.from(pool.entries.values())[0];
        if (cmdRes2.trim() === 'MUX_REUSE' && secondEntry && secondEntry.client === firstClient) {
            assertPass('8.2: Subsequent SSH operations reuse the exact same pooled client without re-handshaking');
        } else {
            assertFail('8.2: Pooled client reuse failed');
        }

        // Test 3: Stale/dropped socket recovery (simulates laptop sleep / Wi-Fi network change)
        firstClient.end();
        await new Promise(r => setTimeout(r, 100));
        const cmdAfterDrop = await sshLib.sshExec(sshUrl, 'echo RECONNECTED_OK');
        const reconnectedEntry = Array.from(pool.entries.values())[0];
        if (cmdAfterDrop.trim() === 'RECONNECTED_OK' && reconnectedEntry && reconnectedEntry.client !== firstClient) {
            assertPass('8.3: Dropped SSH connection automatically evicts stale socket and reconnects transparently');
        } else {
            assertFail('8.3: Stale socket auto-reconnect failed', `out=${cmdAfterDrop}`);
        }

        // Test 4: Key with loose 0777 permissions (simulating Windows NTFS mount) works in-memory without OpenSSH refusal
        const looseKey = path.join(env.sandboxDir, 'ntfs_mode_0777_key');
        sshLib.generateLocalSshKey(looseKey);
        try { fs.chmodSync(looseKey, 0o777); } catch (e) {}
        env.injectKey(`${looseKey}.pub`);
        const looseStatus = await sshLib.sshTestLogin(sshUrl, looseKey);
        if (looseStatus === 'STATUS:OK') {
            assertPass('8.4: Private key with 0777 permissions authenticates cleanly in-memory (Windows NTFS safe)');
        } else {
            assertFail('8.4: 0777 permission key login failed', looseStatus);
        }

        // Test 5: ~/.ssh/config Host alias resolution (HostName, User, Port, IdentityFile)
        const aliasKey = path.join(env.sshDir, 'id_alias_custom');
        sshLib.generateLocalSshKey(aliasKey);
        env.injectKey(`${aliasKey}.pub`);

        const sshConfigContent = [
            'Host pragma-test-alias',
            '  HostName 127.0.0.1',
            `  User ${env.user}`,
            `  Port ${env.port}`,
            `  IdentityFile ~/.ssh/id_alias_custom`,
            ''
        ].join('\n');
        fs.writeFileSync(path.join(env.sshDir, 'config'), sshConfigContent, { mode: 0o600 });

        const aliasUrl = `ssh://pragma-test-alias${env.toRemotePosixPath(targetDir)}`;
        const aliasStatus = await sshLib.sshTestLogin(aliasUrl);
        const aliasExists = await sshLib.fs_existsSync(`${aliasUrl}/hello.txt`);
        if (aliasStatus === 'STATUS:OK' && aliasExists === true) {
            assertPass('8.5: ~/.ssh/config Host alias resolves HostName, User, Port, and IdentityFile');
        } else {
            assertFail('8.5: ~/.ssh/config Host alias resolution', `status=${aliasStatus}, exists=${aliasExists}`);
        }
    } catch (err) {
        assertFail('8.x: Unexpected error in multiplexing & config suite', err.stack || err.message);
    } finally {
        env.stop();
        printSuiteResult();
    }
})();
