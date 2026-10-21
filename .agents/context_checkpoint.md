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
* **Automated Testing Suite (Headless/CLI)**: Master test runner och automatiserade tester för SSH-backend och filsystemsintegration utan GUI ([_run_tests](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/_run_tests), [automated-tests/_run_tests](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/_run_tests), [automated-tests/non_gui/ssh/](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/non_gui/ssh/))
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
* **Task Description**: Modulär automatiserad testsvit (Non-GUI) & SSH Key Selection:
  - **Modulär automatiserad testsvit (`automated-tests/non_gui/`)** på grenen `feature/automated-tests` (committad i `21b6f9d`):
    - Etablerat katalogstruktur med 7 självständiga testkategorier under `automated-tests/non_gui/`, där varje underkatalog har ett eget [`_run_tests`](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/automated-tests/_run_tests) som endast kör den katalogens tester.
    - Alla testkörningar städar upp efter sig fullständigt i `/tmp` (inga kvarlämnade mappar eller `.git`-kataloger).
    - Alla `_run_tests`-skript är utrustade med användarbeskrivningar och `cliHelpLine`-aktivering (`--help`, `-h`).
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
