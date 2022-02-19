#!/bin/bash

USER='JanAxelssonTest'
TOKEN=$(cat ../../mytoken_test_scripts.txt)

#
# Creates an empty github repository
#

#
# Make fresh repo in github
#  

    
    # DELETE github repo    (delete_repo=on must be set when making access token)
    TEST_REPO="Remote_empty_repo" 
    curl -i \
      -X 'DELETE' \
      -H "Authorization: token $TOKEN" \
      -H "Accept: application/vnd.github.nebula-preview+json" \
      "https://api.github.com/repos/$USER/$TEST_REPO"

    # Create a new private github repo   
    curl -i \
      -H "Authorization: token $TOKEN" \
      -H "Accept: application/vnd.github.nebula-preview+json" \
      -d '{"name" : "'$TEST_REPO'", "private" : true,"description" : "Test repo for an empty github repo"}'  \
      https://api.github.com/user/repos  



#
# Now add a branch and push from a cloned repo
#

    # Make a cloned folder
    clonedFolder="/tmp/$TEST_REPO"
    rm -rf $clonedFolder
    mkdir $clonedFolder
    cd $clonedFolder
    
    sleep 2
    git clone https://$USER:$TOKEN@github.com/$USER/$TEST_REPO .
    
    # Change in cloned folder 
    cd "$clonedFolder"
    pwd
    
    # Make new file
    touch testfile
    
    # Show local config
    git config --list --local | grep remote






