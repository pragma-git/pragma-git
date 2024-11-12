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
    

    constructor( giturl, TOKEN) {
        super( giturl, TOKEN ) // Sets properties : this.giturl,  this.TOKEN
        this.apiurl = this.#apiUrl( giturl);  // Call provider-specific translation from git-url to api-url

    }

    //
    // Define provider-specific methods (ADAPT THESE FOR NEW PROVIDER)
    //

        #apiUrl( giturl){               // Transform GIT-URL to PROVIDER-API-URL (Github etc)
            // API URL by transforming
            //  https://  github.com  /JanAxelsson/imlook4d   .git  -> 
            //  https://  api.github.com/repos  /JanAxelsson/imlook4d
            
            // --- Provider-specific code :
                
                // That is : replace "github.com" with "api.github.com/repos", AND remove  ".git" at end
                let url = giturl.replace( '.git', '').replace( 'github.com', 'api.github.com/repos')        
                
                // Clean URL, if REST URL contains login info (not permitted)
                if (url.includes('@') ){
                    // 'https://abc:dev@api.github.com/repos/pragma-git/git-scm' -> 'https://api.github.com/repos/pragma-git/git-scm'
                    urlParts = new URL(url);
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

                await this.#fetchThroughAPI();    // Sets  this.repoInfoStruct 

                let out;   
            // --- End required code
            
            
                
            // Provider-specific code

                switch (parameterName) {
                    case 'fork-parent': {  // Returns URL from which current repo was forked
                        try{
                            out = this.repoInfoStruct.json.parent.clone_url;
                        }catch (err){ console.error(err);}
                        break;     
                    }
                    case 'is-private-repo': { // Returns true, false
                        try{                       
                            out = this.repoInfoStruct.json.private
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

module.exports = github;
