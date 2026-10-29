#!/usr/bin/env node
/**
 * test_04_ci_status.js - Test commit CI status parsing across Git providers
 *
 * Verifies:
 *   1. Missing commitSha gracefully returns { status: 'none', url: null }
 *   2. GitHub ci-status handling (Commit Status API & Check Runs API)
 *   3. Bitbucket ci-status handling (Commit statuses values)
 *   4. GitLab modern Pipelines API and status mapping
 *   5. GitLab project API URL (project ID vs URL-encoded path)
 *   6. GitLab PRIVATE-TOKEN header for private repos
 *   7. GitLab web pipelines.json fallback (no token, no API)
 *   8. GitLab SVG badge fallback (branch level)
 *   9. GitLab error when all sources are unavailable
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
const Gitea = require('apis_github_and_others/gitea.com.js');
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

    // Test 3: Bitbucket ci-status parsing
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

    // Test 4: GitLab modern Pipelines API (/pipelines?sha=) and status mapping
    const glModern = new Gitlab('https://gitlab.com/gitlab-org/gitlab-foss.git');
    const pipelineStatusBySha = {
        'sha-p-success': 'success',
        'sha-p-warn': 'success-with-warnings',
        'sha-p-failed': 'failed',
        'sha-p-canceled': 'canceled',
        'sha-p-running': 'running',
        'sha-p-skipped': 'skipped'
    };
    const calledUrls = [];
    glModern.fetchWithApi = async (url) => {
        calledUrls.push(url);
        const match = url.match(/\/pipelines\?sha=([^&]+)/);
        if (match && pipelineStatusBySha[match[1]]) {
            return {
                ok: true,
                status: 200,
                json: [
                    { status: pipelineStatusBySha[match[1]], web_url: `https://gitlab.com/p/${match[1]}` },
                    { status: 'success', web_url: 'https://gitlab.com/p/older' }  // older pipeline must be ignored
                ]
            };
        }
        return { ok: true, status: 200, json: [] };
    };
    const modern = {};
    for (const sha of Object.keys(pipelineStatusBySha)) {
        modern[sha] = await glModern.getValue('ci-status', sha);
    }
    assert(
        modern['sha-p-success'].status === 'success' && modern['sha-p-success'].url === 'https://gitlab.com/p/sha-p-success' &&
        modern['sha-p-warn'].status === 'success' &&
        modern['sha-p-failed'].status === 'failure' && modern['sha-p-failed'].url === 'https://gitlab.com/p/sha-p-failed' &&
        modern['sha-p-canceled'].status === 'failure' &&
        modern['sha-p-running'].status === 'pending' &&
        modern['sha-p-skipped'].status === 'none' &&
        !calledUrls.some(u => u.includes('/statuses')),
        'GitLab ci-status uses modern Pipelines API (newest pipeline) and maps success/warnings/failed/canceled/running/skipped'
    );

    // Test 5: GitLab project API URL -- ID-based (after initialize) and URL-encoded path (group-owned, initialize failed)
    calledUrls.length = 0;
    await glModern.getValue('ci-status', 'sha-p-success');               // apiurl still the users/... search url
    const encodedUrl = calledUrls[0];
    glModern.apiurl = 'https://gitlab.com/api/v4/projects/13083';        // as set by a successful initialize()
    calledUrls.length = 0;
    await glModern.getValue('ci-status', 'sha-p-success');
    const idUrl = calledUrls[0];
    assert(
        encodedUrl === 'https://gitlab.com/api/v4/projects/gitlab-org%2Fgitlab-foss/pipelines?sha=sha-p-success' &&
        idUrl === 'https://gitlab.com/api/v4/projects/13083/pipelines?sha=sha-p-success',
        'GitLab ci-status builds project API URL from encoded path (group-owned) or project ID (after initialize)'
    );

    // Test 6: GitLab token is sent as PRIVATE-TOKEN header (private repos)
    const glPrivate = new Gitlab('https://gitlab.com/someone/private-repo.git', 'someone', 'glpat-secret');
    let sentHeaders = null;
    glPrivate.fetchWithApi = async (url, options) => {
        sentHeaders = options.headers;
        return { ok: true, status: 200, json: [{ status: 'failed', web_url: 'https://gitlab.com/p/private' }] };
    };
    const privResult = await glPrivate.getValue('ci-status', 'sha-private');
    assert(
        sentHeaders && sentHeaders['PRIVATE-TOKEN'] === 'glpat-secret' && privResult.status === 'failure',
        'GitLab ci-status sends PRIVATE-TOKEN header when a token is provided'
    );

    // Tests 7-9 replace global fetch (used by the web and SVG badge fallbacks)
    const realFetch = global.fetch;
    const apiDown = async () => ({ ok: false, status: 503, json: undefined });
    const fakeResponse = (body, contentType, status = 200) =>
        new Response(body, { status: status, headers: { 'content-type': contentType } });

    // Test 7: GitLab legacy web endpoint fallback (/-/commit/SHA/pipelines.json, no token, no API)
    try {
        global.fetch = async (url) => {
            if (url.includes('/-/commit/sha-web-fail/pipelines.json')) {
                return fakeResponse(JSON.stringify({ pipelines: [{ path: '/gitlab-org/gitlab-foss/-/pipelines/2', details: { status: { group: 'failed', text: 'Failed' } } }] }), 'application/json');
            }
            if (url.includes('/-/commit/sha-web-pass/pipelines.json')) {
                return fakeResponse(JSON.stringify({ pipelines: [{ path: '/gitlab-org/gitlab-foss/-/pipelines/1', details: { status: { group: 'success', text: 'Passed' } } }] }), 'application/json');
            }
            if (url.includes('/-/commit/sha-web-empty/pipelines.json')) {
                return fakeResponse(JSON.stringify({ pipelines: [] }), 'application/json');
            }
            return fakeResponse('<html>sign in</html>', 'text/html');
        };
        const glWeb = new Gitlab('https://gitlab.com/gitlab-org/gitlab-foss.git');
        glWeb.fetchWithApi = apiDown;
        const webPass = await glWeb.getValue('ci-status', 'sha-web-pass');
        const webFail = await glWeb.getValue('ci-status', 'sha-web-fail');
        const webEmpty = await glWeb.getValue('ci-status', 'sha-web-empty');
        assert(
            webPass.status === 'success' && webPass.url === 'https://gitlab.com/gitlab-org/gitlab-foss/-/pipelines/1' &&
            webFail.status === 'failure' && webFail.url === 'https://gitlab.com/gitlab-org/gitlab-foss/-/pipelines/2' &&
            webEmpty.status === 'none',
            'GitLab ci-status falls back to web pipelines.json when the API is unavailable'
        );

        // Test 8: GitLab SVG badge fallback (only when branch is given)
        global.fetch = async (url) => {
            if (url.endsWith('/badges/main/pipeline.svg')) {
                return fakeResponse('<svg><text>pipeline</text><text>passed</text></svg>', 'image/svg+xml');
            }
            if (url.endsWith('/badges/broken/pipeline.svg')) {
                return fakeResponse('<svg><text>pipeline</text><text>failed</text></svg>', 'image/svg+xml');
            }
            return fakeResponse('<html>sign in</html>', 'text/html');
        };
        const glBadge = new Gitlab('https://gitlab.com/inkscape/inkscape.git');
        glBadge.fetchWithApi = apiDown;
        const badgePass = await glBadge.getValue('ci-status', 'sha-any', 'main');
        const badgeFail = await glBadge.getValue('ci-status', 'sha-any', 'broken');
        assert(
            badgePass.status === 'success' && badgePass.url === 'https://gitlab.com/inkscape/inkscape/-/pipelines?ref=main' &&
            badgeFail.status === 'failure',
            'GitLab ci-status falls back to SVG pipeline badge when a branch is given'
        );

        // Test 9: Without branch, and with all sources unavailable, ci-status throws
        let threw = false;
        try {
            await glBadge.getValue('ci-status', 'sha-any');
        } catch (e) {
            threw = true;
        }
        assert(threw, 'GitLab ci-status throws when API, web and badge sources are all unavailable');
    } finally {
        global.fetch = realFetch;
    }

    // Test 10: Gitea ci-status parsing (relative target_url resolution, failure priority, and empty total_count -> none)
    const gt = new Gitea('https://gitea.com/gitea/tea.git', 'gitea', 'gt-token');
    gt.fetchWithApi = async (url) => {
        if (url.includes('/commits/sha-gt-pass/status')) {
            return {
                ok: true,
                status: 200,
                json: {
                    state: 'success',
                    total_count: 1,
                    statuses: [{ status: 'success', target_url: '/gitea/tea/actions/runs/100/jobs/1' }]
                }
            };
        }
        if (url.includes('/commits/sha-gt-fail/status')) {
            return {
                ok: true,
                status: 200,
                json: {
                    state: 'failure',
                    total_count: 2,
                    statuses: [
                        { status: 'success', target_url: '/gitea/tea/actions/runs/100/jobs/1' },
                        { status: 'failure', target_url: '/gitea/tea/actions/runs/100/jobs/2' }
                    ]
                }
            };
        }
        // Gitea returns state: 'pending' with total_count: 0 when a commit has no statuses
        return {
            ok: true,
            status: 200,
            json: { state: 'pending', total_count: 0, statuses: null }
        };
    };

    const gtPass = await gt.getValue('ci-status', 'sha-gt-pass');
    const gtFail = await gt.getValue('ci-status', 'sha-gt-fail');
    const gtEmpty = await gt.getValue('ci-status', 'sha-gt-empty');

    assert(
        gtPass.status === 'success' && gtPass.url === 'https://gitea.com/gitea/tea/actions/runs/100/jobs/1' &&
        gtFail.status === 'failure' && gtFail.url === 'https://gitea.com/gitea/tea/actions/runs/100/jobs/2' &&
        gtEmpty.status === 'none' && gtEmpty.url === null,
        'Gitea ci-status resolves relative action URLs, maps success/failure, and treats total_count=0 as none'
    );

    printSuiteResult();
}

runTests();
