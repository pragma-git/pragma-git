#!/usr/bin/env node
// test_01_provider_url_translation.js - Tests git-to-api URL translation for git providers

const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../../..');
// Ensure NODE_PATH can resolve project-relative modules
process.env.NODE_PATH = REPO_ROOT;
require('module').Module._initPaths();

const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

console.log('Running Suite: Git Provider URL & REST API Mapping');

// Global log mock required by apis_github_and_others
global.log = function() {};

try {
    const GithubApi = require(path.join(REPO_ROOT, 'apis_github_and_others/github.com.js'));
    const GitlabApi = require(path.join(REPO_ROOT, 'apis_github_and_others/gitlab.com.js'));
    const BitbucketApi = require(path.join(REPO_ROOT, 'apis_github_and_others/bitbucket.org.js'));

    // Test 1: GitHub standard URL translation
    const gh1 = new GithubApi('https://github.com/pragma-git/pragma-git.git', 'token123');
    assert.strictEqual(gh1.apiurl, 'https://api.github.com/repos/pragma-git/pragma-git', 'GitHub API URL matches expected format');
    assertPass('1.1: Translates standard GitHub git URL to REST API endpoint');

    // Test 2: GitHub URL with embedded credentials
    const gh2 = new GithubApi('https://oauth2:token456@github.com/user/project.git');
    assert.strictEqual(gh2.apiurl, 'https://api.github.com/repos/user/project', 'Strips embedded auth from API URL');
    assertPass('1.2: Strips embedded credentials from GitHub REST API URL');

    // Test 3: GitLab API URL structure
    const gl = new GitlabApi('https://gitlab.com/group/repo.git', 'user', 'glpat_test');
    assert.ok(gl.apiurl.includes('gitlab.com'), 'GitLab instance initialized');
    assert.strictEqual(gl.username, 'user');
    assertPass('1.3: Initializes GitLab API instance with user and tokens');

    // Test 4: Bitbucket API URL structure
    const bb = new BitbucketApi('https://bitbucket.org/team/workspace-repo.git', 'bbuser', 'app_pwd');
    assert.ok(bb.apiurl.includes('bitbucket.org'), 'Bitbucket instance initialized');
    assert.strictEqual(bb.username, 'bbuser');
    assertPass('1.4: Initializes Bitbucket API instance and parses repository slug');

} catch (err) {
    assertFail('Failure in provider URL tests', err.stack);
}

printSuiteResult();
