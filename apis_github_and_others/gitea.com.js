/**
 
Gitea specific code 
 
Example use :

    a = require('apis_github_and_others/gitea.com.js');
    
    b = await new a('https://gitea.com/gitea/tea.git');
    await b.initialize();
    c = await b.getValue('is-private-repo');

**/

// Parent class
let General_git_rest_api = require('apis_github_and_others/general_git_rest_api.js');

class gitea extends General_git_rest_api {

    constructor( giturl, username, TOKEN) {
        super( giturl, username, TOKEN ); // Sets properties : this.giturl, this.TOKEN
        this.apiurl = this.#apiUrl( giturl);  // Call provider-specific translation from git-url to api-url
    }

    //
    // Define provider-specific methods (ADAPT THESE FOR NEW PROVIDER)
    //

        async initialize(){
            this.apiurl = this.#apiUrl( this.giturl);
            global.log(`Gitea API URL = ${this.apiurl} `);

            try{
                this.repoInfoStruct = await this.#fetchThroughAPI();    // Refresh this.repoInfoStruct
                global.log('Gitea API call : '); // Log to main console
                global.log(this.repoInfoStruct);  // Log to main console
            }catch (err){
                global.log(this.repoInfoStruct);  // Log to main console
            }
        }

        #apiUrl( giturl){               // Transform GIT-URL to PROVIDER-API-URL
            // API URL by transforming
            //  https://gitea.com/gitea/tea.git  ->
            //  https://gitea.com/api/v1/repos/gitea/tea

            // --- Provider-specific code :

                let urlParts = new URL(giturl);
                let host = urlParts.host;
                let apiHost = `${host}/api/v1/repos`;
                let url = giturl.replace(/\.git$/, '').replace(host, apiHost);

                // Clean URL, if REST URL contains login info (not permitted)
                if (url.includes('@') ){
                    let cleanParts = new URL(url);
                    url = cleanParts.origin + cleanParts.pathname;
                }

            // --- End Provider-specific code

