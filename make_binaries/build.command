#!/bin/bash


# Prerequisits nwjs-phoenix-builder

# 1) brew cask install wine-stable --no-quarantine
# 2) download rcedit-64.exe (https://github.com/electron/rcedit/releases)  => Hämtade Filer.  Högerklicka Öppna efter nedladdning för att tillåta.
# 3) rm /Users/jan/Documents/Projects/Pragma-git/node_modules/rcedit/bin/rcedit.exe \
#    ln -s /Users/jan/Downloads/rcedit-x64.exe /Users/jan/Documents/Projects/Pragma-git/node_modules/rcedit/bin/rcedit.exe


# Build dists into : "/Users/jan/Documents/Projects/Pragma-git/dist"

~/Documents/Projects/Pragma-git/node_modules/.bin/build \
--tasks win-x86,win-x64,linux-x86,linux-x64,mac-x64 \
--mirror https://dl.nwjs.io/  \
--name Pragma-git  \
--concurrent true  \
~/Documents/Projects/Pragma-git/Pragma-git

#Options :
# https://github.com/evshiron/nwjs-builder-phoenix/blob/master/docs/Options.md



# Finish
read -n 1 -s -r -p "Press any key to continue"
