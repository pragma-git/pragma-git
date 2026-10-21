#!/bin/bash
# test_setup.sh - Shared terminal colors and assertion helpers for bash tests in Pragma-git

if [ -n "$NO_COLOR" ]; then
    BOLD=""
    NORMAL=""
    GREEN=""
    RED=""
    CYAN=""
    YELLOW=""
    BLUE=""
    MAGENTA=""
else
    BOLD=$'\033[1m'
    NORMAL=$'\033[0m'
    GREEN=$'\033[32m'
    RED=$'\033[31m'
    CYAN=$'\033[36m'
    YELLOW=$'\033[33m'
    BLUE=$'\033[34m'
    MAGENTA=$'\033[35m'
fi

PASS_COUNT=0
FAIL_COUNT=0

function assert_pass() {
    local desc="$1"
    echo "  ${GREEN}[PASS]${NORMAL} $desc"
    ((PASS_COUNT++))
}

function assert_fail() {
    local desc="$1"
    local details="$2"
    echo "  ${RED}[FAIL]${NORMAL} $desc"
    [ -n "$details" ] && echo "         $details"
    ((FAIL_COUNT++))
}

function print_suite_result() {
    local total=$((PASS_COUNT + FAIL_COUNT))
    if [ $FAIL_COUNT -eq 0 ]; then
        echo "Suite Result: ${GREEN}$PASS_COUNT/$total passed${NORMAL}, 0 failed"
        return 0
    else
        echo "Suite Result: ${GREEN}$PASS_COUNT/$total passed${NORMAL}, ${RED}$FAIL_COUNT failed${NORMAL}"
        return 1
    fi
}
