#!/usr/bin/env node
/**
 * test_05_live_ci_status.js - Live CI status queries against real public commits
 *
 * Verifies getValue('ci-status', sha) end-to-end against known commits with
 * stable, finished CI results (success and failure) on each provider:
 *
 *   1. Internet connectivity
 *   2. GitHub    pragma-git/pragma-git   (GitHub Actions check-runs)        success + failure
 *   3. GitLab    gitlab-org/gitlab-foss  modern Pipelines API, no token     success + failure
 *                (URL-encoded project path, group-owned project)
 *   4. GitLab    same, ID-based project API URL (as after initialize())     success + failure
 *   5. GitLab    web pipelines.json, called directly (ci-status-web)       success + failure
 *   6. GitLab    SVG pipeline badge, called directly (ci-status-badge)     valid status
 *   7. Bitbucket atlassian/aui           (commit statuses)                  success + failure + none
 *   8. GitLab    inkscape/inkscape external CI pipeline via modern API      success + failure (no token)
 *
 * NOTE: If a provider purges old pipelines, update the hashes below.
 */

const dns = require('dns').promises;
const path = require('path');
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
console.error = function() {};  // Expected API noise (rate limits, 401 on legacy endpoints) is handled by test logic

const { YELLOW, NORMAL, assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

const Github = require('apis_github_and_others/github.com.js');
const Gitlab = require('apis_github_and_others/gitlab.com.js');
const Bitbucket = require('apis_github_and_others/bitbucket.org.js');

// Known public commits with finished CI results
const GITHUB_URL = 'https://github.com/pragma-git/pragma-git.git';
const GITHUB_SUCCESS = '11f50c6fa77d76c80ae9f493d6e3c9ee1abff68a';   // develop, Automated Non-GUI Tests: success
const GITHUB_FAILURE = 'cbccde8611342a8c78fb9c8bc0a3c09dc713f035';   // develop, Automated Non-GUI Tests: failure

const GITLAB_URL = 'https://gitlab.com/gitlab-org/gitlab-foss.git';
const GITLAB_PROJECT_ID = 13083;
const GITLAB_SUCCESS = 'd7b9a6176ab4e279465ba3ee09922cde2b74de47';   // master pipeline 2980334042: success
const GITLAB_FAILURE = '4d25d51356d8d855381ab9ab90b56cb63a338075';   // master pipeline 2968873877: failed

const GITLAB_EXTERNAL_URL = 'https://gitlab.com/inkscape/inkscape.git';
const GITLAB_EXTERNAL_SUCCESS = '7935678476697f9ccc6a6b7881e9430d27e5a184'; // pipeline 290189805, source 'external': success
const GITLAB_EXTERNAL_FAILURE = '000dddd8d3bd7eb08ec9916d456acb61313e80c0'; // pipeline 327349010, source 'external': failed

const BITBUCKET_URL = 'https://bitbucket.org/atlassian/aui.git';
const BITBUCKET_SUCCESS = '592af90b018b2d35fac96129e5fbeec1ed826fe2'; // 3 x SUCCESSFUL
const BITBUCKET_FAILURE = 'e99b3d8eb588e253c562b7c4014a97cd3d8b3301'; // historical master commit with FAILED statuses
const BITBUCKET_NONE = 'dfeff30ea5e2aa95d1c1e3c5011f7cd0e7ba7b41';    // no statuses

function resolveGitHubToken() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
    try {
        const out = execSync('printf "protocol=https\\nhost=github.com\\n\\n" | git credential fill 2>/dev/null', { timeout: 3000 }).toString();
        const match = out.match(/^password=(.+)$/m);
        if (match && match[1]) {
            return match[1].trim();
        }
    } catch (e) {}
    return '';
}

async function checkInternet() {
    if (process.env.SIMULATE_OFFLINE === 'true') {
        return false;
    }
    try {
        await dns.lookup('gitlab.com');
        return true;
    } catch (e) {
        return false;
    }
}

function describe(result) {
    return JSON.stringify(result);
}

