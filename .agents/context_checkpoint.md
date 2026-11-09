### 🛠️ Tech Stack
* **Runtime & Framework**: NW.js (`0.100.1`) med Chromium och Node.js
* **Core Libraries**: `simple-git` (^4.0.2), `@hackolade/keytar`, `chokidar`, `diff-match-patch`, `@toast-ui/editor`
* **Packaging & Signing**: `create-dmg`, macOS `codesign`, Apple `notarytool` / `stapler`
* **Coding Standard**: Always write code comments, documentation, and variable/function names in **American English**.

---

### 🏛️ Architecture & Files
* **Git Wrapper & Resilience (`lib/simpleGitWithRetry.js`)**: Central Proxy wrapper for `simple-git` providing automated exponential retry logic on index.lock/config.lock collisions, transparent normalization for `simple-git` v4 CommonJS exports, and automatic injection of required security guard flags (`allowEnvironment` and `opts.unsafe.*`).
* **UI Test Framework**: Framework för automatiserade och interaktiva UI-tester av Pragma-git via Chrome DevTools Protocol med YAML-scenarier och isolerade testmiljöer ([automated-tests/ui/run_ui_tests.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/run_ui_tests.js), [automated-tests/ui/cdp_client.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/cdp_client.js), [automated-tests/ui/ui_fixtures.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/ui_fixtures.js), [automated-tests/ui/scenarios/](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/scenarios/))
* **Application Core**: Huvudfönster och event-loop ([app.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.html), [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js))
* **Modified Files List**: Fönster för modifierade filer och filurval ([listChanged.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/listChanged.html), [listChanged.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/listChanged.js))
* **Settings Window**: Inställningsvy med tabbar för Repository, Branch, Software, System Info, Clone ([settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js), [settings.css](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.css))
* **SSH Server File Browser**: Filbläddrare för SSH-serverrepon med mappnavigering, `sshGet`/`sshPut` + `chokidar` auto-synkning vid sparning, ny fil/mapp-skapande, lista över öppna filer med klick-för-fokus och stängningsvarning ([sshFileBrowser.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/sshFileBrowser.html), [sshFileBrowser.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/sshFileBrowser.js), [ssh_folder/ssh-ls](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-ls))
* **SSH Folder Integration**: Hjälpskript och wrappers för fjärr-git över SSH ([ssh_folder/ssh-folder-lib.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js), [ssh_folder/ssh-git-client](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-git-client), [ssh_folder/ssh-mkdir](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-mkdir), [ssh_folder/ssh-ls](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-ls), [ssh_folder/ssh-get](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-get), [ssh_folder/ssh-put](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-put), [ssh_folder/ssh-generate-key-login](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-generate-key-login), [ssh_folder/ssh-test-login](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-test-login))
* **Automated Testing Suite (Headless/CLI)**: Master test runner och automatiserade tester för backend och filsystemsintegration utan GUI ([_run_tests](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/_run_tests), [automated-tests/_run_tests](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/_run_tests), [automated-tests/test_setup.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/test_setup.sh), [automated-tests/test_setup.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/test_setup.js), [automated-tests/non_gui/](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/))
* **Git Provider APIs & CI Status**: Abstraktionslager och klasser för GitHub, GitLab och Bitbucket REST APIs med commit CI-statusfrågor och 2-stegs persistent cache ([apis_github_and_others/](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/apis_github_and_others/), [apis_github_and_others/github.com.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/apis_github_and_others/github.com.js), [apis_github_and_others/gitlab.com.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/apis_github_and_others/gitlab.com.js), [apis_github_and_others/bitbucket.org.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/apis_github_and_others/bitbucket.org.js))
* **Build Orchestration**: Master-byggskript för plattformsoberoende paketering ([make_binaries/build](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/build))
* **Code Signing Engine**: Inside-out djupkodsignering för NW.js och dess hjälparappar/moduler ([make_binaries/scripts/sign_app.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/sign_app.sh))
* **DMG Builder**: Genererar monterbara DMG-paket med live-loggning ([make_binaries/scripts/build_dmg.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/build_dmg.sh))
* **Apple Notarization**: Skickar in, validerar och häftar Apple-notarisering ([make_binaries/scripts/notarize_app.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/notarize_app.sh))
* **Entitlements**: Säkerhetsrättigheter för NW.js JIT och minneshantering ([make_binaries/assets-mac/entitlements.plist](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/assets-mac/entitlements.plist))

  - **Delad orsakshantering för otillgängliga repon** ([app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js), [ssh_folder/ssh-folder-lib.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js), [ssh_folder/ssh-test-if-file-exists](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-test-if-file-exists)):
    - Infört `cachedLocalStatus.reason[repoNumber]` som lagrar den exakta orsaken (`'key rejected'`, `'not a folder'`, `'not a repo'`, `'no network'`).
    - Både repomenyn (`buildRepoMenuItem` i `app.js`) och inställningsfönstret (`settings.js`) läser nu samma fält:
      - I repomenyn visas orsaken inom parentes på utgråade val: t.ex. ` ! [ssh] - testOnMyMac (key rejected)`.
      - I Settings visas orsaken i fet/kursiv stil (`(key rejected)`, `(not a folder)`, `(no network)`, `(not a repo)`) med distinkt orange färg vid nyckelfel.
    - Zero duplication: felklassificeringen sker centralt i `testLocalStatus` / `fs_existsSync` utan att dupliceras i vyerna.

---

### 📋 Current Status & Tasks
* **Pragma-Merge Window Size Persistence Across Instances (Implemented)**:
  - Users resizing any `pragma-merge` editor/diff window now have those dimensions automatically remembered as the new default for all subsequent `pragma-merge` windows.
  - Stored inside `state.pragmaMerge.window = { width, height }` and persisted to `~/.Pragma-git/settings.json` via `saveSettings()`.
  - Added `getSensibleMergeWindowSize(defaultWidth, defaultHeight)` in [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) that checks for configured `state.pragmaMerge.window` dimensions and clamps them within available screen dimensions via `getSensibleWindowSize()`.
  - Added `updatePragmaMergeWindowSize(win)` listening to `win.on('resize')` and `win.on('close')` in both `openPragmaMergeDirect()` and `startPragmaMerge()`.
  - Added window size sync and settings save in `closeWindowNicely()` in [`merge/pragma-merge.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge.js).
  - Added unit test suite [`automated-tests/non_gui/app_function_calls/test_05_pragma_merge_window_size.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/app_function_calls/test_05_pragma_merge_window_size.js) testing default fallback, dimension persistence, subsequent window adoption, bounds clamping, and validation (6/6 tests passed).
