/**
 
Gitlab specific code 
 
Example use :
    TOKEN=....
    a= require('apis_github_and_others/gitlab.com.js');
    
    b = await new a('https://gitlab.com/JanAxelsson/gitlab-test.git', TOKEN);
    await b.initialize();
    c = await b.getValue('fork-parent');
    
Example use :
    url='https://gitlab.com/JanAxelsson/gitlab-test.git'; 
    host = new URL(url).host; 
    scriptName  = `apis_github_and_others/${host}.js`; 
    a= require(scriptName); 
    creds = await getCredential(url); // From git credential helper
    b = await new a(url, creds.password );
    await b.initialize();
    
    c = await b.getValue('is-private-repo')

**/

// Parent class
let  General_git_rest_api = require('apis_github_and_others/general_git_rest_api.js');

// Modules
const util = require('../util_module.js');   


class gitlab extends General_git_rest_api {
 
    /**
     *  
     *  Gitlab uses a "project", which contains a "repository", and other things
     *  To edit a project/repository attribute, the project-id is needed. project-id can also be used in reading attributes.
     *  Therefore, the apiurl is created in initialize() function
     * 
     **/
    
    
    constructor( giturl, username, TOKEN) {
        super( giturl, username, TOKEN ) // Sets properties : this.giturl,  this.TOKEN
        this.apiurl = this.#apiUrl( this.giturl);  // Designed to search for name matching that of giturl (can be multiple, due to gitlab's api).  initialize function reshapes this to correct url if multiple answers
    }
    
    //
    // Define provider-specific methods (ADAPT THESE FOR NEW PROVIDER)
    //
            
        async initialize(){
             
            //
            // Gitlab specific -- update api-url to ID-based api-url
            //
            
            global.log('Gitlab determine API URL : '); // Log to main console
            
            // Call provider-specific translation from git-url to api-url
            //this.apiurl = await this.#apiUrl( this.giturl);  // Designed to search for name matching that of giturl (can be multiple, due to gitlab's api)
            
            
            this.repoInfoStruct = await this.#fetchThroughAPI();    // Read repoInfoStruct for above apiurl
            global.log(this.repoInfoStruct);
            
            // Find index for exact match -- needed if multiple repos found ( bacause having same substring in names)
            let index = util.findObjectIndex(this.repoInfoStruct.json, 'name', this.reponame)
            
            // Modify to use apiurl with ID for correct match instead, and fetch json through API
            let urlParts = new URL(this.giturl);
            let host = urlParts.host; 
            
            try{
                let ID = this.repoInfoStruct.json[index].id;  
                this.apiurl = `https://${host}/api/v4/projects/${ID}`;      
                global.log(`Gitlab API URL = ${this.apiurl} `);  
                global.log('Gitlab API call : '); // Log to main console
                this.repoInfoStruct = await this.#fetchThroughAPI();    // Read repoInfoStruct for above apiurl
            }catch(err){
                // If here, only  getValue methods that are independent on api-call will work 
            }
            global.log(this.repoInfoStruct);
    
        }
        #apiUrl( giturl){               // Transform GIT-URL to PROVIDER-API-URL (Github etc)
            // API URL by transforming
            //   https://gitlab.com/             JanAxelsson/gitlab-test       .git  -> 
            //   https://gitlab.com/api/v4/users/JanAxelsson/projects?search=gitlab-test
            // 
            // NOTE: This is later (in initialize() ) modified to ID-based apiurl :
            //   https://gitlab.com/api/v4/projects/${ID}
            // --- Provider-specific code :

                let urlParts = new URL(giturl);
                let host = urlParts.host; 
                
                // Part 1 : remove .git at end, and add extra for api
                let url = giturl.replace( '.git', '').replace( host, host + '/api/v4/users');   
                
                // Part 2 : replace last '/' with   'projects?search='
                let begin = url.substring( 0, url.lastIndexOf('/') );
                let ending = url.substring( url.lastIndexOf('/') + 1 );
                
