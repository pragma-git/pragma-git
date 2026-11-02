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
    }

    async setup() {
        // 1. Create unique test sandbox
        this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pragma_ui_test_'));
        this.userDataDir = path.join(this.tmpDir, 'nw_user_data');
        fs.mkdirSync(this.userDataDir, { recursive: true });

        // 2. Start ephemeral SSH server via automated-tests/ssh_test_server.sh
        const repoRoot = path.resolve(__dirname, '../..');
        const sshScript = path.join(repoRoot, 'automated-tests/ssh_test_server.sh');

        // Generate client key pair inside this.tmpDir
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

        // 3. Create a sample remote git repository
        this.originRepoPath = path.join(this.tmpDir, 'remote_origin.git');
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

        this.targetClonePath = path.join(this.tmpDir, 'cloned_repo');
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

    launchNW(port = 9222) {
        const repoRoot = path.resolve(__dirname, '../..');
        const nwBinary = process.env.NW_BIN || (
            process.platform === 'darwin'
                ? '/Applications/nwjs.app/Contents/MacOS/nwjs'
                : 'nw'
        );

        if (!fs.existsSync(nwBinary) && process.platform === 'darwin') {
            throw new Error(`NW.js binary not found at ${nwBinary}. Set NW_BIN environment variable.`);
        }

        // Set isolated HOME so test Pragma-git creates ~/.Pragma-git inside this.tmpDir
        const testHome = path.join(this.tmpDir, 'home');
        fs.mkdirSync(testHome, { recursive: true });

        // Copy default git author and ssh config to testHome
        const realHome = os.homedir();
        if (fs.existsSync(path.join(realHome, '.gitconfig'))) {
            try { fs.copyFileSync(path.join(realHome, '.gitconfig'), path.join(testHome, '.gitconfig')); } catch (e) {}
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
                USERPROFILE: testHome
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
            }
        }
    }
}

module.exports = UIFixtures;
