#!/bin/bash

# FIRST : Run make_binaries on checked out tag

# SECOND : Modify  1) - 3) :

# 1) Tag to use for this Release
TAG=0.8.1

# 2) Release Title
RELEASE_TITLE='Dark mode and search release'

# 3) Release Notes (edit first part before line)
read -r -d '' RELEASE_NOTES << ---
Dark mode introduced

___
The aim with Pragma-git is to be
- ”pragmatic” — aiming to be the opposite to how many beginners perceive git
- easy to start — and something to grow in for daily programming tasks
- friendly — guiding you through risks of data loss with pop-up warnings and instructions

Read more on the home page : https://pragma-git.github.io

Download the *one* installer that matches your system from the "__*assets*__" link: 
- __win-x64.exe__ (Windows 64 bit) 
- __mac-x64.dmg__ (Mac 64 bit)
- __linux-x64.deb__ (Linux 64 bit for Ubuntu, Linux Mint, Debian, ...)
- __linux-x64.rpm__ (Linux 64 bit RedHat, Fedora, CentOS, openSUSE, ...)
- __win-x86__ (Windows 32 bit)
---


TOKEN_FILE="../../mytoken.txt"  // NOTE: Token requires scopes: repos, write:packages, admin:org, and maybe user
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
