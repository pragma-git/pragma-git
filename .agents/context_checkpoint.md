### 🛠️ Tech Stack
* **Runtime & Framework**: NW.js (`0.100.1`) med Chromium och Node.js
* **Core Libraries**: `simple-git`, `@hackolade/keytar`, `chokidar`, `diff-match-patch`, `@toast-ui/editor`
* **Packaging & Signing**: `create-dmg`, macOS `codesign`, Apple `notarytool` / `stapler`

---

### 🏛️ Architecture & Files
* **Application Core**: Huvudfönster och event-loop ([app.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.html), [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js))
* **Modified Files List**: Fönster för modifierade filer och filurval ([listChanged.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/listChanged.html), [listChanged.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/listChanged.js))
* **Settings Window**: Inställningsvy med tabbar för Repository, Branch, Software, System Info, Clone ([settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js), [settings.css](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.css))
* **SSH Folder Integration**: Hjälpskript och wrappers för fjärr-git över SSH ([ssh_folder/ssh-folder-lib.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js), [ssh_folder/ssh-git-client](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-git-client), [ssh_folder/ssh-mkdir](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-mkdir), [ssh_folder/ssh-generate-key-login](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-generate-key-login), [ssh_folder/ssh-test-login](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-test-login))
* **Build Orchestration**: Master-byggskript för plattformsoberoende paketering ([make_binaries/build](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/build))
* **Code Signing Engine**: Inside-out djupkodsignering för NW.js och dess hjälparappar/moduler ([make_binaries/scripts/sign_app.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/sign_app.sh))
* **DMG Builder**: Genererar monterbara DMG-paket med live-loggning ([make_binaries/scripts/build_dmg.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/build_dmg.sh))
* **Apple Notarization**: Skickar in, validerar och häftar Apple-notarisering ([make_binaries/scripts/notarize_app.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/notarize_app.sh))
* **Entitlements**: Säkerhetsrättigheter för NW.js JIT och minneshantering ([make_binaries/assets-mac/entitlements.plist](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/assets-mac/entitlements.plist))

---

### 📋 Current Status & Tasks
* **Task Description**: SSH Key Selection, Distribution, Default Key & System Info "Project folder":
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
  - **Persistens i `settings.json` & `app.js`** ([app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js)):
    - Global default key i `state.tools.defaultSshKey` (default `~/.ssh/id_ed25519` eller `~/.ssh/id_rsa`).
    - Per-repo inställning i `state.repos[i].sshKey` sparas vid clone och add av SSH-repon via `opener.saveSettings()`.
  - **System Info "Project folder"-sektion** ([settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js)):
    - Ny sektion/rubrik "Project folder" placerad direkt ovanför "Current Remote".
    - Visar `Project path : <mappsökväg>`.
    - Om det är en SSH-server visas även:
      - `Private key (local) : <lokal privat nyckelsökväg>`
      - `Public key (server) : ssh://user@server:port/~/.ssh/authorized_keys`

---

### 🐛 Open / Historical Bugs
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
