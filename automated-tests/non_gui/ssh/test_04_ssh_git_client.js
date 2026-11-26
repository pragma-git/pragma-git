#!/usr/bin/env node
/**
 * test_04_ssh_git_client.js - Tests in-process simpleGit('ssh://...') execution over SshConnectionPool
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { REPO_ROOT, startEphemeralSshServer } = require('./ssh_test_helper.js');
const simpleGit = require(path.join(REPO_ROOT, 'lib/simpleGitWithRetry.js'));
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

console.log('Running Suite: SSH Git Client (In-Process ssh2 Executor) Operations Tests');

(async () => {
    const env = startEphemeralSshServer();
    try {
        const repoDir = path.join(env.sandboxDir, 'git_ssh_repo');
        fs.mkdirSync(repoDir, { recursive: true });
        const sshUrl = env.makeSshUrl(repoDir);
        const git = simpleGit(sshUrl);

        // Test 1: git init over SSH
        await git.init(['-b', 'main']);
        if (fs.existsSync(path.join(repoDir, '.git'))) {
            execSync(`git -C "${repoDir}" config user.name "Pragma-git SSH Test"`);
            execSync(`git -C "${repoDir}" config user.email "test@pragma-git.test"`);
            assertPass('4.1: git init over SSH');
        } else {
            assertFail('4.1: git init over SSH', '.git directory missing');
        }

        // Test 2: git status on clean repo
        const stClean = await git.status();
        if (stClean && stClean.current === 'main' && stClean.files.length === 0) {
            assertPass('4.2: git status over SSH');
        } else {
            assertFail('4.2: git status over SSH', JSON.stringify(stClean));
        }

        // Test 3: Create file and git add over SSH
        fs.writeFileSync(path.join(repoDir, 'test_file.txt'), 'Hello SSH Git\n', 'utf8');
        await git.add('test_file.txt');
        const stAdded = await git.status();
        if (stAdded.created.includes('test_file.txt') || stAdded.staged.includes('test_file.txt')) {
            assertPass('4.3: git add over SSH');
        } else {
            assertFail('4.3: git add over SSH', JSON.stringify(stAdded));
        }

        // Test 4: git commit over SSH
        await git.commit('Test commit via in-process ssh2 executor');
        const stAfterCommit = await git.status();
        if (stAfterCommit.isClean()) {
            assertPass('4.4: git commit over SSH');
        } else {
            assertFail('4.4: git commit over SSH', JSON.stringify(stAfterCommit));
        }

        // Test 5: git log over SSH
        const logRes = await git.log();
        if (logRes.latest && logRes.latest.message.includes('Test commit via in-process ssh2 executor')) {
            assertPass('4.5: git log over SSH verifies committed message');
        } else {
            assertFail('4.5: git log over SSH', JSON.stringify(logRes));
        }

        // Test 6: Branch creation and switching over SSH
        await git.checkoutLocalBranch('feature-ssh-test');
        const branchRes = await git.branchLocal();
        if (branchRes.current === 'feature-ssh-test') {
            assertPass('4.6: git checkout -b and branch verification over SSH');
        } else {
            assertFail('4.6: git checkout -b over SSH', JSON.stringify(branchRes));
        }
    } catch (err) {
        assertFail('4.x: Unexpected error in SSH Git client suite', err.stack || err.message);
    } finally {
        env.stop();
        printSuiteResult();
    }
})();
