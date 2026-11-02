#!/bin/bash
# test_08_ssh_sync_keys.sh - Tests ssh-sync-keys mirroring and permissions
#
# Usage: ./test_08_ssh_sync_keys.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SSH_FOLDER_DIR="$REPO_ROOT/ssh_folder"
SYNC_KEYS_BIN="$SSH_FOLDER_DIR/ssh-sync-keys"
SSH_FUNCTIONS="$SSH_FOLDER_DIR/lib/ssh-functions"

source "$REPO_ROOT/automated-tests/test_setup.sh"

echo "Running Suite: SSH Key Mirroring & Central Options Tests"

SRC_TMP="/tmp/pragma_test_sync_src_$$"
DST_TMP="/tmp/pragma_test_sync_dst_$$"
rm -rf "$SRC_TMP" "$DST_TMP"
mkdir -p "$SRC_TMP"

# Populate source folder with simulated Windows ~/.ssh files
echo "PRIVATE_KEY_1" > "$SRC_TMP/id_ed25519"
echo "ssh-ed25519 AAAA pub1" > "$SRC_TMP/id_ed25519.pub"
echo "PRIVATE_KEY_2" > "$SRC_TMP/id_custom"
echo "ssh-rsa BBBB pub2" > "$SRC_TMP/id_custom.pub"
echo "130.239.99.15 ssh-ed25519 CCCC" > "$SRC_TMP/known_hosts"
echo "Host foo\n  HostName 1.2.3.4" > "$SRC_TMP/config"
echo "ssh-ed25519 DDDD" > "$SRC_TMP/authorized_keys"

# Test 1: Run ssh-sync-keys to destination
OUTPUT=$("$SYNC_KEYS_BIN" "$SRC_TMP" "$DST_TMP" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ] && [ -d "$DST_TMP" ]; then
    assert_pass "8.1: ssh-sync-keys ran successfully and created destination"
else
    assert_fail "8.1: ssh-sync-keys execution failed" "Exit: $EXIT_CODE, Output: $OUTPUT"
fi

# Test 2: Filtered files (config and authorized_keys must NOT be copied)
if [ ! -f "$DST_TMP/config" ] && [ ! -f "$DST_TMP/authorized_keys" ]; then
    assert_pass "8.2: config and authorized_keys excluded from sync"
else
    assert_fail "8.2: config and authorized_keys excluded from sync" "config exists: $(test -f "$DST_TMP/config" && echo yes || echo no), authorized_keys exists: $(test -f "$DST_TMP/authorized_keys" && echo yes || echo no)"
fi

# Test 3: Mirrored keys exist and content matches
if [ -f "$DST_TMP/id_ed25519" ] && [ -f "$DST_TMP/id_custom.pub" ] && [ -f "$DST_TMP/known_hosts" ]; then
    assert_pass "8.3: Key pairs and known_hosts mirrored to destination"
else
    assert_fail "8.3: Key pairs and known_hosts mirrored to destination" "Missing files in $DST_TMP"
fi

# Test 4: Verify permissions (directory 700, private keys 600, pub/known_hosts 644)
get_octal_perm() {
    # GNU stat (Linux/WSL) first: BSD stat (macOS) rejects -c with an error and falls through to -f.
    # (Never try -f first: on GNU stat it means "filesystem status" and succeeds with unrelated output.)
    stat -c "%a" "$1" 2>/dev/null || stat -f "%Lp" "$1" 2>/dev/null
}
DST_PERM=$(get_octal_perm "$DST_TMP")
PRIV_PERM=$(get_octal_perm "$DST_TMP/id_ed25519")
PUB_PERM=$(get_octal_perm "$DST_TMP/id_ed25519.pub")
HOSTS_PERM=$(get_octal_perm "$DST_TMP/known_hosts")

if [ "$DST_PERM" = "700" ] && [ "$PRIV_PERM" = "600" ] && [ "$PUB_PERM" = "644" ] && [ "$HOSTS_PERM" = "644" ]; then
    assert_pass "8.4: Correct permissions set (dst 700, priv 600, pub/known_hosts 644)"
else
    assert_fail "8.4: Strict permissions enforcement" "DST: $DST_PERM, PRIV: $PRIV_PERM, PUB: $PUB_PERM, HOSTS: $HOSTS_PERM"
fi

