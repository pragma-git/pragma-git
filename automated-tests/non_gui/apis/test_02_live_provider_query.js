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
    if (typeof args[0] === 'string' && (args[0].includes('Running Suite:') || args[0].includes('[PASS]') || args[0].includes('[FAIL]') || args[0].includes('[SKIP]') || args[0].includes('Suite Result:'))) {
        origLog.apply(console, args);
    }
};

const origError = console.error;
console.error = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('Error fetching repository info:') && args[0].includes('rate limit')) {
        // Suppress expected external API rate-limit noise handled by [SKIP]
        return;
    }
    origError.apply(console, args);
};

const { YELLOW, NORMAL, assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

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
        printSuiteResult();
    }
    assertPass('2.1: Verified active internet connectivity via DNS resolution (github.com)');

    const GithubApi = require(path.join(REPO_ROOT, 'apis_github_and_others/github.com.js'));
    const BitbucketApi = require(path.join(REPO_ROOT, 'apis_github_and_others/bitbucket.org.js'));

    // Test 2: GitHub live query against official public repo (octocat/Hello-World)
    try {
        const ghToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
        const gh = new GithubApi('https://github.com/octocat/Hello-World.git', 'octocat', ghToken);
        await gh.initialize();

        const ghStatus = await gh.getValue('api-status');
        const isRateLimit = ghStatus !== 'ok' && gh.repoInfoStruct &&
            (gh.repoInfoStruct.status === 403 || gh.repoInfoStruct.status === 429);

        if (isRateLimit) {
            console.log(`  ${YELLOW}[SKIP]${NORMAL} 2.2: Live GitHub query (API rate limit exceeded for this IP, set GITHUB_TOKEN to authenticate)`);
        } else {
            const ghPrivate = await gh.getValue('is-private-repo');
            assert.strictEqual(ghStatus, 'ok', 'GitHub API responded with ok');
            assert.strictEqual(ghPrivate, false, 'octocat/Hello-World is a public repo');
            assertPass('2.2: Live GitHub query for octocat/Hello-World returns api-status: ok, is-private: false');
        }
    } catch (err) {
        assertFail('2.2: Live GitHub query for octocat/Hello-World', err.message);
    }

    // Test 3: Bitbucket live query against official public repo (atlassian/aui)
    try {
        const bb = new BitbucketApi('https://bitbucket.org/atlassian/aui.git');
        await bb.initialize();

        const bbStatus = await bb.getValue('api-status');
        const isRateLimit = bbStatus !== 'ok' && bb.repoInfoStruct &&
            (bb.repoInfoStruct.status === 403 || bb.repoInfoStruct.status === 429);

        if (isRateLimit) {
            console.log(`  ${YELLOW}[SKIP]${NORMAL} 2.3: Live Bitbucket query (API rate limit exceeded for this IP)`);
        } else {
            const bbPrivate = await bb.getValue('is-private-repo');
            assert.strictEqual(bbStatus, 'ok', 'Bitbucket API responded with ok');
            assert.strictEqual(bbPrivate, false, 'atlassian/aui is a public repo');
            assertPass('2.3: Live Bitbucket query for atlassian/aui returns api-status: ok, is-private: false');
        }
    } catch (err) {
        assertFail('2.3: Live Bitbucket query for atlassian/aui', err.message);
    }

    // Test 4: Git over HTTPS network protocol check against GitHub, GitLab, and Bitbucket
    try {
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
        assertFail('2.4: Live Git HTTPS protocol (ls-remote)', err.message);
    }

    printSuiteResult();
}

runTests();
