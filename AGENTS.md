<!-- 
Detta är en AI-guide (AGENTS.md) genererad för Pragma-git.
Den innehåller instruktioner för arkitektur, byggkommandon, tester och regler för AI-assistenter.
-->

## Agent Rules / AI Context
- AT THE START OF A SESSION (or after a chat clear), your very first action MUST be to read `.agents/context_checkpoint.md` to load the current workspace state. Do not make assumptions before reading this file.
- You MUST automatically update the context checkpoint file at `.agents/context_checkpoint.md` in the workspace at the end of each response, eller närhelst koden ändras, för att upprätthålla en källa till sanning för kodbasens kontext.
- **Git Commits:** The agent MUST NEVER run `git commit` on its own. Always prepare, edit, and test changes in the working tree, and wait for the user to explicitly request a commit or ask for a commit message.
- **Atomic Commits with Documentation:** When modifying code or tests together with `.agents/context_checkpoint.md` or any other documentation, ALWAYS stage both the code/test changes and the documentation together for the commit. Never make separate standalone commits for context checkpoint/documentation updates unless only documentation was changed.

Checkpoint-filen `.agents/context_checkpoint.md` måste följa denna detaljerade mall:

```markdown
### 🛠️ Tech Stack
* **Runtime & Framework**: ...
* **Core Libraries**: ...
* **Packaging & Signing**: ...

---

### 🏛️ Architecture & Files
* **Component Name**: Description ([File](file:///path/to/File))

---

### 📋 Current Status & Tasks
* **Task Description**: Current state, details, etc.

---

### 🐛 Open / Historical Bugs
* **Bug**: Description and remediation.
```
Se till att redigera/uppdatera `.agents/context_checkpoint.md` med filredigeringsverktygen närhelst ändringar görs under sessionen.

---

## Arkitektur
* **Runtime**: NW.js (`0.100.1`) som kombinerar Chromium och Node.js för skrivbordsmiljö.
* **Huvudfönster**: `app.html` och `app.js` utgör appens huvudgränssnitt och orkestrerar Git-operationer, dialoger och vyer.
* **Git Wrapper & Proxy (`lib/simpleGitWithRetry.js`)**: Central proxywrapper för `simple-git` som hanterar retry-logik vid fillås, normaliserar CommonJS-anrop för v4, och injicerar säkerhetsflaggor (`allowEnvironment`, `unsafe.*`).
* **Filurval & Modifierade filer**: `listChanged.html` och `listChanged.js` hanterar presentation och val av ändrade/uncommitted filer för commits.
* **Inställningsfönster**: `settings.html` och `settings.js` tillhandahåller konfiguration för Repository, Branch, Software, System Info, SSH-inställningar och Kloning.
* **Diff & Merge Engine**: `merge/pragma-merge.js`, `merge/pragma-merge_iframe.html` och `pragma-merge` sköter 2-vägs/3-vägs interaktiv diff och merge mot lokala och virtuella remote SSH-filer.
* **SSH Folder Integration**: `ssh_folder/` innehåller wrappers för git över SSH (`ssh-git-client`, `ssh-folder-lib.js`), central nyckelupplösning (`lib/ssh-functions`), nyckelgenerering/distribution (`ssh-generate-key-login`, `ssh-test-login`) samt automatisk spegling av Windows-nycklar till WSL (`ssh-sync-keys`).
* **Git Provider APIs**: `apis_github_and_others/` tillhandahåller abstraktionslager mot GitHub, GitLab och Bitbucket REST APIs med commit CI-statusfrågor och persistent 2-stegs cache.
* **Automatiserade tester (Headless/CLI)**: `automated-tests/` innehåller master-testkörningssviten `_run_tests` med 7 kategorier (SSH, Utils, Git Client, Credentials, Git Configs, APIs, App Function Calls) och en efemär OpenSSH-testserver (`ssh_test_server.sh`).
* **UI Test Framework**: `automated-tests/ui/` orkestrerar end-to-end och interaktiva UI-tester via Chrome DevTools Protocol (CDP), isolerade testmiljöer (`ui_fixtures.js`), deklarativa scenarier (`scenarios/`) och steg-för-steg körning (`run_ui_tests.js`).
* **Byggsystem (`make_binaries/`)**:
  - `make_binaries/build`: Master-skript för att bygga och paketera binärer för macOS (Intel x64 och Apple Silicon arm64), Linux och Windows.
  - `make_binaries/scripts/sign_app.sh`: Inside-out kodsignering av NW.js `.app`-bunt, inklusive dynamiska bibliotek (`.dylib`), infödda Node-moduler (`.node`), hjälparappar (`Helper.app` utan föräldra-entitlements) och slutligen `nwjs Framework` och huvudexekverbara filen med entitlements.
  - `make_binaries/scripts/build_dmg.sh`: Skapar anpassade macOS DMG-installationsfiler via `create-dmg` och loggar processen.
  - `make_binaries/scripts/notarize_app.sh`: Hanterar Apple-notarisering via `xcrun notarytool` och häftning (`stapler`).

---

## Byggkommandon
- **Utvecklingsläge (Starta lokalt):** `npm start`
- **Bygg Mac-installationsfiler:**
  ```bash
  cd make_binaries && ./build
  ```
  *(Eller kör selektivt för Intel/ARM enligt menyvalen i `build`).*

---

## UI Test Framework Architecture & Guidelines

All UI tests for Pragma-git are located in `automated-tests/ui/` and run via Chrome DevTools Protocol (CDP) against a live NW.js instance.

