/**
 
Github specific code 
 
Example use :

    a= require('apis_github_and_others/github.com.js');
    
    b = await new a('https://github.com/JanAxelsson/Spoon-Knife.git');
    await b.initialize();
    c = await b.getValue('fork-parent');

**/

// Parent class
let  General_git_rest_api = require('apis_github_and_others/general_git_rest_api.js');

class github extends General_git_rest_api {
    

    constructor( giturl, username, TOKEN) {
        super( giturl, username, TOKEN ) // Sets properties : this.giturl,  this.TOKEN
        this.apiurl = this.#apiUrl( giturl);  // Call provider-specific translation from git-url to api-url

    }

    //
    // Define provider-specific methods (ADAPT THESE FOR NEW PROVIDER)
    //
    
        async initialize(){
            
            this.apiurl = this.#apiUrl( this.giturl);  // Call provider-specific translation from git-url to api-url
            global.log(`Github API URL = ${this.apiurl} `); 
            
             try{
                this.repoInfoStruct = await this.#fetchThroughAPI();    // Refresh this.repoInfoStruct
                global.log('Github API call : '); // Log to main console
                global.log(this.repoInfoStruct);  // Log to main console
            }catch (err){
                global.log(this.repoInfoStruct);  // Log to main console
            }

        }
        #apiUrl( giturl){               // Transform GIT-URL to PROVIDER-API-URL (Github etc)
            // API URL by transforming
            //  https://  github.com  /JanAxelsson/imlook4d   .git  -> 
            //  https://  api.github.com/repos  /JanAxelsson/imlook4d
            
            // --- Provider-specific code :
                
                // Standard github.com uses api.github.com/repos; GitHub Enterprise uses <host>/api/v3/repos
                let urlParts = new URL(giturl);
                let host = urlParts.host;
                let apiHost = (host.toLowerCase() === 'github.com') ? 'api.github.com/repos' : `${host}/api/v3/repos`;
                let url = giturl.replace( '.git', '').replace( host, apiHost);        
                
                // Clean URL, if REST URL contains login info (not permitted)
                if (url.includes('@') ){
                    // 'https://abc:dev@api.github.com/repos/pragma-git/git-scm' -> 'https://api.github.com/repos/pragma-git/git-scm'
                    let urlParts = new URL(url);
                    url = urlParts.origin + urlParts.pathname; 
                }
            
            // --- End Provider-specific code  
            
