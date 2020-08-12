#!/bin/bash
USER='JanAxelssonTest'
TOKEN=01e0b46efb5c37ceba6e72e7433a7e0863e016c7
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
    TEST_REPO="Pull_test_repo" 
    curl -i \
      -X 'DELETE' \
      -H "Authorization: token $TOKEN" \
      -H "Accept: application/vnd.github.nebula-preview+json" \
      "https://api.github.com/repos/$USER/Pull_test_repo"

    # Create a new private github repo   
    curl -i \
      -H "Authorization: token $TOKEN" \
      -H "Accept: application/vnd.github.nebula-preview+json" \
      -d '{"name" : "Pull_test_repo","private" : true,"description" : "Pull test repo"}'  \
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
    
    # Now make first bit of conflict
    date >> G
    git add G
    git commit -m 'H'

#
# Now change and push from a cloned repo
#

    # Make a cloned folder
    clonedFolder='/tmp/clonedThreeBranches'
    rm -rf $clonedFolder
    mkdir $clonedFolder
    cd $clonedFolder
    
    sleep 2
    git clone https://$USER:$TOKEN@github.com/$USER/$TEST_REPO 
    
    # Change in cloned folder and push to origin/master
    cd "$clonedFolder/Pull_test_repo"
    pwd
    
    # Now make second bit of conflict (in github repo)
    date >> G
    git add G
    git commit -m 'H'
    git push





