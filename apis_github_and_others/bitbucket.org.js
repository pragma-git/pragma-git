/**
Example use

    a= require('apis_github_and_others/bitbucket.org.js');
    
    b = new a('https://bitbucket.org/janaxelsson/git-bootcamp.git');
    c = await b.getValue('fork-parent');

**/

// Parent class
let  General_git_rest_api = require('apis_github_and_others/general_git_rest_api.js');

class bitbucket extends General_git_rest_api {
    

    constructor( giturl, TOKEN) {
        super( giturl, TOKEN ) // Sets properties : this.giturl,  this.TOKEN,  this.initialized 
        this.apiurl = this.#apiUrl( giturl);  // Call provider-specific translation from git-url to api-url
    }


        
    //
    // Define provider-specific methods (ADAPT THESE FOR NEW PROVIDER)
    //

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
             
            return this.repoInfo;  // Useful for debuggin
        } 
        async getValue( parameterName){  // Get parameter from Github json struct
            // Uses:
            //      this.repoInfoStruct     storage for json returned by API call (creates if not set yet)
            //
            // Output :
            //      out     value from json parameterName 
            //
            // Functions called :
            //      this.#fetchThroughAPI   function to read json through API call
            
         
            // --- Required code :
                // Initialize by calling #fetchThroughAPI (if not initialized already)           
                if ( this.initialized == false){
                    await this.#fetchThroughAPI();    // Sets  this.repoInfoStruct 
                    this.initialized = true;
                }  
                    
                let out;   
            // --- End required code
            
            
                
            // Provider-specific code

                switch (parameterName) { 
                    case 'fork-parent':  { // Returns URL from which current repo was forked
                        try{
                            out = this.repoInfoStruct.json.parent.links.html.href + '.git'
                        }catch (err){ console.error(err);}
                        break;  
                    }
                    case 'is-private-repo': { // Returns true, false
                        try{                       
                            out = this.repoInfoStruct.json.is_private
                        }catch (err){ console.error(err);}
                        break;   
                    }    
                    default:  {
                         throw new Error(`getInfoValue error: 'unknown parameterName'`);
                    }
                }
                
            // --- End Provider-specific code   
                  
                return out  // return value for parameterName (from json)
        }             

}

module.exports = bitbucket;
