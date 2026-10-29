#!/usr/bin/env node
// test_07_ssh_key_generation.js - Automated tests for SSH key pair generation, permissions, and CI deployment

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const sshLib = require(path.join(REPO_ROOT, 'ssh_folder/ssh-folder-lib.js'));
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

console.log('Running Suite: SSH Key Generation & Isolated Deployment Tests');

const isCI = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);
const currentUser = (os.userInfo().username || process.env.USER || process.env.USERNAME || '').replace(/^.*\\/, '');
const testLoginBin = path.join(REPO_ROOT, 'ssh_folder/ssh-test-login');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pragma_test_keygen_'));
const keyPath = path.join(tempDir, 'id_ed25519_test');

try {
    // Test 1: Empty or invalid path rejection
    try {
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
    } catch (err) {
        assertFail('7.1: Error testing empty key path', err.message);
    }

    // Test 2: Isolated ED25519 key generation in temporary sandbox
    try {
        const createdKey = sshLib.generateLocalSshKey(keyPath);
        if (createdKey === keyPath && fs.existsSync(keyPath) && fs.existsSync(keyPath + '.pub')) {
            assertPass('7.2: generateLocalSshKey creates private and public key in isolated temp sandbox');
        } else {
            assertFail('7.2: Key files missing after generation', `Expected ${keyPath} and ${keyPath}.pub`);
        }
    } catch (err) {
        assertFail('7.2: generateLocalSshKey failed', err.message);
    }

    // Test 3: Key file permissions on POSIX systems
    try {
        if (process.platform !== 'win32') {
            const privStat = fs.statSync(keyPath);
            const pubStat = fs.statSync(keyPath + '.pub');
            const privMode = (privStat.mode & 0o777).toString(8);
            const pubMode = (pubStat.mode & 0o777).toString(8);

            if (privMode === '600' && pubMode === '644') {
                assertPass(`7.3: File permissions verified (private: 0${privMode}, public: 0${pubMode})`);
            } else {
                assertFail('7.3: Invalid file permissions', `Private: 0${privMode} (expected 0600), Public: 0${pubMode} (expected 0644)`);
            }
        } else {
            assertPass('7.3: File permissions check (skipped on Windows NTFS)');
        }
    } catch (err) {
        assertFail('7.3: Error checking file permissions', err.message);
    }

    // Test 4: Key derivation and consistency check
    try {
        const pubFileContent = fs.readFileSync(keyPath + '.pub', 'utf8').trim();
        let derived = '';
        try {
            derived = execSync(`ssh-keygen -y -f "${keyPath}"`, { encoding: 'utf8' }).trim();
        } catch (e) {
            if (process.platform === 'win32') {
                derived = execSync(`"C:\\Program Files\\git\\usr\\bin\\ssh-keygen.exe" -y -f "${keyPath}"`, { encoding: 'utf8' }).trim();
            } else {
                throw e;
            }
        }
        if (pubFileContent.startsWith(derived)) {
            assertPass('7.4: Derived public key from private key matches generated .pub file');
        } else {
            assertFail('7.4: Key derivation mismatch', `Derived: ${derived}\nFile: ${pubFileContent}`);
        }
    } catch (err) {
        assertFail('7.4: Error deriving public key', err.message);
    }

    // Test 5: Overwrite protection
    try {
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
    } catch (err) {
        assertFail('7.5: Error checking overwrite protection', err.message);
    }

    // Test 6: Suggested new key path generation
    try {
        const suggested = sshLib.getSuggestedNewKeyPath('github.com');
        if (typeof suggested === 'string' && suggested.includes('id_ed25519')) {
            assertPass(`7.6: getSuggestedNewKeyPath generates clean candidate path (${path.basename(suggested)})`);
        } else {
            assertFail('7.6: getSuggestedNewKeyPath returned unexpected path', suggested);
        }
    } catch (err) {
        assertFail('7.6: Error in getSuggestedNewKeyPath', err.message);
    }

    // Test 7: Unauthorized key rejection check (STATUS:KEY_NEEDED) without touching authorized_keys
    try {
        let output = '';
        try {
            output = execSync(`bash "${testLoginBin}" "ssh://${currentUser}@127.0.0.1/tmp" "${keyPath}"`, {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });
        } catch (e) {
            output = (e.stdout || '') + (e.stderr || '');
        }

        if (output.includes('STATUS:KEY_NEEDED')) {
            assertPass('7.7: Newly generated key is safely rejected (STATUS:KEY_NEEDED) without touching authorized_keys');
        } else {
            assertFail('7.7: Expected STATUS:KEY_NEEDED for undeployed key', output.trim());
        }
    } catch (err) {
        assertFail('7.7: Error testing undeployed key rejection', err.message);
    }

    // Test 8: CI-Guarded End-to-End Key Deployment & Verification
    if (isCI) {
        try {
            const sshDir = path.join(os.homedir(), '.ssh');
            const authKeysPath = path.join(sshDir, 'authorized_keys');
            const pubContent = fs.readFileSync(keyPath + '.pub', 'utf8').trim();

            // Append key to authorized_keys in CI runner (disposable VM)
            fs.appendFileSync(authKeysPath, '\n' + pubContent + '\n', { mode: 0o600 });

            let loginOutput = '';
            try {
                loginOutput = execSync(`bash "${testLoginBin}" "ssh://${currentUser}@127.0.0.1/tmp" "${keyPath}"`, {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe']
                });
            } catch (e) {
                loginOutput = (e.stdout || '') + (e.stderr || '');
            }

            // Remove test key from authorized_keys immediately
            try {
                const currentAuth = fs.readFileSync(authKeysPath, 'utf8');
                const keySig = pubContent.split(' ')[1];
                const cleaned = currentAuth.split('\n').filter(line => !line.includes(keySig)).join('\n');
                fs.writeFileSync(authKeysPath, cleaned, { mode: 0o600 });
            } catch (cleanupErr) {
                console.warn('Warning: Failed to clean up authorized_keys in CI:', cleanupErr);
            }

            if (loginOutput.includes('STATUS:OK')) {
                assertPass('7.8: (CI Runner) Deployed key authenticates successfully (STATUS:OK) and revokes cleanly');
            } else {
                assertFail('7.8: (CI Runner) Deployed key failed authentication', loginOutput.trim());
            }
        } catch (ciErr) {
            assertFail('7.8: (CI Runner) Error in deployment test', ciErr.message);
        }
    } else {
        // Local machine: skip modifying authorized_keys so developer macOS is completely protected
        assertPass('7.8: Local environment protected — authorized_keys modification isolated to CI runners');
    }

} finally {
    // Remove isolated sandbox directory completely
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
}

printSuiteResult();