# Test 5: Re-running sync cleans previous keys removed from source
rm -f "$SRC_TMP/id_custom" "$SRC_TMP/id_custom.pub"
"$SYNC_KEYS_BIN" "$SRC_TMP" "$DST_TMP" >/dev/null 2>&1
if [ ! -f "$DST_TMP/id_custom" ] && [ -f "$DST_TMP/id_ed25519" ]; then
    assert_pass "8.5: Re-syncing removes deleted keys from destination"
else
    assert_fail "8.5: Re-syncing removes deleted keys from destination" "id_custom still exists: $(test -f "$DST_TMP/id_custom" && echo yes || echo no)"
fi

# Test 6: Central PRAGMA_SSH_KEY resolution in lib/ssh-functions
RESOLVED_OUT=$(PRAGMA_SSH_KEY="/tmp/test_key_name" bash -c "source '$SSH_FUNCTIONS'; echo \"PATH=\$SSH_KEY_PATH OPTS=\$SSH_KEY_OPTIONS\"")
if echo "$RESOLVED_OUT" | grep -q "PATH=/tmp/test_key_name" && echo "$RESOLVED_OUT" | grep -q -- "-i /tmp/test_key_name -o IdentitiesOnly=yes"; then
    assert_pass "8.6: PRAGMA_SSH_KEY full path resolved centrally in ssh-functions"
else
    assert_fail "8.6: PRAGMA_SSH_KEY full path resolution" "$RESOLVED_OUT"
fi

# Test 7 + 8: Real key, mirrored by sync, used against a REAL (ephemeral) sshd on localhost.
#   8.7: key not yet in the server's authorized_keys  -> rejected (STATUS:KEY_NEEDED), no "Permissions too open"
#   8.8: key injected into the server's authorized_keys -> accepted (STATUS:OK)
source "$REPO_ROOT/automated-tests/ssh_test_server.sh"

REAL_KEY_SRC="$SRC_TMP/id_ed25519_realsync"
ssh-keygen -t ed25519 -N "" -C "pragma_test_sync@localhost" -f "$REAL_KEY_SRC" >/dev/null 2>&1
"$SYNC_KEYS_BIN" "$SRC_TMP" "$DST_TMP" >/dev/null 2>&1

SYNCED_KEY="$DST_TMP/id_ed25519_realsync"
CURRENT_USER="${CURRENT_USER##*\\}"
TEST_LOGIN_BIN="$SSH_FOLDER_DIR/ssh-test-login"

if [ ! -f "$SYNCED_KEY" ]; then
    assert_fail "8.7: Real key failed to mirror to destination" "Missing $SYNCED_KEY"
    assert_fail "8.8: Skipped because key was not mirrored" "Missing $SYNCED_KEY"
elif ! start_test_sshd; then
    assert_fail "8.7: Could not start ephemeral sshd on localhost" "$TEST_SSHD_ERROR"
    assert_fail "8.8: Could not start ephemeral sshd on localhost" "$TEST_SSHD_ERROR"
else
    SSH_URL="ssh://${CURRENT_USER}@127.0.0.1:${TEST_SSHD_PORT}/tmp"

    SSH_OUTPUT=$(PRAGMA_SSH_KEY="$SYNCED_KEY" "$TEST_LOGIN_BIN" "$SSH_URL" 2>&1)
    if echo "$SSH_OUTPUT" | grep -q "STATUS:KEY_NEEDED"; then
        assert_pass "8.7: Synced key is rejected by real sshd before it is authorized (STATUS:KEY_NEEDED)"
    else
        assert_fail "8.7: Expected STATUS:KEY_NEEDED before authorizing the synced key" "$SSH_OUTPUT"
    fi

    inject_test_sshd_key "$SYNCED_KEY.pub"
    SSH_OUTPUT=$(PRAGMA_SSH_KEY="$SYNCED_KEY" "$TEST_LOGIN_BIN" "$SSH_URL" 2>&1)
    if echo "$SSH_OUTPUT" | grep -q "STATUS:OK"; then
        assert_pass "8.8: Synced key (700/600/644 permissions) authenticates against real sshd after injection into authorized_keys (STATUS:OK)"
    else
        assert_fail "8.8: Expected STATUS:OK after injecting the synced key into authorized_keys" "$SSH_OUTPUT"
    fi

    stop_test_sshd
fi

# Clean up
rm -rf "$SRC_TMP" "$DST_TMP"

print_suite_result
exit $?
