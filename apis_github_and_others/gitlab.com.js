/**
Example use
    TOKEN=....
    a= require('apis_github_and_others/gitlab.com.js');
    
    b = new a('https://gitlab.com/JanAxelsson/gitlab-test.git');
    c = await b.getValue('fork-parent');

**/

// Parent class
let  General_git_rest_api = require('apis_github_and_others/general_git_rest_api.js');

class gitlab extends General_git_rest_api {
    

    constructor( giturl, TOKEN) {
        super( giturl, TOKEN ) // Sets properties : this.giturl,  this.TOKEN,  this.initialized 
        this.apiurl = this.#apiUrl( giturl);  // Call provider-specific translation from git-url to api-url
    }


        
    //
    // Define provider-specific methods (ADAPT THESE FOR NEW PROVIDER)
    //

        #apiUrl( giturl){               // Transform GIT-URL to PROVIDER-API-URL (Github etc)
            // API URL by transforming
            //  https://gitlab.com/             JanAxelsson/gitlab-test       .git  -> 
            //  https://gitlab.com/api/v4/users/JanAxelsson/projects?search=gitlab-test
            // --- Provider-specific code :
                
                // Part 1 : remove .git at end, and add extra for api
                let url = giturl.replace( '.git', '').replace( 'gitlab.com', 'gitlab.com/api/v4/users')    
                
                // Part 2 : replace last '/' with   'projects?search='
                let begin = url.substring( 0, url.lastIndexOf('/') );
                let ending = url.substring( url.lastIndexOf('/') + 1 );
                
                url = begin + '/projects?search=' + ending
                

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
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        "PRIVATE-TOKEN" : this.TOKEN,
                    },
                };

                
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
                if ( this.initialized == false)
                    await this.#fetchThroughAPI();    // Sets  this.repoInfoStruct 
                    
                let out;   
            // --- End required code
            
            
                
            // Provider-specific code

                switch (parameterName) {
                    
                    case 'fork-parent': 
                        try{
                            //out = this.repoInfoStruct.json[0].forked_from_project.http_url_to_repo; // Only available if TOKEN is correct
                            
                            // Use the gitlab home page instead (same url as giturl):
                            let options = {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'text/html; charset=UTF-8',
                                    'Accept': 'text/html',
                                },
                            };
                            
                            let response = await fetch( this.giturl, options);
                            let text = await response.text();
                            let filtered = text.split(' ').filter(function (str) { return str.includes('data-source-path'); });  //   
                            if (filtered.length > 0){ // out = undefined before this
                                out = 'https://gitlab.com' + filtered[0].split('=')[1].replaceAll('"','') + '.git';
                            }
                            
                        }catch (err){
                            // out is already undefined
                        }
                           
                        break;     
    
                    default: 
                         throw new Error(`getInfoValue error: 'unknown parameterName'`);
                }
                
            // --- End Provider-specific code   
                  
                return out  // return value for parameterName (from json)
        }             

}

module.exports = gitlab;
