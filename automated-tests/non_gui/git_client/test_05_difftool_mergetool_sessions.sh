#!/bin/bash
# test_05_difftool_mergetool_sessions.sh - Tests difftool and mergetool execution with pragma-merge
#
# This test suite establishes Step 1 baseline validation:
# 1) Setup repository with modified and conflicted files
# 2) Verify pragma-merge creates expected session/signaling files and waits for exit code
# 3) Verify simulated GUI close unblocks pragma-merge with exact exit code
# 4) Verify git difftool integrates properly with pragma-merge

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/automated-tests/test_setup.sh"

echo "Running Suite: Git Difftool & Mergetool Session Handling"

TEST_DIR="/tmp/pragma_merge_test_$$"
TEST_REPO="$TEST_DIR/repo"
TEST_TMP="$TEST_DIR/.tmp"
mkdir -p "$TEST_REPO" "$TEST_TMP"
trap 'rm -rf "$TEST_DIR"' EXIT

export PRAGMA_SIGNAL_DIR="$TEST_TMP"
export PRAGMA_SETTINGS_DIR="$TEST_DIR"

git -C "$TEST_REPO" init >/dev/null 2>&1
git -C "$TEST_REPO" config user.name "Pragma-git Difftool Test"
git -C "$TEST_REPO" config user.email "test@pragma-git.test"

# Create a sample file and commit
echo "Line 1: original" > "$TEST_REPO/sample.txt"
git -C "$TEST_REPO" add sample.txt
git -C "$TEST_REPO" commit -m "Initial commit" >/dev/null 2>&1

# Modify file in working tree
echo "Line 1: modified by user" > "$TEST_REPO/sample.txt"

# Test 1: Verify repository has uncommitted change
STATUS=$(git -C "$TEST_REPO" status --porcelain 2>&1)
if echo "$STATUS" | grep -q " M sample.txt"; then
    assert_pass "5.1: Repository prepared with modified uncommitted file"
else
    assert_fail "5.1: Repository prepared with modified uncommitted file" "Status: $STATUS"
fi

# Test 2: Direct invocation of pragma-merge creates parameter and signal files
"$REPO_ROOT/pragma-merge" "base_file" "local_file" "remote_file" "merged_file" &
MERGE_PID=$!

# Wait up to 2 seconds for signal file to appear
WAITED=0
while [ $WAITED -lt 20 ] && [ ! -f "$TEST_TMP/pragma-merge-running" ]; do
    sleep 0.1
    ((WAITED++))
done

if [ -f "$TEST_TMP/pragma-merge-running" ] && \
   [ "$(cat "$TEST_TMP/first" 2>/dev/null)" = "base_file" ] && \
   [ "$(cat "$TEST_TMP/second" 2>/dev/null)" = "local_file" ]; then
    assert_pass "5.2: pragma-merge creates signal and parameter files (first, second, etc.)"
else
    assert_fail "5.2: pragma-merge creates signal and parameter files" "Files in $TEST_TMP: $(ls "$TEST_TMP" 2>/dev/null)"
fi

# Test 3: Closing pragma-merge via exit signal returns clean exit code
echo "0" > "$TEST_TMP/exit-pragma-merge"
rm -f "$TEST_TMP/pragma-merge-running"
wait $MERGE_PID
EXIT_STATUS=$?

if [ $EXIT_STATUS -eq 0 ]; then
    assert_pass "5.3: pragma-merge exits cleanly with code 0 when signal file is cleared"
else
    assert_fail "5.3: pragma-merge exit code" "Exit: $EXIT_STATUS"
fi

# Test 4: Configure git difftool to invoke pragma-merge and test invocation
git -C "$TEST_REPO" config diff.tool pragma-git
git -C "$TEST_REPO" config difftool.pragma-git.cmd "$REPO_ROOT/pragma-merge \"\$BASE\" \"\$LOCAL\" \"\$REMOTE\" \"\$MERGED\""

# Start difftool in background
git -C "$TEST_REPO" difftool --no-prompt sample.txt &
DIFF_PID=$!

WAITED=0
while [ $WAITED -lt 30 ] && [ ! -f "$TEST_TMP/pragma-merge-running" ]; do
    sleep 0.1
    ((WAITED++))
done

if [ -f "$TEST_TMP/pragma-merge-running" ]; then
    assert_pass "5.4: git difftool successfully invokes pragma-merge with lockfile"
    # Complete the difftool session
    echo "0" > "$TEST_TMP/exit-pragma-merge"
    rm -f "$TEST_TMP/pragma-merge-running"
    wait $DIFF_PID 2>/dev/null
else
    assert_fail "5.4: git difftool invokes pragma-merge" "Lockfile not found within timeout"
    kill $DIFF_PID 2>/dev/null
fi

print_suite_result
