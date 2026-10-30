### 🛠️ Tech Stack
* **Runtime & Framework**: NW.js (`0.100.1`) med Chromium och Node.js
* **Core Libraries**: `simple-git`, `@hackolade/keytar`, `chokidar`, `diff-match-patch`, `@toast-ui/editor`
* **Packaging & Signing**: `create-dmg`, macOS `codesign`, Apple `notarytool` / `stapler`
* **Coding Standard**: Always write code comments, documentation, and variable/function names in **American English**.

---

### 🏛️ Architecture & Files
* **Application Core**: Huvudfönster och event-loop ([app.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.html), [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js))
* **Modified Files List**: Fönster för modifierade filer och filurval ([listChanged.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/listChanged.html), [listChanged.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/listChanged.js))
* **Settings Window**: Inställningsvy med tabbar för Repository, Branch, Software, System Info, Clone ([settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js), [settings.css](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.css))
* **SSH Folder Integration**: Hjälpskript och wrappers för fjärr-git över SSH ([ssh_folder/ssh-folder-lib.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js), [ssh_folder/ssh-git-client](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-git-client), [ssh_folder/ssh-mkdir](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-mkdir), [ssh_folder/ssh-generate-key-login](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-generate-key-login), [ssh_folder/ssh-test-login](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-test-login))
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
* **Fix Pragma-Merge Diff on SSH-folder Repositories**:
  - Investigated why clicking "diff" for a modified file on an SSH-folder repo failed to open `pragma-merge` on Windows/WSL:
    1. WSL `TMP` directory mismatch: `pragma-merge` and `ssh_folder/ssh-close-pragma-merge-ssh` previously relied on `${TMP/\/home/\/mnt\/c\/Users}`. When WSL runs as `root` (or with different usernames), the path evaluated to `/root/.Pragma-git/.tmp`, which the Windows NW.js process watching `%USERPROFILE%\.Pragma-git\.tmp\pragma-merge-running` never detects. Added Windows profile resolution via `cmd.exe /c "echo %USERPROFILE%"` and `wslpath -u`.
    2. Missing SSH options: In `ssh_folder/ssh-git-client`, lines checking if the server signal file exists (`test -f '$FILE_LIST_ON_SSH'` and `test -f '$REMOTE_ASKPASS_SIGNAL_FILE'`) invoked `ssh -p $PORT "$SERVER"` without `$SSH_OPTIONS`. Added `$SSH_OPTIONS` so repository-specific or selected keys are included.
    3. Server executable permissions: In `ssh_folder/ssh-put-simple`, added automatic `chmod +x` after uploading `pragma-merge` or `pragma-askpass` to the remote server.
* **Fix `spawn C:\Windows\system32\cmd.exe ENOENT` on Windows in `multiPlatformExecSync`**:
  - Identified the root cause of `Error: spawn C:\Windows\system32\cmd.exe ENOENT` when clicking "Deploy public key":
    - In [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) (`multiPlatformExecSync`), lines 7074-7076 unconditionally set `options = { cwd: folder, timeout: timeoutInMs }` whenever `mode === 'timeout'`.
    - When `folder` is a virtual SSH repository URL (such as `ssh://jan@130.239.99.15/`), setting `options.cwd` to that string passes a non-existent directory path to Node.js's underlying `child_process.exec()` / `spawn()` call.
    - On Windows, libuv / `CreateProcess` returns path-not-found for an invalid `cwd`, which Node.js surfaces misleadingly as `Error: spawn C:\Windows\system32\cmd.exe ENOENT` (as if `cmd.exe` could not be found).
    - Fixed by ensuring `options.cwd` is only assigned when `folder` is a real local folder (`!folder.startsWith('ssh:')`), and only assigning `options.timeout = timeoutInMs` when `mode === 'timeout'`.
