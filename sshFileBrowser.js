//
// Remote SSH File Browser (sshFileBrowser.js)
// Allows browsing directories on a remote SSH repository, creating new files/folders,
// opening files in a designated editor via local temp files (sshGet), and automatically
// syncing saved changes back to the remote SSH server (sshPut) via chokidar.
//

var gui = require('nw.gui');
var fs = require('fs');
var path = require('path');
var chokidar = require('chokidar');
const { exec } = require('child_process');

var state = global.state;
var localState = global.localState;

var win = null;
var MAIN = null;

var repoSshUrl = '';
var repoName = '';
var currentSubPath = '';
var currentEntries = [];

// Map of relativePath -> { relativePath, localTempPath, watcher, status, statusClass, lastSyncedBuffer, syncing, pendingSync }
var openFilesMap = new Map();
var pendingAfterCloseCallback = null;
var forceClosing = false;

function formatTime(date) {
    let hh = String(date.getHours()).padStart(2, '0');
    let mm = String(date.getMinutes()).padStart(2, '0');
    let ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

function getConfiguredEditorLabel() {
    let ed = (global.state && global.state.tools && global.state.tools.editor) ? global.state.tools.editor.trim() : '';
    if (!ed) return 'pragma-merge';
    return ed;
}

function updateEditorHeaderInfo() {
    let el = document.getElementById('editorInfoSpan');
    if (el) {
        el.textContent = `Editor: ${getConfiguredEditorLabel()}`;
    }
}

async function initSshFileBrowser() {
    win = gui.Window.get();
    MAIN = (global.windows && global.windows['main_win']) || (typeof opener !== 'undefined' ? opener : window);

    // Resolve target SSH repository URL
    let params = new URLSearchParams(window.location.search);
    if (params.get('repo')) {
        repoSshUrl = decodeURIComponent(params.get('repo'));
    } else if (window.repoSshUrl) {
        repoSshUrl = window.repoSshUrl;
    } else if (global.sshFileBrowserTarget) {
        repoSshUrl = global.sshFileBrowserTarget;
    } else if (global.state && global.state.repos && global.state.repos[global.state.repoNumber]) {
        repoSshUrl = global.state.repos[global.state.repoNumber].localFolder;
    }

    repoSshUrl = (repoSshUrl || '').replace(/\/+$/, '');
    repoName = path.basename(repoSshUrl) || repoSshUrl;

    document.title = `SSH Server Files - ${repoName}`;
    let nameEl = document.getElementById('repoNameSpan');
    if (nameEl) nameEl.textContent = repoName;
    let urlEl = document.getElementById('repoSshUrlSpan');
    if (urlEl) urlEl.textContent = repoSshUrl;

    updateEditorHeaderInfo();

    // Keyboard shortcuts for dialogs
    let newFileInp = document.getElementById('newFileNameInput');
    if (newFileInp) {
        newFileInp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmCreateNewFile();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                document.getElementById('newFileDialog').close();
            }
        });
    }

    let newFolderInp = document.getElementById('newFolderNameInput');
    if (newFolderInp) {
        newFolderInp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmCreateNewFolder();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                document.getElementById('newFolderDialog').close();
            }
        });
    }

    window.addEventListener('resize', () => {
        renderBreadcrumbs();
    });

    // Keyboard shortcuts (Cmd+R on macOS, Ctrl+R on Windows/Linux) to refresh directory
    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && (e.key === 'r' || e.key === 'R' || e.keyCode === 82)) {
            e.preventDefault();
            refreshCurrentDirectory();
        }
    });

    renderOpenFilesList();
    await loadDirectory('');
}

function buildBreadcrumbNode(item) {
    let span = document.createElement('span');
    if (item.isEllipsis) {
        span.className = 'breadcrumb-ellipsis';
        span.textContent = '...';
        if (item.title) span.title = item.title;
        return span;
    }
    span.className = 'breadcrumb-segment' + (item.isLast ? ' active' : '');
    span.textContent = item.label;
    if (!item.isLast) {
        span.onclick = () => loadDirectory(item.targetPath);
    }
    return span;
}

