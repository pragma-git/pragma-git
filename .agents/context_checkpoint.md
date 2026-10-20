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
* **Task Description**: Hantering av 'message' textarea: åtgärdat dubbelklicksåterställning och piltangentnavigering vid redigering.
  - **Dubbelklick i message-textarea**:
    - När användaren redan har en markör i textarea (`document.activeElement === message`) blockeras `message_dblclick`-åtgärden som återställde meddelandet. Dubbelklick fungerar då som standard (markera ord) fram tills användaren lämnar fältet (`blur`).
    - Implementerat med minimal förändring via `_messageHadFocus` som fångar fokusläget i `onmousedown (event.detail === 1)` innan klicksekvensen flyttar fokus.
  - **Piltangenter (Upp/Ned)**:
    - I `app.html` begränsades fönstrets `keydown`-lyssnare för tangentkod 38 (upp) och 40 (ned) så att `_callback('clicked-up-arrow')` och `_callback('clicked-down-arrow')` endast anropas när `document.activeElement !== document.getElementById('message')`.
    - Detta tillåter standard piltangentnavigering mellan textrader under redigering utan att byta commit i historiken.
* **Tidigare åtgärder**:
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
