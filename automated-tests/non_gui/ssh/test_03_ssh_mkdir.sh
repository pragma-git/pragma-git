#!/bin/bash
# test_03_ssh_mkdir.sh - Tests ssh-mkdir remote directory creation

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SSH_FOLDER_DIR="$REPO_ROOT/ssh_folder"
MKDIR_BIN="$SSH_FOLDER_DIR/ssh-mkdir"
TEST_EXISTS_BIN="$SSH_FOLDER_DIR/ssh-test-if-file-exists"

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

echo "Running Suite: SSH Remote Directory Creation (ssh-mkdir) Tests"

TEST_BASE="/tmp/pragma_mkdir_test_$$"
rm -rf "$TEST_BASE"

# Test 1: Create a single directory
TARGET_DIR="${TEST_BASE}/single_folder"
OUTPUT=$("$MKDIR_BIN" "ssh://${CURRENT_USER}@localhost${TARGET_DIR}" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ] && [ -d "$TARGET_DIR" ]; then
    assert_pass "3.1: Create remote directory via ssh-mkdir"
else
    assert_fail "3.1: Create remote directory via ssh-mkdir" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 2: Create nested directories
TARGET_NESTED="${TEST_BASE}/nested/path/to/folder"
OUTPUT=$("$MKDIR_BIN" "ssh://${CURRENT_USER}@localhost${TARGET_NESTED}" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ] && [ -d "$TARGET_NESTED" ]; then
    assert_pass "3.2: Create nested remote directories (mkdir -p behavior)"
else
    assert_fail "3.2: Create nested remote directories" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 3: Idempotency (creating already existing folder succeeds without error)
OUTPUT=$("$MKDIR_BIN" "ssh://${CURRENT_USER}@localhost${TARGET_NESTED}" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    assert_pass "3.3: Idempotent creation of existing directory"
else
    assert_fail "3.3: Idempotent creation of existing directory" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 4: Paths containing spaces
TARGET_SPACES="${TEST_BASE}/folder with spaces"
OUTPUT=$("$MKDIR_BIN" "ssh://${CURRENT_USER}@localhost${TARGET_SPACES}" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ] && [ -d "$TARGET_SPACES" ]; then
    assert_pass "3.4: Create remote directory with spaces in name"
else
    assert_fail "3.4: Create remote directory with spaces in name" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Clean up
if [ "$KEEP_TEMP" = "true" ] || [ "$KEEP_TEMP" = "1" ]; then
    echo "  [INFO] Preserved in /tmp: $TEST_BASE"
else
    rm -rf "$TEST_BASE"
fi

echo "Suite Result: $PASS_COUNT passed, $FAIL_COUNT failed"
[ $FAIL_COUNT -eq 0 ] && exit 0 || exit 1
