#!/usr/bin/env node
/**
 * ssh_test_server.js - Ephemeral, unprivileged SSH2 + SFTP test server for automated tests
 *
 * Provides a pure Node.js (ssh2.Server) SSH + SFTP server on 127.0.0.1:<random-port>
 * backed by local bash (Git Bash on Windows, /bin/bash on macOS/Linux) and Node fs.
 *
 * Used automatically on Windows (eliminating any need for WSL or Administrator sshd service)
 * and also usable on macOS/Linux (e.g. for password/keyboard-interactive key deployment tests).
 *
 * CLI Commands (compatible with automated-tests/ssh_test_server.sh):
 *   node ssh_test_server.js start
 *     -> Prints PORT:<port>, PID:<pid>, DIR:<dir>, USER:<user>
 *   node ssh_test_server.js stop <port> <pid> <dir>
 *   node ssh_test_server.js inject-key <dir> <pubkey-file>
 *   node ssh_test_server.js set-password <dir> <password>
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { Server, utils: sshUtils } = require('ssh2');
const { getGitBashExecutable, windowsToGitBashPath } = require('../ssh_folder/ssh-folder-lib.js');

const SFTP_STATUS = sshUtils.sftp.STATUS_CODE;
const SFTP_OPEN_MODE = sshUtils.sftp.OPEN_MODE;

function getCleanUsername() {
    let u = '';
    try {
        u = os.userInfo().username || '';
    } catch (e) {}
    if (!u) u = process.env.USER || process.env.USERNAME || 'user';
    if (u.includes('\\')) u = u.split('\\').pop();
    return u;
}

function toForwardSlashes(p) {
    return String(p || '').replace(/\\/g, '/');
}

function resolveServerFsPath(remotePath) {
    if (!remotePath || remotePath === '.') return os.homedir();
    let p = String(remotePath);

    const home = os.homedir();
    const user = getCleanUsername();

    if (p === '~') return home;
    if (p.startsWith('~/')) return path.join(home, p.slice(2));

    if (process.platform === 'win32') {
        if (p === `/home/${user}` || p === `/Users/${user}`) return home;
        if (p.startsWith(`/home/${user}/`)) return path.join(home, p.slice(`/home/${user}/`.length));
        if (p.startsWith(`/Users/${user}/`)) return path.join(home, p.slice(`/Users/${user}/`.length));
        if (p === '/tmp') return os.tmpdir();
        if (p.startsWith('/tmp/')) return path.join(os.tmpdir(), p.slice('/tmp/'.length));

        // Git Bash /c/Users/... or legacy /mnt/c/Users/...
        const mntMatch = p.match(/^\/mnt\/([a-zA-Z])(\/.*)?$/);
        if (mntMatch) {
            return path.normalize(`${mntMatch[1].toUpperCase()}:${mntMatch[2] || '/'}`);
        }
        const driveMatch = p.match(/^\/([a-zA-Z])(\/.*)?$/);
        if (driveMatch && fs.existsSync(`${driveMatch[1].toUpperCase()}:\\`)) {
            return path.normalize(`${driveMatch[1].toUpperCase()}:${driveMatch[2] || '/'}`);
        }
        // Handle leading slash before drive letter from URL pathname: /C:/Users/...
        const urlDriveMatch = p.match(/^\/([a-zA-Z]:\/.*)$/);
        if (urlDriveMatch) {
            return path.normalize(urlDriveMatch[1]);
        }
    }

    return path.normalize(p);
}

function normalizeWindowsCommandPaths(command) {
    if (process.platform !== 'win32') return command;
    const user = getCleanUsername();
    const posixHome = windowsToGitBashPath(os.homedir()).replace(/\/+$/, '');
    return command
        .replace(new RegExp(`/home/${user}(?=/|'|\\"|\\s|$)`, 'g'), posixHome)
        .replace(new RegExp(`/Users/${user}(?=/|'|\\"|\\s|$)`, 'g'), posixHome);
}

function statToSftpAttrs(st) {
    let mode = st.mode || 0;
    const S_IFMT = 0o170000;
    if ((mode & S_IFMT) === 0) {
        mode |= st.isDirectory() ? 0o040755 : 0o100644;
    }
    return {
        mode,
        uid: st.uid || 0,
        gid: st.gid || 0,
        size: st.size || 0,
        atime: Math.floor((st.atimeMs || Date.now()) / 1000),
        mtime: Math.floor((st.mtimeMs || Date.now()) / 1000)
    };
}

function formatLongname(name, st) {
    const typeChar = st.isDirectory() ? 'd' : (st.isSymbolicLink && st.isSymbolicLink() ? 'l' : '-');
    const perms = st.isDirectory() ? 'rwxr-xr-x' : 'rw-r--r--';
    const size = String(st.size || 0).padStart(8, ' ');
    return `${typeChar}${perms} 1 user group ${size} Jan  1 00:00 ${name}`;
}

function sftpFlagsToFsFlags(flags) {
    const r = Boolean(flags & SFTP_OPEN_MODE.READ);
    const w = Boolean(flags & SFTP_OPEN_MODE.WRITE);
    const a = Boolean(flags & SFTP_OPEN_MODE.APPEND);
    const c = Boolean(flags & SFTP_OPEN_MODE.CREAT);
    const t = Boolean(flags & SFTP_OPEN_MODE.TRUNC);
    const x = Boolean(flags & SFTP_OPEN_MODE.EXCL);

    if (a) return r ? 'a+' : 'a';
    if (w && c && t) return r ? 'w+' : 'w';
    if (w && c && x) return r ? 'wx+' : 'wx';
    if (w && c) {
        return (fs.constants.O_CREAT | (r ? fs.constants.O_RDWR : fs.constants.O_WRONLY));
    }
    if (r && w) return 'r+';
    if (w) return 'r+';
    return 'r';
}

function mapFsErrorToSftpStatus(err) {
    if (!err) return SFTP_STATUS.FAILURE;
    if (err.code === 'ENOENT') return SFTP_STATUS.NO_SUCH_FILE;
    if (err.code === 'EACCES' || err.code === 'EPERM') return SFTP_STATUS.PERMISSION_DENIED;
    return SFTP_STATUS.FAILURE;
}

function attachSftpHandlers(sftpStream) {
    let nextHandleId = 1;
    const openFiles = new Map(); // handleHex -> { fd, filePath }
    const openDirs = new Map();  // handleHex -> { dirPath, entries, index }

    const allocHandle = () => {
        const buf = Buffer.alloc(4);
        buf.writeUInt32BE(nextHandleId++, 0);
        return buf;
    };

    sftpStream.on('REALPATH', (reqId, reqPath) => {
        try {
            const resolved = toForwardSlashes(resolveServerFsPath(reqPath));
            sftpStream.name(reqId, [{ filename: resolved, longname: resolved, attrs: {} }]);
        } catch (err) {
            sftpStream.status(reqId, mapFsErrorToSftpStatus(err));
        }
    });

    sftpStream.on('STAT', (reqId, reqPath) => {
        fs.stat(resolveServerFsPath(reqPath), (err, st) => {
            if (err) return sftpStream.status(reqId, mapFsErrorToSftpStatus(err));
            sftpStream.attrs(reqId, statToSftpAttrs(st));
        });
    });

    sftpStream.on('LSTAT', (reqId, reqPath) => {
        fs.lstat(resolveServerFsPath(reqPath), (err, st) => {
            if (err) return sftpStream.status(reqId, mapFsErrorToSftpStatus(err));
            sftpStream.attrs(reqId, statToSftpAttrs(st));
        });
    });

    sftpStream.on('FSTAT', (reqId, handle) => {
        const info = openFiles.get(handle.toString('hex'));
        if (!info) return sftpStream.status(reqId, SFTP_STATUS.FAILURE);
        fs.fstat(info.fd, (err, st) => {
            if (err) return sftpStream.status(reqId, mapFsErrorToSftpStatus(err));
            sftpStream.attrs(reqId, statToSftpAttrs(st));
        });
    });

    sftpStream.on('SETSTAT', (reqId, reqPath, attrs) => {
        const target = resolveServerFsPath(reqPath);
        try {
            if (attrs && attrs.mode !== undefined && process.platform !== 'win32') {
                fs.chmodSync(target, attrs.mode);
            }
            if (attrs && attrs.atime !== undefined && attrs.mtime !== undefined) {
                fs.utimesSync(target, attrs.atime, attrs.mtime);
            }
            sftpStream.status(reqId, SFTP_STATUS.OK);
        } catch (err) {
            sftpStream.status(reqId, mapFsErrorToSftpStatus(err));
        }
    });

    sftpStream.on('FSETSTAT', (reqId, handle, attrs) => {
        const info = openFiles.get(handle.toString('hex'));
        if (!info) return sftpStream.status(reqId, SFTP_STATUS.FAILURE);
        try {
            if (attrs && attrs.mode !== undefined && process.platform !== 'win32') {
                fs.fchmodSync(info.fd, attrs.mode);
            }
            sftpStream.status(reqId, SFTP_STATUS.OK);
        } catch (err) {
            sftpStream.status(reqId, mapFsErrorToSftpStatus(err));
        }
    });

    sftpStream.on('OPEN', (reqId, filename, flags, attrs) => {
        const filePath = resolveServerFsPath(filename);
        const mode = (attrs && attrs.mode !== undefined) ? attrs.mode : 0o666;
        const fsFlags = sftpFlagsToFsFlags(flags);
        fs.open(filePath, fsFlags, mode, (err, fd) => {
            if (err) return sftpStream.status(reqId, mapFsErrorToSftpStatus(err));
            const handle = allocHandle();
            openFiles.set(handle.toString('hex'), { fd, filePath });
            sftpStream.handle(reqId, handle);
        });
    });

    sftpStream.on('READ', (reqId, handle, offset, length) => {
        const info = openFiles.get(handle.toString('hex'));
        if (!info) return sftpStream.status(reqId, SFTP_STATUS.FAILURE);
        const buf = Buffer.alloc(Math.min(length, 65536));
        fs.read(info.fd, buf, 0, buf.length, offset, (err, bytesRead) => {
            if (err) return sftpStream.status(reqId, mapFsErrorToSftpStatus(err));
            if (bytesRead === 0) return sftpStream.status(reqId, SFTP_STATUS.EOF);
            sftpStream.data(reqId, buf.subarray(0, bytesRead));
        });
    });

    sftpStream.on('WRITE', (reqId, handle, offset, data) => {
        const info = openFiles.get(handle.toString('hex'));
        if (!info) return sftpStream.status(reqId, SFTP_STATUS.FAILURE);
        fs.write(info.fd, data, 0, data.length, offset, (err) => {
            if (err) return sftpStream.status(reqId, mapFsErrorToSftpStatus(err));
            sftpStream.status(reqId, SFTP_STATUS.OK);
        });
    });

    sftpStream.on('CLOSE', (reqId, handle) => {
        const key = handle.toString('hex');
        if (openFiles.has(key)) {
            const info = openFiles.get(key);
            openFiles.delete(key);
            fs.close(info.fd, (err) => {
                sftpStream.status(reqId, err ? mapFsErrorToSftpStatus(err) : SFTP_STATUS.OK);
            });
            return;
        }
        if (openDirs.has(key)) {
            openDirs.delete(key);
            sftpStream.status(reqId, SFTP_STATUS.OK);
            return;
        }
        sftpStream.status(reqId, SFTP_STATUS.OK);
    });

    sftpStream.on('OPENDIR', (reqId, reqPath) => {
        const dirPath = resolveServerFsPath(reqPath);
        fs.readdir(dirPath, (err, names) => {
            if (err) return sftpStream.status(reqId, mapFsErrorToSftpStatus(err));
            const entries = [];
            for (const name of names) {
                try {
                    const st = fs.lstatSync(path.join(dirPath, name));
                    entries.push({
                        filename: name,
                        longname: formatLongname(name, st),
                        attrs: statToSftpAttrs(st)
                    });
                } catch (e) {}
            }
            const handle = allocHandle();
            openDirs.set(handle.toString('hex'), { dirPath, entries, sent: false });
            sftpStream.handle(reqId, handle);
        });
    });

    sftpStream.on('READDIR', (reqId, handle) => {
        const info = openDirs.get(handle.toString('hex'));
        if (!info) return sftpStream.status(reqId, SFTP_STATUS.FAILURE);
        if (info.sent) return sftpStream.status(reqId, SFTP_STATUS.EOF);
        info.sent = true;
        if (info.entries.length === 0) return sftpStream.status(reqId, SFTP_STATUS.EOF);
        sftpStream.name(reqId, info.entries);
    });

    sftpStream.on('MKDIR', (reqId, reqPath, attrs) => {
        const mode = (attrs && attrs.mode !== undefined) ? attrs.mode : 0o755;
        fs.mkdir(resolveServerFsPath(reqPath), { mode }, (err) => {
            sftpStream.status(reqId, err ? mapFsErrorToSftpStatus(err) : SFTP_STATUS.OK);
        });
    });

    sftpStream.on('RMDIR', (reqId, reqPath) => {
        fs.rmdir(resolveServerFsPath(reqPath), (err) => {
            sftpStream.status(reqId, err ? mapFsErrorToSftpStatus(err) : SFTP_STATUS.OK);
        });
    });

    sftpStream.on('REMOVE', (reqId, reqPath) => {
        fs.unlink(resolveServerFsPath(reqPath), (err) => {
            sftpStream.status(reqId, err ? mapFsErrorToSftpStatus(err) : SFTP_STATUS.OK);
        });
    });

    sftpStream.on('RENAME', (reqId, oldPath, newPath) => {
        fs.rename(resolveServerFsPath(oldPath), resolveServerFsPath(newPath), (err) => {
            sftpStream.status(reqId, err ? mapFsErrorToSftpStatus(err) : SFTP_STATUS.OK);
        });
    });
}

function loadAuthorizedKeys(authKeysPath) {
    const keys = [];
    if (!fs.existsSync(authKeysPath)) return keys;
    const content = fs.readFileSync(authKeysPath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        // Strip leading authorized_keys options if present, locate key type token
        const parts = line.split(/\s+/);
        let keyLine = line;
        const typeIdx = parts.findIndex(p => /^(ssh-|ecdsa-)/.test(p));
        if (typeIdx > 0) {
            keyLine = parts.slice(typeIdx).join(' ');
        }
        try {
            const parsed = sshUtils.parseKey(keyLine);
            const keyObj = Array.isArray(parsed) ? parsed[0] : parsed;
            if (keyObj && !(keyObj instanceof Error)) {
                keys.push(keyObj);
            }
        } catch (e) {}
    }
    return keys;
}

function buildBashEnv() {
    const env = Object.assign({}, process.env, {
        HOME: os.homedir(),
        USER: getCleanUsername(),
        GCM_INTERACTIVE: 'never'
    });
    if (process.platform === 'win32') {
        const bashExe = getGitBashExecutable();
        const gitRoot = path.resolve(path.dirname(bashExe), bashExe.toLowerCase().includes('\\usr\\bin\\') ? '../..' : '..');
        const extra = [
            path.join(gitRoot, 'usr', 'bin'),
            path.join(gitRoot, 'mingw64', 'bin'),
            path.join(gitRoot, 'cmd')
        ];
        const existing = env.PATH || env.Path || env.path || '';
        for (const k of Object.keys(env)) {
            if (k.toUpperCase() === 'PATH' && k !== 'PATH') {
                delete env[k];
            }
        }
        env.PATH = extra.concat(existing ? [existing] : []).join(';');
    }
    return env;
}

function runDaemon(sshdDir) {
    const hostKeyPath = path.join(sshdDir, 'host_key');
    const authKeysPath = path.join(sshdDir, 'authorized_keys');
    const passwordFile = path.join(sshdDir, 'test_password');
    const hostKey = fs.readFileSync(hostKeyPath);
    const bashExe = getGitBashExecutable();

    const server = new Server({ hostKeys: [hostKey] }, (client) => {
        client.on('error', () => {});

        client.on('authentication', (ctx) => {
            const hasPassword = fs.existsSync(passwordFile);
            const allowedMethods = hasPassword
                ? ['publickey', 'password', 'keyboard-interactive']
                : ['publickey'];

            if (ctx.method === 'publickey') {
                const authKeys = loadAuthorizedKeys(authKeysPath);
                for (const pubKey of authKeys) {
                    const pubSsh = pubKey.getPublicSSH();
                    if (pubKey.type === ctx.key.algo && Buffer.compare(pubSsh, ctx.key.data) === 0) {
                        if (!ctx.signature) {
                            return ctx.accept();
                        }
                        if (pubKey.verify(ctx.blob, ctx.signature, ctx.hashAlgo) === true) {
                            return ctx.accept();
                        }
                    }
                }
                return ctx.reject(allowedMethods);
            }

            if (hasPassword && ctx.method === 'password') {
                const expected = fs.readFileSync(passwordFile, 'utf8').replace(/[\r\n]+$/, '');
                if (ctx.password === expected) {
                    return ctx.accept();
                }
                return ctx.reject(allowedMethods);
            }

            if (hasPassword && ctx.method === 'keyboard-interactive') {
                const expected = fs.readFileSync(passwordFile, 'utf8').replace(/[\r\n]+$/, '');
                return ctx.prompt([{ prompt: `${ctx.username}@127.0.0.1's password: `, echo: false }], (answers) => {
                    if (Array.isArray(answers) && answers[0] === expected) {
                        return ctx.accept();
                    }
                    return ctx.reject(allowedMethods);
                });
            }

            ctx.reject(allowedMethods);
        });

        client.on('ready', () => {
            client.on('session', (accept) => {
                const session = accept();
                const sessionEnv = {};

                session.on('pty', (acceptPty) => {
                    if (typeof acceptPty === 'function') acceptPty();
                });

                session.on('env', (acceptEnv, rejectEnv, info) => {
                    if (info && info.key) sessionEnv[info.key] = info.value;
                    if (typeof acceptEnv === 'function') acceptEnv();
                });

                session.on('sftp', (acceptSftp) => {
                    const sftpStream = acceptSftp();
                    attachSftpHandlers(sftpStream);
                });

                session.on('exec', (acceptExec, rejectExec, info) => {
                    const channel = acceptExec();
                    const rawCmd = normalizeWindowsCommandPaths(info.command);
                    const env = Object.assign(buildBashEnv(), sessionEnv);

                    const child = spawn(bashExe, ['-c', rawCmd], {
                        cwd: os.homedir(),
                        env,
                        stdio: ['pipe', 'pipe', 'pipe']
                    });

                    channel.on('data', (chunk) => {
                        if (child.stdin && !child.stdin.destroyed) {
                            child.stdin.write(chunk);
                        }
                    });
                    const closeStdin = () => {
                        if (child.stdin && !child.stdin.destroyed) {
                            child.stdin.end();
                        }
                    };
                    channel.on('end', closeStdin);
                    channel.on('eof', closeStdin);
                    channel.on('close', () => {
                        try { child.kill(); } catch (e) {}
                    });

                    child.stdout.on('data', (chunk) => {
                        channel.write(chunk);
                    });
                    child.stderr.on('data', (chunk) => {
                        channel.stderr.write(chunk);
                    });

                    let exitCode = 0;
                    child.on('exit', (code) => {
                        exitCode = typeof code === 'number' ? code : 0;
                    });
                    child.on('close', (code) => {
                        const finalCode = typeof code === 'number' ? code : exitCode;
                        try {
                            channel.exit(finalCode);
                            channel.end();
                            channel.close();
                        } catch (e) {}
                    });
                    child.on('error', (err) => {
                        try {
                            channel.stderr.write(String(err.message || err) + '\n');
                            channel.exit(127);
                            channel.end();
                            channel.close();
                        } catch (e) {}
                    });
                });
            });
        });
    });

    server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        fs.writeFileSync(path.join(sshdDir, 'sshd.pid'), String(process.pid), 'utf8');
        fs.writeFileSync(path.join(sshdDir, 'sshd.port'), String(port), 'utf8');
    });

    const shutdown = () => {
        try { server.close(); } catch (e) {}
        process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

async function startCommand() {
    const sshdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pragma_test_sshd_'));
    const keys = sshUtils.generateKeyPairSync('ed25519', { comment: 'pragma-test-sshd' });
    fs.writeFileSync(path.join(sshdDir, 'host_key'), keys.private, { mode: 0o600 });
    fs.writeFileSync(path.join(sshdDir, 'authorized_keys'), '', { mode: 0o600 });

    const child = spawn(process.execPath, [__filename, '--daemon', sshdDir], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });
    child.unref();

    const portFile = path.join(sshdDir, 'sshd.port');
    let port = '';
    for (let i = 0; i < 60; i++) {
        if (fs.existsSync(portFile)) {
            port = fs.readFileSync(portFile, 'utf8').trim();
            if (port) break;
        }
        await new Promise(r => setTimeout(r, 50));
    }

    if (!port) {
        let logMsg = '';
        try { logMsg = fs.readFileSync(path.join(sshdDir, 'sshd.log'), 'utf8'); } catch (e) {}
        console.error(`FAIL:ssh_test_server.js daemon did not start: ${logMsg}`);
        process.exit(1);
    }

    console.log(`PORT:${port}`);
    console.log(`PID:${child.pid}`);
    console.log(`DIR:${toForwardSlashes(sshdDir)}`);
    console.log(`USER:${getCleanUsername()}`);
}

function stopCommand(port, pidStr, dir) {
    const pid = parseInt(pidStr, 10);
    if (pid && !isNaN(pid)) {
        try { process.kill(pid, 'SIGTERM'); } catch (e) {}
        try { process.kill(pid); } catch (e) {}
    }
    if (dir && fs.existsSync(dir)) {
        for (let i = 0; i < 5; i++) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
                break;
            } catch (e) {}
        }
    }
}

function injectKeyCommand(dir, pubKeyFile) {
    const authKeysPath = path.join(dir, 'authorized_keys');
    const pubData = fs.readFileSync(pubKeyFile, 'utf8').trim();
    fs.appendFileSync(authKeysPath, `${pubData}\n`, 'utf8');
}

function setPasswordCommand(dir, password) {
    fs.writeFileSync(path.join(dir, 'test_password'), String(password), { mode: 0o600 });
}

async function main() {
    const cmd = process.argv[2];
    if (cmd === '--daemon') {
        runDaemon(process.argv[3]);
        return;
    }
    if (cmd === 'start') {
        await startCommand();
        return;
    }
    if (cmd === 'stop') {
        stopCommand(process.argv[3], process.argv[4], process.argv[5]);
        return;
    }
    if (cmd === 'inject-key') {
        injectKeyCommand(process.argv[3], process.argv[4]);
        return;
    }
    if (cmd === 'set-password') {
        setPasswordCommand(process.argv[3], process.argv[4]);
        return;
    }
    console.error('Usage: ssh_test_server.js {start|stop <port> <pid> <dir>|inject-key <dir> <pubkey>|set-password <dir> <password>}');
    process.exit(2);
}

if (require.main === module) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = {
    resolveServerFsPath,
    loadAuthorizedKeys
};