* **Windows WSL SSH-folder Key Sync & Centralized SSH Options (branch `wsl-ssh-cleanup`)**:
  - Re-architected Windows/WSL SSH folder key handling starting clean from `57d171c4` (preserving the `0b6fb62e` master connection unhang fix):
    - Added [`ssh_folder/ssh-sync-keys`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-sync-keys): One-way mirrors Windows `%USERPROFILE%\.ssh` into a clean native WSL `$HOME/.ssh` with strict permissions (`0700` dir, `0600` private keys, `0644` public keys and `known_hosts`). Excludes `config` (to prevent Windows-style path breakage) and `authorized_keys`.
    - Added `syncSshKeysToWsl()` in [`ssh_folder/ssh-folder-lib.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js): Computes a file size & mtime signature of `%USERPROFILE%\.ssh` and only triggers `wsl ssh-sync-keys` when switching to an SSH repository, opening SSH connection setup, or after generating/selecting a key. Completely eliminates per-call key synchronization overhead during git operations.
    - Centralized key options in [`ssh_folder/lib/ssh-functions`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/lib/ssh-functions): Resolves `PRAGMA_SSH_KEY` environment variable into `SSH_KEY_OPTIONS` (`-i "$SSH_KEY_PATH" -o IdentitiesOnly=yes`) and appends it to `SSH_OPTIONS`. Also appends the key basename to `CONTROLPATH` to ensure isolated multiplexed connections per key.
    - Stripped redundant key-parsing arguments across [`ssh_folder/ssh-test-login`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-test-login), [`ssh_folder/ssh-test-if-file-exists`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-test-if-file-exists), and [`ssh_folder/ssh-generate-key-login`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-generate-key-login).
    - Added `sshKeyEnv()` helper in [`ssh_folder/ssh-folder-lib.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js) and integrated it into `multiPlatformExecSync()` and `simpleGit()` in [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) (forwarding `WSLENV=PRAGMA_SSH_KEY` on Windows).
    - Preserved key comments as `${username}@${hostname} (pragma-git)` and set `nwworkingdir` to `~/.ssh` for key picker dialogs.
    - Added comprehensive automated test suite [`automated-tests/non_gui/ssh/test_08_ssh_sync_keys.sh`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/ssh/test_08_ssh_sync_keys.sh). All 7 test categories, 21 suites, and 118 automated tests passed 100%.
* **SSH Master Connection Timeout on Key Deployment (`ssh-generate-key-login`)**:
  - Identified cause for the 60000ms timeout when clicking "Deploy public key" in SSH Connection Setup:
    - Backgrounded SSH master process (`ssh -o ControlMaster=yes ... &`) was launched with inherited standard input and without explicit host key acceptance. If OpenSSH prompted for terminal input (such as an unknown host fingerprint or terminal TTY fallback), background subshell processes receive `SIGTTIN` or block indefinitely.
    - Also, stale control socket files (`/tmp/ssh_mux_${REMOTE_USER}_${REMOTE_HOST}`) from previous aborted attempts could block subsequent connection attempts.
    - In [`ssh_folder/ssh-generate-key-login`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-generate-key-login):
      - Added `rm -f "$CONTROL_SOCKET"` prior to starting master connection.
      - Added `< /dev/null` redirection on `ssh -o ControlMaster=yes ...` so the background process never hangs on stdin.
      - Added `-o StrictHostKeyChecking=accept-new` to automatically accept and trust new remote host fingerprints on first connect without stalling.
* **SSH Key Deployment on Windows WSL (`/root/.Pragma-git/.tmp` error)**:
  - Fixed `Error: multiPlatformExecSync error: = Error: tee: /root/.Pragma-git/.tmp/pragma-git-log.txt: No such file or directory` when clicking "Deploy Key" on Windows:
    - In [`ssh_folder/lib/ssh-functions`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/lib/ssh-functions): Enhanced WSL path resolution when WSL runs as `root` (or any username where `$HOME` is not `/home/...`). Dynamically retrieves `%USERPROFILE%` via `cmd.exe` and converts it with `wslpath -u` to map to the Windows user profile directory. Added guaranteed directory creation `mkdir -p "$TMP"` with fallback to `/tmp`.
    - In [`ssh_folder/ssh-generate-key-login`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-generate-key-login): Ensured `mkdir -p "$(dirname "$PRAGMA_LOG")"` is executed before logging redirection, and safeguarded the `tee -a` redirect subshell so logging I/O failures do not abort key generation or deployment.
