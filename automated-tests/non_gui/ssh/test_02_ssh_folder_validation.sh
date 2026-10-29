#!/bin/bash
# test_02_ssh_folder_validation.sh - Tests ssh-test-if-file-exists and folder/repo detection

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SSH_FOLDER_DIR="$REPO_ROOT/ssh_folder"
TEST_EXISTS_BIN="$SSH_FOLDER_DIR/ssh-test-if-file-exists"

source "$REPO_ROOT/automated-tests/test_setup.sh"
CURRENT_USER="${CURRENT_USER##*\\}"

echo "Running Suite: SSH Folder & Repository Validation Tests"

# Test 1: Existing directory on server
OUTPUT=$("$TEST_EXISTS_BIN" "ssh://${CURRENT_USER}@localhost/tmp" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -q "File exists"; then
    assert_pass "2.1: Existing directory on server (/tmp) detected correctly"
else
    assert_fail "2.1: Existing directory on server (/tmp) detected correctly" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 2: Non-existing directory on server
NON_EXISTENT_PATH="/tmp/pragma_non_existent_dir_$$"
OUTPUT=$("$TEST_EXISTS_BIN" "ssh://${CURRENT_USER}@localhost${NON_EXISTENT_PATH}" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 1 ] && echo "$OUTPUT" | grep -q "File missing"; then
    assert_pass "2.2: Non-existing directory detected as missing (exit code 1)"
else
    assert_fail "2.2: Non-existing directory detected as missing" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 3: Existing non-repo directory (verifying .git does not exist)
TEST_NON_REPO="/tmp/pragma_test_plain_dir_$$"
mkdir -p "$TEST_NON_REPO"
OUTPUT=$("$TEST_EXISTS_BIN" "ssh://${CURRENT_USER}@localhost${TEST_NON_REPO}/.git" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 1 ] && echo "$OUTPUT" | grep -q "File missing"; then
    assert_pass "2.3: Non-repo folder correctly identified (missing .git)"
else
    assert_fail "2.3: Non-repo folder correctly identified (missing .git)" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi
rm -rf "$TEST_NON_REPO"

# Test 4: Existing valid Git repo (verifying .git exists)
TEST_REPO="/tmp/pragma_test_valid_repo_$$"
mkdir -p "$TEST_REPO"
git -C "$TEST_REPO" init >/dev/null 2>&1
OUTPUT=$("$TEST_EXISTS_BIN" "ssh://${CURRENT_USER}@localhost${TEST_REPO}/.git" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -q "File exists"; then
    assert_pass "2.4: Valid Git repo correctly identified (.git exists)"
else
    assert_fail "2.4: Valid Git repo correctly identified (.git exists)" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi
if [ "$KEEP_TEMP" = "true" ] || [ "$KEEP_TEMP" = "1" ]; then
    echo "  [INFO] Preserved in /tmp: $TEST_REPO"
else
    rm -rf "$TEST_REPO"
fi

# Test 5: Inaccessible host (fails gracefully)
OUTPUT=$("$TEST_EXISTS_BIN" "ssh://${CURRENT_USER}@invalid-host-pragma-test.local/tmp" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    assert_pass "2.5: Inaccessible host handled with non-zero exit code ($EXIT_CODE)"
else
    assert_fail "2.5: Inaccessible host should return non-zero exit code" "Output: $OUTPUT"
fi

print_suite_result
exit $?
