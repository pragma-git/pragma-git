//
// Functions related to git credentials
//
// I have not made a module of this, since the debugging in chrome debug is harder with modules
// Import into html-file  <script src="lib/pragma-credentials-lib.js"></script>  to get functions available
// 



// Credentials
async function getAllCredentials( ){  // Git credentials for all repos in matrix
    
    let allCredentials = [];
    
    for (i = 0; i < state.repos.length; i++) {
        
        try{    
            let remoteUrl = state.repos[ i].remoteURL;
            let localFolder = state.repos[ i].localFolder;
            
            let creds = await getCredential( remoteUrl);
            let password = creds.password;
            console.log( localFolder.split('/').pop() +  ' -- ' + password  )
            
            allCredentials.push(creds);
        }catch(err){
            
            allCredentials.push( [] );
        }
        
    }
    
    return allCredentials
}
async function getCredential( remoteUrl){  // Git credentials for single repo as struct
    // Use as :
    //   creds = await getCredential('https://github.com/pragma-git/pragma-git.git')
    // Read field :
    //   creds['password'] 
    //   creds.password
    // Field names are : protocol, host, path, username, password
    

    
    let folder = CWD_INIT;  // Run in pragma-git folder (folder shouldn't matter)

  
    let url
    if (remoteUrl == undefined){
        url = state.repos[ state.repoNumber].remoteURL;
    }else{
        url = remoteUrl;
    }
    //console.log( 'Original  url = ' + url ); 
    
    let urlParts = new URL(url);
    
    
    // Fix up 
    if ( (urlParts.username.trim() == '') && (urlParts.password.trim() == '') ){  // https://github.com/... 
        url = `${urlParts.protocol}//${urlParts.host}${urlParts.pathname}`;
        
    }else if (urlParts.password.trim() == '') { // https://ghp_q3jx@github.com/... -- looks like username, but is most likely Token
        url = `${urlParts.protocol}//:${urlParts.username}@${urlParts.host}${urlParts.pathname}`;  // Write as empty username + token
    }
    
   
    //console.log( 'Rewritten url = ' + url );
    
    // Use git credential
    try{
        credentialFieldsString = await multiPlatformExecSync(folder, `export  GIT_ASKPASS=''; echo "url=${url}" | git credential fill`, mode = 'timeout', 1000); 
        //const extra = `-c include.path=${configFile} `
        //credentialFieldsString = await multiPlatformExecSync(folder, `export  GIT_ASKPASS=''; echo "url=${url}" | git ${extra} credential fill`, mode = 'timeout', 1000); 
    
        creds = util.parseKeyValuePairsFromString(credentialFieldsString);  // Parse text into struct
    }catch(err){
        creds = {
            protocol: urlParts.protocol.slice(0,-1),  // https: -> https
            host: urlParts.host, 
            path: urlParts.pathname.slice(1),  //   /janaxelsson/test.git -> janaxelsson.test.git
            host: urlParts.host, 
            username: undefined, 
            password: undefined
        }
    }

    return creds
}