* **SSH Connection Setup Text Wrapping & Dialog Layout**:
  - Fixed horizontal scroll bar bug caused by long warning/notice texts in the SSH Connection Configuration dialog (`#sshConfigDialog`):
    - Replaced the global `.keyValueTable` single-line `white-space: nowrap` inheritance on the second column with explicit `white-space: normal !important`, `word-wrap: break-word`, `overflow-wrap: break-word`, and `table-layout: fixed !important`.
    - Added word-wrapping rules to all SSH warning/status elements (`#sshConfigKeyNotice`, `#sshConfigStatusText`, `#sshConfigGenerateStatus`, `#sshKeyNotice_add`, and `#sshKeyNotice_clone`).
    - Configured dialog width constraints (`width: 560px; min-width: 480px; max-width: 90vw; box-sizing: border-box;`) ensuring it fits naturally on smaller screens and Windows without triggering horizontal scrolling.
* **Live Remote & SSH Status Synchronization in Settings**:
  - Fixed offline SSH repos erroneously remaining green in the Settings window when network is disconnected: in `app.js` (`cacheRemoteOriginStatus()`), when an SSH project folder is offline (`!localExists`), marked `isActiveRemote[i] = false` and `reason[i] = 'SSH project folder offline'` so its remote URL status updates to red alongside local repositories.
  - Implemented dynamic live remote status updating in the open Settings window without table rebuilding or focus disruption:
    - In `settings.js`: added `updateRemoteStatusColors()` which iterates over existing rows and updates each remote URL textarea's class (`green` vs `red`) and tooltip reason (`title`) in-place without touching user input or selection. Also sets tooltip `title` on initial table generation.
    - In `app.js`: invoked `settings_win.window.updateRemoteStatusColors()` whenever a remote status check settles (both during stream processing and after batch completion) if Settings is open. Avoided focus stealing by not calling `updateSettingsRepoTable()`, keeping user focus intact in the Settings window.
  - All automated test suites (7 categories, 20 suites, 110 tests) pass 100%.