### Directory Structure & Roles
- `automated-tests/ui/scenarios/*.yaml`: Declarative UI test scenarios.
- `automated-tests/ui/lib/run_ui_tests.js`: Core CDP test runner orchestrating steps, actions, assertions, and `--step` interactive mode.
- `automated-tests/ui/lib/ui_fixtures.js`: Test lifecycle manager: starts ephemeral OpenSSH test servers, generates temporary SSH keys, sets up isolated `HOME` and `nw_user_data` environments, and tears down processes/artifacts on exit.
- `automated-tests/ui/lib/cdp_client.js`: Lightweight CDP client over WebSocket communicating with NW.js windows (`app.html`, `settings.html`, etc.).
- `automated-tests/ui/_run_tests`: Wrapper script that runs all UI scenarios; gracefully skips with exit code `77` when NW.js binary is not present (e.g. GitHub Actions runners).
- `automated-tests/ui/_run_<scenario_name>`: Convenient single-scenario runner scripts (e.g. `_run_01_ssh_clone_repo --step --keep-artifacts`).

### Writing a UI Test Scenario (`.yaml`)
A test scenario defines a sequence of steps. Each step executes an action, and can include `verify:` text which is displayed to the user during interactive `--step` mode.

```yaml
name: "Scenario Name"
description: "Description of what this scenario covers"
steps:
  # 1. Window connection (non-interactive, excluded from step numbering)
  - action: connect_window
    title: "app.html"

  # 2. Click elements
  - name: "Click Settings"
    action: click
    selector: "#settingsButton"
    verify: "Settings window opens."

  # 3. Switching window context
  - action: connect_window
    title: "settings.html"

  # 4. Fill form fields
  - name: "Enter Repository URL"
    action: fill
    fields:
      "#urlToClone": "${ORIGIN_REPO_PATH}"
      "input[name='folder_clone']": "${TARGET_CLONE_PATH}"

  # 5. Waiting for asynchronous events & UI transitions
  - name: "Wait for Operation Completion"
    action: wait_for_selector
    selector: "#gitHubTab.active"
    timeout: 25000

  # 6. Content assertions
  - name: "Verify Status Text"
    action: assert_text
    selector: "#statusDiv"
    expected: "Operation Successful"

  # 7. Git tree verification (MANDATORY for clone/commit/merge operations)
  - name: "Validate Cloned Git Tree Matches Source Git Tree"
    action: assert_git_tree_match
    source: "${ORIGIN_REPO_PATH}"
    target: "${TARGET_CLONE_PATH}/remote_clone_source"
```

### Supported Actions in `run_ui_tests.js`
- `connect_window`: Switches CDP context to target window matching regex or substring (`title: "settings.html"`).
- `click`: Dispatches CDP mouse click to `selector`.
- `fill`: Sets values of multiple input fields via `fields: { selector: value }`.
- `set_value`: Sets single input field value (`selector`, `value`).
- `wait_for_selector`: Polls until CSS selector appears in DOM with matching state (`timeout` in ms).
- `wait_for_text`: Polls until element matching `selector` contains `text`.
- `wait`: Sleeps for `ms` milliseconds.
- `inject_key`: Appends generated test public key to test OpenSSH `authorized_keys`.
- `assert_text`: Verifies element inner text contains `expected`; throws and fails test if not matched.
- `assert_git_tree_match`: **Mandatory verification step** for clone, pull, merge, or commit operations. Checks existence of source and target repos on disk and asserts `HEAD^{tree}` hashes match; throws and fails test if mismatched.

### Template Variables Available in Scenarios
- `${ORIGIN_REPO_PATH}`: Absolute path to ephemeral test bare git repo (`remote_clone_source.git`).
- `${TARGET_CLONE_PATH}`: Absolute path to target clone folder (`cloned_repo_on_ssh_server`).
- `${TEST_SSHD_PORT}`: Port of the ephemeral OpenSSH server.
- `${USER}`: Current system username.
- `${CLIENT_KEY}`: Absolute path to generated test private SSH key.
- `${CLIENT_KEY_PUB}`: Absolute path to generated test public SSH key.

### Essential Rules for UI Tests
1. **Never use static DOM text for async completion checks:** If an element already contains placeholder text before an async operation starts, `wait_for_text` will resolve immediately. Always wait for an explicit state change (e.g. `wait_for_selector: "#tab.active"` or a distinct success message).
2. **Always include automated git tree validation:** Any test performing a clone, checkout, pull, or merge MUST conclude with an `assert_git_tree_match` step. Never rely only on console output or UI tabs.
3. **Keep Artifacts & Diff inspection:** When `--keep-artifacts` is used, the test fixtures print the exact path and a clean `diff -u <(git --git-dir=... ls-tree -r HEAD) <(git -C ... ls-tree -r HEAD)` command for manual terminal inspection.

---

## Agent Tool & Sandbox Rules (CRITICAL)
- **Use Native Tools First:** Använd ALDRIG `run_command` med bash-verktyg som `cat`, `grep`, `ls`, eller `sed` för att läsa/söka i filer. Använd ALLTID de inbyggda verktygen `view_file`, `grep_search` och `list_dir`.
- **Sandbox Default:** När `run_command` måste användas (t.ex. för `git`), sätt ALLTID `BypassSandbox: false`. Sandlådan har redan full läs/skriv-åtkomst till arbetsytan.
- **När BypassSandbox behövs:** Endast kommandon som kräver macOS Keychain-åtkomst (t.ex. kodsignering med `codesign`) eller Apple-notarisering (`xcrun notarytool`) ska köras med `BypassSandbox: true`. Målet är att minimera antalet säkerhetsprompter för användaren.
- **Skapa inte temporära filer i `/tmp`:** Använd agentens interna scratch-kataloger vid behov.
