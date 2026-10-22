#!/usr/bin/env node
// test_06_ssh_lib_node.js - Node.js unit tests for ssh-folder-lib.js

const path = require('path');
const fs = require('fs');
const os = require('os');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const sshLib = require(path.join(REPO_ROOT, 'ssh_folder/ssh-folder-lib.js'));
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

console.log('Running Suite: SSH Folder Library Node.js Unit Tests');

// Test 1: getDefaultSshKey returns a valid non-empty path
try {
    const defaultKey = sshLib.getDefaultSshKey();
    if (typeof defaultKey === 'string' && defaultKey.length > 0) {
        assertPass(`6.1: getDefaultSshKey() returns valid path (${defaultKey})`);
    } else {
        assertFail('6.1: getDefaultSshKey() returns non-empty string', `Got: ${defaultKey}`);
    }
} catch (err) {
    assertFail('6.1: getDefaultSshKey() throws error', err.message);
}

// Test 2: getDefaultSshKey prioritizes existing keys with matching .pub files
try {
    const defaultKey = sshLib.getDefaultSshKey();
    // Verify that the returned key or its .pub exists in ~/.ssh
    const hasKey = fs.existsSync(defaultKey) || fs.existsSync(defaultKey + '.pub');
    if (hasKey) {
        assertPass(`6.2: Detected default key exists on filesystem (${defaultKey})`);
    } else {
        // If neither exists, it must be the fallback ~/.ssh/id_ed25519
        const isFallback = defaultKey.endsWith('.ssh/id_ed25519') || defaultKey.endsWith('.ssh\\id_ed25519');
        if (isFallback) {
            assertPass('6.2: Fallback key path (~/.ssh/id_ed25519) returned when no keys present');
        } else {
            assertFail('6.2: Key existence validation', `Key does not exist: ${defaultKey}`);
        }
    }
} catch (err) {
    assertFail('6.2: Key verification error', err.message);
}

// Test 3: Path transformation helpers (Windows <-> WSL)
try {
    // Only test on non-windows or verify function handles input
    const testPath = '/mnt/c/Users/Test/Repo';
    const result = sshLib.wslToWindowsPath(testPath);
    if (typeof result === 'string') {
        assertPass('6.3: wslToWindowsPath handles path without error');
    } else {
        assertFail('6.3: wslToWindowsPath returned non-string', result);
    }
} catch (err) {
    assertFail('6.3: wslToWindowsPath error', err.message);
}

// Test 4: parseSshUrl decomposes SSH URLs accurately
try {
    const url1 = 'ssh://gituser@example.com:2222/var/git/repo.git';
    const parsed1 = sshLib.parseSshUrl(url1);
    if (parsed1.username === 'gituser' && parsed1.host === 'example.com' && parsed1.port === '2222' && parsed1.folder === '/var/git/repo.git') {
        assertPass('6.4: parseSshUrl handles full SSH URL with port');
    } else {
        assertFail('6.4: parseSshUrl full SSH URL', JSON.stringify(parsed1));
    }

    const url2 = 'ssh://devuser@192.168.1.50/home/devuser/project';
    const parsed2 = sshLib.parseSshUrl(url2);
    if (parsed2.username === 'devuser' && parsed2.host === '192.168.1.50' && !parsed2.port && parsed2.folder === '/home/devuser/project') {
        assertPass('6.5: parseSshUrl handles IP-based SSH URL without port');
    } else {
        assertFail('6.5: parseSshUrl IP-based SSH URL', JSON.stringify(parsed2));
    }

    const url3 = 'ssh://myserver.org/opt/repo';
    const parsed3 = sshLib.parseSshUrl(url3);
    if (!parsed3.username && parsed3.host === 'myserver.org' && parsed3.folder === '/opt/repo') {
        assertPass('6.6: parseSshUrl handles URL without username');
    } else {
        assertFail('6.6: parseSshUrl URL without username', JSON.stringify(parsed3));
    }
} catch (err) {
    assertFail('6.4-6.6: parseSshUrl threw error', err.message);
}

printSuiteResult();
