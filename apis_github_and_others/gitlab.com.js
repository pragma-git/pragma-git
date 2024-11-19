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
    
    
    constructor( giturl, TOKEN) {
        super( giturl, TOKEN ) // Sets properties : this.giturl,  this.TOKEN
    }
    
    async initialize(){
         
        //
        // Gitlab specific -- update to ID-based api url
        //
        
        // Call provider-specific translation from git-url to api-url
        this.apiurl = await this.#apiUrl( this.giturl);  // Designed to search for name matching that of giturl (can be multiple, due to gitlab's api)
        
        this.repoInfoStruct = await this.#fetchThroughAPI();    // Read repoInfoStruct for above apiurl
        
        // Find index for exact match -- needed if multiple repos found ( bacause having same substring in names)
        //let util = await require('../util_module.js');
        let index = util.findObjectIndex(this.repoInfoStruct.json, 'name', this.reponame)
        
        // Modify to use apiurl with ID for correct match instead
        let ID = this.repoInfoStruct.json[index].id;  
        this.apiurl = `https://gitlab.com/api/v4/projects/${ID}`;   
    }


        
    //
    // Define provider-specific methods (ADAPT THESE FOR NEW PROVIDER)
    //

        #apiUrl( giturl){               // Transform GIT-URL to PROVIDER-API-URL (Github etc)
            // API URL by transforming
            //   https://gitlab.com/             JanAxelsson/gitlab-test       .git  -> 
            //   https://gitlab.com/api/v4/users/JanAxelsson/projects?search=gitlab-test
            // 
            // NOTE: This is later modified to ID-based apiurl :
            //   https://gitlab.com/api/v4/projects/${ID}
            // --- Provider-specific code :
                
                // Part 1 : remove .git at end, and add extra for api
                let url = giturl.replace( '.git', '').replace( 'gitlab.com', 'gitlab.com/api/v4/users')    
                
                // Part 2 : replace last '/' with   'projects?search='
                let begin = url.substring( 0, url.lastIndexOf('/') );
                let ending = url.substring( url.lastIndexOf('/') + 1 );
                
                url = begin + '/projects?search=' + ending;
                
                this.reponame = ending;
                

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
                     
            
            // Fetch through API into class variable "repoInfoStruct"
            this.repoInfoStruct = await super.fetchWithApi( this.apiurl, this.options);  
            
            return this.repoInfoStruct;  // Useful for debugging
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

                this.repoInfoStruct = await this.#fetchThroughAPI();    // Refresh this.repoInfoStruct using ID-based api url

                let out;   
            // --- End required code
            
            
                
            // Provider-specific code

                switch (parameterName) {  
                    case 'fork-parent':     { // Returns URL from which current repo was forked
                        try{
                            out = this.repoInfoStruct.json.forked_from_project.http_url_to_repo; // Only available if TOKEN is correct
                        }catch (err){ console.error(err);}
                        break; 
                    }    
                    case 'is-private-repo': { // Returns true, false
                        try{                    
                            let visibility = this.repoInfoStruct.json.visibility    
                            out = (visibility == 'private');
                        }catch (err){ console.error(err);}
                        break;   
                    }    
                    default: {
                         throw new Error(`getInfoValue error: 'unknown parameterName'`);
                    }
                }
                
            // --- End Provider-specific code   
                  
                return out  // return value for parameterName (from json), or undefined
        }             
        async setValue( parameterName, value){  // Set parameter TODO: This is not finished yet
            // Uses:
            //      this.repoInfoStruct     storage for json returned by API call (creates if not set yet)
            //
            // Output :
            //      out     value from json parameterName 
            //
            // Functions called :
            //      this.#fetchThroughAPI   function to read json through API call
            
            
                
            // Provider-specific code

                switch (parameterName) {  

                    case 'is-private-repo': { // sets true, false
                        try{              
                            if (value == true)   {
                                visibility = 'private';
                            }else{
                                visibility = 'public';
                            }

                        }catch (err){ console.error(err);}
                        break;   
                    }    
                    default: {
                         throw new Error(`setValue error: 'unknown parameterName'`);
                    }
                }
                
            // --- End Provider-specific code   
                  
                return out  // return value for parameterName (from json), or undefined
        }  
}

module.exports = gitlab;
