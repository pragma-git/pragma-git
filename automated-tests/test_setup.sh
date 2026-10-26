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

# Normalize CURRENT_USER across platforms (stripping Windows DOMAIN\ if present)
CURRENT_USER="${USER:-${USERNAME:-$(id -un 2>/dev/null || whoami)}}"
CURRENT_USER="${CURRENT_USER##*\\}"
export CURRENT_USER

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

FAILED_SUITE_ENTRIES=()

function record_failed_test() {
    local suite_title="$1"
    local output="$2"
    local exit_code="$3"

    local fail_lines
    fail_lines=$(echo "$output" | awk '
    /\[FAIL\]/ {
        sub(/^[[:space:]]+/, "", $0);
        print "  " $0;
        in_fail = 1;
        next;
    }
    /\[PASS\]/ {
        in_fail = 0;
        next;
    }
    in_fail && /^[[:space:]]{4,}/ {
        print "     " $0;
        next;
    }
    {
        in_fail = 0;
    }
    ')

    if [ -z "$fail_lines" ]; then
        local err_msg
        err_msg=$(echo "$output" | grep -E 'Error:|AssertionError|fatal:|SyntaxError|ReferenceError|TypeError' | head -n 2)
        if [ -n "$err_msg" ]; then
            fail_lines="  ${RED}[FAIL]${NORMAL} ${suite_title}: $err_msg"
        else
            fail_lines="  ${RED}[FAIL]${NORMAL} ${suite_title}: Suite failed with exit code $exit_code"
        fi
    fi

    FAILED_SUITE_ENTRIES+=("$fail_lines")

    if [ -n "$FAILED_TESTS_LOG" ]; then
        echo "$fail_lines" >> "$FAILED_TESTS_LOG"
    fi
}

function print_failed_tests_summary() {
    local title="${1:-Summary of Failed Tests}"
    # If running as part of the master test runner, let the master runner print the total summary at the end
    if [ -n "$FAILED_TESTS_LOG" ]; then
        return 0
    fi
    if [ ${#FAILED_SUITE_ENTRIES[@]} -gt 0 ]; then
        echo ""
        echo "${BOLD}${RED}${title}:${NORMAL}"
        for entry in "${FAILED_SUITE_ENTRIES[@]}"; do
            echo -e "$entry"
        done
        echo "${BOLD}======================================================================${NORMAL}"
    fi
}
