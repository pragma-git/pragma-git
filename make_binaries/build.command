#!/bin/bash

# Some good input from https://github.com/Aluxian/nwjs-starter

# Install nwjs-pheonix-builder
# 1) cd ~/Documents/Projects/Pragma-git/Pragma-git >
# 2) npm install nwjs-builder-phoenix --save-dev
# 3) cd node_modules/nwjs-builder-phoenix; npm install


# Prerequisits nwjs-phoenix-builder

# 1) brew cask install wine-stable --no-quarantine
# 2) download rcedit-64.exe (https://github.com/electron/rcedit/releases)  => Hämtade Filer.  Högerklicka Öppna efter nedladdning för att tillåta.
# 3) rm ~/Documents/Projects/Pragma-git/Pragma-git/node_modules/nwjs-builder-phoenix/node_modules/rcedit/bin/rcedit.exe  \
#    ln -s /Users/jan/Downloads/rcedit-x64.exe /Users/jan/Documents/Projects/Pragma-git/Pragma-git/node_modules/nwjs-builder-phoenix/node_modules/rcedit/bin/rcedit.exe


# To create installers

# 1) brew install makensis # For making windows installer
# 2) brew install create-dmg # For creating mac installer


# NOT implemented yet :
# 3) sudo gem install fpm # For linux .deb creation
# 4) brew install gnu-tar



#
# Build dists into : "/Users/jan/Documents/Projects/Pragma-git/dist"
#
    echo '=========================='
    echo 'BUILDING FOR ALL PLATFORMS'
    echo '=========================='

    ~/Documents/Projects/Pragma-git/Pragma-git/node_modules/.bin/build \
    --tasks win-x86,win-x64,linux-x86,linux-x64,mac-x64 \
    --mirror https://dl.nwjs.io/  \
    --name Pragma-git  \
    --concurrent true  \
    ~/Documents/Projects/Pragma-git/Pragma-git

    #Options :
    # https://github.com/evshiron/nwjs-builder-phoenix/blob/master/docs/Options.md


#
# Build Mac installer
#
    echo '======================'
    echo 'INSTALLER MACOS 64-BIT'
    echo '======================'

    # Move .app to temporary folder
    mkdir ../dist/temp-macos
    mv "../dist/$(ls -1 ../dist/|grep 'mac-x64')/Pragma-git.app/" ../dist/temp-macos
    
    # Work in destination folder (dist/mac) 
    mkdir ../dist/mac
    cd ../dist/mac
     
    # Make .dmg
    test -f Pragma-git-Installer.dmg && rm Pragma-git-Installer.dmg
    create-dmg \
      --volname "Pragma-git-Installer" \
      --volicon "../../Pragma-git/images/icon.icns" \
      --window-pos 200 120 \
      --window-size 600 400 \
      --icon-size 80 \
      --icon "Pragma-git.app"  192 190 \
      --hide-extension "Pragma-git.app" \
      --app-drop-link 448 190 \
      --icon ".fseventsd"  2000 190 \
      --icon ".VolumeIcon.icns"  2000 190 \
      "Pragma-git-Installer.dmg" \
      "../temp-macos/"
    
    # Clean up
    cd -
    mv ../dist/temp-macos/Pragma-git.app "../dist/$(ls -1 ../dist/|grep 'mac-x64')/"
    rm -r ../dist/temp-macos
    


#
# Build Windows installers
#

    echo '===================='
    echo 'INSTALLER WIN 64-BIT'
    echo '===================='
    mkdir ../dist/win64

    makensis \
    -DEXEFOLDER=$(ls -1 ../dist/|grep  'win-x64') \
    -DOUTPUT='win64\Pragma-git-installer.exe' \
    windows_installer.nsi

    echo '===================='
    echo 'INSTALLER WIN 32-BIT'
    echo '===================='
    mkdir ../dist/win32

    makensis \
    -DEXEFOLDER=$(ls -1 ../dist/|grep  'win-x86') \
    -DOUTPUT='win32\Pragma-git-installer.exe' \
    windows_installer.nsi
    


#
# Build Linux installers
#

    echo '============================'
    echo 'INSTALLER LINUX 64-BIT (DEB)'
    echo '============================'
    cd ~/Documents/Projects/Pragma-git/dist
    fpm -s dir -t deb -n test --description "Pragma-git -- the pragmatic revision control"  -C Pragma-git-0.1.0-linux-x64 .=/opt/pragma-git
    
    
    


# Finish
read -n 1 -s -r -p "Press any key to continue"
