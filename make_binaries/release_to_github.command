#!/bin/bash

# Modify  1) - 3) :

# 1) Tag to use for this Release
TAG=0.8.1

# 2) Release Title
RELEASE_TITLE='Dark mode release'

# 3) Release Notes
read -r -d '' RELEASE_NOTES << ---
First release on pragma-git account on github

Darkmode, search in all windows, 

___
The aim with Pragma-git is to be
- ”pragmatic” — aiming to be the opposite to how many beginners perceive git
- easy to start — and something to grow in for daily programming tasks
- friendly — guiding you through risks of data loss with pop-up warnings and instructions

Read more on the home page : https://janaxelsson.github.io/Pragma-git/

**Download the *one* installer that matches your system :**

**-win-x64.exe** (Windows 64 bit)
**-mac-x64.dmg** (MacOs 64 bit)
**-linux-x64.deb** (Linux 64 bit for Ubuntu, Linux Mint, Debian, ...)
**-linux-x64.rpm** (Linux 64 bit RedHat, Fedora, CentOS, openSUSE, ...)
**-win-x86** (Windows 32 bit)
---


TOKEN_FILE="../mytoken.txt"
REPO=pragma-git/pragma-git

#
# Create Release and Upload binaries
#

    # Login
    gh auth login --with-token < "$TOKEN_FILE"
    #gh auth login --web
    
    # Create Release
    gh release create \
      $TAG \
      --repo "$REPO" \
      --draft \
      --notes "$RELEASE_NOTES" \
      --title "$RELEASE_TITLE"
      
    # Upload binaries  
    cd '/Users/jan/Documents/Projects/Pragma-git/dist/'

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
