#!/bin/bash
#
# Make a detached head with two commits in current folder
#

# Create detached HEAD
git checkout HEAD^^

# Create first commit
date > new3
git add .
git commit -m 'new3'

# Create second commit
date > new4
git add .
git commit -m 'new4'