* **Pragma-Merge Multi-Window Support & Session Isolation (Option 1 Done, Option 2 Step 1 Done)**:
  - **Option 1 (Direct URL Parameter Mode - Completed)**:
    - Allows multiple editor windows to open concurrently without interfering with lockfiles or signaling mechanisms.
    - Updated [`merge/pragma-merge.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge.html) and [`merge/pragma-merge.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge.js) to support direct query parameters (`?first=...&second=...`).
    - Added `openPragmaMergeDirect()` in [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) with window cascading and focus-if-already-open tracking.
    - Integrated in [`sshFileBrowser.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/sshFileBrowser.js) and [`listChanged.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/listChanged.js).
  - **Option 2 (Per-Instance Session IDs - Universal for Local & SSH Server)**:
    - Group all session files inside dedicated session folders: `.tmp/sessions/<SESSION_ID>/` containing `first`, `second`, `third`, `fourth`, `running`, `exit`.
    - **Step 1 (Automated Test Validation - Completed)**:
      - Added `PRAGMA_SIGNAL_DIR` override support in [`pragma-merge`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/pragma-merge) to allow sandboxed / isolated test execution.
      - Created [`automated-tests/non_gui/git_client/test_05_difftool_mergetool_sessions.sh`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/git_client/test_05_difftool_mergetool_sessions.sh) validating `git difftool` / `pragma-merge` file creation, signal files, and clean exit. Registered in [`automated-tests/non_gui/git_client/_run_tests`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/git_client/_run_tests).
    - **Step 2 (Grouped Session Folders & Isolated Signal Protocol - Completed)**:
      - Updated [`pragma-merge`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/pragma-merge) to generate unique session IDs (`session_${$}_$(date +%s)`), create dedicated `.tmp/sessions/<SESSION_ID>/` directories, and isolate parameter files (`first`, `second`, etc.) and signal files (`pragma-merge-running`, `exit-pragma-merge`).
      - Preserved dual-writing to root `.tmp/` and backward-compatible signaling so existing legacy watchers continue to operate without breaking.
      - Added tests 5.5 - 5.9 in [`automated-tests/non_gui/git_client/test_05_difftool_mergetool_sessions.sh`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/git_client/test_05_difftool_mergetool_sessions.sh), verifying session ID recording, isolated directory existence, and concurrent parallel sessions with independent exit codes (all 9/9 tests pass).
    - **Step 3 (GUI Session Watcher & Direct Session Directory Integration - Completed)**:
      - Updated [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) merge watcher to monitor `MERGESESSIONSDIR` via `chokidar`.
      - When a session signal file is detected (`.tmp/sessions/<SESSION_ID>/pragma-merge-running`), `startPragmaMerge(sessionId, sessionDir)` is invoked, passing `?sessionId=...&sessionDir=...` to the merge window.
      - Removed legacy `$TMP/pragma-merge-running` signal touch from [`pragma-merge`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/pragma-merge) so diff invocations exclusively signal through their dedicated session directories, completely eliminating duplicate window launches.
      - Updated [`listChanged.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/listChanged.js) to allow concurrent diff/merge callback execution without blocking on `isOpenDialog` when `merge_win` is already open.
      - Formatted Window Menu label and HTML title to `"Pragma-merge (<filename>)"` in [`merge/pragma-merge.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge.js) and [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) (`makeWindowMenu`), binding focus directly to the specific window handle.
      - Added startup cleanup of stale sessions in `MERGESESSIONSDIR` in [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) and unlinking of both local and SSH session signal files in [`merge/pragma-merge.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge.js).
      - Fixed historical file viewing (`(view)` link) for SSH repositories in [`merge/pragma-merge.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge.js) by using `ROOT || global.state.repos[global.state.repoNumber].localFolder` and trimming `THIRD` parameter.
      - Updated [`merge/pragma-merge.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge.js) to detect `SESSION_DIR`, load parameters from that session directory, and write exit code / clear signal files in the session directory.
      - Updated [`automated-tests/non_gui/git_client/test_05_difftool_mergetool_sessions.sh`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/git_client/test_05_difftool_mergetool_sessions.sh) asserting session-based signal files and parallel concurrent runs. All 9 tests pass.
      - Fixed simple-git directory validation error (`Cannot use simple-git on a directory that does not exist`) in [`lib/simpleGitWithRetry.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/lib/simpleGitWithRetry.js) when switching to SSH repositories by ensuring `opts.baseDir` is only set for local filesystem paths and omitted for `ssh://` URLs.
      - Fixed SSH history navigation and git operations failing after closing `pragma-merge` (`TypeError: Cannot read properties of undefined (reading 'length')` / `Cannot use simple-git on a directory that does not exist`): removed `process.chdir(SIGNALDIR)` in [`merge/pragma-merge.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge.js) (which left NW.js's shared `process.cwd()` inside the temporary `.tmp/sessions/<SESSION_ID>` directory that gets deleted on close), added explicit `baseDir: STARTDIR` for SSH repositories in [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js), and added a fallback `baseDir` check in [`lib/simpleGitWithRetry.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/lib/simpleGitWithRetry.js).
      - Fixed undeclared `platform` global in `configFilePath()` in [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) by safely scoping `let platform`.
    - **Next Step (Step 4)**: Update SSH helpers ([`ssh_folder/ssh-git-client`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-git-client), [`ssh_folder/ssh-get-merge-files`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-get-merge-files), [`ssh_folder/ssh-close-pragma-merge-ssh`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-close-pragma-merge-ssh)) to pass and handle session IDs across SSH connections.
