#!/usr/bin/env node
/**
 * test_06_ssh_file_browser_editor_awareness.js - SSH File Browser built-in editor awareness tests
 *
 * Verifies:
 *   1. isBuiltInPragmaEditor() distinguishes built-in pragma-merge from external editors
 *   2. Built-in editor files do not spawn redundant chokidar watchers and do not trigger close warnings
 *   3. Closing the built-in pragma-merge window automatically removes the file from openFilesMap
 *   4. External editor files still spawn watchers, trigger closeWarningDialog, and are the only files listed
 *   5. Re-opening SSH File Browser re-attaches to still-open built-in pragma-merge windows for that repo
 *   6. stripSshTempPrefix() in merge/pragma-merge.js handles both Unix paths and Windows backslash paths
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const appCode = fs.readFileSync(path.join(REPO_ROOT, 'app.js'), 'utf8');
const browserCode = fs.readFileSync(path.join(REPO_ROOT, 'sshFileBrowser.js'), 'utf8');
const mergeCode = fs.readFileSync(path.join(REPO_ROOT, 'merge', 'pragma-merge.js'), 'utf8');

function extractFunction(source, name) {
    const match = source.match(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{'));
    if (!match) throw new Error('Could not find function ' + name);
    const start = match.index;
    const bodyOpenIdx = start + match[0].length - 1;
    let openBraces = 0;
    let end = bodyOpenIdx;
    for (let i = bodyOpenIdx; i < source.length; i++) {
        if (source[i] === '{') {
            openBraces++;
        } else if (source[i] === '}') {
            openBraces--;
            if (openBraces === 0) {
                end = i + 1;
                break;
            }
        }
    }
    return source.slice(start, end);
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  [PASS] ${message}`);
        passed++;
    } else {
        console.error(`  [FAIL] ${message}`);
        failed++;
    }
}

async function main() {
    const mockState = {
        tools: { editor: 'pragma-merge' },
        pragmaMerge: {},
        repos: [{ localFolder: 'ssh://jan@example.com/home/jan/myrepo' }],
        repoNumber: 0
    };

    let chokidarWatches = 0;
    let spawnedMergeWins = [];

    const mockGui = {
        Window: {
            get: () => ({ focus: () => {}, close: () => {} }),
            open: (url, opts, cb) => {
                const listeners = {};
                const fakeWin = {
                    url,
                    width: 1200,
                    height: 850,
                    window: { closed: false },
                    focus: () => {},
                    removeAllListeners: (evt) => { delete listeners[evt]; },
                    close: () => { fakeWin.window.closed = true; },
                    on: (evt, fn) => { listeners[evt] = fn; },
                    triggerLoaded: () => { if (listeners.loaded) listeners.loaded(); },
                    triggerClose: () => {
                        fakeWin.window.closed = true;
                        if (listeners.close) listeners.close();
                    }
                };
                spawnedMergeWins.push(fakeWin);
                cb(fakeWin);
                fakeWin.triggerLoaded();
            }
        },
        Shell: { openItem: () => {} }
    };

    // 1. Setup app.js openPragmaMergeDirect sandbox
    const appSandbox = {
        console,
        path,
        gui: mockGui,
        state: mockState,
        global: { state: mockState },
        window: { screen: { availWidth: 1920, availHeight: 1080 } },
        merge_win: undefined,
        pragmaMergeOpenWindows: new Map(),
        pragmaMergeOpenMeta: new Map(),
        pragmaMergeCloseCallbacks: new Map(),
        saveSettings: () => {},
        updateWindowMenu: () => {},
        showWindow: () => {},
        fixNwjsBug7973: (w) => { w.removeAllListeners('close'); w.close(true); }
    };

    const appEval = [
        extractFunction(appCode, 'getSensibleWindowSize'),
        extractFunction(appCode, 'getSensibleMergeWindowSize'),
        extractFunction(appCode, 'updatePragmaMergeWindowSize'),
        extractFunction(appCode, 'registerPragmaMergeCloseCallback'),
        extractFunction(appCode, 'getOpenPragmaMergeFilesForRepo'),
        extractFunction(appCode, 'openPragmaMergeDirect')
    ].join('\n');
    vm.runInNewContext(appEval, appSandbox);

    // 2. Setup sshFileBrowser.js sandbox
    const warningListItems = [];
    const closeWarningDialog = {
        open: false,
        showModal() { this.open = true; },
        close() { this.open = false; }
    };
    let browserWinClosed = false;

    const browserSandbox = {
        console,
        path,
        fs: {
            existsSync: () => true,
            readFileSync: () => Buffer.from('hello\n', 'utf8')
        },
        chokidar: {
            watch: () => {
                chokidarWatches++;
                return {
                    on: () => {},
                    close: () => {}
                };
            }
        },
        exec: () => ({ unref: () => {} }),
        process: { platform: process.platform },
        global: {
            state: mockState,
            openPragmaMergeDirect: appSandbox.openPragmaMergeDirect,
            getOpenPragmaMergeFilesForRepo: appSandbox.getOpenPragmaMergeFilesForRepo,
            registerPragmaMergeCloseCallback: appSandbox.registerPragmaMergeCloseCallback
        },
        state: mockState,
        SSH_TEMP_FILE_LOCATION: '/tmp/pragma-git-ssh-folders',
        repoSshUrl: 'ssh://jan@example.com/home/jan/myrepo',
        openFilesMap: new Map(),
        pendingAfterCloseCallback: null,
        forceClosing: false,
        win: {
            focus: () => {},
            close: () => { browserWinClosed = true; }
        },
        MAIN: {
            openPragmaMergeDirect: appSandbox.openPragmaMergeDirect,
            getOpenPragmaMergeFilesForRepo: appSandbox.getOpenPragmaMergeFilesForRepo,
            registerPragmaMergeCloseCallback: appSandbox.registerPragmaMergeCloseCallback,
            onSshFileBrowserClosed: () => {},
            fixNwjsBug7973: (w) => { w.close(true); },
            pragmaLog: () => {}
        },
        sshGet: async (repoUrl, relPath) => `/tmp/pragma-git-ssh-folders/${relPath}`,
        document: {
            getElementById: (id) => {
                if (id === 'closeWarningDialog') return closeWarningDialog;
                if (id === 'closeWarningFileList') {
                    return {
                        set innerHTML(v) { warningListItems.length = 0; },
                        appendChild(li) { warningListItems.push(li.textContent); }
                    };
                }
                return null;
            },
            createElement: () => ({ style: {}, textContent: '' })
        },
        renderDirectoryTable: () => {},
        renderOpenFilesList: () => {},
        showBrowserAlert: () => {}
    };

    const browserEval = [
        extractFunction(browserCode, 'formatTime'),
        extractFunction(browserCode, 'isBuiltInPragmaEditor'),
        extractFunction(browserCode, 'getConfiguredEditorLabel'),
        extractFunction(browserCode, 'updateEditorHeaderInfo'),
        extractFunction(browserCode, 'deriveRelativePathFromTempPath'),
        extractFunction(browserCode, 'syncExistingBuiltInEditorWindows'),
        extractFunction(browserCode, 'openRemoteFile'),
        extractFunction(browserCode, 'startWatchingFile'),
        extractFunction(browserCode, 'launchEditorForFile'),
        extractFunction(browserCode, 'stopWatchingFile'),
        extractFunction(browserCode, 'stopAllWatchers'),
        extractFunction(browserCode, 'getExternalWatchedEntries'),
        extractFunction(browserCode, 'hasOpenWatchedFiles'),
        extractFunction(browserCode, 'updateCloseWarningDialogList'),
        extractFunction(browserCode, 'requestCloseWithWarning')
    ].join('\n');
    vm.runInNewContext(browserEval, browserSandbox);

    // Test 1: Built-in editor detection
    mockState.tools.editor = '';
    const emptyIsBuiltIn = browserSandbox.isBuiltInPragmaEditor();
    mockState.tools.editor = 'pragma-merge';
    const mergeIsBuiltIn = browserSandbox.isBuiltInPragmaEditor();
    mockState.tools.editor = 'Pragma-Git';
    const gitIsBuiltIn = browserSandbox.isBuiltInPragmaEditor();
    mockState.tools.editor = 'code';
    const codeIsBuiltIn = browserSandbox.isBuiltInPragmaEditor();
    assert(emptyIsBuiltIn && mergeIsBuiltIn && gitIsBuiltIn && !codeIsBuiltIn,
        'isBuiltInPragmaEditor() identifies "", "pragma-merge", and "pragma-git" as built-in, and external tools as non-built-in');

    // Test 2: Opening a remote file in built-in pragma-merge editor
    mockState.tools.editor = 'pragma-merge';
    await browserSandbox.openRemoteFile('src/main.js');
    const mainEntry = browserSandbox.openFilesMap.get('src/main.js');
    assert(Boolean(mainEntry && mainEntry.isBuiltInEditor === true && mainEntry.watcher === null && chokidarWatches === 0),
        'Opening remote file in built-in editor tracks it without spawning a redundant chokidar watcher');

    assert(browserSandbox.hasOpenWatchedFiles() === false,
        'hasOpenWatchedFiles() is false when only built-in pragma-merge editor files are open');

    // Test 3: Closing SSH File Browser while built-in editor is STILL open does NOT warn
    browserSandbox.forceClosing = false;
    closeWarningDialog.open = false;
    browserWinClosed = false;
    let afterCloseRan = false;
    const closedWithoutWarn = browserSandbox.requestCloseWithWarning(() => { afterCloseRan = true; });
    assert(closedWithoutWarn === true && closeWarningDialog.open === false && browserWinClosed === true && afterCloseRan === true,
        'Closing SSH File Browser while built-in pragma-merge window is open succeeds immediately without sync warning');

    // Test 4: Re-opening SSH File Browser re-syncs with still-open pragma-merge window, and closing pragma-merge removes it
    browserSandbox.forceClosing = false;
    browserWinClosed = false;
    browserSandbox.syncExistingBuiltInEditorWindows();
    assert(browserSandbox.openFilesMap.has('src/main.js') && browserSandbox.hasOpenWatchedFiles() === false,
        'syncExistingBuiltInEditorWindows() restores open badge/entry when SSH File Browser re-opens while pragma-merge is still open');

    spawnedMergeWins[0].triggerClose();
    assert(!browserSandbox.openFilesMap.has('src/main.js') && browserSandbox.openFilesMap.size === 0,
        'Closing the pragma-merge editor window automatically removes the file from SSH File Browser openFilesMap');

    // Test 5: External editor STILL triggers closeWarningDialog, and mixed session lists ONLY external files
    mockState.tools.editor = 'pragma-merge';
    await browserSandbox.openRemoteFile('docs/readme.md');
    mockState.tools.editor = 'code';
    await browserSandbox.openRemoteFile('src/external.js');

    assert(chokidarWatches === 1 && browserSandbox.hasOpenWatchedFiles() === true,
        'External editor file creates a chokidar watcher and marks hasOpenWatchedFiles() true');

    closeWarningDialog.open = false;
    const blockedClose = browserSandbox.requestCloseWithWarning();
    assert(blockedClose === false && closeWarningDialog.open === true &&
           warningListItems.length === 1 && warningListItems[0].startsWith('src/external.js'),
        'requestCloseWithWarning() blocks close, opens warning dialog, and lists only external-editor files');

    // Test 6: stripSshTempPrefix() in merge/pragma-merge.js handles Windows backslashes and Unix paths
    const fnStrip = extractFunction(mergeCode, 'stripSshTempPrefix');
    const winSandbox = {
        process: { platform: 'win32' },
        SSH_TEMP_FILE_LOCATION: 'C:\\Users\\jan.axelsson\\AppData\\Local\\Temp\\pragma-git-ssh-folders'
    };
    vm.runInNewContext(fnStrip, winSandbox);
    const strippedWin = winSandbox.stripSshTempPrefix('C:\\Users\\jan.axelsson\\AppData\\Local\\Temp\\pragma-git-ssh-folders\\imlook4d\\generateTACT.m');
    const strippedWinLowerDrive = winSandbox.stripSshTempPrefix('c:\\Users\\jan.axelsson\\AppData\\Local\\Temp\\pragma-git-ssh-folders\\nested dir\\notes.txt');

    const unixSandbox = {
        process: { platform: 'darwin' },
        SSH_TEMP_FILE_LOCATION: '/tmp/pragma-git-ssh-folders'
    };
    vm.runInNewContext(fnStrip, unixSandbox);
    const strippedUnix = unixSandbox.stripSshTempPrefix('/tmp/pragma-git-ssh-folders/imlook4d/generateTACT.m');

    assert(strippedWin === 'imlook4d/generateTACT.m' &&
           strippedWinLowerDrive === 'nested dir/notes.txt' &&
           strippedUnix === 'imlook4d/generateTACT.m',
        'stripSshTempPrefix() cleanly extracts relative remote paths on both Windows (backslashes/drive case) and Unix');

    console.log(`Suite Result: ${passed}/${passed + failed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
