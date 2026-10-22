#!/usr/bin/env node
/**
 * test_04_ci_status.js - Test commit CI status parsing across Git providers
 *
 * Verifies:
 *   1. Missing commitSha gracefully returns { status: 'none', url: null }
 *   2. GitHub ci-status handling (Commit Status API & Check Runs API)
 *   3. GitLab ci-status handling (Commit statuses array)
 *   4. Bitbucket ci-status handling (Commit statuses values)
 */

const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');
process.env.NODE_PATH = REPO_ROOT;
require('module').Module._initPaths();

// Mock global logging functions expected by provider classes
global.log = () => {};
global.warn = () => {};

const Github = require('apis_github_and_others/github.com.js');
const Gitlab = require('apis_github_and_others/gitlab.com.js');
const Bitbucket = require('apis_github_and_others/bitbucket.org.js');
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
        console.log('--- Running test_04_ci_status.js ---');
    }

    // Test 1: Empty or undefined commit SHA returns { status: 'none', url: null }
    const gh = new Github('https://github.com/octocat/Hello-World.git');
    const gl = new Gitlab('https://gitlab.com/gitlab-org/gitlab-foss.git');
    const bb = new Bitbucket('https://bitbucket.org/atlassian/aui.git', 'atlassian');

    const ghNone = await gh.getValue('ci-status', '');
    const glNone = await gl.getValue('ci-status', null);
    const bbNone = await bb.getValue('ci-status');

    assert(
        ghNone.status === 'none' && ghNone.url === null &&
        glNone.status === 'none' && glNone.url === null &&
        bbNone.status === 'none' && bbNone.url === null,
        'Providers return status none with null url when commitSha is missing'
    );

    // Test 2: GitHub ci-status parsing
    // Mock fetchWithApi on gh instance
    gh.fetchWithApi = async (url) => {
        if (url.includes('/commits/sha-success/status')) {
            return {
                ok: true,
                status: 200,
                json: {
                    state: 'success',
                    total_count: 1,
                    statuses: [{ state: 'success', target_url: 'https://ci.example.com/build/1' }]
                }
            };
        }
        if (url.includes('/commits/sha-fail/status')) {
            return {
                ok: true,
                status: 200,
                json: {
                    state: 'failure',
                    total_count: 1,
                    statuses: [{ state: 'failure', target_url: 'https://ci.example.com/build/2' }]
                }
            };
        }
        if (url.includes('/commits/sha-actions-success/status')) {
            return { ok: true, status: 200, json: { state: 'pending', total_count: 0, statuses: [] } };
        }
        if (url.includes('/commits/sha-actions-success/check-runs')) {
            return {
                ok: true,
                status: 200,
                json: {
                    total_count: 2,
                    check_runs: [
                        { status: 'completed', conclusion: 'success', html_url: 'https://github.com/actions/1' },
                        { status: 'completed', conclusion: 'skipped', html_url: 'https://github.com/actions/2' }
                    ]
                }
            };
        }
        if (url.includes('/commits/sha-actions-fail/status')) {
            return { ok: true, status: 200, json: { state: 'pending', total_count: 0, statuses: [] } };
        }
        if (url.includes('/commits/sha-actions-fail/check-runs')) {
            return {
                ok: true,
                status: 200,
                json: {
                    total_count: 2,
                    check_runs: [
                        { status: 'completed', conclusion: 'failure', html_url: 'https://github.com/actions/fail' },
                        { status: 'completed', conclusion: 'success', html_url: 'https://github.com/actions/ok' }
                    ]
                }
            };
        }
        return { ok: true, status: 200, json: { total_count: 0, statuses: [], check_runs: [] } };
    };

    const ghSuccess = await gh.getValue('ci-status', 'sha-success');
    const ghFail = await gh.getValue('ci-status', 'sha-fail');
    const ghActSuccess = await gh.getValue('ci-status', 'sha-actions-success');
    const ghActFail = await gh.getValue('ci-status', 'sha-actions-fail');

    assert(
        ghSuccess.status === 'success' && ghSuccess.url === 'https://ci.example.com/build/1' &&
        ghFail.status === 'failure' && ghFail.url === 'https://ci.example.com/build/2' &&
        ghActSuccess.status === 'success' && ghActSuccess.url === 'https://github.com/actions/1' &&
        ghActFail.status === 'failure' && ghActFail.url === 'https://github.com/actions/fail',
        'GitHub ci-status correctly resolves status and check-runs API responses'
    );

    // Test 3: GitLab ci-status parsing
    gl.fetchWithApi = async (url) => {
        if (url.includes('/commits/sha-gl-pass/statuses')) {
            return {
                ok: true,
                status: 200,
                json: [
                    { status: 'success', target_url: 'https://gitlab.com/ci/1' }
                ]
            };
        }
        if (url.includes('/commits/sha-gl-fail/statuses')) {
            return {
                ok: true,
                status: 200,
                json: [
                    { status: 'success', target_url: 'https://gitlab.com/ci/1' },
                    { status: 'failed', target_url: 'https://gitlab.com/ci/fail' }
                ]
            };
        }
        return { ok: true, status: 200, json: [] };
    };

    const glSuccess = await gl.getValue('ci-status', 'sha-gl-pass');
    const glFail = await gl.getValue('ci-status', 'sha-gl-fail');
    const glEmpty = await gl.getValue('ci-status', 'sha-gl-empty');

    assert(
        glSuccess.status === 'success' && glSuccess.url === 'https://gitlab.com/ci/1' &&
        glFail.status === 'failure' && glFail.url === 'https://gitlab.com/ci/fail' &&
        glEmpty.status === 'none',
        'GitLab ci-status correctly resolves pipeline status array'
    );

    // Test 4: Bitbucket ci-status parsing
    bb.fetchWithApi = async (url) => {
        if (url.includes('/commit/sha-bb-pass/statuses')) {
            return {
                ok: true,
                status: 200,
                json: {
                    values: [
                        { state: 'SUCCESSFUL', url: 'https://bitbucket.org/ci/pass' }
                    ]
                }
            };
        }
        if (url.includes('/commit/sha-bb-fail/statuses')) {
            return {
                ok: true,
                status: 200,
                json: {
                    values: [
                        { state: 'SUCCESSFUL', url: 'https://bitbucket.org/ci/pass' },
                        { state: 'FAILED', url: 'https://bitbucket.org/ci/fail' }
                    ]
                }
            };
        }
        return { ok: true, status: 200, json: { values: [] } };
    };

    const bbSuccess = await bb.getValue('ci-status', 'sha-bb-pass');
    const bbFail = await bb.getValue('ci-status', 'sha-bb-fail');
    const bbEmpty = await bb.getValue('ci-status', 'sha-bb-empty');

    assert(
        bbSuccess.status === 'success' && bbSuccess.url === 'https://bitbucket.org/ci/pass' &&
        bbFail.status === 'failure' && bbFail.url === 'https://bitbucket.org/ci/fail' &&
        bbEmpty.status === 'none',
        'Bitbucket ci-status correctly resolves commit statuses values'
    );

    printSuiteResult();
}

runTests();
