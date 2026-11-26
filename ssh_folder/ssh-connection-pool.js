//
// ssh-connection-pool.js - Cross-platform persistent SSH2 connection pool & SFTP/Git transport
//
// Provides pure Node.js connection multiplexing (exec + SFTP over a single persistent TCP/SSH2
// socket per user@host:port + key) across macOS, Linux, and Windows without requiring WSL or
// OpenSSH ControlMaster sockets.
//

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Client, utils: ssh2Utils } = require('ssh2');
const SSHConfig = require('ssh-config');

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // Keep pooled SSH connections alive for 5 minutes of inactivity
const KEEPALIVE_INTERVAL_MS = 15000;

function getHomeDir() {
    if (process.env.HOME && process.env.HOME.trim()) return process.env.HOME.trim();
    if (process.env.USERPROFILE && process.env.USERPROFILE.trim()) return process.env.USERPROFILE.trim();
    return os.homedir();
}

function getCurrentUsername() {
    try {
        const u = os.userInfo().username;
        if (u) return u.replace(/^.*\\/, '');
    } catch (e) {}
    const envUser = process.env.USER || process.env.USERNAME || 'user';
    return envUser.replace(/^.*\\/, '');
}

function getSignalDir() {
    if (process.env.PRAGMA_SIGNAL_DIR && process.env.PRAGMA_SIGNAL_DIR.trim()) {
        return process.env.PRAGMA_SIGNAL_DIR.trim();
    }
    return path.join(getHomeDir(), '.Pragma-git', '.tmp');
}

function getLocalSshTempLocation() {
    if (typeof global !== 'undefined' && global.SSH_TEMP_FILE_LOCATION) {
        return global.SSH_TEMP_FILE_LOCATION;
    }
    if (process.platform === 'win32') {
        const tempDir = path.join(getHomeDir(), 'AppData', 'Local', 'Temp', 'pragma-git-ssh-folders');
        if (!fs.existsSync(tempDir)) {
            try { fs.mkdirSync(tempDir, { recursive: true }); } catch (e) {}
        }
        return tempDir;
    }
    return '/tmp/pragma-git-ssh-folders';
}

function expandHomePath(p) {
    if (!p || typeof p !== 'string') return '';
    let trimmed = p.trim();
    if (trimmed === '~') return getHomeDir();
    if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
        return path.join(getHomeDir(), trimmed.slice(2));
    }
    return trimmed;
}

function shellQuoteSingle(str) {
    return `'${String(str).replace(/'/g, "'\\''")}'`;
}

/**
 * Parses an SSH URL ("ssh://[user@]host[:port][/path]") into components.
 * Supports both literal spaces and percent-encoded characters (%20) in paths.
 */
