/**
 
Bitbucket specific code 
 
Example use :

    a= require('apis_github_and_others/bitbucket.org.js');
    
    b = await new a('https://bitbucket.org/janaxelsson/git-bootcamp.git');
    await b.initialize();
    c = await b.getValue('fork-parent');

**/

// Parent class
let  General_git_rest_api = require('apis_github_and_others/general_git_rest_api.js');

class bitbucket extends General_git_rest_api {
    

    constructor( giturl, username, TOKEN) {
        super( giturl, username, TOKEN ) // Sets properties : this.giturl,  this.TOKEN
        this.apiurl = this.#apiUrl( this.giturl);  // Call provider-specific translation from git-url to api-url
    }

    //
    // Define provider-specific methods (ADAPT THESE FOR NEW PROVIDER)
    //
      
        async initialize(){

            global.log(`Bitbucket API URL = ${this.apiurl} `); 
            
             try{
                this.repoInfoStruct = await this.#fetchThroughAPI();    // Refresh this.repoInfoStruct
                global.log('Bitbucket API call : '); // Log to main console
                global.log(this.repoInfoStruct);  // Log to main console
            }catch (err){
                global.log(this.repoInfoStruct);  // Log to main console
            }

        }
        #apiUrl( giturl){               // Transform GIT-URL to PROVIDER-API-URL (Github etc)
            // API URL by transforming
            //  https://bitbucket.org/janaxelsson/git-bootcamp-git-session.git  -> 
            //  https://api.bitbucket.org/2.0/repositories/janaxelsson/git-bootcamp-git-session

            
            // --- Provider-specific code :

                let urlParts = new URL(giturl);
                let host = urlParts.host; 
                
                // That is : replace "bitbucket.org" with "api.bitbucket.org//2.0/repositories", AND remove  ".git" at end
                let url = giturl.replace( '.git', '').replace( host, `api.${host}/2.0/repositories`)        
                
                // Clean URL, if REST URL contains login info (not permitted)
                if (url.includes('@') ){
                    // 'https://abc:dev@api.github.com/repos/pragma-git/git-scm' -> 'https://api.github.com/repos/pragma-git/git-scm'
                    let urlParts = new URL(url);
                    url = urlParts.origin + urlParts.pathname; 
                }
            
            // --- End Provider-specific code  
            
