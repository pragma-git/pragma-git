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
* **Task Description**: "Test login"-knapp och SSH-inloggningstest:
  - **SSH-testskript** ([ssh_folder/ssh-test-login](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-test-login)):
    - Icke-interaktivt hjälpskript som anropar ssh med publickey-autentisering (`BatchMode=yes`, timeout 4s).
    - Returnerar strukturerade statusrader (`STATUS:OK`, `STATUS:KEY_NEEDED`, `STATUS:TIMEOUT`, `STATUS:ERROR`) utan att kasta onödiga processfel.
  - **SSH-wrapper & UI-funktion i `ssh-folder-lib.js`** ([ssh_folder/ssh-folder-lib.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js)):
    - `sshTestLogin(sshUrl)`: Low-level wrapper för `ssh-test-login`, anropar `multiPlatformExecSync` och returnerar status.
    - `testSshKeyLogin(mode)`: Körs från "Test login"-knappen.
      - Om login fungerar (`STATUS:OK`): visar grön bekräftelse (`✓ Login works`) och aktiverar (ogråar) Add/Clone-knappen.
      - Om login nekas (`STATUS:KEY_NEEDED`): visar `ℹ Key needed (login not permitted)` och visar en "Create key pair"-knapp bredvid. Add/Clone hålls gråad.
    - `deploySshKey(mode)`: Kör `ssh-generate-key-login`, och testar sedan automatiskt inloggningen igen. När den verifieras grön aktiveras Add/Clone och Create key pair-knappen döljs.
    - `onServerInputsChanged(mode)`: Nollställer validering och gråar Add/Clone vid ändring av server eller användarnamn.
  - **UI i `settings.html`** ([settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html)):
    - "Test login"-knappen placerad längst till vänster i serverinmatningsraden.
    - "Create key pair"-knappen visas dynamiskt intill vid behov.
    - Add/Clone för server är inaktiverad (`disabled`) tills inloggningen är testad och grön.
    - I Local-läge är Add- och Clone-knapparna alltid aktiva.
    - Harmoniserat Add Repo-tabbens layout med Clone-tabben: Add Repo använder samma `toolTable`-struktur och tabellrad som Clone för serverdetaljer, vilket eliminerar att fälten blir för breda (anpassat till 50% kolumnbredd) och integrerar local/server-switchen snyggt.
  - **SSH-server Setup i `cloneButtonPressed`** ([settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js)):
    - Hanterar `setupRemoteKeyLogin_clone` analogt med Add Repo: kör `ssh-generate-key-login` med 60s timeout vid behov.
    - Anropar `await opener.mkdir(folder)` på servern för att skapa mål-/övermappen innan `gitClone`.
  - **Korrigerad `gitClone`-funktion** ([settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js)):
    - Fixat typofel i `url.pathname` (hette felaktigt `url.pathName`).
    - Fixat sökvägsseparator för SSH så att `/` alltid används istället för OS-beroende `pathsep` (`\`).
    - Skapar baskatalogen `cleanFolderName` via `await opener.mkdir(cleanFolderName)`.
    - Säkrat felhantering och returvärde (`true`/`false`) samt statusåterställning vid avbrott.
    - Säkrat att tom repository checkout (`to be born`) inte kastar `TypeError` på null `err`.
  - **UI-feedback & Validering i `settings.html`** ([settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html)):
    - Lade till `#cloneStatus_server` bredvid serverns klonknapp så att "Cloning in progress " visas även när server är vald.
    - Lade till säkerställande av inledande snedstreck (`/`) i `parseServerFields_clone` och `parseServerFields` ifall användaren utelämnar det.
    - Uppdaterade `disabledPasswordlessLogin`-dialogens Avbryt-knapp till att återställa både `setupRemoteKeyLogin` och `setupRemoteKeyLogin_clone`.
  - **Timeout-förbättring i `fs_mkdir`** ([ssh_folder/ssh-folder-lib.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/ssh_folder/ssh-folder-lib.js)):
    - Satt timeout till 30s vid fjärr-mkdir så långsammare nätverks- och SSH-anrop inte avbryts av standardtimeouten på 2s.

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