            return url;
        }     
        async createRepo( owner, token, newRepoName, description, isPrivate ){  // Create Github repository

            let ok = false;
            let giturl = `https://github.com/${owner}/${newRepoName}.git`;
            
            try {
                // Create
                const res = await fetch( 'https://api.github.com/user/repos', {
                    method: 'POST',
                    headers: {  'Authorization' : `token ${token}` },
                    body: JSON.stringify({
                        name: newRepoName,
                        description: description,
                        private: isPrivate
                    })
                })
                
                // Check result
                const json = await res.json();
                ok = res.ok;
            
                console.log(`[${ok}]  (status = ${res.status}) `);

                
            } catch (error) {
                console.log(error);
            }
            
            return { ok: ok, giturl: giturl};
        }
        async #fetchThroughAPI(){       // Fetch repo info struct through API
            // Uses :
            //      this.apiurl      github API URL
            //      this.TOKEN       github TOKEN -- optional
            //
            // Creates :
            //      this.repoInfoStruct     storage for json returned by API call 
            //      this.options            options used in api call (stored for debugging purposes)
            //
            // Functions called :
            //      super.isEmptyString     parent function to check if empty, undefined, or null
            //      super.fetchWithApi      parent function to read through API
            
            
            // --- Provider-specific code :
                
                // Complete options
                this.options = {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization' : `token ${this.TOKEN}`
                    },
                };
            
                
                // Remove options for unknown TOKEN 
                if ( super.isEmptyString( this.TOKEN) ) {
                    delete this.options.headers.Authorization 
                }
                
             // --- End Provider-specific code    
                     
            
            // Fetch through API into class variable
            this.repoInfoStruct = await super.fetchWithApi( this.apiurl, this.options); 
             
            return this.repoInfoStruct;  // Useful for debuggin
        } 

        async getValue( parameterName, secondParameter){  // Get provider-specific parameter 
            // Uses:
            //      this.repoInfoStruct     storage for json returned by API call (creates if not set yet)
            //
            // Output :
            //      out     value from json parameterName 


                global.log(`getValue('${parameterName}')`);
                let out;   
               

            // Provider-specific code

                switch (parameterName) {
                    //
                    // Static methods, NOT requiring initialize() call
                    // 
                    case 'provider-name': {  // Template replacement name used in create_remote_repository.html ('Github')
                        out = 'Github';
                        break;
                    }
                    case 'display-name': {  // UI button label ('GitHub')
                        out = 'GitHub';
                        break;
                    }
                    case 'create-repo-labels': {  // Labels and external links for create_remote_repository.html
                        out = {
                            accountPreText: 'Github username (',
                            accountPostText: ')',
                            accountLinkText: 'Register Github account',
                            accountLinkUrl: 'https://github.com/join',
                            tokenPreText: 'Token (',
                            tokenPostText: ')',
                            tokenLinkText: 'Create personal access token',
                            tokenLinkUrl: 'https://github.com/settings/tokens'
                        };
                        break;
                    }
                    case 'askpass-help': {
                        if (secondParameter === 'username') {
                            out = {
                                title: 'GitHub Username',
                                text: 'Enter your GitHub username or organization name.'
                            };
                        } else {
                            out = {
                                title: 'GitHub Personal Access Token (PAT)',
                                text: 'Enter your GitHub Personal Access Token (classic or fine-grained).'
                            };
                        }
                        break;
                    }
                    case 'git-username': {  // Returns default username (not requiring json)
                        try{
                            let urlParts = new URL( this.giturl);   // "https://github.com/pragma-git/pragma-git.git"
                            let pathname = urlParts.pathname;       // "/pragma-git/pragma-git.git" (where first "pragma-git" is the username to extract)
                            out = pathname.split('/')[1];           // get username
                        }catch (err){ global.warn(err);}
                        break;     
                    }
                    case 'icon': {  // Returns icon (not requiring json)
                        try{
                            if (secondParameter == 'darkmode'){
                                out = 'apis_github_and_others/git-provider-icons/Github/github-mark-white.png'; 
                            }
                            if (secondParameter == 'lightmode'){
                                out = 'apis_github_and_others/git-provider-icons/Github/github-mark.png'; 
                            }
                        }catch (err){ global.warn(err);}
                        break;     
                    }
                    case 'web-url': {  // Returns web page url
                        try{
                            let our = this.giturl;  // Guess same as giturl
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
                    case 'is-private-repo': { // Returns true, false
                        try{                       
                            out = this.repoInfoStruct.json.private
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
                                'Accept': 'application/vnd.github.v3+json'
                            };
                            if (!super.isEmptyString(this.TOKEN)) {
                                headers['Authorization'] = `token ${this.TOKEN}`;
                            }
                            let statusUrl = `${this.apiurl}/commits/${commitSha}/status`;
                            let statusRes = await this.fetchWithApi(statusUrl, { method: 'GET', headers: headers });

                            let hasFailure = false;
                            let hasPending = false;
                            let hasSuccess = false;
                            let bestUrl = null;

                            if (statusRes.ok && statusRes.json && statusRes.json.total_count > 0) {
                                let state = statusRes.json.state; // 'success', 'failure', 'pending'
                                let targetUrl = (statusRes.json.statuses && statusRes.json.statuses.length > 0) ? statusRes.json.statuses[0].target_url : null;
                                if (state === 'failure' || state === 'error') {
                                    hasFailure = true;
                                    bestUrl = targetUrl;
                                } else if (state === 'pending') {
                                    hasPending = true;
                                    if (!bestUrl) bestUrl = targetUrl;
                                } else if (state === 'success') {
                                    hasSuccess = true;
                                    if (!bestUrl) bestUrl = targetUrl;
                                }
                            }

                            // Always inspect check-runs (GitHub Actions workflows) as well
                            let checkRunsUrl = `${this.apiurl}/commits/${commitSha}/check-runs`;
                            let checkRunsRes = await this.fetchWithApi(checkRunsUrl, { method: 'GET', headers: headers });
                            if (checkRunsRes.ok && checkRunsRes.json && checkRunsRes.json.total_count > 0) {
                                let runs = checkRunsRes.json.check_runs || [];
                                let failRun = runs.find(r => r.conclusion === 'failure' || r.conclusion === 'timed_out' || r.conclusion === 'cancelled');
                                let pendingRun = runs.find(r => r.status !== 'completed');
                                let successRun = runs.find(r => r.conclusion === 'success');
                                let firstRun = runs[0];
                                let runUrl = (failRun && (failRun.html_url || failRun.details_url)) || (firstRun && (firstRun.html_url || firstRun.details_url)) || null;

                                if (failRun) {
                                    hasFailure = true;
                                    bestUrl = runUrl;
                                } else if (pendingRun) {
                                    hasPending = true;
                                    if (!bestUrl) bestUrl = runUrl;
                                } else if (successRun) {
                                    hasSuccess = true;
                                    if (!bestUrl) bestUrl = runUrl;
                                }
                            }

                            if (hasFailure) {
                                out = { status: 'failure', url: bestUrl };
                            } else if (hasPending) {
                                out = { status: 'pending', url: bestUrl };
                            } else if (hasSuccess) {
                                out = { status: 'success', url: bestUrl };
                            } else if (statusRes.ok || checkRunsRes.ok) {
                                out = { status: 'none', url: null };
                            } else {
                                throw new Error(`GitHub check-runs API error (${checkRunsRes.status || statusRes.status || 'unknown'})`);
                            }
                        }catch (err){
                            global.warn(err);
                            throw err;
                        }
                        break;
                    }    
                    default:  {
                         throw new Error(`getInfoValue error: 'unknown parameterName'`);
                    }
                }
            // --- End Provider-specific code 
            

                global.log(`getValue('${parameterName}') = ${out} `);
                return out  // return value for parameterName (from json), or undefined
        }             
        async setValue( parameterName, value){  // Set parameter TODO: This is not finished yet
            // Uses:
            //      this.repoInfoStruct     storage for json returned by API call (creates if not set yet)
            //
            // Output :
            //      out     value from json parameterName 
            
            
                
            // Provider-specific code

                switch (parameterName) {  

                    case 'set-star': { // sets true, false
                        try{              
                            if (value == true)   {
                                visibility = 'private';
                            }else{
                                visibility = 'public';
                            }

                        }catch (err){ global.error(err);}
                        break;   
                    }    
                    default: {
                         throw new Error(`setValue error: 'unknown parameterName'`);
                    }
                }
                
            // --- End Provider-specific code   
                  
                return out  // return value for parameterName (from json), or undefined
        }

        isCredentialRevokedError(errorMessage) {
            if (!errorMessage || typeof errorMessage !== 'string') return false;
            let msg = errorMessage.toLowerCase();
            return msg.includes('support for password authentication was removed') ||
                   msg.includes('invalid username or token') ||
                   msg.includes('bad credentials') ||
                   super.isCredentialRevokedError(errorMessage);
        }
}

module.exports = github;
