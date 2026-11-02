#!/bin/bash
# ssh_test_server.sh - Ephemeral, real OpenSSH server on localhost for automated tests
#
# Starts an unprivileged sshd (as the current user) on a random high port, with its own host key and its own
# AuthorizedKeysFile in a temp folder.  Tests can then do a complete, real ssh interaction:
#   key rejected  ->  inject public key into authorized_keys  ->  key accepted
# without ever touching the developer's (or runner's) real ~/.ssh/authorized_keys.
# Works the same on macOS, Linux and WSL (on Windows runners the bash tests run inside WSL).
#
# Usage as library:   source automated-tests/ssh_test_server.sh
#                     start_test_sshd || echo "$TEST_SSHD_ERROR"
#                     inject_test_sshd_key /path/to/key.pub
#                     ... ssh -p "$TEST_SSHD_PORT" ... 127.0.0.1
#                     stop_test_sshd
# Usage as command:   ssh_test_server.sh login-check <private-key-file>
#                     prints:  BEFORE:<STATUS> AFTER:<STATUS>   (status from ssh_folder/ssh-test-login)

SSH_TEST_SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_TEST_REPO_ROOT="$(cd "$SSH_TEST_SERVER_DIR/.." && pwd)"

TEST_SSHD_DIR=""
TEST_SSHD_PID=""
TEST_SSHD_PORT=""
TEST_SSHD_ERROR=""

function _test_sshd_port_open() {
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
}

function start_test_sshd() {
    TEST_SSHD_ERROR=""
    local sshd_bin
    sshd_bin="$(command -v sshd 2>/dev/null)"
    for candidate in /usr/sbin/sshd /usr/local/sbin/sshd /usr/bin/sshd; do
        [ -z "$sshd_bin" ] && [ -x "$candidate" ] && sshd_bin="$candidate"
    done
    if [ -z "$sshd_bin" ]; then
        TEST_SSHD_ERROR="sshd binary not found (install openssh-server)"
        return 1
    fi

    # Debian/Ubuntu sshd refuses to start without its privilege separation directory
    if [ ! -d /run/sshd ] && [ "$(uname -s)" = "Linux" ]; then
        mkdir -p /run/sshd 2>/dev/null || sudo -n mkdir -p /run/sshd 2>/dev/null
    fi

    TEST_SSHD_DIR="$(mktemp -d /tmp/pragma_test_sshd_XXXXXX)"
    chmod 700 "$TEST_SSHD_DIR"
    ssh-keygen -q -t ed25519 -N "" -f "$TEST_SSHD_DIR/host_key" || { TEST_SSHD_ERROR="ssh-keygen failed"; return 1; }
    : > "$TEST_SSHD_DIR/authorized_keys"
    chmod 600 "$TEST_SSHD_DIR/authorized_keys"

    local attempt port
    for attempt in 1 2 3 4 5; do
        port=$((20000 + RANDOM % 30000))
        cat > "$TEST_SSHD_DIR/sshd_config" <<EOF
Port $port
ListenAddress 127.0.0.1
HostKey $TEST_SSHD_DIR/host_key
PidFile $TEST_SSHD_DIR/sshd.pid
AuthorizedKeysFile $TEST_SSHD_DIR/authorized_keys
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
UsePAM no
StrictModes no
LogLevel ERROR
EOF
        "$sshd_bin" -D -e -f "$TEST_SSHD_DIR/sshd_config" > "$TEST_SSHD_DIR/sshd.log" 2>&1 &
        TEST_SSHD_PID=$!

        local waited=0
        while [ $waited -lt 50 ]; do
            if ! kill -0 "$TEST_SSHD_PID" 2>/dev/null; then break; fi   # died (port in use, config problem)
            if _test_sshd_port_open "$port"; then
                TEST_SSHD_PORT="$port"
                return 0
            fi
            sleep 0.1
            ((waited++))
        done
        kill "$TEST_SSHD_PID" 2>/dev/null
    done

    TEST_SSHD_ERROR="sshd did not start: $(tr '\n' ' ' < "$TEST_SSHD_DIR/sshd.log" | cut -c 1-200)"
    return 1
}

function inject_test_sshd_key() {   # $1 = public key file; appended to the test server's authorized_keys
    cat "$1" >> "$TEST_SSHD_DIR/authorized_keys"
    echo "" >> "$TEST_SSHD_DIR/authorized_keys"
}

function stop_test_sshd() {
    [ -n "$TEST_SSHD_PID" ] && kill "$TEST_SSHD_PID" 2>/dev/null && wait "$TEST_SSHD_PID" 2>/dev/null
    [ -n "$TEST_SSHD_PORT" ] && ssh-keygen -R "[127.0.0.1]:$TEST_SSHD_PORT" >/dev/null 2>&1   # remove known_hosts entry added by tests
    [ -n "$TEST_SSHD_DIR" ] && rm -rf "$TEST_SSHD_DIR" 2>/dev/null
    TEST_SSHD_PID=""; TEST_SSHD_PORT=""; TEST_SSHD_DIR=""
}

function ssh_login_check() {   # $1 = private key.  Echoes "BEFORE:<STATUS> AFTER:<STATUS>"
    local key="$1" user url before after
    user="$(id -un)"
    start_test_sshd || { echo "ERROR:$TEST_SSHD_ERROR"; return 1; }
    url="ssh://${user}@127.0.0.1:${TEST_SSHD_PORT}/tmp"
    # Use a native copy with strict permissions (a key on a Windows mount, /mnt/c, shows as 0777 and OpenSSH refuses it)
    cp "$key" "$TEST_SSHD_DIR/client_key" && cp "$key.pub" "$TEST_SSHD_DIR/client_key.pub"
    chmod 600 "$TEST_SSHD_DIR/client_key"
    key="$TEST_SSHD_DIR/client_key"
    before=$(PRAGMA_SSH_KEY="$key" bash "$SSH_TEST_REPO_ROOT/ssh_folder/ssh-test-login" "$url" 2>&1)
    inject_test_sshd_key "$key.pub"
    after=$(PRAGMA_SSH_KEY="$key" bash "$SSH_TEST_REPO_ROOT/ssh_folder/ssh-test-login" "$url" 2>&1)
    stop_test_sshd
    echo "BEFORE:${before} AFTER:${after}"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    case "$1" in
        login-check) ssh_login_check "$2" ;;
        *) echo "Usage: $0 login-check <private-key-file>" >&2; exit 2 ;;
    esac
fi
