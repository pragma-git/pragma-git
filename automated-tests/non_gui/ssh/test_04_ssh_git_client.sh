#!/bin/bash
# test_04_ssh_git_client.sh - Tests ssh-git-client remote Git operations

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SSH_FOLDER_DIR="$REPO_ROOT/ssh_folder"
GIT_CLIENT_BIN="$SSH_FOLDER_DIR/ssh-git-client"

CURRENT_USER=$(whoami)
PASS_COUNT=0
FAIL_COUNT=0

function assert_pass() {
    local desc="$1"
    echo "  [PASS] $desc"
    ((PASS_COUNT++))
}

function assert_fail() {
    local desc="$1"
    local details="$2"
    echo "  [FAIL] $desc"
    [ -n "$details" ] && echo "         $details"
    ((FAIL_COUNT++))
}

echo "Running Suite: SSH Git Client (ssh-git-client) Operations Tests"

TEST_REPO_DIR="/tmp/pragma_git_client_test_$$"
SSH_URL="ssh://${CURRENT_USER}@localhost${TEST_REPO_DIR}"

rm -rf "$TEST_REPO_DIR"
mkdir -p "$TEST_REPO_DIR"

# Test 1: Initialize Git repo on server over SSH
OUTPUT=$("$GIT_CLIENT_BIN" -c "SSHURL=$SSH_URL" init 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ] && [ -d "$TEST_REPO_DIR/.git" ]; then
    assert_pass "4.1: git init over SSH"
else
    assert_fail "4.1: git init over SSH" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 2: git status on clean repo
OUTPUT=$("$GIT_CLIENT_BIN" -c "SSHURL=$SSH_URL" status 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -qiE "nothing to commit|No commits yet"; then
    assert_pass "4.2: git status over SSH"
else
    assert_fail "4.2: git status over SSH" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 3: Create file and git add over SSH
echo "Hello SSH Git" > "$TEST_REPO_DIR/test_file.txt"
OUTPUT=$("$GIT_CLIENT_BIN" -c "SSHURL=$SSH_URL" add test_file.txt 2>&1)
EXIT_CODE=$?
STATUS_OUTPUT=$("$GIT_CLIENT_BIN" -c "SSHURL=$SSH_URL" status --porcelain 2>&1)
if [ $EXIT_CODE -eq 0 ] && echo "$STATUS_OUTPUT" | grep -q "A  test_file.txt"; then
    assert_pass "4.3: git add over SSH"
else
    assert_fail "4.3: git add over SSH" "Exit: $EXIT_CODE, Status: $STATUS_OUTPUT"
fi

# Test 4: git commit over SSH
OUTPUT=$("$GIT_CLIENT_BIN" -c "SSHURL=$SSH_URL" commit -m "Test commit via ssh-git-client" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    assert_pass "4.4: git commit over SSH"
else
    assert_fail "4.4: git commit over SSH" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 5: git log over SSH
OUTPUT=$("$GIT_CLIENT_BIN" -c "SSHURL=$SSH_URL" log --oneline 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -q "Test commit via ssh-git-client"; then
    assert_pass "4.5: git log over SSH verifies committed message"
else
    assert_fail "4.5: git log over SSH" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 6: Branch creation and switching over SSH
OUTPUT=$("$GIT_CLIENT_BIN" -c "SSHURL=$SSH_URL" checkout -b feature-ssh-test 2>&1)
EXIT_CODE=$?
BRANCH_OUTPUT=$("$GIT_CLIENT_BIN" -c "SSHURL=$SSH_URL" branch --show-current 2>&1)
if [ $EXIT_CODE -eq 0 ] && echo "$BRANCH_OUTPUT" | grep -q "feature-ssh-test"; then
    assert_pass "4.6: git checkout -b and branch verification over SSH"
else
    assert_fail "4.6: git checkout -b and branch verification over SSH" "Exit: $EXIT_CODE, Output: $BRANCH_OUTPUT"
fi

# Clean up
if [ "$KEEP_TEMP" = "true" ] || [ "$KEEP_TEMP" = "1" ]; then
    echo "  [INFO] Preserved Git repo in /tmp: $TEST_REPO_DIR"
else
    rm -rf "$TEST_REPO_DIR"
fi

TOTAL_COUNT=$((PASS_COUNT + FAIL_COUNT))
echo "Suite Result: $PASS_COUNT/$TOTAL_COUNT passed, $FAIL_COUNT failed"
[ $FAIL_COUNT -eq 0 ] && exit 0 || exit 1
