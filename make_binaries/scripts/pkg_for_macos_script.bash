#!/usr/bin/env bash
set -euo pipefail

#cd ~/Documents/Projects/Pragma-git/dist

#STAGING_MAC="staging_mac_arm64"
#IDENT="io.github.pragma-git"
#VERSION="1.0.0"
echo "PWD=$PWD"
echo "OS=$OS"
echo "STAGING_MAC=$STAGING_MAC"
echo "IDENT=$IDENT"
echo "VERSION=$VERSION"
echo "WORK=$WORK"

rm -rf "$WORK"
mkdir -p "$WORK/root/Applications" "$WORK/Scripts"

# Stage payload
echo cp -a "$STAGING_MAC/Pragma-git.app" "$WORK/root/Applications/"
cp -a "$STAGING_MAC/Pragma-git.app" "$WORK/root/Applications/"

# Optional postinstall to de-quarantine installed app
cat > "$WORK/Scripts/postinstall" <<'BASH'
#!/bin/bash
APP="/Applications/MyApp.app"
/usr/bin/xattr -rd com.apple.quarantine "$APP" 2>/dev/null || true
exit 0
BASH
chmod +x "$WORK/Scripts/postinstall"

# Ensure sane ownership/permissions in the staged root:
# - readable by group/others
# - directories executable (traverse)
chmod -R go+rX "$WORK/root/Applications/Pragma-git.app"

# Make sure the main binary is executable
chmod 755 "$WORK/root/Applications/Pragma-git.app/Contents/MacOS/Pragma-git"


# Build component package
pkgbuild \
  --root "$WORK/root" \
  --install-location "/Applications" \
  --scripts "$WORK/Scripts" \
  --identifier "$IDENT" \
  --version "$VERSION" \
  "$WORK/Pragma-git-${VERSION}-${OS}.pkg"

echo "Built: $WORK/Pragma-git-${VERSION}.pkg"


echo "Copy: $WORK/Pragma-git-${OS}-${VERSION}.pkg -> $PWD/Pragma-git-${VERSION}-${OS}.pkg"
cp -R "$WORK/Pragma-git-${VERSION}-${OS}.pkg" .

