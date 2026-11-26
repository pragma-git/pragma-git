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
* **Agent Guidelines & Pruning**:
  - Added strict pruning rules to [AGENTS.md](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/AGENTS.md) for `.agents/context_checkpoint.md` to keep it under 5 KB / ~1,000 tokens during `/compact` and task transitions.
  - Added mandatory rule to [AGENTS.md](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/AGENTS.md) requiring the agent to update `## Arkitektur` in `AGENTS.md` whenever major subsystems or components are added, refactored, or deprecated.
* **Next Task / Investigation**:
  - Continue testing and hardening the `.gitignore` editor in Settings for remote SSH repositories (`ssh://...`), specifically examining empty `.gitignore` behavior vs uncommitted `.gitignore` appearing in Changed Files.
* **Branch**: `feature/remove_WSL` (removal of WSL dependencies in favor of unified `ssh2` pool + Windows native Git Bash/CMD).
* **SSH .gitignore Flow Verified**:
  - Remote `.gitignore` uses `sshGet` to download to local temp location, edits/backups locally, and `sshPut` to upload back to server.
  - Retracking uses in-process `simpleGit` via `ssh-connection-pool.js`.
  - Confirmed working tree of `testOnMyMac` is clean and correctly tracking files.
* **SSH Terminal on Windows**:
  - Configured to use native Command Prompt (`cmd.exe /k ssh ...`) with Windows native key paths, avoiding WSL and mintty/PTY instability.
* **Editor Awareness**:
  - `sshFileBrowser.js` tracks `pragma-merge` built-in editor windows directly and avoids redundant `chokidar` watchers.

---

### 🐛 Open / Historical Bugs
* **Historical: Upstream Merge Draft Message Overwrite**: Fixed race condition in `_setMode('CHANGED_FILES')` erasing commit message during automated merge updates.
* **Historical: .gitignore Editor Initialization**: Fixed missing global variables (`gui`, `state`, `localState`) and search icon ID collision in `edit_ignore.html`.
* **Historical: getExecutableFlags on Windows**: Added index-based filemode check (`ls-files -s`) for Windows NTFS where POSIX executable bits are not reported by `fs.statSync`.
