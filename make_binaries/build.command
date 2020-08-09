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


# To allow packaging for (not implemented yet)

# 1) brew install makensis
# 2) sudo gem install fpm # For linux .deb creation



#
# Build dists into : "/Users/jan/Documents/Projects/Pragma-git/dist"
#

    ~/Documents/Projects/Pragma-git/Pragma-git/node_modules/.bin/build \
    --tasks win-x86,win-x64,linux-x86,linux-x64,mac-x64 \
    --mirror https://dl.nwjs.io/  \
    --name Pragma-git  \
    --concurrent true  \
    ~/Documents/Projects/Pragma-git/Pragma-git

    #Options :
    # https://github.com/evshiron/nwjs-builder-phoenix/blob/master/docs/Options.md


#
# Build Windows installers
#
    # 64-bit
    echo 'BUILDING ẂIN 64-BIT'
    mkdir ../dist/win64

    makensis \
    -DEXEFOLDER=$(ls -1 ../dist/|grep  'win-x64') \
    -DOUTPUT='win64\Pragma-git-installer.exe' \
    windows_installer.nsi
    
    # 32-bit
    echo 'BUILDING ẂIN 32-BIT'
    mkdir ../dist/win32

    makensis \
    -DEXEFOLDER=$(ls -1 ../dist/|grep  'win-x86') \
    -DOUTPUT='win32\Pragma-git-installer.exe' \
    windows_installer.nsi




# Finish
read -n 1 -s -r -p "Press any key to continue"
