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
# 5) download rcedit-64.exe (https://github.com/electron/rcedit/releases)  => Hämtade Filer.  Högerklicka Öppna efter nedladdning för att tillåta.
# 6) rm ~/Documents/Projects/Pragma-git/Pragma-git/node_modules/nwjs-builder-phoenix/node_modules/rcedit/bin/rcedit.exe  \
#    ln -s /Users/jan/Downloads/rcedit-x64.exe /Users/jan/Documents/Projects/Pragma-git/Pragma-git/node_modules/nwjs-builder-phoenix/node_modules/rcedit/bin/rcedit.exe


# To create installers

# 7) brew install makensis # For making windows installer
# 8) brew install create-dmg # For creating mac installer
# 9) sudo gem install fpm # For linux .deb creation
# 10) brew install gnu-tar # (tar for macos, for fpm)
# 11) brew install rpm


#
# TROUBLE-SHOOTING
#

# - no windows icons.   5) or 6) above 


    
# Clean old builds
    rm -r /Users/jan/Documents/Projects/Pragma-git/dist/Pragma-git-*
    rm -r /Users/jan/Documents/Projects/Pragma-git/dist/mac
    rm -r /Users/jan/Documents/Projects/Pragma-git/dist/win32
    rm -r /Users/jan/Documents/Projects/Pragma-git/dist/win64
    rm -r /Users/jan/Documents/Projects/Pragma-git/dist/linux64
    


#
# Build dists into : "/Users/jan/Documents/Projects/Pragma-git/dist"
#
    echo ' '
    echo '=========================='
    echo 'BUILDING FOR ALL PLATFORMS'
    echo '=========================='


    # Build
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
    echo ' '
    echo '======================'
    echo 'INSTALLER MACOS 64-BIT'
    echo '======================'

    # Move .app to temporary folder
    mkdir ../dist/temp-macos
    mv "../dist/$(ls -1 ../dist/|grep 'mac-x64')/Pragma-git.app/" ../dist/temp-macos
    
    # Work in destination folder (dist/mac) 
    mkdir ../dist/mac
    cd ../dist/mac
     
    # Make .dmg in ../dist/temp-macos
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

    pwd

#
# Build Windows installers
#

    echo ' '
    echo '===================='
    echo 'INSTALLER WIN 64-BIT'
    echo '===================='
    rm -r ../dist/win64
    mkdir ../dist/win64

    makensis \
    -DEXEFOLDER=$(ls -1 ../dist/|grep  'win-x64') \
    -DOUTPUT='win64\Pragma-git-installer.exe' \
    windows_installer.nsi

    echo ' '
    echo '===================='
    echo 'INSTALLER WIN 32-BIT'
    echo '===================='
    rm -r ../dist/win32
    mkdir ../dist/win32

    makensis \
    -DEXEFOLDER=$(ls -1 ../dist/|grep  'win-x86') \
    -DOUTPUT='win32\Pragma-git-installer.exe' \
    windows_installer.nsi
    


#
# Build Linux DEB installer
#

    echo ' '
    echo '============================'
    echo 'INSTALLER LINUX 64-BIT (DEB)'
    echo '============================'
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

    echo ' '
    echo '============================'
    echo 'INSTALLER LINUX 64-BIT (RPM)'
    echo '============================'
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
    echo ' '
    echo '=====' 
    echo 'DONE '
    echo '====='     

    read -n 1 -s -r -p "DONE : Press any key to continue" && echo ' '
