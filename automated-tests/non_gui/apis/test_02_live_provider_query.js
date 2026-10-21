#!/usr/bin/env node
// test_02_live_provider_query.js - Tests live public queries against GitHub, GitLab, and Bitbucket

const dns = require('dns').promises;
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../../..');
process.env.NODE_PATH = REPO_ROOT;
require('module').Module._initPaths();

// Mute global logging from provider classes
global.log = function() {};
global.warn = function() {};

// Filter noisy internal logs from provider libraries while preserving test outputs
const origLog = console.log;
console.log = function(...args) {
    if (typeof args[0] === 'string' && (args[0].startsWith('Running Suite:') || args[0].startsWith('  [PASS]') || args[0].startsWith('  [FAIL]') || args[0].startsWith('  [SKIP]') || args[0].startsWith('Suite Result:'))) {
        origLog.apply(console, args);
    }
};

let passCount = 0;
let failCount = 0;

function assertPass(desc) {
    console.log(`  [PASS] ${desc}`);
    passCount++;
}

function assertFail(desc, details) {
    console.log(`  [FAIL] ${desc}`);
    if (details) console.log(`         ${details}`);
    failCount++;
}

async function checkInternet() {
    if (process.env.SIMULATE_OFFLINE === 'true') {
        return false;
    }
    try {
        await dns.lookup('github.com');
        return true;
    } catch (e) {
        return false;
    }
}

async function runTests() {
    console.log('Running Suite: Live Git Provider Public Queries');

    // Test 1: Verify active internet connectivity
    const online = await checkInternet();
    if (!online) {
        assertFail('2.1: Active internet connection required for live provider tests (DNS resolution to github.com failed)');
        console.log(`Suite Result: ${passCount}/${passCount + failCount} passed, ${failCount} failed`);
        process.exit(1);
    }
    assertPass('2.1: Verified active internet connectivity via DNS resolution (github.com)');

    try {
        const GithubApi = require(path.join(REPO_ROOT, 'apis_github_and_others/github.com.js'));
        const BitbucketApi = require(path.join(REPO_ROOT, 'apis_github_and_others/bitbucket.org.js'));

        // Test 2: GitHub live query against official public repo (octocat/Hello-World)
        const gh = new GithubApi('https://github.com/octocat/Hello-World.git');
        await gh.initialize();

        const ghStatus = await gh.getValue('api-status');
        const ghPrivate = await gh.getValue('is-private-repo');
        assert.strictEqual(ghStatus, 'ok', 'GitHub API responded with ok');
        assert.strictEqual(ghPrivate, false, 'octocat/Hello-World is a public repo');
        assertPass('2.2: Live GitHub query for octocat/Hello-World returns api-status: ok, is-private: false');

        // Test 3: Bitbucket live query against official public repo (atlassian/aui)
        const bb = new BitbucketApi('https://bitbucket.org/atlassian/aui.git');
        await bb.initialize();

        const bbStatus = await bb.getValue('api-status');
        const bbPrivate = await bb.getValue('is-private-repo');
        assert.strictEqual(bbStatus, 'ok', 'Bitbucket API responded with ok');
        assert.strictEqual(bbPrivate, false, 'atlassian/aui is a public repo');
        assertPass('2.3: Live Bitbucket query for atlassian/aui returns api-status: ok, is-private: false');

        // Test 4: Git over HTTPS network protocol check against GitHub, GitLab, and Bitbucket
        const providers = [
            { name: 'GitHub', url: 'https://github.com/octocat/Hello-World.git' },
            { name: 'GitLab', url: 'https://gitlab.com/gitlab-org/gitlab-foss.git' },
            { name: 'Bitbucket', url: 'https://bitbucket.org/atlassian/aui.git' }
        ];

        for (const p of providers) {
            const out = execSync(`git ls-remote --heads "${p.url}" 2>&1`, { timeout: 10000 }).toString();
            assert.ok(out.includes('refs/heads/'), `${p.name} responded with valid git branches`);
        }
        assertPass('2.4: Live Git HTTPS protocol (ls-remote) verified for GitHub, GitLab, and Bitbucket');

    } catch (err) {
        assertFail('Failure during live provider query tests', err.message);
    }

    console.log(`Suite Result: ${passCount}/${passCount + failCount} passed, ${failCount} failed`);
    process.exit(failCount === 0 ? 0 : 1);
}

runTests();
