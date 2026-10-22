#!/usr/bin/env node
/**
 * test_03_ci_cache.js - Test CI status caching and badge rendering logic from app.js
 *
 * Verifies:
 *   1. loadCiCache & saveCiCache roundtrip data correctly
 *   2. setCachedCiStatus persists terminal states (success, failure) to disk and excludes non-terminal (pending, none)
 *   3. getCachedCiStatus retrieves cached data by repoUrl and commitSha
 *   4. updateCiBadge correctly configures the badge DOM element for all status types
 *   5. queryCommitCiStatus uses localState.historyHash when in HISTORY mode and HEAD otherwise
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const appJsPath = path.join(REPO_ROOT, 'app.js');

if (!fs.existsSync(appJsPath)) {
    console.error('FAIL: app.js not found at ' + appJsPath);
    process.exit(1);
}

const appCode = fs.readFileSync(appJsPath, 'utf8');

function extractFunction(name) {
    const match = appCode.match(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{'));
    if (!match) throw new Error('Could not find function ' + name + ' in app.js');
    const start = match.index;
    let openBraces = 0;
    let started = false;
    let end = start;
    for (let i = start; i < appCode.length; i++) {
        if (appCode[i] === '{') {
            openBraces++;
            started = true;
        } else if (appCode[i] === '}') {
            openBraces--;
            if (started && openBraces === 0) {
                end = i + 1;
                break;
            }
        }
    }
    return appCode.substring(start, end);
}

const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

function assert(condition, message) {
    if (condition) {
        assertPass(message);
    } else {
        assertFail(message);
    }
}

async function runTests() {
    if (process.env.VERBOSE === 'true') {
        console.log('--- Running test_03_ci_cache.js ---');
    }

    const testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pragma-ci-cache-test-'));
    const testCiCacheFile = path.join(testTmpDir, 'ci_cache.json');

    // Mock DOM badge element
    const mockBadge = {
        style: { display: 'none' },
        className: '',
        _html: '',
        get innerHTML() { return this._html; },
        set innerHTML(v) { this._html = v; this.innerText = (v || '').replace(/<[^>]*>/g, ''); },
        innerText: '',
        attributes: {},
        setAttribute(k, v) { this.attributes[k] = v; }
    };

    let queriedShas = [];

    const sandbox = {
        console: { log: () => {}, warn: () => {}, error: () => {} },
        fs: fs,
        URL: URL,
        ciCacheFile: testCiCacheFile,
        ciMemoryCache: {},
        ciQueryInProgress: false,
        localState: {
            mode: 'UNKNOWN',
            historyHash: '',
            ciStatus: null
        },
        state: {
            repoNumber: 0,
            repos: [
                {
                    remoteURL: 'https://github.com/test/repo.git',
                    localFolder: '/test/repo'
                }
            ]
        },
        document: {
            getElementById: (id) => {
                if (id === 'top-titlebar-ci-badge') return mockBadge;
                return null;
            }
        },
        getMode: () => sandbox.localState.mode,
        simpleGit: () => ({
            raw: async (args) => {
                if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
                    return 'sha-head-1111\n';
                }
                return '';
            }
        }),
        gitProvider: async () => ({
            getValue: async (param, sha) => {
                queriedShas.push(sha);
                if (sha === 'sha-historical-pass') return { status: 'success', url: 'https://ci/hist-pass' };
                if (sha === 'sha-historical-old') return { status: 'none', url: null };
                if (sha === 'sha-head-1111') return { status: 'success', url: 'https://ci/head-pass' };
                return { status: 'none', url: null };
            }
        })
    };

    vm.createContext(sandbox);

    // Extract functions from app.js
    const normalizeRepoUrlFn = extractFunction('normalizeRepoUrl');
    const findCachedCommitFn = extractFunction('findCachedCommit');
    const loadCiCacheFn = extractFunction('loadCiCache');
    const saveCiCacheFn = extractFunction('saveCiCache');
    const getCachedCiStatusFn = extractFunction('getCachedCiStatus');
    const setCachedCiStatusFn = extractFunction('setCachedCiStatus');
    const updateCiBadgeFn = extractFunction('updateCiBadge');
    const queryCommitCiStatusFn = extractFunction('queryCommitCiStatus');

    vm.runInContext(normalizeRepoUrlFn, sandbox);
    vm.runInContext(findCachedCommitFn, sandbox);
    vm.runInContext(loadCiCacheFn, sandbox);
    vm.runInContext(saveCiCacheFn, sandbox);
    vm.runInContext(getCachedCiStatusFn, sandbox);
    vm.runInContext(setCachedCiStatusFn, sandbox);
    vm.runInContext(updateCiBadgeFn, sandbox);
    vm.runInContext(queryCommitCiStatusFn, sandbox);

    // Test 1: normalizeRepoUrl handles various URL schemes and credentials
    const norm1 = sandbox.normalizeRepoUrl('git@github.com:JanAxelsson/cliHelpLine.git');
    const norm2 = sandbox.normalizeRepoUrl('https://user:token@github.com/JanAxelsson/cliHelpLine.git');
    const norm3 = sandbox.normalizeRepoUrl('ssh://git@github.com:JanAxelsson/cliHelpLine.git/');
    const norm4 = sandbox.normalizeRepoUrl('https://GitHub.com/JanAxelsson/cliHelpLine');
    assert(
        norm1 === 'https://github.com/JanAxelsson/cliHelpLine' &&
        norm2 === 'https://github.com/JanAxelsson/cliHelpLine' &&
        norm3 === 'https://github.com/JanAxelsson/cliHelpLine' &&
        norm4 === 'https://github.com/JanAxelsson/cliHelpLine',
        'normalizeRepoUrl canonicalizes SSH, credentials, trailing .git/slash, and host casing'
    );

    // Test 2: saveCiCache & loadCiCache
    const testData = {
        'https://github.com/test/repo.git': {
            'sha1234567890abcdef': { status: 'success', url: 'https://ci.example.com/1' }
        }
    };
    sandbox.saveCiCache(testData);
    const loaded = sandbox.loadCiCache();
    assert(
        loaded['https://github.com/test/repo.git'] &&
        loaded['https://github.com/test/repo.git']['sha1234567890abcdef'].status === 'success' &&
        loaded['https://github.com/test/repo.git']['sha1234567890abcdef'].url === 'https://ci.example.com/1',
        'saveCiCache persists data and loadCiCache reads it back accurately'
    );

    // Test 3: getCachedCiStatus matches across URL formats and supports short SHA prefix
    const matchSsh = sandbox.getCachedCiStatus('git@github.com:test/repo.git', 'sha1234567890abcdef');
    const matchShortSha = sandbox.getCachedCiStatus('https://github.com/test/repo', 'sha1234');
    assert(
        matchSsh && matchSsh.status === 'success' &&
        matchShortSha && matchShortSha.status === 'success',
        'getCachedCiStatus matches canonical normalized URLs and resolves short commit SHAs'
    );

    // Test 4: setCachedCiStatus persists terminal states to file and excludes non-terminal from file
    const repoUrl = 'https://gitlab.com/test/repo.git';
    sandbox.setCachedCiStatus(repoUrl, 'sha-pass', { status: 'success', url: 'https://ci/pass' });
    sandbox.setCachedCiStatus(repoUrl, 'sha-fail', { status: 'failure', url: 'https://ci/fail' });
    sandbox.setCachedCiStatus(repoUrl, 'sha-pending', { status: 'pending', url: 'https://ci/pending' });
    sandbox.setCachedCiStatus(repoUrl, 'sha-none', { status: 'none', url: null });

    const diskCache = sandbox.loadCiCache();
    const canonGitlab = sandbox.normalizeRepoUrl(repoUrl);
    assert(
        (diskCache[canonGitlab] || diskCache[repoUrl]) &&
        (diskCache[canonGitlab] || diskCache[repoUrl])['sha-pass'] &&
        (diskCache[canonGitlab] || diskCache[repoUrl])['sha-pass'].status === 'success' &&
        (diskCache[canonGitlab] || diskCache[repoUrl])['sha-fail'] &&
        (diskCache[canonGitlab] || diskCache[repoUrl])['sha-fail'].status === 'failure' &&
        (diskCache[canonGitlab] || diskCache[repoUrl])['sha-pending'] === undefined &&
        (diskCache[canonGitlab] || diskCache[repoUrl])['sha-none'] === undefined,
        'setCachedCiStatus permanently writes terminal statuses (success, failure) to disk and excludes non-terminal'
    );

    // Test 5: updateCiBadge renders success
    sandbox.updateCiBadge({ status: 'success', url: 'https://ci/pass' });
    assert(
        mockBadge.style.display === 'inline-block' &&
        mockBadge.innerText === 'CI' &&
        mockBadge.className.includes('top-titlebar-ci-success') &&
        mockBadge.attributes['data-tooltip'].includes('Passed'),
        'updateCiBadge correctly renders success badge with clean monochrome CI and Passed tooltip'
    );

    // Test 6: updateCiBadge renders failure with cracked CI pieces
    sandbox.updateCiBadge({ status: 'failure', url: 'https://ci/fail' });
    assert(
        mockBadge.style.display === 'inline-block' &&
        mockBadge.innerHTML.includes('ci-piece-left') &&
        mockBadge.innerHTML.includes('ci-piece-right') &&
        mockBadge.innerText === 'CI' &&
        mockBadge.className.includes('top-titlebar-ci-failure') &&
        mockBadge.attributes['data-tooltip'].includes('Failed'),
        'updateCiBadge correctly renders failure badge with top-titlebar-ci-failure class, split cracked pieces, and Failed tooltip'
    );

    // Test 7: updateCiBadge hides when status is none or missing
    sandbox.updateCiBadge({ status: 'none', url: null });
    const hiddenNone = mockBadge.style.display === 'none';
    sandbox.updateCiBadge(null);
    const hiddenNull = mockBadge.style.display === 'none';
    assert(
        hiddenNone && hiddenNull,
        'updateCiBadge hides the CI badge when status is none or null'
    );

    // Test 8: queryCommitCiStatus queries localState.historyHash when in HISTORY mode
    queriedShas = [];
    sandbox.localState.mode = 'HISTORY';
    sandbox.localState.historyHash = 'sha-historical-old';
    await sandbox.queryCommitCiStatus(true);

    const queriedHistorical = queriedShas.includes('sha-historical-old');
    const hiddenForOld = mockBadge.style.display === 'none';

    // Test 9: queryCommitCiStatus returns to HEAD when leaving HISTORY mode
    sandbox.localState.mode = 'NO_FILES_TO_COMMIT';
    sandbox.localState.historyHash = '';
    await sandbox.queryCommitCiStatus(true);

    const queriedHead = queriedShas.includes('sha-head-1111');
    const shownForHead = mockBadge.style.display === 'inline-block' && mockBadge.className.includes('top-titlebar-ci-success');

    assert(
        queriedHistorical && hiddenForOld && queriedHead && shownForHead,
        'queryCommitCiStatus evaluates historical commit SHA when in HISTORY mode and reverts to HEAD otherwise'
    );

    // Clean up temporary test directory
    try {
        fs.rmSync(testTmpDir, { recursive: true, force: true });
    } catch (e) {}

    printSuiteResult();
}

runTests();
