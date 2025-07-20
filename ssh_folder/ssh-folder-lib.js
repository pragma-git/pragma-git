//
// Functions for working on folder over ssh (I call this ssh-folder)
//
// The functions here are in most cases wrappers to run bash scripts from ssh_folder/
//
// I have not made a module of this, since the debugging in chrome debug is harder with modules
// Import into html-file   <script src="ssh_folder/ssh-folder-lib.js"></script>  to get functions available
// 

// SSH folder (work on a server over ssh)
let SSH_TEMP_FILE_LOCATION='/tmp/pragma-git-ssh-folders' // Called TEMP_FILE_LOCATION in ssh_folder/ssh-functions bash script
console.log(`SSH_TEMP_FILE_LOCATION = ${SSH_TEMP_FILE_LOCATION}`);
CWD_INIT = global.CWD_INIT;         // Defined in app.js as base-dir for pragma-git

console.log('SSH-FOLDER-LIB.JS');

// Adjust to Windows SSH_TEMP_FILE_LOCATION
if ( process.platform == 'win32' ){
	console.log('win32');
	SSH_TEMP_FILE_LOCATION = getAndCreateWinTempFolder() + '\\pragma-git-ssh-folders';  // os.homedir()\AppData\Local\Temp\pragma-git-ssh-folders
	console.log(`SSH_TEMP_FILE_LOCATION = ${SSH_TEMP_FILE_LOCATION}`);
}



// =============================================
// FUNCTIONS
// =============================================

// All platforms 
async function fs_existsSync( folder_or_sshUrl) {  
  // Replaces fs_existsSync( fileOrDir) -- works both for local file and file over SSH
  console.log(`SSH_TEMP_FILE_LOCATION = ${SSH_TEMP_FILE_LOCATION}`);
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
        MAIN.multiPlatformExecSync( sshUrl, CMD);
        return true
    }catch (err){
        //console.error(err);
        return false
    }
    
  
  }
  
}
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
  MAIN.multiPlatformExecSync( sshUrl, CMD);
  
  // Return temp-path
  let tempFile = `${SSH_TEMP_FILE_LOCATION}/${fileRelativeRepoBase}`;  // Sloppy with '/' but if windows it will be converted to \\
  
  // Adjust to windows path if WSL
  tempFile = wslToWindowsPath(tempFile)
  
  return tempFile
}
async function sshPut( sshUrl, fileRelativeRepoBase) {  
  //  Copy file from ssh to tempFolder
  //
  //  Inputs :
  //    sshUrl                -- git repo's base sshURL
  //    fileRelativeRepoBase  -- file's path relative git repo's base
  //  Output :
  //    none
  

  // run ssh-get bash script
  let CMD = `${CWD_INIT}/ssh_folder/ssh-put "${sshUrl}" "${fileRelativeRepoBase}"`;
  
  MAIN=global.windows['main_win'];    // Used to call functions defined in Main window
  MAIN.multiPlatformExecSync( sshUrl, CMD);
}
async function sshPutSimple( absoluteLocalFilePath, sshUrl) {  
  //  Copy file from ssh to tempFolder
  //
  //  Inputs :
  //    absoluteLocalFilePath  -- local file path with file to put into sshUrl
  //    sshUrl                 -- sshURL with full path to file name to write
  //  Output :
  //    none
  

  // run ssh-get-simple bash script
  let CMD = `${CWD_INIT}/ssh_folder/ssh-put-simple "${absoluteLocalFilePath}" "${sshUrl}"`; 
  
  MAIN=global.windows['main_win'];    // Used to call functions defined in Main window
  MAIN.multiPlatformExecSync( sshUrl, CMD);
}


// Windows specific
function wslToWindowsPath( wslPath) {       // Transform between WSL and Windows paths (do nothing if linux / macos)
	
	if ( process.platform === 'win32' ) {
		wslPath = wslPath.replace('/mnt/c/', 'C:\\').replaceAll('/','\\');  // Change from wsl path Windows
	}
	return wslPath
}
function windowsToWslPath( windowsPath) {   // Transform between WSL and Windows paths (do nothing if linux / macos)
	
	if ( process.platform === 'win32' ) {
		windowsPath = windowsPath.replaceAll('\\','/').replace('C:/','/mnt/c/');   // Change from Windows to wsl 
	}
	return windowsPath
}
function getAndCreateWinTempFolder(){
	const fs = require('fs');
	const path = require('path');
	const os = require('os');
	
	// Get the TEMP folder path
	const tempPath = path.join(os.homedir(), 'AppData', 'Local', 'Temp');
	
	// Check if the folder exists
	if (!fs.existsSync(tempPath)) {
		console.log(`TEMP folder not found. Creating: ${tempPath}`);
		fs.mkdirSync(tempPath, { recursive: true });
	} else {
		console.log(`TEMP folder already exists at: ${tempPath}`);
	}
	return tempPath;  
}
