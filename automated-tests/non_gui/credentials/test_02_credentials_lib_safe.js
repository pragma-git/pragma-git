#!/usr/bin/env node
/**
 * test_02_credentials_lib_safe.js - Isolated non-GUI tests for pragma-credentials-lib
 *
 * CRITICAL SAFETY NOTE:
 *   This test MUST NOT touch the macOS Keychain, personal tokens, or live credentials.
 *   To guarantee complete safety:
 *     1. It overrides the credential helper using an isolated mock helper script.
 *     2. It uses empty dummy URL domains ('dummy-isolated.local').
 *     3. It sets GIT_CONFIG_GLOBAL=/dev/null and GIT_CONFIG_SYSTEM=/dev/null so
 *        Git's native 'osxkeychain' helper is NEVER executed or queried.
 *     4. All test state is strictly contained inside a temporary directory and wiped on exit.
 *
 * Verifies:
 *   1. getLocalFolder accurately maps remote URLs to repository state
 *   2. setCredential executes git credential approve command pipe into isolated helper
 *   3. getCredential retrieves and parses credentials via git credential fill
 *   4. clearCredential removes stored credentials via git credential reject
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const util = require(path.join(REPO_ROOT, 'util_module.js'));
const credLibPath = path.join(REPO_ROOT, 'lib/pragma-credentials-lib.js');
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

// Create isolated temporary test directory
const testDir = path.join(os.tmpdir(), `pragma_cred_safe_test_${process.pid}`);
fs.mkdirSync(testDir, { recursive: true });

// Create isolated dummy credential helper script
const mockHelperScript = path.join(testDir, 'mock_helper.sh');
fs.writeFileSync(
    mockHelperScript,
    `#!/bin/sh
STORE="${testDir}/creds_store.txt"
if [ "$1" = "get" ]; then
    if [ -f "$STORE" ]; then
        cat "$STORE"
    fi
elif [ "$1" = "store" ]; then
    cat > "$STORE"
elif [ "$1" = "erase" ]; then
    rm -f "$STORE"
fi
`,
    { mode: 0o755 }
);

// Create isolated gitconfig clearing all inherited helpers and specifying ONLY mock helper
const testConfigPath = path.join(testDir, 'test.gitconfig');
fs.writeFileSync(
    testConfigPath,
    `[credential]
    helper = 
    helper = "${mockHelperScript}"
`
);

// Load pragma-credentials-lib into sandboxed VM context
const credCode = fs.readFileSync(credLibPath, 'utf8');

const dummyRemoteUrl = 'https://dummy-isolated.local/owner/repo.git';
const dummyUser = 'testAutomationUser';
const dummyPassword = 'mockSecretPassword123';

const sandbox = {
    console: {
        log: () => {},
        warn: () => {},
        error: () => {}
    },
    URL: global.URL,
    util,
    CWD_INIT: testDir,
    STARTDIR: testDir,
    pathsep: path.sep,
    configFilePath: () => testConfigPath,
    multiPlatformExecSync: async (folder, cmd) => {
        return execSync(cmd, {
            env: {
                ...process.env,
                GIT_CONFIG_GLOBAL: '/dev/null',
                GIT_CONFIG_SYSTEM: '/dev/null',
                GIT_TERMINAL_PROMPT: '0',
                GIT_ASKPASS: ''
            }
        }).toString().trim();
    },
    state: {
        repoNumber: 0,
        repos: [
            {
                localFolder: testDir,
                remoteURL: dummyRemoteUrl
            }
        ]
    }
};

vm.runInNewContext(credCode, sandbox);

async function runTests() {
    console.log('Running Suite: Git Credentials Helper Integration (Sandboxed & Safe)');

    try {
        // Test 1: getLocalFolder matches remoteURL
        const resolved = sandbox.getLocalFolder(dummyRemoteUrl);
        if (resolved.localFolder === testDir && resolved.remoteUrl === dummyRemoteUrl) {
            assertPass('2.1: getLocalFolder resolves corresponding local folder from state.repos');
        } else {
            assertFail('2.1: getLocalFolder failed to resolve expected folder', JSON.stringify(resolved));
        }

        // Test 2: setCredential approves and stores credential via isolated helper
        await sandbox.setCredential(dummyRemoteUrl, dummyUser, dummyPassword);
        const storeFileExists = fs.existsSync(path.join(testDir, 'creds_store.txt'));
        if (storeFileExists) {
            assertPass('2.2: setCredential executes approval command pipe to isolated mock helper');
        } else {
            assertFail('2.2: setCredential did not create stored credential file in sandbox');
        }

        // Test 3: getCredential fills and parses structured credentials
        const creds = await sandbox.getCredential(dummyRemoteUrl);
        if (
            creds &&
            creds.username === dummyUser &&
            creds.password === dummyPassword &&
            creds.protocol === 'https' &&
            creds.host === 'dummy-isolated.local'
        ) {
            assertPass('2.3: getCredential queries mock helper and parses structured credentials');
        } else {
            assertFail('2.3: getCredential failed to parse expected credentials', JSON.stringify(creds));
        }

        // Test 4: clearCredential rejects and erases credentials
        await sandbox.clearCredential(dummyRemoteUrl);
        const storeStillExists = fs.existsSync(path.join(testDir, 'creds_store.txt'));
        if (!storeStillExists) {
            assertPass('2.4: clearCredential sends rejection command pipe to mock helper, erasing credentials');
        } else {
            assertFail('2.4: clearCredential did not remove stored credentials file');
        }

    } catch (err) {
        assertFail('Unexpected error during credentials test', err.stack);
    } finally {
        // Clean up sandbox temporary directory
        try {
            fs.rmSync(testDir, { recursive: true, force: true });
        } catch (e) {}
    }

    printSuiteResult();
}

runTests();
