#!/usr/bin/env node
/**
 * test_03_provider_classes.js - Test provider class instantiation and methods
 *
 * Verifies:
 *   1. General_git_rest_api base methods (isEmptyString)
 *   2. github.com.js class instantiation, username, web-url, and icon getters
 *   3. gitlab.com.js class instantiation, username, web-url, and icon getters
 *   4. bitbucket.org.js class instantiation, username, web-url, and icon getters
 *   5. General_git_rest_api direct constructor returns the matching subclass (github, gitlab, bitbucket)
 *   6. General_git_rest_api URL & path heuristics for self-hosted GitLab, GitHub Enterprise, and Bitbucket Server
 *   7. General_git_rest_api.detectProvider live HTTP probing and host caching for custom self-hosted domains
 *   8. Provider metadata (getProviders, create-repo-labels, formatTokenForDisplay, parseTokenForCredential)
 *   9. settings.js provider UI functions (drawCreateRemoteRepoButtons, drawProviderIcon, onThemeChanged)
 *  10. create_remote_repository.js provider dialog & credential functions (runWhenDOMContentLoaded, replaceInText, updateCredentialsText, rememberCredential)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

    // Test 4: bitbucket and gitea class instantiation and getters
    const bb = new Bitbucket('https://bitbucket.org/atlassian/aui.git', 'atlassian');
    const bbUser = await bb.getValue('git-username');
    const bbWeb = await bb.getValue('web-url');
    const bbIcon = await bb.getValue('icon', 'darkmode');
    const gt = new Gitea('https://gitea.com/gitea/tea.git', 'gitea');
    const gtUser = await gt.getValue('git-username');
    const gtWeb = await gt.getValue('web-url');
    const gtIcon = await gt.getValue('icon', 'darkmode');
    assert(
        bbUser === 'atlassian' &&
        bbWeb === 'https://bitbucket.org/atlassian/aui' &&
        bbIcon.includes('bitbucket_blue.png') &&
        gtUser === 'gitea' &&
        gtWeb === 'https://gitea.com/gitea/tea' &&
        gtIcon.includes('gitea.png'),
        'Bitbucket and Gitea classes extract username, web-url, and icon'
    );

    // Test 5: Calling 'new General_git_rest_api(giturl, ...)' directly returns the matching provider subclass instance
    const autoGh = new GeneralApi('https://github.com/octocat/Hello-World.git', 'octocat', 'gh-tok');
    const autoGl = new GeneralApi('https://gitlab.com/gitlab-org/gitlab-foss.git', 'gitlab-org', 'gl-tok');
    const autoBb = new GeneralApi('https://bitbucket.org/atlassian/aui.git', 'atlassian', 'bb-tok');
    const autoGt = new GeneralApi('https://gitea.com/gitea/tea.git', 'gitea', 'gt-tok');
    assert(
        autoGh instanceof Github && autoGh instanceof GeneralApi && autoGh.TOKEN === 'gh-tok' &&
        autoGl instanceof Gitlab && autoGl instanceof GeneralApi && autoGl.TOKEN === 'gl-tok' &&
        autoBb instanceof Bitbucket && autoBb instanceof GeneralApi && autoBb.TOKEN === 'bb-tok' &&
        autoGt instanceof Gitea && autoGt instanceof GeneralApi && autoGt.TOKEN === 'gt-tok',
        'new General_git_rest_api(giturl) returns the matching Github, Gitlab, Bitbucket, or Gitea subclass instance'
    );

    // Test 6: Self-hosted URL & path heuristics (without network calls)
    const selfGlHost = new GeneralApi('https://gitlab.mycompany.internal/team/app.git');
    const selfGlSubgroup = new GeneralApi('https://git.mycompany.internal/dept/subdept/project.git');
    const selfGhHost = new GeneralApi('https://github.mycompany.internal/org/service.git');
    const selfBbScm = new GeneralApi('https://git.mycompany.internal/scm/proj/repo.git');
    const selfGtHost = new GeneralApi('https://gitea.mycompany.internal/org/service.git');
    assert(
        selfGlHost instanceof Gitlab &&
        selfGlSubgroup instanceof Gitlab &&
        selfGhHost instanceof Github &&
        selfGhHost.apiurl === 'https://github.mycompany.internal/api/v3/repos/org/service' &&
        selfBbScm instanceof Bitbucket &&
        selfGtHost instanceof Gitea &&
        selfGtHost.apiurl === 'https://gitea.mycompany.internal/api/v1/repos/org/service',
        'General_git_rest_api resolves self-hosted GitLab (host/subgroup), GitHub Enterprise (/api/v3), Bitbucket Server (/scm/), and Gitea (/api/v1)'
    );

    // Test 7: detectProvider probes unknown custom domains for GitLab / GitHub / Bitbucket / Gitea and caches the host
    const realFetch = global.fetch;
    try {
        GeneralApi.hostProviderCache = {};
        let probeCalls = 0;
        global.fetch = async (url) => {
            probeCalls++;
            if (String(url).startsWith('https://code.local-company.lan/api/v4/version')) {
                // Typical unauthenticated response from a self-hosted GitLab instance
                return new Response(JSON.stringify({ message: '401 Unauthorized' }), {
                    status: 401,
                    headers: { 'content-type': 'application/json', 'x-gitlab-meta': '{" correlation_id":"123"}' }
                });
            }
            if (String(url).startsWith('https://ghe.local-company.lan/api/v3/meta')) {
                return new Response(JSON.stringify({ verifiable_password_authentication: true, installed_version: '3.12.0' }), {
                    status: 200,
                    headers: { 'content-type': 'application/json', 'x-github-enterprise-version': '3.12.0' }
                });
            }
            if (String(url).startsWith('https://tea.local-company.lan/api/v1/version')) {
                return new Response(JSON.stringify({ version: '1.22.0' }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' }
                });
            }
            return new Response('Not Found', { status: 404 });
        };

        const customGitlabUrl = 'https://code.local-company.lan/team/backend.git';
        // Direct instantiation WITHOUT calling detectProvider first -- getValue/initialize triggers auto-detection automatically!
        const directUnknownGl = new GeneralApi(customGitlabUrl, 'dev', 'glpat-local');
        const directGlIcon = await directUnknownGl.getValue('icon', 'darkmode');
        const callsAfterFirst = probeCalls;
        // Now that the host is cached, 'new GeneralApi(customGitlabUrl)' returns a Gitlab instance directly and makes 0 network calls
        const cachedGlInstance = new GeneralApi('https://code.local-company.lan/other/repo.git', 'dev', 'glpat-local');
        const callsAfterCached = probeCalls;

        const customGheUrl = 'https://ghe.local-company.lan/team/frontend.git';
        const directUnknownGhe = new GeneralApi(customGheUrl);
        const directGheUser = await directUnknownGhe.getValue('git-username');

        const customGiteaUrl = 'https://tea.local-company.lan/team/cli.git';
        const directUnknownGitea = new GeneralApi(customGiteaUrl);
        const directGiteaIcon = await directUnknownGitea.getValue('icon', 'darkmode');
        const cachedGiteaInstance = new GeneralApi('https://tea.local-company.lan/other/repo.git');

        assert(
            directGlIcon.includes('gitlab-logo') &&
            cachedGlInstance instanceof Gitlab &&
            callsAfterFirst === 1 &&
            callsAfterCached === 1 &&
            directGheUser === 'team' &&
            directGiteaIcon.includes('gitea.png') &&
            cachedGiteaInstance instanceof Gitea,
            'new General_git_rest_api(unknownUrl) auto-detects custom-domain GitLab, GitHub Enterprise, and Gitea servers on first use and caches the host'
        );
    } finally {
        global.fetch = realFetch;
        GeneralApi.hostProviderCache = {};
    }

    // Test 8: Provider metadata (getProviders, create-repo-labels, formatTokenForDisplay, parseTokenForCredential)
    const providersList = await GeneralApi.getProviders('lightmode');
    const ghInst = new GeneralApi('https://github.com/org/repo.git');
    const glInst = new GeneralApi('https://gitlab.com/org/repo.git');
    const bbInst = new GeneralApi('https://bitbucket.org/org/repo.git');
    const gtInst = new GeneralApi('https://gitea.com/org/repo.git');

    const ghLabels = await ghInst.getValue('create-repo-labels');
    const glLabels = await glInst.getValue('create-repo-labels');
    const bbLabels = await bbInst.getValue('create-repo-labels');
    const gtLabels = await gtInst.getValue('create-repo-labels');

    const ghCred = ghInst.parseTokenForCredential('octocat', 'ghp_123');
    const bbOauthCred = bbInst.parseTokenForCredential('workspace', 'oauth_tok');
    const bbAppPassCred = bbInst.parseTokenForCredential('workspace', 'myuser:app_secret');

    assert(
        providersList.length === 4 &&
        providersList[0].name === 'Github' && providersList[0].displayName === 'GitHub' &&
        providersList[1].name === 'Gitlab' && providersList[1].displayName === 'GitLab' &&
        providersList[2].name === 'Bitbucket' && providersList[2].displayName === 'Bitbucket' &&
        providersList[3].name === 'Gitea' && providersList[3].displayName === 'Gitea' &&
        ghLabels.accountLinkUrl === 'https://github.com/join' &&
        glLabels.tokenLinkUrl.includes('personal_access_tokens') &&
        bbLabels.tokenLinkUrl.includes('app-passwords') &&
        gtLabels.tokenLinkUrl.includes('gitea.com/user/settings/applications') &&
        ghInst.formatTokenForDisplay('octocat', 'ghp_123') === 'ghp_123' &&
        bbInst.formatTokenForDisplay('x-token-auth', 'oauth_tok') === 'oauth_tok' &&
        bbInst.formatTokenForDisplay('myuser', 'app_secret') === 'myuser:app_secret' &&
        ghCred.username === 'octocat' && ghCred.password === 'ghp_123' &&
        bbOauthCred.username === 'x-token-auth' && bbOauthCred.password === 'oauth_tok' &&
        bbAppPassCred.username === 'myuser' && bbAppPassCred.password === 'app_secret',
        'Provider classes supply UI metadata, create-repo labels, and credential token formatting/parsing'
    );

    // Helper to extract a named function from a source file for VM execution
    function extractFunction(sourceCode, name) {
        const match = sourceCode.match(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{'));
        if (!match) throw new Error('Could not find function ' + name);
        const start = match.index;
        let openBraces = 0;
        let started = false;
        for (let i = start; i < sourceCode.length; i++) {
            if (sourceCode[i] === '{') {
                openBraces++;
                started = true;
            } else if (sourceCode[i] === '}') {
                openBraces--;
                if (started && openBraces === 0) {
                    return sourceCode.substring(start, i + 1);
                }
            }
        }
        throw new Error('Unbalanced braces in function ' + name);
    }

    // Test 9: settings.js provider UI functions (drawCreateRemoteRepoButtons, drawProviderIcon, onThemeChanged)
    const settingsJsCode = fs.readFileSync(path.join(REPO_ROOT, 'settings.js'), 'utf8');
    const createRepoDiv = { innerHTML: '' };
    const iconAnchor = {
        href: '',
        attrs: {},
        setAttribute(k, v) { this.attrs[k] = v; },
        removeAttribute(k) { delete this.attrs[k]; this[k] = ''; }
    };
    const iconImg = { src: '', parentElement: iconAnchor };

    const settingsSandbox = {
        require,
        console: { log: () => {}, warn: () => {}, error: () => {} },
        localState: { dark: false },
        state: {
            repos: [
                { remoteURL: 'https://github.com/octocat/Hello-World.git' }
            ]
        },
        opener: {
            gitProvider: async (url) => new GeneralApi(url)
        },
        document: {
            body: {
                _dark: false,
                classList: {
                    contains(cls) { return cls === 'dark' ? settingsSandbox.document.body._dark : false; }
                }
            },
            getElementById(id) {
                if (id === 'CreateRemoteRepoDiv') return createRepoDiv;
                if (id === 30000) return iconImg;
                return null;
            },
            querySelectorAll() { return []; }
        }
    };
    vm.createContext(settingsSandbox);
    vm.runInContext(extractFunction(settingsJsCode, 'drawCreateRemoteRepoButtons'), settingsSandbox);
    vm.runInContext(extractFunction(settingsJsCode, 'drawProviderIcon'), settingsSandbox);
    vm.runInContext(extractFunction(settingsJsCode, 'onThemeChanged'), settingsSandbox);

    await settingsSandbox.drawCreateRemoteRepoButtons(settingsSandbox.document);
    await settingsSandbox.drawProviderIcon(30000, 'https://github.com/octocat/Hello-World.git');
    const lightIconSrc = iconImg.src;
    const webHref = iconAnchor.href;

    // Simulate switching to dark mode and calling onThemeChanged()
    settingsSandbox.document.body._dark = true;
    settingsSandbox.onThemeChanged();
    // Wait for async drawProviderIcon triggered by onThemeChanged
    await new Promise(resolve => setTimeout(resolve, 20));
    const darkIconSrc = iconImg.src;

    assert(
        createRepoDiv.innerHTML.includes("name: 'Github', provider: 'https://github.com'") &&
        createRepoDiv.innerHTML.includes("name: 'Gitlab', provider: 'https://gitlab.com'") &&
        createRepoDiv.innerHTML.includes("name: 'Bitbucket', provider: 'https://bitbucket.org'") &&
        createRepoDiv.innerHTML.includes('GitHub') &&
        createRepoDiv.innerHTML.includes('GitLab') &&
        createRepoDiv.innerHTML.includes('Bitbucket') &&
        lightIconSrc.includes('github-mark.png') &&
        darkIconSrc.includes('github-mark-white.png') &&
        webHref === 'https://github.com/octocat/Hello-World',
        'settings.js drawCreateRemoteRepoButtons, drawProviderIcon, and onThemeChanged dynamically render buttons and theme icons'
    );

    // Test 10: create_remote_repository.js provider dialog & credential functions
    const createRepoJsCode = fs.readFileSync(path.join(REPO_ROOT, 'create_remote_repository.js'), 'utf8');
    const domElements = {
        providerImage: { src: '' },
        accountName_label: { innerHTML: '' },
        token_label: { innerHTML: '' },
        token: { value: '' },
        matchedCurrentPos: { innerText: '' },
        matchedMax: { innerText: '' }
    };
    const titleTextNode = { nodeType: 3, textContent: 'Create Github repository' };
    const textareaNode = { nodeType: 1, type: 'textarea', placeholder: 'Enter Github token', childNodes: [] };
    const bodyElement = { nodeType: 1, childNodes: [titleTextNode, textareaNode] };

    let savedCred = null;
    let savedCredCalls = [];
    const createRepoSandbox = {
        console: { log: () => {}, warn: () => {}, err: () => {}, error: () => {} },
        URL: global.URL,
        setTimeout: () => {},
        clearTimeout: () => {},
        accountLookupTimer: null,
        runWhenPageLoaded: () => {},
        Node: { ELEMENT_NODE: 1, TEXT_NODE: 3, DOCUMENT_NODE: 9 },
        localState: {
            dark: false,
            gitCreateRemoteRepoWindow: {
                data: { name: 'Bitbucket', provider: 'https://bitbucket.org' }
            }
        },
        name: 'Bitbucket',
        provider: null,
        allCredentials: [
            { username: 'bbuser', password: 'bb_app_password', url: 'https://bitbucket.org/bbuser/existing-repo.git' },
            { username: 'x-token-auth', password: 'bb_oauth_token', url: 'https://bitbucket.org/bbuser/other-repo.git' }
        ],
        matchedRepoIndeces: [0, 1],
        displayedRepoIndex: 1,
        displayedRepoMax: 2,
        opener: {
            opener: {
                state: {
                    repos: [
                        { remoteURL: 'https://bbuser@bitbucket.org/bbuser/existing-repo.git', localFolder: '/tmp/existing' }
                    ]
                },
                gitProvider: async (url) => new GeneralApi(url),
                setCredential: async (url, username, password) => {
                    savedCred = { url, username, password };
                    savedCredCalls.push({ url, username, password });
                }
            }
        },
        document: {
            body: bodyElement,
            getElementById(id) { return domElements[id] || null; }
        }
    };
    vm.createContext(createRepoSandbox);
    vm.runInContext(extractFunction(createRepoJsCode, 'replaceInText'), createRepoSandbox);
    vm.runInContext(extractFunction(createRepoJsCode, 'runWhenDOMContentLoaded'), createRepoSandbox);
    vm.runInContext(extractFunction(createRepoJsCode, 'getIndecesToUniqueCredentials'), createRepoSandbox);
    vm.runInContext(extractFunction(createRepoJsCode, 'processAccountName'), createRepoSandbox);
    vm.runInContext(extractFunction(createRepoJsCode, 'updateCredentialsText'), createRepoSandbox);
    vm.runInContext(extractFunction(createRepoJsCode, 'rememberCredential'), createRepoSandbox);

    await createRepoSandbox.runWhenDOMContentLoaded();

    // Test credential display for App Password (index 1 -> 'bbuser:bb_app_password') and OAuth (index 2 -> 'bb_oauth_token')
    createRepoSandbox.updateCredentialsText();
    const displayedAppPass = domElements.token.value;
    createRepoSandbox.displayedRepoIndex = 2;
    createRepoSandbox.updateCredentialsText();
    const displayedOauth = domElements.token.value;

    // Test rememberCredential parsing 'bbuser:new_app_password' and saving account URL + new repo URL without overwriting other repos
    await createRepoSandbox.rememberCredential('https://bitbucket.org/bbuser/newrepo.git', 'bbuser', 'bbuser:new_app_password');

    // Test case-insensitive processAccountName lookup after rememberCredential updated credentials
    createRepoSandbox.processAccountName('BBUser', true);
    const updatedDisplayedToken = domElements.token.value;

    assert(
        titleTextNode.textContent === 'Create Bitbucket repository' &&
        textareaNode.placeholder === 'Enter Bitbucket token' &&
        domElements.providerImage.src.includes('bitbucket_blue.png') &&
        domElements.accountName_label.innerHTML.includes('Bitbucket workspace-name') &&
        domElements.token_label.innerHTML.includes('app-passwords') &&
        displayedAppPass === 'bbuser:bb_app_password' &&
        displayedOauth === 'bb_oauth_token' &&
        savedCred && savedCred.username === 'bbuser' && savedCred.password === 'new_app_password' &&
        savedCredCalls.some(c => c.url === 'https://bitbucket.org/bbuser' && c.password === 'new_app_password') &&
        savedCredCalls.some(c => c.url === 'https://bitbucket.org/bbuser/newrepo.git' && c.password === 'new_app_password') &&
        !savedCredCalls.some(c => c.url === 'https://bitbucket.org/bbuser/existing-repo.git') &&
        updatedDisplayedToken === 'bbuser:new_app_password',
        'create_remote_repository.js replaces Github placeholder, sets provider labels, and saves account & repo credentials without overwriting existing repos'
    );

    printSuiteResult();
}

runTests();
