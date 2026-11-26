'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const sshLib = require(path.join(REPO_ROOT, 'ssh_folder/ssh-folder-lib.js'));
const { getSshConnectionPool } = require(path.join(REPO_ROOT, 'ssh_folder/ssh-connection-pool.js'));

function toRemotePosixPath(localPath) {
    if (process.platform === 'win32') {
        return sshLib.windowsToGitBashPath(localPath);
    }
    return localPath;
}

function startEphemeralSshServer(options = {}) {
    const forceNodeServer = Boolean(options.forceNodeServer || process.platform === 'win32');
    let startOut = '';
    if (forceNodeServer) {
        const helperJs = path.join(REPO_ROOT, 'automated-tests/ssh_test_server.js');
        const res = spawnSync(process.execPath, [helperJs, 'start'], { encoding: 'utf8' });
        if (res.status !== 0) {
            throw new Error(`ssh_test_server.js start failed: ${res.stderr || res.stdout}`);
        }
        startOut = res.stdout || '';
    } else {
        const helperSh = path.join(REPO_ROOT, 'automated-tests/ssh_test_server.sh');
        const res = spawnSync('bash', [helperSh, 'start'], { encoding: 'utf8' });
        if (res.status !== 0) {
            throw new Error(`ssh_test_server.sh start failed: ${res.stderr || res.stdout}`);
        }
        startOut = res.stdout || '';
    }

    const portMatch = startOut.match(/PORT:(\d+)/);
    const pidMatch = startOut.match(/PID:(\d+)/);
    const dirMatch = startOut.match(/DIR:([^\r\n]+)/);
    const userMatch = startOut.match(/USER:([^\r\n]+)/);
    if (!portMatch || !pidMatch || !dirMatch) {
        throw new Error(`Unexpected ssh test server output: ${startOut}`);
    }

    const port = parseInt(portMatch[1], 10);
    const pid = parseInt(pidMatch[1], 10);
    const sshdDir = dirMatch[1].trim();
    const user = userMatch ? userMatch[1].trim() : ((os.userInfo().username || process.env.USER || process.env.USERNAME || 'user').replace(/^.*\\/, ''));

    const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pragma_ssh_suite_'));
    const homeDir = path.join(sandboxDir, 'home');
    const sshDir = path.join(homeDir, '.ssh');
    fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 });

    const defaultKey = path.join(sshDir, 'id_ed25519');
    sshLib.generateLocalSshKey(defaultKey);

    if (options.authorizeDefaultKey !== false) {
        const pubData = fs.readFileSync(`${defaultKey}.pub`, 'utf8').trim();
        fs.appendFileSync(path.join(sshdDir, 'authorized_keys'), `${pubData}\n`, 'utf8');
    }

    const origHome = process.env.HOME;
    const origUserProfile = process.env.USERPROFILE;
    const origPragmaKey = process.env.PRAGMA_SSH_KEY;
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    delete process.env.PRAGMA_SSH_KEY;

    const injectKey = (pubKeyPath) => {
        const pubData = fs.readFileSync(pubKeyPath, 'utf8').trim();
        fs.appendFileSync(path.join(sshdDir, 'authorized_keys'), `${pubData}\n`, 'utf8');
    };

    const setPassword = (password) => {
        fs.writeFileSync(path.join(sshdDir, 'test_password'), String(password), { mode: 0o600 });
    };

    const stop = () => {
        try {
            getSshConnectionPool().closeAll();
        } catch (e) {}

        if (origHome !== undefined) process.env.HOME = origHome;
        else delete process.env.HOME;
        if (origUserProfile !== undefined) process.env.USERPROFILE = origUserProfile;
        else delete process.env.USERPROFILE;
        if (origPragmaKey !== undefined) process.env.PRAGMA_SSH_KEY = origPragmaKey;
        else delete process.env.PRAGMA_SSH_KEY;

        if (forceNodeServer) {
            const helperJs = path.join(REPO_ROOT, 'automated-tests/ssh_test_server.js');
            spawnSync(process.execPath, [helperJs, 'stop', String(port), String(pid), sshdDir], { stdio: 'ignore' });
        } else {
            const helperSh = path.join(REPO_ROOT, 'automated-tests/ssh_test_server.sh');
            spawnSync('bash', [helperSh, 'stop', String(port), String(pid), sshdDir], { stdio: 'ignore' });
        }

        if (!process.env.KEEP_TEMP) {
            try {
                fs.rmSync(sandboxDir, { recursive: true, force: true });
            } catch (e) {}
        }
    };

    return {
        port,
        pid,
        sshdDir,
        user,
        sandboxDir,
        homeDir,
        sshDir,
        defaultKey,
        toRemotePosixPath,
        makeSshUrl: (localDirPath) => `ssh://${user}@127.0.0.1:${port}${toRemotePosixPath(localDirPath)}`,
        injectKey,
        setPassword,
        stop
    };
}

module.exports = {
    REPO_ROOT,
    startEphemeralSshServer,
    toRemotePosixPath
};
