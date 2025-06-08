//
// Functions for working on folder over ssh (I call this ssh-folder)
//
// The functions here are in most cases wrappers to run bash scripts from ssh_folder/
//
// I have not made a module of this, since the debugging in chrome debug is harder with modules
// Import into html-file   <script src="ssh_folder/ssh-folder-lib.js"></script>  to get functions available
// 

// SSH folder (work on a server over ssh)
SSH_TEMP_FILE_LOCATION='/tmp/pragma-git-ssh-folders' // Called TEMP_FILE_LOCATION in ssh_folder/ssh-functions bash script
CWD_INIT = global.CWD_INIT;         // Defined in app.js as base-dir for pragma-git


// =============================================
// fs_existsSync
// =============================================

async function fs_existsSync( folder_or_sshUrl) {  
  // Replaces fs_existsSync( fileOrDir) -- works both for local file and file over SSH
  
  // SSH or local version :
  if ( folder_or_sshUrl.startsWith('ssh:') ){  
    // SSH folder
    return await sshFileExists( folder_or_sshUrl);
    
  }else{    
    // local folder
    return await fs.existsSync( folder_or_sshUrl ) 
  }
  
  // Internal function
  async function sshFileExists( sshUrl) {  
    //  Tests if a file exists
    //
    //  Inputs :
    //    sshUrl                -- git repo's base sshURL
    //    fileRelativeRepoBase  -- file's path relative git repo's base
    //  Output :
    //    true if file exists, false otherwise
    
  
    // run ssh-test-if-file-exists bash script
    try{
        let CMD = `${CWD_INIT}/ssh_folder/ssh-test-if-file-exists "${sshUrl}"`;
        MAIN=global.windows['main_win'];    // Used to call functions defined in Main window
        MAIN.multiPlatformExecSync( undefined, CMD);
        return true
    }catch (err){
        console.error(err);
        return false
    }
    
  
  }
  
}

// =============================================
// sshFileExists
// =============================================

  

// =============================================
// sshGet
// =============================================
async function sshGet( sshUrl, fileRelativeRepoBase) {  
  //  Copy file from ssh to tempFolder
  //
  //  Inputs :
  //    sshUrl                -- git repo's base sshURL
  //    fileRelativeRepoBase  -- file's path relative git repo's base
  //  Output :
  //    absolute path to copied file
  

  // run ssh-get bash script
  let CMD = `${CWD_INIT}/ssh_folder/ssh-get "${sshUrl}" "${fileRelativeRepoBase}"`;
  MAIN=global.windows['main_win'];    // Used to call functions defined in Main window
  MAIN.multiPlatformExecSync( undefined, CMD);
  
  // Return temp-path
  let tempFile = `${SSH_TEMP_FILE_LOCATION}/${fileRelativeRepoBase}`;
  return tempFile
}


// =============================================
// sshPut
// =============================================
async function sshPut( sshUrl, fileRelativeRepoBase) {  
  //  Copy file from ssh to tempFolder
  //
  //  Inputs :
  //    sshUrl                -- git repo's base sshURL
  //    fileRelativeRepoBase  -- file's path relative git repo's base
  //  Output :
  //    absolute path to copied file
  

  // run ssh-get bash script
  let CMD = `${CWD_INIT}/ssh_folder/ssh-put "${sshUrl}" "${fileRelativeRepoBase}"`;
  
  MAIN=global.windows['main_win'];    // Used to call functions defined in Main window
  MAIN.multiPlatformExecSync( undefined, CMD);
  
  // Return temp-path

}

