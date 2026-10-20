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

// Both SSH and LOCAL
async function fs_existsSync( folder_or_sshUrl) {               // Replaces fs_existsSync( fileOrDir) -- works both for local file and file over SSH
  
  
  //console.log(`SSH_TEMP_FILE_LOCATION = ${SSH_TEMP_FILE_LOCATION}`);
  
  // SSH or local version :
  if ( folder_or_sshUrl.startsWith('ssh:') ){  
    // SSH folder
    try{
		return await sshFileExists( folder_or_sshUrl);
	} catch (err){
		console.warn('Error in fs_existsSync : ');
		console.warn(err);
	}
    
    
  }else{    
    // local folder
    try{
		return await fs.existsSync( folder_or_sshUrl ) 
	} catch (err){
		console.warn('Error in fs_existsSync : ');
		console.warn(err);
	}
    
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
        
        //MAIN.multiPlatformExecSync( sshUrl, CMD);
        await MAIN.multiPlatformExecSync( sshUrl, CMD, forcelocal = false, 'timeout', timeoutInMs = 2000)
        
        return true
    }catch (err){
        //console.error(err);
        return false
    }
    
  
  }
  
}
async function fs_mkdir( folder_or_sshUrl) {                    // mkdir -p -- works on both local and over ssh


    // TODO : Make app.js mkdir call this function !


    //if (!fs_existsSync( folder_or_sshUrl)){
        
        
        try{    
            // SSH or local version :
            if ( folder_or_sshUrl.startsWith('ssh:') ){  
                // SSH folder
                
                  // run ssh-get bash script
                  let CMD = `${CWD_INIT}/ssh_folder/ssh-mkdir "${folder_or_sshUrl}"`;
                  MAIN=global.windows['main_win'];    // Used to call functions defined in Main window
                  await MAIN.multiPlatformExecSync( folder_or_sshUrl, CMD, false, 'timeout', 30000);

            }else{    
                // local folder
                fs.mkdirSync( folder_or_sshUrl, { recursive: true });
            }
            
        } catch (err){
                global.warn(`Error in fs_mkdir( "${folder_or_sshUrl}") `);
                global.warn(err);
      
        }
    //}
}

// SSH file read/write 
async function sshGet( sshUrl, fileRelativeRepoBase) {          //  Copy file from ssh to tempFolder
  //
  //  Inputs :
  //    sshUrl                -- git repo's base sshURL
  //    fileRelativeRepoBase  -- file's path relative git repo's base
  //  Output :
  //    absolute path to copied file
  

  // run ssh-get bash script
  let CMD = `${CWD_INIT}/ssh_folder/ssh-get "${sshUrl}" "${fileRelativeRepoBase}"`;
  MAIN=global.windows['main_win'];    // Used to call functions defined in Main window
  await MAIN.multiPlatformExecSync( sshUrl, CMD);
  
  // Return temp-path
  let tempFile = `${SSH_TEMP_FILE_LOCATION}/${fileRelativeRepoBase}`;  // Sloppy with '/' but if windows it will be converted to \\
  
  // Adjust to windows path if WSL
  tempFile = wslToWindowsPath(tempFile)
  
  return tempFile
}
async function sshPut( sshUrl, fileRelativeRepoBase) {          //  Copy file from ssh tempFolder to ssh 
  //
  //  Inputs :
  //    sshUrl                -- git repo's base sshURL
  //    fileRelativeRepoBase  -- file's path relative git repo's base
  //  Output :
  //    none
  

  // run ssh-get bash script
  let CMD = `${CWD_INIT}/ssh_folder/ssh-put "${sshUrl}" "${fileRelativeRepoBase}"`;
  
  MAIN=global.windows['main_win'];    // Used to call functions defined in Main window
  await MAIN.multiPlatformExecSync( sshUrl, CMD);
}
async function sshPutSimple( absoluteLocalFilePath, sshUrl) {   //  Copy file from absoluteLocalFilePath to ssh 
	//  Copy file from ssh to absoluteLocalFilePath
	//
	//  Inputs :
	//    absoluteLocalFilePath  -- local file path with file to put into sshUrl
	//    sshUrl                 -- sshURL with full path to file name to write
	//  Output :
	//    none
	
	
	// run ssh-get-simple bash script
	let CMD = `${CWD_INIT}/ssh_folder/ssh-put-simple "${absoluteLocalFilePath}" "${sshUrl}"`; 
	
	MAIN=global.windows['main_win'];    // Used to call functions defined in Main window
	try{
		await MAIN.multiPlatformExecSync( sshUrl, CMD);
	} catch (err){
		console.error('Error in fs_exisetsSync : ');
		console.error(err);
        throw Error('Error in sshPutSimple')
	}
}

