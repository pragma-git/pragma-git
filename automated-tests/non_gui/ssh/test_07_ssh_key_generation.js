#!/usr/bin/env node
/**
 * test_07_ssh_key_generation.js - Automated tests for SSH key generation, permissions, derivation, and deployment
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { REPO_ROOT, startEphemeralSshServer } = require('./ssh_test_helper.js');
const sshLib = require(path.join(REPO_ROOT, 'ssh_folder/ssh-folder-lib.js'));
const { getSshConnectionPool } = require(path.join(REPO_ROOT, 'ssh_folder/ssh-connection-pool.js'));
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

console.log('Running Suite: SSH Key Generation & Isolated Deployment Tests');

(async () => {
    const env = startEphemeralSshServer();
    try {
        const keyPath = path.join(env.sandboxDir, 'id_ed25519_test');

        // Test 1: Empty or invalid path rejection
        let threw = false;
        try {
            sshLib.generateLocalSshKey('');
        } catch (e) {
            threw = true;
        }
        if (threw) {
            assertPass('7.1: generateLocalSshKey rejects empty or invalid key path');
        } else {
            assertFail('7.1: generateLocalSshKey accepted empty key path');
        }

        // Test 2: Isolated ED25519 key generation in temporary sandbox
        const createdKey = sshLib.generateLocalSshKey(keyPath);
        if (createdKey === keyPath && fs.existsSync(keyPath) && fs.existsSync(keyPath + '.pub')) {
            assertPass('7.2: generateLocalSshKey creates private and public key in isolated temp sandbox');
        } else {
            assertFail('7.2: Key files missing after generation', `Expected ${keyPath} and ${keyPath}.pub`);
        }

        // Test 3: Key file permissions on POSIX systems
        if (process.platform !== 'win32') {
            const privMode = (fs.statSync(keyPath).mode & 0o777).toString(8);
            const pubMode = (fs.statSync(keyPath + '.pub').mode & 0o777).toString(8);
            if (privMode === '600' && pubMode === '644') {
                assertPass(`7.3: File permissions verified (private: 0${privMode}, public: 0${pubMode})`);
            } else {
                assertFail('7.3: Invalid file permissions', `Private: 0${privMode}, Public: 0${pubMode}`);
            }
        } else {
            assertPass('7.3: File permissions check (skipped on Windows NTFS)');
        }

        // Test 4: Key derivation compatibility with OpenSSH ssh-keygen AND pure-JS derivePublicKeyFromPrivate
        const pubFileContent = fs.readFileSync(keyPath + '.pub', 'utf8').trim();
        const jsDerived = getSshConnectionPool().derivePublicKeyFromPrivate(keyPath).trim();
        let cliDerived = '';
        try {
            cliDerived = execSync(`ssh-keygen -y -f "${keyPath}"`, { encoding: 'utf8' }).trim();
        } catch (e) {
            if (process.platform === 'win32') {
                cliDerived = execSync(`"C:\\Program Files\\Git\\usr\\bin\\ssh-keygen.exe" -y -f "${keyPath}"`, { encoding: 'utf8' }).trim();
            } else {
                throw e;
            }
        }
        if (pubFileContent.startsWith(cliDerived) && pubFileContent.startsWith(jsDerived)) {
            assertPass('7.4: Derived public key matches both ssh-keygen -y and pure-JS ssh2 parser');
        } else {
            assertFail('7.4: Key derivation mismatch', `File: ${pubFileContent}\nCLI: ${cliDerived}\nJS: ${jsDerived}`);
        }

        // Test 5: Overwrite protection
        let overwriteBlocked = false;
        try {
            sshLib.generateLocalSshKey(keyPath);
        } catch (e) {
            if (e.message && e.message.includes('already exists')) {
                overwriteBlocked = true;
            }
        }
        if (overwriteBlocked) {
            assertPass('7.5: Overwrite protection prevents clobbering existing key');
        } else {
            assertFail('7.5: Overwrite protection failed to throw expected error');
        }

        // Test 6: Suggested new key path generation
        const suggested = sshLib.getSuggestedNewKeyPath('github.com');
        if (typeof suggested === 'string' && suggested.includes('id_ed25519')) {
            assertPass(`7.6: getSuggestedNewKeyPath generates clean candidate path (${path.basename(suggested)})`);
        } else {
            assertFail('7.6: getSuggestedNewKeyPath returned unexpected path', suggested);
        }

        // Test 7: Undeployed key rejected with STATUS:KEY_NEEDED
        const sshUrl = env.makeSshUrl(env.sandboxDir);
        const beforeStatus = await sshLib.sshTestLogin(sshUrl, keyPath);
        if (beforeStatus === 'STATUS:KEY_NEEDED') {
            assertPass('7.7: Newly generated key is rejected (STATUS:KEY_NEEDED) before deployment');
        } else {
            assertFail('7.7: Expected STATUS:KEY_NEEDED for undeployed key', beforeStatus);
        }

        // Test 8: deployPublicKey() deploys public key to isolated server authorized_keys and authenticates
        const origRemoteAuth = process.env.PRAGMA_REMOTE_AUTHORIZED_KEYS;
        try {
            process.env.PRAGMA_REMOTE_AUTHORIZED_KEYS = env.toRemotePosixPath(path.join(env.sshdDir, 'authorized_keys'));
            await getSshConnectionPool().deployPublicKey({
                username: env.user,
                server: `127.0.0.1:${env.port}`,
                keyPath
            });
            const afterStatus = await sshLib.sshTestLogin(sshUrl, keyPath);
            if (afterStatus === 'STATUS:OK') {
                assertPass('7.8: deployPublicKey deploys public key to remote authorized_keys and verifies STATUS:OK');
            } else {
                assertFail('7.8: Expected STATUS:OK after deployPublicKey', afterStatus);
            }
        } finally {
            if (origRemoteAuth !== undefined) process.env.PRAGMA_REMOTE_AUTHORIZED_KEYS = origRemoteAuth;
            else delete process.env.PRAGMA_REMOTE_AUTHORIZED_KEYS;
        }

        // Test 9: Password-authenticated deployPublicKey() when no prior SSH key is authorized on server
        const pwdServer = startEphemeralSshServer({ forceNodeServer: true, authorizeDefaultKey: false });
        try {
            pwdServer.setPassword('pragmaTestPassword!42');
            const pwdKeyPath = path.join(pwdServer.sandboxDir, 'id_ed25519_pwd_deploy');
            sshLib.generateLocalSshKey(pwdKeyPath);
            process.env.PRAGMA_REMOTE_AUTHORIZED_KEYS = pwdServer.toRemotePosixPath(path.join(pwdServer.sshdDir, 'authorized_keys'));
            await getSshConnectionPool().deployPublicKey({
                username: pwdServer.user,
                server: `127.0.0.1:${pwdServer.port}`,
                keyPath: pwdKeyPath,
                passwordProvider: async () => 'pragmaTestPassword!42'
            });
            const pwdLoginStatus = await sshLib.sshTestLogin(pwdServer.makeSshUrl(pwdServer.sandboxDir), pwdKeyPath);
            if (pwdLoginStatus === 'STATUS:OK') {
                assertPass('7.9: deployPublicKey falls back to password authentication when no key is authorized yet');
            } else {
                assertFail('7.9: Expected STATUS:OK after password-authenticated deployPublicKey', pwdLoginStatus);
            }
        } finally {
            delete process.env.PRAGMA_REMOTE_AUTHORIZED_KEYS;
            pwdServer.stop();
        }
    } catch (err) {
        assertFail('7.x: Unexpected error in key generation suite', err.stack || err.message);
    } finally {
        env.stop();
        printSuiteResult();
    }
})();