                url = begin + '/projects?search=' + ending;
                
                this.reponame = ending;
                

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
            let giturl = `https://gitlab.com/${owner}/${newRepoName}.git`;
 
            let isPrivateString = 'public';
            if (isPrivate){
                isPrivateString = 'private';
            }
            
            
            try {
                // Create
                const res = await fetch( 'https://gitlab.com/api/v4/projects', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'PRIVATE-TOKEN': token,
                    },
                    body: JSON.stringify({
                        name: newRepoName,
                        description: description,
                        visibility: isPrivateString
                    })
                })
                
                // Check result
                console.log(res);
                const json = await res.json();
                ok = res.ok;
            
                console.log(`[${ok}]  (status = ${res.status}) `);
                console.log( json);

                
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
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        "PRIVATE-TOKEN" : this.TOKEN,
                    },
                };
                
             // --- End Provider-specific code    
                     
            
            // Fetch through API into class variable "repoInfoStruct"
            this.repoInfoStruct = await super.fetchWithApi( this.apiurl, this.options);  
            
            return this.repoInfoStruct;  // Useful for debugging
        } 
        #projectPath(){                 // 'group/subgroup/repo' from giturl (credentials and .git removed)
            let urlParts = new URL(this.giturl);
            return urlParts.pathname.replace(/^\/+/, '').replace(/\.git$/, '').replace(/\/+$/, '');
        }
        #projectApiUrl(){               // Project API url that works for both user- and group-owned projects
            // Prefer ID-based url set by initialize(), otherwise use the URL-encoded project path
            // (the users/<name>/projects?search= lookup in initialize() fails for group-owned projects)
            if ( /\/api\/v4\/projects\/[^/?]+$/.test(this.apiurl || '') ){
                return this.apiurl;
            }
            let host = new URL(this.giturl).host;
            return `https://${host}/api/v4/projects/${encodeURIComponent(this.#projectPath())}`;
        }
        #mapCiStatus( gitlabStatus){    // Map GitLab pipeline/job/badge status to 'success'|'failure'|'pending'|'none'
            let s = String(gitlabStatus || '').toLowerCase().trim();
            if ( ['success', 'passed', 'success-with-warnings', 'success_with_warnings', 'warning', 'passed with warnings'].includes(s) ){
                return 'success';
            }
            if ( ['failed', 'canceled', 'cancelled', 'canceling'].includes(s) ){
                return 'failure';
            }
            if ( ['running', 'pending', 'created', 'preparing', 'waiting_for_resource', 'waiting_for_callback', 'scheduled'].includes(s) ){
                return 'pending';
            }
            return 'none';  // 'skipped', 'manual', 'unknown', ...
        }
        async #ciStatusFromWebPipelines( commitSha){  // Web endpoint (same as get-status.js prototype). Returns {status,url} or null
            try{
                let urlParts = new URL(this.giturl);
                let webBase = `${urlParts.protocol}//${urlParts.host}`;
                let url = `${webBase}/${this.#projectPath()}/-/commit/${commitSha}/pipelines.json`;

                let res = await fetch(url, {
                    method: 'GET',
                    redirect: 'follow',
                    headers: { 'Accept': 'application/json' }
                });
                let contentType = res.headers.get('content-type') || '';
                if ( !res.ok || !contentType.includes('json') ){
                    return null;  // e.g. private repo redirecting to the sign-in page
                }
                let json = await res.json();
                if ( !json || !Array.isArray(json.pipelines) ){
                    return null;
                }
                if ( json.pipelines.length === 0 ){
                    return { status: 'none', url: null };
                }
                let pipeline = json.pipelines[0];
                let details = pipeline.details || {};
                let statusInfo = details.status || {};
                let rawStatus = statusInfo.group || statusInfo.text || pipeline.status;
                let pipelineUrl = pipeline.path ? `${webBase}${pipeline.path}` : (statusInfo.details_path ? `${webBase}${statusInfo.details_path}` : null);
                return { status: this.#mapCiStatus(rawStatus), url: pipelineUrl };
            }catch (err){
                global.warn(err);
                return null;
            }
        }
        async #ciStatusFromSvgBadge( branchName){  // SVG badge (same as get-svg-status.js prototype). Branch level only. Returns {status,url} or null
            try{
                let urlParts = new URL(this.giturl);
                let webBase = `${urlParts.protocol}//${urlParts.host}`;
                let projectWebUrl = `${webBase}/${this.#projectPath()}`;
                let url = `${projectWebUrl}/badges/${encodeURIComponent(branchName)}/pipeline.svg`;

                let res = await fetch(url, { method: 'GET', redirect: 'follow' });
                if ( !res.ok ){
                    return null;
                }
                let svg = await res.text();
                let match = svg.match(/(passed with warnings|passed|failed|running|pending|canceled|skipped|manual|created|unknown)/i);
                if ( !match ){
                    return null;
                }
                return { status: this.#mapCiStatus(match[0]), url: `${projectWebUrl}/-/pipelines?ref=${encodeURIComponent(branchName)}` };
            }catch (err){
                global.warn(err);
                return null;
            }
        }
        async getValue( parameterName, secondParameter, thirdParameter){  // Get provider-specific parameter 
            // Uses:
            //      this.repoInfoStruct     storage for json returned by API call (creates if not set yet)
            //
            // Output :
            //      out     value from json parameterName 
        
                global.log(`getValue('${parameterName}')`);
                let out; 
            

            // Provider-specific code :

                switch (parameterName) {  
                    //
                    // Static methods, NOT requiring initialize() call
                    // 
                    case 'provider-name': {  // Template replacement name used in create_remote_repository.html ('Gitlab')
                        out = 'Gitlab';
                        break;
                    }
                    case 'display-name': {  // UI button label ('GitLab')
                        out = 'GitLab';
                        break;
                    }
                    case 'create-repo-labels': {  // Labels and external links for create_remote_repository.html
                        out = {
                            accountPreText: 'Gitlab username (',
                            accountPostText: ')',
                            accountLinkText: 'Register a Gitlab account',
                            accountLinkUrl: 'https://gitlab.com/users/sign_up',
                            tokenPreText: 'Token (',
                            tokenPostText: ')',
                            tokenLinkText: 'Create personal access token',
                            tokenLinkUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens'
                        };
                        break;
                    }
                    case 'git-username': {  // Returns default username (not requiring json)
                        try{
                            let urlParts = new URL( this.giturl);   // "https://gitlab.com/pragma-git/pragma-git.git"
                            let pathname = urlParts.pathname;       // "/pragma-git/pragma-git.git" (where first "pragma-git" is the username to extract)
                            out = pathname.split('/')[1];           // get username
                        }catch (err){ global.warn(err);}
                        break;     
                    }
                    case 'icon': {  // Returns icon (not requiring json)
                        try{
                            
                            if (secondParameter == 'darkmode'){
                                out = 'apis_github_and_others/git-provider-icons/Gitlab/gitlab-logo-500_zoomed.png'; 
                            }
                            if (secondParameter == 'lightmode'){
                                out = 'apis_github_and_others/git-provider-icons/Gitlab/gitlab-logo-500_zoomed.png'; 
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
                    case 'fork-parent':     { // Returns URL from which current repo was forked
                        try{
                            out = this.repoInfoStruct.json.forked_from_project.http_url_to_repo; // Only available if TOKEN is correct
                        }catch (err){ global.warn(err);}
                        break; 
                    }    
                    case 'is-private-repo': { // Returns true, false
                        try{                    
                            let visibility = this.repoInfoStruct.json.visibility    
                            out = (visibility == 'private');
                        }catch (err){ global.warn(err);}
                        break;   
                    }    
                    case 'ci-status': {  // Returns { status: 'success'|'failure'|'pending'|'none', url: string|null }
                        // secondParameter = commit SHA (required)
                        // thirdParameter  = branch name (optional; enables the SVG badge as a last-resort fallback)
                        //
                        // Strategy (works without TOKEN for public repos, and with TOKEN for private repos):
                        //   1) REST API pipelines for the commit    : /api/v4/projects/:id/pipelines?sha=SHA   (public repos need no token)
                        //   2) Web endpoint (no API, no token)      : https://host/group/repo/-/commit/SHA/pipelines.json
                        //   3) SVG pipeline badge (branch level)    : https://host/group/repo/badges/BRANCH/pipeline.svg  (only if branch given)
                        try{
                            let commitSha = secondParameter;
                            if (!commitSha) {
                                out = { status: 'none', url: null };
                                break;
                            }

                            let headers = {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            };
                            if (!super.isEmptyString(this.TOKEN)) {
                                headers['PRIVATE-TOKEN'] = this.TOKEN;
                            }
                            let projectApiUrl = this.#projectApiUrl();

                            // 1) Pipelines API (newest pipeline first)
                            let pipelinesUrl = `${projectApiUrl}/pipelines?sha=${encodeURIComponent(commitSha)}`;
                            let pipelinesRes = await this.fetchWithApi(pipelinesUrl, { method: 'GET', headers: headers });
                            if (pipelinesRes.ok && Array.isArray(pipelinesRes.json) && pipelinesRes.json.length > 0) {
                                let pipeline = pipelinesRes.json[0];
                                out = { status: this.#mapCiStatus(pipeline.status), url: pipeline.web_url || null };
                                break;
                            }

                            // The API answered OK but there is no CI pipeline for this commit
                            if (pipelinesRes.ok) {
                                out = { status: 'none', url: null };
                                break;
                            }

                            // 2) Web endpoint fallback (public repos, no token, no API)
                            let webResult = await this.#ciStatusFromWebPipelines(commitSha);
                            if (webResult) {
                                out = webResult;
                                break;
                            }

                            // 3) SVG badge fallback (branch level -- not commit specific)
                            if (!super.isEmptyString(thirdParameter)) {
                                let badgeResult = await this.#ciStatusFromSvgBadge(thirdParameter);
                                if (badgeResult) {
                                    out = badgeResult;
                                    break;
                                }
                            }

                            throw new Error(`GitLab CI status could not be determined (pipelines API: ${pipelinesRes.status || 'unknown'})`);
                        }catch (err){
                            global.warn(err);
                            throw err;
                        }
                        break;
                    }    
                    case 'ci-status-web': {  // Direct access to fallback 3 (web pipelines.json, no token). secondParameter = commit SHA
                        if (!secondParameter) {
                            out = { status: 'none', url: null };
                            break;
                        }
                        out = await this.#ciStatusFromWebPipelines(secondParameter);
                        if (!out) {
                            throw new Error(`GitLab web pipelines.json did not return CI status (private repo or endpoint unavailable)`);
                        }
                        break;
                    }
                    case 'ci-status-badge': {  // Direct access to fallback 4 (SVG pipeline badge, branch level). secondParameter = branch name
                        if (super.isEmptyString(secondParameter)) {
                            out = { status: 'none', url: null };
                            break;
                        }
                        out = await this.#ciStatusFromSvgBadge(secondParameter);
                        if (!out) {
                            throw new Error(`GitLab SVG badge did not return CI status for branch '${secondParameter}'`);
                        }
                        break;
                    }
                    default: {
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

                    case 'is-private-repo': { // sets true, false
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
            return msg.includes('token is invalid or has expired') ||
                   msg.includes('invalid credentials') ||
                   super.isCredentialRevokedError(errorMessage);
        }
}

module.exports = gitlab;
