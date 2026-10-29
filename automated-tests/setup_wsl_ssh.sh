#!/bin/bash
# setup_wsl_ssh.sh - Prepares Linux OpenSSH Server (sshd) inside WSL for Pragma-git CI

set -e

USER_NAME="${1:-runneradmin}"

# 1. Ensure user exists in WSL matching Windows user
if ! id -u "$USER_NAME" >/dev/null 2>&1; then
    useradd -m -s /bin/bash "$USER_NAME"
fi
echo "$USER_NAME ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$USER_NAME"
chmod 440 "/etc/sudoers.d/$USER_NAME"
printf "[user]\ndefault = %s\n[boot]\ncommand = service ssh start\n" "$USER_NAME" > /etc/wsl.conf

# 2. Setup user's SSH keys and authorized_keys in WSL
USER_HOME=$(eval echo "~$USER_NAME")
mkdir -p "$USER_HOME/.ssh" /tmp/pragma-git-ssh-folders
chmod 700 "$USER_HOME/.ssh"

# Generate ED25519 key if missing
if [ ! -f "$USER_HOME/.ssh/id_ed25519" ]; then
    ssh-keygen -t ed25519 -f "$USER_HOME/.ssh/id_ed25519" -N "" -q
fi
cat "$USER_HOME/.ssh/id_ed25519.pub" >> "$USER_HOME/.ssh/authorized_keys"

# Also import Windows host public key if present
if [ -f "/mnt/c/Users/$USER_NAME/.ssh/id_ed25519.pub" ]; then
    cat "/mnt/c/Users/$USER_NAME/.ssh/id_ed25519.pub" >> "$USER_HOME/.ssh/authorized_keys"
fi
sort -u "$USER_HOME/.ssh/authorized_keys" -o "$USER_HOME/.ssh/authorized_keys"
chmod 600 "$USER_HOME/.ssh/authorized_keys" "$USER_HOME/.ssh/id_ed25519"

# Configure passwordless localhost loopback
cat << 'EOF' > "$USER_HOME/.ssh/config"
Host localhost 127.0.0.1
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
  LogLevel ERROR
EOF
chmod 600 "$USER_HOME/.ssh/config"
chown -R "$USER_NAME:$USER_NAME" "$USER_HOME/.ssh"

# 3. Configure and start Linux OpenSSH daemon
ssh-keygen -A >/dev/null 2>&1
sed -i 's/#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
sed -i 's/#*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
service ssh restart

# 4. Configure Git identity for the user inside WSL
sudo -u "$USER_NAME" git config --global user.name "Pragma-git CI"
sudo -u "$USER_NAME" git config --global user.email "ci@pragma-git.local"

# 5. Verify loopback connection to WSL sshd
sudo -u "$USER_NAME" ssh -o StrictHostKeyChecking=no localhost "echo WSL SSH Server Ready: \$(uname -s) for \$(whoami)"