* **Windows WSL Missing Detection & SSH Failure Diagnostics**:
  - Implemented automatic WSL detection on Windows (`isWslAvailable()` using `where wsl.exe` with caching and reset helper) in [`ssh_folder/ssh-folder-lib.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js).
  - Scoped Windows-specific WSL warnings strictly to explicit SSH user interactions rather than background probing/caching:
    - **Selecting an SSH server repository**: In `app.js` (`clickedRepoContextualMenu`) and `settings.js` (`repoRadiobuttonChanged`), when switching to an SSH repository, checks WSL on Windows and displays a friendly dialog explaining that WSL is needed to connect, resetting the selection to the prior repository.
    - **Configuring a new SSH repository**: In `settings.js` (`addRepoButtonPressed` and `cloneButtonPressed`), if `folder.startsWith('ssh:')` (both direct path entry and Server toggle UI) and WSL is missing on Windows, alerts the user before creating folders or running git commands.
    - **Testing or deploying SSH keys**: In `ssh-folder-lib.js` (`testSshKeyLogin`, `deploySshKey`, `sshConfigTestLogin`, `sshConfigDeployKey`), checks WSL on Windows and displays `✗ WSL is required on Windows (run "wsl --install" in PowerShell)` inline in the status label.
    - **Silent background probing**: In `ssh-folder-lib.js` (`fs_existsSync`), failures during background existence checks and settings table status probing catch missing WSL errors silently and mark `fs_existsSync.lastReason = 'wsl missing'` without showing any popup dialogs.
  - Refined cross-platform connection failure distinctions:
    - In `ssh-test-login`: Checks for empty/missing server hostname (`STATUS:ERROR: Missing host/server in SSH URL`) before invoking SSH.
    - Accurately reports host not found / DNS resolution (`STATUS:ERROR: Could not resolve hostname (<server>)`), connection refused / wrong port (`STATUS:ERROR: Connection refused on port <port>`), connection timeout (`STATUS:TIMEOUT`), key authentication rejected (`STATUS:KEY_NEEDED`), and successful login (`STATUS:OK`).
  - Updated documentation in [HELP/SSH Connection.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/HELP/SSH%20Connection.html) with a dedicated "Windows Platform Requirements" section explaining WSL and `wsl --install`.
  - Added automated test in [automated-tests/non_gui/ssh/test_06_ssh_lib_node.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/ssh/test_06_ssh_lib_node.js) verifying `isWslAvailable`. Master test suite passes 100% across all 7 categories (20 suites, 110 passed tests).
* **Remote Status Startup Flashing Fix (`cacheRemoteOriginStatus`)**:
  - Fixed premature display of red `"Remote : remote error"` indicator in the bottom footer on startup ([app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js)).
  - Initialized `newCachedRemoteOrigins.isActiveRemote` with `null` instead of `false` so unverified/checking remotes are not treated as failed.
  - When background verification completes (`testRemoteOrigin` or error handling), `cachedRemoteOrigins.isActiveRemote` is updated and calls `_update()` if the repository is the currently selected active repo (`state.repoNumber`), ensuring the footer updates only when an actual result is known.
  - All 109 automated tests pass 100% across all 7 test categories.
* **Interactive Visual Map & Modern Help Guide (`about.html`)**:
  - Fixed initial dark mode theme initialization in [`about.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/about.html): removed `class="light"` when dark mode is active (`document.body.classList.remove('light'); document.body.classList.add('dark');`), preventing `body.light` CSS specificity from overriding dark mode titlebar colors (`#303030`) on initial window open.
  - Overhauled [`about.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/about.html) with an authentic **Interactive UI Map** embedding the real CSS stylesheets ([`color_styles.css`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/color_styles.css), [`style.css`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/style.css), [`slider_switch.css`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/slider_switch.css), and [`lib/css-tooltip.css`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/lib/css-tooltip.css)) and the exact `#grid-container` structure directly derived from [`app.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.html).
  - Encapsulated the mockup in a standalone window frame (`.mockup-window-wrapper`) with rounded corners, subtle drop shadow, and a contrasting inset canvas background so it clearly reads as a miniaturized standalone window.
  - Dynamically synchronizes titlebar colors and icons via `updateMockupTitlebarColors()`, `window.onThemeChanged`, a `MutationObserver` on `document.body` class list, and CSS theme scoping (`body.dark #mockup-frame .top-titlebar, body.dark #mockup-frame .bottom-titlebar { background-color: #303030 !important; }` and `filter: var(--titlebar-icon-filter) !important`) so switching between light and dark mode while [`about.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/about.html) is open instantly updates the mockup header, footer, and icons.
  - Fixed CSS parsing bugs in [`style.css`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/style.css) where unit-less numbers (`right: 80`, `right: 115`, `right: 150`, `right: 175`, and `bottom: 5; right: 5` on `#amend_commit_div`) caused Chromium to discard offsets; added `px` units to restore exact bottom-right alignment for Revert, Cherry-pick, Stash, Stash Pop, and Amend checkbox.
  - Corrected DOM and computed CSS: matched the exact 148px height (`grid-template-rows: 33px 82px 0px 33px`), resolved grid-container hierarchy so `#bottom-titlebar` spans full width (`grid-column: 1 / 4`), applied textarea border and background tokens (`--message-border`, `--message-background`, `--message-shadow`), and populated authentic SVG CI badge, branch name (`main`), repository name (`Hello World`), commit hash (`#a1b2c3d`), and modified files status (`Modified = 2 | New = 0 | Deleted = 0`).
  - Clicking any element on the visual map instantly scrolls and pulses the corresponding help card below.
  - Overhauled help topic contents and visuals:
    - **CI Status**: Clarified that CI badges are not color-coded but styled with native titlebar text/stroke themes; differences are communicated purely via shape and outline (solid rectangle for Passed, cracked/fractured for Failed, dashed rectangle with ellipsis for In Progress).
    - **Store Button Appearance**: Configured `.card-title-button` to display blue (`#2b70ca`) in light mode and white (`#ffffff` with dark text) in dark mode, matching the application's actual dark mode button styling.
    - **Sidebar Group Titles**: Increased visibility of `.nav-group-title` by binding to `var(--header-color)` (`#2F5496` in light mode, `#d6b51d` gold in dark mode) with full opacity.
    - **Light Mode Icon Coloring**: Applied `var(--titlebar-icon-filter, brightness(0.35))` to sidebar and help card icons in light mode so they display in charcoal/dark styling matching the titlebar, while remaining clean and un-inverted in dark mode.
    - **Sidebar CI Badge Alignment**: Refined the CI badge in the sidebar navbar (`.nav-ci-badge`) by shifting it up 1.5px and left 3px, and halving the margin gap to the "CI Status Badge" label so it aligns naturally with the other navigation icons.
    - **Dropdown Arrow Aspect Ratios**: Fixed arrow distortion for repository and branch switchers in both navbar sidebar (`.nav-item img[src*="dropdown-arrow"]`) and documentation cards (`.card-title img[src*="dropdown-arrow"]`) by ensuring `width: auto` and `object-fit: contain` preserve their natural aspect ratio (`48:69`, aspect ratio ~0.696) without stretching horizontally. Enforced `height: 16px !important; width: auto !important; object-fit: contain;` on `#mockup-frame #top-titlebar-repo-arrow` and `#mockup-frame #top-titlebar-branch-arrow` to guarantee identical crisp rendering with `app.html`.
    - **Unified Highlight Navigation**: Connected the sidebar navigation click handler (`selectNav()`) directly to `highlightHelpTopic(targetId)`, guaranteeing identical visual highlight, pulse effect, and smooth scrolling whether clicking any control in the mockup window or selecting any topic in the sidebar navigation menu.
    - **Amend Last Commit Header**: Updated header format to `[ ] Store in same` with a checkbox element (`<span class="card-title-checkbox"><input type="checkbox" disabled> Store in same</span> (Amend Last Commit)`).
    - **Tag Revisions**: Added explicit documentation that opening the Tag Manager allows checking out any old tag directly.
    - **History Navigation & Returning to HEAD**: Accurately documented that you navigate back in history using the **▼ (Down Arrow)** and forward toward newer commits using the **▲ (Up Arrow)**; documented that clicking **^HEAD** in the top header (where `^` symbolizes the up arrow) instantly returns to HEAD and restores the active mental scratchpad note.
  - Keeps [`app.js`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js) and [`app.html`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.html) 100% unharmed and standard; main window operations remain completely uninhibited.
  - Added responsive two-column layout (sidebar navigation + live search + categorized cards).
  - All 109 automated tests pass 100% across all 7 test categories.
* **Repository-Specific Mental Note Memory (`draftMessage`)**:
  - Implemented per-repository draft mental notes in `#message` ([app.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.html), [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js)).
  - Updated empty-state placeholder in `#message` to direct prompt: `"You may write what is ongoing here,\n\nChange text to commit message (or stash name) when done"`.
  - Fixed returning to HEAD from historical commits (`upArrowClicked`): cleared historical commit text from DOM before computing mode in `_setMode('UNKNOWN')`, ensured `NO_FILES_TO_COMMIT` always synchronizes placeholder and value, and updated `restoreRepoDraftMessage` to immediately restore draft note/placeholder without requiring a second up-arrow click.
  - Mental notes persist per repository across repo switches, branch changes, and app restarts (`settings.json`).
  - Browsing `HISTORY` displays past commit log messages; returning to `HEAD` (via `▲` or up-arrow) restores the repo's mental note.
  - Making a commit (`gitAddCommitAndPush`) clears the active repo draft note.
  - Added full test coverage in [test_01_repo_settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/app_function_calls/test_01_repo_settings.js) and [test_04_draft_message.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/app_function_calls/test_04_draft_message.js). All 109 automated tests pass across all 7 categories.
* **Automated Test Runner & SSH Key Generation Test Suites**:
  - Added failed test collection and end-of-run summary in `automated-tests/_run_tests`.
  - Added isolated SSH key generation automated tests (`test_07_ssh_key_generation.js`), passing 100/100 tests across all 7 categories.
* **Titlebar Icon Alignments & CI Badge**:
  - Resolved a CSS syntax error (an extra `}`) in `style.css` which had caused the browser to ignore subsequent titlebar icon rules (`top-titlebar-tag-icon`, `top-titlebar-close-field`, minimize, and close icons).
  - Restored exact horizontal and vertical positions for close (`x`), minimize (`-`), and action buttons (`tag`, `push`, `pull`, `merge`, `branch`).
  - Verified exact vertical centering of the CI badge with the notes icon (`centerY = 15.7px`).
  - All 92 automated tests across 7 categories pass 100%. Pushed to `origin/develop` (`298ae6a7`).
* **Cracked CI Badge (V2 Split Fracture)**:
  - Implemented the V2 broken CI design split into two independent SVG pieces with a stroked fracture line, matched typography, subpixel geometry, light/dark mode support, and removed the red dot and strike line.
  - Verified locally (100% test pass rate, 92/92 tests) and pushed to `develop`.
  - **Ongoing Test (Pending) Active Polling & Post-Push Workflow** ([app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js)):
    - Immediately on push, displays the `pending` badge (`CI ...`) and initiates an automated polling sequence (every 3-4 seconds, up to 40 attempts / 2 minutes) until CI check runs are registered and reach terminal status (`success` / `failure`).
    - Added recursive auto-polling in `queryCommitCiStatus` whenever `ciResult.status === 'pending'`.
    - Avoided stale 30s debouncing on in-flight / pending checks so state transitions appear dynamically in real time.
  - **Fixed Credential Lookup for Normalized Provider URLs** ([lib/pragma-credentials-lib.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/lib/pragma-credentials-lib.js), [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js)):
    - Fixed a bug where `util.findObjectIndex` returned `null` on URL mismatch, causing `null < 0` to evaluate to `false` and skipping clean normalized URL matching. As a result, unauthenticated API calls were made that failed with `403 Forbidden` and hid the badge.
    - Updated `getLocalFolder` to properly check `null`/`undefined` and retrieve the Keychain token, and updated `queryCommitCiStatus` to pass `rawRemoteUrl` directly to `gitProvider`.
  - **Enhanced Visibility for Pending Badge** ([style.css](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/style.css)):
    - Updated `.top-titlebar-ci-pending` to `color: rgba(255, 255, 255, 0.8)` and `border: 1px dashed rgba(255, 255, 255, 0.45)` for high readability in dark mode.
  - **CI Placeholder & Fixed Notes Alignment** ([app.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.html), [style.css](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/style.css)):
    - Positioned CI badge in fixed placeholder with 5px gap from branch, keeping personal notes icon stationary across all CI states.
  - **Ubuntu CI Runner Optimization** ([.github/workflows/tests.yml](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/.github/workflows/tests.yml)):
    - Optimized `Install System Dependencies (Linux)` by:
      - Attempting direct installation from pre-cached package indexes first, falling back to `apt-get update` only on failure.
      - Adding `--no-install-recommends` to eliminate downloading unnecessary desktop GUI libraries (GTK4, Cairo, GStreamer, Pinentry-GNOME3).
      - Switching from C-header package `libsecret-1-dev` to runtime library `libsecret-1-0` (matching `@hackolade/keytar`'s precompiled binary requirement).
    - Reduces the Ubuntu setup step from 29 seconds to ~4–5 seconds.
  - **Windows CI Runner with WSL & OpenSSH** ([.github/workflows/tests.yml](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/.github/workflows/tests.yml)):
    - Verified codebase Windows git vs WSL execution model:
      - Local repository operations execute via Windows Git (`git.exe` / `bash.exe` in `C:\Program Files\Git`).
      - SSH remote repository operations execute via WSL (`wsl` running `ssh_folder/ssh-git-client`).
    - Added `windows-latest` to GitHub Actions workflow matrix.
    - Integrated `Vampire/setup-wsl@v7` installing Ubuntu-22.04 with `openssh-server`, `git`, and `curl` with rootfs caching enabled.
    - Automated Windows OpenSSH Server (`sshd`) and WSL SSH service startup with administrator ACL configuration for passwordless local testing.
    - Fixed PowerShell 5.1 compatibility on Windows runner by removing bash `||` operator from PowerShell script and piping SSH keys directly to `wsl bash -c`.
    - Updated `.gitattributes` to enforce LF line endings on `*.sh` and `_run_tests` scripts to prevent CRLF parsing errors on Windows checkouts.
    - Cross-platform test enhancements:
      - Sanitized `CURRENT_USER` across all test suites to strip Windows domain prefixes (`DOMAIN\user` -> `user`).
      - Updated `test_01_simple_git_retry.js` to use `os.tmpdir()` instead of hardcoded `/tmp`.
      - Updated `test_02_credentials_lib_safe.js` to normalize temp store paths to forward slashes, invoke Git Bash on Windows via `options.shell`, and use `!sh` command wrapper with `NUL` device.
      - Configured Windows OpenSSH server to launch incoming SSH sessions into `C:\Program Files\Git\bin\bash.exe` and added `~/.ssh/config` with `UserKnownHostsFile /dev/null` for localhost loopback reliability.
      - Removed temporary MINGW socket multiplexing bypass in `ssh_folder/lib/ssh-functions`: restored standard `REUSE_SSH_OPTIONS` since Windows SSH repos route through WSL where native Linux socket multiplexing works properly.
      - Fixed transient test 2.4 timeout in `automated-tests/non_gui/apis/test_02_live_provider_query.js`: switched from heavyweight `gitlab-foss` repo to official lightweight `gitlab-test` repo and added `GIT_TERMINAL_PROMPT: '0'`.
      - Fixed SFTP `/tmp` path resolution on Windows CI (`.github/workflows/tests.yml`, `ssh_folder/ssh-put`, `ssh_folder/ssh-get`): Windows OpenSSH native `sftp-server.exe` resolves `/tmp` to `C:\tmp` (or `D:\tmp`), whereas Git Bash routes `/tmp` to `%LOCALAPPDATA%\Temp`; created NTFS directory junctions at `C:\tmp` and `D:\tmp` pointing directly to `$env:LOCALAPPDATA\Temp`, eliminated stdout pollution in `ssh-get`, and safely quoted remote mkdir in `ssh-put`.
  - **WSL Linux SSH Daemon & Remote Execution Alignment** ([.github/workflows/tests.yml](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/.github/workflows/tests.yml), [automated-tests/setup_wsl_ssh.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/setup_wsl_ssh.sh), [automated-tests/non_gui/ssh/_run_tests](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/ssh/_run_tests)):
    - Aligned Windows testing architecture with real-world Pragma-git usage (where SSH repos always connect to remote Linux/Unix servers through WSL):
      - Disabled Windows native `sshd` so port 22 is reserved for WSL Linux `sshd`.
      - Added [`automated-tests/setup_wsl_ssh.sh`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/setup_wsl_ssh.sh) to configure matching user (`runneradmin`) in WSL Ubuntu 22.04 with passwordless sudo, ED25519 authentication keys, `/etc/wsl.conf` boot command (`service ssh start`), and start Linux OpenSSH service inside WSL as the authentic Linux SSH server target.
      - Added persistent detached background process in Windows workflow (`Start-Process wsl -ArgumentList "sleep","infinity" -WindowStyle Hidden`) so WSL VM and its daemons remain alive across steps without idle timeout.
      - Updated `ssh/_run_tests` on Windows to explicitly refresh WSL SSH daemon via `wsl -u root service ssh restart`, route `.sh` test scripts through `MSYS_NO_PATHCONV=1 wsl -u "${CURRENT_USER:-runneradmin}" bash "$wsl_path"`, and execute `.js` unit tests (`test_06_ssh_lib_node.js`) in native Node.js without MSYS path collision.
  - **Cracked / Split CI Failure Icon & Theme Support** ([app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js), [style.css](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/style.css), [automated-tests/non_gui/app_function_calls/test_03_ci_cache.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/app_function_calls/test_03_ci_cache.js)):
    - Implemented vector SVG representation for CI status badges:
      - **Unbroken (Success / Pending)**: Solid rounded box (`rx="3"`) with matched 6.5px outer margins and 8.5px inner corridor between C and I, aligned on identical vertical centerline (`dominant-baseline="central"`).
      - **Broken (Failure)**: Split into two independent pieces (`ci-piece-left` holding C, `ci-piece-right` holding I) with an authentic zigzag fracture line matching the 1px border stroke and fill. The right piece is dropped (1.2px) and tilted (1.8°) to create a cracked effect.
      - Removed the legacy diagonal strike-line (`.top-titlebar-ci-strike`) and red dot (`.top-titlebar-ci-dot`).
      - Full Light & Dark Mode support: Uses `currentColor` with `fill-opacity` and `stroke-opacity` to adapt dynamically to titlebar themes across both dark and light modes.
    - Master test suite passing 100% across all 7 categories (19 suites, 92 passed tests).

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
