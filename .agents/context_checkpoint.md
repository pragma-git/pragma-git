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
* **Investigate Cleanup Candidates**:
  - Investigated TODO/FIXME comments and unused imports/error handling across codebase.
  - Identified dead imports (`os`, `fs`, `pathsep`), unused constant (`delayInMs`), and obsolete TODO comment in [tagList.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/tagList.js).
  - Saved investigation findings and actionable cleanup plan to [.fix.md](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/.fix.md).

---

### 🐛 Open / Historical Bugs
* **Historical: Too many authentication failures in deployPublicKey**: When a user had multiple SSH keys in `~/.ssh`, `deployPublicKey` exhausted the remote server's `MaxAuthTries` before reaching password fallback. Fixed by capping candidate keys to 3 in `deployPublicKey`.
* **Historical: CI Flakiness on Gitea/HTTPS Network Blips**: Tests 2.4 and 2.5 failed intermittently on Windows runners when public third-party endpoints hung or threw transient network resets. Added timeouts, retries, and skip handling.
* **Historical: Handshake Timeouts on Loaded CI VMs**: macOS runner triggered `Timed out while waiting for handshake` in `ssh/test_07_ssh_key_generation.js`. Increased handshake and connection timeout to 10000ms.
* **Historical: Upstream Merge Draft Message Overwrite**: Fixed race condition in `_setMode('CHANGED_FILES')` erasing commit message during automated merge updates.
