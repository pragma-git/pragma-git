#!/bin/bash
# ==============================================================================
# SCRIPT: build_installer.sh
# BITMASK EXIT CODES: 
#   7 = All steps succeeded (1 + 2 + 4)
#   Else = Sum of successful steps (e.g., 3 means built and signed, but notary failed)
# ==============================================================================

set +e # Låt skriptet fortsätta så vi kan räkna ihop bitmasken manuellt

STAGING_DIR="$1"
IDENTITY="$2"
KEY_CHAIN_PROFILE="$3"
DMG_NAME="$4"
VOLUME_NAME="Mac-Pragma-git-Installer"

# Initiera bitmask-variabler till 0 (Failure)
BIT_BUILD=0
BIT_SIGN=0
BIT_NOTARY=0

# Step 1 & 2: Cleanup and internal app signing
echo '================================'
echo 'Cleanup and internal app signing'
echo '================================'
test -f "$DMG_NAME" && rm "$DMG_NAME"
/Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/scripts/sign_app.sh "$STAGING_DIR" "$IDENTITY"
if [ $? -ne 0 ]; then
    # Om den interna signeringen dör innan DMG skapas returnerar vi 0
    exit 0
fi

# Step 3: Package DMG
echo '================================'
echo 'Package DMG'
echo '================================'
create-dmg \
  --volname "$VOLUME_NAME" \
  --volicon "../../pragma-git/images/icon_installer.icns" \
  --window-pos 200 120 \
  --window-size 500 520 \
  --background "../../pragma-git/make_binaries/assets-mac/dmg_background.png" \
  --icon-size 80 \
  --icon "Pragma-git.app" 125 175 \
  --hide-extension "Pragma-git.app" \
  --app-drop-link 375 175 \
  --add-file "README.txt" "../../pragma-git/make_binaries/assets-mac/README.txt" 375 335 \
  "$DMG_NAME" \
  "$STAGING_DIR" # > /dev/null 2>&1

if [ $? -eq 0 ] && [ -f "$DMG_NAME" ]; then
    BIT_BUILD=1 # DMG built successfully!
else
    # Om bygget misslyckades kan vi inte fortsätta. Avsluta med 0.
    exit 0
fi

# Step 4: Sign DMG
echo '================================'
echo 'Sign DMG'
echo '================================'
codesign --sign "$IDENTITY" --timestamp --verbose=4 --force "$DMG_NAME" #> /dev/null 2>&1
if [ $? -eq 0 ]; then
    BIT_SIGN=2 # DMG signed successfully!
else
    # Om signeringen misslyckades kan vi inte notarisera. Avsluta med nuvarande summan (1).
    exit $((BIT_BUILD + BIT_SIGN + BIT_NOTARY))
fi

# Step 5 & 6: Notarize and Validate

echo '================================'
echo 'Notarize DMG'
echo '================================'


echo "--- Apple Notary Service Output Start ---"
NOTARY_LOG=$(mktemp)
xcrun notarytool submit "$DMG_NAME" --keychain-profile "$KEY_CHAIN_PROFILE" --wait 2>&1 | tee "$NOTARY_LOG"
NOTARY_STATUS=${PIPESTATUS[0]}
NOTARY_OUTPUT=$(cat "$NOTARY_LOG")
rm -f "$NOTARY_LOG"
echo "--- Apple Notary Service Output End ---"

# Validate
if [ $NOTARY_STATUS -eq 0 ] && ! echo "$NOTARY_OUTPUT" | grep -q "status: Invalid"; then


    FINAL_VAL=0

    echo '================================'
    echo 'Staple notarization to DMG'
    echo '================================'
    xcrun stapler staple "$DMG_NAME" # > /dev/null 2>&1
    
    # Slutgiltig Gatekeeper-kontroll
    
    echo '================================'
    echo 'Verify DMG for GateKeeper'
    echo '================================'
    
    echo ' '
    echo 'Validate DMG :'
    xcrun stapler validate "$DMG_NAME" || FINAL_VAL=1
    
    echo ' '
    echo 'Deep validate app :'
    echo ' '
    diskutil image attach "$DMG_NAME" #> /dev/null 2>&1
    codesign --verify --deep --strict --verbose=4 "/Volumes/$VOLUME_NAME/Pragma-git.app" || FINAL_VAL=1
    diskutil eject "/Volumes/$VOLUME_NAME" #> /dev/null 2>&1
    
    if [ $FINAL_VAL -eq 0 ]; then
        BIT_NOTARY=4 # Notarization and Gatekeeper passed!
    fi
else
    echo "ERROR: Notarization failed or was rejected as Invalid by Apple."
    
    # Hämta ut Submission ID från texten vi sparade
    SUBMISSION_ID=$(echo "$NOTARY_OUTPUT" | awk '/id:/ {print $2; exit}')
    
    if [ -n "$SUBMISSION_ID" ]; then
        echo ' '
        echo '--------------------------------------------------------------------'
        echo "Automatically fetching JSON error log for ID: $SUBMISSION_ID"
        echo '--------------------------------------------------------------------'
        
        # HÄR hämtas och skrivs hela JSON-loopen ut i terminalen direkt!
        xcrun notarytool log "$SUBMISSION_ID" --keychain-profile "$KEY_CHAIN_PROFILE"
        
        echo '--------------------------------------------------------------------'
    fi
fi

# Räkna ut den totala binära slutkoden (t.ex. 1+2+4=7 vid succé, eller 1+2=3 om notary misslyckades)
TOTAL_SCORE=$((BIT_BUILD + BIT_SIGN + BIT_NOTARY))
exit $TOTAL_SCORE
