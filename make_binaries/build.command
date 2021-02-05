#!/bin/bash

# Some good input from https://github.com/Aluxian/nwjs-starter

#
# REQUIREMENTS
#

# Install nwjs-pheonix-builder
# 1) cd ~/Documents/Projects/Pragma-git/Pragma-git >
# 2) npm install nwjs-builder-phoenix --save-dev
# 3) cd node_modules/nwjs-builder-phoenix; npm install


# Prerequisits nwjs-phoenix-builder

# 4) brew cask install wine-stable --no-quarantine
# 5) download rcedit-64.exe (https://github.com/electron/rcedit/releases)  => Hämtade Filer.  
#    Flytta till /Users/jan/Documents/Projects/Pragma-git/Pragma-git/make_binaries/rcedit-x64.exe
#    Högerklicka Öppna efter nedladdning för att tillåta.
#
# 6) rm ~/Documents/Projects/Pragma-git/Pragma-git/node_modules/nwjs-builder-phoenix/node_modules/rcedit/bin/rcedit.exe  \
#    ln -s /Users/jan/Documents/Projects/Pragma-git/Pragma-git/make_binaries/rcedit-x64.exe /Users/jan/Documents/Projects/Pragma-git/Pragma-git/node_modules/nwjs-builder-phoenix/node_modules/rcedit/bin/rcedit.exe


# To create installers

# 7) brew install makensis # For making windows installer
# 8) brew install create-dmg # For creating mac installer
# 9) sudo gem install fpm # For linux .deb creation
#    run later version : /usr/local/lib/ruby/gems/3.0.0/gems/fpm-1.12.0/bin/fpm  instead of  fpm
# 10) brew install gnu-tar # (tar for macos, for fpm)
# 11) brew install rpm


#
# TROUBLE-SHOOTING
#

# - no windows icons.   5) or 6) above 


    COLOR=5
    tput setaf $COLOR; tput setaf $COLOR; echo ' '
    echo '============================'
    echo 'PREPARE ENVIRONMENT'
    echo '============================'
    tput sgr0

    # Run newer version of fpm
    export PATH="/usr/local/lib/ruby/gems/3.0.0/gems/fpm-1.12.0/bin:$PATH"
    export PATH="/usr/local/Cellar/ruby/3.0.0_1/bin:$PATH"
    which ruby
    which fpm

    
#
# Install everything in package.json
#    
#
    tput setaf $COLOR; tput setaf $COLOR; echo ' '
    echo '============================'
    echo 'INSTALLING FROM package.json'
    echo '============================'
    tput sgr0
    
	cd /Users/jan/Documents/Projects/Pragma-git/Pragma-git/
    npm install

    tput setaf $COLOR; echo ' '
    echo '=================================='
    echo 'INSTALLING FROM merge/package.json'
    echo '=================================='
    tput sgr0
    
	cd /Users/jan/Documents/Projects/Pragma-git/Pragma-git/merge
    npm install

#
# Clean folders
#
#
    tput setaf $COLOR; echo ' '
    echo '============================'
    echo 'CLEAN OLD BUILDS'
    echo '============================'
    tput sgr0

    
# Clean old builds
    rm -r /Users/jan/Documents/Projects/Pragma-git/dist/Pragma-git-*
    rm -r /Users/jan/Documents/Projects/Pragma-git/dist/mac
    rm -r /Users/jan/Documents/Projects/Pragma-git/dist/win32
    rm -r /Users/jan/Documents/Projects/Pragma-git/dist/win64
    rm -r /Users/jan/Documents/Projects/Pragma-git/dist/linux64
    
    echo 'done'


#
# Build dists into : "/Users/jan/Documents/Projects/Pragma-git/dist"
#
    tput setaf $COLOR; echo ' '
    echo '=========================='
    echo 'BUILDING FOR ALL PLATFORMS'
    echo '=========================='
    tput sgr0
    
    cd /Users/jan/Documents/Projects/Pragma-git/Pragma-git/make_binaries


    # Build All platforms
    ~/Documents/Projects/Pragma-git/Pragma-git/node_modules/.bin/build \
    --tasks win-x86,win-x64,linux-x64,mac-x64 \
    --mirror https://dl.nwjs.io/  \
    --name Pragma-git  \
    --concurrent true  \
    ~/Documents/Projects/Pragma-git/Pragma-git

    #Options :
    # https://github.com/evshiron/nwjs-builder-phoenix/blob/master/docs/Options.md
    
        
    # Make pragma-merge helper script executable
    echo 'Make "pragma-merge" executable'
    chmod a+x "../dist/$(ls -1 ../dist/|grep 'mac-x64')/Pragma-git.app/Contents/Resources/app.nw/pragma-merge"


#
# Build Mac installer
#
    tput setaf $COLOR; echo ' '
    echo '======================'
    echo 'INSTALLER MACOS 64-BIT'
    echo '======================'
    tput sgr0


    # Move .app to temporary folder
    mkdir ../dist/temp-macos
    mv "../dist/$(ls -1 ../dist/|grep 'mac-x64')/Pragma-git.app/" ../dist/temp-macos

    DIR=$(ls -1 ../dist/|grep  'mac-x64')
    echo "$DIR.dmg" 
    
    # Work in destination folder (dist/mac) 
    mkdir ../dist/mac
    cd ../dist/mac
    
     
    # Make .dmg in ../dist/temp-macos
    test -f Pragma-git-Installer.dmg && rm Pragma-git-Installer.dmg
    create-dmg \
      --volname "Mac-Pragma-git-Installer" \
      --volicon "../../Pragma-git/images/icon_installer.icns" \
      --window-pos 200 120 \
      --window-size 500 320 \
      --background "../../Pragma-git/make_binaries/assets-mac/dmg_background.png" \
      --icon-size 80 \
      --icon "Pragma-git.app"  125 175 \
      --hide-extension "Pragma-git.app" \
      --app-drop-link 375 175 \
      --icon ".fseventsd"  1000 190 \
      --icon ".VolumeIcon.icns"  1000 190 \
      "$(echo "$DIR.dmg")" \
      "../temp-macos/"
    
    # Clean up 
    cd -
    mv ../dist/temp-macos/Pragma-git.app "../dist/$(ls -1 ../dist/|grep 'mac-x64')/"
    rm -r ../dist/temp-macos

    pwd

