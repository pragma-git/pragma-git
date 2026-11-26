#!/usr/bin/env node
/**
 * test_05_ssh_put_get.js - Tests sshPut, sshGet, sshPutSimple, and sshLs over SshConnectionPool
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { REPO_ROOT, startEphemeralSshServer } = require('./ssh_test_helper.js');
const sshLib = require(path.join(REPO_ROOT, 'ssh_folder/ssh-folder-lib.js'));
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

console.log('Running Suite: SSH File Transfer (sshPut / sshGet / sshLs) Tests');

(async () => {
    const env = startEphemeralSshServer();
    const origTempLocation = global.SSH_TEMP_FILE_LOCATION;
    try {
        const localTempBase = path.join(env.sandboxDir, 'local_ssh_temp');
        fs.mkdirSync(localTempBase, { recursive: true });
        global.SSH_TEMP_FILE_LOCATION = localTempBase;

        const serverRepoDir = path.join(env.sandboxDir, 'server_repo');
        fs.mkdirSync(serverRepoDir, { recursive: true });
        const sshUrl = env.makeSshUrl(serverRepoDir);
        const relFile = 'test_sub/sample_payload.txt';

        // Test 1 & 2: Prepare local temp file and upload via sshPut
        const localFile = path.join(localTempBase, 'test_sub', 'sample_payload.txt');
        fs.mkdirSync(path.dirname(localFile), { recursive: true });
        const testContent = `Pragma-git put test payload ${Date.now()}`;
        fs.writeFileSync(localFile, testContent, 'utf8');

        await sshLib.sshPut(sshUrl, relFile);
        const serverFile = path.join(serverRepoDir, 'test_sub', 'sample_payload.txt');
        if (fs.existsSync(serverFile)) {
            assertPass('5.1: sshPut transfers file to remote server');
        } else {
            assertFail('5.1: sshPut transfers file to remote server', `Missing: ${serverFile}`);
        }

        const serverContent = fs.existsSync(serverFile) ? fs.readFileSync(serverFile, 'utf8') : '';
        if (serverContent === testContent) {
            assertPass('5.2: Server file content matches original payload');
        } else {
            assertFail('5.2: Server file content match', `Expected "${testContent}", got "${serverContent}"`);
        }

        // Test 3 & 4: Modify server file and retrieve via sshGet
        const modifiedContent = `Modified server payload ${Date.now()}`;
        fs.writeFileSync(serverFile, modifiedContent, 'utf8');
        fs.unlinkSync(localFile);

        const downloadedPath = await sshLib.sshGet(sshUrl, relFile);
        if (fs.existsSync(downloadedPath)) {
            assertPass('5.3: sshGet retrieves file from remote server');
        } else {
            assertFail('5.3: sshGet retrieves file from remote server', `Missing: ${downloadedPath}`);
        }

        const retrievedContent = fs.existsSync(downloadedPath) ? fs.readFileSync(downloadedPath, 'utf8') : '';
        if (retrievedContent === modifiedContent) {
            assertPass('5.4: Retrieved local file content matches server modification');
        } else {
            assertFail('5.4: Retrieved file content match', `Expected "${modifiedContent}", got "${retrievedContent}"`);
        }

        // Test 5: sshLs root directory (excludes .git, returns folders + files)
        fs.mkdirSync(path.join(serverRepoDir, '.git'), { recursive: true });
        fs.writeFileSync(path.join(serverRepoDir, 'README.md'), 'root file\n', 'utf8');
        const rootEntries = await sshLib.sshLs(sshUrl);
        const hasSubDir = rootEntries.some(e => e.name === 'test_sub' && e.isDirectory === true);
        const hasReadme = rootEntries.some(e => e.name === 'README.md' && e.isDirectory === false);
        const hasDotGit = rootEntries.some(e => e.name === '.git');
        if (hasSubDir && hasReadme && !hasDotGit) {
            assertPass('5.5: sshLs lists root folders and files while excluding .git');
        } else {
            assertFail('5.5: sshLs root listing', JSON.stringify(rootEntries));
        }

        // Test 6: sshLs subdirectory
        const subEntries = await sshLib.sshLs(sshUrl, 'test_sub');
        if (subEntries.some(e => e.name === 'sample_payload.txt' && e.relativePath === 'test_sub/sample_payload.txt')) {
            assertPass('5.6: sshLs lists files inside relative subdirectory');
        } else {
            assertFail('5.6: sshLs subdirectory listing', JSON.stringify(subEntries));
        }

        // Test 7 & 8: Server paths containing spaces and '--' ('testRepos -- local on ssh/cliHelpLine')
        const spaceServerDir = path.join(serverRepoDir, 'testRepos -- local on ssh', 'cliHelpLine');
        fs.mkdirSync(spaceServerDir, { recursive: true });
        const spaceSshUrl = env.makeSshUrl(spaceServerDir);
        const spaceRelFile = '.gitignore';
        const spaceLocalFile = path.join(localTempBase, spaceRelFile);
        const spaceContent = `# added hash line in gitignore ${Date.now()}`;
        fs.writeFileSync(spaceLocalFile, spaceContent, 'utf8');

        await sshLib.sshPut(spaceSshUrl, spaceRelFile);
        const spaceServerFile = path.join(spaceServerDir, spaceRelFile);
        if (fs.existsSync(spaceServerFile) && fs.readFileSync(spaceServerFile, 'utf8') === spaceContent) {
            assertPass('5.7: sshPut transfers file accurately when server path contains spaces and "--"');
        } else {
            assertFail('5.7: sshPut with spaces and "--" in server path');
        }

        fs.writeFileSync(spaceServerFile, `${spaceContent} - server edit`, 'utf8');
        fs.unlinkSync(spaceLocalFile);
        const spaceDownloaded = await sshLib.sshGet(spaceSshUrl, spaceRelFile);
        if (fs.existsSync(spaceDownloaded) && fs.readFileSync(spaceDownloaded, 'utf8') === `${spaceContent} - server edit`) {
            assertPass('5.8: sshGet retrieves file accurately when server path contains spaces and "--"');
        } else {
            assertFail('5.8: sshGet with spaces and "--" in server path');
        }

        // Test 9: sshPutSimple sets executable permission for pragma-merge helper script
        const srcMerge = path.join(REPO_ROOT, 'pragma-merge');
        const dstMergeDir = path.join(env.sandboxDir, 'remote_home', '.Pragma-git');
        const dstMergeFile = path.join(dstMergeDir, 'pragma-merge');
        await sshLib.sshPutSimple(srcMerge, env.makeSshUrl(dstMergeFile));
        if (fs.existsSync(dstMergeFile)) {
            if (process.platform !== 'win32') {
                const mode = fs.statSync(dstMergeFile).mode & 0o111;
                if (mode !== 0) {
                    assertPass('5.9: sshPutSimple uploads pragma-merge and sets executable (+x) bit');
                } else {
                    assertFail('5.9: sshPutSimple executable bit missing on uploaded pragma-merge');
                }
            } else {
                assertPass('5.9: sshPutSimple uploads pragma-merge to remote server');
            }
        } else {
            assertFail('5.9: sshPutSimple failed to upload pragma-merge', `Missing: ${dstMergeFile}`);
        }
    } catch (err) {
        assertFail('5.x: Unexpected error in SSH file transfer suite', err.stack || err.message);
    } finally {
        global.SSH_TEMP_FILE_LOCATION = origTempLocation;
        env.stop();
        printSuiteResult();
    }
})();
