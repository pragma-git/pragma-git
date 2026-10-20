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
* **Task Description**: Åtgärdat och symmetriserat macOS-paketering, kodsignering och Apple-notarisering för både Intel (`mac-x64`) och Apple Silicon (`mac-arm64`).
  - **Inside-Out Kodsignering**:
    1. Signera alla dynamiska bibliotek (`*.dylib`).
    2. Signera infödda `.node`-moduler (`registry.node`, `keytar`, `fsevents`).
    3. Signera interna hjälparbinärer (`app_mode_loader`, `chrome_crashpad_handler`, `web_app_shortcut_copier`) och exkludera `nwjs Framework`.
    4. Signera nästlade hjälparappar (`nwjs Helper*.app`) **utan** föräldra-entitlements.
    5. Signera och försegla `nwjs Framework.framework` sist.
    6. Signera och försegla huvudexekverbara filen och app-omslaget med entitlements.
  - **DMG & Notarisering**:
    - Byggt och verifierat DMG för Intel x64: `dist/mac/Pragma-git-0.0.0-mac-x64.dmg` (Godkänd, notariserad och häftad).
    - Byggt och verifierat DMG för ARM64: `dist/mac_arm64/Pragma-git-0.0.0-mac-arm64.dmg` (Godkänd, notariserad och häftad).
    - Båda installationsfilerna validerade med Gatekeeper (`spctl --assess -vvv --type install`).
  - **Terminal Mail Issue**:
    - Identifierat orsaken till terminalvarningen `Du har ny post i /var/mail/jan`: Universitets-cronjobbet `osxbash.sh` genererade `stderr`-loggar som Postfix sparade i `/var/mail/jan` (20 MB). Löst genom att uppdatera crontab med `2>&1` och tömma mailboxen.

---

### 🐛 Open / Historical Bugs
* **Bug**: Apple Notarisering eller Gatekeeper fallerade med "code object is not signed at all" för `libnode.dylib` inuti `nwjs Framework.framework`.
  * *Remediation*: Korrigerade signeringsordningen i `make_binaries/scripts/sign_app.sh` så att alla `.dylib` och hjälparappar signeras *före* `nwjs Framework.framework`, och hjälparappar signeras utan förälderns entitlements.
* **Bug**: `build_dmg.sh` tappade bort felkoder vid pipeline med `tee`.
  * *Remediation*: Sparade loggar via temporära filer och säkrade `${PIPESTATUS[0]}` så att misslyckade byggen inte rapporterar falsk framgång.
