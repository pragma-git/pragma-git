/**
Base class for github, gitlab etc API calls
**/

class git_rest_api {
    


        
    // Constructor
    constructor( giturl, TOKEN) {
        this.giturl = giturl;
        this.TOKEN = TOKEN;
        this.initialized = false;  // shows if init method has been called
    }

    // Public methods
        async fetchWithApi( apiurl, options){
            
            let response;

            // Fetch
            let json;  // Undefined if fetch fails
            try {
                response = await fetch( apiurl, options);
                
                if (!response.ok) {
                  throw new Error(`GitHub API error: ${response.statusText}`);
                }
            
                json = await response.json();
                console.log('Repository Information:', json);
            } catch (error) {
                console.error('Error fetching repository info:', error.message);
            }

            
            return { 
                ok: response.ok, 
                status: response.status,
                json: json
            }
        }
        isEmptyString( str) { 
            // True if string is: '', contains only spaces, undefined, or null
            // False is string contains non-empty characters
            if (str === undefined || str === "" | str === null ) {
                return true;
            }
            if (str.trim() === ''){
              return true;
            }
            return false;
        }
}

module.exports = git_rest_api;
