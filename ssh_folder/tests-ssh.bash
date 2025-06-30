#!/bin/bash 
#
# Purpose -- test the ssh-folder functions 
# Test against a repository on a server, which you can connect to with SSH without login
#
# Note : this is not to confuse with an ssh git remote repository (which acts similar to an https remote git repository)
#  
# Requirements : SSH_FOLDER is a repo on a server to which you have password-less ssh-login    


# Run from same folder as this script
cd $(dirname $0)

# Read constants 
#    TEMP_FILE_LOCATION  --  local temporary file storage
#    SSH_OPTIONS  -- options to use for SSH and SCP
# and read function
#    getSshUrlParts -- gives variables for SERVER, PORT, SERVER_BASE_PATH from $1 
source lib/ssh-functions

TEST_LOG="/tmp/testlog.log"
rm  "$TEST_LOG" > /dev/null

counter=0

function main () {
    
    # Specific for "ssh-test-if-file-exists"
    
    SSH_FOLDER='ssh://jan@home-jan-ubuntu/home/jan/Desktop/ssh local test/.git'   # Mainly check test-ssh-test-if-file-exists finds a folder (.git)
    runTestFileExists 0
    
    SSH_FOLDER='ssh://jan@home-jan-ubuntu/home/jan/Desktop/ssh local test/.git/index'   # Mainly check test-ssh-test-if-file-exists finds a file  (.git/index)
    runTestFileExists 0
    
    
    # General for all functions
    
    REL_FILE="new_folder/jan"
    
    SSH_FOLDER='ssh://jan@home-jan-ubuntu/home/jan/Desktop/ssh local test'   # Default port  -- Excpect [OK) if works
    runTests 0
    
    SSH_FOLDER='ssh://jan@home-jan-ubuntu:/home/jan/Desktop/ssh local test'  # Default port written another way  -- [OK) if works
    runTests 0
    
    SSH_FOLDER='ssh://jan@home-jan-ubuntu:22/home/jan/Desktop/ssh local test'  # Specify port  -- [OK) if works
    runTests 0
    
    SSH_FOLDER='ssh://jan@home-jan-ubuntu:222/home/jan/Desktop/ssh local test'  # Wrong port existing server -- [OK] if fails
    runTests 1
    
    SSH_FOLDER='ssh://my-non-existing-server/test/location'  # Non-existing server  -- [OK) if fails
    runTests 1
}

function runTestFileExists () {
    # Input $1 -- 0 expect working, 1 expect fail
    
    # Print server info the way it is done inside functions (using functions from lib/ssh-functions)
    echo ' '
    echo '======================================'
    (( 0 == $1 ))   && echo EXPECT OK  || echo EXPECT FAIL
    echo "SSHURL = $SSH_FOLDER"
    getSshUrlParts "$SSH_FOLDER" 
    

    echo SERVER=$SERVER
    echo PORT=$PORT
    echo SERVER_BASE_PATH=$SERVER_BASE_PATH
    
    echo '======================================'
    
    
    test-ssh-test-if-file-exists $1
    echo '' >> "$TEST_LOG"  # Empty row in summary
}

function runTests () {
    # Input $1 -- 0 expect working, 1 expect fail
    
    # Print server info the way it is done inside functions (using functions from lib/ssh-functions)
    echo ' '
    echo '======================================'
    (( 0 == $1 ))   && echo EXPECT OK  || echo EXPECT FAIL
    echo "SSHURL = $SSH_FOLDER"
    getSshUrlParts "$SSH_FOLDER" 
    

    echo SERVER=$SERVER
    echo PORT=$PORT
    echo SERVER_BASE_PATH=$SERVER_BASE_PATH
    
    echo '======================================'
    
    
    test-ssh-test-if-file-exists $1
    test-ssh-git-client $1
    test-ssh-put $1
    test-ssh-get $1
    echo '' >> "$TEST_LOG"  # Empty row in summary
}

    
function formatReturn () {
    inCode=$1
    expect=$2  # expect = 0 means (incode = 0) gives  OK.  expect = 1 means (incode != 0) gives  OK
    
    inCode=$( (( ($inCode > 0) == ($expect > 0) ))  && echo 0 || echo 1 )
    
    
    echo -n '['
    
    if [ $inCode -eq 0 ] ; then
        tput setaf 2  # Green
        echo -n "OK"
        tput sgr0  
        echo -n ']   - '
    else
        tput setaf 1  # Red
        echo -n "XX"
        tput sgr0  
        echo -n '] -'
    fi
}

function test-ssh-git-client () {
    #
    # Test ssh-git-client  (Drop in replacement for git with one extra paramter, to run git commands on a server via ssh )
    #
     ((counter++))
    echo "($counter) --- SSH-GIT-CLIENT ---"
    ./ssh-git-client -c "SSHURL=${SSH_FOLDER}" status
    echo "($counter) " $(formatReturn $? $1) "ssh-git-client $SSH_FOLDER status" | tee -a "$TEST_LOG"
    echo ' '
    
}

function test-ssh-put () {

    #
    # Test ssh-put  (Put file from TEMP_FILE_LOCATION in ssh-folder )
    #
     ((counter++))
    echo "($counter) --- SSH-PUT ---"
    REL_FILE="new_folder/jan"
    NEW_FILE="${TEMP_FILE_LOCATION}/${REL_FILE}"
    mkdir -p "$( dirname "${NEW_FILE}" )"
    date > "${NEW_FILE}"
    ./ssh-put "${SSH_FOLDER}" "${REL_FILE}"
    echo "($counter) " $(formatReturn $? $1) "ssh-put $SSH_FOLDER ${REL_FILE}" | tee -a "$TEST_LOG"
    echo ' '
    
 }   
 
function test-ssh-get () {    
    #
    # Test ssh-get  (Get temporary file from server)
    #
     ((counter++))
    echo "($counter) --- SSH-GET ---"
    rm -rf "${TEMP_FILE_LOCATION}" ; 
    ./ssh-get "${SSH_FOLDER}" "${REL_FILE}"
    echo "($counter) " $(formatReturn $? $1) "ssh-get $SSH_FOLDER ${REL_FILE}" | tee -a "$TEST_LOG"
    echo ' '
}

function test-ssh-test-if-file-exists () {    
    #
    # Test ssh-get  (Get temporary file from server)
    #
     ((counter++))
    echo "($counter) --- SSH-TEST-IF-FILE-EXISTS ---"
    ./ssh-test-if-file-exists "${SSH_FOLDER}" "${REL_FILE}"
    echo "($counter) " $(formatReturn $? $1) "ssh-test-if-file-exists $SSH_FOLDER ${REL_FILE}" | tee -a "$TEST_LOG"
    echo ' '
}

main

echo "--- SUMMARY ---"
cat "$TEST_LOG"
rm  "$TEST_LOG" 
