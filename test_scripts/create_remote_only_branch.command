#!/bin/bash
#
# export TOKEN=......
#
# then run this script
USER='JanAxelssonTest'

#
# second          C - D - E - Emod
#                /
# master  - A - B - F - G - Gmod
#                \
# third           T1 - T2 


#
# Make fresh repo in github
#  

    
    # DELETE github repo    (delete_repo=on must be set when making access token)
    TEST_REPO="Remote_branch_test_repo" 
    curl -i \
      -X 'DELETE' \
      -H "Authorization: token $TOKEN" \
      -H "Accept: application/vnd.github.nebula-preview+json" \
      "https://api.github.com/repos/$USER/Remote_branch_test_repo"

    # Create a new private github repo   
    curl -i \
      -H "Authorization: token $TOKEN" \
      -H "Accept: application/vnd.github.nebula-preview+json" \
      -d '{"name" : "Remote_branch_test_repo","private" : true,"description" : "Pull test repo"}'  \
      https://api.github.com/user/repos  

#
# Make three branches local repo
#
    ./make_three_filled_branches.command
    
    
    REPO=/tmp/threeBranches
    
    cd $REPO
    
    # Setup tracking and push
    git remote add origin https://$USER:$TOKEN@github.com/$USER/$TEST_REPO
    git branch --set-upstream-to=origin/master master
    git push -u origin master
    
    # Push two branches
    git checkout second
    git push --set-upstream origin second
    
    git checkout third
    git push --set-upstream origin third

#
# Now add a branch and push from a cloned repo
#

    # Make a cloned folder
    clonedFolder='/tmp/clonedRemote_branch_test_repo'
    rm -rf $clonedFolder
    mkdir $clonedFolder
    cd $clonedFolder
    
    sleep 2
    git clone https://$USER:$TOKEN@github.com/$USER/$TEST_REPO .
    
    # Change in cloned folder and push to origin/master
    cd "$clonedFolder"
    pwd






