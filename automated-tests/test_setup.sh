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
    local suite_num="$4"

    local fail_lines
    fail_lines=$(echo "$output" | awk -v suite_label="$suite_title" -v pfx="$suite_num" '
    /\[FAIL\]/ {
        sub(/^[[:space:]]+/, "", $0);
        line = $0;
        sub(/^\[FAIL\][[:space:]]*/, "", line);
        test_id = "";
        rest = line;
        if (line ~ /^[0-9]+(\.[0-9]+)?:?[[:space:]]*/) {
            split(line, parts, /:?[[:space:]]+/);
            test_id = parts[1];
            sub(/:$/, "", test_id);
            sub(/^[0-9]+(\.[0-9]+)?:?[[:space:]]*/, "", rest);

            if (index(test_id, ".") > 0) {
                split(test_id, dotparts, ".");
                sub_id = dotparts[2];
            } else {
                sub_id = test_id;
            }

            if (pfx != "") {
                clean_pfx = pfx;
                sub(/^\[/, "", clean_pfx);
                sub(/\]$/, "", clean_pfx);
                full_num = "[" clean_pfx "." sub_id "]";
                print "  [FAIL] " full_num " " rest " ([" clean_pfx "] " suite_label ")";
            } else {
                print "  [FAIL] " test_id ": " rest " (" suite_label ")";
            }
        } else {
            if (pfx != "") {
                clean_pfx = pfx;
                sub(/^\[/, "", clean_pfx);
                sub(/\]$/, "", clean_pfx);
                print "  [FAIL] " rest " ([" clean_pfx "] " suite_label ")";
            } else {
                print "  [FAIL] " rest " (" suite_label ")";
            }
        }
        in_fail = 1;
        found = 1;
        next;
    }
    /\[PASS\]/ {
        in_fail = 0;
        next;
    }
    in_fail && /^[[:space:]]{4,}/ {
        sub(/^[[:space:]]+/, "", $0);
        print "         " $0;
        next;
    }
    {
        in_fail = 0;
    }
    ')

    if [ -z "$fail_lines" ]; then
        local last_step err_msg step_num clean_pfx full_num prefix_str suite_tag
        last_step=$(echo "$output" | grep -E 'STEP \[[0-9]+/[0-9]+\]' | tail -n 1 | sed -e 's/^[[:space:]]*//')
        err_msg=$(echo "$output" | grep -E 'Assertion failed|Error:|AssertionError|fatal:|SyntaxError|ReferenceError|TypeError' | head -n 2 | sed -e 's/^[[:space:]]*//')
        step_num=$(echo "$last_step" | sed -E -n 's/.*STEP \[([0-9]+)\/[0-9]+\].*/\1/p')
        clean_pfx="$suite_num"
        clean_pfx="${clean_pfx#[}"
        clean_pfx="${clean_pfx%]}"
        if [ -n "$step_num" ] && [ -n "$clean_pfx" ]; then
            full_num="[${clean_pfx}.${step_num}]"
        elif [ -n "$clean_pfx" ]; then
            full_num="[${clean_pfx}]"
        else
            full_num=""
        fi

        prefix_str=""
        [ -n "$full_num" ] && prefix_str="${full_num} "

        suite_tag=""
        [ -n "$clean_pfx" ] && suite_tag="([${clean_pfx}] ${suite_title})" || suite_tag="(${suite_title})"

        if [ -n "$last_step" ] && [ -n "$err_msg" ]; then
            fail_lines="  ${RED}[FAIL]${NORMAL} ${prefix_str}${last_step}: ${err_msg} ${suite_tag}"
        elif [ -n "$err_msg" ]; then
            fail_lines="  ${RED}[FAIL]${NORMAL} ${prefix_str}${err_msg} ${suite_tag}"
        elif [ -n "$last_step" ]; then
            fail_lines="  ${RED}[FAIL]${NORMAL} ${prefix_str}${last_step} ${suite_tag}: Suite failed with exit code $exit_code"
        else
            fail_lines="  ${RED}[FAIL]${NORMAL} ${prefix_str}${suite_tag}: Suite failed with exit code $exit_code"
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
