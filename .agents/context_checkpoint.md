### 🛠️ Tech Stack
* **Runtime & Framework**: NW.js (`0.100.1`) med Chromium och Node.js
* **Core Libraries**: `simple-git`, `@hackolade/keytar`, `chokidar`, `diff-match-patch`, `@toast-ui/editor`
* **Packaging & Signing**: `create-dmg`, macOS `codesign`, Apple `notarytool` / `stapler`

---

### 🏛️ Architecture & Files
* **Application Core**: Huvudfönster och event-loop ([app.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.html), [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js))
* **Settings Window**: Inställningsvy med tabbar för Repository, Branch, Software, System Info ([settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js), [settings.css](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.css))
* **Build Orchestration**: Master-byggskript för plattformsoberoende paketering ([make_binaries/build](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/build))
* **Code Signing Engine**: Inside-out djupkodsignering för NW.js och dess hjälparappar/moduler ([make_binaries/scripts/sign_app.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/sign_app.sh))
* **DMG Builder**: Genererar monterbara DMG-paket med live-loggning ([make_binaries/scripts/build_dmg.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/build_dmg.sh))
* **Apple Notarization**: Skickar in, validerar och häftar Apple-notarisering ([make_binaries/scripts/notarize_app.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/notarize_app.sh))
* **Entitlements**: Säkerhetsrättigheter för NW.js JIT och minneshantering ([make_binaries/assets-mac/entitlements.plist](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/assets-mac/entitlements.plist))

---

### 📋 Current Status & Tasks
* **Task Description**: Implementerat avslutning av gruppnamnsredigering med Enter/Return och klick utanför ([settings.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.html), [settings.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/settings.js)):
  - **Lämna redigering med Enter**:
    - Lade till `keydown`-lyssnare på `groupInput` som fångar Enter/Return (`e.key === 'Enter'`).
    - Vid Enter sparas värdet automatiskt, inputfältet avfokuseras (`this.blur()`), och klassen `.editing-done` sätts på cellen så att textvyn (`.groupDisplay`) omedelbart visas även om musen fortfarande hovrar över cellen.
    - Escape avbryter redigering och återställer värdet.
  - **Bibehållen avslutning vid klick utanför**:
    - Vid klick utanför cellen avfokuseras inputfältet och cellen återgår automatiskt till textvisning precis som tidigare.
    - Vid `mouseleave` tas `.editing-done` bort så att hovring/klick fungerar som vanligt nästa gång.

---

### 🐛 Open / Historical Bugs
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
* **Bug**: Grupper skrevs över vid appstängning på grund av in-memory state.
  * *Remediation*: Återställt `settings.json` med alla 14 grupper medan processen är avstängd, committat till `~/.Pragma-git`.
* **Bug**: Kolumnen med branch-namn i inställningarnas Branch-tabb var för smal.
  * *Remediation*: Löst med `#branchesTable` (width: 100%), `.hiddenBranch` (50px), `.branchAction` (110px), och `.branchName` (auto).
* **Bug**: Textfälten för serverdetaljer under AddRepo och Clone var trånga.
  * *Remediation*: Löst med `.serverDetailsContainer` flexbox (`flex: 1 : 1.5 : 2.2` och `flex-wrap: wrap`).
