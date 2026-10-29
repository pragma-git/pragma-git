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
function parseSshUrl(sshUrl) {
    let username = '';
    let host = '';
    let port = '';
    let folder = '';
    if (!sshUrl || typeof sshUrl !== 'string') return { username, host, port, folder };
    try {
        let parsed = new URL(sshUrl);
        username = parsed.username || '';
        host = parsed.hostname || '';
        port = parsed.port || '';
        folder = parsed.pathname || '';
    } catch (e) {
        let clean = sshUrl.replace(/^ssh:\/\//, '');
        let slashIdx = clean.indexOf('/');
        let hostPart = slashIdx >= 0 ? clean.substring(0, slashIdx) : clean;
        folder = slashIdx >= 0 ? clean.substring(slashIdx) : '';
        if (hostPart.includes('@')) {
            username = hostPart.split('@')[0];
            hostPart = hostPart.split('@').slice(1).join('@');
        }
        if (hostPart.includes(':')) {
            host = hostPart.split(':')[0];
            port = hostPart.split(':')[1];
        } else {
            host = hostPart;
        }
    }
    return { username, host, port, folder };
}

function getDefaultSshKey() {
    let os = require('os');
    let path = require('path');
    let fs = require('fs');

    // 1. Explicitly configured default key in Pragma-git settings
    if (global.state?.tools?.defaultSshKey && global.state.tools.defaultSshKey.trim().length > 0) {
        return global.state.tools.defaultSshKey.trim();
    }

    let sshDir = path.join(os.homedir(), '.ssh');
    if (!fs.existsSync(sshDir)) {
        return path.join(sshDir, 'id_ed25519');
    }

    // 2. OpenSSH standard key types in cryptographic priority order
    const standardKeyTypes = ['id_ed25519', 'id_ecdsa', 'id_rsa'];
    for (const keyName of standardKeyTypes) {
        let keyPath = path.join(sshDir, keyName);
        if (fs.existsSync(keyPath)) {
            return keyPath;
        }
    }

    // 3. Dynamic scan: find any private key in ~/.ssh that has a matching .pub file
    try {
        let files = fs.readdirSync(sshDir);
        for (let f of files) {
            if (!f.endsWith('.pub') && !f.startsWith('.') && !['known_hosts', 'authorized_keys', 'config'].includes(f)) {
                if (files.includes(f + '.pub')) {
                    return path.join(sshDir, f);
                }
            }
        }
    } catch (e) {
        // Ignore directory read errors
    }

    // 4. Default target filename if no keys exist on system yet (OpenSSH modern standard)
    return path.join(sshDir, 'id_ed25519');
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
            statusEl.innerHTML = `ℹ Key needed &nbsp;<a href="javascript:void(0)" class="linkLike" style="font-size: 11px;" onclick="openSshConfigDialog({ mode: '${mode}' })">[Setup SSH]</a>`;
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

// =============================================
// UNIFIED SSH CONFIGURATION DIALOG (#sshConfigDialog)
// =============================================

function generateLocalSshKey( keyPath ) {
    let fs = require('fs');
    let path = require('path');
    let os = require('os');
    const { execSync } = require('child_process');

    if (!keyPath || typeof keyPath !== 'string' || keyPath.trim().length === 0) {
        throw new Error('Key path cannot be empty');
    }

    let resolvedPath = keyPath.trim();
    if (resolvedPath.startsWith('~')) {
        resolvedPath = path.join(os.homedir(), resolvedPath.slice(1));
    }
    resolvedPath = path.resolve(resolvedPath);
    if (resolvedPath.endsWith('.pub')) {
        resolvedPath = resolvedPath.slice(0, -4);
    }

    if (fs.existsSync(resolvedPath)) {
        throw new Error(`Key already exists at ${resolvedPath}`);
    }

    let dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    let hostname = os.hostname() || 'local';
    let comment = `pragma-git@${hostname}`;
    let cmd = `ssh-keygen -t ed25519 -f "${resolvedPath}" -N "" -C "${comment}"`;

    let options = {};
    if (process.platform === 'win32') {
        options.shell = 'C:\\Program Files\\git\\usr\\bin\\bash.exe';
        options.env = Object.assign({}, process.env, { PATH: process.env.PATH + ';C:\\Program Files\\git\\usr\\bin' });
    }

    execSync(cmd, options);

    if (process.platform !== 'win32') {
        try {
            fs.chmodSync(resolvedPath, 0o600);
            if (fs.existsSync(resolvedPath + '.pub')) {
                fs.chmodSync(resolvedPath + '.pub', 0o644);
            }
        } catch (e) {}
    }

    return resolvedPath;
}

function getSuggestedNewKeyPath( targetServer ) {
    let fs = require('fs');
    let path = require('path');
    let os = require('os');
    let sshDir = path.join(os.homedir(), '.ssh');
    let standardKey = path.join(sshDir, 'id_ed25519');

    if (!fs.existsSync(standardKey)) {
        return standardKey;
    }

    let suffix = 'pragma';
    if (targetServer && typeof targetServer === 'string' && targetServer.trim().length > 0) {
        let cleanServer = targetServer.replace(/^.*@/, '').replace(/:.*$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        if (cleanServer.length > 0) {
            suffix = cleanServer;
        }
    }

    let candidate = path.join(sshDir, `id_ed25519_${suffix}`);
    if (!fs.existsSync(candidate)) {
        return candidate;
    }

    let counter = 2;
    while (fs.existsSync(path.join(sshDir, `id_ed25519_${suffix}_${counter}`))) {
        counter++;
    }
    return path.join(sshDir, `id_ed25519_${suffix}_${counter}`);
}

let currentSshConfigState = {
    repoIndex: -1,
    mode: '',
    username: '',
    server: '',
    selectedKey: ''
};

function openSshConfigDialog( options = {} ) {
    let dialog = document.getElementById('sshConfigDialog');
    if (!dialog) return;

    let targetDisplay = document.getElementById('sshConfigTargetDisplay');
    let targetInputs = document.getElementById('sshConfigTargetInputs');
    let titleEl = document.getElementById('sshConfigTitle');
    let saveBtn = document.getElementById('sshConfigSaveBtn');
    let statusEl = document.getElementById('sshConfigStatusText');
    let deployBtn = document.getElementById('sshConfigDeployBtn');
    let genPromptBtn = document.getElementById('sshConfigGenPromptBtn');
    let testBtn = document.getElementById('sshConfigTestBtn');

    if (statusEl) statusEl.textContent = '';
    if (deployBtn) deployBtn.style.display = 'none';
    if (genPromptBtn) genPromptBtn.style.display = 'none';
    if (testBtn) testBtn.disabled = false;
    sshConfigToggleGeneratePanel(false);

    if (options.repoIndex !== undefined && options.repoIndex >= 0) {
        currentSshConfigState.repoIndex = options.repoIndex;
        currentSshConfigState.mode = '';
        let repo = (state && state.repos && state.repos[options.repoIndex]) ? state.repos[options.repoIndex] : {};
        let parsed = parseSshUrl(repo.localFolder || '');
        currentSshConfigState.username = parsed.username;
        currentSshConfigState.server = parsed.host + (parsed.port ? ':' + parsed.port : '');
        currentSshConfigState.selectedKey = repo.sshKey || '';

        if (titleEl) titleEl.textContent = 'Configure SSH Connection';
        if (saveBtn) saveBtn.textContent = 'Save & Fix';

        if (targetDisplay && targetInputs) {
            targetDisplay.textContent = (parsed.username ? parsed.username + '@' : '') + currentSshConfigState.server;
            targetDisplay.style.display = 'block';
            targetInputs.style.display = 'none';
        }
    } else if (options.mode) {
        currentSshConfigState.repoIndex = -1;
        currentSshConfigState.mode = options.mode;

        let uInp = document.querySelector(options.mode === 'clone' ? 'input[name="username_clone"]' : 'input[name="username"]');
        let sInp = document.querySelector(options.mode === 'clone' ? 'input[name="server_clone"]' : 'input[name="server"]');
        currentSshConfigState.username = (uInp?.value || '').trim();
        currentSshConfigState.server = (sInp?.value || '').trim();
        currentSshConfigState.selectedKey = getSelectedSshKey(options.mode);

        if (titleEl) titleEl.textContent = 'SSH Connection Setup';
        if (saveBtn) saveBtn.textContent = 'Save & Close';

        if (targetDisplay && targetInputs) {
            if (currentSshConfigState.username && currentSshConfigState.server) {
                targetDisplay.textContent = currentSshConfigState.username + '@' + currentSshConfigState.server;
                targetDisplay.style.display = 'block';
                targetInputs.style.display = 'none';
            } else {
                let uBox = document.getElementById('sshConfigUsername');
                let hBox = document.getElementById('sshConfigHost');
                if (uBox) uBox.value = currentSshConfigState.username;
                if (hBox) hBox.value = currentSshConfigState.server;
                targetDisplay.style.display = 'none';
                targetInputs.style.display = 'flex';
            }
        }
    }

    updateSshConfigKeyDisplay(currentSshConfigState.selectedKey);
    dialog.showModal();
}

function sshConfigToggleGeneratePanel( show ) {
    let panel = document.getElementById('sshConfigGeneratePanel');
    if (!panel) return;

    if (show === undefined) {
        show = (panel.style.display === 'none');
    }

    panel.style.display = show ? 'block' : 'none';
    let statusEl = document.getElementById('sshConfigGenerateStatus');
    if (statusEl) {
        statusEl.textContent = '';
        statusEl.style.display = 'none';
    }

    if (show) {
        let inputEl = document.getElementById('sshConfigNewKeyPath');
        if (inputEl) {
            let suggested = getSuggestedNewKeyPath(currentSshConfigState.server);
            inputEl.value = suggested;
            inputEl.focus();
        }
    }
}

function sshConfigDoGenerateKey() {
    let inputEl = document.getElementById('sshConfigNewKeyPath');
    let statusEl = document.getElementById('sshConfigGenerateStatus');
    let deployBtn = document.getElementById('sshConfigDeployBtn');
    let genPromptBtn = document.getElementById('sshConfigGenPromptBtn');

    let keyPath = (inputEl?.value || '').trim();
    if (!keyPath) {
        if (statusEl) {
            statusEl.style.color = 'var(--red-text, red)';
            statusEl.textContent = 'Please specify a file path for the new key.';
            statusEl.style.display = 'block';
        }
        return;
    }

    try {
        let createdPath = generateLocalSshKey(keyPath);
        currentSshConfigState.selectedKey = createdPath;
        updateSshConfigKeyDisplay(createdPath);
        sshConfigToggleGeneratePanel(false);

        let noticeEl = document.getElementById('sshConfigKeyNotice');
        if (noticeEl) {
            let pathMod = require('path');
            noticeEl.style.display = 'block';
            noticeEl.style.color = 'var(--green-text, green)';
            noticeEl.textContent = `✓ Generated new ED25519 key pair: ${pathMod.basename(createdPath)}. Public key is ready to be deployed to the server; private key stays local.`;
        }

        if (deployBtn) {
            deployBtn.textContent = 'Deploy public key';
            deployBtn.style.display = 'inline-block';
            deployBtn.disabled = false;
        }
        if (genPromptBtn) {
            genPromptBtn.style.display = 'none';
        }

        let mainStatus = document.getElementById('sshConfigStatusText');
        if (mainStatus) {
            mainStatus.style.color = 'var(--dim-text, #888)';
            mainStatus.textContent = 'New key ready. Click "Deploy public key" to install on server.';
        }
    } catch (err) {
        console.error('sshConfigDoGenerateKey error:', err);
        if (statusEl) {
            statusEl.style.color = 'var(--red-text, red)';
            statusEl.textContent = '✗ ' + (err?.message || err?.toString() || 'Generation failed');
            statusEl.style.display = 'block';
        }
    }
}

function updateSshConfigKeyDisplay( keyPath ) {
    let fs = require('fs');
    let path = require('path');
    let keyInput = document.getElementById('sshConfigKeyInput');
    let resetBtn = document.getElementById('sshConfigResetKeyButton');
    let noticeEl = document.getElementById('sshConfigKeyNotice');
    let deployBtn = document.getElementById('sshConfigDeployBtn');

    let defaultKey = getDefaultSshKey();
    let hasExplicitKey = (keyPath && typeof keyPath === 'string' && keyPath.trim().length > 0);

    if (keyInput) {
        if (hasExplicitKey) {
            keyInput.value = keyPath.trim();
        } else {
            keyInput.value = '';
            keyInput.placeholder = `Default (~/.ssh/${path.basename(defaultKey)})`;
        }
    }

    if (resetBtn) {
        resetBtn.style.display = hasExplicitKey ? 'inline-block' : 'none';
    }

    if (noticeEl) {
        noticeEl.style.display = 'block';
        if (hasExplicitKey) {
            let privPath = keyPath.trim();
            let pubPath = '';
            let isPubSelected = privPath.endsWith('.pub');
            if (isPubSelected) {
                pubPath = privPath;
                privPath = privPath.slice(0, -4);
            } else {
                pubPath = privPath + '.pub';
            }

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
        } else {
            if (fs.existsSync(defaultKey)) {
                noticeEl.style.color = 'var(--dim-text, #888)';
                noticeEl.textContent = `ℹ Using default local key (${path.basename(defaultKey)}). Private key stays local.`;
            } else {
                noticeEl.style.color = 'var(--dim-text, #888)';
                noticeEl.textContent = `ℹ No standard key found at ~/.ssh/id_ed25519. You can select an existing key or create a new key pair.`;
            }
        }
    }

    let activeKey = hasExplicitKey ? keyPath.trim() : defaultKey;
    if (deployBtn) {
        let keyExists = fs.existsSync(activeKey) || fs.existsSync(activeKey + '.pub');
        deployBtn.textContent = keyExists ? 'Deploy public key' : 'Create key pair';
    }
}

function sshConfigSelectKey() {
    let fileInput = document.getElementById('sshConfigKeyFileInput');
    if (fileInput) {
        fileInput.value = '';
        fileInput.click();
    }
}

function onSshConfigFilePicked( inputEl ) {
    if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
    let selectedPath = inputEl.files[0].path || inputEl.value || '';
    selectedPath = selectedPath.trim();
    if (!selectedPath) return;

    let privPath = selectedPath;
    if (selectedPath.endsWith('.pub')) {
        privPath = selectedPath.slice(0, -4);
    }
    currentSshConfigState.selectedKey = privPath;
    updateSshConfigKeyDisplay(privPath);

    let statusEl = document.getElementById('sshConfigStatusText');
    if (statusEl) statusEl.textContent = '';
    let deployBtn = document.getElementById('sshConfigDeployBtn');
    if (deployBtn) deployBtn.style.display = 'none';
}

function sshConfigResetKey() {
    currentSshConfigState.selectedKey = '';
    updateSshConfigKeyDisplay('');
    let fileInput = document.getElementById('sshConfigKeyFileInput');
    if (fileInput) fileInput.value = '';

    let statusEl = document.getElementById('sshConfigStatusText');
    if (statusEl) statusEl.textContent = '';
    let deployBtn = document.getElementById('sshConfigDeployBtn');
    if (deployBtn) deployBtn.style.display = 'none';
}

async function sshConfigTestLogin() {
    let statusEl = document.getElementById('sshConfigStatusText');
    let testBtn = document.getElementById('sshConfigTestBtn');
    let deployBtn = document.getElementById('sshConfigDeployBtn');
    let targetInputs = document.getElementById('sshConfigTargetInputs');

    if (targetInputs && targetInputs.style.display !== 'none') {
        currentSshConfigState.username = (document.getElementById('sshConfigUsername')?.value || '').trim();
        currentSshConfigState.server = (document.getElementById('sshConfigHost')?.value || '').trim();
    }

    let username = currentSshConfigState.username;
    let server = currentSshConfigState.server;

    if (!username || !server) {
        if (statusEl) {
            statusEl.style.color = 'var(--warn-color, orange)';
            statusEl.textContent = 'Please enter username and server first';
        }
        return;
    }

    let keyToTest = currentSshConfigState.selectedKey || getDefaultSshKey();

    if (testBtn) testBtn.disabled = true;
    if (deployBtn) deployBtn.disabled = true;
    if (statusEl) {
        statusEl.style.color = 'var(--dim-text, #888)';
        statusEl.textContent = 'Testing connection...';
    }

    try {
        let fakeFolder = `ssh://${username}@${server}/`;
        let result = await sshTestLogin(fakeFolder, keyToTest);
        console.log('sshConfigTestLogin result:', result);

        if (result && result.includes('STATUS:OK')) {
            statusEl.style.color = 'var(--green-text, green)';
            statusEl.textContent = '✓ Login works (key already set up)';
            if (deployBtn) deployBtn.style.display = 'none';
            let genPromptBtn = document.getElementById('sshConfigGenPromptBtn');
            if (genPromptBtn) genPromptBtn.style.display = 'none';
        } else if (result && result.includes('STATUS:KEY_NEEDED')) {
            statusEl.style.color = 'var(--warn-color, orange)';
            statusEl.textContent = 'ℹ Key needed (login not permitted)';
            if (deployBtn) {
                deployBtn.textContent = 'Deploy public key';
                deployBtn.style.display = 'inline-block';
                deployBtn.disabled = false;
            }
            let genPromptBtn = document.getElementById('sshConfigGenPromptBtn');
            if (genPromptBtn) {
                genPromptBtn.style.display = 'inline-block';
            }
        } else if (result && result.includes('STATUS:TIMEOUT')) {
            statusEl.style.color = 'var(--red-text, red)';
            statusEl.textContent = '✗ Connection timed out';
            if (deployBtn) deployBtn.style.display = 'none';
            let genPromptBtn = document.getElementById('sshConfigGenPromptBtn');
            if (genPromptBtn) genPromptBtn.style.display = 'none';
        } else if (result && result.includes('STATUS:ERROR:')) {
            let errorMsg = result.split('STATUS:ERROR:')[1]?.trim() || 'Unknown error';
            statusEl.style.color = 'var(--red-text, red)';
            statusEl.textContent = '✗ ' + errorMsg;
            if (deployBtn) deployBtn.style.display = 'none';
            let genPromptBtn = document.getElementById('sshConfigGenPromptBtn');
            if (genPromptBtn) genPromptBtn.style.display = 'none';
        } else {
            statusEl.style.color = 'var(--red-text, red)';
            let cleanRes = (result || 'No response').toString().trim().replace(/[\r\n]+/g, ' ').substring(0, 80);
            statusEl.textContent = '✗ ' + cleanRes;
            if (deployBtn) deployBtn.style.display = 'none';
            let genPromptBtn = document.getElementById('sshConfigGenPromptBtn');
            if (genPromptBtn) genPromptBtn.style.display = 'none';
        }
    } catch (err) {
        console.error('sshConfigTestLogin error:', err);
        if (statusEl) {
            statusEl.style.color = 'var(--red-text, red)';
            let msg = (err?.message || err?.toString() || 'Execution failed').replace(/[\r\n]+/g, ' ').substring(0, 80);
            statusEl.textContent = '✗ ' + msg;
        }
        if (deployBtn) deployBtn.style.display = 'none';
        let genPromptBtn = document.getElementById('sshConfigGenPromptBtn');
        if (genPromptBtn) genPromptBtn.style.display = 'none';
    } finally {
        if (testBtn) testBtn.disabled = false;
    }
}

async function sshConfigDeployKey() {
    let statusEl = document.getElementById('sshConfigStatusText');
    let testBtn = document.getElementById('sshConfigTestBtn');
    let deployBtn = document.getElementById('sshConfigDeployBtn');

    let username = currentSshConfigState.username;
    let server = currentSshConfigState.server;
    let keyToDeploy = currentSshConfigState.selectedKey || getDefaultSshKey();

    if (!username || !server) return;

    if (testBtn) testBtn.disabled = true;
    if (deployBtn) deployBtn.disabled = true;
    if (statusEl) {
        statusEl.style.color = 'var(--dim-text, #888)';
        statusEl.textContent = 'Deploying public key to remote server...';
    }

    let fakeFolder = `ssh://${username}@${server}/`;
    let CMD = `${CWD_INIT}/ssh_folder/ssh-generate-key-login ${username} ${server} "${keyToDeploy}"`;
    let MAIN = (global.windows && global.windows['main_win']) || (typeof opener !== 'undefined' ? opener : window);

    try {
        await MAIN.multiPlatformExecSync( fakeFolder, CMD, false, 'timeout', 60000 );
    } catch (err) {
        console.error('sshConfigDeployKey error:', err);
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
    await sshConfigTestLogin();
}

async function closeSshConfigDialog( save = false ) {
    let dialog = document.getElementById('sshConfigDialog');
    if (!dialog) return;

    if (!save) {
        dialog.close();
        return;
    }

    let targetInputs = document.getElementById('sshConfigTargetInputs');
    if (targetInputs && targetInputs.style.display !== 'none') {
        currentSshConfigState.username = (document.getElementById('sshConfigUsername')?.value || '').trim();
        currentSshConfigState.server = (document.getElementById('sshConfigHost')?.value || '').trim();
    }

    let chosenKey = currentSshConfigState.selectedKey || '';

    if (currentSshConfigState.repoIndex >= 0) {
        let idx = currentSshConfigState.repoIndex;
        if (typeof state !== 'undefined' && state.repos && state.repos[idx]) {
            state.repos[idx].sshKey = chosenKey;
            if (typeof opener !== 'undefined' && opener.saveSettings) {
                opener.saveSettings();
            }
            if (typeof recheckRepoStatus === 'function') {
                await recheckRepoStatus(idx);
            }
            if (state.repoNumber === idx && typeof updateProjectFolderInfo === 'function') {
                updateProjectFolderInfo();
            }
        }
    } else if (currentSshConfigState.mode) {
        let mode = currentSshConfigState.mode;
        let keyInput = document.getElementById(mode === 'clone' ? 'sshKeyInput_clone' : 'sshKeyInput_add');
        if (keyInput) {
            keyInput.value = chosenKey;
            keyInput.dataset.keyPath = chosenKey;
        }

        if (currentSshConfigState.username) {
            let uInp = document.querySelector(mode === 'clone' ? 'input[name="username_clone"]' : 'input[name="username"]');
            if (uInp) uInp.value = currentSshConfigState.username;
        }
        if (currentSshConfigState.server) {
            let sInp = document.querySelector(mode === 'clone' ? 'input[name="server_clone"]' : 'input[name="server"]');
            if (sInp) sInp.value = currentSshConfigState.server;
        }

        let dlgStatus = document.getElementById('sshConfigStatusText')?.textContent || '';
        let tabStatus = document.getElementById(mode === 'clone' ? 'testSshStatus_clone' : 'testSshStatus_add');
        let submitBtn = document.getElementById(mode === 'clone' ? 'cloneServerRepoButton' : 'addServerRepoButton');
        if (dlgStatus.includes('Login works')) {
            if (tabStatus) {
                tabStatus.style.color = 'var(--green-text, green)';
                tabStatus.textContent = '✓ Login works';
            }
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    dialog.close();
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

// Export for Node.js environments / automated tests
if (typeof module !== 'undefined' && module.exports) {
	module.exports.parseSshUrl = parseSshUrl;
	module.exports.getDefaultSshKey = getDefaultSshKey;
	module.exports.getSelectedSshKey = getSelectedSshKey;
	module.exports.resetSshKeyToDefault = resetSshKeyToDefault;
	module.exports.generateLocalSshKey = generateLocalSshKey;
	module.exports.getSuggestedNewKeyPath = getSuggestedNewKeyPath;
	module.exports.openSshConfigDialog = openSshConfigDialog;
	module.exports.updateSshConfigKeyDisplay = updateSshConfigKeyDisplay;
	module.exports.closeSshConfigDialog = closeSshConfigDialog;
	module.exports.wslToWindowsPath = wslToWindowsPath;
	module.exports.windowsToWslPath = windowsToWslPath;
	module.exports.getAndCreateWinTempFolder = getAndCreateWinTempFolder;
}
