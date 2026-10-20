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
async function fs_existsSync( folder_or_sshUrl, sshKey = '') {               // Replaces fs_existsSync( fileOrDir) -- works both for local file and file over SSH
  
  
  //console.log(`SSH_TEMP_FILE_LOCATION = ${SSH_TEMP_FILE_LOCATION}`);
  
  // SSH or local version :
  if ( folder_or_sshUrl.startsWith('ssh:') ){  
    // SSH folder
    try{
		return await sshFileExists( folder_or_sshUrl, sshKey);
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
  async function sshFileExists( sshUrl, sshKey = '') {  
    //  Tests if a file exists
    //
    //  Inputs :
    //    sshUrl                -- git repo's base sshURL
    //    fileRelativeRepoBase  -- file's path relative git repo's base
    //  Output :
    //    true if file exists, false otherwise
    
  
    // run ssh-test-if-file-exists bash script
    try{
        let keyArg = (sshKey && typeof sshKey === 'string' && sshKey.trim().length > 0) ? ` "${sshKey.trim()}"` : '';
        let CMD = `${CWD_INIT}/ssh_folder/ssh-test-if-file-exists "${sshUrl}"${keyArg}`;
        MAIN=global.windows['main_win'];    // Used to call functions defined in Main window
        
        //MAIN.multiPlatformExecSync( sshUrl, CMD);
        await MAIN.multiPlatformExecSync( sshUrl, CMD, forcelocal = false, 'timeout', timeoutInMs = 2000)
        
        fs_existsSync.lastReason = '';
        return true
    }catch (err){
        let msg = (err && err.message) ? err.message : String(err);
        let lower = msg.toLowerCase();
        if (lower.includes('permission denied') || lower.includes('key rejected')) {
            fs_existsSync.lastReason = 'key rejected';
        } else if (lower.includes('timed out') || lower.includes('could not resolve') || lower.includes('connection refused') || lower.includes('no route to host')) {
            fs_existsSync.lastReason = 'no network';
        } else {
            fs_existsSync.lastReason = 'not a folder';
        }
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
function getDefaultSshKey() {
    let os = require('os');
    let path = require('path');
    let fs = require('fs');
    if (global.state?.tools?.defaultSshKey && global.state.tools.defaultSshKey.trim().length > 0) {
        return global.state.tools.defaultSshKey.trim();
    }
    let ed25519Path = path.join(os.homedir(), '.ssh', 'id_ed25519');
    if (fs.existsSync(ed25519Path)) {
        return ed25519Path;
    }
    let rsaPath = path.join(os.homedir(), '.ssh', 'id_rsa');
    if (fs.existsSync(rsaPath)) {
        return rsaPath;
    }
    return ed25519Path;
}

function getSelectedSshKey( mode ) {
    let inputEl = document.getElementById(mode === 'clone' ? 'sshKeyInput_clone' : 'sshKeyInput_add');
    if (inputEl && inputEl.dataset && inputEl.dataset.keyPath && inputEl.dataset.keyPath.trim().length > 0) {
        return inputEl.dataset.keyPath.trim();
    }
    if (inputEl && inputEl.value && inputEl.value.trim().length > 0) {
        return inputEl.value.trim();
    }
    return getDefaultSshKey();
}

function selectSshKey( mode ) {
    let fileInput = document.getElementById(mode === 'clone' ? 'sshKeyFileInput_clone' : 'sshKeyFileInput_add');
    if (fileInput) {
        fileInput.value = '';
        fileInput.click();
    }
}

function onSshKeyFileSelected( mode, inputEl ) {
    if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
    let fs = require('fs');
    let path = require('path');
    let selectedPath = inputEl.files[0].path || inputEl.value || '';
    selectedPath = selectedPath.trim();
    if (!selectedPath) return;

    let displayInput = document.getElementById(mode === 'clone' ? 'sshKeyInput_clone' : 'sshKeyInput_add');
    let noticeEl = document.getElementById(mode === 'clone' ? 'sshKeyNotice_clone' : 'sshKeyNotice_add');
    let resetBtn = document.getElementById(mode === 'clone' ? 'resetSshKeyButton_clone' : 'resetSshKeyButton_add');
    let deployBtn = document.getElementById(mode === 'clone' ? 'deploySshKeyButton_clone' : 'deploySshKeyButton_add');

    let privPath = selectedPath;
    let pubPath = '';
    let isPubSelected = selectedPath.endsWith('.pub');

    if (isPubSelected) {
        pubPath = selectedPath;
        privPath = selectedPath.slice(0, -4);
    } else {
        pubPath = selectedPath + '.pub';
    }

    if (displayInput) {
        displayInput.value = privPath;
        displayInput.dataset.keyPath = privPath;
    }

    if (noticeEl) {
        noticeEl.style.display = 'block';
        if (isPubSelected) {
            if (fs.existsSync(privPath)) {
                noticeEl.style.color = 'var(--green-text, green)';
                noticeEl.textContent = `✓ Public key chosen: ${path.basename(pubPath)}. Matching private key found locally. Only public key will be deployed to server; private key stays local.`;
            } else {
                noticeEl.style.color = 'var(--warn-color, orange)';
                noticeEl.textContent = `⚠ Public key chosen: ${path.basename(pubPath)}, but private key (${path.basename(privPath)}) was not found locally. SSH login requires the matching private key.`;
            }
        } else {
            if (fs.existsSync(pubPath)) {
                noticeEl.style.color = 'var(--green-text, green)';
                noticeEl.textContent = `✓ Key pair confirmed. Public key (${path.basename(pubPath)}) will be deployed to server; private key stays local.`;
            } else {
                noticeEl.style.color = 'var(--dim-text, #888)';
                noticeEl.textContent = `ℹ Private key chosen. Public key will be derived locally via ssh-keygen before deploying. Only the public key will be deployed to server.`;
            }
        }
    }

    if (resetBtn) resetBtn.style.display = 'inline-block';
    if (deployBtn) deployBtn.textContent = 'Deploy public key';

    onServerInputsChanged(mode);
}

function resetSshKeyToDefault( mode ) {
    let fs = require('fs');
    let path = require('path');
    let displayInput = document.getElementById(mode === 'clone' ? 'sshKeyInput_clone' : 'sshKeyInput_add');
    let noticeEl = document.getElementById(mode === 'clone' ? 'sshKeyNotice_clone' : 'sshKeyNotice_add');
    let resetBtn = document.getElementById(mode === 'clone' ? 'resetSshKeyButton_clone' : 'resetSshKeyButton_add');
    let deployBtn = document.getElementById(mode === 'clone' ? 'deploySshKeyButton_clone' : 'deploySshKeyButton_add');
    let fileInput = document.getElementById(mode === 'clone' ? 'sshKeyFileInput_clone' : 'sshKeyFileInput_add');

    if (displayInput) {
        displayInput.value = '';
        delete displayInput.dataset.keyPath;
    }
    if (fileInput) fileInput.value = '';
    if (noticeEl) {
        noticeEl.textContent = '';
        noticeEl.style.display = 'none';
    }
    if (resetBtn) resetBtn.style.display = 'none';

    initSshKeyInputs();

    let defaultKey = getDefaultSshKey();
    if (deployBtn) {
        deployBtn.textContent = fs.existsSync(defaultKey) ? 'Deploy public key' : 'Create key pair';
    }

    onServerInputsChanged(mode);
}

function initSshKeyInputs() {
    let path = require('path');
    let defaultKey = getDefaultSshKey();
    let base = path.basename(defaultKey);
    let cloneInp = document.getElementById('sshKeyInput_clone');
    let addInp = document.getElementById('sshKeyInput_add');
    if (cloneInp && !cloneInp.value) {
        cloneInp.placeholder = `Default (~/.ssh/${base})`;
    }
    if (addInp && !addInp.value) {
        addInp.placeholder = `Default (~/.ssh/${base})`;
    }
}

async function sshTestLogin( sshUrl, keyPath ) {                 // Test if passwordless SSH login works
  // Tests if passwordless SSH login is working
  //
  // Inputs :
  //   sshUrl    -- sshURL to test (e.g. ssh://user@server/)
  //   keyPath   -- optional path to SSH private or public key
  // Output :
  //   string status from ssh-test-login ('STATUS:OK', 'STATUS:KEY_NEEDED', 'STATUS:TIMEOUT', or 'STATUS:ERROR: ...')

  let keyArg = (keyPath && keyPath.trim().length > 0) ? ` "${keyPath.trim()}"` : '';
  let CMD = `${CWD_INIT}/ssh_folder/ssh-test-login "${sshUrl}"${keyArg}`;
  let MAIN = (global.windows && global.windows['main_win']) || (typeof opener !== 'undefined' ? opener : window);
  return await MAIN.multiPlatformExecSync( sshUrl, CMD, false, 'timeout', 8000);
}

async function testSshKeyLogin( mode ) {                        // UI handler for Settings (Clone and Add Repo tabs)
    // Tests SSH key login for 'clone' or 'add' settings tabs and updates UI
    let usernameInput = document.querySelector(mode === 'clone' ? 'input[name="username_clone"]' : 'input[name="username"]');
    let serverInput = document.querySelector(mode === 'clone' ? 'input[name="server_clone"]' : 'input[name="server"]');
    let statusEl = document.getElementById(mode === 'clone' ? 'testSshStatus_clone' : 'testSshStatus_add');
    let testBtn = document.getElementById(mode === 'clone' ? 'testSshLoginButton_clone' : 'testSshLoginButton_add');
    let deployBtn = document.getElementById(mode === 'clone' ? 'deploySshKeyButton_clone' : 'deploySshKeyButton_add');
    let submitBtn = document.getElementById(mode === 'clone' ? 'cloneServerRepoButton' : 'addServerRepoButton');

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
        if (deployBtn) deployBtn.style.display = 'none';
        if (submitBtn) submitBtn.disabled = true;
        return;
    }

    let selectedKey = getSelectedSshKey(mode);

    if (testBtn) testBtn.disabled = true;
    if (deployBtn) deployBtn.disabled = true;
    statusEl.style.color = 'var(--dim-text, #888)';
    statusEl.textContent = 'Testing connection...';

    try {
        let fakeFolder = `ssh://${username}@${server}/`;
        let result = await sshTestLogin(fakeFolder, selectedKey);
        console.log('testSshKeyLogin output:', result);

        if (result && result.includes('STATUS:OK')) {
            statusEl.style.color = 'var(--green-text, green)';
            statusEl.textContent = '✓ Login works (key already set up)';
            if (deployBtn) deployBtn.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
        } else if (result && result.includes('STATUS:KEY_NEEDED')) {
            statusEl.style.color = 'var(--warn-color, orange)';
            statusEl.textContent = 'ℹ Key needed (login not permitted)';
            if (deployBtn) {
                let fs = require('fs');
                let keyExists = fs.existsSync(selectedKey) || fs.existsSync(selectedKey + '.pub');
                deployBtn.textContent = keyExists ? 'Deploy public key' : 'Create key pair';
                deployBtn.style.display = 'inline-block';
                deployBtn.disabled = false;
            }
            if (submitBtn) submitBtn.disabled = true;
        } else if (result && result.includes('STATUS:TIMEOUT')) {
            statusEl.style.color = 'var(--red-text, red)';
            statusEl.textContent = '✗ Connection timed out';
            if (deployBtn) deployBtn.style.display = 'none';
            if (submitBtn) submitBtn.disabled = true;
        } else if (result && result.includes('STATUS:ERROR:')) {
            let errorMsg = result.split('STATUS:ERROR:')[1]?.trim() || 'Unknown error';
            statusEl.style.color = 'var(--red-text, red)';
            statusEl.textContent = '✗ ' + errorMsg;
            if (deployBtn) deployBtn.style.display = 'none';
            if (submitBtn) submitBtn.disabled = true;
        } else {
            statusEl.style.color = 'var(--red-text, red)';
            let cleanRes = (result || 'No response').toString().trim().replace(/[\r\n]+/g, ' ').substring(0, 80);
            statusEl.textContent = '✗ ' + cleanRes;
            if (deployBtn) deployBtn.style.display = 'none';
            if (submitBtn) submitBtn.disabled = true;
        }
    } catch (err) {
        console.error('testSshKeyLogin error:', err);
        statusEl.style.color = 'var(--red-text, red)';
        let msg = (err?.message || err?.toString() || 'Execution failed').replace(/[\r\n]+/g, ' ').substring(0, 80);
        statusEl.textContent = '✗ ' + msg;
        if (deployBtn) deployBtn.style.display = 'none';
        if (submitBtn) submitBtn.disabled = true;
    } finally {
        if (testBtn) testBtn.disabled = false;
    }
}

async function deploySshKey( mode ) {                           // Deploys key pair to remote server and verifies
    let usernameInput = document.querySelector(mode === 'clone' ? 'input[name="username_clone"]' : 'input[name="username"]');
    let serverInput = document.querySelector(mode === 'clone' ? 'input[name="server_clone"]' : 'input[name="server"]');
    let statusEl = document.getElementById(mode === 'clone' ? 'testSshStatus_clone' : 'testSshStatus_add');
    let testBtn = document.getElementById(mode === 'clone' ? 'testSshLoginButton_clone' : 'testSshLoginButton_add');
    let deployBtn = document.getElementById(mode === 'clone' ? 'deploySshKeyButton_clone' : 'deploySshKeyButton_add');
    let submitBtn = document.getElementById(mode === 'clone' ? 'cloneServerRepoButton' : 'addServerRepoButton');

    let username = (usernameInput?.value || '').trim();
    let server = (serverInput?.value || '').trim();

    if (server.includes('@') && !username) {
        username = server.split('@')[0];
        server = server.split('@').slice(1).join('@');
    }

    if (!username || !server) {
        if (statusEl) {
            statusEl.style.color = 'var(--warn-color, orange)';
            statusEl.textContent = 'Please enter username and server first';
        }
        return;
    }

    let selectedKey = getSelectedSshKey(mode);

    if (testBtn) testBtn.disabled = true;
    if (deployBtn) deployBtn.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) {
        statusEl.style.color = 'var(--dim-text, #888)';
        statusEl.textContent = 'Deploying public key to remote server...';
    }

    let fakeFolder = `ssh://${username}@${server}/`;
    let CMD = `${CWD_INIT}/ssh_folder/ssh-generate-key-login ${username} ${server} "${selectedKey}"`;
    let MAIN = (global.windows && global.windows['main_win']) || (typeof opener !== 'undefined' ? opener : window);

    try {
        await MAIN.multiPlatformExecSync( fakeFolder, CMD, false, 'timeout', 60000 );
    } catch (err) {
        console.error('Error when setting up password-less login:', err);
        if (MAIN.displayLongAlert) {
            MAIN.displayLongAlert('Error when setting up password-less login', err, 'error');
        }
        if (MAIN.closeWindowsByTitle) {
            MAIN.closeWindowsByTitle('Credentials');
        }
        try {
            const os = require('os');
            const pathsep = require('path').sep;
            const SIGNALDIR = os.homedir() + pathsep + '.Pragma-git' + pathsep + '.tmp';
            const ASKPASSSIGNALFILE = SIGNALDIR + pathsep + 'pragma-askpass-running';
            if (MAIN.rmLocalFile) MAIN.rmLocalFile(ASKPASSSIGNALFILE);
        } catch (e) {}

        if (statusEl) {
            statusEl.style.color = 'var(--red-text, red)';
            let msg = (err?.message || err?.toString() || 'Key deployment failed').replace(/[\r\n]+/g, ' ').substring(0, 80);
            statusEl.textContent = '✗ ' + msg;
        }
        if (testBtn) testBtn.disabled = false;
        if (deployBtn) deployBtn.disabled = false;
        return;
    } finally {
        if (testBtn) testBtn.disabled = false;
        if (deployBtn) deployBtn.disabled = false;
    }

    // Automatically re-test login after deployment
    await testSshKeyLogin(mode);
}

function onServerInputsChanged( mode ) {                        // Resets validation state when server fields change
    let statusEl = document.getElementById(mode === 'clone' ? 'testSshStatus_clone' : 'testSshStatus_add');
    let deployBtn = document.getElementById(mode === 'clone' ? 'deploySshKeyButton_clone' : 'deploySshKeyButton_add');
    let submitBtn = document.getElementById(mode === 'clone' ? 'cloneServerRepoButton' : 'addServerRepoButton');

    if (statusEl) statusEl.textContent = '';
    if (deployBtn) deployBtn.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;
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
