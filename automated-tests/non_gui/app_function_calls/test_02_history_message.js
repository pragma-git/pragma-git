#!/usr/bin/env node
/**
 * test_02_history_message.js - Test commit history message formatting from app.js
 *
 * Verifies:
 *   1. formatHistoryMessage parses ISO dates (e.g. '2020-07-01T09:15:21+02:00' -> '09:15 (2020-07-01)')
 *   2. formatHistoryMessage formats commit message subjects and multi-line bodies
 *   3. formatHistoryMessage handles empty bodies cleanly
 *   4. formatHistoryMessage preserves multi-paragraph descriptions
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
    return appCode.slice(start, end);
}

const sandbox = {
    os
};

const fnCode = extractFunction('formatHistoryMessage');
vm.runInNewContext(fnCode, sandbox);

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        if (process.env.VERBOSE === 'true') {
            console.log(`  PASS: ${message}`);
        }
    } else {
        failed++;
        console.error(`  FAIL: ${message}`);
    }
}

function runTests() {
    if (process.env.VERBOSE === 'true') {
        console.log('--- Running test_02_history_message.js ---');
    }

    const isoDate = '2026-10-21T14:30:45+02:00';
    const subject = 'feat: add automated non-gui test runners';
    const body = 'Detailed commit body explaining the modular architecture\nand subfolder structure.';

    // Test 1: Date formatting
    const formatted = sandbox.formatHistoryMessage(isoDate, subject, body);
    assert(formatted.startsWith('14:30 (2026-10-21)'), 'formatHistoryMessage extracts time and date in HH:MM (YYYY-MM-DD) format');

    // Test 2: Subject and body inclusion
    const expectedSeparator = os.EOL + os.EOL;
    const hasSubject = formatted.includes(expectedSeparator + subject + expectedSeparator);
    const hasBody = formatted.endsWith(expectedSeparator + body);
    assert(hasSubject && hasBody, 'formatHistoryMessage combines date, subject, and body with OS line separators');

    // Test 3: Empty body handling
    const formattedNoBody = sandbox.formatHistoryMessage('2025-01-15T08:05:00Z', 'Fix typo', '');
    assert(
        formattedNoBody.startsWith('08:05 (2025-01-15)') && formattedNoBody.includes('Fix typo'),
        'formatHistoryMessage formats commits with empty bodies cleanly'
    );

    // Test 4: Multi-paragraph body preservation
    const multiParagraphBody = 'Paragraph 1.\n\nParagraph 2.\n- item 1\n- item 2';
    const formattedMulti = sandbox.formatHistoryMessage('2024-06-10T18:00:00+00:00', 'Update docs', multiParagraphBody);
    assert(formattedMulti.includes(multiParagraphBody), 'formatHistoryMessage preserves multi-paragraph bodies');

    if (process.env.VERBOSE === 'true') {
        console.log(`Summary: ${passed}/${passed + failed} passed`);
    } else {
        console.log(`PASSED ${passed}/${passed + failed}`);
    }

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
