//
// Functions related to git credentials
//
// I have not made a module of this, since the debugging in chrome debug is harder with modules
// Import into app.html-file  <script src="lib/pragma-credentials-lib.js"></script>  to get functions available from app.js
//
// NOTE: It is assumed that this file is imported into app.js
//
// Therefore functions defined here are accessible directly from app.js
// 
// This also means that the following from "pragma-git.js" is directly accessible from here (and used in functions below)
// - variable "configFile" 				(which is the include config file for pragma-git)
// - function "multiPlatformExecSync"	(used to run in git-bash for windows, and normal bash for other OSs)


// Credentials
async function storeUsernameInLocalGitConfig( remoteUrl){ // Stores the git credentials username in file=".git/config" key=credential.username

    let repoInfo = getLocalFolder( remoteUrl);
            
    // Write local config credential.username
    let a = await getCredential( repoInfo.remoteUrl);  // From remote repo 
    if (a.username != undefined){
        if (a.username.length > 0){  // Don't allow empty string
            await simpleGit( repoInfo.localFolder).addConfig('credential.username', a.username, false, '--local');
        }
    }
            
    
}
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
    // Gets credentials for the remote URL using "git credential fill" command, run in the localFolder.
    // For ssh-folder, this means that the command has to be run on server, and therefore two versions local/ssh-folder are handled.
    //
    //
    // Use as :
    //   creds = await getCredential('https://github.com/pragma-git/pragma-git.git')
    // Read field :
    //   creds['password'] 
    //   creds.password
    // Field names are : protocol, host, path, username, password

    let url
    
    let repoInfo = getLocalFolder( remoteUrl);
  
    let urlParts = new URL( repoInfo.remoteUrl);
    
    
    // Fix up 
    if ( (urlParts.username.trim() == '') && (urlParts.password.trim() == '') ){  // https://github.com/... 
        url = `${urlParts.protocol}//${urlParts.host}${urlParts.pathname}`;
        
    }else if (urlParts.password.trim() == '') { // https://ghp_q3jx@github.com/... -- looks like username, but is most likely Token
        url = `${urlParts.protocol}//:${urlParts.username}@${urlParts.host}${urlParts.pathname}`;  // Write as empty username + token
    }
    
    
    // Use git credential
    try{
        configFile = configFilePath();   // Assumes that this file is imported into app.js
        let configFileNormalized = configFile.replaceAll('\\','/');
        let cmd=`export GIT_TERMINAL_PROMPT=0; export  GIT_ASKPASS=''; echo "url=${url}" | git -c "include.path=${configFileNormalized}" credential fill`;
        
        if (repoInfo.localFolder.startsWith('ssh:') ){
            SSH_GIT_CLIENT= STARTDIR + pathsep + 'ssh_folder' + pathsep + 'ssh-git-client'; 
            cmd=`export GIT_TERMINAL_PROMPT=0; export  GIT_ASKPASS=''; echo "url=${url}" | ${SSH_GIT_CLIENT} -PIPED  -c "SSHURL=${repoInfo.localFolder}" -c "include.path=${configFileNormalized}" credential fill`;
        }
        
        console.log(cmd);
        credentialFieldsString = await multiPlatformExecSync( repoInfo.localFolder, cmd, forcelocal = false, mode = 'timeout', 1000); 
    
        creds = util.parseKeyValuePairsFromString(credentialFieldsString);  // Parse text into struct
        creds.url = repoInfo.remoteUrl;  // Add url to creds
    }catch(err){
        creds = {
            protocol: urlParts.protocol.slice(0,-1),  // https: -> https
            host: urlParts.host, 
            path: urlParts.pathname.slice(1),  //   /janaxelsson/test.git -> janaxelsson.test.git
            host: urlParts.host, 
            username: undefined, 
            password: undefined,
            url: repoInfo.remoteUrl
        }
    }

    return creds
}
async function clearCredential( remoteUrl){  // Clear git credential
    
    let repoInfo = getLocalFolder( remoteUrl);
    let folder = CWD_INIT;  // Run in pragma-git folder (folder shouldn't matter)
    
    // Use git credential
    try{
        console.log(`clearCredential( "${remoteUrl}")`);
        configFile = configFilePath();   // Assumes that this file is imported into app.js
        let configFileNormalized = configFile.replaceAll('\\','/');
        
        let cmd=`export GIT_TERMINAL_PROMPT=0; export  GIT_ASKPASS=''; echo "url=${remoteUrl}" | git -c "include.path=${configFileNormalized}" credential reject`;
        
        if (repoInfo.localFolder.startsWith('ssh:') ){
            SSH_GIT_CLIENT= STARTDIR + pathsep + 'ssh_folder' + pathsep + 'ssh-git-client'; 
            cmd=`export GIT_TERMINAL_PROMPT=0; export  GIT_ASKPASS=''; echo "url=${remoteUrl}"  | ${SSH_GIT_CLIENT} -PIPED  -c "SSHURL=${repoInfo.localFolder}" -c "include.path=${configFileNormalized}" credential reject`;
        }
        
        console.log(cmd);
        credentialFieldsString = await multiPlatformExecSync( repoInfo.localFolder, cmd, forcelocal = false, mode = 'timeout', 1000); 
    }catch(err){
        console.warn(`Failed clearCredential( ${remoteUrl}" )`);
        console.warn(err);
    }
}
async function setCredential( remoteUrl, user, password){  // Set git credentials
    
    let repoInfo = getLocalFolder( remoteUrl);
    let folder = CWD_INIT;  // Run in pragma-git folder (folder shouldn't matter)
    
    // Use git credential
    try{
        console.log(`setCredential( "${remoteUrl}", "${user}", "${password}" )`);
        configFile = configFilePath();   // Assumes that this file is imported into app.js
        let configFileNormalized = configFile.replaceAll('\\','/');
        
        let cmd=`export GIT_TERMINAL_PROMPT=0; export  GIT_ASKPASS='';echo "url=${remoteUrl}\nusername=${user}\npassword=${password}\n\n "| git -c "include.path=${configFileNormalized}" credential approve`;
        
        if (repoInfo.localFolder.startsWith('ssh:') ){
            SSH_GIT_CLIENT= STARTDIR + pathsep + 'ssh_folder' + pathsep + 'ssh-git-client'; 
            cmd=`export GIT_TERMINAL_PROMPT=0; export  GIT_ASKPASS=''; echo "url=${remoteUrl}\nusername=${user}\npassword=${password}\n\n " | ${SSH_GIT_CLIENT} -PIPED  -c "SSHURL=${repoInfo.localFolder}" -c "include.path=${configFileNormalized}" credential approve`;
        }
        
        console.log(cmd);
        credentialFieldsString = await multiPlatformExecSync(repoInfo.localFolder, cmd); 
    }catch(err){
        console.warn(`Failed setCredential( "${remoteUrl}", "${user}", "${password}" )`);
        console.warn(err);
    }
}
    function getLocalFolder( remoteUrl){
        // getLocalFolder( remoteUrl) -- gets local folder for remoteUrl (if stored in state.repos)
        // getLocalFolder( )          -- gets local folder for selected repo (if stored in state.repos)
        
        let folder = CWD_INIT;  // Run in pragma-git folder as first guess
        
        // Get folder and remoteUrl (depends on if remoteURL is set or undefined)
        if (remoteUrl == undefined){
            remoteUrl = state.repos[ state.repoNumber].remoteURL; 
            folder = state.repos[ state.repoNumber].localFolder;
        }else{
            // Use local folder for remote repo
            folderIndex = util.findObjectIndex( state.repos, 'remoteURL', remoteUrl );
            folder = state.repos[ folderIndex].localFolder;
        }        
        
        return {localFolder: folder, remoteUrl: remoteUrl };
    }
    
     
    