* **SSH Server File Browser (Implemented)**:
  - **1. `ssh_folder/ssh-ls` & `sshLs` in [`ssh_folder/ssh-folder-lib.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js)**:
    - Created executable bash script [`ssh_folder/ssh-ls`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-ls) accepting `SSH_URL` (`$1`) and optional `RELATIVE_SUBPATH` (`$2`), sourcing `lib/ssh-functions` (`getSshUrlParts "$1"`) and running `ls -1Ap` over the multiplexed SSH connection.
    - Exported `sshLs(sshUrl, relativeSubPath)`, `sshGet`, `sshPut`, `fs_existsSync`, and `fs_mkdir` in [`ssh_folder/ssh-folder-lib.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js). `sshLs` returns `{ name, isDirectory, relativePath }` sorted folders-first, then alphabetically (filtering out `.git/`).
  - **2. Designated Editor Setting (`state.tools.editor` in `settings.json`)**:
    - Added `#editorTool` input row in [`settings.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html) under *Software -> Git & system tools (built-in if empty)*.
    - Added `editorTool` callback, `state.tools.editor` initialization, and persistence in [`settings.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js) and [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) (`loadSettings` and `updateWithNewSettings`).
    - **Empty (`""`) or `"pragma-merge"`**: Defaults to `"pragma-merge"` and opens built-in `pragma-merge "<tempFile>" --edit --rw` (focuses existing `merge_win` if already open).
    - **`"system"`** (case-insensitive): Opens with OS system default application (`gui.Shell.openItem(tempFile)`).
    - **Custom command/app**: Opens with configured custom editor command/app (`cwd` set to `path.dirname(tempFile)`).
  - **3. SSH Server File Browser Window ([`sshFileBrowser.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/sshFileBrowser.html) & [`sshFileBrowser.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/sshFileBrowser.js))**:
    - Triggered from `folderClicked()` via `showSshFileBrowser(folder)` in [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) when `state.repos[state.repoNumber].localFolder.startsWith('ssh:')`. Opening multiple file browser windows cascades new windows with an offset of ~20px down and right from the previous window.
    - Window title set to `SSH Server Files - <repoName>` and internal header set to `File Browser — <repoName>` with standard interactive help button (`#about-icon`) invoking `HELP/SSH File Browser.html`.
    - Dedicated top breadcrumb/path bar with the `⬆ Up` button on the right, and responsive truncation (`renderBreadcrumbs()`): displays `HOME / seg1 / ... / last` when space permits, collapses middle segments to `HOME / ... / <fitting trailing segments>` when long, and falls back to `... / <last segment>` if space is very tight.
    - `+ New File`, `+ New Folder`, and `↻ Refresh` buttons placed on the right edge of the bottom action bar below the directory table, styled with clean `border-radius: 4px` matching [`settings.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html).
    - Folder entries in directory listing use the official Pragma-git folder icon (`images/folder.png`) matching [`app.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.html) with exact theme filter rules: crisp white in dark mode (`filter: none`) and charcoal in light mode (`filter: brightness(0.35)` with hover deepening to `brightness(0.05)`).
    - File entries use a standing rectangle document icon with A4-style proportions (13x18) and dog-eared corner, matching the theme filter rules of the titlebar icons.
    - Added keyboard shortcuts Cmd+R (macOS) and Ctrl+R (Windows/Linux) to trigger folder refresh.
    - Double-clicking opens folders (`..` and subfolders) or edits files just like an ordinary file browser, while keeping single-click `(up)`, `(open)`, and `(edit)` links in the Action column.
    - Double-clicking (or clicking `(edit)` on) a file downloads it via `sshGet(repoSshUrl, relativePath)` to `SSH_TEMP_FILE_LOCATION`, watches the local temp file with `chokidar` (`awaitWriteFinish`), and opens it in the configured editor.
    - Multiple `pragma-merge` editor instances can now be opened concurrently via `openPragmaMergeDirect()` in [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) passing query parameters to [`merge/pragma-merge.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge.html) and [`merge/pragma-merge.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge.js), bypassing the singleton bash script lockfile and cascading each open file editor window cleanly.
  - **4. Documentation**:
    - Created [`HELP/SSH File Browser.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/HELP/SSH%20File%20Browser.html) formatted identically to [`HELP/Modified Files.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/HELP/Modified%20Files.html), documenting navigation, double-click editing, auto-syncing on save, editor configuration, and close warning behavior.
    - Updated folder icon reference to `images/folder.png` with theme-based filters (`body.light`: `brightness(0.35)`, `body.dark`: `none`), ensuring the folder icon renders cleanly in dark mode instead of pitch black.
    - Saving the temp file triggers `sshPut(repoSshUrl, relativePath)` automatically (verifying buffer changes to avoid spurious uploads), updates the sync status/timestamp in the **Open Files** panel, and triggers `MAIN._update()` and `MAIN.updateChangedListWindow()`.
    - Clicking an already-open file in the **Open Files** panel re-invokes `launchEditorForFile()` to bring the editor window/tab to focus. Clicking `[✕]` stops watching that file.
  - **4. Close Warning & Watcher Lifecycle**:
    - As long as the file browser window(s) are open, `chokidar` watchers keep syncing saved changes to the SSH server.
    - Closing a file browser window (`win.on('close')`) or closing the Pragma-git main window (`closeWindow()` in [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js)) while any file browser has open/watched files displays `#closeWarningDialog` listing all open files and warning that this is the **last chance to save and close** them in the editor before syncing stops.
  - **5. Automated Tests**:
    - Added `ssh-ls` root and subdirectory tests (5.5 & 5.6) in [`automated-tests/non_gui/ssh/test_05_ssh_put_get.sh`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/ssh/test_05_ssh_put_get.sh) and export verification (6.15) in [`automated-tests/non_gui/ssh/test_06_ssh_lib_node.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/ssh/test_06_ssh_lib_node.js).
* **Fix for CI Failure on Linux and Windows (UI Test 03 and Windows Teardown)**:
  - **Environment Guard Allowance in simple-git v4 Wrapper** ([lib/simpleGitWithRetry.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/lib/simpleGitWithRetry.js)):
    - Added dynamic detection and whitelisting of all environment keys in `process.env` starting with `GIT_`, `SSH_`, or `PRAGMA_SSH_KEY` in `opts.allowEnvironment`.
    - Fixes runtime error `Error: Use of "GIT_SSL_CAINFO" is blocked by the environment guard` on GitHub Actions Linux and Windows runners where custom Git CA bundles or credentials helper variables are injected into the runner environment.
  - **Form Input & Textarea Value Access in CDP Test Client** ([automated-tests/ui/lib/cdp_client.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/lib/cdp_client.js)):
    - Updated `getText(selector)` to prioritize `el.value` when inspecting `<textarea>` or `<input>` elements before falling back to `el.innerText || el.textContent`.
    - Resolves failure where `#message` commit description textarea returned empty string `""` because `textContent` in DOM remained empty while the active value resided in `el.value`.
  - **Remote Upstream Branch Parsing Robustness in `gitFetch()`** ([app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js)):
    - Handled branch references regardless of whether prefixed with `remotes/` (e.g. `'remotes/upstream/main'` vs `'upstream/main'`), extracting remote name and branch cleanly.
  - **Merge Command Robustness in `gitMerge()`** ([app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js)):
    - Switched from `.mergeFromTo(selectedBranchName, currentBranchName, options, onMerge)` to `.merge([selectedBranchName, ...options], onMerge)`.
    - In `simple-git` v4, `mergeFromTo(from, to, options)` synthesizes `git merge <from> <to> <options>`, which fails or misparses in git CLI because `git merge` merges commits/branches directly into the currently checked-out branch and does not accept a destination branch operand.
    - Updated `gitMerge()` to use `merge([selectedBranchName, ...options])`, ensuring `--no-ff` and `--no-commit` merge correctly without CLI errors.
  - **Dynamic Wait in UI Test Scenario 03** ([automated-tests/ui/scenarios/test_03_merge_upstream.yaml](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/scenarios/test_03_merge_upstream.yaml)):
    - Replaced static `wait: 2500` ms with `action: wait_for_text` polling `#message` for `"Merge branch"` with a 10s timeout, eliminating timing race conditions on slower CI runners (Linux Xvfb and Windows).
  - **Platform-Safe Teardown on Windows** ([automated-tests/ui/lib/ui_fixtures.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/lib/ui_fixtures.js)):
    - Guarded Unix-specific `pkill` commands with `if (process.platform !== 'win32')`.
    - On Windows CI runners, executing `pkill` from Node spawned `cmd.exe` which printed `"The system cannot find the path specified."`.
* **gitFetch Async Promise Completion**:
  - In [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js):
    - Converted `gitFetch()` to a proper `async` function awaiting `simpleGit().raw([...fetchCommands, '--all'])` and `updateBranchListWithUpstream()`.
    - Previously, `gitFetch` executed raw fetch calls with a callback without awaiting, which caused callers (such as automated tests or fast UI flows) to return before remote references and upstream ahead flags were updated in `cachedBranchList`.
* **Automated Upgrade Dialog Suppression in UI Tests**:
  - In [automated-tests/ui/lib/ui_fixtures.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/lib/ui_fixtures.js):
    - Automatically prepopulates test sandbox `settings.json` with `ignoredVersion: "999.999.999"`, preventing `#newVersionDetectedInputDialog` from showing during testing.
  - In [automated-tests/ui/lib/run_ui_tests.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/lib/run_ui_tests.js):
    - Added automatic dismissal of `#waitButton` upon window connection as a fallback guard.
  - In `teardown()`, added cleanup killing any lingering NW.js process on the configured test CDP port.
* **UI Test Framework git Tree Validation Robustness**:
  - In [automated-tests/ui/lib/run_ui_tests.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/lib/run_ui_tests.js):
    - In `assert_git_tree_match`, dynamically checks whether source/target has a `.git` subdirectory (`git -C`) or is a bare git repository (`git --git-dir`), preventing failures when comparing working tree repos against non-bare source repositories.
* **UI Test Scenario: Merge from Upstream**:
  - Created [automated-tests/ui/scenarios/test_03_merge_upstream.yaml](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/scenarios/test_03_merge_upstream.yaml):
    - Configures an ephemeral bare upstream parent repo, a bare origin fork repo, and a local fork clone in Pragma-git with `upstream` remote set up (and `NO-PUSH` protected).
    - Commits new changes into upstream parent and triggers `gitFetch()` in Pragma-git.
    - Asserts star indicator badge (`★`) appears on top-right of the Merge icon (`#top-titlebar-merge-badge`) and verifies tooltip updates with upstream commit count.
    - Simulates clicking the upstream badge / menu item, asserting that `#confirmMergeUpstreamDialog` opens.
    - Confirms the merge via `#confirmMergeUpstreamOK`, verifying staged merge changes and commit text generation.
    - Concludes the merge by clicking `#store-button`, asserting the star badge is hidden post-merge and checking working tree content.
    - Concludes with mandatory `assert_git_tree_match` validating tree parity between the upstream seed repository and the merged local fork.
  - Added runner scripts:
    - [automated-tests/ui/scenarios/test_03_merge_upstream.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/scenarios/test_03_merge_upstream.js)
    - [automated-tests/ui/_run_03_merge_upstream](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/ui/_run_03_merge_upstream)
  - Successfully verified end-to-end; all 3 UI test suites passing (3/3 passed).
* **Settings Clone Tab Help Documentation Update (Forked Repositories)**:
  - In [HELP/Settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/HELP/Settings.html):
    - Explicitly clarified that a fork must first be created on the provider's website (GitHub, GitLab, Bitbucket) using their web interface before cloning.
    - Documented the full fork workflow: creating the fork on the provider, cloning the fork repository URL in Pragma-git, and automatic detection/configuration of the `upstream` remote.
    - Documented upstream merge notifications via the star indicator (`★`) on the Merge button and the confirmation dialog flow.
* **Message Overlay Badge Dynamic Offset on Scrollbar**:
  - In [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js):
    - Added `adjustMessageOverlayOffset()` to calculate whether the `#message` textarea has a vertical scrollbar (`scrollHeight > clientHeight`) and measure the scrollbar width (`offsetWidth - clientWidth`).
    - Dynamically offsets the `right` position of `#edit_commit_text_div` (containing `(draft)`, `(double-click to change)`, `(esc-key to cancel)`) and `#amend_commit_div` to `(scrollbarWidth + 5) + 'px'` (falling back to `20px`) when vertical scrolling is active, and resets back to `5px` when no scrollbar is present.
    - Integrated offset recalculation into `updateEditCommitTextDiv()`, `_setMode()` amend div display, and `window.onresize`.
  - In [automated-tests/non_gui/app_function_calls/test_04_draft_message.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/app_function_calls/test_04_draft_message.js):
    - Added unit test coverage verifying overlay badge offset behavior both with and without a vertical scrollbar.
* **Selected Repository Row Highlighting in Settings**:
  - In [settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html):
    - Added CSS rule `#settingsTableBody tr:has(.localFolderRadioButton:checked), #settingsTableBody tr.selectedRepoRow` using `var(--hoverBackGroundColor)`, styling the currently active radio-buttoned repository row with the identical highlight background color used when hovering over repository rows.
  - In [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js):
    - Added `selectedRepoRow` class application to the matching row during table generation in `generateRepoTable()`.
    - Updated `repoRadiobuttonChanged` callback in `_callback()` to dynamically toggle the `selectedRepoRow` class on table rows when switching repositories.
* **System Info Remote & Fork Status Enhancements**:
  - In [automated-tests/non_gui/apis/test_05_live_ci_status.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/apis/test_05_live_ci_status.js):
    - Expanded the external blocking / rate-limit regex for live GitLab tests 5.5 and 5.6 to match `"unavailable"` and `"did not return"`. When public GitLab web endpoints return 403 or anti-bot challenge pages on GitHub Actions runner IPs, the error message thrown by `getValue()` (`GitLab web pipelines.json did not return CI status (private repo or endpoint unavailable)`) is now accurately caught and recorded as `[SKIP]`.
  - In [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js) `updateRemoteInfo()`:
    - Displaying reason alongside "fail" in `Provider API status`: If the API call fails or encounters an HTTP error (e.g. 401 Unauthorized, 403 Forbidden / rate limit, 404 Not Found), the specific HTTP code and description or network error is displayed in bold italic alongside `fail` (e.g. `fail (401 Unauthorized - invalid or missing credentials)`).
    - Displaying fallback fork parent URL: If the API call does not return a `fork-parent` (due to authentication failure or API errors), Pragma-git falls back to the repository's locally stored `forkedFromURL` in `state.repos[state.repoNumber]` (e.g. `<upstream_url> (from settings)`), instead of stating `(this is not a known fork)`.
  - In [apis_github_and_others/general_git_rest_api.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/apis_github_and_others/general_git_rest_api.js):
    - Added `statusText` and `errorMessage` capture to `fetchWithApi()` response structure, preserving HTTP response status descriptions and error messages for diagnostic presentation in System Info.
* **Upstream Remote Handling & Fork Incorporation (Phases 1-4 Complete)**:
  - **Phase 1: Permanent NO-PUSH Protection**:
    - Enhanced `addUpstream()` in [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) and `setRemoteRepoButton` in [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js) so that any configured `upstream` (or non-origin) remote always sets `git remote set-url --push <alias> NO-PUSH`.
    - Permanently prohibits accidental pushing to upstream parent repositories at the Git level, while leaving `origin` (the user's fork) writable.
  - **Phase 2: Upstream Ahead Detection (dry-run & parser)**:
    - Wrapped `gitListUpstreamsNeedingFetch()` in [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) in a Promise, robustly parsing dry-run fetch output (`... -> upstream/<branch>`) and marking `upstreamAhead = true` on `cachedBranchList.branches[remoteBranchLongName]`.
  - **Phase 3: Visual Indicators, Badges & Menu Visibility**:
    - Replaced the intrusive titlebar text badge with a discrete indicator flag featuring a star (`★`) directly on the top-right corner of the Merge icon (`#top-titlebar-merge-badge`) in [app.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.html) and [style.css](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/style.css).
    - Star styled in clean white (`#ffffff`, with subtle contrast drop shadow), sized down to 9px, and offset (`top: -4px; right: -7px;`) so it rests cleanly on the top-right corner without clashing with the theme palette.
    - Synchronized visibility: Hiding the merge icon (e.g. when uncommitted changes exist after selecting merge, or in DEFAULT mode) hides `#top-titlebar-merge-icon-wrapper` as a whole, ensuring the star badge cleanly disappears whenever the merge icon closes.
    - Preserved clean titlebar aesthetics next to the branch name/menu while keeping dynamic merge icon tooltip (`Merge (N updates from upstream)`).
    - Removed upstream branches from the Branch menu entirely; upstream tracking is exclusively accessible from the Merge menu where the star badge points.
    - Added smart relevance filtering via `getUpstreamDefaultBranch()` and `isRelevantUpstreamBranch()`:
      - Added `hasUpstreamRemote()` check to bypass upstream checks entirely if no `upstream` remote is configured for the active repository, eliminating periodic `gitFetch` overhead on standard repos.
      - Suppressed stderr using Node.js child_process `stdio: ['pipe', 'pipe', 'ignore']` and Node `cwd` options across `git symbolic-ref`, `git branch -r`, and `git rev-list`, ensuring full cross-platform compatibility across Windows, macOS, and Linux without shell-specific redirection (`2>/dev/null` or `cd`).
      - Added local filesystem and `file://` detection in `normalizeRepoUrl()`, ensuring local disk remotes (e.g. `/Users/jan/.../origin.git`) bypass CI status API lookup cleanly without triggering `unknown provider for URL` errors.
      - Added 404 response handling (`status: 'none'`) in `github.com.js` for repositories without CI and debounced memory caching on 403 rate-limit/errors in `queryCommitCiStatus()`, eliminating repeating console warnings on interval updates.
      - Added graceful rate-limit / Cloudflare blocking error handling in live test suite 5.5 and 5.6 (`test_05_live_ci_status.js`) to prevent false-negative CI test failures on shared GitHub Actions IP pools.
      - The star badge, alert tooltip count `N`, and the direct Merge menu items strictly track the upstream default branch (`upstream/HEAD` -> `upstream/main` or `master`) and matching branches (e.g. `upstream/<currentBranch>`).
      - Completely prevents dozens or hundreds of irrelevant upstream experimental/feature branches from cluttering the menu or permanently holding the star badge on.
    - Updated `makeBranchMenu()` in [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js):
      - Renders relevant upstream branches (`★ upstream/main (+N)` and/or `★ upstream/<branch> (+N)`) directly into the Merge menu with a preceding separator, rather than nesting them inside a submenu.
      - 1-click access to merge upstream directly from the root Merge menu without hover delay.
      - Kept `Remotes` cleanly dedicated to origin and other remotes.
  - **Phase 4: Fetch & Merge Workflow**:
    - In `clickedBranchContextualMenu` and `clicked-upstream-badge`, selecting/clicking upstream updates displays `<dialog id="confirmMergeUpstreamDialog" class="warning">` matching Pragma-git's standard warning dialog layout instead of browser `confirm()`.
    - Merging executes standard `gitMerge()`, preparing the changes and placing the suggested commit message (`Merge branch '<selectedBranch>' into <currentBranch>`) into the commit text area for storing, maintaining full consistency with all other merges in Pragma-git.
  - **Automated Remote Discovery & `--all` Fetch Support**:
    - In `gitFetch()` within [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js), changed default fetch without arguments from `fetch origin` to `fetch --all`. Pragma-git now automatically fetches and populates remote tracking references from all configured remotes (`origin`, `upstream`, etc.) seamlessly without requiring terminal intervention.
    - Updated `updateBranchListWithUpstream()` and dry-run parser to handle new tracking branches and automatically refresh branch lists upon fetch completion.
    - In `updateBranchListWithUpstream()`, added inspection of existing local tracking branches (`remotes/upstream/*`) via `git rev-list --count HEAD..<remote_branch>` so that once upstream commits have been fetched locally, upstream branches are accurately flagged as ahead (`upstreamAhead = true`, `behindCount = N`), ensuring badges and menu indicators display both before and after fetches.
    - Fixed `ReferenceError: status_data is not defined` in `updateBranchListWithUpstream()` and branch callbacks by ensuring safe `typeof status_data !== 'undefined'` evaluation.
    - Set `.top-titlebar-upstream-placeholder` to `visibility: visible` in `style.css` so the badge is rendered without waiting for onload DOM modifications.
  - **Automated Tests**:
    - Created [automated-tests/non_gui/git_client/test_04_upstream_and_origin.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/git_client/test_04_upstream_and_origin.js) covering parent repository setup, origin fork push, upstream `NO-PUSH` enforcement, dry-run change detection, fetch commit counting, clean merging of upstream into local branch, and pushing merged upstream commits to origin (8/8 tests passed).
    - Fixed GitHub Actions runner compatibility by explicitly setting `-b main` and `symbolic-ref HEAD refs/heads/main` on bare test repositories, preventing `src refspec main does not match any` errors when Git runners default to `master`.
* **Upgraded to `simple-git` v4.0.2 with Full Backwards-Compatibility**:
  - Upgraded `simple-git` to `^4.0.2` in `package.json` to resolve security vulnerabilities identified by `npm audit`.
  - Normalized CommonJS imports in [lib/simpleGitWithRetry.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/lib/simpleGitWithRetry.js), [notes.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/notes.js), [edit_ignore.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/edit_ignore.html), and [automated-tests/non_gui/git_client/test_03_local_vs_server_parity.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/git_client/test_03_local_vs_server_parity.js) to resolve the factory function whether returned directly or as `{ simpleGit }` / `{ default }`.
  - Configured `normalizeGitOptions` in [lib/simpleGitWithRetry.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/lib/simpleGitWithRetry.js) to configure `simple-git` v4's environment guards (`allowEnvironment`) and security category flags (`unsafe.allowUnsafeInclude`, `allowUnsafeAskPass`, `allowUnsafeCredentialHelper`, etc.), allowing include configs, custom binaries (`ssh-git-client`), and credentials without throws.
  - Verified 100% pass rate across all 8 test categories (SSH, utils, git_client, credentials, git_configs, apis, app_function_calls, and UI suites).
* **Optimized Fast Graph & General Find in NW.js**:
  - In [extend_find-in-nw.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/extend_find-in-nw.js), `getElementsToSearch()` now returns `#graphContent` directly for Graph windows so `window.findAndReplaceDOMText` performs a fast single pass over the entire commit list instead of iterating over hundreds of individual child rows.
  - Bypassed costly ancestor tree crawling and `window.getComputedStyle(cur)` in `isNodeVisible` for Graph elements.
  - Replaced per-element `_yieldToUI()` with 16ms time-chunking (`Date.now() - lastYieldTime > 16`) across all element, hash, and textarea loops, allowing find tokens and the match count (`1/432`) to compute and display virtually instantaneously without blocking input cancellation.
* **Cancelable / Preemptible Find in NW.js**:
  - Fixed UI freezing and lag when typing single characters or rapidly updating query text in [extend_find-in-nw.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/extend_find-in-nw.js).
  - Search runs asynchronously across elements, yielding to the UI event loop between elements.
  - Overrode the `input` event listener on `#find-in-nw-input` with a sequence counter (`_activeSearchId`).
  - Any subsequent keystroke (typing a character, removing characters with backspace, or clearing) immediately increments `_activeSearchId`, dumping and cancelling any pending/in-flight DOM search so it is replaced with the new query string without blocking the UI.
* **Pragma-merge "Ignore Whitespace" Option**:
  - Added an `ignore whitespace` checkbox in [merge/pragma-merge_iframe.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge_iframe.html) alongside `align` and `hide unchanged`.
  - Configured CodeMirror MergeView with `options.ignoreWhitespace = ignoreWhitespace` in [merge/pragma-merge.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge.js).
  - Defaults to `false` (safe merge behavior without silently ignoring indentation changes).
  - Persisted in `settings.json` under `state.pragmaMerge.ignoreWhitespace` via `loadSettings()` in [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) and `closeWindowNicely()` in [merge/pragma-merge.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/merge/pragma-merge.js).
* **Consistent "Last commit : ..." Placeholder Across Repo Switches**:
  - Removed remaining hardcoded "You may write what is ongoing here..." boilerplate across `app.js`, `app.html`, and `about.html`.
  - In `restoreRepoDraftMessage()` and `UNKNOWN` mode transitions, the placeholder now preserves the existing `Last commit : "<title>"` (or defaults cleanly to `"No previous commits"` if there are no commits), ensuring switching repositories never flashes the old help text.
* **Resizable Remote URL Textareas in Settings**:
  - Restored vertical resizing (`resize: vertical; min-height: 24px;`) for `.remoteURL textarea` in [settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html#L215).
  - Users can pull the corner of remote repository URL inputs to view and edit long URLs conveniently.
* **(draft) Scratchpad Indicator**:
  - Implemented `(draft)` badge in the message area sharing the exact bottom-right position of `(double-click to change)` (`#edit_commit_text_div`).
  - Coordinated through `updateEditCommitTextDiv()` in [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) and [app.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.html):
    - Appears immediately upon leaving the textarea (`onblur`), or after 6 seconds of typing inactivity if still focused at HEAD.
    - Unobtrusively muted with tooltip: `"Draft note for this repository (edit when ready to commit)"`.
    - Automatically hides while actively typing, or reverts to `(double-click to change)` / `(esc-key to cancel)` when empty at HEAD, and remains completely hidden in historical navigation.
  - Documented in [about.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/about.html) under **Message Area & Commit Flow**.
  - Verified with comprehensive test coverage in [automated-tests/non_gui/app_function_calls/test_04_draft_message.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/app_function_calls/test_04_draft_message.js) (14/14 passed).
* **Dynamic Stash Naming Tooltip**:
  - Added dynamic tooltip behavior for the stash button in `app.html` (`updateStashTooltip()`) and `app.js`.
  - When in `CHANGED_FILES` or `CHANGED_FILES_TEXT_ENTERED`:
    - If user has entered text in the commit message box, tooltip reflects the pending stash name: `Stash with name: "<entered text>"`.
    - If empty, tooltip provides a subtle prompt: `Stash uncommitted files (type in above textarea to name stash)`.
  - In other modes (or if no uncommitted changes), defaults back to clean `Stash uncommitted`.
* **Clean Previous Commit Placeholder**:
  - Replaced generic 3-line help boilerplate with `Last commit: "<title>"` placeholder in the message area for both `NO_FILES_TO_COMMIT` and `CHANGED_FILES` modes when at `HEAD` ([app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js)).
  - Provides instant context of the previous commit directly in grey text without unnecessary clutter.
* **Menu Visual Contrast Fix**:
  - Stopped greying out active repositories and branches in both the repo menu and the branch menu ([app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js)).
  - Active items remain enabled with full visual contrast and their checked status indicator, preventing them from appearing disabled or broken.
* **Zoom Level Clamping (0.5 to 3.0)**:
  - Enforced bounding between 0.5 and 3.0 for both `zoomMain` (main window) and `zoom` (other windows) in `loadSettings()` ([app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js)) and in input callbacks `zoomMainChanged` / `zoomChanged` ([settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js), [settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html)).
* **Recent Repositories Count Setting**:
  - Added `Recent repos in menu:` numeric input under **Settings -> Software** tab ([settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js)).
  - Persists `state.maxRecentRepos` to `settings.json` (defaults to 5) and dynamically sizes the root menu Recent section.
* **Streamlined Repo Menu Architecture (Concept A)**:
  - Replaced dynamic group-mode-switching with an intuitive, predictable menu layout.
  - **Top section**: Top 5 most recent repositories listed directly in the root menu for 1-click access.
  - **Middle section**: Defined repository groups cleanly organized into hoverable submenus.
  - **Bottom section**: "All Repos (Alphabetical)" accessible in a submenu.
  - Eliminates awkward "double-switching" and guarantees clicking any repository simply switches to that repository.
* **Forward-Compatible Settings Preservation**:
  - Enhanced loadSettings() and fixRepoSettingWithDefault() in app.js to preserve any unknown/newer keys from incoming JSON at both the root state and individual repo levels.
  - Maintains the exact canonical key ordering in JSON export while safeguarding custom or branch-specific keys from being stripped on checkout or older version execution.
  - Restored 14 historical repository groups in ~/.Pragma-git/settings.json.
* **Sensible Default Window Sizes**:
  - Implemented  in [](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) to set sensible first-time window dimensions adapted to screen resolution.
  - Generous height applied across all sub-windows: Graph (), Settings (), Pragma-merge (), Notes (), Help (), About (), Changed Files (), Resolve Conflicts (), Git-ignore Editor (), JSON Viewer (), and Create Remote Repository ().
  - Main window dimensions remain unchanged ().
  - Screen-aware clamping ensures windows fit comfortably on smaller displays without exceeding screen bounds.
  - Sub-window dimensions remain persistent across sessions via NW.js window IDs.

---


### 🐛 Open / Historical Bugs
* **Bug: Failure strike-line invisible on CI badge due to CSS pseudo-element collision with tooltip library**:
  - *Root Cause*: The failure state was styling `.top-titlebar-ci-failure::after` to render the horizontal strike-line across the badge. However, `#top-titlebar-ci-badge` also uses `class="tooltip-bottom"` and `data-tooltip` from `lib/css-tooltip.css`, which uses `[data-tooltip]:after` for the tooltip triangle arrow and sets `opacity: 0` and `background: transparent`. Because `css-tooltip.css` had higher specificity and was loaded after `style.css`, it completely silenced `::after`, making the failure line 100% invisible. On screen, the user saw a plain boxed `CI`, making failure visually indistinguishable from success.
  - *Remediation*: Replaced `::after` with a dedicated child element `<span class="top-titlebar-ci-strike"></span>` inside `#top-titlebar-ci-badge` when status is failure. It renders an unmistakable 2px solid horizontal white line extending 4px outside the box on both sides, with `pointer-events: none;`, completely immune to any tooltip CSS pseudo-elements.
* **Bug: Historical commit c22469 does not show failed CI status**:
  - *Root Cause 1*: In `queryCommitCiStatus`, `if (ciQueryInProgress) return;` was placed at the very top of the function, before checking `getCachedCiStatus`. When navigating past uncached commits, a background API query marked `ciQueryInProgress = true`, causing all subsequent commit checks (including cached failure `c22469`) to abort without checking the cache.
  - *Root Cause 2*: When the background network query finished, it unconditionally called `updateCiBadge`, overwriting the badge with the stale commit's `'none'` status even after the user had moved to `c22469`.
  - *Root Cause 3*: `upArrowClicked()` never called `_setMode('HISTORY')`, `_update()`, or `queryCommitCiStatus()`, so browsing history with the up arrow never updated the CI indicator.
  - *Root Cause 4*: `setHistoricalCommit()` in `graph.js` and `clicked-find-button` in `app.js` did not explicitly trigger `queryCommitCiStatus()`.
  - *Remediation*: Restructured `queryCommitCiStatus` with cache-first lookup, added active-commit validation before UI updates, added bidirectional CI query hooks in `downArrowClicked`, `upArrowClicked`, `clicked-find-button`, `clicked-pinned-hash`, and `setHistoricalCommit`.
* **Bug: CI badges missing upon application restart**:
  - *Root Cause 1*: The working tree was checked out to `feature/automated-tests` (which diverged prior to the CI badge implementation and therefore lacked `top-titlebar-ci-badge` in `app.html` and `queryCommitCiStatus` in `app.js`).
  - *Root Cause 2*: Discrepancies between remote URL representations (e.g. `.git` suffix, SSH syntax, basic auth credentials) caused exact string key lookup in `ci_cache.json` to miss.
  - *Root Cause 3*: Short SHA queries failed against 40-character SHA cache entries.
  - *Root Cause 4*: 403 rate-limit or network errors caught during API queries were erroneously caching `{ status: 'none' }`.
  - *Remediation*: Checked out `develop` where all CI features reside, implemented `normalizeRepoUrl` for universal canonical keying, implemented `findCachedCommit` with short SHA prefix matching, and updated API handlers so errors are isolated and never falsely cached as `'none'`.
* **Task Description**: SSH Connection & Settings Help Documentation Refinement:
  - Updated [HELP/SSH Connection.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/HELP/SSH%20Connection.html):
    - Corrected menu path reference to `Settings → Repository → Add Repo:`.
    - Renamed modal confirmation button from `Save & Fix` to `Save & Close`.
  - Updated `#sshConfigSaveBtn` in [settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html) to display `Save & Close`.
  - Updated [HELP/Settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/HELP/Settings.html) to reflect all new SSH capabilities:
    - Repository Table: documented the `<button>Fix</button>` button next to inaccessible SSH repos (e.g. `(key rejected)`) and its workflow with `Save & Close`.
    - Clone & Add Repo tabs: updated server connection layout to match current single-action row (`Test login`, `Setup SSH...`, and status), explaining the SSH Connection Configuration modal and key deployment workflow.
* **Task Description**: SSH Connection Help Documentation & Standard Dialog Help Icon:
  - Added standard Help Icon (`#sshConfigHelpIcon`) inside the `#sshConfigDialog` header in [settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html), positioned at the top-right corner (`position: absolute; right: 20px; top: 18px;`) with hover image switching (`images/questionmark_hover.png` / `images/questionmark_black.png`) and invoking `opener._callback('help', { name: 'SSH Connection' })`.
  - Created [HELP/SSH Connection.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/HELP/SSH%20Connection.html) styled identically to [HELP/Modified Files.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/HELP/Modified%20Files.html) to serve as input for the dynamic help viewer (`TEMPLATE_help.html`). Documents:
    - Trigger points for opening the dialog (Add Repo, Clone, Repository table `Fix` button).
    - Target server syntax (`username@host`).
    - SSH key management, default key fallbacks, and security guarantee (private keys strictly remain local; only public keys are deployed to the server).
    - Generating new passphraseless ED25519 key pairs with path suggestions.
    - Non-interactive connection testing (`Test login`) and deploying public keys (`Deploy public key`) to remote `authorized_keys`.
    - Saving key associations and repairing broken repository entries (`Save & Close`).
* **Task Description**: SSH Connection Configuration, Manual Key Generation & Repair Dialog:
  - Implemented unified SSH connection configuration dialog (`#sshConfigDialog`) in [settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html) with clean modal styling matching theme variables (`--header-color`, `--body-background`, `--body-text`).
  - Added dedicated manual key generation capabilities:
    - User can explicitly generate a new key pair at any time via `[Generate key...]` in `#sshConfigDialog`, which opens an inline panel `#sshConfigGeneratePanel` suggesting a unique non-colliding key path (e.g. `~/.ssh/id_ed25519_<server>` or `id_ed25519` if missing).
    - When connection test fails / returns `KEY_NEEDED`, both `[Deploy public key]` and `[Generate new key]` buttons are presented, ensuring the user is never restricted to merely deploying an existing key.
    - Implemented `generateLocalSshKey(keyPath)` and `getSuggestedNewKeyPath(targetServer)` in [ssh_folder/ssh-folder-lib.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js), generating modern ED25519 keys with secure permissions (`0o600`/`0o644`) and strict overwrite prevention.
  - Added full SSH configuration state, handlers, and key helpers in [ssh_folder/ssh-folder-lib.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js):
    - `parseSshUrl(sshUrl)`: Robust parser breaking down `ssh://user@host:port/path`.
    - `openSshConfigDialog(options)`: Opens dialog preconfigured for either an existing repository (`options.repoIndex`) or Add/Clone tabs (`options.mode`).
    - `updateSshConfigKeyDisplay(keyPath)`: Real-time key display, default key placeholder resolution, reset button visibility, and safety explanation (private key stays local; only public key is deployed to server).
    - `sshConfigSelectKey()`, `onSshConfigFilePicked()`, `sshConfigResetKey()`: Local key selection and reset.
    - `sshConfigTestLogin()`, `sshConfigDeployKey()`: Connection testing and automated public key installation with immediate re-verification.
    - `closeSshConfigDialog(save)`: Saves chosen key to `state.repos[idx].sshKey` (or Add/Clone inputs), persists `settings.json`, and triggers instant status re-check.
  - Added entry points across the application:
    1. **Repository table** in [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js): For broken SSH repositories (`reason` present on `ssh:` folder), standard `.smallButton` `Fix` button (no custom orange border) is rendered next to the warning label.
    2. **Immediate repair via `recheckRepoStatus(repoIndex)`** in [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js): Re-checks `fs_existsSync` with updated `sshKey`, updates `opener.cachedLocalStatus`, and immediately redraws the table, removing the warning and restoring the active radio button.
    3. **System Info tab** in [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js): Added `Configure SSH...` button under "Project folder" for proactive key management on active SSH repositories.
    4. **Add Repo & Clone tabs** in [settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html): Replaced cluttered multi-line key rows with clean single-row controls (`Test login` and `Setup SSH...` buttons). `Test login` reporting `KEY_NEEDED` dynamically presents a `[Setup SSH]` link opening the dialog.
  - Automated tests updated in [automated-tests/non_gui/ssh/test_06_ssh_lib_node.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/ssh/test_06_ssh_lib_node.js): All 84 tests across all 7 categories and 18 suites passing.
* **Task Description**: Repository Group Filter Persistence, Indicator Badge & Help Documentation:
  - **Harmoniserad Filterindikator (`blockTextHighlight`)** ([color_styles.css](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/color_styles.css), [settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js)):
    - Infört `.blockTextHighlight` / `.blockTextHighligt` och CSS-variabler i `color_styles.css` som harmoniserar med temats text- och bakgrundsskalor istället för skarp rent vit/svart kontrast.
    - I light mode: Mjukt grått block (`#DCDCDC`) med mörkgrå kant (`#888888`), mörk text (`#222222`), samt hover/focus (`#CBCBCB`, kant `#666666`).
    - I dark mode: Balanserat dämpat grått block (`#5E5D5B`) med kant (`#807E7B`), ljus text (`#DDDDDD`), samt hover/focus (`#6E6D6A`, kant `#A09E9B`).
    - Klasserna `filtered`, `blockTextHighlight`, `blockTextHighligt` sätts dynamiskt på `groupHeaderWrapper` vid aktivt filter. Tooltip och hover synkroniserade.
  - **Filterpersistens (`settings.json`) & Noll-träffars fallback** ([app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js)):
    - Infört `state.repoGroupFilter` (standard `'ALL'`) som sparas till `settings.json` via `saveSettings()`.
    - I `app.js`: `loadSettings()` läser in och validerar `state.repoGroupFilter`. Om filtret inte matchar några befintliga repon återställs det automatiskt till `'ALL'`.
    - I `settings.js`: `updateAllGroupDropdowns()` återställer aktivt filter från `state.repoGroupFilter`.
    - I `filterRepoTableByGroup(selectedGroup)`: Om antalet visade rader blir 0 och filtret inte är `'ALL'`, faller vyn automatiskt tillbaka till `'ALL'`, återställer dropdown-valet till `ALL`, visar alla rader, och sparar till `settings.json`.
    - I repomenyn (`app.js`): Om aktiv gruppvy i `buildRepoMenu()` har 0 tillgängliga repon faller menyn tillbaka till `'ALL'`.
  - **Hjälpdokumentation för Repository Groups** ([HELP/Settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/HELP/Settings.html)):
    - Utökat dokumentationen för "Group"-kolumnen:
      - Tilldelning och redigering: textinmatning med <kbd>Enter</kbd>/<kbd>Esc</kbd>, befintliga val via dropdown, samt borttagning via `None (Remove from group)`.
      - Filtrering i tabellhuvudet: `Group (All)`, `Ungrouped`, samt specifika namngivna grupper.
      - Persistent filter sparat i `settings.json` över sessioner.
      - Automatisk fallback till `Group (All)` om noll repon matchar.
      - Integration med huvudfönstrets repomeny och dess gruppindelade undermenyer.
    - Korrigerat och förtydligat kolumnordningen och dokumenterat "Web"-kolumnen.
* **Task Description**: Modulär automatiserad testsvit (Non-GUI), CI & ANSI-färger:
  - **Centraliserad test-setup & ANSI-färgstöd** ([automated-tests/test_setup.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/test_setup.sh), [automated-tests/test_setup.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/test_setup.js)):
    - Etablerat centrala delade moduler för ANSI-färgkodning och assertionshjälpare (`RED`, `GREEN`, `YELLOW`, `CYAN`, `BOLD`, `NORMAL`, `assert_pass`/`assertPass`, `assert_fail`/`assertFail`, `print_suite_result`/`printSuiteResult`).
    - Alla 8 `_run_tests`-skript (master + 7 kategorier) samt samtliga 18 testsviter sourcar/importerar från dessa centrala moduler (ingen kodduplicering).
    - GitHub Actions CI konfigurerat med `FORCE_COLOR: '1'` och `TERM: 'xterm-256color'` i [`.github/workflows/tests.yml`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/.github/workflows/tests.yml) så att färger återges korrekt i CI-loggarna.
  - **Modulär automatiserad testsvit (`automated-tests/non_gui/`)** på grenen `feature/automated-tests`:
    - Etablerat katalogstruktur med 7 självständiga testkategorier under `automated-tests/non_gui/`, där varje underkatalog har ett eget [`_run_tests`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/_run_tests) som endast kör den katalogens tester.
    - Alla testkörningar städar upp efter sig fullständigt i `/tmp` (inga kvarlämnade mappar eller `.git`-kataloger).
    - Alla `_run_tests`-skript är utrustade med användarbeskrivningar, starttidsstämpel (`Started at: YYYY-MM-DD HH:MM:SS TZ`) och `cliHelpLine`-aktivering (`--help`, `-h`).
    - Stöd för både kompakt 1-radssammanfattning med exakt pass/total-kvot `(X/X passed)` som standard och detaljerad realtidsutskrift via `-v` / `--verbose` med 2-raders förklaring av varje testsvits syfte.
    - Skapat 17 testsviter med totalt 78 tester över 7 kategorier:
      1. **`ssh/`** (6 sviter, 27 tester): Inloggning, nyckelhantering, mapp- och repovalidering, katalogskapande med mellanslag, fjärr-git via `ssh-git-client`, filöverföring via `ssh-put`/`ssh-get`, samt hjälpmodul i Node.js.
      2. **`utils/`** (2 sviter, 7 tester): Strängvalidering (`isEmptyString`), arraydeduplicering (`cleanDuplicates`), objektindexering (`findObjectIndex`), nyckel-värde-parsning (`parseKeyValuePairsFromString`), branch-sanitering (`branchCharFilter`) och dolda grenar (`isHiddenBranch`).
      3. **`git_client/`** (2 sviter, 7 tester): `simpleGitWithRetry` med automatisk återhämtning vid `index.lock`, exponential backoff, felutlösning vid lås-exhaustion, samt merge-konfliktsdetektering och standardkonfliktmarkörer.
      4. **`credentials/`** (2 sviter, 7 tester): Keychain- och hemlighetshantering (`pragma-secrets-lib` via `@hackolade/keytar`), samt fullständigt isolerad, säker testning av `pragma-credentials-lib` via sandlådad Git credential-helper utan beröring av macOS Keychain.
      5. **`git_configs/`** (1 svit, 9 tester): Syntaxvalidering och direktivtester för plattforms-gitconfigs (Mac, Linux, Windows, SSH-server).
      6. **`apis/`** (3 sviter, 12 tester): Offline URL-översättning, obligatoriskt internetanslutningstest via DNS (misslyckas med `[FAIL]` och felkod 1 vid saknad nätverksanslutning), live queries mot publika repon (`octocat/Hello-World`, `atlassian/aui`, `gitlab-org/gitlab-foss`), samt klass- och gettertester för `General_git_rest_api`, `github.com.js`, `gitlab.com.js` och `bitbucket.org.js`.
      7. **`app_function_calls/`** (2 sviter, 9 tester): Icke-grafisk affärslogik ur `app.js`: repo-inställningsreparation (`fixRepoSettingWithDefault`), decimal- och strängvalidering (`isDecimal`, `isNullOrWhitespace`), servertypidentifiering (`typeOfRepoServer`) och historikmeddelandeformatering (`formatHistoryMessage`).
    - Övergripande master runner i projektroten ([`_run_tests`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/_run_tests)) och i [`automated-tests/_run_tests`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/_run_tests) orkestrerar alla kategorier och visar en samlad statusrapport.
    - Dokumentationen [`automated-tests/README.md`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/README.md) översatt till engelska med strikt kodstandard: alltid skriva kodkommentarer, dokumentation och variabel-/funktionsnamn på amerikansk engelska.
    - Etablerat GitHub Actions CI-pipeline ([`.github/workflows/tests.yml`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/.github/workflows/tests.yml)) för automatisk körning vid push/PR på macOS och Linux, samt integrerat `"test": "./_run_tests"` i [`package.json`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/package.json).
* **Task Description**: SSH Key Selection, Distribution, Default Key & System Info "Project folder":
  - **Hjälpfiler i HELP-katalogen & UI-terminologi uppdaterade** ([HELP/Settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/HELP/Settings.html), [settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html)):
    - Korrigerat kolumnordningen i `HELP/Settings.html`:
      - 1:a: "Project folder"
      - 2:a: "Group"
      - 3:e: "Remote repository"
      - 4:e: "Set"
      - 5:e: "Forget"
    - Ändrat tabellhuvudet i `settings.html` från `Local folder` till `Project folder` för att tydliggöra att repot även kan ligga på en SSH-fjärrserver.
    - Harmoniserat strukturen och layouten mellan Clone- och Add Repo-flikarna:
      - Tillagt introduktionstext och rubriken `Add Repo` före undersektionerna `Local folder` och `Server folder`.
      - Uppdaterat Clone-fliken så att dess `Server folder`-sektion använder exakt samma strukturerade steg-för-steg-mall och server-switch som Add Repo.
      - Uppdaterat båda flikarna med `Local folder` och `Server folder` som tydliga underrubriker, där switch-kontrollen visas i respektive läge (local för Local folder, server för Server folder).
      - Komplett visning av serverpanelen i mockups: serveranslutning, SSH-nyckelval (`Select key...`, `✕`), inloggningstest (`Test login`, `Deploy public key`, status), samt åtgärdsknappar (`Clone` resp. `Add`).
      - Lagt till ett matchande "Workflow"-avsnitt för Add Repo strukturerat från topp till botten (switch-val, lokal mapphantering, serverinloggning/SSH och Add-knapp med repoinitiering) mallat efter Clone Workflow.
    - Dokumenterat alla ändringar sedan commit `c20042`:
      - Repository-tabellen: Ny kolumn "Group", SSH-märkning (`[ssh]`), felorsaker för otillgängliga repon (`key rejected`, `not a folder`, `not a repo`, `no network`).
      - Clone-fliken: Server-switch, server-inmatningar, SSH-nyckelval, Test Login, Deploy public key / Create key pair, samt automatisk katalogskapning på servern.
      - Add Repo-fliken: Server-switch, SSH-nyckelval, Test Login och Deploy public key.
      - System Info-fliken: Sektionen "Project folder" (med lokal privat nyckel och serverns public key), samt Git credentials med `credential.username` `(not set)` och `Clear`-knapp.
  - **Återställning av `authorized_keys` efter test**:
    - Återställde `~/.ssh/authorized_keys` från `authorized_keys.bak` efter användarens simuleringstest. Förklarat effekten av SSH `ControlMaster` (60s idle timeout) som orsakade fördröjningen innan `(key rejected)` visades.
  - **Val av befintlig SSH-nyckel & UI i Clone & Add Repo** ([settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html), [ssh_folder/ssh-folder-lib.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js)):
    - Infört en dedikerad rad för SSH-nyckel med fält, "Select key..."-knapp och återställningsknapp (`✕`) till Default.
    - Använder infödd filväljare (`<input type="file">`).
    - Stödjer både val av privat nyckel (t.ex. `id_rsa_jans_mac`) och publik nyckel (`.pub`).
    - Tydlig visualisering i UI: Informerar att *endast* den publika nyckeln skickas till serverns `authorized_keys`, medan den privata nyckeln hålls helt lokal och säker på datorn.
    - Om privat nyckel valts och `.pub` saknas, härleds den automatiskt lokalt via `ssh-keygen -y -f`.
    - Knappen heter "Deploy public key" (eller "Create key pair" om ingen nyckel finns ännu).
  - **Uppdaterat SSH-test och Nyckeldistribution** ([ssh_folder/ssh-test-login](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-test-login), [ssh_folder/ssh-generate-key-login](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-generate-key-login)):
    - `ssh-test-login <SSH_URL> [KEY_PATH]`: Accepterar anpassad nyckelsökväg och lägger till `-i "$KEY_PATH" -o IdentitiesOnly=yes` vid test mot servern.
    - `ssh-generate-key-login <user> <host> [keyname_or_path]`: Hanterar fullständiga sökvägar (t.ex. `/Users/...`, `~`, eller nyckelnamn i `~/.ssh/`), skapar saknad `.pub` vid behov, och överför den publika nyckeln via ControlMaster till `~/.ssh/authorized_keys`.
  - **Persistens i `settings.json` & `app.js`** ([app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js), [ssh_folder/ssh-folder-lib.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js)):
    - Global default key i `state.tools.defaultSshKey` (om satt av användaren).
    - Dynamisk sökning i `getDefaultSshKey()`: prioriterar `id_ed25519` -> `id_ecdsa` -> `id_rsa` -> alla giltiga nyckelpar med `.pub` i `~/.ssh/` (t.ex. `id_rsa_jans_mac`) -> fallback `~/.ssh/id_ed25519` om inga nycklar finns.
    - Per-repo inställning i `state.repos[i].sshKey` sparas vid clone och add av SSH-repon via `opener.saveSettings()`. Tom sträng `""` signalerar att standardnyckeln används.
  - **System Info "Project folder"-sektion** ([settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js)):
    - Ny sektion/rubrik "Project folder" placerad direkt ovanför "Current Remote".
    - Visar `Project path : <mappsökväg>`.
    - Om det är en SSH-server visas även:
      - `Private key (local) : <lokal privat nyckelsökväg>`
      - `Public key (server) : ssh://user@server:port/~/.ssh/authorized_keys`

---

### 🐛 Open / Historical Bugs
* **Bug**: `GitHub API error: rate limit exceeded` (HTTP 403) eller `Unauthorized` (HTTP 401) i `test_02_live_provider_query.js`.
  * *Root Cause & Remediation*: GitHubs oautentiserade REST API tillåter max 60 anrop/timme per IP-adress, medan utgångna eller återkallade tokens i lokal macOS Keychain ger HTTP 401 Unauthorized. Åtgärdat genom att (1) lägga till `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` i [`.github/workflows/tests.yml`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/.github/workflows/tests.yml) som höjer gränsen till 1 000 req/h i CI, (2) vidarebefordra `process.env.GITHUB_TOKEN` samt implementera `resolveGitHubToken()` i [`test_02_live_provider_query.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/apis/test_02_live_provider_query.js) som läser GitHub-token ur miljövariabler eller `git credential fill`, (3) implementera automatisk fallback till oautentiserad förfrågan om lokal token avvisas med 401, (4) testa mot det officiella publika testrepot `https://github.com/octocat/Hello-World.git`, och (5) isolera varje test med egen felhantering så att testerna alltid faktiskt körs och valideras live utan att behöva skippas.
* **Bug**: `Author identity unknown` (exit 128) under `test_04_ssh_git_client.sh` på nya CI-runners.
  * *Root Cause & Remediation*: Nya GitHub Actions-runners har varken global eller lokal `user.name`/`user.email` konfigurerad. Vid `git commit` över SSH misslyckades kommandot. Åtgärdat genom att konfigurera lokal testanvändare i testets temporära repo samt sätta global Git-användare i [`.github/workflows/tests.yml`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/.github/workflows/tests.yml).
* **Bug**: `unix_listener: cannot bind to path ~/.Pragma-git/.tmp/...: No such file or directory` under headless SSH-tester på CI (Ubuntu).
  * *Root Cause & Remediation*: I [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js#L290-L291) skapas `~/.Pragma-git/.tmp` automatiskt vid appstart, men i headless CI körs testerna utan att appen startats först. OpenSSH misslyckades med felkod 255 när socketen i `ControlPath` skulle bindas. Åtgärdat genom att förbereda katalogen (`mkdir -p ~/.Pragma-git/.tmp /tmp/pragma-git-ssh-folders`) i [`.github/workflows/tests.yml`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/.github/workflows/tests.yml).
* **Bug**: `ssh_folder/ssh-mkdir` misslyckades med att skapa fjärrkataloger vars namn innehöll mellanslag (t.ex. `repo with spaces`).
  * *Root Cause & Remediation*: I [`ssh_folder/ssh-mkdir`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-mkdir) kördes `eval $MKDIR` där stränginterpoleringen skalade bort citattecknen innan kommandot nådde den fjärranslutna shell-instansen över SSH. Det ledde till att kommandot delades upp i flera separata kataloger (t.ex. `repo`, `with`, `spaces`). Åtgärdat genom att omsluta sökvägen med säkra enkla citattecken (`'${SERVER_BASE_PATH}'`) som överlever överföringen till fjärrskalet. Upptäcktes och verifierades direkt av testsviten i [`test_03_ssh_mkdir.sh`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/ssh/test_03_ssh_mkdir.sh).
* **Bug**: `credential.username` skrevs automatiskt och felaktigt in i lokala `.git/config` på repon, vilket låste kontot och orsakade lösenordsdialoger vid URL-test / Set.
  * *Root Cause & Remediation*: I [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) anropade `saveSettings()` rutinmässigt `storeUsernameInLocalGitConfig()` vid varje ändring/stängning. Denna körde `git credential fill` via OS Keychain och skrev hårdkodat in `[credential] username = <användare>` i repots `.git/config`. Om `getLocalFolder` matchade fel repo eller om Keychain returnerade ett annat GitHub-konto låstes repot till fel användare, vilket ledde till 401/403 och lösenordsprompter vid Set/ls-remote. Åtgärdat genom att helt ta bort denna automatiska inskrivning, avaktivera `storeUsernameInLocalGitConfig`, samt förbättra System Info så att `credential.username` visas som *(not set)* när det inte är satt.
* **Bug**: `(key rejected)` skrevs över av `(no network)` vid SSH-autentiseringsfel.
  * *Root Cause & Remediation*: När `fs_existsSync` upptäckte `Permission denied` sattes `reason = 'key rejected'`, men därefter kördes ett ping-test med kommandot `ping ${servername}` (utan `-c 1`). På macOS avslutas aldrig standard-ping, vilket ledde till timeout efter 1000ms och att felhanteraren skrev över `reason` till `'no network'`. Åtgärdat genom att helt förbigå ping när `reason === 'key rejected'` (eftersom servern aktivt svarade med avvisning), använda `ping -c 1 -W 1` vid övriga fall, skicka med repots specifika SSH-nyckel, samt endast köra `typeOfRepoServer` om mappen faktiskt existerar.
* **Bug**: SSH-repositories blev gråmarkerade i huvudmenyn och rödmarkerade i Settings (`not a folder`).
  * *Root Cause & Remediation*: Hypotesen bekräftades fullt ut: `id_rsa_jans_mac.pub` hade raderats från `~/.ssh/authorized_keys` under tidigare manuella tester för att nolla remote ssh. Eftersom `~/.ssh/config` mappar `Host localhost` till `IdentityFile ~/.ssh/id_rsa_jans_mac` nekades alla anslutningar till `ssh://jan@localhost/` med `Permission denied (publickey)`. Den enda som fungerade var `ssh://jan@127.0.0.1/` eftersom den använde nyckeln `linus` (vars publika nyckel fanns kvar i `authorized_keys`). Åtgärdat genom att återställa `id_rsa_jans_mac.pub` i `~/.ssh/authorized_keys` samt rulla tillbaka de ändringar som blockerade appens uppstart och gjorde att inställningsikonen dröjde.
* **Bug**: `Permission denied` vid anrop av `ssh-test-login` efter flytt till `ssh-folder-lib.js`.
  * *Remediation*: Löst genom att sätta `+x` direkt på filen `ssh_folder/ssh-test-login` i filsystemet och köra skriptet standardmässigt (`${CWD_INIT}/ssh_folder/ssh-test-login "${sshUrl}"`) utan anrop inifrån JavaScript.
* **Bug**: Kloning till ny/icke-existerande mapp på server fungerade inte (fungerade bara till befintlig mapp).
  * *Remediation*: Implementerat samma SSH- och lösenordsfri inloggnings-setup som i Add Repo, anropar `opener.mkdir(folder)` och `cleanFolderName`, fixat `url.pathname`-felet (var `pathName`) i `gitClone`, och säkrat SSH-sökvägsseparatorer.
* **Bug**: "Store in same" (`amend_commit_checkbox`) respekterade inte avbockade filer i Changed Files-fönstret och committade allt eller kastade fel.
  * *Remediation*: Löst via realtidssynkning av `localState.unstaged`, `dataset.filePath`, synkning i `gitAddCommitAndPush`, samt fixat if-else grenstruktur för amend vs normal commit.
* **Bug**: Grupprubriken i Repository-tabellen tappade ordet "Group" när ett filter sattes och visade bara gruppens namn (t.ex. "Jan").
  * *Remediation*: Implementerat `.groupHeaderWrapper` med `#groupHeaderLabel` som dynamiskt växlar mellan "Group (All)" och "Group (filtered)" med tooltip.
* **Bug**: Knapparnas teckenstorlek krymptes oavsiktligt till 11px vid åtgärdande av kolumnkollisioner.
  * *Remediation*: Tog bort teckenstorleksregeln, återställde knapparnas standardfont och gav `.repoAction` 76px marginal.
* **Bug**: Vid smalt fönster överlappade text från Local folder radioknapparna, rubrikerna Remote och Action kolliderade, samt knapparna Set och Forget krockade.
  * *Remediation*: Låst kolumnbredder för radioknapp (28px), Web (36px), Set (60px) och Action (76px), fixat klassnamn i `<th>` och `<td>`, samt gett `.remoteURL textarea` 100% box-sizing.
* **Bug**: Stort tomrum mellan rubriken "Pragma-git info" och texten, samt för brett avstånd mellan kolumn 1 och 2.
  * *Remediation*: Flexbox-layout eliminerade glappet från float; `table-layout: auto` och `width: auto` håller kolumnerna tätt intill varandra.
* **Bug**: Branch-tabellen var för bred (spände över 100% så Delete-knapparna hamnade längst ut till höger).
  * *Remediation*: Sänkt `#branchesTable` bredd till 50%, i linje med Software-tabben.
* **Bug**: Textfält i Software-tabben var för breda eller för långt ifrån varandra.
  * *Remediation*: `.authorTable` håller ihop namn och e-post; `.systemToolsTable` (50% bredd) matchar fälten under Clone.
* **Bug**: Repomenyn fallerade när inga grupper var satta (t.ex. vid nyinstallation eller om alla repon saknade gruppnamn).
  * *Remediation*: Helt tätat i `app.js` och `settings.js`: ren flack fallback-meny, säker hantering av oinitierad statuscache och automatisk anpassning av UI i inställningar.
