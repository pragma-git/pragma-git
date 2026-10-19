#!/bin/bash
# ==============================================================================
# SCRIPT: sign_app.sh
# DESCRIPTION: Code signs an NW.js .app bundle inside a staging directory
#              using macOS Hardened Runtime. Cleaned for local disk execution.
# ARGUMENTS: $1 - Path to the staging directory containing the .app bundle.
#            $2 - DEV_ID_CERT
# USAGE: ./sign_app.sh ../../dist/staging_mac_arm64/
# ==============================================================================

## Help -- prints header above (stops at '##')  (see https://github.com)
if [ "$1" = "--help" ] || [ "$1" = "-h" ] || [ "$1" = "/?" ]; then sed -e '1{/^#!/d;}' -e '/^##/q' -e '/^[[:space:]]*$/d' -e 's/^#//g' -e 's/^ //g' "$0" | sed '$d'; exit 0; fi

set -e

if [ -z "$1" ]; then
    echo "Error: Missing required staging directory argument." >&2
    exit 1
fi

STAGING_DIR="$1"
APP_PATH=$(find "$STAGING_DIR" -name "*.app" -maxdepth 2 | head -n 1)

if [ -z "$APP_PATH" ] || [ ! -d "$APP_PATH" ]; then
    echo "Error: Could not locate a valid .app bundle inside directory: $STAGING_DIR" >&2
    exit 1
fi

echo "--- Reading configuration parameters from: $APP_PATH ---"

#DEV_ID_CERT="Developer ID Application: HAKAN JAN ERIK AXELSSON (BV7CXXA5MP)"
DEV_ID_CERT="$2"
ENTITLEMENTS_PATH="/Users/jan/Documents/Projects/Pragma-git/pragma-git/make_binaries/assets-mac/entitlements.plist"

echo ' '
echo "===                                 ==="
echo "=== Initiating code signing process ==="
echo "===                                 ==="

# 1. Purge dead symbolic links to comply with Apple Gatekeeper rules
echo "Cleaning up broken symbolic links inside bundle..."
find "$APP_PATH" -type l ! -exec test -e {} \; -delete

# 2. Sign Node native modules
NODE_MODULES_PATH="$APP_PATH/Contents/Resources/app.nw/node_modules"
if [ -d "$NODE_MODULES_PATH" ]; then
    find "$NODE_MODULES_PATH" -name "*.node" | grep -v -E 'linux|win32' | while read -r node_file; do
        echo "Signing Mac native module: $node_file"
        chmod +w "$node_file"
        codesign --force --timestamp --options runtime --sign "$DEV_ID_CERT" "$node_file"
    done
fi

# 3. Sign standard framework resources
find "$APP_PATH/Contents/Frameworks" -name "*.dylib" -or -name "*.framework" | while read -r framework_file; do
    echo "Signing framework resource: $framework_file"
    chmod -R +w "$framework_file" 2>/dev/null || true
    codesign --force --timestamp --options runtime --sign "$DEV_ID_CERT" "$framework_file"
done

# 4. Sign the three hidden unlinked framework binaries (app_mode_loader, chrome_crashpad_handler, web_app_shortcut_copier)
find "$APP_PATH/Contents/Frameworks" -type f -perm +111 -not -name "*.dylib" -not -name "*.sh" -not -path "*/Contents/MacOS/*" | while read -r binary_file; do
    echo "Signing hidden framework binary: $binary_file"
    chmod +w "$binary_file" 2>/dev/null || true
    codesign --force --timestamp --options runtime --sign "$DEV_ID_CERT" "$binary_file"
done

# 5. Sign all inner Helper.app bundle wrappers (inside nwjs Framework)
find "$APP_PATH/Contents/Frameworks" -name "*.app" | while read -r helper_app; do
    echo "Signing nested process helper bundle: $helper_app"
    chmod -R +w "$helper_app" 2>/dev/null || true
    codesign --force --timestamp --options runtime --sign "$DEV_ID_CERT" "$helper_app"
done

# 6. Sign the core heavy framework engine binary explicitly (sealing the framework bundle)
echo "Signing core framework engine file..."
FRAMEWORK_BIN="$APP_PATH/Contents/Frameworks/nwjs Framework.framework/Versions/Current/nwjs Framework"
if [ ! -f "$FRAMEWORK_BIN" ]; then
    FRAMEWORK_BIN=$(find "$APP_PATH/Contents/Frameworks/nwjs Framework.framework/Versions" -maxdepth 2 -name "nwjs Framework" -type f | head -n 1)
fi
if [ -f "$FRAMEWORK_BIN" ]; then
    chmod +w "$FRAMEWORK_BIN"
    codesign --force --timestamp --sign "$DEV_ID_CERT" "$FRAMEWORK_BIN"
fi


# 7. Sign the main executable execution binary with Hardened Runtime
echo "Signing main application executable binary..."
MAIN_BIN="$APP_PATH/Contents/MacOS/Pragma-git"
if [ -f "$MAIN_BIN" ]; then
    chmod +w "$MAIN_BIN"
    codesign --force --timestamp --options runtime --entitlements "$ENTITLEMENTS_PATH" --sign "$DEV_ID_CERT" "$MAIN_BIN"
fi

# 8. Finally, completely seal the outer master bundle envelope with JIT entitlements
echo "Signing master application envelope with JIT entitlements..."
codesign --force --timestamp --options runtime --entitlements "$ENTITLEMENTS_PATH" --sign "$DEV_ID_CERT" "$APP_PATH"

echo "===                                                                   ==="
echo "=== SIGNING COMPLETE: App is sealed and ready to be packed into a DMG ==="
echo "===                                                                   ==="
echo ' '
