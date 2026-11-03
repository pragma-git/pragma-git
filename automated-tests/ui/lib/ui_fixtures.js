/**
 * ui_fixtures.js - Sets up isolated environments for UI testing:
 *   - Starts ephemeral unprivileged OpenSSH test server
 *   - Creates a sample bare git repository served over SSH
 *   - Creates isolated scratch directory and user-data-dir for NW.js
 *   - Cleans up everything automatically on exit
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class UIFixtures {
    constructor() {
        this.tmpDir = '';
        this.sshdPid = null;
        this.sshdPort = null;
        this.clientKey = '';
        this.clientKeyPub = '';
        this.originRepoPath = '';
        this.targetClonePath = '';
        this.nwProcess = null;
        this.cdpPort = 9333;
    }

    async setup() {
        // 1. Create unique test sandbox
        this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pragma_ui_test_'));
        this.userDataDir = path.join(this.tmpDir, 'nw_user_data');
        this.testHome = path.join(this.tmpDir, 'home');
        this.testSettingsDir = path.join(this.testHome, '.Pragma-git');
        fs.mkdirSync(this.userDataDir, { recursive: true });
        fs.mkdirSync(this.testSettingsDir, { recursive: true });

        // 2. Start ephemeral SSH server via automated-tests/ssh_test_server.sh
        const repoRoot = path.resolve(__dirname, '../../..');
        const sshScript = path.join(repoRoot, 'automated-tests/ssh_test_server.sh');

        // Generate client key pair inside this.tmpDir (the key that will be configured and deployed via the UI)
        this.clientKey = path.join(this.tmpDir, 'test_user_key');
        this.clientKeyPub = `${this.clientKey}.pub`;
        execSync(`ssh-keygen -q -t ed25519 -N "" -f "${this.clientKey}"`);

        // Start sshd using ssh_test_server.sh functions in bash
        const startCmd = `
            source "${sshScript}"
            start_test_sshd || { echo "FAIL:$TEST_SSHD_ERROR"; exit 1; }
            echo "PORT:$TEST_SSHD_PORT"
            echo "PID:$TEST_SSHD_PID"
            echo "DIR:$TEST_SSHD_DIR"
        `;
        const sshOut = execSync(startCmd, { shell: '/bin/bash' }).toString();
        const portMatch = sshOut.match(/PORT:(\d+)/);
        const pidMatch = sshOut.match(/PID:(\d+)/);
        const dirMatch = sshOut.match(/DIR:([^\r\n]+)/);

        if (!portMatch || !pidMatch) {
            throw new Error(`Failed to start test sshd: ${sshOut}`);
        }
        this.sshdPort = parseInt(portMatch[1], 10);
        this.sshdPid = parseInt(pidMatch[1], 10);
        this.sshdDir = dirMatch ? dirMatch[1].trim() : '';

        // Authorize developer/host's pre-existing default SSH key on the test server.
        // WHY A PRE-EXISTING KEY IS AUTHORIZED HERE:
        // 1. The ephemeral test OpenSSH server runs without root privileges (as normal user),
        //    which means password authentication and PAM are disabled (Unix prohibits unprivileged
        //    processes from verifying passwords or switching UIDs).
        // 2. In real usage, deploying a new public key via "Deploy public key" (ssh-generate-key-login)
        //    connects to the remote server either via password or via an existing recognized SSH key.
        // 3. By placing the developer/runner's default key into the test server's authorized_keys,
        //    ssh-generate-key-login can establish the initial SSH connection to deploy the newly
        //    configured client key (test_user_key) when the user clicks the "Deploy public key" button in the UI.
        const defaultPubCandidates = [
            path.join(os.homedir(), '.ssh', 'id_rsa.pub'),
            path.join(os.homedir(), '.ssh', 'id_ed25519.pub'),
            path.join(os.homedir(), '.ssh', 'id_ecdsa.pub')
        ];
        if (this.sshdDir) {
            const authKeysPath = path.join(this.sshdDir, 'authorized_keys');
            for (const pubCandidate of defaultPubCandidates) {
                if (fs.existsSync(pubCandidate)) {
                    const pubData = fs.readFileSync(pubCandidate, 'utf8').trim();
                    if (pubData) {
                        fs.appendFileSync(authKeysPath, `${pubData}\n`);
                    }
                }
            }
        }

        // 3. Create a sample remote git repository
        this.originRepoPath = path.join(this.tmpDir, 'remote_clone_source.git');
        const tempInit = path.join(this.tmpDir, 'temp_init');
        fs.mkdirSync(tempInit, { recursive: true });
        execSync(`git -C "${tempInit}" init -b main`, { stdio: 'ignore' });
        execSync(`git -C "${tempInit}" config user.name "Test Author"`, { stdio: 'ignore' });
        execSync(`git -C "${tempInit}" config user.email "author@test.local"`, { stdio: 'ignore' });
        fs.writeFileSync(path.join(tempInit, 'README.md'), '# Remote Test Repo\nInitial content\n');
        fs.writeFileSync(path.join(tempInit, 'sample.txt'), 'Line 1\nLine 2\nLine 3\n');
        execSync(`git -C "${tempInit}" add .`, { stdio: 'ignore' });
        execSync(`git -C "${tempInit}" commit -m "Initial commit on remote origin"`, { stdio: 'ignore' });
        execSync(`git clone --bare "${tempInit}" "${this.originRepoPath}"`, { stdio: 'ignore' });
        execSync(`rm -rf "${tempInit}"`, { stdio: 'ignore' });

        this.targetClonePath = path.join(this.tmpDir, 'cloned_repo_on_ssh_server');
        return {
            tmpDir: this.tmpDir,
            sshdPort: this.sshdPort,
            clientKey: this.clientKey,
            clientKeyPub: this.clientKeyPub,
            originRepoPath: this.originRepoPath,
            targetClonePath: this.targetClonePath,
            user: os.userInfo().username
        };
    }

    injectKeyToServer() {
        if (this.sshdDir && fs.existsSync(this.clientKeyPub)) {
            const authKeys = path.join(this.sshdDir, 'authorized_keys');
            const pubContent = fs.readFileSync(this.clientKeyPub, 'utf8');
            fs.appendFileSync(authKeys, `\n${pubContent}\n`);
            return true;
        }
        return false;
    }

    launchNW(port = 9333) {
        this.cdpPort = port;
        const repoRoot = path.resolve(__dirname, '../../..');
        let nwBinary = process.env.NW_BIN;
        if (!nwBinary) {
            if (process.platform === 'darwin') {
                if (fs.existsSync('/Applications/nwjs.app/Contents/MacOS/nwjs')) {
                    nwBinary = '/Applications/nwjs.app/Contents/MacOS/nwjs';
                } else {
                    nwBinary = 'nw';
                }
            } else {
                nwBinary = 'nw';
            }
        }

        if (path.isAbsolute(nwBinary) && !fs.existsSync(nwBinary)) {
            throw new Error(`NW.js binary not found at ${nwBinary}. Set NW_BIN environment variable.`);
        }

        // Set isolated HOME so test Pragma-git creates ~/.Pragma-git inside this.tmpDir
        const testHome = this.testHome || path.join(this.tmpDir, 'home');
        fs.mkdirSync(testHome, { recursive: true });

        // Copy default git author and ssh config to testHome
        const realHome = os.homedir();
        if (fs.existsSync(path.join(realHome, '.gitconfig'))) {
            try { fs.copyFileSync(path.join(realHome, '.gitconfig'), path.join(testHome, '.gitconfig')); } catch (e) {}
        }

        // Mirror host default key into testHome/.ssh so ssh-generate-key-login can authenticate against the test server
        const testSshDir = path.join(testHome, '.ssh');
        fs.mkdirSync(testSshDir, { recursive: true, mode: 0o700 });
        for (const keyName of ['id_ed25519', 'id_rsa', 'id_ecdsa']) {
            const privPath = path.join(realHome, '.ssh', keyName);
            const pubPath = `${privPath}.pub`;
            if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
                try {
                    fs.copyFileSync(privPath, path.join(testSshDir, keyName));
                    fs.chmodSync(path.join(testSshDir, keyName), 0o600);
                    fs.copyFileSync(pubPath, path.join(testSshDir, `${keyName}.pub`));
                    fs.chmodSync(path.join(testSshDir, `${keyName}.pub`), 0o644);
                } catch (e) {}
            }
        }

        const args = [
            `--remote-debugging-port=${port}`,
            `--user-data-dir=${this.userDataDir}`,
            '--disable-gpu',
            repoRoot
        ];

        this.nwProcess = spawn(nwBinary, args, {
            detached: false,
            stdio: 'ignore',
            env: {
                ...process.env,
                HOME: testHome,
                USERPROFILE: testHome,
                PRAGMA_SETTINGS_DIR: this.testSettingsDir,
                PRAGMA_SIGNAL_DIR: path.join(this.testSettingsDir, '.tmp'),
                PRAGMA_REMOTE_AUTHORIZED_KEYS: path.join(this.sshdDir, 'authorized_keys')
            }
        });

        return this.nwProcess;
    }

    teardown(keepArtifacts = false) {
        if (this.nwProcess) {
            try { this.nwProcess.kill('SIGKILL'); } catch (e) {}
            this.nwProcess = null;
        }

        if (this.sshdPid) {
            try { process.kill(this.sshdPid, 'SIGTERM'); } catch (e) {}
            this.sshdPid = null;
        }

        if (this.sshdDir && fs.existsSync(this.sshdDir)) {
            try { fs.rmSync(this.sshdDir, { recursive: true, force: true }); } catch (e) {}
        }

        // Clean chrome crashpad handlers that might hold directory locks
        try { execSync('pkill -f "nwjs Framework.*crashpad_handler" 2>/dev/null || true'); } catch (e) {}

        if (this.tmpDir && fs.existsSync(this.tmpDir)) {
            if (!keepArtifacts) {
                // Retry rmSync in case NW.js or crashpad held file locks during shutdown
                for (let attempt = 0; attempt < 5; attempt++) {
                    try {
                        fs.rmSync(this.tmpDir, { recursive: true, force: true });
                        break;
                    } catch (e) {
                        try { execSync('sleep 0.2'); } catch (_) {}
                    }
                }
            } else {
                console.log(`[UIFixtures] Kept test artifacts at: ${this.tmpDir}`);

                // Git tree validation between clone source and cloned target
                const clonedRepoPath = path.join(this.targetClonePath, path.basename(this.originRepoPath, '.git'));
                if (fs.existsSync(this.originRepoPath) && fs.existsSync(clonedRepoPath)) {
                    try {
                        const originTree = execSync(`git --git-dir="${this.originRepoPath}" rev-parse HEAD^{tree}`).toString().trim();
                        const cloneTree = execSync(`git -C "${clonedRepoPath}" rev-parse HEAD^{tree}`).toString().trim();
                        console.log(`\n[UIFixtures] --- Git Tree Validation ---`);
                        console.log(`[UIFixtures] Source Tree: ${originTree} (${this.originRepoPath})`);
                        console.log(`[UIFixtures] Cloned Tree: ${cloneTree} (${clonedRepoPath})`);
                        console.log(`[UIFixtures] Manual verification command:`);
                        console.log(`  diff -u <(git --git-dir="${this.originRepoPath}" ls-tree -r HEAD) <(git -C "${clonedRepoPath}" ls-tree -r HEAD) && echo "TREES MATCH" || echo "TREES DIFFER"`);
                        if (originTree === cloneTree) {
                            console.log(`[UIFixtures] \x1b[32m✓ Validation passed: Cloned git tree is identical to remote source tree.\x1b[0m\n`);
                        } else {
                            console.error(`[UIFixtures] \x1b[31m✗ Validation failed: Cloned git tree differs from remote source tree!\x1b[0m\n`);
                        }
                    } catch (err) {
                        console.warn(`[UIFixtures] Could not validate git trees: ${err.message}`);
                    }
                }
            }
        }
    }
}

module.exports = UIFixtures;