            return url;
        }  
        async createRepo( owner, myCredentials, newRepoName, description, isPrivate, PROJECT_KEY = undefined ){  // Create Github repository
            
            // owner  -- bitbucket workspace = account.  For instance janaxelsson in 'https://bitbucket.org/janaxelsson'
            // myCredentials -- ${BITBUCKET_USER_NAME}:${API_TOKEN}  // Atlassian API token (App passwords deprecated per CHANGE-3222)
            //                  BITBUCKET_USER_NAME -- found from "https://bitbucket.org/account/settings/"
            //                  API_TOKEN           -- set from "https://id.atlassian.com/manage-profile/security/api-tokens"
            //
            // Bitbucket has the concept of PROJECT.  If not specified, the new repo lands in first project.
            // I have prepared this function for PROJECT_KEY (which can be found in "https://bitbucket.org/${owner}/workspace/projects/")
            // in case I want to implement such a setting in 'create_remote_repository.html'
            
            let ok = false;
            let giturl = `https://bitbucket.org/${owner}/${newRepoName}.git`;
            
            // Encode credentials for Basic Auth
            const credentials = btoa(myCredentials);
            
            let body = {
                        name: newRepoName,
                        scm: 'git',
                        is_private: isPrivate,
                        description: description
                    }
            
            // Append PROJECT to body if defined        
            if (PROJECT_KEY !== undefined){
                body.project = { "key": PROJECT_KEY };
            }
            
            let headers = {
                "Content-Type": "application/json",
                "Authorization": `Basic ${credentials}` // Use Basic Auth with App Password
            }
            
            console.log('body');
            console.log(body);
            console.log('headers');
            console.log(headers);

            
            try {
                // Create
                const res = await fetch( `https://api.bitbucket.org/2.0/repositories/${owner}/${newRepoName}`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify( body )
                })

                console.log(body);
                console.log(headers);                

                
                // Check result
                console.log(res);
                const json = await res.json();
                ok = res.ok;
            
                //console.log(`[${ok}]  (status = ${res.status}) `);
                console.log(`[${ok}] `);
                console.log( json);
                
                if (ok){
                    console.log("Repository created:", giturl);
                }   
                
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
                
                // Complete options for oauth -- change below if app-password
                this.options = {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + this.TOKEN,
                    },
                };
            
                
                // Different if app-password or oauth TOKEN
                if (this.username == 'x-token-auth'){
                    // Oauth
                    this.options.headers.Authorization = 'Bearer ' + btoa( this.TOKEN);
                }else{
                    // App-password on format user:password 
                    this.options.headers.Authorization = 'Basic ' + btoa( this.username + ':' + this.TOKEN);
                }


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
                    case 'provider-name': {  // Template replacement name used in create_remote_repository.html ('Bitbucket')
                        out = 'Bitbucket';
                        break;
                    }
                    case 'display-name': {  // UI button label ('Bitbucket')
                        out = 'Bitbucket';
                        break;
                    }
                    case 'create-repo-labels': {  // Labels and external links for create_remote_repository.html
                        out = {
                            accountPreText: 'Bitbucket workspace-name (',
                            accountPostText: ')',
                            accountLinkText: 'Register a Bitbucket account',
                            accountLinkUrl: 'https://bitbucket.org/',
                            tokenPreText: 'Username : API token (',
                            tokenPostText: ')',
                            tokenLinkText: 'Create an Atlassian API token',
                            tokenLinkUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens'
                        };
                        break;
                    }
                    case 'askpass-help': {
                        if (secondParameter === 'username') {
                            out = {
                                title: 'Bitbucket Username',
                                text: 'Default for Bitbucket Access Tokens: <a href="javascript:void(0)" onclick="setInputValue(\'x-token-auth\');" style="color:var(--focus-color, #388bfd); text-decoration:underline; font-weight:bold;">x-token-auth</a> (<a href="javascript:void(0)" onclick="setInputValue(\'x-token-auth\');" style="color:var(--focus-color, #388bfd); text-decoration:underline;">Use</a>)<br>For Atlassian Account API tokens, enter your registered email address instead.'
                            };
                        } else {
                            out = {
                                title: 'Bitbucket Access Token / API Token',
                                text: 'Enter your Bitbucket Repository Access Token or Atlassian API token.'
                            };
                        }
                        break;
                    }
                    case 'git-username': {  // Returns default username (not requiring json)
                        try{
                            out = this.username || 'x-token-auth';
                        }catch (err){ global.warn(err);}
                        break;     
                    }
                    case 'icon': {  // Returns icon (not requiring json)
                        try{
                            if (secondParameter == 'darkmode'){
                                out = 'apis_github_and_others/git-provider-icons/Free-icons.github.io/bitbucket_blue.png'; 
                            }
                            if (secondParameter == 'lightmode'){
                                out = 'apis_github_and_others/git-provider-icons/Free-icons.github.io/bitbucket_blue.png'; 
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
                    case 'fork-parent':  { // Returns URL from which current repo was forked
                        try{
                            out = this.repoInfoStruct.json.parent.links.html.href + '.git'
                        }catch (err){ global.warn(err);}
                        break;  
                    }
                    case 'is-private-repo': { // Returns true, false
                        try{                       
                            out = this.repoInfoStruct.json.is_private
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
                                if (this.username == 'x-token-auth'){
                                    headers['Authorization'] = 'Bearer ' + btoa(this.TOKEN);
                                } else {
                                    headers['Authorization'] = 'Basic ' + btoa(this.username + ':' + this.TOKEN);
                                }
                            }
                            let statusUrl = `${this.apiurl}/commit/${commitSha}/statuses`;
                            let statusRes = await this.fetchWithApi(statusUrl, { method: 'GET', headers: headers });

                            if (statusRes.ok && statusRes.json && Array.isArray(statusRes.json.values) && statusRes.json.values.length > 0) {
                                let statuses = statusRes.json.values;
                                let hasFailure = statuses.some(s => s.state === 'FAILED' || s.state === 'STOPPED');
                                let hasPending = statuses.some(s => s.state === 'INPROGRESS');
                                let failedItem = statuses.find(s => s.state === 'FAILED' || s.state === 'STOPPED');
                                let targetUrl = (failedItem && failedItem.url) || statuses[0].url || null;

                                if (hasFailure) {
                                    out = { status: 'failure', url: targetUrl };
                                } else if (hasPending) {
                                    out = { status: 'pending', url: targetUrl };
                                } else {
                                    out = { status: 'success', url: targetUrl };
                                }
                            } else if (statusRes.ok) {
                                out = { status: 'none', url: null };
                            } else {
                                throw new Error(`Bitbucket commit statuses API error (${statusRes.status || 'unknown'})`);
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

        formatTokenForDisplay(username, password) {
            if (!password) {
                return '';
            }
            if (username === 'x-token-auth' || !username) {
                return password;
            }
            return `${username}:${password}`;
        }

        parseTokenForCredential(owner, token) {
            // Guess OAuth by default; use user:api-token if colon-delimited
            let username = 'x-token-auth';
            let password = token;
            let splitToken = String(token || '').split(':');
            if (splitToken.length === 2) {
                username = splitToken[0];
                password = splitToken[1];
            }
            return { username: username, password: password };
        }

        isCredentialRevokedError(errorMessage) {
            if (!errorMessage || typeof errorMessage !== 'string') return false;
            let msg = errorMessage.toLowerCase();
            return msg.includes('change-3222') ||
                   msg.includes('app passwords are deprecated') ||
                   msg.includes('make sure you are authenticated') ||
                   msg.includes('you may not have access to this repository') ||
                   super.isCredentialRevokedError(errorMessage);
        }
}

module.exports = bitbucket;