function parseSshUrlRaw(sshUrl) {
    let username = '';
    let host = '';
    let port = '';
    let folder = '';

    if (!sshUrl || typeof sshUrl !== 'string') {
        return { username, host, port, folder };
    }

    let temp = sshUrl.trim().replace(/^ssh:\/\//i, '');
    let serverPart = '';
    let pathPart = '';

    const slashIdx = temp.indexOf('/');
    if (slashIdx >= 0) {
        serverPart = temp.substring(0, slashIdx);
        pathPart = temp.substring(slashIdx); // Includes leading '/'
    } else {
        serverPart = temp;
        pathPart = '/';
    }

    if (serverPart.includes('@')) {
        const atIdx = serverPart.lastIndexOf('@');
        username = serverPart.substring(0, atIdx);
        serverPart = serverPart.substring(atIdx + 1);
    }

    // Remove trailing colon without port (e.g. "user@host:")
    serverPart = serverPart.replace(/:$/, '');

    if (serverPart.includes(':')) {
        const colonIdx = serverPart.lastIndexOf(':');
        host = serverPart.substring(0, colonIdx);
        port = serverPart.substring(colonIdx + 1);
    } else {
        host = serverPart;
        port = '';
    }

    if (/%[0-9A-Fa-f]{2}/.test(pathPart)) {
        try {
            pathPart = decodeURIComponent(pathPart);
        } catch (e) {}
    }

    folder = pathPart || '/';
    return { username, host, port, folder };
}

/**
 * Reads ~/.ssh/config if present and computes host-specific overrides.
 */
function loadSshHostConfig(host) {
    if (!host) return {};
    const configPath = path.join(getHomeDir(), '.ssh', 'config');
    if (!fs.existsSync(configPath)) return {};
    try {
        const content = fs.readFileSync(configPath, 'utf8');
        const parsed = SSHConfig.parse(content);
        return parsed.compute(host) || {};
    } catch (e) {
        return {};
    }
}

/**
 * Finds configured sshKey for a repository URL using longest-prefix match in Pragma-git state.
 */
function findRepoConfiguredKey(sshUrl) {
    if (!sshUrl) return '';
    let st = null;
    if (typeof global !== 'undefined' && global.state) {
        st = global.state;
    }
    if (!st || !Array.isArray(st.repos)) return '';

    let longestMatch = null;
    let longestLen = -1;
    for (const r of st.repos) {
        if (!r || !r.localFolder) continue;
        if (sshUrl === r.localFolder || sshUrl.startsWith(r.localFolder + '/') || sshUrl.startsWith(r.localFolder + '\\')) {
            if (r.localFolder.length > longestLen) {
                longestLen = r.localFolder.length;
                longestMatch = r;
            }
        }
    }
    return (longestMatch && longestMatch.sshKey) ? longestMatch.sshKey.trim() : '';
}

/**
 * Resolves a key specification (bare name, ~/path, or absolute path; .pub or private) to a local private key path.
 */
function normalizePrivateKeyPath(rawKey) {
    if (!rawKey || typeof rawKey !== 'string') return '';
    let k = rawKey.trim();
    if (!k) return '';
    if (k.endsWith('.pub')) {
        k = k.slice(0, -4);
    }
    if (k.startsWith('~')) {
        return expandHomePath(k);
    }
    if (k.includes('/') || k.includes('\\') || /^[a-zA-Z]:/.test(k)) {
        return path.resolve(k);
    }
    // Bare key filename -> ~/.ssh/<name>
    return path.join(getHomeDir(), '.ssh', k);
}

/**
 * Collects default candidate private key paths in ~/.ssh when no explicit key is pinned.
 */
function getDefaultCandidateKeys(sshHostCfg = {}) {
    const candidates = [];
    const seen = new Set();
    const addCandidate = (p) => {
        if (!p) return;
        const resolved = normalizePrivateKeyPath(p);
        if (resolved && !seen.has(resolved) && fs.existsSync(resolved)) {
            seen.add(resolved);
            candidates.push(resolved);
        }
    };

    if (typeof global !== 'undefined' && global.state?.tools?.defaultSshKey) {
        addCandidate(global.state.tools.defaultSshKey);
    }

    if (sshHostCfg.IdentityFile) {
        const idFiles = Array.isArray(sshHostCfg.IdentityFile) ? sshHostCfg.IdentityFile : [sshHostCfg.IdentityFile];
        for (const f of idFiles) {
            addCandidate(String(f).replace(/^["']|["']$/g, ''));
        }
    }

    const sshDir = path.join(getHomeDir(), '.ssh');
    for (const std of ['id_ed25519', 'id_ecdsa', 'id_rsa']) {
        addCandidate(path.join(sshDir, std));
    }

    if (fs.existsSync(sshDir)) {
        try {
            const files = fs.readdirSync(sshDir);
            for (const f of files) {
                if (!f.endsWith('.pub') && !f.startsWith('.') && !['known_hosts', 'authorized_keys', 'config'].includes(f)) {
                    if (files.includes(f + '.pub')) {
                        addCandidate(path.join(sshDir, f));
                    }
                }
            }
        } catch (e) {}
    }

    return candidates;
}

/**
 * Resolves full connection target parameters from an SSH URL and optional key override.
 */
function resolveConnectionParams(sshUrl, keyOverride = '') {
    const raw = parseSshUrlRaw(sshUrl);
    const hostCfg = loadSshHostConfig(raw.host);

    const host = (hostCfg.HostName ? String(hostCfg.HostName) : raw.host) || '';
    const port = parseInt(raw.port || hostCfg.Port || '22', 10) || 22;
    const username = raw.username || (hostCfg.User ? String(hostCfg.User) : '') || getCurrentUsername();
    const remotePath = raw.folder || '/';

    const explicitRaw = (keyOverride && keyOverride.trim())
        || (process.env.PRAGMA_SSH_KEY && process.env.PRAGMA_SSH_KEY.trim())
        || findRepoConfiguredKey(sshUrl);

    let explicitKeyPath = '';
    let candidateKeyPaths = [];
    if (explicitRaw) {
        explicitKeyPath = normalizePrivateKeyPath(explicitRaw);
        candidateKeyPaths = [explicitKeyPath];
    } else {
        candidateKeyPaths = getDefaultCandidateKeys(hostCfg);
    }

    const keyCacheId = explicitKeyPath ? `explicit:${explicitKeyPath}` : `default:${candidateKeyPaths.join(',')}`;

    return {
        rawHost: raw.host,
        host,
        port,
        username,
        remotePath,
        explicitKeyPath,
        candidateKeyPaths,
        keyCacheId
    };
}

/**
 * Parses space-separated quoted file paths from remote /tmp/git_diff_file_list.txt,
 * preserving empty "" positional slots (e.g. $BASE when empty in git difftool).
 */
function parseRemoteDiffFileList(line) {
    const results = [];
    if (!line || typeof line !== 'string') return results;
    const str = line.trim();
    const regex = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+)/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
        if (match[1] !== undefined) {
            results.push(match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
        } else if (match[2] !== undefined) {
            results.push(match[2]);
        } else if (match[3] !== undefined) {
            results.push(match[3]);
        }
    }
    return results;
}

/**
 * Prompts the user via Pragma-git's local askpass.html GUI window using signal files.
 */
async function promptViaAskpass(promptText, timeoutMs = 120000, shouldAbort = null) {
    const signalDir = getSignalDir();
    fs.mkdirSync(signalDir, { recursive: true });

    const runningFile = path.join(signalDir, 'pragma-askpass-running');
    const promptFile = path.join(signalDir, 'askpass_first');
    const exitFile = path.join(signalDir, 'exit-pragma-askpass');
    const messageFile = path.join(signalDir, 'exit-message-pragma-askpass');

    try { if (fs.existsSync(exitFile)) fs.unlinkSync(exitFile); } catch (e) {}
    try { if (fs.existsSync(messageFile)) fs.unlinkSync(messageFile); } catch (e) {}

    fs.writeFileSync(promptFile, String(promptText || 'Password: '), 'utf8');
    fs.writeFileSync(runningFile, String(process.pid), 'utf8');

    const start = Date.now();
    while (fs.existsSync(runningFile)) {
        if (typeof shouldAbort === 'function' && shouldAbort()) {
            try { fs.unlinkSync(runningFile); } catch (e) {}
            try { fs.unlinkSync(promptFile); } catch (e) {}
            const abortErr = new Error('Password prompt aborted because command finished');
            abortErr.canceled = true;
            throw abortErr;
        }
        if (Date.now() - start > timeoutMs) {
            try { fs.unlinkSync(runningFile); } catch (e) {}
            throw new Error('Password prompt timed out');
        }
        await new Promise(r => setTimeout(r, 150));
    }

    let exitCode = 1;
    let secret = '';
    try {
        if (fs.existsSync(exitFile)) {
            exitCode = parseInt(fs.readFileSync(exitFile, 'utf8').trim(), 10);
            fs.unlinkSync(exitFile);
        }
    } catch (e) {}
    try {
        if (fs.existsSync(messageFile)) {
            secret = fs.readFileSync(messageFile, 'utf8');
            fs.unlinkSync(messageFile);
        }
    } catch (e) {}
    try { if (fs.existsSync(promptFile)) fs.unlinkSync(promptFile); } catch (e) {}

    if (exitCode !== 0) {
        const cancelErr = new Error('Authentication canceled by user');
        cancelErr.canceled = true;
        throw cancelErr;
    }
    return secret.replace(/\r?\n$/, '');
}

class SshConnectionPool {
    constructor() {
        this.entries = new Map();       // poolKey -> { client, sftpPromise, idleTimer, activeOps, closed }
        this.pendingConnects = new Map(); // poolKey -> Promise<entry>
    }

    _makePoolKey(params) {
        return `${params.username}@${params.host}:${params.port}|${params.keyCacheId}`;
    }

    _touchEntry(poolKey, entry) {
        if (entry.idleTimer) {
            clearTimeout(entry.idleTimer);
            entry.idleTimer = null;
        }
        if (entry.activeOps > 0) {
            if (entry.client && entry.client._sock && typeof entry.client._sock.ref === 'function') {
                entry.client._sock.ref();
            }
        } else {
            // Unref idle socket and timer so standalone CLI/test processes exit cleanly without hanging
            if (entry.client && entry.client._sock && typeof entry.client._sock.unref === 'function') {
                entry.client._sock.unref();
            }
            entry.idleTimer = setTimeout(() => {
                if (entry.activeOps === 0) {
                    this._evict(poolKey, entry);
                }
            }, IDLE_TIMEOUT_MS);
            if (typeof entry.idleTimer.unref === 'function') {
                entry.idleTimer.unref();
            }
        }
    }

    _evict(poolKey, entry) {
        if (!entry) return;
        entry.closed = true;
        if (entry.idleTimer) {
            clearTimeout(entry.idleTimer);
            entry.idleTimer = null;
        }
        if (this.entries.get(poolKey) === entry) {
            this.entries.delete(poolKey);
        }
        try { entry.client.end(); } catch (e) {}
        try { entry.client.destroy(); } catch (e) {}
    }

    evictHost(host, port, username) {
        for (const [k, entry] of Array.from(this.entries.entries())) {
            if (k.startsWith(`${username}@${host}:${port}|`)) {
                this._evict(k, entry);
            }
        }
    }

    closeAll() {
        for (const [k, entry] of Array.from(this.entries.entries())) {
            this._evict(k, entry);
        }
    }

    _buildPublicKeyAuthHandlers(params) {
        const handlers = [];
        for (const keyPath of params.candidateKeyPaths) {
            if (fs.existsSync(keyPath)) {
                try {
                    const keyBuf = fs.readFileSync(keyPath);
                    handlers.push({
                        type: 'publickey',
                        username: params.username,
                        key: keyBuf
                    });
                } catch (e) {}
            }
        }

        // Support ssh-agent only when no explicit key override was requested
        if (!params.explicitKeyPath) {
            const agentSock = process.env.SSH_AUTH_SOCK
                || (process.platform === 'win32' ? '\\\\.\\pipe\\openssh-ssh-agent' : '');
            if (agentSock) {
                handlers.push({
                    type: 'agent',
                    username: params.username,
                    agent: agentSock
                });
            }
        }
        return handlers;
    }

    async _acquireEntry(params, timeoutMs = 8000) {
        if (!params.host) {
            throw new Error('Missing host/server in SSH URL');
        }
        if (params.explicitKeyPath && !fs.existsSync(params.explicitKeyPath)) {
            const err = new Error(`Permission denied (publickey): SSH key file not found at ${params.explicitKeyPath}`);
            err.code = 'KEY_MISSING';
            throw err;
        }

        const poolKey = this._makePoolKey(params);
        const existing = this.entries.get(poolKey);
        if (existing && !existing.closed && existing.client && existing.client._sock && !existing.client._sock.destroyed) {
            return { poolKey, entry: existing };
        }
        if (existing) {
            this._evict(poolKey, existing);
        }

        if (this.pendingConnects.has(poolKey)) {
            const entry = await this.pendingConnects.get(poolKey);
            return { poolKey, entry };
        }

        const connectPromise = new Promise((resolve, reject) => {
            const client = new Client();
            const entry = {
                client,
                sftpPromise: null,
                idleTimer: null,
                activeOps: 0,
                closed: false
            };

            const authHandlers = this._buildPublicKeyAuthHandlers(params);
            if (authHandlers.length === 0) {
                const err = new Error('Permission denied (publickey): No local SSH private key found');
                err.code = 'KEY_MISSING';
                return reject(err);
            }

            let settled = false;
            const connectTimer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    try { client.destroy(); } catch (e) {}
                    const err = new Error(`Connection to ${params.host}:${params.port} timed out`);
                    err.code = 'ETIMEDOUT';
                    reject(err);
                }
            }, timeoutMs);
            if (typeof connectTimer.unref === 'function') connectTimer.unref();

            client.once('ready', () => {
                clearTimeout(connectTimer);
                if (settled) {
                    try { client.end(); } catch (e) {}
                    return;
                }
                settled = true;
                this.entries.set(poolKey, entry);
                this._touchEntry(poolKey, entry);
                resolve(entry);
            });

            client.on('error', (err) => {
                // Non-fatal ssh-agent connection errors allow ssh2 to continue to tryNextAuth()
                if (err && err.level === 'agent') return;
                clearTimeout(connectTimer);
                this._evict(poolKey, entry);
                if (!settled) {
                    settled = true;
                    reject(err);
                }
            });

            client.on('end', () => {
                this._evict(poolKey, entry);
            });

            client.on('close', () => {
                this._evict(poolKey, entry);
                if (!settled) {
                    settled = true;
                    reject(new Error(`SSH connection closed unexpectedly by ${params.host}:${params.port}`));
                }
            });

            try {
                client.connect({
                    host: params.host,
                    port: params.port,
                    username: params.username,
                    readyTimeout: timeoutMs,
                    keepaliveInterval: KEEPALIVE_INTERVAL_MS,
                    keepaliveCountMax: 3,
                    authHandler: authHandlers
                });
            } catch (syncErr) {
                clearTimeout(connectTimer);
                if (!settled) {
                    settled = true;
                    reject(syncErr);
                }
            }
        }).finally(() => {
            this.pendingConnects.delete(poolKey);
        });

        this.pendingConnects.set(poolKey, connectPromise);
        const entry = await connectPromise;
        return { poolKey, entry };
    }

    async _withConnection(params, timeoutMs, fn) {
        const runOnce = async () => {
            const { poolKey, entry } = await this._acquireEntry(params, timeoutMs);
            entry.activeOps++;
            this._touchEntry(poolKey, entry);
            try {
                return await fn(entry, poolKey);
            } finally {
                entry.activeOps = Math.max(0, entry.activeOps - 1);
                if (!entry.closed) {
                    this._touchEntry(poolKey, entry);
                }
            }
        };

        try {
            return await runOnce();
        } catch (err) {
            const msg = String(err && (err.message || err)).toLowerCase();
            // Retry once if a pooled idle connection went stale on the network
            if (msg.includes('not connected') || msg.includes('channel open failure') || msg.includes('socket is closed') || msg.includes('econnreset') || msg.includes('epipe')) {
                const poolKey = this._makePoolKey(params);
                const dead = this.entries.get(poolKey);
                if (dead) this._evict(poolKey, dead);
                return await runOnce();
            }
            throw err;
        }
    }

    _getSftp(entry) {
        if (entry.sftpPromise) return entry.sftpPromise;
        entry.sftpPromise = new Promise((resolve, reject) => {
            entry.client.sftp((err, sftp) => {
                if (err) {
                    entry.sftpPromise = null;
                    return reject(err);
                }
                sftp.on('close', () => { entry.sftpPromise = null; });
                sftp.on('error', () => { entry.sftpPromise = null; });
                resolve(sftp);
            });
        });
        return entry.sftpPromise;
    }

    /**
     * Executes a shell command on the remote SSH server over the pooled connection.
     */
    async execCommand(sshUrl, command, options = {}) {
        const sshKey = options.sshKey || '';
        const connectTimeoutMs = options.connectTimeoutMs || Math.min(options.timeoutMs || 8000, 10000);
        const params = resolveConnectionParams(sshUrl, sshKey);

        return await this._withConnection(params, connectTimeoutMs, async (entry, poolKey) => {
            return await new Promise((resolve, reject) => {
                let timer = null;
                let timedOut = false;

                if (options.timeoutMs && options.timeoutMs > 0) {
                    timer = setTimeout(() => {
                        timedOut = true;
                        this._evict(poolKey, entry);
                        const err = new Error(`SSH command timed out after ${options.timeoutMs}ms`);
                        err.code = 'ETIMEDOUT';
                        reject(err);
                    }, options.timeoutMs);
                    if (typeof timer.unref === 'function') timer.unref();
                }

                entry.client.exec(command, (err, stream) => {
                    if (err) {
                        if (timer) clearTimeout(timer);
                        return reject(err);
                    }

                    const stdOut = [];
                    const stdErr = [];
                    let exitCode = null;
                    let closed = false;
                    let exited = false;

                    const maybeFinish = () => {
                        if (timedOut) return;
                        if (closed && exited) {
                            if (timer) clearTimeout(timer);
                            const outBuf = Buffer.concat(stdOut);
                            const errBuf = Buffer.concat(stdErr);
                            resolve({
                                stdOut,
                                stdErr,
                                stdoutBuffer: outBuf,
                                stderrBuffer: errBuf,
                                stdout: outBuf.toString('utf8'),
                                stderr: errBuf.toString('utf8'),
                                exitCode: exitCode !== null ? exitCode : 0
                            });
                        }
                    };

                    stream.on('data', (chunk) => {
                        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                        stdOut.push(buf);
                        if (typeof options.onStdout === 'function') options.onStdout(buf);
                    });

                    stream.stderr.on('data', (chunk) => {
                        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                        stdErr.push(buf);
                        if (typeof options.onStderr === 'function') options.onStderr(buf);
                    });

                    stream.on('exit', (code, signal) => {
                        exitCode = typeof code === 'number' ? code : (signal ? 1 : 0);
                        exited = true;
                        maybeFinish();
                    });

                    stream.on('close', (code) => {
                        if (exitCode === null) {
                            exitCode = typeof code === 'number' ? code : 0;
                        }
                        exited = true;
                        closed = true;
                        maybeFinish();
                    });

                    stream.on('error', (streamErr) => {
                        if (timer) clearTimeout(timer);
                        if (!timedOut) reject(streamErr);
                    });

                    if (options.input !== undefined && options.input !== null) {
                        stream.end(options.input);
                    } else {
                        stream.end();
                    }
                });
            });
        });
    }

    /**
     * Checks if a file or directory exists on the remote SSH server.
     */
    async exists(sshUrl, sshKey = '') {
        const params = resolveConnectionParams(sshUrl, sshKey);
        return await this._withConnection(params, 4000, async (entry) => {
            try {
                const sftp = await this._getSftp(entry);
                const ok = await new Promise((resolve) => {
                    sftp.stat(params.remotePath, (err) => resolve(!err));
                });
                return ok;
            } catch (sftpErr) {
                // Fallback if SFTP subsystem is disabled on remote server
                const res = await this.execCommand(sshUrl, `test -e ${shellQuoteSingle(params.remotePath)}`, { sshKey, timeoutMs: 4000 });
                return res.exitCode === 0;
            }
        });
    }

    /**
     * Creates a remote directory (recursive mkdir -p).
     */
    async mkdirP(sshUrl, sshKey = '') {
        const params = resolveConnectionParams(sshUrl, sshKey);
        const alreadyDir = await this._withConnection(params, 4000, async (entry) => {
            try {
                const sftp = await this._getSftp(entry);
                return await new Promise((resolve) => {
                    sftp.stat(params.remotePath, (err, st) => {
                        resolve(!err && Boolean(st && typeof st.isDirectory === 'function' && st.isDirectory()));
                    });
                });
            } catch (_) {
                return false;
            }
        });
        if (alreadyDir) {
            return true;
        }
        const res = await this.execCommand(sshUrl, `mkdir -p ${shellQuoteSingle(params.remotePath)}`, { sshKey, timeoutMs: 15000 });
        if (res.exitCode !== 0) {
            throw new Error(`Failed to create remote directory "${params.remotePath}": ${res.stderr || res.stdout}`);
        }
        return true;
    }

    /**
     * Downloads a file relative to the SSH repo base into local SSH_TEMP_FILE_LOCATION.
     */
    async downloadRepoFile(sshUrl, relativePath, sshKey = '') {
        const params = resolveConnectionParams(sshUrl, sshKey);
        const cleanRel = String(relativePath || '').replace(/^[/\\]+/, '').replace(/\\/g, '/');
        const remoteFull = params.remotePath.replace(/\/+$/, '') + '/' + cleanRel;
        const localBase = getLocalSshTempLocation();
        const localFull = path.join(localBase, ...cleanRel.split('/'));

        fs.mkdirSync(path.dirname(localFull), { recursive: true });

        await this._withConnection(params, 10000, async (entry) => {
            try {
                const sftp = await this._getSftp(entry);
                const data = await new Promise((resolve, reject) => {
                    sftp.readFile(remoteFull, (err, buf) => err ? reject(err) : resolve(buf));
                });
                fs.writeFileSync(localFull, data);
            } catch (sftpErr) {
                const res = await this.execCommand(sshUrl, `cat ${shellQuoteSingle(remoteFull)}`, { sshKey, timeoutMs: 15000 });
                if (res.exitCode !== 0) {
                    throw new Error(`Failed to download remote file "${remoteFull}": ${res.stderr}`);
                }
                fs.writeFileSync(localFull, res.stdoutBuffer);
            }
        });

        return localFull;
    }

    /**
     * Uploads a file from local SSH_TEMP_FILE_LOCATION back to the remote SSH repo.
     */
    async uploadRepoFile(sshUrl, relativePath, sshKey = '') {
        const params = resolveConnectionParams(sshUrl, sshKey);
        const cleanRel = String(relativePath || '').replace(/^[/\\]+/, '').replace(/\\/g, '/');
        const remoteFull = params.remotePath.replace(/\/+$/, '') + '/' + cleanRel;
        const localBase = getLocalSshTempLocation();
        const localFull = path.join(localBase, ...cleanRel.split('/'));

        if (!fs.existsSync(localFull)) {
            throw new Error(`Local temporary file not found at ${localFull}`);
        }
        return await this.uploadAbsoluteFile(localFull, `${sshUrl.replace(/\/+$/, '')}/${cleanRel}`, sshKey);
    }

    /**
     * Uploads any local file to an exact destination SSH URL (creating parent directory and setting +x on pragma-* helpers).
     */
    async uploadAbsoluteFile(localFilePath, destSshUrl, sshKey = '') {
        if (!fs.existsSync(localFilePath)) {
            throw new Error(`Local file not found at ${localFilePath}`);
        }
        const params = resolveConnectionParams(destSshUrl, sshKey);
        const remoteFull = params.remotePath;
        const remoteDir = path.posix.dirname(remoteFull);
        const baseName = path.posix.basename(remoteFull);
        const isExecutableHelper = baseName.startsWith('pragma-merge') || baseName.startsWith('pragma-askpass');
        const fileData = fs.readFileSync(localFilePath);

        await this._withConnection(params, 10000, async (entry) => {
            try {
                const sftp = await this._getSftp(entry);
                if (remoteDir && remoteDir !== '/' && remoteDir !== '.') {
                    const dirExists = await new Promise((resolve) => {
                        sftp.stat(remoteDir, (err, st) => {
                            resolve(!err && Boolean(st && typeof st.isDirectory === 'function' && st.isDirectory()));
                        });
                    });
                    if (!dirExists) {
                        await this.execCommand(destSshUrl, `mkdir -p ${shellQuoteSingle(remoteDir)}`, { sshKey, timeoutMs: 10000 });
                    }
                }
                await new Promise((resolve, reject) => {
                    const writeOpts = isExecutableHelper ? { mode: 0o755 } : undefined;
                    sftp.writeFile(remoteFull, fileData, writeOpts, (err) => err ? reject(err) : resolve());
                });
                if (isExecutableHelper) {
                    await new Promise((resolve) => sftp.chmod(remoteFull, 0o755, () => resolve()));
                }
            } catch (sftpErr) {
                const chmodPart = isExecutableHelper ? ` && chmod +x ${shellQuoteSingle(remoteFull)}` : '';
                const res = await this.execCommand(
                    destSshUrl,
                    `mkdir -p ${shellQuoteSingle(remoteDir)} && cat > ${shellQuoteSingle(remoteFull)}${chmodPart}`,
                    { sshKey, input: fileData, timeoutMs: 15000 }
                );
                if (res.exitCode !== 0) {
                    throw new Error(`Failed to upload "${localFilePath}" to "${remoteFull}": ${res.stderr}`);
                }
            }
        });
    }

    /**
     * Lists directory entries on the remote SSH repository via SFTP (or ls -1Ap fallback).
     */
    async listDirectory(sshUrl, relativeSubPath = '', sshKey = '') {
        const params = resolveConnectionParams(sshUrl, sshKey);
        const cleanRel = String(relativeSubPath || '').replace(/^\/+|\/+$/g, '');
        const targetDir = cleanRel
            ? `${params.remotePath.replace(/\/+$/, '')}/${cleanRel}`
            : params.remotePath;

        let entries = [];

        await this._withConnection(params, 8000, async (entry) => {
            try {
                const sftp = await this._getSftp(entry);
                const list = await new Promise((resolve, reject) => {
                    sftp.readdir(targetDir, (err, items) => err ? reject(err) : resolve(items || []));
                });

                for (const item of list) {
                    const name = item.filename;
                    if (!name || name === '.' || name === '..' || name === '.git') continue;
                    const isDirectory = (typeof item.attrs?.isDirectory === 'function')
                        ? item.attrs.isDirectory()
                        : ((item.attrs && (item.attrs.mode & 0o170000) === 0o040000) || (item.longname && item.longname.startsWith('d')));
                    const entryRelPath = cleanRel ? `${cleanRel}/${name}` : name;
                    entries.push({ name, isDirectory: Boolean(isDirectory), relativePath: entryRelPath });
                }
            } catch (sftpErr) {
                const res = await this.execCommand(sshUrl, `cd ${shellQuoteSingle(targetDir)} && ls -1Ap`, { sshKey, timeoutMs: 8000 });
                if (res.exitCode !== 0) {
                    throw new Error(`SSH ERROR in listDirectory (code ${res.exitCode}) for ${params.host}:${params.port}${targetDir}: ${res.stderr}`);
                }
                const lines = res.stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                for (const line of lines) {
                    if (line === '.git/' || line === '.git') continue;
                    const isDirectory = line.endsWith('/');
                    const name = isDirectory ? line.slice(0, -1) : line;
                    if (!name || name === '.' || name === '..') continue;
                    const entryRelPath = cleanRel ? `${cleanRel}/${name}` : name;
                    entries.push({ name, isDirectory, relativePath: entryRelPath });
                }
            }
        });

        entries.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
        return entries;
    }

    /**
     * Tests passwordless SSH public-key login with a fresh connection (4-second timeout).
     * Returns 'STATUS:OK', 'STATUS:KEY_NEEDED', 'STATUS:TIMEOUT', or 'STATUS:ERROR: <reason>'.
     */
    async testLogin(sshUrl, keyPath = '') {
        const raw = parseSshUrlRaw(sshUrl);
        if (!raw.host) {
            return 'STATUS:ERROR: Missing host/server in SSH URL';
        }

        const params = resolveConnectionParams(sshUrl, keyPath);
        if (params.explicitKeyPath && !fs.existsSync(params.explicitKeyPath)) {
            return 'STATUS:KEY_NEEDED';
        }

        const authHandlers = this._buildPublicKeyAuthHandlers(params);
        if (authHandlers.length === 0) {
            return 'STATUS:KEY_NEEDED';
        }

        return await new Promise((resolve) => {
            const client = new Client();
            let settled = false;

            const finish = (statusStr) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                try { client.end(); } catch (e) {}
                try { client.destroy(); } catch (e) {}
                resolve(statusStr);
            };

            const timer = setTimeout(() => {
                finish('STATUS:TIMEOUT');
            }, 4000);
            if (typeof timer.unref === 'function') timer.unref();

            client.once('ready', () => {
                client.exec('echo PRAGMA_SSH_OK', (err, stream) => {
                    if (err) return finish(`STATUS:ERROR: ${err.message}`);
                    let out = '';
                    stream.on('data', (d) => { out += d.toString('utf8'); });
                    stream.stderr.on('data', () => {});
                    stream.on('close', (code) => {
                        if (code === 0 && out.includes('PRAGMA_SSH_OK')) {
                            finish('STATUS:OK');
                        } else {
                            finish(`STATUS:ERROR: Unexpected probe response (code ${code})`);
                        }
                    });
                });
            });

            client.on('error', (err) => {
                if (err && err.level === 'agent') return;
                const code = String(err.code || '').toUpperCase();
                const msg = String(err.message || err);
                const lower = msg.toLowerCase();

                if (err.level === 'client-authentication' || lower.includes('all configured authentication methods failed') || lower.includes('permission denied')) {
                    finish('STATUS:KEY_NEEDED');
                } else if (code === 'ETIMEDOUT' || lower.includes('timed out') || lower.includes('timeout')) {
                    finish('STATUS:TIMEOUT');
                } else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || lower.includes('getaddrinfo') || lower.includes('could not resolve')) {
                    finish(`STATUS:ERROR: Could not resolve hostname (${params.host})`);
                } else if (code === 'ECONNREFUSED' || lower.includes('connection refused')) {
                    finish(`STATUS:ERROR: Connection refused on port ${params.port}`);
                } else {
                    const clean = msg.replace(/[\r\n]+/g, ' ').trim().substring(0, 80);
                    finish(`STATUS:ERROR: ${clean}`);
                }
            });

            try {
                client.connect({
                    host: params.host,
                    port: params.port,
                    username: params.username,
                    readyTimeout: 4000,
                    authHandler: authHandlers
                });
            } catch (e) {
                finish(`STATUS:ERROR: ${String(e.message || e).substring(0, 80)}`);
            }
        });
    }

    /**
     * Generates a local ED25519 SSH key pair in OpenSSH format using pure JavaScript (ssh2).
     */
    generateLocalKeyPair(keyPath) {
        if (!keyPath || typeof keyPath !== 'string' || keyPath.trim().length === 0) {
            throw new Error('Key path cannot be empty');
        }
        let resolvedPath = expandHomePath(keyPath.trim());
        resolvedPath = path.resolve(resolvedPath);
        if (resolvedPath.endsWith('.pub')) {
            resolvedPath = resolvedPath.slice(0, -4);
        }

        if (fs.existsSync(resolvedPath)) {
            throw new Error(`Key already exists at ${resolvedPath}`);
        }

        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        }

        const username = getCurrentUsername();
        const hostname = os.hostname() || 'local';
        const comment = `${username}@${hostname} (pragma-git)`;

        const kp = ssh2Utils.generateKeyPairSync('ed25519', { comment });
        fs.writeFileSync(resolvedPath, kp.private, { encoding: 'utf8', mode: 0o600 });
        fs.writeFileSync(`${resolvedPath}.pub`, kp.public.endsWith('\n') ? kp.public : `${kp.public}\n`, { encoding: 'utf8', mode: 0o644 });

        if (process.platform !== 'win32') {
            try {
                fs.chmodSync(resolvedPath, 0o600);
                fs.chmodSync(`${resolvedPath}.pub`, 0o644);
            } catch (e) {}
        }

        return resolvedPath;
    }

    /**
     * Derives the OpenSSH public key line from an existing private key file using ssh2.
     */
    derivePublicKeyFromPrivate(privateKeyPath) {
        const privContent = fs.readFileSync(privateKeyPath);
        const parsed = ssh2Utils.parseKey(privContent);
        if (parsed instanceof Error) {
            throw parsed;
        }
        const keyObj = Array.isArray(parsed) ? parsed[0] : parsed;
        if (!keyObj || typeof keyObj.getPublicSSH !== 'function') {
            throw new Error(`Unable to derive public key from ${privateKeyPath}`);
        }
        const pubBase64 = keyObj.getPublicSSH().toString('base64');
        const comment = keyObj.comment ? ` ${keyObj.comment}` : '';
        return `${keyObj.type} ${pubBase64}${comment}\n`;
    }

    /**
     * Deploys a local SSH public key to a remote server in a single SSH2 session.
     * Tries existing local keys first, then prompts once for password / keyboard-interactive via askpass.html.
     */
    async deployPublicKey({ username, server, keyPath, passwordProvider }) {
        if (!username || !server) {
            throw new Error('Username and server are required to deploy SSH key');
        }

        const fakeUrl = `ssh://${username}@${server}/`;
        const params = resolveConnectionParams(fakeUrl, '');
        const targetKeyPath = normalizePrivateKeyPath(keyPath) || path.join(getHomeDir(), '.ssh', 'id_ed25519');

        if (!fs.existsSync(targetKeyPath)) {
            this.generateLocalKeyPair(targetKeyPath);
        }
        const pubKeyFile = `${targetKeyPath}.pub`;
        if (!fs.existsSync(pubKeyFile)) {
            const derived = this.derivePublicKeyFromPrivate(targetKeyPath);
            fs.writeFileSync(pubKeyFile, derived, { encoding: 'utf8', mode: 0o644 });
        }

        const pubKeyContent = fs.readFileSync(pubKeyFile, 'utf8').replace(/\r/g, '').trim();
        if (!pubKeyContent) {
            throw new Error(`Public key file is empty: ${pubKeyFile}`);
        }

        const askPwd = typeof passwordProvider === 'function'
            ? passwordProvider
            : (promptStr) => promptViaAskpass(promptStr, 60000);

        const defaultKeyHandlers = this._buildPublicKeyAuthHandlers(params);
        let keyIndex = 0;
        let cachedPassword = null;
        let passwordAttempted = false;
        let kbdAttempted = false;
        let userCancelError = null;

        await new Promise((resolve, reject) => {
            const client = new Client();
            let settled = false;

            const fail = (err) => {
                if (settled) return;
                settled = true;
                try { client.end(); } catch (e) {}
                try { client.destroy(); } catch (e) {}
                reject(userCancelError || err);
            };

            client.once('ready', () => {
                const remoteAuthKeys = process.env.PRAGMA_REMOTE_AUTHORIZED_KEYS || '~/.ssh/authorized_keys';
                const installScript = remoteAuthKeys === '~/.ssh/authorized_keys'
                    ? `mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && PUB=$(tr -d '\\r') && (grep -qxF "$PUB" ~/.ssh/authorized_keys || printf '%s\\n' "$PUB" >> ~/.ssh/authorized_keys)`
                    : `AUTH_FILE=${shellQuoteSingle(remoteAuthKeys)}; mkdir -p "$(dirname "$AUTH_FILE")" && touch "$AUTH_FILE" && chmod 600 "$AUTH_FILE" && PUB=$(tr -d '\\r') && (grep -qxF "$PUB" "$AUTH_FILE" || printf '%s\\n' "$PUB" >> "$AUTH_FILE")`;

                client.exec(installScript, (err, stream) => {
                    if (err) return fail(err);
                    let errOut = '';
                    stream.on('data', () => {});
                    stream.stderr.on('data', (d) => { errOut += d.toString('utf8'); });
                    stream.on('close', (code) => {
                        settled = true;
                        try { client.end(); } catch (e) {}
                        if (code === 0) {
                            this.evictHost(params.host, params.port, params.username);
                            resolve(true);
                        } else {
                            reject(new Error(`Failed to install public key on remote host (exit ${code}): ${errOut.trim()}`));
                        }
                    });
                    stream.end(`${pubKeyContent}\n`);
                });
            });

            client.on('error', (err) => {
                if (err && err.level === 'agent') return;
                fail(err);
            });

            client.connect({
                host: params.host,
                port: params.port,
                username: params.username,
                readyTimeout: 15000,
                tryKeyboard: true,
                authHandler: (methodsLeft, partialSuccess, callback) => {
                    // 1. Try any pre-existing local keys first (zero password prompt if another key already works)
                    if (keyIndex < defaultKeyHandlers.length && (!methodsLeft || methodsLeft.includes('publickey') || methodsLeft.includes('agent'))) {
                        const nextKey = defaultKeyHandlers[keyIndex++];
                        return callback(nextKey);
                    }

                    // 2. Fall back to password authentication
                    if (!passwordAttempted && (!methodsLeft || methodsLeft.includes('password'))) {
                        passwordAttempted = true;
                        Promise.resolve(cachedPassword !== null ? cachedPassword : askPwd(`${params.username}@${params.host}'s password: `))
                            .then((pwd) => {
                                cachedPassword = pwd;
                                callback({ type: 'password', username: params.username, password: pwd });
                            })
                            .catch((e) => {
                                userCancelError = e;
                                callback(false);
                            });
                        return;
                    }

                    // 3. Fall back to keyboard-interactive (PAM / ChallengeResponseAuthentication)
                    if (!kbdAttempted && (!methodsLeft || methodsLeft.includes('keyboard-interactive'))) {
                        kbdAttempted = true;
                        return callback({
                            type: 'keyboard-interactive',
                            username: params.username,
                            prompt: (name, instructions, lang, prompts, finish) => {
                                if (!prompts || prompts.length === 0) return finish([]);
                                Promise.resolve(cachedPassword !== null ? cachedPassword : askPwd(`${params.username}@${params.host}'s password: `))
                                    .then((pwd) => {
                                        cachedPassword = pwd;
                                        finish(prompts.map(() => pwd));
                                    })
                                    .catch((e) => {
                                        userCancelError = e;
                                        finish([]);
                                    });
                            }
                        });
                    }

                    callback(false);
                }
            });
        });

        return targetKeyPath;
    }

    /**
     * Closes a remote pragma-merge session on the SSH server and cleans up signal files.
     */
    async closeRemotePragmaMerge(sshUrl, sessionId = '', sshKey = '') {
        const signalDir = getSignalDir();
        let exitCode = '0';
        try {
            const sessionExit = sessionId ? path.join(signalDir, 'sessions', sessionId, 'exit-pragma-merge') : '';
            const legacyExit = path.join(signalDir, 'exit-pragma-merge');
            if (sessionExit && fs.existsSync(sessionExit)) {
                exitCode = fs.readFileSync(sessionExit, 'utf8').trim() || '0';
            } else if (fs.existsSync(legacyExit)) {
                exitCode = fs.readFileSync(legacyExit, 'utf8').trim() || '0';
            }
            if (fs.existsSync(legacyExit)) {
                fs.unlinkSync(legacyExit);
            }
        } catch (e) {}

        const safeExit = parseInt(exitCode, 10) || 0;
        const remoteScript = [
            `TMP="$HOME/.Pragma-git/.tmp"`,
            `mkdir -p "$TMP"`,
            `echo ${safeExit} > "$TMP/exit-pragma-merge"`,
            `for sdir in "$TMP/sessions"/session_*; do`,
            `  if [ -d "$sdir" ] && [ -f "$sdir/pragma-merge-running-ssh" ]; then`,
            `    echo ${safeExit} > "$sdir/exit-pragma-merge"`,
            `    rm -f "$sdir/pragma-merge-running-ssh"`,
            `  fi`,
            `done`,
            `rm -f "$TMP/pragma-merge-running-ssh" '/tmp/git_diff_file_list.txt'`
        ].join('; ');

        await this.execCommand(sshUrl, remoteScript, { sshKey, timeoutMs: 10000 });
    }

    /**
     * Downloads remote difftool/mergetool temp files and triggers a local Pragma-Merge GUI session.
     */
    async _handleRemoteMergeTrigger(sshUrl, params, sshKey = '') {
        const listRes = await this.execCommand(
            sshUrl,
            `cat '/tmp/git_diff_file_list.txt' 2>/dev/null; rm -f '/tmp/git_diff_file_list.txt'`,
            { sshKey, timeoutMs: 8000 }
        );
        const rawLine = listRes.stdout.trim();
        if (!rawLine) return;

        const remoteLocations = parseRemoteDiffFileList(rawLine);
        const localBase = getLocalSshTempLocation();
        fs.mkdirSync(localBase, { recursive: true });

        const localPositions = [];
        for (const remoteVar of remoteLocations) {
            if (!remoteVar) {
                localPositions.push('');
                continue;
            }
            let remoteFull = '';
            let localFull = '';
            if (remoteVar.startsWith('/')) {
                remoteFull = remoteVar;
                localFull = path.join(localBase, ...remoteVar.replace(/^\/+/, '').split('/'));
            } else {
                remoteFull = `${params.remotePath.replace(/\/+$/, '')}/${remoteVar}`;
                localFull = path.join(localBase, ...remoteVar.split('/'));
            }
            fs.mkdirSync(path.dirname(localFull), { recursive: true });
            const fileRes = await this.execCommand(sshUrl, `cat ${shellQuoteSingle(remoteFull)}`, { sshKey, timeoutMs: 15000 });
            fs.writeFileSync(localFull, fileRes.stdoutBuffer);
            localPositions.push(localFull);
        }

        // Write local session directory so Pragma-git's chokidar merge_watcher opens pragma-merge
        const signalDir = getSignalDir();
        const sessionId = `session_${process.pid}_${Date.now()}`;
        const sessionDir = path.join(signalDir, 'sessions', sessionId);
        fs.mkdirSync(sessionDir, { recursive: true });

        const [p1 = '', p2 = '', p3 = '', p4 = ''] = localPositions;
        fs.writeFileSync(path.join(signalDir, 'first'), p1, 'utf8');
        fs.writeFileSync(path.join(signalDir, 'second'), p2, 'utf8');
        fs.writeFileSync(path.join(signalDir, 'third'), p3, 'utf8');
        fs.writeFileSync(path.join(signalDir, 'fourth'), p4, 'utf8');

        fs.writeFileSync(path.join(sessionDir, 'first'), p1, 'utf8');
        fs.writeFileSync(path.join(sessionDir, 'second'), p2, 'utf8');
        fs.writeFileSync(path.join(sessionDir, 'third'), p3, 'utf8');
        fs.writeFileSync(path.join(sessionDir, 'fourth'), p4, 'utf8');
        fs.writeFileSync(path.join(sessionDir, 'session_id'), sessionId, 'utf8');
        fs.writeFileSync(path.join(signalDir, 'last_session_id'), sessionId, 'utf8');
        fs.writeFileSync(path.join(sessionDir, 'pragma-merge-running'), String(process.pid), 'utf8');
    }

    /**
     * Relays a remote GIT_ASKPASS prompt (e.g. HTTPS push/fetch on the SSH server) to local askpass.html.
     */
    async _handleRemoteAskpassTrigger(sshUrl, sshKey = '', shouldAbort = null) {
        const promptRes = await this.execCommand(
            sshUrl,
            `cat "$HOME/.Pragma-git/.tmp/askpass_first-ssh" 2>/dev/null`,
            { sshKey, timeoutMs: 5000 }
        );
        const promptText = promptRes.stdout || 'Password: ';

        let exitCode = 0;
        let secret = '';
        try {
            secret = await promptViaAskpass(promptText, 120000, shouldAbort);
        } catch (err) {
            exitCode = 1;
            secret = '';
        }

        if (typeof shouldAbort === 'function' && shouldAbort()) {
            return;
        }

        await this.execCommand(
            sshUrl,
            `cat > "$HOME/.Pragma-git/.tmp/exit-message-pragma-askpass-ssh" && echo ${exitCode} > "$HOME/.Pragma-git/.tmp/exit-pragma-askpass-ssh" && rm -f "$HOME/.Pragma-git/.tmp/pragma-askpass-running-ssh"`,
            { sshKey, input: Buffer.from(secret, 'utf8'), timeoutMs: 8000 }
        );
    }

    /**
     * Executes a Git CLI command on the remote SSH repository for simple-git.
     * Returns { stdOut: Buffer[], stdErr: Buffer[], exitCode: number, rejection: Error|undefined }.
     */
    async execGit(sshUrl, rawArgs, options = {}) {
        let resolvedUrl = sshUrl || '';
        let resolvedKey = options.sshKey || '';
        let isPiped = false;
        const filteredArgs = [];

        for (let i = 0; i < rawArgs.length; i++) {
            const arg = String(rawArgs[i]);
            const next = i + 1 < rawArgs.length ? String(rawArgs[i + 1]) : '';
            if (arg === '-c' && next.startsWith('SSHURL=')) {
                resolvedUrl = next.slice('SSHURL='.length);
                i++;
            } else if (arg === '-c' && next.startsWith('SSHKEY=')) {
                resolvedKey = next.slice('SSHKEY='.length);
                i++;
            } else if (arg === '-PIPED') {
                isPiped = true;
            } else {
                filteredArgs.push(arg);
            }
        }

        if (!resolvedKey && options.env && options.env.PRAGMA_SSH_KEY) {
            resolvedKey = options.env.PRAGMA_SSH_KEY;
        }

        const params = resolveConnectionParams(resolvedUrl, resolvedKey);
        const isMergeOrDiff = filteredArgs.includes('difftool') || filteredArgs.includes('mergetool');
        const quotedGitArgs = filteredArgs.map((a) => {
            if (a.startsWith('include.path=$HOME/')) {
                const rest = a.slice('include.path=$HOME/'.length);
                return `'include.path='"$HOME"/${shellQuoteSingle(rest)}`;
            }
            return shellQuoteSingle(a);
        }).join(' ');
        const gitCmd = `git -c safe.directory='*' -C ${shellQuoteSingle(params.remotePath)} ${quotedGitArgs}`;

        if (isMergeOrDiff) {
            const repoRoot = path.resolve(__dirname, '..');
            const localPragmaMerge = path.join(repoRoot, 'pragma-merge');
            if (fs.existsSync(localPragmaMerge)) {
                try {
                    const pragmaMergeData = fs.readFileSync(localPragmaMerge);
                    await this.execCommand(
                        resolvedUrl,
                        `mkdir -p "$HOME/.Pragma-git" && cat > "$HOME/.Pragma-git/pragma-merge" && chmod +x "$HOME/.Pragma-git/pragma-merge" && rm -f '/tmp/git_diff_file_list.txt' "$HOME/.Pragma-git/.tmp/pragma-merge-running-ssh" "$HOME/.Pragma-git/.tmp/pragma-askpass-running-ssh"`,
                        { sshKey: resolvedKey, input: pragmaMergeData, timeoutMs: 10000 }
                    );
                } catch (e) {}
            }
        }

        const remoteFullCmd = isPiped
            ? `export GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=true GCM_INTERACTIVE=never; ${gitCmd}`
            : `rm -f "$HOME/.Pragma-git/.tmp/pragma-askpass-running-ssh"; export GIT_ASKPASS="$HOME/.Pragma-git/pragma-askpass-ssh"; ${gitCmd}`;

        let finished = false;
        let mergeHandled = false;
        let pollPromise = null;

        // Monitor remote interactive signals (difftool/mergetool or GIT_ASKPASS) if command stays open > 200ms
        const pollTimer = setTimeout(() => {
            if (finished) return;
            pollPromise = (async () => {
                while (!finished) {
                    try {
                        if (isMergeOrDiff && !mergeHandled) {
                            const mCheck = await this.execCommand(
                                resolvedUrl,
                                `test -f "$HOME/.Pragma-git/.tmp/pragma-merge-running-ssh" -a -f '/tmp/git_diff_file_list.txt'`,
                                { sshKey: resolvedKey, timeoutMs: 4000 }
                            );
                            if (!finished && mCheck.exitCode === 0) {
                                mergeHandled = true;
                                await this._handleRemoteMergeTrigger(resolvedUrl, params, resolvedKey);
                            }
                        }

                        if (!finished) {
                            const aCheck = await this.execCommand(
                                resolvedUrl,
                                `test -f "$HOME/.Pragma-git/.tmp/pragma-askpass-running-ssh"`,
                                { sshKey: resolvedKey, timeoutMs: 4000 }
                            );
                            if (!finished && aCheck.exitCode === 0) {
                                await this._handleRemoteAskpassTrigger(resolvedUrl, resolvedKey, () => finished);
                            }
                        }
                    } catch (e) {}

                    if (!finished) {
                        await new Promise(r => setTimeout(r, 400));
                    }
                }
            })();
        }, 200);
        if (typeof pollTimer.unref === 'function') pollTimer.unref();

        try {
            const res = await this.execCommand(resolvedUrl, remoteFullCmd, {
                sshKey: resolvedKey,
                input: options.input,
                timeoutMs: options.timeoutMs,
                onStdout: options.onStdout,
                onStderr: options.onStderr
            });
            finished = true;
            clearTimeout(pollTimer);
            if (pollPromise) {
                try { await pollPromise; } catch (e) {}
            }
            return {
                stdOut: res.stdOut,
                stdErr: res.stdErr,
                exitCode: res.exitCode,
                rejection: undefined
            };
        } catch (err) {
            finished = true;
            clearTimeout(pollTimer);
            return {
                stdOut: [],
                stdErr: [Buffer.from(String(err.message || err), 'utf8')],
                exitCode: 255,
                rejection: err
            };
        }
    }
}

function getSshConnectionPool() {
    if (typeof global !== 'undefined') {
        if (!global.__pragmaSshPool) {
            global.__pragmaSshPool = new SshConnectionPool();
        }
        return global.__pragmaSshPool;
    }
    return new SshConnectionPool();
}

module.exports = {
    SshConnectionPool,
    getSshConnectionPool,
    parseSshUrlRaw,
    resolveConnectionParams,
    parseRemoteDiffFileList,
    getHomeDir,
    getSignalDir,
    getLocalSshTempLocation
};
