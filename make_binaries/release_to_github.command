#!/bin/bash

TAG=0.7.2
REPO=JanAxelsson/Pragma-git

RELEASE_TITLE='First release on GitHub'

# Release Notes
read -r -d '' RELEASE_NOTES << ---
This is the first release of Pragma-git the pragmatic Git Client

The aim with Pragma-git is to be
- ”pragmatic” — aiming to be the opposite to how many beginners perceive git
- easy to start — and something to grow in for daily programming tasks
- friendly — guiding you through risks of data loss with pop-up warnings and instructions

Read more on the home page : https://janaxelsson.github.io/Pragma-git/

___
**Download the *one* installer that matches your system :**

**-win-x64.exe** (Windows 64 bit)
**-mac-x64.dmg** (MacOs 64 bit)
**-linux-x64.deb** (Linux 64 bit for Ubuntu, Linux Mint, Debian, ...)
**-linux-x64.rpm** (Linux 64 bit RedHat, Fedora, CentOS, openSUSE, ...)
**-win-x86** (Windows 32 bit)
---


cd '/Users/jan/Documents/Projects/Pragma-git/dist/'

#
# Create Release and Upload binaries
#

    # Login
    #gh auth login --with-token < mytoken.txt
    gh auth login --web
    
    # Create Release
    gh release create \
      $TAG \
      --repo "$REPO" \
      --draft \
      --notes "$RELEASE_NOTES" \
      --title "$RELEASE_TITLE"
      
    # Upload binaries  
    gh release upload \
      $TAG \
      '/Users/jan/Documents/Projects/Pragma-git/dist/win32/Pragma-git-installer.exe' \
      --repo "$REPO" 
      
    gh release upload  $TAG  --repo "$REPO"  "$(ls mac/Pragma-git*.dmg)" 
    gh release upload  $TAG  --repo "$REPO"  "$(ls win32/Pragma-git*.exe)" 
    gh release upload  $TAG  --repo "$REPO"  "$(ls win64/Pragma-git*.exe)" 
    gh release upload  $TAG  --repo "$REPO"  "$(ls linux64/Pragma-git*.deb)" 
    gh release upload  $TAG  --repo "$REPO"  "$(ls linux64/Pragma-git*.rpm)" 

#
# DONE
#
    echo ' '
    echo '=====' 
    echo 'DONE '
    echo '====='     

    read -n 1 -s -r -p "DONE : Press any key to continue" && echo ' '
