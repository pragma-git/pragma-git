/**
Base class and provider selector for github, gitlab, bitbucket etc API calls

Example use (automatic provider selection):
    const General_git_rest_api = require('apis_github_and_others/general_git_rest_api.js');

    let provider = new General_git_rest_api(giturl, username, TOKEN);
    await provider.initialize();
    let ci = await provider.getValue('ci-status', commitSha);
**/

const fs = require('fs');
const path = require('path');

class git_rest_api {

    // Cache of host -> provider script filename (e.g. { 'git.company.se': 'gitlab.com.js' })
    static hostProviderCache = {};
    #delegate = null;

    // Constructor
    constructor( giturl, username, TOKEN) {
        this.giturl = giturl;
        
        this.username = username;
        if (username == undefined){ 
            this.username = '';
        }
        
        this.TOKEN = TOKEN;

        // When invoked directly as 'new General_git_rest_api(giturl, ...)' (not via super() from a subclass):
        // If the provider can be identified immediately (from URL or host cache), return the subclass instance right away.
        // Otherwise, keep this base instance and auto-detect the server asynchronously inside initialize() / getValue().
        if (new.target === git_rest_api && giturl) {
            let scriptFile = git_rest_api.findProviderScript(giturl);
            if (scriptFile) {
                let ProviderClass = require(path.join(__dirname, scriptFile));
                return new ProviderClass(giturl, username, TOKEN);
            }
        }
    }   

    //
    // Static provider detection & selection methods
    //

        static #parseUrl(giturl) {
            if (!giturl || typeof giturl !== 'string') return null;
            let clean = giturl.trim();
            // Support scp-style SSH URLs (e.g. git@gitlab.example.com:group/repo.git)
            let stripped = clean.replace(/^ssh:\/\//, '');
            if (stripped.startsWith('git@')) {
                let afterAt = stripped.substring(4);
                let colonIdx = afterAt.indexOf(':');
                let slashIdx = afterAt.indexOf('/');
                if (colonIdx !== -1 && (slashIdx === -1 || colonIdx < slashIdx)) {
                    let host = afterAt.substring(0, colonIdx);
                    let p = afterAt.substring(colonIdx + 1);
                    clean = `https://${host}/${p}`;
                } else if (slashIdx !== -1) {
                    clean = `https://${afterAt}`;
                }
            }
            try {
                return new URL(clean);
            } catch (e) {
                return null;
            }
        }

        static findProviderScript(giturl) {
            // Synchronously determines provider script ('github.com.js', 'gitlab.com.js', 'bitbucket.org.js')
            // using: 1) cached host detection, 2) exact script match, 3) hostname/path heuristics.
            let urlParts = git_rest_api.#parseUrl(giturl);
            if (!urlParts) return null;

            let host = urlParts.host.toLowerCase();
            let hostname = urlParts.hostname.toLowerCase();
            let pathname = urlParts.pathname || '';

            // 1. Check cached detection result for this host
            if (git_rest_api.hostProviderCache[host]) {
                return git_rest_api.hostProviderCache[host];
            }
            if (git_rest_api.hostProviderCache[hostname]) {
                return git_rest_api.hostProviderCache[hostname];
            }

            // 2. Direct script file match in apis_github_and_others/ (github.com.js, gitlab.com.js, bitbucket.org.js)
            let exactScript = `${hostname}.js`;
            if (fs.existsSync(path.join(__dirname, exactScript))) {
                return exactScript;
            }

            // 3. Hostname substring heuristics (self-hosted instances with provider name in domain)
            if (hostname.includes('gitlab')) {
                return 'gitlab.com.js';
            }
            if (hostname.includes('github')) {
                return 'github.com.js';
            }
            if (hostname.includes('bitbucket')) {
                return 'bitbucket.org.js';
            }

            // 4. URL path structure heuristics
            // Bitbucket Server / Data Center uses /scm/<project>/<repo>.git
            if (pathname.includes('/scm/')) {
                return 'bitbucket.org.js';
            }
            // GitLab uses /-/ in web routes and supports nested subgroups (3+ path segments: /group/subgroup/repo.git),
            // whereas GitHub and Bitbucket Cloud only use 2 segments (/owner/repo.git)
            if (pathname.includes('/-/')) {
                return 'gitlab.com.js';
            }
            let segments = pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '').split('/').filter(Boolean);
            if (segments.length >= 3) {
                return 'gitlab.com.js';
            }