function populateBreadcrumbElements(container, items) {
    container.innerHTML = '';
    for (let i = 0; i < items.length; i++) {
        if (i > 0) {
            let sep = document.createElement('span');
            sep.className = 'breadcrumb-sep';
            sep.textContent = '/';
            container.appendChild(sep);
        }
        container.appendChild(buildBreadcrumbNode(items[i]));
    }
}

function renderBreadcrumbs() {
    let trail = document.getElementById('breadcrumbTrail');
    let upBtn = document.getElementById('upFolderBtn');
    if (!trail) return;

    let parts = currentSubPath ? currentSubPath.split('/').filter(Boolean) : [];
    if (upBtn) {
        upBtn.disabled = (parts.length === 0);
    }

    let fullFullPathTitle = currentSubPath ? `${repoName}/${currentSubPath}` : repoName;
    trail.title = fullFullPathTitle;

    // Build full list of segment objects: [HOME, seg1, seg2, ..., lastSeg]
    let segments = [
        {
            label: `🏠 ${repoName}`,
            targetPath: '',
            isLast: parts.length === 0
        }
    ];

    let accumulated = '';
    for (let i = 0; i < parts.length; i++) {
        accumulated = accumulated ? `${accumulated}/${parts[i]}` : parts[i];
        segments.push({
            label: parts[i],
            targetPath: accumulated,
            isLast: i === parts.length - 1
        });
    }

    // 1. Try full path: HOME / seg1 / seg2 / ... / lastSeg
    populateBreadcrumbElements(trail, segments);
    if (parts.length === 0 || trail.clientWidth === 0 || trail.scrollWidth <= trail.clientWidth) {
        return;
    }

    // 2. Progressive truncation keeping HOME + ... + as many trailing segments as fit (ensuring last is visible)
    let ellipsisItem = { isEllipsis: true, title: fullFullPathTitle };
    for (let startIdx = 2; startIdx <= segments.length - 1; startIdx++) {
        let candidate = [segments[0], ellipsisItem, ...segments.slice(startIdx)];
        populateBreadcrumbElements(trail, candidate);
        if (trail.scrollWidth <= trail.clientWidth) {
            return;
        }
    }

    // 3. Fallback when even HOME / ... / lastSeg is too wide: write "... / lastSeg"
    let minimalCandidate = [ellipsisItem, segments[segments.length - 1]];
    populateBreadcrumbElements(trail, minimalCandidate);
}

async function loadDirectory(subPath) {
    let cleanSub = (subPath || '').replace(/^\/+|\/+$/g, '');
    currentSubPath = cleanSub;
    renderBreadcrumbs();
    updateEditorHeaderInfo();

    let tbody = document.getElementById('fileTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="2" class="empty-msg">Loading remote directory...</td></tr>';
    }

    try {
        let entries = await sshLs(repoSshUrl, currentSubPath);
        currentEntries = entries || [];
        renderDirectoryTable();
    } catch (err) {
        console.error('Failed listing remote directory:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="2" class="empty-msg" style="color: var(--red-text);">Failed to load directory: ${escapeHtml(err.message || String(err))}</td></tr>`;
        }
    }
}

