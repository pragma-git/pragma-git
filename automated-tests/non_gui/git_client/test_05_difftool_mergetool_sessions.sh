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
while [ $WAITED -lt 20 ] && [ ! -f "$TEST_TMP/last_session_id" ]; do
    sleep 0.1
    ((WAITED++))
done
INIT_SESSION_ID=$(cat "$TEST_TMP/last_session_id" 2>/dev/null)
SESSION_RUNNING_FILE="$TEST_TMP/sessions/$INIT_SESSION_ID/pragma-merge-running"

if [ -n "$INIT_SESSION_ID" ] && [ -f "$SESSION_RUNNING_FILE" ] && \
   [ "$(cat "$TEST_TMP/sessions/$INIT_SESSION_ID/first" 2>/dev/null)" = "base_file" ] && \
   [ "$(cat "$TEST_TMP/sessions/$INIT_SESSION_ID/second" 2>/dev/null)" = "local_file" ]; then
    assert_pass "5.2: pragma-merge creates session signal and parameter files (first, second, etc.)"
else
    assert_fail "5.2: pragma-merge creates session signal and parameter files" "Files in $TEST_TMP/sessions: $(ls "$TEST_TMP/sessions" 2>/dev/null)"
fi

# Test 3: Closing pragma-merge via session exit signal returns clean exit code
echo "0" > "$TEST_TMP/sessions/$INIT_SESSION_ID/exit-pragma-merge"
rm -f "$SESSION_RUNNING_FILE"
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
rm -f "$TEST_TMP/last_session_id"
git -C "$TEST_REPO" difftool --no-prompt sample.txt &
DIFF_PID=$!

WAITED=0
while [ $WAITED -lt 30 ] && [ ! -f "$TEST_TMP/last_session_id" ]; do
    sleep 0.1
    ((WAITED++))
done
DIFF_SESSION_ID=$(cat "$TEST_TMP/last_session_id" 2>/dev/null)
DIFF_SESSION_RUNNING="$TEST_TMP/sessions/$DIFF_SESSION_ID/pragma-merge-running"

if [ -n "$DIFF_SESSION_ID" ] && [ -f "$DIFF_SESSION_RUNNING" ]; then
    assert_pass "5.4: git difftool successfully invokes pragma-merge with session lockfile"
    # Complete the difftool session
    echo "0" > "$TEST_TMP/sessions/$DIFF_SESSION_ID/exit-pragma-merge"
    rm -f "$DIFF_SESSION_RUNNING"
    wait $DIFF_PID 2>/dev/null
else
    assert_fail "5.4: git difftool invokes pragma-merge" "Lockfile not found within timeout"
    kill $DIFF_PID 2>/dev/null
fi

# Test 5: Verify dedicated session directory creation (.tmp/sessions/<SESSION_ID>/)
LAST_SESSION_ID=$(cat "$TEST_TMP/last_session_id" 2>/dev/null)
if [ -n "$LAST_SESSION_ID" ]; then
    assert_pass "5.5: pragma-merge records last_session_id ($LAST_SESSION_ID)"
else
    assert_fail "5.5: pragma-merge records last_session_id" "File not found"
fi

# Test 6: Verify concurrent parallel sessions in isolated directories
rm -f "$TEST_TMP/last_session_id"

# Start Session A
"$REPO_ROOT/pragma-merge" "file_A_base" "file_A_local" "file_A_remote" "file_A_merged" &
PID_A=$!

WAITED=0
while [ $WAITED -lt 20 ] && [ ! -f "$TEST_TMP/last_session_id" ]; do
    sleep 0.1
    ((WAITED++))
done
SESSION_A=$(cat "$TEST_TMP/last_session_id" 2>/dev/null)

# Verify Session A directory has its own parameters
if [ -n "$SESSION_A" ] && [ -d "$TEST_TMP/sessions/$SESSION_A" ] && \
   [ "$(cat "$TEST_TMP/sessions/$SESSION_A/first" 2>/dev/null)" = "file_A_base" ]; then
    assert_pass "5.6: Session A creates dedicated isolated session directory with correct parameters"
else
    assert_fail "5.6: Session A isolated directory" "Dir: $TEST_TMP/sessions/$SESSION_A"
fi

# Close Session A cleanly via session-specific signal
echo "0" > "$TEST_TMP/sessions/$SESSION_A/exit-pragma-merge"
rm -f "$TEST_TMP/sessions/$SESSION_A/pragma-merge-running"
wait $PID_A 2>/dev/null
EXIT_A=$?

if [ $EXIT_A -eq 0 ]; then
    assert_pass "5.7: Session A exits cleanly with code 0"
else
    assert_fail "5.7: Session A exit code" "Exit: $EXIT_A"
fi

# Test 8: Verify two concurrent sessions running simultaneously without interfering
export PRAGMA_ENABLE_SESSIONS="1"
rm -f "$TEST_TMP/last_session_id"
"$REPO_ROOT/pragma-merge" "file_1_base" "file_1_local" "file_1_remote" "file_1_merged" &
PID_1=$!

WAITED=0
while [ $WAITED -lt 20 ] && [ ! -f "$TEST_TMP/last_session_id" ]; do
    sleep 0.1
    ((WAITED++))
done
SESSION_1=$(cat "$TEST_TMP/last_session_id" 2>/dev/null)

rm -f "$TEST_TMP/last_session_id"
"$REPO_ROOT/pragma-merge" "file_2_base" "file_2_local" "file_2_remote" "file_2_merged" &
PID_2=$!

WAITED=0
while [ $WAITED -lt 20 ] && [ ! -f "$TEST_TMP/last_session_id" ]; do
    sleep 0.1
    ((WAITED++))
done
SESSION_2=$(cat "$TEST_TMP/last_session_id" 2>/dev/null)

if [ -n "$SESSION_1" ] && [ -n "$SESSION_2" ] && [ "$SESSION_1" != "$SESSION_2" ] && \
   [ -f "$TEST_TMP/sessions/$SESSION_1/first" ] && \
   [ -f "$TEST_TMP/sessions/$SESSION_2/first" ] && \
   [ "$(cat "$TEST_TMP/sessions/$SESSION_1/first")" = "file_1_base" ] && \
   [ "$(cat "$TEST_TMP/sessions/$SESSION_2/first")" = "file_2_base" ]; then
    assert_pass "5.8: Concurrent sessions 1 and 2 coexist simultaneously with independent parameters"
else
    assert_fail "5.8: Concurrent sessions 1 and 2 coexist simultaneously" "S1: $SESSION_1, S2: $SESSION_2"
fi

# Close Session 2 with code 2, Session 1 with code 1
echo "2" > "$TEST_TMP/sessions/$SESSION_2/exit-pragma-merge"
rm -f "$TEST_TMP/sessions/$SESSION_2/pragma-merge-running"
wait $PID_2 2>/dev/null
EXIT_2=$?

echo "1" > "$TEST_TMP/sessions/$SESSION_1/exit-pragma-merge"
rm -f "$TEST_TMP/sessions/$SESSION_1/pragma-merge-running"
wait $PID_1 2>/dev/null
EXIT_1=$?

if [ $EXIT_1 -eq 1 ] && [ $EXIT_2 -eq 2 ]; then
    assert_pass "5.9: Concurrent sessions return independent exit codes without collision (S1=1, S2=2)"
else
    assert_fail "5.9: Independent exit codes" "S1 exit: $EXIT_1 (expected 1), S2 exit: $EXIT_2 (expected 2)"
fi

print_suite_result
