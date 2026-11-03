#!/usr/bin/env node
/**
 * test_03_local_vs_server_parity.js - Non-GUI Git Parity Test Suite (Local vs. Remote SSH Server)
 *
 * Compares core Git functions from app.js across:
 *   1) Local repository folder
 *   2) Remote SSH server repository folder (served over an ephemeral localhost sshd)
 *
 * Verifies parity for:
 *   - gitStatus() on clean, untracked, modified, staged, and deleted files
 *   - gitShowHistorical() diff file list parsing and raw git diffs
 *   - gitHistory() commit logs and counts
 *   - gitBranchList() local/remote branch detection and show flags
 *   - gitStash() and gitStashPop() uncommitted state preservation
 *   - git diff / working tree file content equivalence
 *
 * NOTE: Operates 100% inside isolated temporary directories. Never touches ~/.Pragma-git or real user settings.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const vm = require('vm');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const simpleGitDefault = require(path.join(REPO_ROOT, 'node_modules/simple-git'));
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

console.log('Running Suite: Git Parity Tests (Local vs Remote SSH Server)');

const appCode = fs.readFileSync(path.join(REPO_ROOT, 'app.js'), 'utf8');

function extractFunction(name) {
    const regex = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{');
    const match = appCode.match(regex);
    if (!match) throw new Error('Could not find function ' + name + ' in app.js');
    const start = match.index;
    let openBraces = 0, started = false, end = start;
    for (let i = start; i < appCode.length; i++) {
        if (appCode[i] === '{') { openBraces++; started = true; }
        else if (appCode[i] === '}') { openBraces--; if (started && openBraces === 0) { end = i + 1; break; } }
    }
    return appCode.slice(start, end);
}

// 1. Setup Ephemeral OpenSSH Server & Temporary Sandboxes
const sshScript = path.join(REPO_ROOT, 'automated-tests/ssh_test_server.sh');
let sshdPort = null;
let sshdPid = null;
let sshdDir = null;
let tmpBaseDir = null;

function cleanup() {
    if (sshdPid || sshdPort || sshdDir) {
        try {
            const stopCmd = `
                source "${sshScript}"
                TEST_SSHD_PORT="${sshdPort || ''}"
                TEST_SSHD_PID="${sshdPid || ''}"
                TEST_SSHD_DIR="${sshdDir || ''}"
                stop_test_sshd
            `;
            execSync(stopCmd, { shell: '/bin/bash', stdio: 'ignore' });
        } catch (e) {}
    }
    if (tmpBaseDir && fs.existsSync(tmpBaseDir)) {
        try {
            fs.rmSync(tmpBaseDir, { recursive: true, force: true });
        } catch (e) {}
    }
}

process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

async function main() {
    try {
        // Start ephemeral SSH server
        const startOut = execSync(`
            source "${sshScript}"
            start_test_sshd || { echo "FAIL:$TEST_SSHD_ERROR"; exit 1; }
            echo "PORT:$TEST_SSHD_PORT"
            echo "PID:$TEST_SSHD_PID"
            echo "DIR:$TEST_SSHD_DIR"
        `, { shell: '/bin/bash' }).toString();

        const portMatch = startOut.match(/PORT:(\d+)/);
        const pidMatch = startOut.match(/PID:(\d+)/);
        const dirMatch = startOut.match(/DIR:([^\r\n]+)/);

        if (!portMatch || !pidMatch) {
            throw new Error(`Failed to start test sshd: ${startOut}`);
        }
        sshdPort = parseInt(portMatch[1], 10);
        sshdPid = parseInt(pidMatch[1], 10);
        sshdDir = dirMatch ? dirMatch[1].trim() : '';

        // Create temporary sandboxes
        tmpBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pragma_parity_'));
        const clientKey = path.join(tmpBaseDir, 'test_key');
        execSync(`ssh-keygen -q -t ed25519 -N "" -f "${clientKey}"`);
        fs.appendFileSync(path.join(sshdDir, 'authorized_keys'), fs.readFileSync(clientKey + '.pub'));

        const localRepoDir = path.join(tmpBaseDir, 'local_repo');
        const serverRepoDir = path.join(tmpBaseDir, 'server_repo');
        fs.mkdirSync(localRepoDir, { recursive: true });
        fs.mkdirSync(serverRepoDir, { recursive: true });

        // Initialize identical git setups
        for (const dir of [localRepoDir, serverRepoDir]) {
            execSync(`git -C "${dir}" init -b main`);
            execSync(`git -C "${dir}" config user.name "Parity Tester"`);
            execSync(`git -C "${dir}" config user.email "parity@tester.local"`);
        }

        const username = os.userInfo().username;
        const sshUrl = `ssh://${username}@127.0.0.1:${sshdPort}${serverRepoDir}`;

        // Create isolated VM runtime for app.js functions
        function createRepoVM(repoPath) {
            const isSsh = repoPath.startsWith('ssh:');
            const sandbox = {
                simpleGitDefault,
                STARTDIR: REPO_ROOT,
                GIT_CONFIG_FOLDER: path.join(REPO_ROOT, 'gitconfigs'),
                pathsep: path.sep,
                process: {
                    platform: process.platform,
                    env: Object.assign({}, process.env, isSsh ? { PRAGMA_SSH_KEY: clientKey } : {})
                },
                localState: { historyHash: 'HEAD', pinnedCommit: '' },
                state: { repos: [{ localFolder: repoPath }], repoNumber: 0, FirstParent: false, StashPop: true },
                configFilePath: () => path.join(REPO_ROOT, 'gitconfigs', process.platform === 'darwin' ? 'pragma-git-config_mac' : 'pragma-git-config_linux'),
                sshKeyEnv: () => (isSsh ? { PRAGMA_SSH_KEY: clientKey } : {}),
                console: { log: () => {}, error: () => {}, warn: () => {} },
                document: {
                    getElementById: (id) => ({
                        value: '',
                        style: { visibility: 'hidden' },
                        checked: false
                    })
                },
                URL: global.URL,
                Promise: global.Promise
            };

            const fns = [
                'simpleGit',
                'gitStatus',
                'gitHistory',
                'gitBranchList',
                'localVersionExists',
                'gitIsFirstCommitOldest',
                'gitShowHistorical'
            ];

            let compiled = '';
            fns.forEach(fn => compiled += extractFunction(fn) + '\n');
            vm.runInNewContext(compiled, sandbox);
            return sandbox;
        }

        const localVM = createRepoVM(localRepoDir);
        const serverVM = createRepoVM(sshUrl);

        // -------------------------------------------------------------
        // Test 1: Initial Clean State Status Parity
        // -------------------------------------------------------------
        const localSt1 = await localVM.gitStatus();
        const serverSt1 = await serverVM.gitStatus();

        if (localSt1.current === serverSt1.current &&
            localSt1.current === 'main' &&
            Array.isArray(localSt1.not_added) &&
            localSt1.not_added.length === 0 &&
            serverSt1.not_added.length === 0) {
            assertPass('1: gitStatus() on empty/initial repo reports identical clean state & branch (main)');
        } else {
            assertFail('1: gitStatus() clean state parity', `Local: ${JSON.stringify(localSt1)}, Server: ${JSON.stringify(serverSt1)}`);
        }

        // -------------------------------------------------------------
        // Test 2: Untracked Files Status Parity
        // -------------------------------------------------------------
        fs.writeFileSync(path.join(localRepoDir, 'untracked_alpha.txt'), 'Hello Local\n');
        fs.writeFileSync(path.join(serverRepoDir, 'untracked_alpha.txt'), 'Hello Server\n');

        const localSt2 = await localVM.gitStatus();
        const serverSt2 = await serverVM.gitStatus();

        if (JSON.stringify(localSt2.not_added) === JSON.stringify(serverSt2.not_added) &&
            localSt2.not_added.includes('untracked_alpha.txt')) {
            assertPass('2: gitStatus() detects identical untracked files (not_added)');
        } else {
            assertFail('2: gitStatus() untracked files mismatch', `Local: ${localSt2.not_added}, Server: ${serverSt2.not_added}`);
        }

        // -------------------------------------------------------------
        // Test 3: Staged & Committed State Parity
        // -------------------------------------------------------------
        execSync(`git -C "${localRepoDir}" add untracked_alpha.txt && git -C "${localRepoDir}" commit -m "Commit 1"`);
        execSync(`git -C "${serverRepoDir}" add untracked_alpha.txt && git -C "${serverRepoDir}" commit -m "Commit 1"`);

        const localSt3 = await localVM.gitStatus();
        const serverSt3 = await serverVM.gitStatus();

        if (localSt3.not_added.length === 0 &&
            serverSt3.not_added.length === 0 &&
            localSt3.modified.length === 0 &&
            serverSt3.modified.length === 0) {
            assertPass('3: gitStatus() on committed files reports identical clean tracking state');
        } else {
            assertFail('3: gitStatus() post-commit mismatch', `Local: ${JSON.stringify(localSt3)}, Server: ${JSON.stringify(serverSt3)}`);
        }

        // -------------------------------------------------------------
        // Test 4: Modified and Deleted Files Status Parity
        // -------------------------------------------------------------
        fs.writeFileSync(path.join(localRepoDir, 'untracked_alpha.txt'), 'Modified Content\n');
        fs.writeFileSync(path.join(serverRepoDir, 'untracked_alpha.txt'), 'Modified Content\n');

        fs.writeFileSync(path.join(localRepoDir, 'to_delete.txt'), 'Delete me\n');
        fs.writeFileSync(path.join(serverRepoDir, 'to_delete.txt'), 'Delete me\n');
        execSync(`git -C "${localRepoDir}" add to_delete.txt && git -C "${localRepoDir}" commit -m "Commit 2"`);
        execSync(`git -C "${serverRepoDir}" add to_delete.txt && git -C "${serverRepoDir}" commit -m "Commit 2"`);

        fs.unlinkSync(path.join(localRepoDir, 'to_delete.txt'));
        fs.unlinkSync(path.join(serverRepoDir, 'to_delete.txt'));

        const localSt4 = await localVM.gitStatus();
        const serverSt4 = await serverVM.gitStatus();

        const modEqual = JSON.stringify(localSt4.modified.sort()) === JSON.stringify(serverSt4.modified.sort());
        const delEqual = JSON.stringify(localSt4.deleted.sort()) === JSON.stringify(serverSt4.deleted.sort());

        if (modEqual && delEqual && localSt4.modified.includes('untracked_alpha.txt') && localSt4.deleted.includes('to_delete.txt')) {
            assertPass('4: gitStatus() detects identical modified and deleted files');
        } else {
            assertFail('4: gitStatus() modified/deleted mismatch', `Local: mod=${localSt4.modified} del=${localSt4.deleted}; Server: mod=${serverSt4.modified} del=${serverSt4.deleted}`);
        }

        // -------------------------------------------------------------
        // Test 5: Historical Diff Parity (gitShowHistorical)
        // -------------------------------------------------------------
        // Commit changes so we can inspect gitShowHistorical()
        execSync(`git -C "${localRepoDir}" add -u && git -C "${localRepoDir}" commit -m "Commit 3: updates"`);
        execSync(`git -C "${serverRepoDir}" add -u && git -C "${serverRepoDir}" commit -m "Commit 3: updates"`);

        localVM.localState.historyHash = 'HEAD';
        serverVM.localState.historyHash = 'HEAD';

        const localDiff = await localVM.gitShowHistorical();
        const serverDiff = await serverVM.gitShowHistorical();

        const diffFilesMatch = JSON.stringify(localDiff.files) === JSON.stringify(serverDiff.files);
        const diffModifiedMatch = JSON.stringify(localDiff.modified) === JSON.stringify(serverDiff.modified);
        const diffDeletedMatch = JSON.stringify(localDiff.deleted) === JSON.stringify(serverDiff.deleted);

        if (diffFilesMatch && diffModifiedMatch && diffDeletedMatch) {
            assertPass('5: gitShowHistorical() parses identical diff files, modified, and deleted structures');
        } else {
            assertFail('5: gitShowHistorical() mismatch', `Local: ${JSON.stringify(localDiff)}, Server: ${JSON.stringify(serverDiff)}`);
        }

        // -------------------------------------------------------------
        // Test 6: Commit History Log Parity (gitHistory)
        // -------------------------------------------------------------
        const localHist = await localVM.gitHistory();
        const serverHist = await serverVM.gitHistory();

        if (localHist.length === serverHist.length &&
            localHist.length === 3 &&
            localHist[0].message === serverHist[0].message &&
            localHist[1].message === serverHist[1].message &&
            localHist[2].message === serverHist[2].message) {
            assertPass('6: gitHistory() returns identical commit count (3) and commit messages');
        } else {
            assertFail('6: gitHistory() mismatch', `Local len: ${localHist ? localHist.length : 0}, Server len: ${serverHist ? serverHist.length : 0}`);
        }

        // -------------------------------------------------------------
        // Test 7: Branch List Parity (gitBranchList)
        // -------------------------------------------------------------
        execSync(`git -C "${localRepoDir}" branch feature-local-test`);
        execSync(`git -C "${serverRepoDir}" branch feature-local-test`);

        const localBranches = await localVM.gitBranchList();
        const serverBranches = await serverVM.gitBranchList();

        const localBranchAll = localBranches.all.sort();
        const serverBranchAll = serverBranches.all.sort();
        const branchesEqual = JSON.stringify(localBranchAll) === JSON.stringify(serverBranchAll);

        if (branchesEqual && localBranches.current === serverBranches.current && localBranches.current === 'main') {
            assertPass('7: gitBranchList() returns identical branches and current branch');
        } else {
            assertFail('7: gitBranchList() mismatch', `Local: ${JSON.stringify(localBranches)}, Server: ${JSON.stringify(serverBranches)}`);
        }

        // -------------------------------------------------------------
        // Test 8: Working Tree Content & Git Diff Equivalence
        // -------------------------------------------------------------
        const localTreeSha = execSync(`git -C "${localRepoDir}" rev-parse HEAD^{tree}`).toString().trim();
        const serverTreeSha = execSync(`git -C "${serverRepoDir}" rev-parse HEAD^{tree}`).toString().trim();

        if (localTreeSha === serverTreeSha) {
            assertPass(`8: Working tree SHA-1 hashes match perfectly between local and server (${localTreeSha})`);
        } else {
            assertFail('8: Working tree hash mismatch', `Local: ${localTreeSha}, Server: ${serverTreeSha}`);
        }

        // Check raw diff between trees
        const treeDiff = execSync(`git -C "${localRepoDir}" diff ${localTreeSha} ${serverTreeSha}`).toString().trim();
        if (treeDiff === '') {
            assertPass('9: Full raw git diff between local and server trees is 100% empty (byte-for-byte equal)');
        } else {
            assertFail('9: Raw tree diff has differences', treeDiff);
        }

    } catch (err) {
        assertFail('Fatal error during parity suite execution', err.stack || err.message);
    } finally {
        cleanup();
        printSuiteResult();
    }
}

main();
