#!/bin/bash
# test_02_conflict_markers.sh - Verifies git merge conflict generation and conflict markers

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

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

echo "Running Suite: Git Merge Conflicts & Marker Generation"

TEST_REPO="/tmp/pragma_conflict_test_$$"
trap 'rm -rf "$TEST_REPO"' EXIT

mkdir -p "$TEST_REPO"
git -C "$TEST_REPO" init >/dev/null 2>&1
git -C "$TEST_REPO" config user.name "Pragma-git Conflict Test"
git -C "$TEST_REPO" config user.email "test@pragma-git.test"

# Base commit
echo -e "Line 1: Header\nLine 2: Common base\nLine 3: Footer" > "$TEST_REPO/conflict.txt"
git -C "$TEST_REPO" add conflict.txt
git -C "$TEST_REPO" commit -m "Base commit" >/dev/null 2>&1

# Branch A
git -C "$TEST_REPO" checkout -b branch-a >/dev/null 2>&1
echo -e "Line 1: Header\nLine 2: Changed by branch A\nLine 3: Footer" > "$TEST_REPO/conflict.txt"
git -C "$TEST_REPO" commit -am "Commit from Branch A" >/dev/null 2>&1

# Branch B from main
git -C "$TEST_REPO" checkout -b branch-b HEAD~1 >/dev/null 2>&1
echo -e "Line 1: Header\nLine 2: Changed by branch B\nLine 3: Footer" > "$TEST_REPO/conflict.txt"
git -C "$TEST_REPO" commit -am "Commit from Branch B" >/dev/null 2>&1

# Test 1: Merge branch-a into branch-b produces conflict
MERGE_OUT=$(git -C "$TEST_REPO" merge branch-a 2>&1)
MERGE_STATUS=$?

if [ $MERGE_STATUS -ne 0 ] && echo "$MERGE_OUT" | grep -qi "conflict"; then
    assert_pass "2.1: Merge conflict detected on overlapping changes"
else
    assert_fail "2.1: Merge conflict detected on overlapping changes" "Exit: $MERGE_STATUS, Out: $MERGE_OUT"
fi

# Test 2: Status reports unmerged path (UU)
STATUS_OUT=$(git -C "$TEST_REPO" status --porcelain 2>&1)
if echo "$STATUS_OUT" | grep -q "UU conflict.txt"; then
    assert_pass "2.2: git status --porcelain identifies unmerged file (UU)"
else
    assert_fail "2.2: git status --porcelain identifies unmerged file (UU)" "Output: $STATUS_OUT"
fi

# Test 3: Conflict file contains standard markers
if grep -q "<<<<<<< HEAD" "$TEST_REPO/conflict.txt" && \
   grep -q "=======" "$TEST_REPO/conflict.txt" && \
   grep -q ">>>>>>> branch-a" "$TEST_REPO/conflict.txt"; then
    assert_pass "2.3: Conflict file contains standard diff3 conflict markers (<<<<<<<, =======, >>>>>>>)"
else
    assert_fail "2.3: Conflict file contains standard markers"
fi

TOTAL_COUNT=$((PASS_COUNT + FAIL_COUNT))
echo "Suite Result: $PASS_COUNT/$TOTAL_COUNT passed, $FAIL_COUNT failed"
[ $FAIL_COUNT -eq 0 ] && exit 0 || exit 1
