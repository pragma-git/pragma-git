#!/bin/bash
# test_01_git_config_syntax.sh - Tests syntax and key directives in gitconfigs template files

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CONFIG_DIR="$REPO_ROOT/gitconfigs"

source "$REPO_ROOT/automated-tests/test_setup.sh"

echo "Running Suite: Git Configuration Templates Syntax & Directives"

CONFIG_FILES=(
    "pragma-git-config_mac"
    "pragma-git-config_linux"
    "pragma-git-config_win"
    "pragma-git-config_linux_ssh_server"
)

# Test 1: Verify all 4 config files exist
for cfg in "${CONFIG_FILES[@]}"; do
    CFG_PATH="$CONFIG_DIR/$cfg"
    if [ -f "$CFG_PATH" ]; then
        assert_pass "1.1: Config file exists ($cfg)"
    else
        assert_fail "1.1: Config file exists ($cfg)" "Missing at $CFG_PATH"
    fi
done

# Test 2: Verify git can parse each file via include.path without syntax errors
TEST_REPO="/tmp/pragma_cfg_test_$$"
trap 'rm -rf "$TEST_REPO"' EXIT
mkdir -p "$TEST_REPO"
git -C "$TEST_REPO" init >/dev/null 2>&1

for cfg in "${CONFIG_FILES[@]}"; do
    CFG_PATH="$CONFIG_DIR/$cfg"
    OUTPUT=$(git -C "$TEST_REPO" -c include.path="$CFG_PATH" config --list 2>&1)
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
        assert_pass "1.2: Git parses configuration without syntax error ($cfg)"
    else
        assert_fail "1.2: Git parses configuration ($cfg)" "Exit $EXIT_CODE, Output: $OUTPUT"
    fi
done

# Test 3: Verify required directives in mac config
MAC_CONFIG="$CONFIG_DIR/pragma-git-config_mac"
MAC_DUMP=$(git -C "$TEST_REPO" -c include.path="$MAC_CONFIG" config --list 2>&1)

if echo "$MAC_DUMP" | grep -q "mergetool.pragma-git.cmd" && \
   echo "$MAC_DUMP" | grep -q "mergetool.pragma-git.trustexitcode=true" && \
   echo "$MAC_DUMP" | grep -q "credential.usehttppath=true" && \
   echo "$MAC_DUMP" | grep -q "push.autosetupremote=true"; then
    assert_pass "1.3: Mac config contains all required directives (mergetool, credential, push)"
else
    assert_fail "1.3: Mac config missing expected directives" "$MAC_DUMP"
fi

print_suite_result
exit $?