            return url;
        }

        async createRepo( owner, token, newRepoName, description, isPrivate ){  // Create Gitea repository
            let ok = false;
            let origin = 'https://gitea.com';
            try {
                if (this.giturl) {
                    origin = new URL(this.giturl).origin;
                }
            } catch (e) {}

            let giturl = `${origin}/${owner}/${newRepoName}.git`;

            try {
                const res = await fetch( `${origin}/api/v1/user/repos`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `token ${token}`
                    },
                    body: JSON.stringify({
                        name: newRepoName,
                        description: description,
                        private: isPrivate
                    })
                });

                await res.json();
                ok = res.ok;
                console.log(`[${ok}]  (status = ${res.status}) `);
            } catch (error) {
                console.log(error);
            }

            return { ok: ok, giturl: giturl };
        }

        async #fetchThroughAPI(){       // Fetch repo info struct through API
            this.options = {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `token ${this.TOKEN}`
                },
            };

            // Remove options for unknown TOKEN
            if ( super.isEmptyString( this.TOKEN) ) {
                delete this.options.headers.Authorization;
            }

            // Fetch through API into class variable
            this.repoInfoStruct = await super.fetchWithApi( this.apiurl, this.options);

            return this.repoInfoStruct;
        }

        async getValue( parameterName, secondParameter){  // Get provider-specific parameter
            global.log(`getValue('${parameterName}')`);
            let out;

            // Provider-specific code

                switch (parameterName) {
                    //
                    // Static methods, NOT requiring initialize() call
                    //
                    case 'provider-name': {  // Template replacement name used in create_remote_repository.html ('Gitea')
                        out = 'Gitea';
                        break;
                    }
                    case 'display-name': {  // UI button label ('Gitea')
                        out = 'Gitea';
                        break;
                    }
                    case 'create-repo-labels': {  // Labels and external links for create_remote_repository.html
                        out = {
                            accountPreText: 'Gitea username (',
                            accountPostText: ')',
                            accountLinkText: 'Register Gitea account',
                            accountLinkUrl: 'https://gitea.com/user/sign_up',
                            tokenPreText: 'Token (',
                            tokenPostText: ')',
                            tokenLinkText: 'Create access token',
                            tokenLinkUrl: 'https://gitea.com/user/settings/applications'
                        };
                        break;
                    }
                    case 'git-username': {  // Returns default username (not requiring json)
                        try{
                            let urlParts = new URL( this.giturl);
                            let pathname = urlParts.pathname;
                            out = pathname.split('/')[1];
                        }catch (err){ global.warn(err);}
                        break;
                    }
                    case 'icon': {  // Returns icon (not requiring json)
                        try{
                            if (secondParameter == 'darkmode'){
                                out = 'apis_github_and_others/git-provider-icons/Gitea/gitea.png';
                            }
                            if (secondParameter == 'lightmode'){
                                out = 'apis_github_and_others/git-provider-icons/Gitea/gitea.png';
                            }
                        }catch (err){ global.warn(err);}
                        break;
                    }
                    case 'web-url': {  // Returns web page url
                        try{
                            out = this.giturl;
                            if (this.giturl.endsWith('.git') ){
                                out = this.giturl.substring(0, this.giturl.indexOf('.git'));
                            }
                        }catch (err){ global.warn(err);}
                        break;
                    }
                    //
                    // Dynamic methods, requiring initialize() call
                    //
                    case 'api-url': {  // Returns REST API url
                        try{
                            out = this.apiurl;
                        }catch (err){ global.warn(err);}
                        break;
                    }
                    case 'api-status': {  // Returns status of provider API call
                        try{
                            out = this.repoInfoStruct.ok ? 'ok' : 'fail';
                        }catch (err){ global.warn(err);}
                        break;
                    }
                    case 'fork-parent': {  // Returns URL from which current repo was forked
                        try{
                            out = this.repoInfoStruct.json.parent.clone_url;
                        }catch (err){ global.warn(err);}
                        break;
                    }
                    case 'is-private-repo': {  // Returns true, false
                        try{
                            out = this.repoInfoStruct.json.private;
                        }catch (err){ global.warn(err);}
                        break;
                    }
                    case 'ci-status': {  // Returns { status: 'success'|'failure'|'pending'|'none', url: string|null }
                        try{
                            let commitSha = secondParameter;
                            if (!commitSha) {
                                out = { status: 'none', url: null };
                                break;
                            }
                            let headers = {
                                'Accept': 'application/json'
                            };
                            if (!super.isEmptyString(this.TOKEN)) {
                                headers['Authorization'] = `token ${this.TOKEN}`;
                            }
                            let statusUrl = `${this.apiurl}/commits/${commitSha}/status`;
                            let statusRes = await this.fetchWithApi(statusUrl, { method: 'GET', headers: headers });

                            let resolveTargetUrl = (rawUrl) => {
                                if (!rawUrl) return null;
                                if (rawUrl.startsWith('/')) {
                                    try {
                                        let origin = new URL(this.giturl).origin;
                                        return `${origin}${rawUrl}`;
                                    } catch (e) {}
                                }
                                return rawUrl;
                            };

                            if (statusRes.ok && statusRes.json) {
                                let statuses = Array.isArray(statusRes.json.statuses) ? statusRes.json.statuses : [];
                                let totalCount = typeof statusRes.json.total_count === 'number'
                                    ? statusRes.json.total_count
                                    : statuses.length;

                                if (totalCount > 0 && statuses.length > 0) {
                                    let state = statusRes.json.state; // 'success', 'failure', 'error', 'pending', 'warning'
                                    let failItem = statuses.find(s => (s.status || s.state) === 'failure' || (s.status || s.state) === 'error');
                                    let pendingItem = statuses.find(s => (s.status || s.state) === 'pending');
                                    let chosenItem = failItem || pendingItem || statuses[0];
                                    let targetUrl = resolveTargetUrl(chosenItem && chosenItem.target_url);

                                    if (state === 'failure' || state === 'error' || failItem) {
                                        out = { status: 'failure', url: targetUrl };
                                    } else if (state === 'pending' || pendingItem) {
                                        out = { status: 'pending', url: targetUrl };
                                    } else {
                                        out = { status: 'success', url: targetUrl };
                                    }
                                } else {
                                    out = { status: 'none', url: null };
                                }
                            } else {
                                throw new Error(`Gitea commit status API error (${statusRes.status || 'unknown'})`);
                            }
                        }catch (err){
                            global.warn(err);
                            throw err;
                        }
                        break;
                    }
                    default: {
                        throw new Error(`getInfoValue error: 'unknown parameterName'`);
                    }
                }
            // --- End Provider-specific code

                global.log(`getValue('${parameterName}') = ${out} `);
                return out;
        }

        async setValue( parameterName, value){
            let out;
            switch (parameterName) {
                case 'set-star': {
                    break;
                }
                default: {
                    throw new Error(`setValue error: 'unknown parameterName'`);
                }
            }
            return out;
        }
}

module.exports = gitea;