// SSH login test
async function sshTestLogin( sshUrl ) {                         // Test if passwordless SSH login works
  // Tests if passwordless SSH login is working
  //
  // Inputs :
  //   sshUrl    -- sshURL to test (e.g. ssh://user@server/)
  // Output :
  //   string status from ssh-test-login ('STATUS:OK', 'STATUS:KEY_NEEDED', 'STATUS:TIMEOUT', or 'STATUS:ERROR: ...')

  let CMD = `${CWD_INIT}/ssh_folder/ssh-test-login "${sshUrl}"`;
  let MAIN = (global.windows && global.windows['main_win']) || (typeof opener !== 'undefined' ? opener : window);
  return await MAIN.multiPlatformExecSync( sshUrl, CMD, false, 'timeout', 8000);
}

async function testSshKeyLogin( mode ) {                        // UI handler for Settings (Clone and Add Repo tabs)
    // Tests SSH key login for 'clone' or 'add' settings tabs and updates UI
    let usernameInput = document.querySelector(mode === 'clone' ? 'input[name="username_clone"]' : 'input[name="username"]');
    let serverInput = document.querySelector(mode === 'clone' ? 'input[name="server_clone"]' : 'input[name="server"]');
    let checkbox = document.getElementById(mode === 'clone' ? 'setupRemoteKeyLogin_clone' : 'setupRemoteKeyLogin');
    let statusEl = document.getElementById(mode === 'clone' ? 'testSshStatus_clone' : 'testSshStatus_add');
    let btnEl = document.getElementById(mode === 'clone' ? 'testSshLoginButton_clone' : 'testSshLoginButton_add');

    if (!statusEl) return;

    let username = (usernameInput?.value || '').trim();
    let server = (serverInput?.value || '').trim();

    if (server.includes('@') && !username) {
        username = server.split('@')[0];
        server = server.split('@').slice(1).join('@');
    }

    if (!username || !server) {
        statusEl.style.color = 'var(--warn-color, orange)';
        statusEl.textContent = 'Please enter username and server first';
        return;
    }

    if (btnEl) btnEl.disabled = true;
    statusEl.style.color = 'var(--dim-text, #888)';
    statusEl.textContent = 'Testing connection...';

    try {
        let fakeFolder = `ssh://${username}@${server}/`;
        let result = await sshTestLogin(fakeFolder);
        console.log('testSshKeyLogin output:', result);

        if (result && result.includes('STATUS:OK')) {
            statusEl.style.color = 'var(--green-text, green)';
            statusEl.textContent = '✓ Login works (key already set up)';
            if (checkbox) checkbox.checked = false;
        } else if (result && result.includes('STATUS:KEY_NEEDED')) {
            statusEl.style.color = 'var(--warn-color, orange)';
            statusEl.textContent = 'ℹ Key needed (will be deployed on submit)';
            if (checkbox) checkbox.checked = true;
        } else if (result && result.includes('STATUS:TIMEOUT')) {
            statusEl.style.color = 'var(--red-text, red)';
            statusEl.textContent = '✗ Connection timed out';
        } else if (result && result.includes('STATUS:ERROR:')) {
            let errorMsg = result.split('STATUS:ERROR:')[1]?.trim() || 'Unknown error';
            statusEl.style.color = 'var(--red-text, red)';
            statusEl.textContent = '✗ ' + errorMsg;
        } else {
            statusEl.style.color = 'var(--red-text, red)';
            let cleanRes = (result || 'No response').toString().trim().replace(/[\r\n]+/g, ' ').substring(0, 80);
            statusEl.textContent = '✗ ' + cleanRes;
        }
    } catch (err) {
        console.error('testSshKeyLogin error:', err);
        statusEl.style.color = 'var(--red-text, red)';
        let msg = (err?.message || err?.toString() || 'Execution failed').replace(/[\r\n]+/g, ' ').substring(0, 80);
        statusEl.textContent = '✗ ' + msg;
    } finally {
        if (btnEl) btnEl.disabled = false;
    }
}

// WINDOWS specific helpers
function wslToWindowsPath( wslPath) {                           // Transform between WSL and Windows paths (do nothing if linux / macos)
	
	if ( process.platform === 'win32' ) {
		wslPath = wslPath.replace('/mnt/c/', 'C:\\').replaceAll('/','\\');  // Change from wsl path Windows
	}
	return wslPath
}
function windowsToWslPath( windowsPath) {                       // Transform between WSL and Windows paths (do nothing if linux / macos)
	
	if ( process.platform === 'win32' ) {
		windowsPath = windowsPath.replaceAll('\\','/').replace('C:/','/mnt/c/');   // Change from Windows to wsl 
	}
	return windowsPath
}
function getAndCreateWinTempFolder(){                           // Returns windows Appdata/Local/Temp (creates if necessary)
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
