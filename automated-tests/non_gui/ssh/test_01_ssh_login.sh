#!/bin/bash
# test_01_ssh_login.sh - Tests ssh-test-login functionality against localhost

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SSH_FOLDER_DIR="$REPO_ROOT/ssh_folder"
TEST_LOGIN_BIN="$SSH_FOLDER_DIR/ssh-test-login"

source "$REPO_ROOT/automated-tests/test_setup.sh"
CURRENT_USER="${CURRENT_USER##*\\}"

echo "Running Suite: SSH Login & Authentication Tests"

# Test 1: Passwordless login to localhost with default key
OUTPUT=$("$TEST_LOGIN_BIN" "ssh://${CURRENT_USER}@localhost/tmp" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -q "STATUS:OK"; then
    assert_pass "1.1: Default passwordless login to ${CURRENT_USER}@localhost"
else
    assert_fail "1.1: Default passwordless login to ${CURRENT_USER}@localhost" "Exit code: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 2: Login with explicit existing key path
# Find the first available private key in ~/.ssh
KNOWN_KEY=""
for key in "$HOME/.ssh/id_rsa_jans_mac" "$HOME/.ssh/id_ed25519" "$HOME/.ssh/id_ecdsa" "$HOME/.ssh/id_rsa"; do
    if [ -f "$key" ]; then
        KNOWN_KEY="$key"
        break
    fi
done

if [ -n "$KNOWN_KEY" ]; then
    OUTPUT=$(PRAGMA_SSH_KEY="$KNOWN_KEY" "$TEST_LOGIN_BIN" "ssh://${CURRENT_USER}@localhost/tmp" 2>&1)
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -q "STATUS:OK"; then
        assert_pass "1.2: Explicit key login using $KNOWN_KEY"
    else
        assert_fail "1.2: Explicit key login using $KNOWN_KEY" "Exit code: $EXIT_CODE, Output: $OUTPUT"
    fi
else
    echo "  ${YELLOW}[SKIP]${NORMAL} 1.2: Explicit key login (no known standard key found in ~/.ssh)"
fi

# Test 3: Unauthorized key rejection (against 127.0.0.1)
TEMP_UNAUTH_KEY="/tmp/pragma_test_unauth_key_$$"
ssh-keygen -t ed25519 -N "" -f "$TEMP_UNAUTH_KEY" >/dev/null 2>&1
OUTPUT=$(PRAGMA_SSH_KEY="$TEMP_UNAUTH_KEY" "$TEST_LOGIN_BIN" "ssh://${CURRENT_USER}@127.0.0.1/tmp" 2>&1)
rm -f "$TEMP_UNAUTH_KEY" "${TEMP_UNAUTH_KEY}.pub"

if echo "$OUTPUT" | grep -q "STATUS:KEY_NEEDED"; then
    assert_pass "1.3: Unauthorized key is rejected with STATUS:KEY_NEEDED"
else
    assert_fail "1.3: Unauthorized key is rejected with STATUS:KEY_NEEDED" "Output: $OUTPUT"
fi

# Test 4: Unreachable / non-existing host
OUTPUT=$("$TEST_LOGIN_BIN" "ssh://${CURRENT_USER}@non-existing-host-pragma-test.local/tmp" 2>&1)
if echo "$OUTPUT" | grep -qiE "could not resolve|STATUS:ERROR|STATUS:TIMEOUT"; then
    assert_pass "1.4: Non-existing hostname reports connection failure"
else
    assert_fail "1.4: Non-existing hostname reports connection failure" "Output: $OUTPUT"
fi

# Test 5: Wrong port (connection refused)
OUTPUT=$("$TEST_LOGIN_BIN" "ssh://${CURRENT_USER}@127.0.0.1:59998/tmp" 2>&1)
if echo "$OUTPUT" | grep -qiE "connection refused|STATUS:ERROR"; then
    assert_pass "1.5: Inaccessible port reports connection refused"
else
    assert_fail "1.5: Inaccessible port reports connection refused" "Output: $OUTPUT"
fi

print_suite_result
exit $?
