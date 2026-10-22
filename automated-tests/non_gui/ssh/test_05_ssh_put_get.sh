#!/bin/bash
# test_05_ssh_put_get.sh - Tests ssh-put and ssh-get remote file transfer

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SSH_FOLDER_DIR="$REPO_ROOT/ssh_folder"
PUT_BIN="$SSH_FOLDER_DIR/ssh-put"
GET_BIN="$SSH_FOLDER_DIR/ssh-get"

source "$SSH_FOLDER_DIR/lib/ssh-functions"

CURRENT_USER=$(whoami)
source "$REPO_ROOT/automated-tests/test_setup.sh"

echo "Running Suite: SSH File Transfer (ssh-put / ssh-get) Tests"

TEST_SERVER_DIR="/tmp/pragma_put_get_server_$$"
SSH_URL="ssh://${CURRENT_USER}@localhost${TEST_SERVER_DIR}"
REL_FILE="test_sub/sample_$$.txt"

mkdir -p "$TEST_SERVER_DIR"

# Test 1: Prepare local file in TEMP_FILE_LOCATION and ssh-put to server
LOCAL_FILE="${TEMP_FILE_LOCATION}/${REL_FILE}"
mkdir -p "$(dirname "$LOCAL_FILE")"
TEST_CONTENT="Pragma-git put test payload timestamp $(date +%s)"
echo "$TEST_CONTENT" > "$LOCAL_FILE"

OUTPUT=$("$PUT_BIN" "$SSH_URL" "$REL_FILE" 2>&1)
EXIT_CODE=$?
SERVER_FILE="${TEST_SERVER_DIR}/${REL_FILE}"

if [ $EXIT_CODE -eq 0 ] && [ -f "$SERVER_FILE" ]; then
    assert_pass "5.1: ssh-put successfully transfers file to server"
else
    assert_fail "5.1: ssh-put transfers file to server" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 2: Verify server file content matches uploaded payload
SERVER_CONTENT=$(cat "$SERVER_FILE" 2>/dev/null)
if [ "$SERVER_CONTENT" = "$TEST_CONTENT" ]; then
    assert_pass "5.2: Server file content matches original payload"
else
    assert_fail "5.2: Server file content matches original payload" "Expected: $TEST_CONTENT, Got: $SERVER_CONTENT"
fi

# Test 3: Modify server file and retrieve with ssh-get
MODIFIED_CONTENT="Modified server payload timestamp $(date +%s)"
echo "$MODIFIED_CONTENT" > "$SERVER_FILE"
rm -f "$LOCAL_FILE"

OUTPUT=$("$GET_BIN" "$SSH_URL" "$REL_FILE" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ] && [ -f "$LOCAL_FILE" ]; then
    assert_pass "5.3: ssh-get successfully retrieves file from server"
else
    assert_fail "5.3: ssh-get retrieves file from server" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 4: Verify retrieved local content matches modified server content
RETRIEVED_CONTENT=$(cat "$LOCAL_FILE" 2>/dev/null)
if [ "$RETRIEVED_CONTENT" = "$MODIFIED_CONTENT" ]; then
    assert_pass "5.4: Retrieved local file content matches server modification"
else
    assert_fail "5.4: Retrieved local file content matches server modification" "Expected: $MODIFIED_CONTENT, Got: $RETRIEVED_CONTENT"
fi

# Clean up
if [ "$KEEP_TEMP" = "true" ] || [ "$KEEP_TEMP" = "1" ]; then
    echo "  [INFO] Preserved transfer dir in /tmp: $TEST_SERVER_DIR"
else
    rm -rf "$TEST_SERVER_DIR"
fi
rm -f "$LOCAL_FILE"

print_suite_result
exit $?
