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
    

    constructor( giturl, TOKEN) {
        super( giturl, TOKEN ) // Sets properties : this.giturl,  this.TOKEN
    }

    //
    // Define provider-specific methods (ADAPT THESE FOR NEW PROVIDER)
    //
      
        async initialize(){
            
            this.apiurl = this.#apiUrl( this.giturl);  // Call provider-specific translation from git-url to api-url
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
                
                // That is : replace "bitbucket.org" with "api.bitbucket.org//2.0/repositories", AND remove  ".git" at end
                let url = giturl.replace( '.git', '').replace( 'bitbucket.org', 'api.bitbucket.org/2.0/repositories')        
                
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
            // myCredentials -- ${BITBUCKET_USER_NAME}:${APP_PASSWORD}  // Use App Password instead of Token (because it is very complex to set up an Oauth token)
            //                  BITBUCKET_USER_NAME -- found from "https://bitbucket.org/account/settings/"
            //                  APP_PASSWORD        -- set from "https://bitbucket.org/account/settings/app-passwords/"
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

            
            try {
                // Create
                const res = await fetch( `https://api.bitbucket.org/2.0/repositories/${owner}/${newRepoName}`, {
                    method: 'POST',
                    headers: {
                       "Content-Type": "application/json",
                        "Authorization": `Basic ${credentials}` // Use Basic Auth with App Password
                    },
                    body: JSON.stringify( body )
                })
                
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
                
                // Complete options
                this.options = {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + this.TOKEN,
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
                    case 'git-username': {  // Returns default username (not requiring json)
                        try{
                            out = 'x-token-auth';      
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
                    default:  {
                         throw new Error(`getInfoValue error: 'unknown parameterName'`);
                    }
                }
                
            // --- End Provider-specific code 
            
              
                global.log(`getValue('${parameterName}') = ${out} `);
                return out  // return value for parameterName (from json), or undefined
        }             
}

module.exports = bitbucket;
