#!/usr/bin/env node
/**
 * test_03_ci_cache.js - Test CI status caching and badge rendering logic from app.js
 *
 * Verifies:
 *   1. loadCiCache & saveCiCache roundtrip data correctly
 *   2. setCachedCiStatus persists terminal states (success, failure) and skips non-terminal (pending, none)
 *   3. getCachedCiStatus retrieves cached data by repoUrl and commitSha
 *   4. updateCiBadge correctly configures the badge DOM element for all status types
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
        innerText: '',
        attributes: {},
        setAttribute(k, v) { this.attributes[k] = v; }
    };

    const sandbox = {
        console: { log: () => {}, warn: () => {}, error: () => {} },
        fs: fs,
        ciCacheFile: testCiCacheFile,
        document: {
            getElementById: (id) => {
                if (id === 'top-titlebar-ci-badge') return mockBadge;
                return null;
            }
        }
    };

    vm.createContext(sandbox);

    // Extract functions from app.js
    const loadCiCacheFn = extractFunction('loadCiCache');
    const saveCiCacheFn = extractFunction('saveCiCache');
    const getCachedCiStatusFn = extractFunction('getCachedCiStatus');
    const setCachedCiStatusFn = extractFunction('setCachedCiStatus');
    const updateCiBadgeFn = extractFunction('updateCiBadge');

    vm.runInContext(loadCiCacheFn, sandbox);
    vm.runInContext(saveCiCacheFn, sandbox);
    vm.runInContext(getCachedCiStatusFn, sandbox);
    vm.runInContext(setCachedCiStatusFn, sandbox);
    vm.runInContext(updateCiBadgeFn, sandbox);

    // Test 1: saveCiCache & loadCiCache
    const testData = {
        'https://github.com/test/repo.git': {
            'sha123': { status: 'success', url: 'https://ci.example.com/1' }
        }
    };
    sandbox.saveCiCache(testData);
    const loaded = sandbox.loadCiCache();
    assert(
        loaded['https://github.com/test/repo.git'] &&
        loaded['https://github.com/test/repo.git']['sha123'].status === 'success' &&
        loaded['https://github.com/test/repo.git']['sha123'].url === 'https://ci.example.com/1',
        'saveCiCache persists data and loadCiCache reads it back accurately'
    );

    // Test 2: setCachedCiStatus persists terminal states and filters out non-terminal
    const repoUrl = 'https://gitlab.com/test/repo.git';
    sandbox.setCachedCiStatus(repoUrl, 'sha-pass', { status: 'success', url: 'https://ci/pass' });
    sandbox.setCachedCiStatus(repoUrl, 'sha-fail', { status: 'failure', url: 'https://ci/fail' });
    sandbox.setCachedCiStatus(repoUrl, 'sha-pending', { status: 'pending', url: 'https://ci/pending' });
    sandbox.setCachedCiStatus(repoUrl, 'sha-none', { status: 'none', url: null });

    const passCached = sandbox.getCachedCiStatus(repoUrl, 'sha-pass');
    const failCached = sandbox.getCachedCiStatus(repoUrl, 'sha-fail');
    const pendingCached = sandbox.getCachedCiStatus(repoUrl, 'sha-pending');
    const noneCached = sandbox.getCachedCiStatus(repoUrl, 'sha-none');

    assert(
        passCached && passCached.status === 'success' &&
        failCached && failCached.status === 'failure' &&
        pendingCached === null && noneCached === null,
        'setCachedCiStatus permanently caches terminal statuses (success, failure) and excludes non-terminal (pending, none)'
    );

    // Test 3: updateCiBadge renders success
    sandbox.updateCiBadge({ status: 'success', url: 'https://ci/pass' });
    assert(
        mockBadge.style.display === 'inline-block' &&
        mockBadge.innerText === 'CI' &&
        mockBadge.className.includes('top-titlebar-ci-success') &&
        mockBadge.attributes['data-tooltip'].includes('Passed'),
        'updateCiBadge correctly renders success badge with green style and Passed tooltip'
    );

    // Test 4: updateCiBadge renders failure
    sandbox.updateCiBadge({ status: 'failure', url: 'https://ci/fail' });
    assert(
        mockBadge.style.display === 'inline-block' &&
        mockBadge.innerText === 'CI' &&
        mockBadge.className.includes('top-titlebar-ci-failure') &&
        mockBadge.attributes['data-tooltip'].includes('Failed'),
        'updateCiBadge correctly renders failure badge with red style and Failed tooltip'
    );

    // Test 5: updateCiBadge hides when status is none or missing
    sandbox.updateCiBadge({ status: 'none', url: null });
    const hiddenNone = mockBadge.style.display === 'none';
    sandbox.updateCiBadge(null);
    const hiddenNull = mockBadge.style.display === 'none';
    assert(
        hiddenNone && hiddenNull,
        'updateCiBadge hides the CI badge when status is none or null'
    );

    // Clean up temporary test directory
    try {
        fs.rmSync(testTmpDir, { recursive: true, force: true });
    } catch (e) {}

    printSuiteResult();
}

runTests();
