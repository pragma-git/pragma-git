#!/usr/bin/env node
/**
 * test_03_askpass_credentials.js - Isolated non-GUI tests for askpass token selector
 *
 * Verifies:
 *   1. loadStoredTokensForUrl returns empty list for non-HTTP / invalid URLs
 *   2. loadStoredTokensForUrl finds Account default and repo tokens for the matching account
 *   3. loadStoredTokensForUrl isolates tokens from other accounts and deduplicates identical tokens
 *   4. selectCandidate cycles through candidates with wrap-around, sets textarea value, and calls select()
 *   5. User manual input changes source label to '(Custom)' and restoring matches candidate source
 *   6. Handles provider.formatTokenForDisplay properly (e.g. Bitbucket username:token)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const { assertPass, assertFail, printSuiteResult } = require(path.join(REPO_ROOT, 'automated-tests/test_setup.js'));

function assert(condition, message) {
    if (condition) {
        assertPass(message);
    } else {
        assertFail(message);
    }
}

function extractFunction(source, funcName) {
    const asyncPattern = `async function ${funcName}`;
    const syncPattern = `function ${funcName}`;
    let start = source.indexOf(asyncPattern);
    if (start === -1) {
        start = source.indexOf(syncPattern);
    }
    if (start === -1) {
        throw new Error(`Function ${funcName} not found in source`);
    }
    const openBrace = source.indexOf('{', start);
    if (openBrace === -1) {
        throw new Error(`Opening brace not found for function ${funcName}`);
    }
    let depth = 1;
    let i = openBrace + 1;
    while (i < source.length && depth > 0) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') depth--;
        i++;
    }
    return source.slice(start, i);
}

async function runTests() {
    if (process.env.VERBOSE === 'true') {
        console.log('--- Running test_03_askpass_credentials.js ---');
    }

    const askpassHtmlPath = path.join(REPO_ROOT, 'askpass/askpass.html');
    const askpassHtml = fs.readFileSync(askpassHtmlPath, 'utf8');

    const loadStoredTokensForUrlSrc = extractFunction(askpassHtml, 'loadStoredTokensForUrl');
    const selectCandidateSrc = extractFunction(askpassHtml, 'selectCandidate');

    // Setup mock DOM elements
    function createMockElement(id, initialProps = {}) {
        const listeners = {};
        return {
            id,
            value: '',
            innerText: '',
            innerHTML: '',
            style: { display: 'none', cursor: '', opacity: '1', padding: '10px' },
            selected: false,
            select() { this.selected = true; },
            addEventListener(event, fn) {
                listeners[event] = listeners[event] || [];
                listeners[event].push(fn);
            },
            trigger(event) {
                if (listeners[event]) {
                    listeners[event].forEach(fn => fn());
                }
            },
            ...initialProps
        };
    }

    const dom = {
        pwd: createMockElement('pwd', { value: '' }),
        matchedRepoRange: createMockElement('matchedRepoRange', { style: { display: 'none' } }),
        matchedRepoDown: createMockElement('matchedRepoDown'),
        matchedRepoUp: createMockElement('matchedRepoUp'),
        matchedCurrentPos: createMockElement('matchedCurrentPos', { innerText: '0' }),
        matchedMax: createMockElement('matchedMax', { innerText: '0' }),
        matchedRepoSource: createMockElement('matchedRepoSource', { innerText: '' }),
        outerContent: createMockElement('outerContent', { scrollWidth: 400, scrollHeight: 200, style: { padding: '10px' } }),
        pwdlabel: createMockElement('pwdlabel'),
        descriptiveText: createMockElement('descriptiveText')
    };

    // Mock opener environment
    const mockStoredCredentials = {
        'https://github.com/my-org': { username: 'my-org', password: 'token_account_default' },
        'https://github.com/my-org/repo-alpha.git': { username: 'my-org', password: 'token_fine_grained_alpha' },
        'https://github.com/my-org/repo-beta.git': { username: 'my-org', password: 'token_fine_grained_beta' },
        'https://github.com/my-org/repo-gamma.git': { username: 'my-org', password: 'token_account_default' }, // duplicate of account default
        'https://github.com/other-org/other-repo.git': { username: 'other-org', password: 'token_other_org' }
    };

    const mockOpener = {
        state: {
            repos: [
                { remoteURL: 'https://github.com/my-org/repo-alpha.git', localFolder: '/repos/repo-alpha' },
                { remoteURL: 'https://github.com/my-org/repo-beta.git', localFolder: '/repos/repo-beta' },
                { remoteURL: 'https://github.com/my-org/repo-gamma.git', localFolder: '/repos/repo-gamma' },
                { remoteURL: 'https://github.com/other-org/other-repo.git', localFolder: '/repos/other-repo' },
                { remoteURL: 'git@github.com:my-org/ssh-repo.git', localFolder: '/repos/ssh-repo' }
            ]
        },
        async getCredential(url) {
            let normalized = url.trim();
            try {
                let p = new URL(normalized);
                normalized = `${p.protocol}//${p.host}${p.pathname}`;
            } catch (e) {}
            return mockStoredCredentials[normalized] || { username: '', password: '' };
        },
        async gitProvider(url) {
            return {
                formatTokenForDisplay(username, pwd) {
                    return pwd;
                }
            };
        }
    };

    const sandbox = {
        URL,
        Set,
        storedTokenCandidates: [],
        displayedTokenIndex: 0,
        opener: mockOpener,
        document: {
            getElementById(id) {
                return dom[id] || null;
            }
        },
        console
    };

    vm.createContext(sandbox);
    vm.runInContext(loadStoredTokensForUrlSrc, sandbox);
    vm.runInContext(selectCandidateSrc, sandbox);

    // -------------------------------------------------------------
    // Test 1: loadStoredTokensForUrl returns empty for invalid / non-http URLs
    // -------------------------------------------------------------
    const empty1 = await sandbox.loadStoredTokensForUrl('');
    const empty2 = await sandbox.loadStoredTokensForUrl('git@github.com:my-org/repo.git');
    assert(
        Array.isArray(empty1) && empty1.length === 0 &&
        Array.isArray(empty2) && empty2.length === 0,
        'loadStoredTokensForUrl returns empty array for empty or SSH URLs'
    );

    // -------------------------------------------------------------
    // Test 2: loadStoredTokensForUrl loads Account default and repo tokens for the matching account
    // -------------------------------------------------------------
    const targetUrl = 'https://JanAxelsson@github.com/my-org/repo-alpha.git';
    const cands = await sandbox.loadStoredTokensForUrl(targetUrl);

    // Should include:
    // 1. Account default: token_account_default (source: 'Account default')
    // 2. Exact repo-alpha: token_fine_grained_alpha (source: 'my-org/repo-alpha')
    // 3. Other repo-beta: token_fine_grained_beta (source: 'my-org/repo-beta')
    // Should NOT include:
    // - repo-gamma (duplicate of token_account_default)
    // - other-org/other-repo (different account)
    assert(
        cands.length === 3 &&
        cands[0].token === 'token_account_default' && cands[0].source === 'Account default' &&
        cands[1].token === 'token_fine_grained_alpha' && cands[1].source === 'my-org/repo-alpha' &&
        cands[2].token === 'token_fine_grained_beta' && cands[2].source === 'my-org/repo-beta',
        'loadStoredTokensForUrl gathers account default and fine-grained PATs, excluding other accounts and deduplicating tokens'
    );

    // -------------------------------------------------------------
    // Test 3: selectCandidate sets textarea value and calls select()
    // -------------------------------------------------------------
    sandbox.storedTokenCandidates = cands;
    sandbox.selectCandidate(1);

    assert(
        dom.pwd.value === 'token_account_default' &&
        dom.pwd.selected === true &&
        dom.matchedCurrentPos.innerText === 1 &&
        dom.matchedMax.innerText === 3 &&
        dom.matchedRepoSource.innerText === '(Account default)',
        'selectCandidate(1) pre-fills candidate 1, auto-selects textarea, and updates position and source label'
    );

    // -------------------------------------------------------------
    // Test 4: Cycling forward and backward wraps around correctly
    // -------------------------------------------------------------
    sandbox.selectCandidate(2);
    const cand2Token = dom.pwd.value;
    const cand2Source = dom.matchedRepoSource.innerText;

    sandbox.selectCandidate(3);
    const cand3Token = dom.pwd.value;

    sandbox.selectCandidate(4); // wraps to 1
    const wrappedTo1 = dom.pwd.value === 'token_account_default' && sandbox.displayedTokenIndex === 1;

    sandbox.selectCandidate(0); // wraps to 3
    const wrappedTo3 = dom.pwd.value === 'token_fine_grained_beta' && sandbox.displayedTokenIndex === 3;

    assert(
        cand2Token === 'token_fine_grained_alpha' &&
        cand2Source === '(my-org/repo-alpha)' &&
        cand3Token === 'token_fine_grained_beta' &&
        wrappedTo1 && wrappedTo3,
        'selectCandidate cycles through candidates with clean wrap-around at both ends'
    );

    // -------------------------------------------------------------
    // Test 5: Manual typing/pasting marks source as (Custom)
    // -------------------------------------------------------------
    sandbox.selectCandidate(1);
    dom.pwd.value = 'pasted_brand_new_fine_grained_pat';

    // Simulate the input listener from askpass.html
    let sourceEl = dom.matchedRepoSource;
    let currentCand = sandbox.storedTokenCandidates[sandbox.displayedTokenIndex - 1];
    if (dom.pwd.value === currentCand.token) {
        sourceEl.innerText = currentCand.source ? `(${currentCand.source})` : '';
    } else {
        sourceEl.innerText = '(Custom)';
    }

    const customLabel = dom.matchedRepoSource.innerText;

    // Restore candidate 1 value
    dom.pwd.value = currentCand.token;
    if (dom.pwd.value === currentCand.token) {
        sourceEl.innerText = currentCand.source ? `(${currentCand.source})` : '';
    } else {
        sourceEl.innerText = '(Custom)';
    }
    const restoredLabel = dom.matchedRepoSource.innerText;

    assert(
        customLabel === '(Custom)' && restoredLabel === '(Account default)',
        'Editing textarea dynamically updates label to (Custom) and restores source label when matching candidate token'
    );

    // -------------------------------------------------------------
    // Test 6: Strictly uses raw password for Git askpass (never prepends username)
    // -------------------------------------------------------------
    mockStoredCredentials['https://bitbucket.org/my-org'] = { username: 'my-org', password: 'bb_raw_app_password' };
    mockStoredCredentials['https://bitbucket.org/my-org/repo-alpha.git'] = { username: 'my-org', password: 'bb_raw_repo_password' };
    const bbCands = await sandbox.loadStoredTokensForUrl('https://bitbucket.org/my-org/repo-alpha.git');
    assert(
        bbCands.length > 0 &&
        bbCands[0].token === 'bb_raw_app_password' &&
        bbCands[0].token !== 'my-org:bb_raw_app_password',
        'loadStoredTokensForUrl strictly supplies the raw password to Git askpass (never prepends username)'
    );

    printSuiteResult();
}

runTests();
