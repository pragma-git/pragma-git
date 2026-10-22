#!/usr/bin/env node
/**
 * test_03_provider_classes.js - Test provider class instantiation and methods
 *
 * Verifies:
 *   1. General_git_rest_api base methods (isEmptyString)
 *   2. github.com.js class instantiation, username, web-url, and icon getters
 *   3. gitlab.com.js class instantiation, username, web-url, and icon getters
 *   4. bitbucket.org.js class instantiation, username, web-url, and icon getters
 */

const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');
process.env.NODE_PATH = REPO_ROOT;
require('module').Module._initPaths();

// Mock global logging functions expected by provider classes
global.log = () => {};
global.warn = () => {};

const GeneralApi = require('apis_github_and_others/general_git_rest_api.js');
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
        console.log('--- Running test_03_provider_classes.js ---');
    }

    // Test 1: General_git_rest_api base class isEmptyString
    const base = new GeneralApi('https://github.com/example/repo.git', 'user', 'token');
    const empty1 = base.isEmptyString('');
    const empty2 = base.isEmptyString('   ');
    const empty3 = base.isEmptyString(null);
    const empty4 = base.isEmptyString(undefined);
    const notEmpty = !base.isEmptyString('valid-string');
    assert(empty1 && empty2 && empty3 && empty4 && notEmpty, 'General_git_rest_api.isEmptyString correctly handles empty vs non-empty strings');

    // Test 2: github class instantiation and getters
    const gh = new Github('https://github.com/octocat/Hello-World.git');
    const ghUser = await gh.getValue('git-username');
    const ghWeb = await gh.getValue('web-url');
    const ghDark = await gh.getValue('icon', 'darkmode');
    const ghLight = await gh.getValue('icon', 'lightmode');
    assert(
        ghUser === 'octocat' &&
        ghWeb === 'https://github.com/octocat/Hello-World' &&
        ghDark.includes('github-mark-white.png') &&
        ghLight.includes('github-mark.png'),
        'Github class extracts username, web-url, and dark/light icons'
    );

    // Test 3: gitlab class instantiation and getters
    const gl = new Gitlab('https://gitlab.com/gitlab-org/gitlab-foss.git');
    const glUser = await gl.getValue('git-username');
    const glWeb = await gl.getValue('web-url');
    const glIcon = await gl.getValue('icon', 'darkmode');
    assert(
        glUser === 'gitlab-org' &&
        glWeb === 'https://gitlab.com/gitlab-org/gitlab-foss' &&
        typeof glIcon === 'string' && glIcon.length > 0,
        'GitLab class extracts username, web-url, and icon'
    );

    // Test 4: bitbucket class instantiation and getters
    const bb = new Bitbucket('https://bitbucket.org/atlassian/aui.git', 'atlassian');
    const bbUser = await bb.getValue('git-username');
    const bbWeb = await bb.getValue('web-url');
    const bbIcon = await bb.getValue('icon', 'darkmode');
    assert(
        bbUser === 'atlassian' &&
        bbWeb === 'https://bitbucket.org/atlassian/aui' &&
        bbIcon.includes('bitbucket_blue.png'),
        'Bitbucket class extracts username, web-url, and icon'
    );

    printSuiteResult();
}

runTests();