function renderDirectoryTable() {
    let tbody = document.getElementById('fileTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Parent directory '..' row when inside a subfolder
    if (currentSubPath !== '') {
        let upRow = tbody.insertRow();
        upRow.className = 'entry-row';
        upRow.title = 'Double-click to go to parent folder';
        upRow.ondblclick = () => navigateUp();

        let nameCell = upRow.insertCell();
        nameCell.innerHTML = `<span class="entry-icon"><img class="folder-img-icon" src="images/folder.png" alt="folder" /></span><span class="folder-name">..</span>`;

        let actionCell = upRow.insertCell();
        actionCell.className = 'action-col';
        let upLink = document.createElement('a');
        upLink.className = 'linkLike';
        upLink.textContent = '(up)';
        upLink.onclick = (e) => {
            e.stopPropagation();
            navigateUp();
        };
        actionCell.appendChild(upLink);
    }

    if (currentEntries.length === 0) {
        let emptyRow = tbody.insertRow();
        let cell = emptyRow.insertCell();
        cell.colSpan = 2;
        cell.className = 'empty-msg';
        cell.textContent = '(This folder is empty)';
        return;
    }

    for (let entry of currentEntries) {
        let row = tbody.insertRow();
        row.className = 'entry-row';

        let nameCell = row.insertCell();
        let actionCell = row.insertCell();
        actionCell.className = 'action-col';

        if (entry.isDirectory) {
            row.title = `Double-click to open folder "${entry.name}"`;
            row.ondblclick = () => loadDirectory(entry.relativePath);

            nameCell.innerHTML = `<span class="entry-icon"><img class="folder-img-icon" src="images/folder.png" alt="folder" /></span><span class="folder-name">${escapeHtml(entry.name)}/</span>`;

            let openLink = document.createElement('a');
            openLink.className = 'linkLike';
            openLink.textContent = '(open)';
            openLink.onclick = (e) => {
                e.stopPropagation();
                loadDirectory(entry.relativePath);
            };
            actionCell.appendChild(openLink);
        } else {
            row.title = `Double-click to edit "${entry.name}"`;
            row.ondblclick = () => openRemoteFile(entry.relativePath);

            let isWatched = openFilesMap.has(entry.relativePath);
            let badgeHtml = isWatched ? `<span class="open-badge">open</span>` : '';
            let fileIconSvg = `<svg class="file-svg-icon" viewBox="0 0 13 18" fill="none" xmlns="http://www.w3.org/2000/svg">`
                + `<path d="M1.5 1.5H8L11.5 5V16.5H1.5V1.5Z" fill="white" stroke="white" stroke-width="1.3" stroke-linejoin="round"/>`
                + `<path d="M8 1.5V5H11.5" fill="none" stroke="#222" stroke-width="1" stroke-linejoin="round"/>`
                + `</svg>`;
            nameCell.innerHTML = `<span class="entry-icon">${fileIconSvg}</span><span>${escapeHtml(entry.name)}</span>${badgeHtml}`;

            let editLink = document.createElement('a');
            editLink.className = 'linkLike';
            editLink.textContent = '(edit)';
            editLink.onclick = (e) => {
                e.stopPropagation();
                openRemoteFile(entry.relativePath);
            };
            actionCell.appendChild(editLink);
        }
    }
}

function navigateUp() {
    if (!currentSubPath) return;
    let parts = currentSubPath.split('/').filter(Boolean);
    parts.pop();
    loadDirectory(parts.join('/'));
}

async function refreshCurrentDirectory() {
    await loadDirectory(currentSubPath);
}

async function openRemoteFile(relativePath) {
    if (!relativePath) return;

    // If already open and watched in this session, focus/re-launch editor on the watched temp file
    if (openFilesMap.has(relativePath)) {
        await focusOrReopenFile(relativePath);
        return;
    }

    try {
        let localTempPath = await sshGet(repoSshUrl, relativePath);
        startWatchingFile(relativePath, localTempPath);
        renderDirectoryTable();
        renderOpenFilesList();
        await launchEditorForFile(localTempPath, relativePath);
    } catch (err) {
        console.error('Failed to open remote file:', err);
        showBrowserAlert('Failed to open remote file', `Could not download "${relativePath}" from server:\n${err.message || err}`);
    }
}

function startWatchingFile(relativePath, localTempPath) {
    // Clean up any existing watcher for this path
    if (openFilesMap.has(relativePath)) {
        let prev = openFilesMap.get(relativePath);
        if (prev && prev.watcher) {
            try { prev.watcher.close(); } catch (e) {}
        }
    }

    let initialBuffer = null;
    try {
        if (fs.existsSync(localTempPath)) {
            initialBuffer = fs.readFileSync(localTempPath);
        }
    } catch (e) {}

    let watcher = chokidar.watch(localTempPath, {
        persistent: true,
        ignoreInitial: true,
        usePolling: true,
        interval: 250,
        awaitWriteFinish: {
            stabilityThreshold: 200,
            pollInterval: 100
        }
    });

    watcher.on('change', () => onWatchedFileModified(relativePath));
    watcher.on('add', () => onWatchedFileModified(relativePath));

    openFilesMap.set(relativePath, {
        relativePath: relativePath,
        localTempPath: localTempPath,
        watcher: watcher,
        status: `Opened ${formatTime(new Date())}`,
        statusClass: '',
        lastSyncedBuffer: initialBuffer,
        syncing: false,
        pendingSync: false
    });
}

async function onWatchedFileModified(relativePath) {
    let item = openFilesMap.get(relativePath);
    if (!item) return;

    if (!fs.existsSync(item.localTempPath)) {
        return;
    }

    let currentBuffer = null;
    try {
        currentBuffer = fs.readFileSync(item.localTempPath);
    } catch (e) {
        return;
    }

    // Skip if file bytes are identical to last synced state
    if (item.lastSyncedBuffer && currentBuffer && currentBuffer.equals(item.lastSyncedBuffer)) {
        return;
    }

    if (item.syncing) {
        item.pendingSync = true;
        return;
    }

    item.syncing = true;
    item.status = 'Syncing to server...';
    item.statusClass = 'sync-pending';
    renderOpenFilesList();
    updateCloseWarningDialogList();

    try {
        await sshPut(repoSshUrl, relativePath);
        item.lastSyncedBuffer = currentBuffer;
        item.status = `✓ Synced ${formatTime(new Date())}`;
        item.statusClass = 'sync-ok';

        if (MAIN && typeof MAIN.pragmaLog === 'function') {
            MAIN.pragmaLog(`SSH File Browser: synced "${relativePath}" to "${repoSshUrl}"`);
        }

        // Trigger Git status update in main window and Modified Files window if open
        if (MAIN && typeof MAIN._update === 'function') {
            MAIN._update();
        }
        if (MAIN && typeof MAIN.updateChangedListWindow === 'function') {
            MAIN.updateChangedListWindow();
        }
    } catch (err) {
        console.error(`Failed syncing "${relativePath}" to server:`, err);
        item.status = `✗ Sync failed (${formatTime(new Date())})`;
        item.statusClass = 'sync-err';
    } finally {
        item.syncing = false;
        renderOpenFilesList();
        updateCloseWarningDialogList();

        if (item.pendingSync) {
            item.pendingSync = false;
            onWatchedFileModified(relativePath);
        }
    }
}

async function focusOrReopenFile(relativePath) {
    let item = openFilesMap.get(relativePath);
    if (!item) return;

    // Ensure local temp file still exists; if deleted externally, re-fetch from server
    if (!fs.existsSync(item.localTempPath)) {
        try {
            item.localTempPath = await sshGet(repoSshUrl, relativePath);
        } catch (err) {
            showBrowserAlert('File Missing', `Could not restore "${relativePath}":\n${err.message || err}`);
            return;
        }
    }

    await launchEditorForFile(item.localTempPath, relativePath);
}

async function launchEditorForFile(localTempPath, relativePath) {
    updateEditorHeaderInfo();
    let editorSetting = (global.state && global.state.tools && global.state.tools.editor)
        ? global.state.tools.editor.trim()
        : '';

    let lowerEditor = editorSetting.toLowerCase();

    // 1. Built-in Pragma-merge editor (when empty, "pragma-merge", or "pragma-git")
    if (lowerEditor === '' || lowerEditor === 'pragma-merge' || lowerEditor === 'pragma-git') {
        if (MAIN && typeof MAIN.openPragmaMergeDirect === 'function') {
            MAIN.openPragmaMergeDirect(localTempPath, '--rw', { root: repoSshUrl });
            return;
        }

        // Fallback to bash script if main window helper not reachable
        let cwdInit = (MAIN && MAIN.CWD_INIT) ? MAIN.CWD_INIT : global.CWD_INIT;
        let command = '';
        if (process.platform === 'win32') {
            let pragmaMerge = `${cwdInit}/pragma-merge`;
            command = `"%PROGRAMFILES%\\Git\\bin\\sh.exe" -c "'${pragmaMerge}' '${localTempPath}' --edit --rw"`;
        } else {
            command = `"${cwdInit}${path.sep}pragma-merge" "${localTempPath}" --edit --rw`;
        }

        exec(command, (error) => {
            if (error && MAIN && typeof MAIN.pragmaLog === 'function') {
                MAIN.pragmaLog(`Error starting pragma-merge from SSH File Browser: ${error}`);
            }
        });
        return;
    }

    // 2. OS system default editor ("system")
    if (lowerEditor === 'system') {
        gui.Shell.openItem(path.resolve(localTempPath));
        return;
    }

    // 3. Custom designated editor from settings.json
    let fileDir = path.dirname(path.resolve(localTempPath));
    let targetFile = (process.platform === 'win32') ? path.normalize(localTempPath) : localTempPath;

    // Check if editorSetting is a CLI command in PATH
    try {
        if (MAIN && typeof MAIN.multiPlatformExecSync === 'function') {
            await MAIN.multiPlatformExecSync(fileDir, `which "${editorSetting}"`);
            if (process.platform === 'win32') {
                exec(`"%PROGRAMFILES%\\Git\\bin\\sh.exe" -c "\\"${editorSetting}\\" \\"${targetFile}\\""`, { cwd: fileDir }).unref();
            } else {
                exec(`"${editorSetting}" "${targetFile}"`, { cwd: fileDir }).unref();
            }
            return;
        }
    } catch (e) {
        // Not a direct binary in PATH; fall through to OS application launch
    }

    if (process.platform === 'darwin') {
        exec(`open -a "${editorSetting}" "${targetFile}"`, { cwd: fileDir }).unref();
    } else if (process.platform === 'win32') {
        exec(`start "" "${editorSetting}" "${targetFile}"`, { cwd: fileDir }).unref();
    } else {
        exec(`"${editorSetting}" "${targetFile}"`, { cwd: fileDir }).unref();
    }
}

function stopWatchingFile(relativePath) {
    let item = openFilesMap.get(relativePath);
    if (item) {
        if (item.watcher) {
            try { item.watcher.close(); } catch (e) {}
        }
        openFilesMap.delete(relativePath);
    }
    renderDirectoryTable();
    renderOpenFilesList();
    updateCloseWarningDialogList();
}

function renderOpenFilesList() {
    let tbody = document.getElementById('openFilesTableBody');
    let countSpan = document.getElementById('openFilesCount');
    if (countSpan) {
        countSpan.textContent = String(openFilesMap.size);
    }
    if (!tbody) return;

    tbody.innerHTML = '';
    if (openFilesMap.size === 0) {
        tbody.innerHTML = '<tr><td class="empty-msg" style="padding: 8px 10px;">No files currently open in this session.</td></tr>';
        return;
    }

    for (let [relPath, item] of openFilesMap.entries()) {
        let row = tbody.insertRow();

        let pathCell = row.insertCell();
        let linkSpan = document.createElement('span');
        linkSpan.className = 'open-file-path';
        linkSpan.title = 'Click to focus or re-open in editor';
        linkSpan.textContent = `📄 ${relPath}`;
        linkSpan.onclick = () => focusOrReopenFile(relPath);
        pathCell.appendChild(linkSpan);

        let statusCell = row.insertCell();
        statusCell.className = `sync-status ${item.statusClass || ''}`;
        statusCell.textContent = item.status || '';

        let actionCell = row.insertCell();
        actionCell.style.width = '36px';
        actionCell.style.textAlign = 'right';
        let removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-watch-btn';
        removeBtn.title = 'Stop watching this file and remove from list';
        removeBtn.textContent = '✕';
        removeBtn.onclick = () => stopWatchingFile(relPath);
        actionCell.appendChild(removeBtn);
    }
}

// =============================================
// NEW FILE & NEW FOLDER DIALOGS
// =============================================

function showNewFileDialog() {
    let dlg = document.getElementById('newFileDialog');
    let folderLbl = document.getElementById('newFileFolderLabel');
    let inp = document.getElementById('newFileNameInput');
    let errEl = document.getElementById('newFileError');
    if (!dlg) return;

    if (folderLbl) {
        folderLbl.textContent = currentSubPath ? `/${currentSubPath}/` : '/';
    }
    if (inp) inp.value = '';
    if (errEl) {
        errEl.style.display = 'none';
        errEl.textContent = '';
    }
    dlg.showModal();
    if (inp) inp.focus();
}

async function confirmCreateNewFile() {
    let inp = document.getElementById('newFileNameInput');
    let openChk = document.getElementById('openNewFileImmediately');
    let errEl = document.getElementById('newFileError');
    let btn = document.getElementById('confirmNewFileBtn');

    let fileName = (inp ? inp.value : '').trim();
    if (!fileName) {
        if (errEl) {
            errEl.textContent = 'Please enter a file name.';
            errEl.style.display = 'block';
        }
        return;
    }
    if (fileName.includes('/') || fileName.includes('\\') || fileName === '.' || fileName === '..') {
        if (errEl) {
            errEl.textContent = 'File name cannot contain path separators (/ or \\).';
            errEl.style.display = 'block';
        }
        return;
    }
    if (currentEntries.some(e => e.name === fileName)) {
        if (errEl) {
            errEl.textContent = `"${fileName}" already exists in this folder.`;
            errEl.style.display = 'block';
        }
        return;
    }

    let relPath = currentSubPath ? `${currentSubPath}/${fileName}` : fileName;
    let shouldOpen = openChk ? openChk.checked : true;

    if (btn) btn.disabled = true;
    try {
        let localTempPath = wslToWindowsPath(`${SSH_TEMP_FILE_LOCATION}/${relPath}`);
        let localDir = path.dirname(localTempPath);
        if (!fs.existsSync(localDir)) {
            fs.mkdirSync(localDir, { recursive: true });
        }
        fs.writeFileSync(localTempPath, '', 'utf8');

        await sshPut(repoSshUrl, relPath);

        document.getElementById('newFileDialog').close();
        await loadDirectory(currentSubPath);

        if (MAIN && typeof MAIN._update === 'function') {
            MAIN._update();
        }
        if (MAIN && typeof MAIN.updateChangedListWindow === 'function') {
            MAIN.updateChangedListWindow();
        }

        if (shouldOpen) {
            startWatchingFile(relPath, localTempPath);
            renderDirectoryTable();
            renderOpenFilesList();
            await launchEditorForFile(localTempPath, relPath);
        }
    } catch (err) {
        if (errEl) {
            errEl.textContent = `Failed creating file: ${err.message || err}`;
            errEl.style.display = 'block';
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

function showNewFolderDialog() {
    let dlg = document.getElementById('newFolderDialog');
    let parentLbl = document.getElementById('newFolderParentLabel');
    let inp = document.getElementById('newFolderNameInput');
    let errEl = document.getElementById('newFolderError');
    if (!dlg) return;

    if (parentLbl) {
        parentLbl.textContent = currentSubPath ? `/${currentSubPath}/` : '/';
    }
    if (inp) inp.value = '';
    if (errEl) {
        errEl.style.display = 'none';
        errEl.textContent = '';
    }
    dlg.showModal();
    if (inp) inp.focus();
}

async function confirmCreateNewFolder() {
    let inp = document.getElementById('newFolderNameInput');
    let errEl = document.getElementById('newFolderError');
    let btn = document.getElementById('confirmNewFolderBtn');

    let folderName = (inp ? inp.value : '').trim();
    if (!folderName) {
        if (errEl) {
            errEl.textContent = 'Please enter a folder name.';
            errEl.style.display = 'block';
        }
        return;
    }
    if (folderName.includes('/') || folderName.includes('\\') || folderName === '.' || folderName === '..') {
        if (errEl) {
            errEl.textContent = 'Folder name cannot contain path separators (/ or \\).';
            errEl.style.display = 'block';
        }
        return;
    }
    if (currentEntries.some(e => e.name === folderName)) {
        if (errEl) {
            errEl.textContent = `"${folderName}" already exists in this folder.`;
            errEl.style.display = 'block';
        }
        return;
    }

    let relPath = currentSubPath ? `${currentSubPath}/${folderName}` : folderName;
    if (btn) btn.disabled = true;
    try {
        await fs_mkdir(`${repoSshUrl}/${relPath}`);
        document.getElementById('newFolderDialog').close();
        await loadDirectory(currentSubPath);
    } catch (err) {
        if (errEl) {
            errEl.textContent = `Failed creating folder: ${err.message || err}`;
            errEl.style.display = 'block';
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

// =============================================
// CLOSE WARNING & LIFECYCLE MANAGEMENT
// =============================================

function hasOpenWatchedFiles() {
    return openFilesMap.size > 0;
}

function updateCloseWarningDialogList() {
    let listEl = document.getElementById('closeWarningFileList');
    if (!listEl) return;
    listEl.innerHTML = '';
    for (let [relPath, item] of openFilesMap.entries()) {
        let li = document.createElement('li');
        li.style.marginBottom = '4px';
        li.textContent = `${relPath} (${item.status || 'open'})`;
        listEl.appendChild(li);
    }
}

function requestCloseWithWarning(afterCloseCallback) {
    if (forceClosing || openFilesMap.size === 0) {
        stopAllWatchers();
        forceClosing = true;
        if (MAIN && typeof MAIN.onSshFileBrowserClosed === 'function') {
            MAIN.onSshFileBrowserClosed(repoSshUrl, win);
        }
        if (MAIN && typeof MAIN.fixNwjsBug7973 === 'function' && win) {
            MAIN.fixNwjsBug7973(win);
        } else if (win) {
            win.close(true);
        }
        if (typeof afterCloseCallback === 'function') {
            afterCloseCallback();
        }
        return true;
    }

    pendingAfterCloseCallback = (typeof afterCloseCallback === 'function') ? afterCloseCallback : null;
    updateCloseWarningDialogList();
    try {
        if (win) win.focus();
    } catch (e) {}

    let dlg = document.getElementById('closeWarningDialog');
    if (dlg && !dlg.open) {
        dlg.showModal();
    }
    return false;
}

function confirmForceCloseBrowser() {
    let dlg = document.getElementById('closeWarningDialog');
    if (dlg && dlg.open) {
        dlg.close();
    }
    let cb = pendingAfterCloseCallback;
    pendingAfterCloseCallback = null;
    stopAllWatchers();
    forceClosing = true;

    if (MAIN && typeof MAIN.onSshFileBrowserClosed === 'function') {
        MAIN.onSshFileBrowserClosed(repoSshUrl, win);
    }
    if (MAIN && typeof MAIN.fixNwjsBug7973 === 'function' && win) {
        MAIN.fixNwjsBug7973(win);
    } else if (win) {
        win.close(true);
    }

    if (typeof cb === 'function') {
        cb();
    }
}

function cancelCloseBrowser() {
    pendingAfterCloseCallback = null;
    let dlg = document.getElementById('closeWarningDialog');
    if (dlg && dlg.open) {
        dlg.close();
    }
}

function stopAllWatchers() {
    for (let item of openFilesMap.values()) {
        if (item && item.watcher) {
            try { item.watcher.close(); } catch (e) {}
        }
    }
    openFilesMap.clear();
}

function showBrowserAlert(title, message) {
    let tEl = document.getElementById('browserAlertTitle');
    let mEl = document.getElementById('browserAlertMessage');
    let dlg = document.getElementById('browserAlertDialog');
    if (tEl) tEl.textContent = title;
    if (mEl) mEl.textContent = message;
    if (dlg) dlg.showModal();
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

window.hasOpenWatchedFiles = hasOpenWatchedFiles;
window.requestCloseWithWarning = requestCloseWithWarning;
window.updateEditorHeaderInfo = updateEditorHeaderInfo;
