<!-- 
Detta är en AI-guide (AGENTS.md) genererad för Pragma-git.
Den innehåller instruktioner för arkitektur, byggkommandon, tester och regler för AI-assistenter.
-->

## Agent Rules / AI Context
- AT THE START OF A SESSION (or after a chat clear), your very first action MUST be to read `.agents/context_checkpoint.md` to load the current workspace state. Do not make assumptions before reading this file.
- You MUST automatically update the context checkpoint file at `.agents/context_checkpoint.md` in the workspace at the end of each response, eller närhelst koden ändras, för att upprätthålla en källa till sanning för kodbasens kontext.

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

## Agent Tool & Sandbox Rules (CRITICAL)
- **Use Native Tools First:** Använd ALDRIG `run_command` med bash-verktyg som `cat`, `grep`, `ls`, eller `sed` för att läsa/söka i filer. Använd ALLTID de inbyggda verktygen `view_file`, `grep_search` och `list_dir`.
- **Sandbox Default:** När `run_command` måste användas (t.ex. för `git`), sätt ALLTID `BypassSandbox: false`. Sandlådan har redan full läs/skriv-åtkomst till arbetsytan.
- **När BypassSandbox behövs:** Endast kommandon som kräver macOS Keychain-åtkomst (t.ex. kodsignering med `codesign`) eller Apple-notarisering (`xcrun notarytool`) ska köras med `BypassSandbox: true`. Målet är att minimera antalet säkerhetsprompter för användaren.
- **Skapa inte temporära filer i `/tmp`:** Använd agentens interna scratch-kataloger vid behov.
