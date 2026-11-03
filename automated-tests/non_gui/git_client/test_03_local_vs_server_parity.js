#!/usr/bin/env node
/**
 * test_03_local_vs_server_parity.js - Non-GUI Git Parity Test Suite (Local vs. Remote SSH Server)
 *
 * Compares core Git functions from app.js across:
 *   1) Local repository folder
 *   2) Remote SSH server repository folder (served over an ephemeral localhost sshd)
 *
 * Comprehensive coverage across:
 *   - gitStatus() on clean, untracked, modified, staged, and deleted files
 *   - gitShowHistorical() diff file list parsing and raw git diffs
 *   - gitHistory() commit logs and counts
 *   - gitBranchList() local/remote branch detection and show flags
 *   - gitCurrentCommit() (rev-parse HEAD) hash consistency and formatting
 *   - gitIsMergeCommit() single-parent vs. multi-parent merge commit detection
 *   - gitIsFirstCommitOldest() chronological ordering and internal cache memoization
 *   - Tag operations: tag creation (lightweight & annotated), listing (--list), rev-parse, and deletion
 *   - Branch switching & checkout: checkout branch, detached HEAD, and gitStatus().current tracking
 *   - Config listing & resolution: gitConfigList() and getConfig('init.defaultBranch')
 *   - Repository discovery & validation: checkIsRepo() on repo vs. non-repo directories
 *   - Working tree SHA-1 and full diff equivalence (byte-for-byte identical)
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


function getBashShell() {
    if (process.platform === 'win32') {
        const candidates = [
            'C:\\Program Files\\Git\\bin\\bash.exe',
            'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
            process.env.COMSPEC ? undefined : 'bash'
        ];
        for (const c of candidates) {
            if (c && fs.existsSync(c)) return c;
        }
        return 'bash';
    }
    return '/bin/bash';
}
const bashShell = getBashShell();

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
            execSync(stopCmd, { shell: bashShell, stdio: 'ignore' });
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
        `, { shell: bashShell }).toString();

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
        const nonRepoDir = path.join(tmpBaseDir, 'non_repo_folder');
        fs.mkdirSync(localRepoDir, { recursive: true });
        fs.mkdirSync(serverRepoDir, { recursive: true });
        fs.mkdirSync(nonRepoDir, { recursive: true });

        // Initialize identical git setups
        for (const dir of [localRepoDir, serverRepoDir]) {
            execSync(`git -C "${dir}" init -b main`);
            execSync(`git -C "${dir}" config user.name "Parity Tester"`);
            execSync(`git -C "${dir}" config user.email "parity@tester.local"`);
            execSync(`git -C "${dir}" config init.defaultBranch "main"`);
        }

        const username = (os.userInfo().username || process.env.USER || process.env.USERNAME || '').replace(/^.*\\/, '');
        const serverRepoPath = process.platform === 'win32' ? serverRepoDir.replace(/\\/g, '/').replace(/^([a-zA-Z]):/, (m, d) => '/mnt/' + d.toLowerCase()) : serverRepoDir;
        const nonRepoPath = process.platform === 'win32' ? nonRepoDir.replace(/\\/g, '/').replace(/^([a-zA-Z]):/, (m, d) => '/mnt/' + d.toLowerCase()) : nonRepoDir;
        const sshUrl = `ssh://${username}@127.0.0.1:${sshdPort}${serverRepoPath}`;
        const sshNonRepoUrl = `ssh://${username}@127.0.0.1:${sshdPort}${nonRepoPath}`;

        // Create isolated VM runtime for app.js functions
        function createRepoVM(repoPath) {
            const isSsh = repoPath.startsWith('ssh:');
            const sandbox = {
                simpleGitDefault,
                STARTDIR: REPO_ROOT,
                GIT_CONFIG_FOLDER: path.join(REPO_ROOT, 'gitconfigs'),
                pathsep: path.sep,
                os: { EOL: '\n' },
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
                'gitCurrentCommit',
                'gitIsMergeCommit',
                'gitIsFirstCommitOldest',
                'gitShowHistorical',
                'gitConfigList'
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
        execSync(`git -C "${localRepoDir}" add untracked_alpha.txt && GIT_COMMITTER_DATE="2026-11-03T10:00:00" git -C "${localRepoDir}" commit --date="2026-11-03T10:00:00" -m "Commit 1"`);
        execSync(`git -C "${serverRepoDir}" add untracked_alpha.txt && GIT_COMMITTER_DATE="2026-11-03T10:00:00" git -C "${serverRepoDir}" commit --date="2026-11-03T10:00:00" -m "Commit 1"`);

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
        execSync(`git -C "${localRepoDir}" add to_delete.txt && GIT_COMMITTER_DATE="2026-11-03T10:01:00" git -C "${localRepoDir}" commit --date="2026-11-03T10:01:00" -m "Commit 2"`);
        execSync(`git -C "${serverRepoDir}" add to_delete.txt && GIT_COMMITTER_DATE="2026-11-03T10:01:00" git -C "${serverRepoDir}" commit --date="2026-11-03T10:01:00" -m "Commit 2"`);

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
        execSync(`git -C "${localRepoDir}" add -u && GIT_COMMITTER_DATE="2026-11-03T10:02:00" git -C "${localRepoDir}" commit --date="2026-11-03T10:02:00" -m "Commit 3: updates"`);
        execSync(`git -C "${serverRepoDir}" add -u && GIT_COMMITTER_DATE="2026-11-03T10:02:00" git -C "${serverRepoDir}" commit --date="2026-11-03T10:02:00" -m "Commit 3: updates"`);

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
        // Test 8: gitCurrentCommit (rev-parse HEAD)
        // -------------------------------------------------------------
        const localHead = await localVM.gitCurrentCommit();
        const serverHead = await serverVM.gitCurrentCommit();

        if (typeof localHead === 'string' && /^[0-9a-f]{40}$/.test(localHead) &&
            typeof serverHead === 'string' && /^[0-9a-f]{40}$/.test(serverHead)) {
            assertPass(`8: gitCurrentCommit() returns valid 40-char SHA format on both targets`);
        } else {
            assertFail('8: gitCurrentCommit() format error', `Local: ${localHead}, Server: ${serverHead}`);
        }

        // -------------------------------------------------------------
        // Test 9: gitIsMergeCommit (single-parent vs multi-parent merge)
        // -------------------------------------------------------------
        const localIsMergeBefore = await localVM.gitIsMergeCommit(localHead);
        const serverIsMergeBefore = await serverVM.gitIsMergeCommit(serverHead);

        // Create a merge commit on both with distinct commit timestamps
        for (const dir of [localRepoDir, serverRepoDir]) {
            execSync(`git -C "${dir}" checkout -b branch-for-merge`);
            fs.writeFileSync(path.join(dir, 'merge_side.txt'), 'branch-for-merge content\n');
            execSync(`git -C "${dir}" add merge_side.txt && GIT_COMMITTER_DATE="2026-11-03T10:03:00" git -C "${dir}" commit --date="2026-11-03T10:03:00" -m "Side commit"`);
            execSync(`git -C "${dir}" checkout main`);
            execSync(`GIT_COMMITTER_DATE="2026-11-03T10:04:00" git -C "${dir}" merge --no-ff branch-for-merge -m "Merge branch-for-merge into main"`);
        }

        const localHeadAfterMerge = await localVM.gitCurrentCommit();
        const serverHeadAfterMerge = await serverVM.gitCurrentCommit();

        const localIsMergeAfter = await localVM.gitIsMergeCommit(localHeadAfterMerge);
        const serverIsMergeAfter = await serverVM.gitIsMergeCommit(serverHeadAfterMerge);

        if (localIsMergeBefore === false && serverIsMergeBefore === false &&
            localIsMergeAfter === true && serverIsMergeAfter === true) {
            assertPass('9: gitIsMergeCommit() correctly distinguishes normal commit (false) and merge commit (true)');
        } else {
            assertFail('9: gitIsMergeCommit() parity failure', `Before: local=${localIsMergeBefore} server=${serverIsMergeBefore}; After: local=${localIsMergeAfter} server=${serverIsMergeAfter}`);
        }

        // -------------------------------------------------------------
        // Test 10: gitIsFirstCommitOldest (chronological order & cache memoization)
        // -------------------------------------------------------------
        const localOldest = await localVM.gitIsFirstCommitOldest(localHead, localHeadAfterMerge);
        const serverOldest = await serverVM.gitIsFirstCommitOldest(serverHead, serverHeadAfterMerge);

        // Verify cache hit returns identical value
        const localCachedOldest = await localVM.gitIsFirstCommitOldest(localHead, localHeadAfterMerge);
        const serverCachedOldest = await serverVM.gitIsFirstCommitOldest(serverHead, serverHeadAfterMerge);

        if (localOldest === true && serverOldest === true &&
            localCachedOldest === true && serverCachedOldest === true) {
            assertPass('10: gitIsFirstCommitOldest() detects chronological order and cache memoization equivalently');
        } else {
            assertFail('10: gitIsFirstCommitOldest() mismatch', `Local: ${localOldest} (${localCachedOldest}), Server: ${serverOldest} (${serverCachedOldest})`);
        }

        // -------------------------------------------------------------
        // Test 11: Tag Operations (create, list, rev-parse, delete)
        // -------------------------------------------------------------
        // 1. Create annotated tag
        await localVM.simpleGit(localRepoDir).tag(['-a', 'v1.0.0', '-m', 'Release 1.0.0']);
        await serverVM.simpleGit(sshUrl).tag(['-a', 'v1.0.0', '-m', 'Release 1.0.0']);

        // 2. Create lightweight tag
        await localVM.simpleGit(localRepoDir).tag(['v1.0.1']);
        await serverVM.simpleGit(sshUrl).tag(['v1.0.1']);

        const localTagList = (await localVM.simpleGit(localRepoDir).tag(['--list'])).trim().split(/\r?\n/).sort();
        const serverTagList = (await serverVM.simpleGit(sshUrl).tag(['--list'])).trim().split(/\r?\n/).sort();

        // 3. Resolve tag commit SHA (rev-parse tag^{commit})
        const localTagSha = (await localVM.simpleGit(localRepoDir).raw(['rev-parse', 'v1.0.0^{commit}'])).trim();
        const serverTagSha = (await serverVM.simpleGit(sshUrl).raw(['rev-parse', 'v1.0.0^{commit}'])).trim();

        // 4. Delete tag
        await localVM.simpleGit(localRepoDir).raw(['tag', '-d', 'v1.0.1']);
        await serverVM.simpleGit(sshUrl).raw(['tag', '-d', 'v1.0.1']);

        const localTagListPost = (await localVM.simpleGit(localRepoDir).tag(['--list'])).trim();
        const serverTagListPost = (await serverVM.simpleGit(sshUrl).tag(['--list'])).trim();

        if (JSON.stringify(localTagList) === JSON.stringify(serverTagList) &&
            localTagList.includes('v1.0.0') && localTagList.includes('v1.0.1') &&
            /^[0-9a-f]{40}$/.test(localTagSha) && /^[0-9a-f]{40}$/.test(serverTagSha) &&
            localTagListPost === 'v1.0.0' && serverTagListPost === 'v1.0.0') {
            assertPass('11: Tag operations (annotated, lightweight, listing, rev-parse, delete) match identically');
        } else {
            assertFail('11: Tag parity mismatch', `Tags: local=${localTagList} server=${serverTagList}; Post: local=${localTagListPost} server=${serverTagListPost}`);
        }

        // -------------------------------------------------------------
        // Test 12: Branch Switching & Checkout Parity
        // -------------------------------------------------------------
        // Switch branch to feature-local-test
        await localVM.simpleGit(localRepoDir).checkout('feature-local-test');
        await serverVM.simpleGit(sshUrl).checkout('feature-local-test');

        const localStBranch = await localVM.gitStatus();
        const serverStBranch = await serverVM.gitStatus();

        // Checkout detached HEAD
        await localVM.simpleGit(localRepoDir).checkout(localHead);
        await serverVM.simpleGit(sshUrl).checkout(serverHead);

        const localStDetached = await localVM.gitStatus();
        const serverStDetached = await serverVM.gitStatus();

        // Return to main branch
        await localVM.simpleGit(localRepoDir).checkout('main');
        await serverVM.simpleGit(sshUrl).checkout('main');

        const localStMain = await localVM.gitStatus();
        const serverStMain = await serverVM.gitStatus();

        if (localStBranch.current === 'feature-local-test' && serverStBranch.current === 'feature-local-test' &&
            localStDetached.detached === true && serverStDetached.detached === true &&
            localStMain.current === 'main' && serverStMain.current === 'main') {
            assertPass('12: Branch checkout & detached HEAD state navigation update gitStatus().current equivalently');
        } else {
            assertFail('12: Checkout parity mismatch', `Branch: local=${localStBranch.current} server=${serverStBranch.current}; Detached: local=${localStDetached.detached} server=${serverStDetached.detached}`);
        }

        // -------------------------------------------------------------
        // Test 13: Git Config Listing & Value Resolution
        // -------------------------------------------------------------
        const localCfg = await localVM.gitConfigList(localRepoDir);
        const serverCfg = await serverVM.gitConfigList(sshUrl);

        const localDefBranch = await localVM.simpleGit(localRepoDir).getConfig('init.defaultBranch');
        const serverDefBranch = await serverVM.simpleGit(sshUrl).getConfig('init.defaultBranch');

        if (localCfg['user.name'] === 'Parity Tester' && serverCfg['user.name'] === 'Parity Tester' &&
            localCfg['user.email'] === 'parity@tester.local' && serverCfg['user.email'] === 'parity@tester.local' &&
            localDefBranch.value === 'main' && serverDefBranch.value === 'main') {
            assertPass('13: gitConfigList() and getConfig("init.defaultBranch") resolve identically');
        } else {
            assertFail('13: Config resolution parity mismatch', `Local: ${JSON.stringify(localCfg)}, Server: ${JSON.stringify(serverCfg)}`);
        }

        // -------------------------------------------------------------
        // Test 14: Repository Discovery & Validation (checkIsRepo)
        // -------------------------------------------------------------
        const localIsRepo = await localVM.simpleGit(localRepoDir).checkIsRepo();
        const serverIsRepo = await serverVM.simpleGit(sshUrl).checkIsRepo();

        const localNonRepoCheck = await localVM.simpleGit(nonRepoDir).checkIsRepo();
        const serverNonRepoCheck = await serverVM.simpleGit(sshNonRepoUrl).checkIsRepo();

        if (localIsRepo === true && serverIsRepo === true &&
            localNonRepoCheck === false && serverNonRepoCheck === false) {
            assertPass('14: checkIsRepo() detects valid git repositories (true) and non-repos (false) on both targets');
        } else {
            assertFail('14: checkIsRepo parity failure', `Repos: local=${localIsRepo} server=${serverIsRepo}; Non-repos: local=${localNonRepoCheck} server=${serverNonRepoCheck}`);
        }

        // -------------------------------------------------------------
        // Test 15: Working Tree Content & Git Diff Equivalence
        // -------------------------------------------------------------
        const localTreeSha = execSync(`git -C "${localRepoDir}" rev-parse HEAD^{tree}`).toString().trim();
        const serverTreeSha = execSync(`git -C "${serverRepoDir}" rev-parse HEAD^{tree}`).toString().trim();

        if (localTreeSha === serverTreeSha) {
            assertPass(`15: Working tree SHA-1 hashes match perfectly between local and server (${localTreeSha})`);
        } else {
            assertFail('15: Working tree hash mismatch', `Local: ${localTreeSha}, Server: ${serverTreeSha}`);
        }

        const treeDiff = execSync(`git -C "${localRepoDir}" diff ${localTreeSha} ${serverTreeSha}`).toString().trim();
        if (treeDiff === '') {
            assertPass('16: Full raw git diff between local and server trees is 100% empty (byte-for-byte equal)');
        } else {
            assertFail('16: Raw tree diff has differences', treeDiff);
        }

    } catch (err) {
        assertFail('Fatal error during parity suite execution', err.stack || err.message);
    } finally {
        cleanup();
        printSuiteResult();
    }
}

main();