async function runTests() {
    console.log('Running Suite: Live CI Status Queries');

    // Test 1: Internet
    const online = await checkInternet();
    if (!online) {
        assertFail('5.1: Active internet connection required for live CI status tests (DNS resolution to gitlab.com failed)');
        printSuiteResult();
        return;
    }
    assertPass('5.1: Verified active internet connectivity via DNS resolution (gitlab.com)');

    // Test 2: GitHub (GitHub Actions check-runs)
    try {
        let token = resolveGitHubToken();
        let gh = new Github(GITHUB_URL, 'pragma-git', token);
        let ok, fail;
        try {
            ok = await gh.getValue('ci-status', GITHUB_SUCCESS);
        } catch (e) {
            // Stale token from credential helper -> retry unauthenticated
            gh = new Github(GITHUB_URL, 'pragma-git', '');
            ok = await gh.getValue('ci-status', GITHUB_SUCCESS);
        }
        fail = await gh.getValue('ci-status', GITHUB_FAILURE);
        if (ok.status === 'success' && fail.status === 'failure' && ok.url && fail.url) {
            assertPass('5.2: GitHub ci-status (check-runs) pragma-git/pragma-git: success + failure');
        } else {
            assertFail('5.2: GitHub ci-status (check-runs) pragma-git/pragma-git', `success=${describe(ok)} failure=${describe(fail)}`);
        }
    } catch (err) {
        if (/40[13]|429|rate limit/i.test(err.message)) {
            console.log(`  ${YELLOW}[SKIP]${NORMAL} 5.2: GitHub ci-status (API rate limit or auth error, set GITHUB_TOKEN): ${err.message}`);
        } else {
            assertFail('5.2: GitHub ci-status (check-runs) pragma-git/pragma-git', err.message);
        }
    }

    // Test 3: GitLab modern Pipelines API, no token, URL-encoded path (group-owned project)
    try {
        const gl = new Gitlab(GITLAB_URL, null, null);
        await gl.initialize();  // Same flow as app.js (user lookup fails for group-owned projects)
        const ok = await gl.getValue('ci-status', GITLAB_SUCCESS);
        const fail = await gl.getValue('ci-status', GITLAB_FAILURE);
        if (ok.status === 'success' && fail.status === 'failure' &&
            /\/-\/pipelines\/\d+$/.test(ok.url || '') && /\/-\/pipelines\/\d+$/.test(fail.url || '')) {
            assertPass('5.3: GitLab ci-status modern Pipelines API (no token, encoded path) gitlab-org/gitlab-foss: success + failure');
        } else {
            assertFail('5.3: GitLab ci-status modern Pipelines API (no token, encoded path)', `success=${describe(ok)} failure=${describe(fail)}`);
        }
    } catch (err) {
        assertFail('5.3: GitLab ci-status modern Pipelines API (no token, encoded path)', err.message);
    }

    // Test 4: GitLab modern Pipelines API, ID-based project URL (as set by a successful initialize())
    try {
        const gl = new Gitlab(GITLAB_URL, null, null);
        gl.apiurl = `https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}`;
        const ok = await gl.getValue('ci-status', GITLAB_SUCCESS);
        const fail = await gl.getValue('ci-status', GITLAB_FAILURE);
        if (ok.status === 'success' && fail.status === 'failure') {
            assertPass('5.4: GitLab ci-status modern Pipelines API (no token, project ID url): success + failure');
        } else {
            assertFail('5.4: GitLab ci-status modern Pipelines API (project ID url)', `success=${describe(ok)} failure=${describe(fail)}`);
        }
    } catch (err) {
        assertFail('5.4: GitLab ci-status modern Pipelines API (project ID url)', err.message);
    }

    // Test 5: GitLab legacy web pipelines.json -- called directly, no mocking
    try {
        const gl = new Gitlab(GITLAB_URL, null, null);
        const ok = await gl.getValue('ci-status-web', GITLAB_SUCCESS);
        const fail = await gl.getValue('ci-status-web', GITLAB_FAILURE);
        if (ok.status === 'success' && fail.status === 'failure' &&
            /\/-\/pipelines\/\d+$/.test(ok.url || '') && /\/-\/pipelines\/\d+$/.test(fail.url || '')) {
            assertPass('5.5: GitLab web pipelines.json (ci-status-web, no token, no mocking): success + failure');
        } else {
            assertFail('5.5: GitLab web pipelines.json (ci-status-web)', `success=${describe(ok)} failure=${describe(fail)}`);
        }
    } catch (err) {
        assertFail('5.5: GitLab web pipelines.json (ci-status-web)', err.message);
    }

    // Test 6: GitLab SVG badge -- called directly, no mocking (branch level: current master status, so only validity is checked)
    try {
        const gl = new Gitlab(GITLAB_URL, null, null);
        const result = await gl.getValue('ci-status-badge', 'master');
        if (result && ['success', 'failure', 'pending', 'none'].includes(result.status) &&
            result.url === 'https://gitlab.com/gitlab-org/gitlab-foss/-/pipelines?ref=master') {
            assertPass(`5.6: GitLab SVG badge (ci-status-badge, master, no mocking) returns valid status (${result.status})`);
        } else {
            assertFail('5.6: GitLab SVG badge (ci-status-badge, master)', describe(result));
        }
    } catch (err) {
        assertFail('5.6: GitLab SVG badge (ci-status-badge, master)', err.message);
    }


    // Test 7: Bitbucket commit statuses
    try {
        const bb = new Bitbucket(BITBUCKET_URL);
        const ok = await bb.getValue('ci-status', BITBUCKET_SUCCESS);
        const fail = await bb.getValue('ci-status', BITBUCKET_FAILURE);
        const none = await bb.getValue('ci-status', BITBUCKET_NONE);
        if (ok.status === 'success' && fail.status === 'failure' && none.status === 'none') {
            assertPass('5.7: Bitbucket ci-status atlassian/aui: success + failure + none');
        } else {
            assertFail('5.7: Bitbucket ci-status atlassian/aui', `success=${describe(ok)} failure=${describe(fail)} none=${describe(none)}`);
        }
    } catch (err) {
        if (/40[13]|429|rate limit/i.test(err.message)) {
            console.log(`  ${YELLOW}[SKIP]${NORMAL} 5.7: Bitbucket ci-status (API rate limit): ${err.message}`);
        } else {
            assertFail('5.7: Bitbucket ci-status atlassian/aui', err.message);
        }
    }

    // Test 8: GitLab external CI (statuses posted by an external CI system, pipeline source 'external')
    //         is visible through the modern Pipelines API without token -- no legacy statuses API needed
    try {
        const gl = new Gitlab(GITLAB_EXTERNAL_URL, null, null);
        const ok = await gl.getValue('ci-status', GITLAB_EXTERNAL_SUCCESS);
        const fail = await gl.getValue('ci-status', GITLAB_EXTERNAL_FAILURE);
        if (ok.status === 'success' && fail.status === 'failure' &&
            /\/-\/pipelines\/\d+$/.test(ok.url || '') && /\/-\/pipelines\/\d+$/.test(fail.url || '')) {
            assertPass('5.8: GitLab external CI commits (inkscape, pipeline source external) via modern Pipelines API, no token: success + failure');
        } else {
            assertFail('5.8: GitLab external CI commits via modern Pipelines API', `success=${describe(ok)} failure=${describe(fail)}`);
        }
    } catch (err) {
        assertFail('5.8: GitLab external CI commits via modern Pipelines API', err.message);
    }

    // Test 9: Live auto-detection of real self-hosted GitLab, GitHub Enterprise, and Bitbucket Server instances
    //         whose domain names do NOT contain 'gitlab', 'github', or 'bitbucket' (no mocking, no manual detectProvider call)
    try {
        const GeneralApi = require('apis_github_and_others/general_git_rest_api.js');
        GeneralApi.hostProviderCache = {};

        // 1. Self-hosted GitLab (VideoLAN: code.videolan.org)
        const glSelfUrl = 'https://code.videolan.org/videolan/vlc.git';
        const glSelf = new GeneralApi(glSelfUrl);
        const glIcon = await glSelf.getValue('icon', 'darkmode');
        const glCached = new GeneralApi(glSelfUrl);

        // 2. Self-hosted GitHub Enterprise Server (KTH: gits-15.sys.kth.se)
        const ghSelfUrl = 'https://gits-15.sys.kth.se/kth/repo.git';
        const ghSelf = new GeneralApi(ghSelfUrl);
        const ghIcon = await ghSelf.getValue('icon', 'darkmode');
        const ghCached = new GeneralApi(ghSelfUrl);

        // 3. Self-hosted Bitbucket Server / Data Center (ECMWF: git.ecmwf.int)
        const bbSelfUrl = 'https://git.ecmwf.int/ecsdk/ecbuild.git';
        const bbSelf = new GeneralApi(bbSelfUrl);
        const bbIcon = await bbSelf.getValue('icon', 'darkmode');
        const bbCached = new GeneralApi(bbSelfUrl);

        if (glIcon.includes('gitlab-logo') && glCached instanceof Gitlab &&
            ghIcon.includes('github-mark') && ghCached instanceof Github &&
            bbIcon.includes('bitbucket') && bbCached instanceof Bitbucket) {
            assertPass('5.9: Live self-hosted auto-detection without provider name in URL (code.videolan.org -> GitLab, gits-15.sys.kth.se -> GitHub, git.ecmwf.int -> Bitbucket)');
        } else {
            assertFail('5.9: Live self-hosted auto-detection', `gl=${glIcon} gh=${ghIcon} bb=${bbIcon}`);
        }
    } catch (err) {
        assertFail('5.9: Live self-hosted auto-detection', err.message);
    }

    printSuiteResult();
}

runTests();
