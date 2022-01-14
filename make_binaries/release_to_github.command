#!/bin/bash

# FIRST : Run make_binaries on checked out tag

# SECOND : Modify  2) - 3) :

# 1) Tag to use for this Release
TAG=$(cat ../package.json | grep 'version' | cut -d'"' -f4)
echo "TAG = $TAG"

# 2) Release Title
RELEASE_TITLE='Release 0.9.3'

# 3) Release Notes (edit first part before line)
read -r -d '' RELEASE_NOTES << ---
### Fifth release of pragma-git 

Changes :
* Graph window : Commit info window stays opened until close-button pressed. Gives less flicker. Allows copying text to clipboard
* Graph window : zoom with ctrl + mousewheel
* Graph window : close button for commit info window
* Settings window : improve Windows 10 red font display
* Notes window : hyperlink to a local document opens in system's default app. Internet link opens in browser.
* Diff window : improve theme colors for code chunks that differ
* Reintroduced message at first start : "Drop folder on window ..."
* Fix failed to start on new install (only upgrading from previous versions worked)


___
### About Pragma-git
The aim with Pragma-git is to be
- ”pragmatic” — aiming to be the opposite to how many beginners perceive git
- easy to start — and something to grow in for daily programming tasks
- friendly — guiding you through risks of data loss with pop-up warnings and instructions

Read more on the home page : https://pragma-git.github.io

### Quick Install

Download the *one* installer that matches your system from the "__*assets*__" link below: 
- __win-x64.exe__ (Windows 64 bit) 
- __mac-x64.dmg__ (Mac 64 bit)
- __linux-x64.deb__ (Linux 64 bit for Ubuntu, Linux Mint, Debian, ...)
- __linux-x64.rpm__ (Linux 64 bit RedHat, Fedora, CentOS, openSUSE, ...)
- __win-x86__ (Windows 32 bit)

[Install instructions](https://pragma-git.github.io#installation)
---

# NOTE : If header name in https://pragma-git.github.io is changed, its element id will be changed.  
# Modify link above from "installation" to new id (the id can be found by from html-source of https://pragma-git.github.io).


TOKEN_FILE="../../mytoken.txt"  #NOTE: Token requires scopes: repos, write:packages, admin:org, and maybe user
REPO=pragma-git/pragma-git

#
# Create Release and Upload binaries
#

    # Login
    echo 'LOG IN TO GITHUB'
    gh auth login --with-token < "$TOKEN_FILE"
    #gh auth login --web
    
    # Create Release
    echo 'CREATE RELEASE'
    gh release create \
      $TAG \
      --repo "$REPO" \
      --draft \
      --notes "$RELEASE_NOTES" \
      --title "$RELEASE_TITLE"
      
    # Upload binaries  
    echo 'UPLOAD BINARIES'
    cd '/Users/jan/Documents/Projects/Pragma-git/dist/'

    echo 'UPLOAD MAC'
    gh release upload  $TAG  --repo "$REPO"  "$(ls mac/Pragma-git*.dmg)" 
    echo 'UPLOAD WIN32'
    gh release upload  $TAG  --repo "$REPO"  "$(ls win32/Pragma-git*.exe)" 
    echo 'UPLOAD WIN64'
    gh release upload  $TAG  --repo "$REPO"  "$(ls win64/Pragma-git*.exe)" 
    echo 'UPLOAD LINUX DEB'
    gh release upload  $TAG  --repo "$REPO"  "$(ls linux64/Pragma-git*.deb)" 
    echo 'UPLOAD LINUX RPM'
    gh release upload  $TAG  --repo "$REPO"  "$(ls linux64/Pragma-git*.rpm)" 

#
# DONE
#
    echo ' '
    echo '=====' 
    echo 'DONE '
    echo '====='     

    read -n 1 -s -r -p "DONE : Press any key to continue" && echo ' '
