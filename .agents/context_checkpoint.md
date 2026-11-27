### 🛠️ Tech Stack
* **Runtime & Framework**: NW.js (`0.100.1`) med Chromium och Node.js
* **Core Libraries**: `simple-git` (^4.0.2), `ssh2`, `ssh-config`, `@hackolade/keytar`, `chokidar`, `diff-match-patch`, `@toast-ui/editor`
* **Packaging & Signing**: `create-dmg`, macOS `codesign`, Apple `notarytool` / `stapler`
* **Coding Standard**: Always write code comments, documentation, and variable/function names in **American English**.

---

### 🏛️ Architecture & Files
* **Git Wrapper & In-Process SSH Executor (`lib/simpleGitWithRetry.js`)**: Proxy wrapper for `simple-git` providing retry logic on lock collisions and zero-subprocess in-process execution of `ssh://` repositories via `ssh_folder/ssh-connection-pool.js`.
* **SSH2 Connection Pool (`ssh_folder/ssh-connection-pool.js`)**: Persistent Node.js `ssh2` + SFTP connection pool (`global.__pragmaSshPool`) providing channel multiplexing across macOS, Linux, and Windows without WSL. Handles `~/.ssh/config` parsing, pure-JS ED25519 key generation, and remote `pragma-merge` / `GIT_ASKPASS` relay.
* **SSH Folder Integration (`ssh_folder/ssh-folder-lib.js`)**: Cross-platform SSH file/folder helpers (`fs_existsSync`, `fs_mkdir`, `sshGet`, `sshPut`, `sshLs`, `sshTestLogin`, `generateLocalSshKey`). On Windows, uses Git Bash executable detection and native `cmd.exe /k ssh ...` for interactive terminal sessions.
* **SSH Server File Browser (`sshFileBrowser.html`, `sshFileBrowser.js`)**: Remote file browser with folder navigation, `sshGet`/`sshPut` auto-sync via `chokidar` for external editors, and awareness of built-in `pragma-merge` editor.
* **Diff & Merge Engine (`merge/pragma-merge.js`, `merge/pragma-merge.html`, `pragma-merge`)**: Built-in 2-way/3-way diff/merge tool supporting local and remote SSH files.
* **Settings & .gitignore Editor (`settings.html`, `settings.js`, `edit_ignore.html`)**: Repository/Branch/Software configuration and remote/local `.gitignore` editing via `sshGet`/`sshPut` and in-process `simpleGit`.
* **Application Core & State (`app.html`, `app.js`)**: Main window, event loop, repository status polling, and state management.
* **Testing Suites (`automated-tests/`)**: Non-GUI tests (`automated-tests/non_gui/`) with ephemeral SSH servers (`ssh_test_server.sh`, `ssh_test_server.js`) and CDP-based UI tests (`automated-tests/ui/`).

---

### 📋 Current Status & Tasks
* **Safely Minimize deployPublicKey Attempts for fail2ban (maxretry=3)**:
  - Eliminated broad candidate key iteration in `deployPublicKey`. Only the selected `targetKeyPath` and (if different) the single primary default key (`id_ed25519`) are tried before falling back to password/keyboard-interactive auth.
  - Guarantees at most 1–2 key attempts, preventing `fail2ban` bans on servers with low fail thresholds.
  - Added real-time connection attempt counter (`#sshConfigAttemptsText`) inside `#sshConfigDialog`, displaying total connection attempts made during the dialog session with a visual warning when reaching 2+ attempts.
  - Verified with `node automated-tests/non_gui/ssh/test_07_ssh_key_generation.js` (9/9 passed) and `automated-tests/non_gui/ssh/_run_tests` (8/8 suites passed).
* **Flaky CI Fixes & Test Robustification**:
  - Investigated GitHub Actions CI failures across macOS, Linux, and Windows runners.
  - Added request timeout with `AbortController` in `fetchWithApi` (`apis_github_and_others/general_git_rest_api.js`) to prevent indefinite hangs on unresponsive third-party Git providers.
  - Robustified `test_02_live_provider_query.js` with retries and graceful handling/skipping on transient Gitea/HTTPS remote outages or rate limits.
  - Increased SSH handshake and connection timeouts in `ssh_folder/ssh-connection-pool.js` (`testLogin`, `exists`, `mkdirP`) to 10000ms for busy multi-core CI runner VMs.
  - Robustified `loadAuthorizedKeys` in `automated-tests/ssh_test_server.js` against file I/O contention on Windows.
  - Increased clone completion timeout in `test_01_ssh_clone_repo.yaml` to 60s for slower runner disks.
  - Verified with full local test run `npm test` (all 8 categories, 3 UI scenarios passed, 54s duration).
* **Branch**: `feature/remove_WSL` (removal of WSL dependencies in favor of unified `ssh2` pool + Windows native Git Bash/CMD).

---

### 🐛 Open / Historical Bugs
* **Historical: Too many authentication failures in deployPublicKey**: When a user had multiple SSH keys in `~/.ssh`, `deployPublicKey` exhausted the remote server's `MaxAuthTries` before reaching password fallback. Fixed by capping candidate keys to 3 in `deployPublicKey`.
* **Historical: CI Flakiness on Gitea/HTTPS Network Blips**: Tests 2.4 and 2.5 failed intermittently on Windows runners when public third-party endpoints hung or threw transient network resets. Added timeouts, retries, and skip handling.
* **Historical: Handshake Timeouts on Loaded CI VMs**: macOS runner triggered `Timed out while waiting for handshake` in `ssh/test_07_ssh_key_generation.js`. Increased handshake and connection timeout to 10000ms.
* **Historical: Upstream Merge Draft Message Overwrite**: Fixed race condition in `_setMode('CHANGED_FILES')` erasing commit message during automated merge updates.
