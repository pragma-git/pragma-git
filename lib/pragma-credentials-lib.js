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
    // Deprecated: Auto-storing credential.username in local .git/config is disabled because it locks 
    // the repo to a single global account and causes password-dialog loops when multiple accounts or remotes are used.
    return;
}
function cleanCredentialUrl(remoteUrl) {
    if (!remoteUrl || typeof remoteUrl !== 'string') return '';
    let trimmed = remoteUrl.trim();
    try {
        let urlParts = new URL(trimmed);
        return `${urlParts.protocol}//${urlParts.host}${urlParts.pathname}`;
    } catch (e) {
        return trimmed;
    }
}

async function getAllCredentials( ){  // Git credentials for all repos in matrix
    
    let allCredentials = [];
    let seenUrls = Object.create(null);
    
    for (let i = 0; i < state.repos.length; i++) {
        
        try{    
            let remoteUrl = state.repos[ i].remoteURL;
            let localFolder = state.repos[ i].localFolder;
            
            if (!remoteUrl || !remoteUrl.startsWith('http')) {
                allCredentials.push( [] );
                continue;
            }
            
            let cleanUrl = cleanCredentialUrl(remoteUrl);
            if (seenUrls[cleanUrl]) {
                allCredentials.push(seenUrls[cleanUrl]);
                continue;
            }
            
            let creds = await getCredential( remoteUrl);
            seenUrls[cleanUrl] = creds;
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

    let repoInfo = getLocalFolder( remoteUrl);
  
    let urlParts = new URL( repoInfo.remoteUrl);
    let url = `${urlParts.protocol}//${urlParts.host}${urlParts.pathname}`;
    
    let creds = {
        protocol: urlParts.protocol.slice(0,-1),  // https: -> https
        host: urlParts.host, 
        path: urlParts.pathname.slice(1),  //   /janaxelsson/test.git -> janaxelsson/test.git
        username: urlParts.username ? decodeURIComponent(urlParts.username) : undefined, 
        password: urlParts.password ? decodeURIComponent(urlParts.password) : undefined,
        url: url
    }
    
    let folder = repoInfo.localFolder;
    
    // Use git credential
    try{
        let localExecFolder = (folder && !folder.startsWith('ssh:')) ? folder : CWD_INIT;
        configFile = configFilePath(localExecFolder);   // Assumes that this file is imported into app.js
        let configFileNormalized = configFile.replaceAll('\\','/');
        let cmd = `export GIT_TERMINAL_PROMPT=0; export GIT_ASKPASS=''; printf "url=%s\\n\\n" "${url}" | git -c "include.path=${configFileNormalized}" credential fill`;
        
        console.log(cmd);
        let credentialFieldsString = await multiPlatformExecSync( localExecFolder, cmd, forcelocal = false, mode = 'timeout', 1000); 
        let credentialTexts = util.parseKeyValuePairsFromString(credentialFieldsString);  // Parse text into struct

        // If ssh-folder and local credential helper had no password, also check ssh server
        if ((!credentialTexts || !credentialTexts.password) && repoInfo.localFolder && repoInfo.localFolder.startsWith('ssh:')) {
            let sshConfig = configFilePath(folder).replaceAll('\\', '/');
            SSH_GIT_CLIENT = STARTDIR + pathsep + 'ssh_folder' + pathsep + 'ssh-git-client'; 
            let sshCmd = `export GIT_TERMINAL_PROMPT=0; export GIT_ASKPASS=''; printf "url=%s\\n\\n" "${url}" | ${SSH_GIT_CLIENT} -PIPED -c "SSHURL=${repoInfo.localFolder}" -c "include.path=${sshConfig}" credential fill`;
            console.log(sshCmd);
            let sshFieldsString = await multiPlatformExecSync( repoInfo.localFolder, sshCmd, forcelocal = false, mode = 'timeout', 1000);
            credentialTexts = util.parseKeyValuePairsFromString(sshFieldsString);
        }

        if (credentialTexts && credentialTexts.username) {
            creds.username = credentialTexts.username;
        }
        if (credentialTexts && credentialTexts.password) {
            creds.password = credentialTexts.password;
        }
        creds.url = url;  // Normalized clean url without embedded username:password
    }catch(err){

    }

    return creds
}
async function clearCredential( remoteUrl){  // Clear git credential
    
    let repoInfo = getLocalFolder( remoteUrl);
    let folder = repoInfo.localFolder;
    let cleanUrl = cleanCredentialUrl(remoteUrl || repoInfo.remoteUrl);
    
    // Use git credential
    try{
        console.log(`clearCredential( "${cleanUrl}")`);
        let localExecFolder = (folder && !folder.startsWith('ssh:')) ? folder : CWD_INIT;
        configFile = configFilePath(localExecFolder);   // Assumes that this file is imported into app.js
        let configFileNormalized = configFile.replaceAll('\\','/');
        
        let cmd = `export GIT_TERMINAL_PROMPT=0; export GIT_ASKPASS=''; printf "url=%s\\n\\n" "${cleanUrl}" | git -c "include.path=${configFileNormalized}" credential reject`;
        
        if (repoInfo.localFolder && repoInfo.localFolder.startsWith('ssh:') ){
            let sshConfig = configFilePath(folder).replaceAll('\\', '/');
            SSH_GIT_CLIENT= STARTDIR + pathsep + 'ssh_folder' + pathsep + 'ssh-git-client'; 
            cmd=`export GIT_TERMINAL_PROMPT=0; export GIT_ASKPASS=''; printf "url=%s\\n\\n" "${cleanUrl}" | ${SSH_GIT_CLIENT} -PIPED -c "SSHURL=${repoInfo.localFolder}" -c "include.path=${sshConfig}" credential reject`;
        }
        
        console.log(cmd);
        credentialFieldsString = await multiPlatformExecSync( repoInfo.localFolder, cmd, forcelocal = false, mode = 'timeout', 1000); 
    }catch(err){
        console.warn(`Failed clearCredential( "${cleanUrl}" )`);
        console.warn(err);
    }
}
async function setCredential( remoteUrl, user, password){  // Set git credentials
    
    let repoInfo = getLocalFolder( remoteUrl);
    let folder = repoInfo.localFolder;
    let cleanUrl = cleanCredentialUrl(remoteUrl || repoInfo.remoteUrl);
    
    // Use git credential
    try{
        console.log(`setCredential( "${cleanUrl}", "${user}", "${password}" )`);
        // Reject any existing credential first so password managers (e.g. macOS Keychain) overwrite old passwords
        await clearCredential(cleanUrl);

        let localExecFolder = (folder && !folder.startsWith('ssh:')) ? folder : CWD_INIT;
        configFile = configFilePath(localExecFolder);   // Assumes that this file is imported into app.js
        let configFileNormalized = configFile.replaceAll('\\','/');
        
        let cmd = `export GIT_TERMINAL_PROMPT=0; export GIT_ASKPASS=''; printf "url=%s\\nusername=%s\\npassword=%s\\n\\n" "${cleanUrl}" "${user}" "${password}" | git -c "include.path=${configFileNormalized}" credential approve`;
        
        if (repoInfo.localFolder && repoInfo.localFolder.startsWith('ssh:') ){
            let sshConfig = configFilePath(folder).replaceAll('\\', '/');
            SSH_GIT_CLIENT= STARTDIR + pathsep + 'ssh_folder' + pathsep + 'ssh-git-client'; 
            cmd=`export GIT_TERMINAL_PROMPT=0; export GIT_ASKPASS=''; printf "url=%s\\nusername=%s\\npassword=%s\\n\\n" "${cleanUrl}" "${user}" "${password}" | ${SSH_GIT_CLIENT} -PIPED -c "SSHURL=${repoInfo.localFolder}" -c "include.path=${sshConfig}" credential approve`;
        }
        
        console.log(cmd);
        credentialFieldsString = await multiPlatformExecSync(repoInfo.localFolder, cmd); 
    }catch(err){
        console.warn(`Failed setCredential( "${cleanUrl}", "${user}", "${password}" )`);
        console.warn(err);
    }
}
    function getLocalFolder( remoteUrl){
        // getLocalFolder( remoteUrl) -- gets local folder for remoteUrl (if stored in state.repos)
        // getLocalFolder( )          -- gets local folder for selected repo (if stored in state.repos)
        
        let folder = CWD_INIT;  // Run in pragma-git folder as first guess
        
        // Get folder and remoteUrl (depends on if remoteURL is set or undefined)
        if (remoteUrl == undefined){
            if (typeof state !== 'undefined' && state.repos && state.repos[ state.repoNumber]){
                remoteUrl = state.repos[ state.repoNumber].remoteURL; 
                folder = state.repos[ state.repoNumber].localFolder;
            }
        }else{
            // Use local folder for remote repo (prefer local non-ssh folders over ssh folders)
            let folderIndex = -1;
            if (typeof state !== 'undefined' && Array.isArray(state.repos) && state.repos.length > 0){
                let targetClean = cleanCredentialUrl(remoteUrl).replace(/\.git\/?$/, '').replace(/\/+$/, '').toLowerCase();
                let exactLocalIdx = -1;
                let exactAnyIdx = -1;
                let normLocalIdx = -1;
                let normAnyIdx = -1;

                for (let i = 0; i < state.repos.length; i++) {
                    let r = state.repos[i];
                    if (!r || !r.remoteURL) continue;
                    let isLocal = r.localFolder && !r.localFolder.startsWith('ssh:');
                    if (r.remoteURL === remoteUrl) {
                        if (isLocal && exactLocalIdx < 0) exactLocalIdx = i;
                        exactAnyIdx = i;
                    }
                    let rClean = cleanCredentialUrl(r.remoteURL).replace(/\.git\/?$/, '').replace(/\/+$/, '').toLowerCase();
                    if (rClean && rClean === targetClean) {
                        if (isLocal && normLocalIdx < 0) normLocalIdx = i;
                        normAnyIdx = i;
                    }
                }

                if (exactLocalIdx >= 0) folderIndex = exactLocalIdx;
                else if (normLocalIdx >= 0) folderIndex = normLocalIdx;
                else if (exactAnyIdx >= 0) folderIndex = exactAnyIdx;
                else if (normAnyIdx >= 0) folderIndex = normAnyIdx;
            }

            if (folderIndex !== null && folderIndex !== undefined && !isNaN(folderIndex) && folderIndex >= 0 && state.repos[folderIndex]){
                folder = state.repos[folderIndex].localFolder;
                remoteUrl = state.repos[folderIndex].remoteURL;
            } else if (typeof state !== 'undefined' && state.repos && state.repos[state.repoNumber]){
                let activeFolder = state.repos[state.repoNumber].localFolder;
                if (activeFolder && !activeFolder.startsWith('ssh:')) {
                    folder = activeFolder;
                }
                if (!remoteUrl && state.repos[state.repoNumber].remoteURL) {
                    remoteUrl = state.repos[state.repoNumber].remoteURL;
                }
            }
        }        
        
        return {localFolder: folder, remoteUrl: remoteUrl };
    }
    
     
    
