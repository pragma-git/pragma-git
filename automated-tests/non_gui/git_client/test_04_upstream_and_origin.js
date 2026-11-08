#!/usr/bin/env node
// test_04_upstream_and_origin.js - Tests upstream remote addition, NO-PUSH enforcement, and ahead detection

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const simpleGitWithRetry = require(path.join(REPO_ROOT, 'lib/simpleGitWithRetry.js'));
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

async function runTests() {
    console.log('Running Suite: Upstream Remote Handling & NO-PUSH Push Protection');

    const baseTempDir = path.join(os.tmpdir(), `pragma_upstream_test_${process.pid}_${Date.now()}`);
    const upstreamDir = path.join(baseTempDir, 'upstream_repo.git');
    const originDir = path.join(baseTempDir, 'origin_fork.git');
    const localDir = path.join(baseTempDir, 'local_clone');

    try {
        fs.mkdirSync(baseTempDir, { recursive: true });

        // 1. Set up bare parent repository ("upstream")
        execSync(`git init --bare "${upstreamDir}"`, { stdio: 'pipe' });

        // Seed initial commit into upstream
        const seedDir = path.join(baseTempDir, 'seed');
        fs.mkdirSync(seedDir, { recursive: true });
        execSync(`git init "${seedDir}"`, { stdio: 'pipe' });
        execSync(`git -C "${seedDir}" config user.name "Upstream Owner"`, { stdio: 'pipe' });
        execSync(`git -C "${seedDir}" config user.email "owner@upstream.test"`, { stdio: 'pipe' });
        fs.writeFileSync(path.join(seedDir, 'README.md'), '# Original Upstream Project\n');
        execSync(`git -C "${seedDir}" add README.md`, { stdio: 'pipe' });
        execSync(`git -C "${seedDir}" commit -m "Initial upstream commit"`, { stdio: 'pipe' });
        execSync(`git -C "${seedDir}" branch -M main`, { stdio: 'pipe' });
        execSync(`git -C "${seedDir}" remote add origin "${upstreamDir}"`, { stdio: 'pipe' });
        execSync(`git -C "${seedDir}" push -u origin main`, { stdio: 'pipe' });

        // 2. Fork into "origin" bare repository
        execSync(`git clone --bare "${upstreamDir}" "${originDir}"`, { stdio: 'pipe' });

        // 3. Clone fork locally as working repo
        execSync(`git clone "${originDir}" "${localDir}"`, { stdio: 'pipe' });
        execSync(`git -C "${localDir}" config user.name "Fork Contributor"`, { stdio: 'pipe' });
        execSync(`git -C "${localDir}" config user.email "contributor@fork.test"`, { stdio: 'pipe' });

        const gitLocal = simpleGitWithRetry(localDir);

        // Test 1: Origin remote is configured and push works
        const remotesInitial = await gitLocal.getRemotes(true);
        const originRemote = remotesInitial.find(r => r.name === 'origin');
        assert.ok(originRemote, 'Origin remote should be present');
        assert.strictEqual(originRemote.refs.fetch, originDir);
        assert.strictEqual(originRemote.refs.push, originDir);

        fs.writeFileSync(path.join(localDir, 'contributor.txt'), 'Feature from fork\n');
        await gitLocal.add('contributor.txt');
        await gitLocal.commit('Contributor commit on fork');
        await gitLocal.push('origin', 'main');
        assertPass('1.1: Local clone connects to origin (fork) and successfully pushes commits');

        // Test 2: Add upstream remote with NO-PUSH protection (Phase 1)
        // Mimic addUpstream() logic: remote add upstream, and remote set-url --push upstream NO-PUSH
        await gitLocal.addRemote('upstream', upstreamDir);
        await gitLocal.raw(['remote', 'set-url', '--push', 'upstream', 'NO-PUSH']);

        const remotesWithUpstream = await gitLocal.getRemotes(true);
        const upstreamRemote = remotesWithUpstream.find(r => r.name === 'upstream');
        assert.ok(upstreamRemote, 'Upstream remote should be present');
        assert.strictEqual(upstreamRemote.refs.fetch, upstreamDir, 'Fetch URL matches upstream parent repository');
        assert.strictEqual(upstreamRemote.refs.push, 'NO-PUSH', 'Push URL is explicitly set to NO-PUSH');
        assertPass('1.2: Upstream remote added with fetch pointing to parent and pushurl configured to NO-PUSH');

        // Test 3: Attempting git push to upstream is strictly blocked by Git
        let pushBlocked = false;
        let errorMessage = '';
        try {
            await gitLocal.push('upstream', 'main');
        } catch (err) {
            pushBlocked = true;
            errorMessage = err.message || '';
        }

        assert.strictEqual(pushBlocked, true, 'Pushing to upstream MUST be rejected');
        assert.ok(
            errorMessage.includes('NO-PUSH') || errorMessage.includes('fatal') || errorMessage.includes('failed'),
            'Error message should indicate push destination is invalid / NO-PUSH'
        );
        assertPass('1.3: Pushing to upstream is blocked with error (NO-PUSH enforced)');

        // Test 4: New commit in upstream is detected via fetch --dry-run (Phase 2)
        // Add new commit in upstream using seedDir
        fs.writeFileSync(path.join(seedDir, 'upstream_update.txt'), 'New feature in upstream v2\n');
        execSync(`git -C "${seedDir}" add upstream_update.txt`, { stdio: 'pipe' });
        execSync(`git -C "${seedDir}" commit -m "Upstream update v2"`, { stdio: 'pipe' });
        execSync(`git -C "${seedDir}" push origin main`, { stdio: 'pipe' });

        // Run fetch dry-run against upstream (mirrors Phase 2 gitListUpstreamsNeedingFetch)
        const { spawnSync } = require('child_process');
        const dryRunRes = spawnSync('git', ['fetch', '--dry-run', 'upstream'], {
            cwd: localDir,
            encoding: 'utf8'
        });
        const dryRunOutput = (dryRunRes.stdout || '') + (dryRunRes.stderr || '');

        assert.ok(
            dryRunOutput.includes('-> upstream/main') || dryRunOutput.includes('main'),
            `dry-run output should identify upstream updates: ${dryRunOutput}`
        );

        // Parse dry-run output matching app.js Phase 2 parser
        const rows = dryRunOutput.split('\n');
        let detectedBranch = null;
        let isAhead = false;
        for (let row of rows) {
            if (row.includes('->')) {
                const parts = row.split('->');
                const target = parts[parts.length - 1].trim();
                if (target.startsWith('upstream/')) {
                    detectedBranch = 'remotes/' + target;
                    isAhead = true;
                    break;
                }
            }
        }

        assert.strictEqual(isAhead, true, 'Upstream should be flagged as ahead (needs fetch)');
        assert.strictEqual(detectedBranch, 'remotes/upstream/main', 'Detected remote branch matches remotes/upstream/main');
        assertPass('1.4: Upstream changes are detected via dry-run and parsed into remotes/upstream/<branch>');

        // Test 5: Fetch from upstream and inspect commit difference
        await gitLocal.fetch('upstream', 'main');
        const behindCountRaw = await gitLocal.raw(['rev-list', '--count', 'HEAD..remotes/upstream/main']);
        const behindCount = parseInt(behindCountRaw.trim(), 10);
        assert.strictEqual(behindCount, 1, 'Local branch should be exactly 1 commit behind upstream/main');
        assertPass('1.5: Successfully fetches from upstream and verifies rev-list commit difference');

        // Test 6: Verify push to origin still functions normally while upstream remains write-protected
        fs.writeFileSync(path.join(localDir, 'another_fork_file.txt'), 'Fork commit 2\n');
        await gitLocal.add('another_fork_file.txt');
        await gitLocal.commit('Another commit on fork');
        await gitLocal.push('origin', 'main');

        let secondPushBlocked = false;
        try {
            await gitLocal.push('upstream', 'main');
        } catch (e) {
            secondPushBlocked = true;
        }
        assert.strictEqual(secondPushBlocked, true, 'Upstream continues to reject pushes');
        assertPass('1.6: Origin accepts pushes while upstream remains permanently write-protected');

        // Test 7: Merge upstream changes into local fork branch (Phase 4)
        // Merge upstream/main into current local branch
        await gitLocal.merge(['remotes/upstream/main', '--no-ff', '-m', "Merge branch 'upstream/main' into main"]);
        const logAfterMerge = await gitLocal.log({ '-1': null });
        assert.strictEqual(logAfterMerge.latest.message, "Merge branch 'upstream/main' into main");
        assert.ok(fs.existsSync(path.join(localDir, 'upstream_update.txt')), 'Upstream files should be present after merge');
        assertPass('1.7: Successfully merges upstream/main into local branch (clean merge)');

        // Test 8: Push merged upstream changes from local branch to origin (fork)
        await gitLocal.push('origin', 'main');
        // Verify bare origin has the upstream commit
        const originLog = execSync(`git --git-dir="${originDir}" log -n 1 --oneline`, { encoding: 'utf8' });
        assert.ok(originLog.includes("Merge branch 'upstream/main' into main"), 'Origin fork receives the merged upstream commits');
        assertPass('1.8: Merged upstream changes are pushed to origin (fork) without errors');

    } catch (err) {
        assertFail('General failure in upstream and origin tests', err.stack);
    } finally {
        try {
            fs.rmSync(baseTempDir, { recursive: true, force: true });
        } catch (e) {}
    }

    printSuiteResult();
}

runTests();