            return null;
        }

        static async detectProvider(giturl, timeoutMs = 4000) {
            // Asynchronously identifies the provider for giturl.
            // If URL heuristics or cache already know the provider, returns immediately (0 network calls).
            // Otherwise probes the server over HTTP/HTTPS for GitLab, GitHub Enterprise, or Bitbucket signatures
            // and caches the result for the host so subsequent 'new General_git_rest_api(giturl)' calls work synchronously.
            let known = git_rest_api.findProviderScript(giturl);
            if (known) {
                return known;
            }

            let urlParts = git_rest_api.#parseUrl(giturl);
            if (!urlParts) return null;

            let host = urlParts.host.toLowerCase();
            let origin = `${urlParts.protocol}//${urlParts.host}`;

            let fetchWithTimeout = async (url) => {
                let controller = new AbortController();
                let timer = setTimeout(() => controller.abort(), timeoutMs);
                try {
                    return await fetch(url, {
                        method: 'GET',
                        redirect: 'manual',
                        headers: { 'Accept': 'application/json, text/html' },
                        signal: controller.signal
                    });
                } finally {
                    clearTimeout(timer);
                }
            };

            let hasHeader = (res, prefixOrName) => {
                if (!res || !res.headers || typeof res.headers.forEach !== 'function') return false;
                let target = prefixOrName.toLowerCase();
                let matched = false;
                res.headers.forEach((val, key) => {
                    let k = key.toLowerCase();
                    let v = String(val || '').toLowerCase();
                    if (k === target || k.startsWith(target) || (k === 'set-cookie' && v.includes(target))) {
                        matched = true;
                    }
                });
                return matched;
            };

            // Probe 1: GitLab REST API (/api/v4/version or /api/v4/projects)
            // Even without a token, self-hosted GitLab responds on /api/v4/version with 401 {"message":"401 Unauthorized"}
            // or 200 {"version":...}, and often includes x-gitlab-* headers or _gitlab_session cookie.
            try {
                let res = await fetchWithTimeout(`${origin}/api/v4/version`);
                if (hasHeader(res, 'x-gitlab') || hasHeader(res, '_gitlab_session')) {
                    git_rest_api.hostProviderCache[host] = 'gitlab.com.js';
                    return 'gitlab.com.js';
                }
                let contentType = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
                if (contentType.includes('json')) {
                    let body = await res.json();
                    if (body && (body.version || body.revision || body.message === '401 Unauthorized')) {
                        git_rest_api.hostProviderCache[host] = 'gitlab.com.js';
                        return 'gitlab.com.js';
                    }
                }
            } catch (e) {}

            // Probe 2: GitLab web manifest / sign-in page (/-/manifest.json or /users/sign_in)
            try {
                let res = await fetchWithTimeout(`${origin}/-/manifest.json`);
                if (hasHeader(res, 'x-gitlab') || hasHeader(res, '_gitlab_session')) {
                    git_rest_api.hostProviderCache[host] = 'gitlab.com.js';
                    return 'gitlab.com.js';
                }
                if (res.ok) {
                    let text = await res.text();
                    if (/gitlab/i.test(text)) {
                        git_rest_api.hostProviderCache[host] = 'gitlab.com.js';
                        return 'gitlab.com.js';
                    }
                }
            } catch (e) {}

            // Probe 3: GitHub Enterprise (/api/v3/meta or X-GitHub-* headers)
            try {
                let res = await fetchWithTimeout(`${origin}/api/v3/meta`);
                if (hasHeader(res, 'x-github')) {
                    git_rest_api.hostProviderCache[host] = 'github.com.js';
                    return 'github.com.js';
                }
                let contentType = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
                if (contentType.includes('json')) {
                    let body = await res.json();
                    if (body && (body.verifiable_password_authentication !== undefined || body.installed_version !== undefined)) {
                        git_rest_api.hostProviderCache[host] = 'github.com.js';
                        return 'github.com.js';
                    }
                }
            } catch (e) {}

            // Probe 4: Bitbucket Server / Data Center (/rest/api/1.0/application-properties or /status)
            try {
                let res = await fetchWithTimeout(`${origin}/status`);
                if (res.ok) {
                    let text = await res.text();
                    if (text.includes('RUNNING') || /bitbucket/i.test(text)) {
                        git_rest_api.hostProviderCache[host] = 'bitbucket.org.js';
                        return 'bitbucket.org.js';
                    }
                }
            } catch (e) {}

            return null;
        }

    // Public methods
        async #resolveDelegate() {
            if (!this.#delegate) {
                let scriptFile = await git_rest_api.detectProvider(this.giturl);
                if (!scriptFile) {
                    throw new Error(`gitProvider error: unknown provider for URL '${this.giturl}'`);
                }
                let ProviderClass = require(path.join(__dirname, scriptFile));
                this.#delegate = new ProviderClass(this.giturl, this.username, this.TOKEN);
            }
            return this.#delegate;
        }

        async initialize(){
            // If this is a base instance for an initially unknown custom domain, auto-detect and initialize the real provider
            if (this.constructor === git_rest_api && this.giturl) {
                let delegate = await this.#resolveDelegate();
                await delegate.initialize();
                this.apiurl = delegate.apiurl;
                this.repoInfoStruct = delegate.repoInfoStruct;
            }
        }

        async getValue(parameterName, secondParameter, thirdParameter) {
            let delegate = await this.#resolveDelegate();
            return await delegate.getValue(parameterName, secondParameter, thirdParameter);
        }

        async setValue(parameterName, value) {
            let delegate = await this.#resolveDelegate();
            return await delegate.setValue(parameterName, value);
        }

        async createRepo(owner, token, newRepoName, description, isPrivate, projectKey) {
            let delegate = await this.#resolveDelegate();
            return await delegate.createRepo(owner, token, newRepoName, description, isPrivate, projectKey);
        }
    
        async fetchWithApi( apiurl, options){
            
            let response = { ok: false, status: '', json: ''}; // Default

            // Fetch
            let json;  // Undefined if fetch fails
            try {
                response = await fetch( apiurl, options);
                
                if (!response.ok) {
                  throw new Error(`GitHub API error: ${response.statusText}`);
                }
            
                json = await response.json();
                console.log('Repository Information:', json);
            } catch (error) {
                console.error('Error fetching repository info:', error.message);
            }

            console.log(response);
            return { 
                ok: response.ok, 
                status: response.status,
                json: json
            }
        }
        isEmptyString( str) { 
            // True if string is: '', contains only spaces, undefined, or null
            // False is string contains non-empty characters
            if (str === undefined || str === "" | str === null ) {
                return true;
            }
            if (str.trim() === ''){
              return true;
            }
            return false;
        }
}

module.exports = git_rest_api;
