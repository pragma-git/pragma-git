/**
Example use

    a= require('apis_github_and_others/github.com');
    
    b = new a('https://github.com/JanAxelsson/Spoon-Knife.git');
    c = await b.getValue('fork-parent');

**/

class git_rest_api {
    
    // Private properties
    #initialized;
    
    

        
    // Constructor
    constructor( giturl, TOKEN) {
        this.giturl = giturl;
        this.TOKEN = TOKEN;
        this.apiurl = this.#apiUrl( giturl);
        this.#initialized = false;  // shows if init method has been called
    }


        
    //
    // Private methods
    //

    
        async #init(){  // Get repo info struct through API
            // Variables:
            //      this.giturl      github URL
            //      this.TOKEN       github TOKEN -- optional
            //
            // The basis is to transform from repoURL to API URL, which looks like this:
            // repo URL = https://github.com/JanAxelsson/imlook4d.git
            // API URL = https://api.github.com/repos/JanAxelsson/imlook4d
            //
            //  Example public github repo
            //      out = await getRepoInfo('https://github.com/JanAxelsson/imlook4d.git', null)    // Allowed to have TOKEN=null, but OK with TOKEN string too  
            //  Example forked github repo
            //      out = await getRepoInfo('https://github.com/pragma-git/git-scm.git', null)
            //  Example private github repo
            //      out = await getRepoInfo('https://github.com/JanAxelsson/dicom2usb', TOKEN)  // Exchange TOKEN with token-string
            //  Example returned json:   
            //      githubApiJSON = out.json;

            
            // Build fetch options -- public repo
            let options = {
                method: 'GET',
                headers: {
                  'Accept': 'application/vnd.github.v3+json',
                },
            };
        
            
            // Build fetch options -- TOKEN known
            const util = require('util_module.js');
            if (!util.isEmptyString(this.TOKEN)){
                options.headers.Authorization = `token ${this.TOKEN}`
            }
            
            let response;
              
            // Fetch
            let json;  // Undefined if fetch fails
            try {
                response = await fetch( this.apiurl, options);
                
                if (!response.ok) {
                  throw new Error(`GitHub API error: ${response.statusText}`);
                }
            
                json = await response.json();
                console.log('Repository Information:', json);
              } catch (error) {
                console.error('Error fetching repository info:', error.message);
              }
              
        
            let repoInfoStruct = { 
                ok: response.ok, 
                status: response.status,
                json: json
            }
            
            // Both set class variable, and return
            this.repoInfoStruct = repoInfoStruct;
            return repoInfoStruct;
        }
 
         
        #apiUrl( giturl){  // Transform GIT-URL to PROVIDER-API-URL (Github etc)
            // API URL by transforming
            //  https://  github.com  /JanAxelsson/imlook4d   .git  -> 
            //  https://  api.github.com/repos  /JanAxelsson/imlook4d
            // That is : replace "github.com" with "api.github.com/repos", AND remove  ".git" at end
            let url = giturl.replace( '.git', '').replace( 'github.com', 'api.github.com/repos')        
            
            // Clean URL, if REST URL contains login info (not permitted)
            if (url.includes('@') ){
                // 'https://abc:dev@api.github.com/repos/pragma-git/git-scm' -> 'https://api.github.com/repos/pragma-git/git-scm'
                urlParts = new URL(url);
                url = urlParts.origin + urlParts.pathname; 
            }
            
            return url;
        }
        
    //
    // Public methods
    //
        async getValue( parameterName){  // Get parameter from Github json struct
            
            // Call #init if not initialized yet
            if ( this.#initialized == false){
                await this.#init();
                this.#initialized = true;
            }

            let out;
            
            switch(parameterName) {
                // Note use ' ' in case statements below:
                
                case 'fork-parent': 
                    out = this.repoInfoStruct.json.parent.clone_url;
                    break;     
                
                case 'list-parameter-names': 
                    // List possible values for argument to this function.  Look for rows starting with 'case' in this function's code
                    out = this.getValue.toString().split('\n').filter(function (str) { return str.trim().startsWith('case'); });
                    out.forEach( function(str, index) { out[index] = str.split("'")[1] } ); // Get what is inbetween ''
                    break;
                   
                default: 
                     throw new Error(`getInfoValue error: 'unknown paramterName'`);
            }
              
            return out
        }             

}

module.exports = git_rest_api;
