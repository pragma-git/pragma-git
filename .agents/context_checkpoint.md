### 🛠️ Tech Stack
* **Runtime & Framework**: NW.js (`0.100.1`) med Chromium och Node.js
* **Core Libraries**: `simple-git`, `@hackolade/keytar`, `chokidar`, `diff-match-patch`, `@toast-ui/editor`
* **Packaging & Signing**: `create-dmg`, macOS `codesign`, Apple `notarytool` / `stapler`

---

### 🏛️ Architecture & Files
* **Application Core**: Huvudfönster och event-loop ([app.html](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.html), [app.js](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/app.js))
* **Build Orchestration**: Master-byggskript för plattformsoberoende paketering ([make_binaries/build](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/build))
* **Code Signing Engine**: Inside-out djupkodsignering för NW.js och dess hjälparappar/moduler ([make_binaries/scripts/sign_app.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/sign_app.sh))
* **DMG Builder**: Genererar monterbara DMG-paket med live-loggning ([make_binaries/scripts/build_dmg.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/build_dmg.sh))
* **Apple Notarization**: Skickar in, validerar och häftar Apple-notarisering ([make_binaries/scripts/notarize_app.sh](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/notarize_app.sh))
* **Entitlements**: Säkerhetsrättigheter för NW.js JIT och minneshantering ([make_binaries/assets-mac/entitlements.plist](file:///Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/assets-mac/entitlements.plist))

---

### 📋 Current Status & Tasks
* **Task Description**: Implementerat fullständig repogruppering: gruppkolumn i inställningar med integrerat kolumnfilter, och grupperade menyer i huvudfönstret.
  - **Gruppkolumn och integrerat filter i Settings (`settings.html` & `settings.js`)**:
    - Lade till `<meta charset="utf-8">` i både `settings.html` och `app.html` för att garantera korrekt teckenkodning.
    - Tog bort separat text ovanför tabellen och integrerade filter-dropdownen (`#repoTableGroupFilter`) direkt i tabellens kolumnrubrik (`Group (All)` / valt gruppnamn).
    - Dropdownen i varje tabellrad har rensats från skräptecken och visar nu tydligt `Select group:` och `None (Remove from group)`.
    - Filtrering görs via `row.style.display` baserat på `data-group`, vilket bevarar alla rad-ID:n intakta.
  - **Grupperad repo-meny i huvudfönstret (`app.js`)**:
    - Rensat bort emoji-symboler som orsakade mojibake-skräptecken i NW.js macOS-menyer.
    - Tog bort alla separatorlinjer utom den enda linjen ovanför "Switch to repo" (ingen separator alls om inga grupper finns).
    - Ändrade undermenynamn från `(Ungrouped)` till ren `Ungrouped`.
    - Översta sektionen heter nu `Repo groups : ` och behåller alla grupper stabilt i listan (namngivna grupper, `Ungrouped` samt `All` som sista alternativ), så listan inte hoppar eller ändras när en grupp väljs.
    - Val av repo från `All` sätter aktiv vy till `ALL`, vilket visar alla repon direkt under `All repos : ` i huvudlistan.
    - Val av repo från en grupp sätter aktiv vy till den gruppen (`Repos in '...' : `).
    - Klick på det aktiva repot inuti en annan undermeny (t.ex. i `All`) tillåts för att växla visningsvy utan att byta repo.
    - Rubriker för aktiv sektion: `All repos : `, `Repos in '${group}' : ` eller `Ungrouped repos : `. Vid helt ogrupperat läge visas `Switch to repo : `.
* **Tidigare åtgärder**:
  - Hantering av 'message' textarea: åtgärdat dubbelklicksåterställning och piltangentnavigering vid redigering.
  - Symmetriserat macOS-paketering, kodsignering och Apple-notarisering för Intel (`mac-x64`) och ARM (`mac-arm64`).
  - Terminal mail-varning utredd och åtgärdad.

---

### 🐛 Open / Historical Bugs
* **Bug**: Dubbelklick i 'message'-textarea återställde meddelandet även om användaren redan höll på att redigera eller ville markera ett ord.
  * *Remediation*: Sparade föregående fokusstatus `_messageHadFocus` vid första musklicket (`mousedown` med `detail === 1`) och avbröt `message_dblclick` om elementet redan hade fokus.
* **Bug**: Tryck på upp- eller nedåtpil vid redigering av commit-meddelande växlade vald commit i historiken istället för att flytta markören i textarean.
  * *Remediation*: Lade till kontroll i fönstrets piltangent-lyssnare så att historik-callbacken inte triggas när meddelandefältet har fokus.

---

### 🐛 Open / Historical Bugs
* **Bug**: Apple Notarisering eller Gatekeeper fallerade med "code object is not signed at all" för `libnode.dylib` inuti `nwjs Framework.framework`.
  * *Remediation*: Korrigerade signeringsordningen i `make_binaries/scripts/sign_app.sh` så att alla `.dylib` och hjälparappar signeras *före* `nwjs Framework.framework`, och hjälparappar signeras utan förälderns entitlements.
* **Bug**: `build_dmg.sh` tappade bort felkoder vid pipeline med `tee`.
  * *Remediation*: Sparade loggar via temporära filer och säkrade `${PIPESTATUS[0]}` så att misslyckade byggen inte rapporterar falsk framgång.