#
# Build Windows installers
#

    tput setaf $COLOR; echo ' '
    echo '===================='
    echo 'INSTALLER WIN 64-BIT'
    echo '===================='
    tput sgr0
    
    rm -r ../dist/win64
    mkdir ../dist/win64

    DIR=$(ls -1 ../dist/|grep  'win-x64')
    makensis \
    -DEXEFOLDER=$DIR \
    -DOUTPUT="win64/$DIR.exe" \
    -DVERSION="$(echo $DIR | cut -d '-' -f 3)" \
    -DPROGRAMFILESFOLDER='$PROGRAMFILES64' \
    windows_installer.nsi

    tput setaf $COLOR; echo ' '
    echo '===================='
    echo 'INSTALLER WIN 32-BIT'
    echo '===================='
    tput sgr0
    
    rm -r ../dist/win32
    mkdir ../dist/win32

    DIR=$(ls -1 ../dist/|grep  'win-x86')
    makensis \
    -DEXEFOLDER=$DIR \
    -DOUTPUT="win32/$DIR.exe" \
    -DVERSION="$(echo $DIR | cut -d '-' -f 3)" \
    -DPROGRAMFILESFOLDER='$PROGRAMFILES32' \
    windows_installer.nsi
    


#
# Build Linux DEB installer
#

    tput setaf $COLOR; echo ' '
    echo '============================'
    echo 'INSTALLER LINUX 64-BIT (DEB)'
    echo '============================'
    tput sgr0
    
    cd ~/Documents/Projects/Pragma-git/dist
    rm linux64/*.deb
    mkdir linux64
    
    
    DIR=$(ls -1 ../dist/|grep  'linux-x64') # Pragma-git-0.1.0-linux-x64
    VERSION=$(echo $DIR | cut -d '-' -f 3)  # Pragma-git-0.1.0-linux-x64 => VERSION='0.1.0'
    chmod -R a+x "$DIR"
    
    rm "linux64/$DIR.deb" 
    
    fpm \
    --input-type dir \
    --output-type deb \
    --name 'pragma-git' \
    --maintainer 'axelsson.jan@gmail.com' \
    --version "$VERSION" \
    --description "Pragma-git -- the pragmatic revision control"  \
    --deb-no-default-config-files \
    --chdir "$DIR" \
    --package "linux64/$DIR.deb" \
    --after-install '/Users/jan/Documents/Projects/Pragma-git/Pragma-git/make_binaries/assets-linux/postinst' \
    --after-remove '/Users/jan/Documents/Projects/Pragma-git/Pragma-git/make_binaries/assets-linux/postrm' \
    .=/opt/pragma-git
    
    # Remove installation : sudo dpkg --remove pragma-git
    # Installation : sudo dpkg --install /mnt/Pragma-git/linux64/Pragma-git- (tab)
    


#
# Build Linux RPM installer
#

    tput setaf $COLOR; echo ' '
    echo '============================'
    echo 'INSTALLER LINUX 64-BIT (RPM)'
    echo '============================'
    tput sgr0
    
    cd ~/Documents/Projects/Pragma-git/dist
    rm linux64/*.rpm
    mkdir linux64
    
    
    DIR=$(ls -1 ../dist/|grep  'linux-x64') # Pragma-git-0.1.0-linux-x64
    VERSION=$(echo $DIR | cut -d '-' -f 3)  # Pragma-git-0.1.0-linux-x64 => VERSION='0.1.0'
    chmod -R a+x "$DIR"
    
    rm "linux64/$DIR.rpm" 
    
    # Dependencies are added from problems I had with CentOS7
    fpm \
    --input-type dir \
    --output-type rpm \
    --name 'pragma-git' \
    --maintainer 'axelsson.jan@gmail.com' \
    --version "$VERSION" \
    --description "Pragma-git -- the pragmatic revision control"  \
    --chdir "$DIR" \
    --package "linux64/$DIR.rpm" \
    --depends libXScrnSaver \
    --depends libatomic \
    --rpm-os linux \
    --after-install '/Users/jan/Documents/Projects/Pragma-git/Pragma-git/make_binaries/assets-linux/postinst' \
    --after-remove '/Users/jan/Documents/Projects/Pragma-git/Pragma-git/make_binaries/assets-linux/postrm' \
    .=/opt/pragma-git
    
    # For a fresh centos 7 install, do  : sudo yum erase libXScrnSaver libatomic pragma-git
    # For centos7 install from file, do : sudo yum localinstall /mnt/Pragma-git/linux64/Pragma-git- (tab)
 
    
#
# DONE
#
    tput setaf $COLOR; echo ' '
    echo '=====' 
    echo 'DONE '
    echo '====='   
    tput sgr0  

    read -n 1 -s -r -p "DONE : Press any key to continue" && tput setaf $COLOR; echo ' '
