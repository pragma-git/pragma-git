
// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');
var util = require('./util_module.js'); // Pragma-git common functions
const pathsep = require('path').sep;  // Os-dependent path separator
const path = require('path');
const { execSync } = require('child_process');

let simpleGit = opener.simpleGit; 
let simpleGitLog = opener.simpleGitLog; // Use as with simpleGit, but this one logs through pragmaLog

let githubStar = require('github-star.js'); // Use to star pragma-git
            
// Global for whole app
var state = global.state; // internal copy of global.state
var localState = global.localState; 

var win


// Counter for remote repos dialog    
var remoteRepos ={};  // Struct containing counter for GUI of remote repos
remoteRepos.fetch = {};
remoteRepos.push = {};  // Prepare for having different data in push.  NOTE: not implemented yet
remoteRepos.fetch.pos = 1;  // Default, reserved for remotes/origin

// For provider, updated when pressing "System info" tab
let provider;


// ---------
// FUNCTIONS
// ---------  


// Callbacks 
async function _callback( name, event){

    
    let id = event.id;
    let value, table, data2, branchList;
    var localFolder = "";
    let textareaId, realId;
    let newUrl;

    console.log('_callback = ' + name);
    
    { // Log callbacks
        let eventString = '';
        
        // Prepare logging callback to file
        if ( ( event == undefined ) || ( typeof event !== 'string' ) || ( event.trim() == '' )  ){
            eventString = '';
        } else{
            eventString = '   event  = ' + event;  // Can only be a string at this point
        }
        
        // Log to file
        opener.pragmaLog('settings._callback = ' + name + eventString);
    }
        
    switch(name) {  
        case 'checkboxChanged': {
            console.log('checkboxChanged');
            console.log(event);
            value = event.checked;
            global.state[id] = value;
            opener.pragmaLog('   settings checkbox ' + id + ' = ' + value);
            
            // Reload main if change
            opener.updateWithNewSettings();
            opener.saveSettings();
            opener.win.reload();
            
            break;
        } 
        case 'visualModeChanged': {
            console.log('visualModeChanged');
            console.log(event);
            global.state.darkmode = id;
            opener.pragmaLog('   settings ' + id + ' = ' + value);
            
            // Reload main if Dark mode change
            opener.updateWithNewSettings();
            opener.saveSettings();
            
            break;
        } 
        case 'zoomChanged': {
            value = document.getElementById(id).value;
            
            console.log('zoomChanged');
            console.log(event);
            opener.pragmaLog('   settings ' + id + ' = ' + value);
            
            global.state.zoom = value;
            
            // Reload zoom change
            opener.updateWithNewSettings();
            opener.saveSettings();
            
            break;
        }    
        case 'localCheckboxChanged': {
            console.log('checkboxChanged');
            console.log(event);
            value = event.checked;
            //state[id] = value;
            opener.pragmaLog('   settings checkbox ' + id + ' = ' + value);
            state.repos[state.repoNumber][id] = value;      
            break;
        } 

        case 'useGlobalAuthorInfoCheckboxChanged': {
            console.log('useGlobalAuthorInfoCheckboxChanged');
            value = event.checked;
            
            let globalIsSelected = await document.getElementById('useGlobalAuthorInfo').checked; // true if global checkbox is checked
            let localIsSelected = ! globalIsSelected ;  // Local if not global checked
 
            // Global -- remove local gitconfig
            if ( globalIsSelected){
                // Remove from git-config --local 
                await gitRemoveConfigKey( state.repoNumber, 'user.name', 'local');
                await gitRemoveConfigKey( state.repoNumber, 'user.email', 'local');
                            
                // Display in Settings.html using git-config info
                await displayLocalAuthorInfo();  // Based on git-config info
            }
            
            
            // Local
            if ( localIsSelected){
                
                // Fix null / undefined
                if ( (state.repos[ state.repoNumber ].authorName == null)||(state.repos[ state.repoNumber ].authorName == undefined) ) {
                    state.repos[ state.repoNumber ].authorName = "";
                }
                
                if ( (state.repos[ state.repoNumber ].authorEmail == null)||(state.repos[ state.repoNumber ].authorEmail == undefined) ){
                    state.repos[ state.repoNumber ].authorEmail = "";
                }
                
                // Non-empty user.name, use local
                if ( state.repos[ state.repoNumber ].authorName.trim().length > 0 ){  
                    await gitWriteConfigKey( 'user.name', state.repos[state.repoNumber].authorName, 'local');   
                    await gitWriteConfigKey( 'user.email', state.repos[state.repoNumber].authorEmail, 'local');  
                }
                
                // Empty user.name -- Remove from local gitconfig, 
                if ( state.repos[ state.repoNumber ].authorName.trim().length == 0 ){  
                    await gitRemoveConfigKey( state.repoNumber, 'user.name', 'local');
                    await gitRemoveConfigKey( state.repoNumber, 'user.email', 'local');
                }
                
                // Display in Settings.html based on stored info (entered by user in this session, or stored in settings.json) 
                await directlyDisplayLocalAuthorInfo( 
                    state.repos[state.repoNumber].authorName, 
                    state.repos[state.repoNumber].authorEmail
                );
            }
         
            break;
        }
        case 'localAuthorInfoChanged': {  // Common for user changes of user.name and user.email
            console.log('localAuthorNameChanged');
            console.log(event);
            value = event.checked;
            
            if ( document.getElementById('useGlobalAuthorInfo').checked ){
                return
            }
            
            // Local 
            if ( ! document.getElementById('useGlobalAuthorInfo').checked ){
                // Set git-config --local and store value  
                state.repos[state.repoNumber].authorName = document.getElementById('thisRepoAuthorName').value;
                state.repos[state.repoNumber].authorEmail = document.getElementById('thisRepoAuthorEmail').value;
                try{ 
                    await gitWriteConfigKey( 'user.name', state.repos[state.repoNumber].authorName, 'local');         
                    await gitWriteConfigKey( 'user.email', state.repos[state.repoNumber].authorEmail, 'local');            
                }catch (err) {
                    console.warn(err);
                }
            }
            
            // Make sure that blank authorname does not register into git-config local
            if ( state.repos[ state.repoNumber ].authorName.trim().length == 0 ){
                                
                // Remove from git-config --local 
                await gitRemoveConfigKey( state.repoNumber, 'user.name', 'local');
                await gitRemoveConfigKey( state.repoNumber, 'user.email', 'local');
            }
            
            // Display in Settings.html
            directlyDisplayLocalAuthorInfo( 
                state.repos[state.repoNumber].authorName, 
                state.repos[state.repoNumber].authorEmail
            );
         
            break;
        }
        case 'globalAuthorNameChanged': {
            console.log('globalAuthorNameChanged');
            console.log(event);

            try{ await gitRemoveConfigKey( state.repoNumber, 'user.name', 'global'); }catch (err) {}
            try{ await gitWriteConfigKey( 'user.name', document.getElementById('authorName').value, 'global');   }catch (err) {}

            break;
        }
        case 'globalAuthorEmailChanged': {
            console.log('localAuthorEmailChanged');
            console.log(event);
            
            try{ await gitRemoveConfigKey( state.repoNumber, 'user.email', 'global'); }catch (err) {}
            try{ await gitWriteConfigKey( 'user.email', document.getElementById('authorEmail').value, 'global');   }catch (err) {}

            break;
        }

        case 'hideBranchCheckboxChanged': {
            console.log('hideBranchCheckboxChanged');
            console.log(event);
            
            if (state.repos[ state.repoNumber].hiddenBranches == undefined){
                state.repos[ state.repoNumber].hiddenBranches = [];
            }
            
            
            // Modify hidden branch
            if ( event.checked ){
                // Add if checked
                state.repos[ state.repoNumber].hiddenBranches.push(selectedBranch);
            }else{
                // Remove branch
                let branchIndex = state.repos[ state.repoNumber].hiddenBranches.indexOf(selectedBranch);
                state.repos[ state.repoNumber].hiddenBranches.splice(branchIndex,1);
            }
            
            
            console.log(state.repos[ state.repoNumber].hiddenBranches);
            
            // Update cached branch list
            await opener.cacheBranchList();
                
            break;
        }
        case 'droppedFolder': {
            
            try{
                const item = event.dataTransfer.items[0];
                const entry = item.webkitGetAsEntry();
                    
                var file = item.getAsFile().path;
                file = file.replace(/(\r\n|\n|\r)/gm, ''); // Remove windows EOL characters
                var folder = file; // Guess that a folder was dropped 
            
                if (entry.isFile) {
                    folder = path.dirname(file); // Correct, because file was dropped
                    console.log( 'Folder = ' + folder );
                } 
                
                document.getElementById('addFolder').innerText=folder;
                document.getElementById('cloneFolder').innerText = folder;
            }catch(err){
                
            }

            
            // Remove hover class
            document.getElementById('addFolder').className = '';
            document.getElementById('cloneFolder').className = '';
                                    
            break;
        }
        case 'folderSelectButton' : {
            //This calls the hidden folder dialog input-element in settings.html
            document.getElementById("selectFolderInputButton").value = "";  // Reset value (so that I am allowed to chose the same folder as last time)
            document.getElementById("selectFolderInputButton").click();
            
            break;   
        }    
        case 'folderSelectButtonPressed' : {
            //This should be called when hidden input-element is changed (see id="selectFolderInputButton", in settings.html)
            console.log('Selected folder = ');
            console.log(event.value);
            console.log(event);
            
            let localFolder = event.value;
            
            // I know that the last row has index same as length of number of repos
            document.getElementById('cloneFolder').value = localFolder;
            document.getElementById('addFolder').value = localFolder;
        
            break;
        }   
        case 'cloneButtonPressed' : {
            console.log('cloneButtonPressed');
            
            // I know that the last row has index same as length of number of repos
            id = state.repos.length;
            
            let folder = document.getElementById('cloneFolder').value;  
            let url = document.getElementById('urlToClone').value; 

            if (!url || !url.trim()){
                displayAlert('Clone failed', 'Please enter a repository URL to clone');
                return;
            }
            if (!folder || !folder.trim()){
                displayAlert('Clone failed', 'Please specify a folder to clone to');
                return;
            }
            folder = folder.trim();
            url = url.trim();

            setCloneStatus('Cloning in progress ');

            // If SSH server folder
            if ( folder.startsWith('ssh:') ){
                // Setup password-less login
                let setupKeyCheckbox = document.getElementById('setupRemoteKeyLogin_clone');
                if ( setupKeyCheckbox && setupKeyCheckbox.checked ){
                    try{
                        let username = (document.querySelector('input[name="username_clone"]')?.value || '').trim();
                        let server = (document.querySelector('input[name="server_clone"]')?.value || '').trim();
                        if (username && server) {
                            let selectedKey = (typeof getSelectedSshKey === 'function') ? getSelectedSshKey('clone') : '';
                            let keyArg = (selectedKey && selectedKey.trim().length > 0) ? ` "${selectedKey.trim()}"` : '';
                            let command = `${opener.CWD_INIT}/ssh_folder/ssh-generate-key-login ${username} ${server}${keyArg}`;
                            await opener.multiPlatformExecSync( folder, command, false, 'timeout', 60000);  // Timeout 60 s
                        }
                    }catch (err){
                        console.error('Error in password-less login');
                        opener.displayLongAlert('Error when setting up password-less login', err, 'error'); 
                        console.error(err);
                        
                        // Close Credential windows 
                        opener.closeWindowsByTitle( 'Credentials');
                        
                        // Remove signal file
                        const SIGNALDIR = os.homedir() + pathsep + '.Pragma-git'+ pathsep + '.tmp';
                        const ASKPASSSIGNALFILE = SIGNALDIR + pathsep + 'pragma-askpass-running';  
                        opener.rmLocalFile( ASKPASSSIGNALFILE);

                        setCloneStatus('');
                        return;
                    }
                }

                // Create folder on server if missing
                try {
                    await opener.mkdir(folder);
                } catch (err) {
                    console.error('Error creating folder on server:', err);
                    opener.displayLongAlert('Clone Repository Error', `Could not create folder on server: ${err}`, 'error');
                    setCloneStatus('');
                    return;
                }
            } else {
                // Local folder - create if missing
                try {
                    await opener.mkdir(folder);
                } catch (err) {
                    console.error('Error creating local folder:', err);
                }
            }
            
            const success = await gitClone( folder, url);
            setCloneStatus('');
            if (!success) {
                return;
            }
            
            // Update latest
            await opener.cacheRemoteOriginStatus(id);  // Needs to be updated
            if (opener.cacheFolderStatus) {
                await opener.cacheFolderStatus(id);
            } else if (opener.cacheLocalFolderExistStatus) {
                await opener.cacheLocalFolderExistStatus(id);
            }

            // Replace table 
            document.getElementById("settingsTableBody").innerHTML = ""; 
            await createHtmlTable(document);
            drawBranchTab(document);
               
            // Figure out URL of fork-parent (undefined if not a forked repo)
            let forkParentUrl;
            try{
                let provider = await opener.gitProvider(url)
                forkParentUrl = await provider.getValue('fork-parent');
            }catch (err){
                console.warn('Failed getting fork-parent URL :');
                console.warn(err);
            }
            
            // If forked -- set upstream
            if (forkParentUrl !== undefined) {
                await opener.addUpstream( forkParentUrl);
                updateRemoteRepos();
            }
            
            // Switch to Remote tab
            document.getElementById('gitHubTab').click()

            break;
        }   
        case 'addRepoButtonPressed' : {
            // If folder is a repo -> add
            // If not a repo show dialog doYouWantToInitializeRepoDialog
            // which calls _callback('initializeRepoOK')
            
            console.log('addRepoButtonPressed');
            
            
            let folder = document.getElementById('addFolder').value;  
            
            // Warn if already existing
            index = util.findObjectIndex( state.repos, 'localFolder', folder);  // Local function
            if ( ! isNaN( index) ){
                console.error('DUPLICATE');  // TODO Show dialog, and tell that switching to repo instead.  Skip break!
                displayAlert('Repo already known', 'Repository was added previously, switching to repository');  // The switch occurs in the call to opener.addExistingRepo
            }

			//
			// Make folder for ssh-folder or local repo (if folder missing)
			// 
            if ( folder.startsWith('ssh:') ){

                // mkdir 
				await opener.mkdir(folder);  // Create local folder if it does not exist
                
                try{
                    // Setup password-less login
                    if ( document.getElementById('setupRemoteKeyLogin').checked ){
                        try{
                            let username = document.querySelector('input[name="username"]').value.trim();
                            let server = document.querySelector('input[name="server"]').value.trim();
                            let selectedKey = (typeof getSelectedSshKey === 'function') ? getSelectedSshKey('add') : '';
                            let keyArg = (selectedKey && selectedKey.trim().length > 0) ? ` "${selectedKey.trim()}"` : '';
                            let command = `${opener.CWD_INIT}/ssh_folder/ssh-generate-key-login ${username} ${server}${keyArg}`;
                            await opener.multiPlatformExecSync( folder, command, forcelocal = false, 'timeout', 60000);  // Timeout 60 s
                        }catch (err){
                            console.error('Error in password-less login');
                            opener.displayLongAlert('Error when setting up password-less login', err, 'error'); 
                            console.error(err);
                            
                            // Close Credential windows 
                            opener.closeWindowsByTitle( 'Credentials');
                            
                            
                            // Remove signal file
                            const SIGNALDIR = os.homedir() + pathsep + '.Pragma-git'+ pathsep + '.tmp';
                            const ASKPASSSIGNALFILE = SIGNALDIR + pathsep + 'pragma-askpass-running';  
                            opener.rmLocalFile( ASKPASSSIGNALFILE);

                            return
                        }
                        
                    }
                    
                                              
                    // Check if repo
                    var isRepo;
                    await simpleGit(folder).checkIsRepo(onCheckIsRepo);  // simpleGit for ssh-folder only works if repo is in "state.repos.localFolder"
                    function onCheckIsRepo(err, checkResult) { isRepo = checkResult}

                    
                    	                
	                // If not a repo
	                if (!isRepo){
	                    // Ask permisson to init repo
	                    localState.droppedRepoFolder = folder;
	                    document.getElementById('doYouWantToInitializeRepoDialog').showModal();  // handle in _callback('initializeRepoOK')
	                    return
	                } else {
	                    await opener.addExistingRepo( folder); 
	                    // Replace table 
	                    document.getElementById("settingsTableBody").innerHTML = ""; 
	                    createHtmlTable(document);
	                }
                    
                }catch(error){
					opener.displayLongAlert('Add Repository Error', error, 'error'); 
	                console.warn(error);
	            }
				
				// Add repo as is 
				await opener.addExistingRepo( folder); 
				if (folder.startsWith('ssh:')) {
					let selectedKey = (typeof getSelectedSshKey === 'function') ? getSelectedSshKey('add') : '';
					let idx = util.findObjectIndex(state.repos, 'localFolder', folder);
					if (!isNaN(idx) && state.repos[idx]) {
						state.repos[idx].sshKey = selectedKey;
						opener.saveSettings();
					}
				}
				// Replace table 
				document.getElementById("settingsTableBody").innerHTML = ""; 
				createHtmlTable(document);
            }else{
				// Local Folder in else clause
                opener.mkdir(folder); // Make local folder if not existing
                
                // Dialog if repo does not exist
	            try{
	                var isRepo;
	                await simpleGit(folder).checkIsRepo(onCheckIsRepo);  // simpleGit for ssh-folder only works if repo is in "state.repos.localFolder"
	                function onCheckIsRepo(err, checkResult) { isRepo = checkResult}
	                
	                console.log('dropFolder CHECK IF REPO = ' + isRepo);
	                
	                // If not a repo
	                if (!isRepo){
	                    // Ask permisson to init repo
	                    localState.droppedRepoFolder = folder;
	                    document.getElementById('doYouWantToInitializeRepoDialog').showModal();  // handle in _callback('initializeRepoOK')
	                    return
	                } else {
	                    await opener.addExistingRepo( folder); 
	                    // Replace table 
	                    document.getElementById("settingsTableBody").innerHTML = ""; 
	                    createHtmlTable(document);
	                }
	            }catch(error){
					opener.displayLongAlert('Add Repository Error', error, 'error'); 
	                console.warn(error);
	            }
            }

			            

            
            // Update cached branch list
            await opener.cacheBranchList();
            
            console.log('addRepoButtonPressed');
            
            // Simulate callback for changed repo (fill in some checkboxes specific for current repo)
            await _callback('repoRadiobuttonChanged', {id: state.repoNumber});

        
            break;
        }
        case 'initializeRepoOK' : {
            
            await opener._callback('initializeRepoOK', event);
            
            let folder = document.getElementById('addFolder').value;
            if (folder && folder.startsWith('ssh:')) {
                let selectedKey = (typeof getSelectedSshKey === 'function') ? getSelectedSshKey('add') : '';
                let idx = util.findObjectIndex(state.repos, 'localFolder', folder);
                if (!isNaN(idx) && state.repos[idx]) {
                    state.repos[idx].sshKey = selectedKey;
                    opener.saveSettings();
                }
            }
 
            // update list
            try {
                // Replace table 
                document.getElementById("settingsTableBody").innerHTML = ""; 
                createHtmlTable(document);
                
                // Simulate callback for changed repo (fill in some checkboxes specific for current repo)
                _callback('repoRadiobuttonChanged', {id: state.repoNumber});
            }catch(error){
                console.log(error);
            }
    
            // Update immediately
            await opener._setMode('UNKNOWN');
            await opener._update();
              
            break;  
          }
        case 'repoRadiobuttonChanged': {
            // Callback called the following alternative ways:
            // 1) User clicks radiobutton in settings window_menu_handles_mapping
            // 2) User selects repository in main window, which initiates this callback
            
            let origRepoNumber = state.repoNumber ;

                
            console.log('repoRadiobuttonChanged');
            console.log(event);
                
            try{                    
                
                // Check that repo (both normal and ssh-folder)
                let repoKey = (global.state.repos[ Number(id)] && global.state.repos[ Number(id)].sshKey) ? global.state.repos[ Number(id)].sshKey : '';
                isRepo = await fs_existsSync( `${global.state.repos[ Number(id)].localFolder}/.git/HEAD`, repoKey ); 
                if ( isRepo == false ){
                        // Set to previous    
                        id = origRepoNumber;  
                        document.getElementById(state.repoNumber).click()    
                        return                    
                }
                
                
                // Set state (so it will be updated in main program)
                state.repoNumber = Number(id);  // id can be a string
                if (state.repos[state.repoNumber]) {
                    state.repos[state.repoNumber].lastOpened = new Date().toISOString();
                    opener.saveSettings();
                }
                
                
                // Replace table 
                document.getElementById("branchesTableBody").innerHTML = ""; 
                
                 // Display changes
                table = document.getElementById("branchesTableBody");
                let myLocalFolder = state.repos[id].localFolder;

                
                
                // Update cached branch list
                await opener.cacheBranchList();                
                                
                // Update remote repos dialog
                getRemoteRepoInfo();
                updateRemoteRepos();
                
                //await opener.cacheRemoteOriginStatus();
                document.getElementById( 10000 + Number(id) ).value = state.repos[id].remoteURL;
                
                                
                await drawBranchTab(document);

                
                    
                // Update repo name
                let folderObject =  await opener.gitLocalFolder() ;
                document.getElementById('shortCurrentRepo').innerText = folderObject.folderName;
                document.getElementById('currentRepo').innerText = folderObject.folderPath;
                
                opener.pragmaLog('   repopath = ' + folderObject.folderPath);
                opener.pragmaLog('   repo url = ' + state.repos[state.repoNumber].remoteURL ) ;
                opener.pragmaLog(' ');

                // Set Radiobutton (can be user-clicked from settings-window, or not set because callback initiated from main-window)
                document.getElementById(id).checked=true


                                
                // Update local repo settingsDir
                document.getElementById('allowPushToRemote').checked = state.repos[state.repoNumber].allowPushToRemote;
                if ( state.repos[state.repoNumber].allowPushToRemote ){                                    
                    document.getElementById('autoPushDiv').style.visibility = 'visible';
                }else{
                    document.getElementById('autoPushDiv').style.visibility = 'collapse';
                } 
                
                
                document.getElementById('allowPushToRemote').checked = state.repos[state.repoNumber].allowPushToRemote;
                document.getElementById('autoPushToRemote').checked = state.repos[state.repoNumber].autoPushToRemote;
                
                document.getElementById('NoFF_merge').checked = state.repos[state.repoNumber].NoFF_merge;
                
                
                // Display author info
                await displayLocalAuthorInfo();    
                
                                
                // Update displayed .gitignore     
                document.getElementById('gitignoreText').innerText = ''
                
                let ignoreFileName = global.state.repos[global.state.repoNumber].localFolder + pathsep + '.gitignore'; 
                if (fs_existsSync(ignoreFileName) ){
                    
                    if (global.state.repos[global.state.repoNumber].localFolder.startsWith('ssh:') ){
                        let sshUrl = global.state.repos[global.state.repoNumber].localFolder;
                        ignoreFileName = await sshGet( sshUrl, '.gitignore')
                    }
                    document.getElementById('gitignoreText').innerText = fs.readFileSync(ignoreFileName);
                    
                }
                
                // Update starred button
                await updateStarredButton();

                // Update project folder in system info
                updateProjectFolderInfo();

            }catch(err){
                console.warn(err);
            }
            
            
            // Update Graph & changed list windows
            await opener.updateGraphWindow();
            await opener.updateChangedListWindow();

            
            break;
        }        
        case 'newBranchNameKeyUp': {

            break;   
        } 

        case 'newRemoteRepoButton': {
            
            remoteRepos.fetch.names.push('');
            remoteRepos.fetch.URLs.push('');
            remoteRepos.push.names.push('');
            remoteRepos.push.URLs.push('');
            
            remoteRepos.fetch.pos = remoteRepos.fetch.names.length;
            
            updateRemoteRepos(); // Displays current data in GUI
            break;   
        }  
        case 'setRemoteRepoButton': {
            
            
            let localFolder3 = state.repos[ state.repoNumber].localFolder; 
            
            let index = remoteRepos.fetch.pos - 1;  // pos is recorded in remoteRepos.fetch only (not in remoteRepos.push)
            
            let oldAlias = remoteRepos.fetch.names[index];
            let alias =  document.getElementById('newRepoAliasTextarea').value.trim();
            let newUrl = document.getElementById('additionalRemoteURL').value.trim();
            
              
            // Keep 'origin' alias name fixed
            if ( ( oldAlias == 'origin') &&  ( alias !== oldAlias ) && ( remoteRepos.fetch.pos == 1) ){
                document.getElementById('newRepoAliasTextarea').value = 'origin';
                alias = 'origin'; // Not allowed to change 'origin' alias name
            }          
            

            // Remove remote  
            try{
                await simpleGit(localFolder3).removeRemote( oldAlias,onDeleteRemoteUrl);
                function onDeleteRemoteUrl(err, result) { console.warn(err);console.log(result)}
            }catch (err){
                
            }

            // Update store
            remoteRepos.fetch.names[index] = alias;
            remoteRepos.fetch.URLs[index] = newUrl;
            remoteRepos.push.names[index] = alias;
            remoteRepos.push.URLs[index] = newUrl;
            
            if (index >1){
                remoteRepos.push.URLs[index] = '';  // Push only on origin
            }
            
            
            
            // Add remote url
            try{
                
                // Add remote if url
                    
                if (newUrl.includes('://')){
                    commands = [ 'remote', 'add',alias, newUrl];
                    await simpleGitLog( localFolder3).raw(  commands, onSetRemoteUrl);
                    function onSetRemoteUrl(err, result ){
                    };
                }else{
                    newUrl = '';    
                        
                    // Remove remote origin 
                    if ( opener.cachedBranchList.remoteRepos.fetch.names.includes( alias) ){       
                        await simpleGit(localFolder3).removeRemote(alias,onDeleteRemoteUrl);
                        function onDeleteRemoteUrl(err, result) { console.warn(err);console.log(result)}
                    }
                }

            }catch(err){
                
            } 
            
            let setAliasName = document.getElementById('newRepoAliasTextarea').value ;  // Use to find new position

            
  
            
            testURL('additionalRemoteURL', event);
            
            // Update the remote in the table if needed
            if ( alias == 'origin' ){
                let id = 10000 + state.repoNumber;  // textAreaId in table
                document.getElementById(id).value = newUrl;
                state.repos[state.repoNumber].remoteURL = newUrl;
                testURL( id, event);
                
                await drawProviderIcon( state.repoNumber + 30000, newUrl);
            }

            await opener.cacheBranchList(); 
            remoteRepos.fetch.pos = remoteRepos.fetch.names.indexOf(setAliasName) + 1;            // Set position
            getRemoteRepoInfo(); 
            updateRemoteRepos();            

            break;   
        } 
        case 'removeRemoteRepoButton': {
            
            let alias =  document.getElementById('newRepoAliasTextarea').value;
            
            
            let localFolder3 = state.repos[ state.repoNumber].localFolder; 
            try{
                await simpleGit(localFolder3).removeRemote(alias, onDeleteRemoteUrl);
                function onDeleteRemoteUrl(err, result) { console.warn(err);console.log(result)}
            
            }catch(err){
                console.log('Repository set URL failed');
                console.log(err);
            } 

            await opener.cacheBranchList();
            
            remoteRepos.fetch.pos = 1;  // Default, reserved for remotes/origin 
            state.repos[state.repoNumber].remoteURL = '';
            getRemoteRepoInfo(); 
            updateRemoteRepos();
                        
            // Update the remote in the table if needed
            if ( alias == 'origin' ){
                let id = 10000 + state.repoNumber;
                document.getElementById(id).value = '';
                state.repos[state.repoNumber].remoteURL = '';
            }
                    
            break;   
        } 
        case 'openProviderWindow':{
            if (localState.gitCreateRemoteRepoWindow.open == true){
                return
            }
            
            // Prepare data 
            localState.gitCreateRemoteRepoWindow.data = { name: event.name, provider: event.provider}; 
            console.log(`localState.gitCreateRemoteRepoWindow.data.name = ${localState.gitCreateRemoteRepoWindow.data.name}`);
            
            // Make window
            nw.Window.open('create_remote_repository.html', {id: 'createRemoteRepoWindowId', show: false},
            win => win.on('loaded', function () {
                
                console.log(`localState.gitCreateRemoteRepoWindow.data.name = ${localState.gitCreateRemoteRepoWindow.data.name}`);
                opener.createRemote_win = win;
    
                opener.showWindow(win); // state.onAllWorkspaces=true opens in 1:st workspace. Workaround: creating window hidden (and then show)
                opener.updateWindowMenu( 'Create Remote Repository', 'createRemote_win');
                localState.gitCreateRemoteRepoWindow.open = true;
                
                
                win.on('close', function() { 
                    localState.gitCreateRemoteRepoWindow.open = false;
                    opener.updateWindowMenu('Create Remote Repository');
                    opener.fixNwjsBug7973( win);
                } );
                
                
                // Close when main window is closed (see https://docs.nwjs.io/en/latest/References/Window/#event-closed )
                win.on('closed', function () {
                    win = null;
                 });
               
                 // Listen to main window's close event
                 nw.Window.get().on('close', function () {
                   // Hide the window to give user the feeling of closing immediately
                   this.hide();
               
                   // If the new window is still open then close it.
                   if (win !== null) {
                     win.close(true);
                   }
               
                   // After closing the new window, close the main window.
                   this.close(true);
                 });
                    
                    
                } ));
            
            break;
        }
        
        case 'newBranchNameKeyUp': {

            document.getElementById('branchNameTextarea').value = util.branchCharFilter( document.getElementById('branchNameTextarea').value)
            break;   
        }            
        case 'newRepoAliasKeyUp': {  // Typing name of new remote repo

            document.getElementById('newRepoAliasTextarea').value = util.branchCharFilter( document.getElementById('newRepoAliasTextarea').value)
            break;   
        }        
        case 'addBranchButtonPressed': {
        
            console.log('addBranchButtonPressed');
            console.log(event);
            

            let branchName = document.getElementById('branchNameTextarea').value;
            let localFolder2 = document.getElementById('currentRepo').innerHTML;  // This is what the user sees, so lets use that
            await gitCreateBranch( localFolder2, branchName);

            
        
            
            // Display changes
            table = document.getElementById("branchesTableBody");
            data2 = Object.keys(state.repos[0]);  // Used for headers
            
            branchList = await gitBranchList( localFolder2);
            
            document.getElementById('branchNameTextarea').value = ""; // Clear text field
            
            
            document.getElementById("branchesTableBody").innerHTML = ""; 
            generateBranchTable( document, table, branchList); // generate the new branch table 
            
            
            // Update cached branch list
            opener.cacheBranchList();
            
            break;
        }
        case 'deleteBranchClicked' : {
            let branchName = event;
            localFolder = document.getElementById('currentRepo').innerHTML;  // This is what the user sees, so lets use that
            console.log('deleteBranchClicked -- branch = ' + branchName);
            
            try{
                await simpleGitLog( localFolder ).branch( ['-d', branchName], onDeleteBranch);
                function onDeleteBranch(err, result ){
                    console.log(result);
                    console.log(err); 
                    //opener.pragmaLog(result); 
                }
            }catch(err){ 
                opener.pragmaLog(err); 

                // Most likely, this is because the branch was not fully merged. 
                if ( err.message.includes('is not fully merged') ) {
                    document.getElementById('forceDeleteBranchDialog').showModal(); // Ask if force delete
                }else{                      
                    displayAlert('Failed deleting branch', err);  
                    console.log('Error deleting local branch');
                    console.log(err);
                }
                return
            }
            
            // No errors -- Update branches table 
            table = document.getElementById("branchesTableBody");
            branchList = await gitBranchList( state.repos[ state.repoNumber].localFolder );
            
            document.getElementById("branchesTableBody").innerHTML = ""; 
            generateBranchTable( document, table, branchList); // generate the new branch table 
            

            // Update cached branch list
            opener.cacheBranchList();

            break;
        }
        case 'forceDeleteBranchClicked' : {
            let branchName = event;
            localFolder = document.getElementById('currentRepo').innerHTML;  // This is what the user sees, so lets use that
            console.log('forceDeleteBranchClicked -- branch = ' + branchName);
            
            try{
                await simpleGitLog(  state.repos[ state.repoNumber].localFolder  ).branch( ['-D', branchName], onDeleteBranch);
                function onDeleteBranch(err, result ){
                    console.log(result);
                    console.log(err);
                    //opener.pragmaLog(result); 
                }
            }catch(err){ 
                
                displayAlert('Failed deleting branch', err);  
                console.log('Error deleting local branch');
                console.log(err);
                return
            }
            
            // No errors -- Update branches table            
            table = document.getElementById("branchesTableBody");
            branchList = await gitBranchList( localFolder );
            
            document.getElementById("branchesTableBody").innerHTML = ""; 
            generateBranchTable( document, table, branchList); // generate the new branch table 
            
            break;
        }
        case 'setButtonClicked': {
            // For :
            // - Set button
            // - Test button used in cloning
 
            let isSetButton = event.innerHTML == "Set";    
               
            console.log('setButtonClicked');
            console.log(event);
            
            
            realId = id - 20000; // Test button id:s are offset by 20000 (see generateRepoTable)
            textareaId = realId + 10000; // URL text area id:s are offset by 10000 (see generateRepoTable)
            iconId = realId + 30000;

  
            //  Set remote URL 
            if ( isSetButton ){
                
                // First attempt : Set remote url
                
                let localFolder3 = state.repos[ realId].localFolder; 

                newUrl = document.getElementById(textareaId).value;
                let commands = [ 'remote', 'set-url','origin', newUrl];
                try{
                    
                    // Add remote if url, otherwise remove

                            
                    if (newUrl.includes('://')){
                        await simpleGitLog( localFolder3).raw(  commands, onSetRemoteUrl);
                        function onSetRemoteUrl(err, result ){
                            console.log(result);
                            console.log(err) ;
                            
                            // Set if change didn't cause error (doesn't matter if URL works)
                            state.repos[realId].remoteURL = newUrl;
                        };

                        await drawProviderIcon( iconId, newUrl);
                        
                    }else{
                        
                        // Clear icon (default values)
                        await drawProviderIcon( iconId, '');
                            
                        // Remove remote origin (make it a fork)
                        await simpleGit(localFolder3).removeRemote('origin',onDeleteRemoteUrl);
                        function onDeleteRemoteUrl(err, result) { console.warn(err);console.log(result)}
                        
                        state.repos[ realId].remoteURL = '';

                    }
  
                    
                    
                    
                }catch(err){
                    
                    // Second attempt : Create remote url
                    
                    console.log('Repository set URL failed');
                    console.log(err);
                    console.log('Try adding remote URL instead');
                    
                    try{
                        const commands = [ 'remote', 'add','origin', newUrl];
                        await simpleGitLog( localFolder3).raw(  commands, onSetRemoteUrl);
                        function onSetRemoteUrl(err, result ){
                            console.log(result);
                            console.log(err) ;
                            //opener.pragmaLog(result); 
                            //opener.pragmaLog(err); 
                        };
                        
                        // Set if change didn't cause error (doesn't matter if URL works)
                        state.repos[realId].remoteURL = newUrl;
                    }catch(err){
                        console.log('Repository set URL failed');
                        console.log(err);
                    } 
                    
                    
                    await drawProviderIcon( iconId, newUrl);
                    
                    // Push (doesn't harm, but sends an initial commit if created locally but not yet pushed)
                    opener.gitPush();
                    
                    
                } 
                
                
                
                          
            }
            let workingRemote = testURL(textareaId, event);
            
            // TODO : Bail out -- avoid updating remote if Set button was on wrong repo
            
            // Update Remote tab 
            if ( document.getElementById('newRepoAliasTextarea').value == 'origin' ){
                await opener.cacheBranchList(); 
                getRemoteRepoInfo();
                updateRemoteRepos();
                
                let repoTabUrl = state.repos[ state.repoNumber].remoteURL;  // The url active from radio button
                document.getElementById('additionalRemoteURL').value = repoTabUrl;
            }

            break;
        }

        case 'systemInfoClicked': {
            updateProjectFolderInfo();
            updateGitconfigs(); 
            updateRemoteInfo( )
            updateStarredButton();
            break;
        }
        case 'starPragmaGit': {
            const owner = 'pragma-git';
            const repo = 'pragma-git';
            
            try{
                // TOKEN for current repo
                let creds = await opener.getCredential( state.repos[ state.repoNumber ].remoteUrl);
                let token = creds.password;
                
                // Get star status (this repository)
                let isStarred = await githubStar.isRepositoryStarred(owner, repo, token);
                
                // Set star on pragma-git repository
                if (isStarred){
                    document.getElementById('star-icon').src = "images/github_star_off.png";  // Preview change before it happens (makes i snappier)
                    await githubStar.unstarRepository (owner, repo, token); // unstar
                }else{
                    document.getElementById('star-icon').src = "images/github_star_on.png";  // Preview change before it happens (makes i snappier)
                    await githubStar.starRepository (owner, repo, token);   // star
                }
 
                // Update button
                await updateStarredButton();  // Update button-icon and text according to star-status from remote (can override preview above, if change didn't work) 
            }catch (err){
                console.warn('Failed starring pragma-git from current repository');
                console.warn(err);
            }
            
            break;
        }

        // Software input fields
        case 'gitDiffTool': {
            state.tools.difftool = event.value;
            break;
        }        
        case 'gitMergeTool': {
            state.tools.mergetool = event.value;
            break;
        }        
        case 'fileBrowser': {
            state.tools.fileBrowser = event.value;
            break;
        }        
        case 'terminal': {
            state.tools.terminal = event.value;
            break;
        }
        case 'pathAddition': {
            state.tools.addedPath = event.value;
            opener.setPath(state.tools.addedPath);
            drawPath();
            break;
        } 
        
    } // End switch
    


}

async function testURL( textareaId, event){
    // Works on the "textAreatId" which is an html textarea containing the URL to a git repo.
    //
    // The problem to solve is that testURL should be run from the local folder of the repository.
    //
    // For repo-table :
    //    textareaId is both a html-id, and a number.  The selected button index to state.repos array is  index = state.repoNumber - 10000.
    //    In this case the radiobutton id gives the local folder
    //
    //
    // For other textAreas :
    //    the textAreaId is a html element (and not a number), such as "urlToClone", "setRemoteURLButton" or "additionalRemoteURL"
    //    In this case the radiobutton id gives the local folder, that is "state.repos[ state.repoNumber].localFolder"
    //
    // To summmarize, if textAreaId is a number: derive repoNumber from number.  If not a number, use repoNumber = state.repoNumber.
    
    let folder;
    
    if ( isNaN(textareaId) ){
        // textAreaId is a named html-element-id, and radiobutton (and hence state.repoNumber) is used to get folder:
        folder = state.repos[ state.repoNumber].localFolder;
    }else{
        // textAreaId is a number (as well as a html-element-id) which can be used to get folder:
        folder = state.repos[ Number(textareaId) - 10000].localFolder;
    }
    
    console.log(`Local folder = ${folder}`);
    
    let outputColor = 'red'
    
    document.getElementById(textareaId).classList.add('grey');  // Make grey until known if success or fail
    
    let remoteURL
            
    // Test if remote URL works
    try{
            remoteURL = document.getElementById(textareaId).value;
        
            //console.log('textareaId = ' + textareaId);
            //console.log('remoteURL = ' + remoteURL);
    
             
            const commands = [ 'ls-remote', remoteURL];
            
            // Two versions, with and without askpass dialog
            if ( event.type == 'no_askpass'){
                document.getElementById(textareaId).classList.remove('green');
                document.getElementById(textareaId).classList.remove('grey');
                //document.getElementById(textareaId).classList.add('red'); 

                // const GIT_ASKPASS='';  // GIT_ASKPASS='' inhibits askpass dialog window
                const GIT_TERMINAL_PROMPT=0;  // Makes git ls-remote fail with error instead of showing terminal password question
                await opener.simpleGitLog(folder) .env({ ...process.env, GIT_TERMINAL_PROMPT }).raw(  commands, onListRemote); ;
            }else{
                await simpleGit(folder).raw(  commands, onListRemote); // default askpass 
            }

            function onListRemote(err, result ){
                outputColor = 'green'
                if (result == undefined){
                    outputColor = 'red'
                }
            };


    }catch(err){
        
        outputColor = 'red'
        document.getElementById(textareaId).classList.add('red');
        console.log('Repository test failed ' + remoteURL);
        
        let extraText = ''
        if ( folder.startsWith('ssh:') ){
            extraText = ' (on ssh server)';
        }
        
        opener.displayLongAlert('Failed adding remote repository' + extraText, err, 'error'); 
    }
                
    // Set color        
    document.getElementById(textareaId).classList.remove('green');
    document.getElementById(textareaId).classList.remove('grey');
    document.getElementById(textareaId).classList.remove('red');
    document.getElementById(textareaId).classList.add(outputColor);
 }
async function forgetButtonClicked(event){
    let index = event.currentTarget.getAttribute('id');
    console.log('Settings - button clicked');
    console.log('Settings - event id = ' + index);


    console.log('Settings - state.repos before and after removal of clicked element : ');
    console.log(state.repos);
    
    console.log('Settings - removing index = ' + index);
    
    state.repos.splice(index,1); // Remove index
    
    opener.cachedLocalStatus.exists.splice(index,1); // Remove index
    opener.cachedLocalStatus.isRepo.splice(index,1); // Remove index
    opener.cachedLocalStatus.localFolder.splice(index,1); // Remove index
    opener.cachedLocalStatus.ping.splice(index,1); // Remove index
    
    opener.cachedRemoteOrigins.isActiveRemote.splice(index,1); // Remove index
    opener.cachedRemoteOrigins.remoteURL.splice(index,1); // Remove index
    
    console.log(state.repos);

    
    // Point repoNumber to first repo in list
    state.repoNumber = 0;
    
    if ( state.repos.length == 0){
        let tempRepoNumber = -1;
        state.repoNumber = tempRepoNumber;
        //global.localState.mode = 'UNKNOWN';  // exposed variable from app.js
    }

    
    // Replace table 
    document.getElementById("settingsTableBody").innerHTML = ""; 
    createHtmlTable(document);

    await opener.cacheBranchList();

    console.log('Settings - updating table :');
    
    
    //generateRepoTable( document, table, state.repos); // generate the table first
    
    // Simulate callback for changed repo (fill in some checkboxes specific for current repo)
    await _callback('repoRadiobuttonChanged', {id: state.repoNumber});
    
}
async function closeWindow(){

    // Read fields into state
    if ( !('tools' in state) ){
        state.tools = {};
    }
    state.tools.difftool = document.getElementById('gitDiffTool').value;
    state.tools.mergetool = document.getElementById('gitMergeTool').value;
    state.tools.terminal = document.getElementById('terminal').value;
    state.tools.fileBrowser = document.getElementById('fileBrowser').value;
    state.tools.addedPath = document.getElementById('pathAddition').value;
    
    // Read collapsible into state
    state.settingsWindow = {}; 
    state.settingsWindow.unfolded = {};
    for (i = 0; i < tabButton.length; i++) {
        state.settingsWindow.unfolded[tabButton[i].id] = ( tabButton[i].classList[1] == 'active');
    }
    
    // Read tab into state
    state.settingsWindow.selectedTab = 0;  // First tab default
    for (i = 0; i < tabButton.length; i++) {
        if ( tabButton[i].classList[1] == 'active'){
            state.settingsWindow.selectedTab = i;
        }
    }
    
    // Read Dark mode 
    state.darkmode = document.querySelectorAll("input[name=darkmode]:checked")[0].value;
    
    // Read zoom
    state.zoom =  document.getElementById('zoom').value;
    state.zoomMain = document.getElementById('zoomMain').value;
    
    // Set Git author name and email (stored in git, not in settings)
    try{
        gitWriteConfigKey( 'user.name', document.getElementById('authorName').value, 'global')
    }catch(err){
        console.log('Failed storing git user.name');
    }
    
    try{  
        gitWriteConfigKey( 'user.email', document.getElementById('authorEmail').value, 'global')
    }catch(err){
        console.log('Failed storing git user.email');
    }

    
    // Return (NOTE: Settings window is a'mode' in app.js -- let app.js _update take care of this)
    localState.mode = 'UNKNOWN';
    localState.settings = false;
    
    // Make global when git author's information missing
    await fixEmptyLocalAuthors();
    await opener.saveSettings();
    
    // Remove from Mac menu
    opener.updateWindowMenu('Settings')
    
    // Fix stashMap which may not have been populated
    await opener.gitStashMap( state.repos[state.repoNumber].localFolder )
    
    
 
}


function setCloneStatus(text) {
    let s1 = document.getElementById('cloneStatus');
    let s2 = document.getElementById('cloneStatus_server');
    if (s1) s1.innerHTML = text;
    if (s2) s2.innerHTML = text;
}

// Git
async function gitClone( folderName, repoURL){
     
    //example :
    // /Users/jan/Desktop/TEMP/cloned-TestJanAxelssonTest/
    // https://github.com/JanAxelssonTest/test3.git
    
    // Combine URL and folder name => repo folder
    let repoWithExtension = repoURL.trim().replace(/^.*[\\\/]/, '');
    let repoName = repoWithExtension.endsWith('.git') ? repoWithExtension.slice(0, -4) : repoWithExtension;
    
    let isSsh = folderName.startsWith('ssh:');
    let sep = isSsh ? '/' : pathsep;
    let cleanFolderName = folderName.replace(/[\\\/]+$/, '');
    let topFolder = cleanFolderName + sep + repoName;

    // Clone
    try{
        // 1) mkdir parent folder if missing
        let options = [];
        opener.pragmaLog(`Create folder : ${cleanFolderName}`);
        await opener.mkdir(cleanFolderName);  // Create base folder if it does not exist
        
        // 2) Clone
        let topFolderValidOnServer = topFolder;
        if (isSsh){
            // Clean to make it local on the server
            let url = new URL(topFolder);
            topFolderValidOnServer = decodeURIComponent(url.pathname);
        }
        
        opener.pragmaLog(`Clone : "${repoURL}"  to "${cleanFolderName}"`);
        await simpleGitLog(cleanFolderName).clone(  repoURL, topFolderValidOnServer, options, onClone);  // Only here that topFolderValidOnServer is required (since it runs on server, the ssh-part should be removed)
        function onClone(error, result ){}; 
        
        // 3) Checkout default branch
        await simpleGitLog(topFolder).checkout( onCheckout);
        function onCheckout(err, result){
            if ( err && err.toString().includes('to be born') ) {  // if err == "Error: fatal: You are on a branch yet to be born"
                localState.droppedRepoFolder = topFolder;
                document.getElementById('doYouWantToInitializeRepoDialog').showModal();  // handle in _callback('initializeRepoOK')
                return
            }                    
        };
        
    }catch(err){ 
        console.log(err);
        opener.pragmaLog(err);
        displayAlert('Clone failed', err);
        return false;
    }
        
    // Add this repo to state
    try{
        // Add folder last in  state array
        var index = state.repos.length;
        state.repos[index] = {}; 
        state.repos[index].localFolder = topFolder;
        
        // Fill in state array
        state.repos[index] = opener.fixRepoSettingWithDefault( state.repos[index]);  // Sets missing values to default values
        await opener.cacheRemoteOriginStatus();  // Updates for all repos, but that is fine since this one will be updated as well
        
        // Clean duplicates from state based on name "localFolder"
        state.repos = util.cleanDuplicates( state.repos, 'localFolder' );  // TODO : if cleaned, then I want to set state.repoNumber to the same repo-index that exists
        
        try{
            // Set index to match the folder you added
            index = util.findObjectIndex( state.repos, 'localFolder', topFolder);  // Local function
        }catch(err){
            index = state.repos.length; // Highest should be last added
        }
        
        // Set to current
        state.repoNumber = index;  // Found that it could become a string sometimes
        localState.branchNumber = 0; // Should always start at 0, because that is the first one found in git lookup ( such as used in branchedClicked()  )
    
        // Set global
        state.repos[state.repoNumber].localFolder = topFolder;
        state.repos[state.repoNumber].remoteURL = document.getElementById('urlToClone').value;
        console.log( 'Git  folder = ' + state.repos[state.repoNumber].localFolder );
        console.log( 'Remote  URL = ' + state.repos[state.repoNumber].remoteURL );
        
        // Update "Allow git push" setting
        let allowPush = document.getElementById('allowPushToRemoteClone').checked;  // Read from checkbox in the clone command
        state.repos[state.repoNumber].allowPushToRemote = allowPush;  // Set to state for this repo (so it will be redrawn)
        
        // Set other per repo settings to default value
        state.repos[state.repoNumber].autoPushToRemote = true;
        state.repos[state.repoNumber].NoFF_merge = true;

        if (topFolder.startsWith('ssh:')) {
            let selectedKey = (typeof getSelectedSshKey === 'function') ? getSelectedSshKey('clone') : '';
            if (selectedKey) {
                state.repos[state.repoNumber].sshKey = selectedKey;
            }
        }

        // Change to Software tab (In repo tab, where we already are)
        Array.from(document.querySelectorAll('button')).find(el => el.textContent === 'Software (this repo)').click();
        return true;
    }catch(err){
        console.log(err);
        displayAlert('Failed cloning (settings)', err);
        return false;
    }


} 
async function gitBranchList( folderName){
    let branchList;
    
    try{
        await simpleGit( folderName).branch(['--list'], onBranchList);
        function onBranchList(err, result ){branchList = result.all; };
    }catch(err){        
        console.log('Error determining local branches, in gitBranchList');
        console.log(err);
    }
    return branchList
}
async function gitCreateBranch( folder, branchName){
    
    try{
        const commands = [ 'branch', branchName];
        await simpleGitLog( folder).raw(  commands, onCreateBranch);
        function onCreateBranch(err, result ){
            console.log(result);
            console.log(err);
            //opener.pragmaLog(result); 
        };
    }catch(err){        
        
        displayAlert('Failed creating branch', err);
        console.log('Error creating local branches, in gitCreateBranch');
        console.log(err);
    }

}

async function gitConfigList( localFolder ){
let configList;

try{
    await simpleGit(localFolder).listConfig(onConfigList);
    function onConfigList(err, result ){console.log(result); configList = result.all};
    console.log(configList);
    
}catch(err){        
    console.log('Error determining remote URL, in gitConfigList');
    console.log(err);
}
return configList
}     
async function gitReadConfigKey( repoNumber, key, scope){
    let output;
    try{
        if (scope == 'global'){
            output = await simpleGit( state.repos[ repoNumber].localFolder).getConfig( key, scope);
        }else{
            output = await simpleGit( state.repos[ repoNumber].localFolder).getConfig( key, scope);
        } 
        
        //console.log(output);
    }catch(err){ 
        console.error(err); 
        
    }  
    
    return await output.value;             
}
async function gitWriteConfigKey( key, value, scope){

        
    try{
        if (scope == 'global'){
            await simpleGit( state.repos[ repoNumber].localFolder).addConfig(key, value, false, scope);
        }else{
            await simpleGit( state.repos[ state.repoNumber].localFolder).addConfig(key, value, false, scope);
        } 
        
    }catch(err){ 
        console.error(err); 
    }              
}
async function gitRemoveConfigKey( repoNumber, key, scope){
    try{  
        commands = [ 'config', '--' + scope, '--unset', key];
        await simpleGit(  state.repos[ repoNumber].localFolder  ).raw(commands ,onConfig);
        function onConfig(err, result ){ }
    }catch(err){
        console.error('Failed removing key = ' + key + ' from ' + scope + ' scope');
    }
                       
}

async function fixEmptyLocalAuthors(){ // Empty local author info removed

    for (let i = 0; i < state.repos.length; i++){

        // Default to global authorinfo if missing
        if ( state.repos[i].authorName == undefined || state.repos[i].authorName.trim().length == 0 ){
            
            // Clean from git-config --local 
            try{
                gitRemoveConfigKey( i, 'user.name', 'local');
                gitRemoveConfigKey( i, 'user.email', 'local');
            }catch(err){}
        }
        
        if ( state.repos[i].authorName == undefined) {
            state.repos[i].authorName = "";
        }
        
        if ( state.repos[i].authorEmail == undefined) {
            state.repos[i].authorEmail = "";
        }
        
    }
}

// Start initiated from settings.html
async function injectIntoSettingsJs(document) {
    win = gui.Window.get();

 
    // Set selected tab (in settings.json initially)
    tabButton[state.settingsWindow.selectedTab].click();
 
    // Set Software as first sub-tab in Repo tab
    document.getElementById('SoftwareTab').click(); 
    
       
    _callback('repoRadiobuttonChanged', {id: state.repoNumber});  //draws branchTab too
    await drawRepoTab(document);
    await drawSoftwareTab(document);
    await drawPath() // Write path to System info
    await updateProjectFolderInfo();
    
    
    
    // Set tab from setting
    tabButton[state.settingsWindow.selectedTab].click();
    
        
    // Update remote URLs and test
    //await opener.cacheRemoteOriginStatus();
    

    console.log('Settings - settings.js entered');  
    console.log('Settings - state :');  
    console.log(global.state);
    
    
    // Warn if no repos
    if (state.repos.length == 0){
        
        // Warn if no repos
        displayAlert(
            "No repositories", 
            
            `<p>
                <b>Note : </b>You have not defined any repositories. A new repository can be added from the "Repository tab" on this page by:
                <ol>
                    <li><b>Clone</b> an existing repository from internet (select "Repository", and then "Clone")
            
                    </li>
                    or
                    <li><b>Add</b> an existing project from a local folder  (select "Repository", and then "Add")
        
            
                    </li>
        
                </ol>
                
                
                The manual tells you how to get started (click the question-mark icon  <img style='vertical-align:middle;' height="17" width="17" src="images/questionmark_black.png"> above)
            </p>
            
            <p><b>Alternatively</b>, drop a local folder on the main window to add it as a repository. 
            </p>
            `
        );
        
        
        
        // Set tab to Repo tab
        let tab = 0; // Repository tab
        tabButton[ tab ].click();
        


    }
    
    await drawBranchTab(document);
    console.log( "document.getElementById('warnThatLocalAuthorInfoMissing').style.visibility  = " + document.getElementById('warnThatLocalAuthorInfoMissing').style.visibility );
    
    

};
function drawPath(){
    // Write path to System info 
    if ( os.platform().startsWith('win') ){    
        document.getElementById('path').innerHTML = process.env.PATH
        .replace(/;\s*/g,';<br>'); // Replace semicolons
    }else{
        document.getElementById('path').innerHTML = process.env.PATH.replace(/:\s*/g,':<br>'); // Replace colons 
    }
       
}

// Remote repos functionality
function getRemoteRepoInfo() { // Reads data for current repo

    // Read and put 'origin' first
    let  input = { names: [], URLs: [] } ;

    try {
        input = { names: opener.cachedBranchList.remoteRepos.fetch.names, URLs: opener.cachedBranchList.remoteRepos.fetch.URLs } ;
    }catch (err) {
    }
    
    setOriginFirst( input );
    remoteRepos.fetch.names = input['names'];
    remoteRepos.fetch.URLs  = input['URLs'];
    
    
    input = { names: [], URLs: [] } ;

    try {
        input = { names: opener.cachedBranchList.remoteRepos.push.names, URLs: opener.cachedBranchList.remoteRepos.push.URLs } ;
    }catch (err) {
    }
    
    input = setOriginFirst( input );
    remoteRepos.push.names = input['names'];
    remoteRepos.push.URLs  = input['URLs'];   
    
    //// Add fake origin if empty
    //if (remoteRepos.fetch.names.length == 0){
        //remoteRepos.fetch.names = ['origin'];
        //remoteRepos.fetch.URLs  = [''];
    //}
    //if (remoteRepos.push.names.length == 0){
        //remoteRepos.push.names = ['origin'];
        //remoteRepos.push.URLs  = [''];
    //}    

    
    // Calculate position (using fetch)
    remoteRepos.fetch.max = remoteRepos.fetch.names.length;  
    
    
        
    // Internal function
    function setOriginFirst( input){
        let names = input[ 'names'];
        let URLs = input[ 'URLs'];
        
        if ( !names.includes('origin') ) {
            //return input;
            names.push('origin');
            URLs.push('');
        }
        
        let originIndex = names.indexOf('origin');
        let originURL = URLs[originIndex];  // Store to use later
        
        names.splice(originIndex, 1);
        URLs.splice(originIndex, 1);
        
        // Set new values in returned variables
        input['names'] = ['origin'].concat(names);
        input['URLs'] = [originURL].concat(URLs);
        
        
        return input
    }
    
   
}
function updateRemoteRepos(){ // Displays current data in GUI
    
        
    // Calculate max (using fetch)
    remoteRepos.fetch.max = remoteRepos.fetch.names.length;  // Default, if only remotes/origin.  Other remotes such as upstream will be > 1

    // Position values   
    if ( remoteRepos.fetch.pos > remoteRepos.fetch.names.length ){
        remoteRepos.fetch.pos = 1;
        remoteRepos.fetch.max = remoteRepos.fetch.names.length;
    }
    document.getElementById('remoteReposCurrentPos').innerText = remoteRepos.fetch.pos;
    document.getElementById('remoteReposMax').innerText = remoteRepos.fetch.max;  

    
    // Text areas
    let arrayIndex = remoteRepos.fetch.pos - 1;
    document.getElementById('newRepoAliasTextarea').value = remoteRepos.fetch.names[ arrayIndex]; 
    document.getElementById('additionalRemoteURL').value = remoteRepos.fetch.URLs[ arrayIndex];    
    
    // Update the remote repo in table
    document.getElementById( (10000 + state.repoNumber).toString() ).value = remoteRepos.fetch.URLs[ 0];   
    
     


    // Clean coloring of URL in GUI
    document.getElementById('additionalRemoteURL').classList.remove('green');
    document.getElementById('additionalRemoteURL').classList.remove('grey');
    document.getElementById('additionalRemoteURL').classList.remove('red');
    
    // Show / hide auto-push buttons (only show for remote origin)
    if ( document.getElementById('newRepoAliasTextarea').value == 'origin' ){
        // Auto-push checkboxes
        document.getElementById('allowToPushDiv').style.display = 'block';
        document.getElementById('allowToPushDiv').style.visibility = 'visible';
        
        // Readonly origin
        document.getElementById('newRepoAliasTextarea').readOnly = true;
        document.getElementById('newRepoAliasTextarea').classList.add('readonly')

    }else{
        // Auto-push checkboxes
        document.getElementById('allowToPushDiv').style.display = 'none';
        document.getElementById('allowToPushDiv').style.visibility = 'none';
        
        // Readwrite remote (non-origin)
        document.getElementById('newRepoAliasTextarea').readOnly = false;
        document.getElementById('newRepoAliasTextarea').classList.remove('readonly')

    }
     
    // Show / hide Remove button (only hide for remote origin)
    if ( document.getElementById('newRepoAliasTextarea').value == 'origin' ){
        // Auto-push checkboxes
        document.getElementById('forgetRemoteURLButton').style.display = 'none';
        
    }else{
        // Auto-push checkboxes
        document.getElementById('forgetRemoteURLButton').style.display = 'inline-block';
    }       
    // Update star button
    updateStarredButton();
}

// Draw
async function drawBranchTab(document){
    try{
        if (state.repos[state.repoNumber] !== undefined) {
            let myLocalFolder = state.repos[state.repoNumber].localFolder;
            
            document.getElementById("branchesTableBody").innerHTML = ""; 
            table = document.getElementById("branchesTableBody");
            let branchList = await gitBranchList( myLocalFolder);
            generateBranchTable(document, table, branchList); 
        }
    }catch(err){
        console.error(err);
    }
}
async function drawRepoTab(document){
    
    let data = state.repos;
    let table = document.getElementById("settingsTableBody");
    generateRepoTable(document, table, data);
}
async function  drawProviderIcon( iconId, newUrl){
     // Provider icon
                             
    let iconPath = '/apis_github_and_others/git-provider-icons/Blank.png';
    let webUrl = '';
                    
    try{
        let provider = await opener.gitProvider( newUrl, false); // Run static (second argument = false) to get icon quicker
        iconPath =  await provider.getValue('icon', localState.dark ? 'darkmode' : 'lightmode' );
        webUrl = await provider.getValue('web-url');
    }catch (err){
        
    }
    let img = document.getElementById(iconId);
    let a = img.parentElement;
    
    img.src = iconPath;
    a.href = webUrl;   
    a.setAttribute("onclick", "require('nw.gui').Shell.openExternal( this.href );return false;");
    if (webUrl == ''){
        a.removeAttribute("onclick");
        a.removeAttribute("href");
    }
    
}

async function drawSoftwareTab(document){
    
    // Write system information to divs
    
    let VERSION = require('./package.json').version;
    document.getElementById('version').innerText = VERSION;
    document.getElementById('node-version').innerText = process.version;
    document.getElementById('latestVersion').innerText = localState.LATEST_RELEASE;
    document.getElementById('nw-version').innerText = process.versions['nw']  + '(' + process.versions['nw-flavor'] + ')';
    document.getElementById('platform').innerText = process.platform;
    document.getElementById('nwjs-settings-folder').innerText = nw.App.dataPath;
    
    // MacOS -- figure out code-platform and cpu-info
    if (os.platform().startsWith('darwin') ){
        
        let cpu = execSync('sysctl -n machdep.cpu.brand_string ').toString();  
        let platform = os.machine();  
        document.getElementById('platform').innerText = document.getElementById('platform').innerText  + '(' + platform + '),  ' + cpu;
    }
    

    document.getElementById('gitVersion').innerText = localState.gitVersion;

    
    // Set values according to state variable
    document.getElementById(state.darkmode).checked = true;
    
    document.getElementById('alwaysOnTop').checked = state.alwaysOnTop;
    document.getElementById('onAllWorkspaces').checked = state.onAllWorkspaces;
    document.getElementById('displayToolTip').checked = state.displayToolTip;
    
    document.getElementById('forceCommitBeforeBranchChange').checked = state.forceCommitBeforeBranchChange;
    //document.getElementById('autoPushToRemote').checked = state.autoPushToRemote;
    //document.getElementById('NoFF_merge').checked = state.NoFF_merge;
    document.getElementById('FirstParent').checked = state.FirstParent;
    document.getElementById('StashPop').checked = state.StashPop;
    
    
    document.getElementById('gitDiffTool').value = state.tools.difftool;
    document.getElementById('gitMergeTool').value = state.tools.mergetool;
    document.getElementById('terminal').value = state.tools.terminal;
    document.getElementById('fileBrowser').value = state.tools.fileBrowser;
    document.getElementById('pathAddition').innerText = state.tools.addedPath;
    
    // Set values according to git-config
    try{
        //configList = await gitConfigList( state.repos[state.repoNumber].localFolder ); 
        //console.log(configList);
        document.getElementById('authorName').value  = await gitReadConfigKey( state.repoNumber, 'user.name', 'global');
        document.getElementById('authorEmail').value = await gitReadConfigKey( state.repoNumber, 'user.email','global');
        
        // Show for local repo
        await displayLocalAuthorInfo();
        
    }catch(err){
        console.error(err);
    }
    
    // Set Zoom
    document.getElementById('zoom').value = state.zoom;
    document.getElementById('zoomMain').value = state.zoomMain;

}

async function createHtmlTable(document){
    
    console.log('Settings - createHtmlTable entered');
    console.log('Settings - document :');
    console.log(document)
    
	console.log( opener.cachedRemoteOrigins.isActiveRemote);
		            
    // Set default branch-name
    await opener.registerDefaultBranch(document);
 

    // Repo table           
        
        let table = document.getElementById("settingsTableBody");
        //console.log('Settings - data repos:');

        //// Amend data with a field for remote repo
        //for (let i in state.repos) {
            //let configList;
            //try{
                //configList = await gitConfigList( state.repos[i].localFolder ); 
                //state.repos[i].remoteURL = configList["remote.origin.url"];
                //console.log( state.repos[i].localFolder);
                //console.log( configList["remote.origin.url"]);   
            //}catch(err){
                //configList = [];
                //console.log( state.repos[i].localFolder);
                //console.log( 'Caught error');
            //}
        //}   
        

		console.log( opener.cachedRemoteOrigins.isActiveRemote);
        for (let i in state.repos) {
            state.repos[i].remoteURL = opener.cachedRemoteOrigins.remoteURL[i];
        }
        
        await generateRepoTable( document, table, state.repos); // generate the table first
		console.log( opener.cachedRemoteOrigins.isActiveRemote);


}
async function generateRepoTable(document, table, data) {
    var index = 0; // Used to create button-IDs
    
    
    let foundIndex = 0;  // index matching currentRepoFolder

    
    table.innerHTML = '';
    
    //
    // Add repos to table
    //
    if (state.repos.length > 0) { 
        let currentRepoFolder = state.repos[state.repoNumber].localFolder;   
            
        // Loop rows in data
        for (let element of data) {
            //console.log('Element = ' + element );
     
    
            let cell, text, button, textarea, radiobutton
            let row = table.insertRow();
            
    
             //  Into table cell : Column Repo-path with radiobuttons
            cell = row.insertCell();
            cell.setAttribute("class", 'repoRadioCol');
            
            //
            // LOCAL FOLDER
            //
    
            var radiobox = document.createElement('input');
            radiobox.setAttribute("name", "repoGroup");
            radiobox.setAttribute("onclick", "_callback('repoRadiobuttonChanged',this)");
            radiobox.type = 'radio';
            radiobox.id = index;
            radiobox.value = 'email';
            radiobox.setAttribute("class", 'localFolderRadioButton');
            
            cell.appendChild(radiobox);
            
            
            
            cell = row.insertCell();
            cell.setAttribute("class", 'localFolder');
            
            var label = document.createElement('label')
            label.htmlFor = index;
            
            
            
            // 0. Skapa ett span-element för SSH
            var sshSpan = document.createElement('span');
            sshSpan.textContent = '';
            sshSpan.setAttribute("class", 'ssh');
            if ( element.localFolder.startsWith('ssh')){
                sshSpan.textContent = '[ssh]';
                label.appendChild(sshSpan);
            }
            
            
            // 1. Skapa ett span-element för folder-path (before the last folder name)
            var prefixSpan = document.createElement('span');
            
            
            var directoryPath = path.dirname(element.localFolder) + path.sep; 
            prefixSpan.textContent = directoryPath;
            //prefixSpan.style.color = "gray";       // Sätter färgen direkt till grå
            prefixSpan.style.marginRight = "1px";  // Lägger till ett litet mellanrum efter texten
            
            // VIKTIGT: Gör så att span-elementet inte skapar egna "block-gränser" vid markering
            prefixSpan.style.userSelect = "text"; 
            prefixSpan.style.webkitUserSelect = "text"; // För Chrome/Safari
        
            // 2. Lägg till den  texten  i labeln
            label.appendChild(prefixSpan);
                    
            
            var folderName = document.createTextNode(path.basename(element.localFolder));
            label.appendChild(folderName);
            
            // Sätt samma markeringsregler på själva labeln
            label.style.userSelect = "text";
            label.style.webkitUserSelect = "text";
            label.style.display = "inline"; // Håller texten på en helt rak linje
            
            
            var newline = document.createElement('br');
            
            cell.appendChild(label);
            cell.appendChild(newline);


            // Write the most important warning, overriding with more important if multiple ( order: repo, folder, network for ssh-folder)

                let localStatus = opener.cachedLocalStatus || {};
                let isRepoStatus = localStatus.isRepo ? localStatus.isRepo[index] : true;
                let existsStatus = localStatus.exists ? localStatus.exists[index] : true;
                let pingStatus = localStatus.ping ? localStatus.ping[index] : true;
                let reason = (localStatus.reason && localStatus.reason[index]) ? localStatus.reason[index] : '';

                // Fallback to legacy checks if reason not directly set
                if (!reason) {
                    if ( ( existsStatus == false ) && ( pingStatus == false ) ){
                        reason = 'no network';
                    } else if ( existsStatus == false ){
                        reason = 'not a folder';
                    } else if ( isRepoStatus == false ){
                        reason = 'not a repo';
                    }
                }

                // Local repo status warning (also for ssh folder)
                console.log(`Coloring Local Folder -- exists:${existsStatus} isRepo:${isRepoStatus} reason:${reason} -- ${element.localFolder}`);   
                if ( reason ){
                    label.style.color = (reason === 'key rejected' ? '#e67e22' : 'red');
                    label.innerHTML = '<b><i>(' + reason + ')</i></b> : ' + element.localFolder;
                    radiobox.style.visibility = "hidden";

                    if ( element.localFolder && element.localFolder.startsWith('ssh:') ) {
                        let fixBtn = document.createElement('button');
                        fixBtn.type = 'button';
                        fixBtn.className = 'smallButton';
                        fixBtn.style.padding = '1px 6px';
                        fixBtn.style.marginLeft = '8px';
                        fixBtn.style.verticalAlign = 'middle';
                        fixBtn.textContent = 'Fix';
                        fixBtn.title = 'Configure SSH connection and fix login';
                        (function(idx) {
                            fixBtn.onclick = function(e) {
                                e.stopPropagation();
                                e.preventDefault();
                                if (typeof openSshConfigDialog === 'function') {
                                    openSshConfigDialog({ repoIndex: idx });
                                }
                            };
                        })(index);
                        cell.insertBefore(fixBtn, newline);
                    }
                }                           
            

            
            // Set radio-button to current repo
            if ( currentRepoFolder == element.localFolder){
                radiobox.setAttribute("checked", true);
                foundIndex = index;
            }
            
            //
            // REPO GROUP
            //
            cell = row.insertCell();
            cell.setAttribute("class", 'repoGroupCol');
            row.setAttribute('data-group', element.group || '');

            let groupDisplay = document.createElement('span');
            groupDisplay.setAttribute('class', 'groupDisplay');
            groupDisplay.setAttribute('id', 'groupDisplay_' + index);
            groupDisplay.textContent = element.group || '';
            cell.appendChild(groupDisplay);

            let groupEdit = document.createElement('div');
            groupEdit.setAttribute('class', 'groupEdit');

            let groupInput = document.createElement('input');
            groupInput.type = 'text';
            groupInput.setAttribute('class', 'groupInput');
            groupInput.setAttribute('id', 'groupInput_' + index);
            groupInput.value = element.group || '';
            groupInput.placeholder = 'Group...';
            (function(idx, currentCell) {
                groupInput.onchange = function() {
                    updateRepoGroup(idx, this.value);
                };
                groupInput.onkeydown = function(e) {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                        e.preventDefault();
                        currentCell.classList.add('editing-done');
                        this.blur();
                    } else if (e.key === 'Escape' || e.keyCode === 27) {
                        e.preventDefault();
                        this.value = state.repos[idx]?.group || '';
                        currentCell.classList.add('editing-done');
                        this.blur();
                    }
                };
            })(index, cell);
            groupEdit.appendChild(groupInput);

            let groupSelect = document.createElement('select');
            groupSelect.setAttribute('class', 'groupSelect');
            groupSelect.setAttribute('id', 'groupSelect_' + index);
            groupSelect.title = 'Select existing group';
            (function(idx, currentCell) {
                groupSelect.onchange = function() {
                    if (this.value !== '') {
                        let chosen = (this.value === '__CLEAR__') ? '' : this.value;
                        let inp = document.getElementById('groupInput_' + idx);
                        if (inp) {
                            inp.value = chosen;
                        }
                        updateRepoGroup(idx, chosen);
                        this.value = '';
                        currentCell.classList.add('editing-done');
                        this.blur();
                    }
                };
            })(index, cell);
            groupEdit.appendChild(groupSelect);

            cell.appendChild(groupEdit);

            cell.onmouseleave = function() {
                this.classList.remove('editing-done');
            };

            groupDisplay.onclick = function() {
                cell.classList.remove('editing-done');
                let inp = document.getElementById('groupInput_' + index);
                if (inp) inp.focus();
            };
                
            //
            // GIT PROVIDER ICON
            //        
            cell = row.insertCell();
            
            try{

                // Link (set href in drawProviderIcon, below)
                let a = document.createElement('a');
                a.setAttribute("onclick", "require('nw.gui').Shell.openExternal( this.href );return false;");
                
                // Image inside link element (set src in drawProviderIcon, below)
                let img = document.createElement('img');
                img.setAttribute("id", index + 30000);
                img.setAttribute("class", 'remoteIcon');
                cell.setAttribute("class", 'remoteIcon');
                
                a.appendChild(img);
                 
                
                cell.appendChild( a );
                
                await drawProviderIcon( index + 30000, element.remoteURL)
            }catch(err){
                console.warn(err);
            }
            

            

                
            //
            // REMOTE URL 
            //            
              
            cell = row.insertCell();
            cell.setAttribute("class", 'remoteURL');
            
            textarea = document.createElement('textarea');
            let textareaId = index + 10000
            textarea.setAttribute("id", textareaId);
            textarea.value = element.remoteURL;
            cell.appendChild(textarea);
                       
            // Remote URL active / inactive
            if ( opener.cachedRemoteOrigins?.isActiveRemote?.[index] ){
                document.getElementById(textareaId).classList.add('green');  // Connection has been tested to work
            }else{
                document.getElementById(textareaId).classList.add('red');  // Connection has been tested to work
            }
                        
            //
            // SET BUTTON
            //    
            let setButtonId = index + 20000;
            cell = row.insertCell();
            cell.setAttribute("class", 'setURL');
            button = document.createElement('button');
            button.setAttribute("id", setButtonId);
            button.innerHTML = 'Set';
            button.setAttribute("onclick", "_callback('setButtonClicked',this)"); // this.type='submit'; 
            cell.appendChild(button);

           
            // Into table cell :  button
            cell = row.insertCell();
            cell.setAttribute("class", 'repoAction');
            
            button = document.createElement('button');
            button.setAttribute("id", index);
            button.innerHTML = 'Forget';
            button.onclick = forgetButtonClicked;
    
            cell.appendChild(button);

            // counter update
            index ++;
        }
        
        updateAllGroupDropdowns();
        
    } // if any repos
 
  
}

function updateAllGroupDropdowns() {
    if (!state || !state.repos) return;

    let groups = new Set();
    for (let r of state.repos) {
        if (r && r.group && r.group.trim().length > 0) {
            groups.add(r.group.trim());
        }
    }
    let sortedGroups = Array.from(groups).sort();

    // 1. Populate each row's group select
    for (let i = 0; i < state.repos.length; i++) {
        let sel = document.getElementById('groupSelect_' + i);
        if (!sel) continue;

        if (sortedGroups.length === 0) {
            sel.style.display = 'none';
            continue;
        }

        sel.style.display = '';
        sel.innerHTML = '';
        let defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Select group:';
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        sel.appendChild(defaultOpt);

        for (let g of sortedGroups) {
            let opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            sel.appendChild(opt);
        }

        let clearOpt = document.createElement('option');
        clearOpt.value = '__CLEAR__';
        clearOpt.textContent = 'None (Remove from group)';
        sel.appendChild(clearOpt);
    }

    // 2. Populate table filter dropdown
    let filterSel = document.getElementById('repoTableGroupFilter');
    let headerLabel = document.getElementById('groupHeaderLabel');
    if (filterSel) {
        if (sortedGroups.length === 0) {
            filterSel.innerHTML = '<option value="ALL">Group</option>';
            filterSel.value = 'ALL';
            if (headerLabel) headerLabel.textContent = 'Group';
            filterRepoTableByGroup('ALL');
        } else {
            let currentFilter = (state && state.repoGroupFilter) ? state.repoGroupFilter : (filterSel.value || 'ALL');
            filterSel.innerHTML = '';

            let optAll = document.createElement('option');
            optAll.value = 'ALL';
            optAll.textContent = 'Group (All)';
            filterSel.appendChild(optAll);

            let optUngrouped = document.createElement('option');
            optUngrouped.value = '__UNGROUPED__';
            optUngrouped.textContent = 'Ungrouped';
            filterSel.appendChild(optUngrouped);

            for (let g of sortedGroups) {
                let opt = document.createElement('option');
                opt.value = g;
                opt.textContent = g;
                filterSel.appendChild(opt);
            }

            // Restore filter if still valid, otherwise ALL
            filterSel.value = currentFilter;
            if (filterSel.value !== currentFilter) {
                filterSel.value = 'ALL';
            }
            filterRepoTableByGroup(filterSel.value);
        }
    }
}

function filterRepoTableByGroup(selectedGroup) {
    if (!selectedGroup) selectedGroup = 'ALL';
    let tbody = document.getElementById('settingsTableBody');
    if (!tbody) return;

    let shownCount = 0;
    for (let row of tbody.rows) {
        let rowGroup = (row.getAttribute('data-group') || '').trim();
        let show = false;

        if (selectedGroup === 'ALL') {
            show = true;
        } else if (selectedGroup === '__UNGROUPED__') {
            show = (rowGroup.length === 0);
        } else {
            show = (rowGroup === selectedGroup);
        }

        row.style.display = show ? '' : 'none';
        if (show) {
            shownCount++;
        }
    }

    let filterSel = document.getElementById('repoTableGroupFilter');
    let headerLabel = document.getElementById('groupHeaderLabel');
    let headerWrapper = document.getElementById('groupHeaderWrapper');

    // If zero shown items and not ALL, fall back to ALL filter!
    if (shownCount === 0 && selectedGroup !== 'ALL' && tbody.rows.length > 0) {
        selectedGroup = 'ALL';
        if (filterSel) {
            filterSel.value = 'ALL';
        }
        for (let row of tbody.rows) {
            row.style.display = '';
        }
    }

    let hasGroups = false;
    if (state && state.repos) {
        hasGroups = state.repos.some(r => r && r.group && r.group.trim().length > 0);
    }

    let isFiltered = (hasGroups && selectedGroup && selectedGroup !== 'ALL');
    if (headerWrapper) {
        if (isFiltered) {
            headerWrapper.classList.add('filtered', 'blockTextHighlight', 'blockTextHighligt');
        } else {
            headerWrapper.classList.remove('filtered', 'blockTextHighlight', 'blockTextHighligt');
        }
    }

    if (headerLabel) {
        if (!hasGroups) {
            headerLabel.textContent = 'Group';
            let titleText = 'Filter repositories by group';
            if (filterSel) filterSel.title = titleText;
            if (headerWrapper) headerWrapper.title = titleText;
        } else if (!selectedGroup || selectedGroup === 'ALL') {
            headerLabel.textContent = 'Group (All)';
            let titleText = 'Filter repositories by group';
            if (filterSel) filterSel.title = titleText;
            if (headerWrapper) headerWrapper.title = titleText;
        } else {
            headerLabel.textContent = 'Group (filtered)';
            let filterName = (selectedGroup === '__UNGROUPED__') ? 'Ungrouped' : selectedGroup;
            let titleText = 'Filter: ' + filterName;
            if (filterSel) filterSel.title = titleText;
            if (headerWrapper) headerWrapper.title = titleText;
        }
    }

    let prevFilter = state.repoGroupFilter;
    state.repoGroupFilter = selectedGroup;
    if (opener && opener.state) {
        opener.state.repoGroupFilter = selectedGroup;
    }
    if (prevFilter !== selectedGroup && opener && typeof opener.saveSettings === 'function') {
        opener.saveSettings();
    }
}

function updateRepoGroup(index, newGroup) {
    newGroup = (newGroup || '').trim();
    if (!state.repos[index]) return;
    state.repos[index].group = newGroup;

    // Update table row data-group attribute
    let tbody = document.getElementById('settingsTableBody');
    if (tbody && tbody.rows[index]) {
        tbody.rows[index].setAttribute('data-group', newGroup);
    }

    // Update display span
    let disp = document.getElementById('groupDisplay_' + index);
    if (disp) {
        disp.textContent = newGroup;
    }

    // Save settings via opener
    opener.saveSettings();

    // Refresh dropdown choices across all rows and the filter bar
    updateAllGroupDropdowns();
}

async function recheckRepoStatus(repoIndex) {
    if (repoIndex < 0 || !state.repos || !state.repos[repoIndex]) return;
    let repo = state.repos[repoIndex];
    let folder = repo.localFolder;
    let repoKey = repo.sshKey || '';

    if (!opener.cachedLocalStatus) {
        opener.cachedLocalStatus = { exists: [], isRepo: [], ping: [], reason: [], localFolder: [], platform: [] };
    }
    if (!opener.cachedLocalStatus.exists) opener.cachedLocalStatus.exists = new Array(state.repos.length).fill(false);
    if (!opener.cachedLocalStatus.isRepo) opener.cachedLocalStatus.isRepo = new Array(state.repos.length).fill(false);
    if (!opener.cachedLocalStatus.ping) opener.cachedLocalStatus.ping = new Array(state.repos.length).fill(null);
    if (!opener.cachedLocalStatus.reason) opener.cachedLocalStatus.reason = new Array(state.repos.length).fill('');
    if (!opener.cachedLocalStatus.localFolder) opener.cachedLocalStatus.localFolder = new Array(state.repos.length).fill(null);
    if (!opener.cachedLocalStatus.platform) opener.cachedLocalStatus.platform = new Array(state.repos.length).fill(null);

    if (folder.startsWith('ssh:')) {
        let exists = await fs_existsSync(folder, repoKey);
        opener.cachedLocalStatus.exists[repoIndex] = exists;
        opener.cachedLocalStatus.localFolder[repoIndex] = folder;
        if (exists) {
            opener.cachedLocalStatus.ping[repoIndex] = true;
            let isRepo = await fs_existsSync(`${folder}/.git/HEAD`, repoKey);
            opener.cachedLocalStatus.isRepo[repoIndex] = isRepo;
            opener.cachedLocalStatus.reason[repoIndex] = isRepo ? '' : 'not a repo';
            try {
                if (typeof opener.typeOfRepoServer === 'function') {
                    opener.cachedLocalStatus.platform[repoIndex] = await opener.typeOfRepoServer(folder);
                }
            } catch (e) {}
        } else {
            opener.cachedLocalStatus.isRepo[repoIndex] = false;
            let reason = (typeof fs_existsSync.lastReason !== 'undefined' && fs_existsSync.lastReason) ? fs_existsSync.lastReason : 'not a folder';
            opener.cachedLocalStatus.reason[repoIndex] = reason;
        }
    } else {
        let exists = fs.existsSync(folder);
        opener.cachedLocalStatus.exists[repoIndex] = exists;
        opener.cachedLocalStatus.localFolder[repoIndex] = folder;
        opener.cachedLocalStatus.platform[repoIndex] = 'Local';
        if (!exists) {
            opener.cachedLocalStatus.isRepo[repoIndex] = false;
            opener.cachedLocalStatus.reason[repoIndex] = 'not a folder';
        } else {
            await simpleGit(folder).checkIsRepo((err, checkResult) => {
                opener.cachedLocalStatus.isRepo[repoIndex] = !!checkResult;
                opener.cachedLocalStatus.reason[repoIndex] = checkResult ? '' : 'not a repo';
            });
        }
    }

    // Refresh repo table to update the status text and radio buttons
    let tbody = document.getElementById("settingsTableBody");
    if (tbody) {
        tbody.innerHTML = "";
        await createHtmlTable(document);
    }
}

async function generateBranchTable(document, table, branchlist) {
    var index = 0; // Used to create button-IDs
    let cell, text, button, checkbox;
 
 
    //
    // Add branches to table
    //
       
    // Loop rows in data
    for (let element of branchlist) {
        
        let hiddenBranch = util.isHiddenBranch( state.repos[ state.repoNumber].hiddenBranches, element);
        
        //console.log('Element = ' + element );
        let row = table.insertRow();
        
        
        // Into table cell :  checkbox for hidden branch
        cell = row.insertCell();
        cell.setAttribute("class", 'hiddenBranch');
        checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.checked = hiddenBranch;
        checkbox.id = 30000 + index;        
        checkbox.setAttribute('onclick', 
            "selectedBranch = '"  + element + "';" + 
            "_callback('hideBranchCheckboxChanged', this );"); 
        cell.appendChild(checkbox);
        
        // Disable checkbox, can not hide current branch
        if ( index === localState.branchNumber){
            checkbox.setAttribute('disabled', true);
            document.getElementById(checkbox.id).disabled = true
        }
        
        
 
         // Into table cell :   Branch name text
        cell = row.insertCell();
        cell.setAttribute("class", 'branchName');
        text = document.createTextNode( element);
        cell.appendChild(text);


        // Into table cell :  button to delete branch
        cell = row.insertCell();
        cell.setAttribute("class", 'branchAction');
        
        button = document.createElement('button');
        button.setAttribute("id", index);
        button.innerHTML = 'Delete';
        button.setAttribute('onclick',
            "selectedBranch = '"  + element + "';" + 
            "document.getElementById('deleteBranchDialog').showModal();" );  // Opens dialog from html-page
        cell.appendChild(button);


        index ++;
    }
    //console.log(table);
    
    //
    // Add branch (extra row at end)
    //
    let row = table.insertRow();
    
    
    // Empty (no checkbox on this row)
    cell = row.insertCell();
    cell.setAttribute("class", 'hiddenBranch');
     
    // Into table cell :   Branch name textarea
    cell = row.insertCell();
    cell.setAttribute("class", 'branchName');
    
    textarea = document.createElement('textarea');
    textarea.setAttribute("id", 'branchNameTextarea');
    textarea.setAttribute( "onkeyup", "_callback('newBranchNameKeyUp', this);");  
    textarea.innerHTML = "";
    //textarea.onclick = forgetButtonClicked;
    textarea.placeholder="Name of new branch" 
    
    cell.appendChild(textarea);
    
       
    // Into table cell :  button
    cell = row.insertCell();
    cell.setAttribute("class", 'branchAction');
    
    button = document.createElement('button');
    button.setAttribute("id", "addBranchButtonPressed");
    button.innerHTML = 'Add branch';
    button.setAttribute('onclick','_callback("addBranchButtonPressed",this)'); 
    cell.appendChild(button);


   
}
            
async function updateStarredButton(){ // Github starring of pragma-git
    
    const owner = 'pragma-git';
    const repo = 'pragma-git';

    try{
        // TOKEN for current repo
        let creds = await opener.getCredential( state.repos[ state.repoNumber ].remoteUrl);
        let token = creds.password;

        // Hide button area for all except github.com
        if ( state.repos[ state.repoNumber ].remoteURL.includes('github.com') ){
            document.getElementById("givePragmaGitStarDiv").style.display="block";
        }else{
            document.getElementById("givePragmaGitStarDiv").style.display="none";
            return // No need to update buttom image
        }
        
        // Show correct star-icon, and text
        let isStarred = await githubStar.isRepositoryStarred(owner, repo, token);
        let starIcon = document.getElementById('star-icon');
        if ( isStarred ){
            document.getElementById('star-icon').src = "images/github_star_on.png";
            document.getElementById('givePragmaGitStarText').textContent = 'Pragma-git is starred :';
        }else{
            document.getElementById('star-icon').src = "images/github_star_off.png";
            document.getElementById('givePragmaGitStarText').textContent = 'Give Pragma-git a star :';
        }

    }catch (err){
        console.warn('Failed starring pragma-git from current repository');
        console.warn(err);
    }
        
    
}           
            
// Local git-config author info  
async function directlyDisplayLocalAuthorInfo( localAuthorName, localAuthorEmail){ // Display author info when modified local author info  (ignore local git-config)
    // DISPLAY 
    console.log(' ');
    console.log('directlyDisplayLocalAuthorInfo :');
    console.log(`  localAuthorName = ${localAuthorName} `);   
    console.log(`  localAuthorEmail = ${localAuthorEmail} `);   
    console.log(`  settingAuthorName = ${state.repos[state.repoNumber].authorName} `);   
    console.log(`  settingAuthorEmail = ${state.repos[state.repoNumber].authorEmail} `);    
    
    let localGitConfigDefined = (localAuthorName !== null);  // Local is defined

        
        // set textfield rw
        document.getElementById('thisRepoAuthorName').readOnly = false;
        document.getElementById('thisRepoAuthorEmail').readOnly = false;
        
        // display text field values from local gitconfig
        document.getElementById('thisRepoAuthorName').value  = localAuthorName;
        document.getElementById('thisRepoAuthorEmail').value = localAuthorEmail;
                    
        // Show / hide warning text for empty local name        
        if ( state.repos[ state.repoNumber ].authorName.trim().length == 0 ){       
            document.getElementById('warnThatLocalAuthorInfoMissing').style.visibility = 'visible';
        }else{
             document.getElementById('warnThatLocalAuthorInfoMissing').style.visibility = 'collapse';
        }

    console.log(`  settingAuthorName = ${state.repos[state.repoNumber].authorName} `);   
    console.log(`  settingAuthorEmail = ${state.repos[state.repoNumber].authorEmail} `);   
}
async function displayLocalAuthorInfo(){ // Display based on git-config author info
    // DISPLAY using git-config info :
    //   1) set globalCheckbox, 
    //   2) set r or rw for textfields (user.name, user.mail) 
    //   3) user.name, user.mail,  
    //
    //                                                     1) set globalCheckbox   2) set textfield    3) Display user.name, user.mail
    // local gitconfig user.name defined                               [ ]                 rw           display LOCAL user.name, user.mail 
    // local gitconfig user.name undefined                             [X]                 r            display GLOBAL user.name, user.mail 

    console.log(' ');
    console.log('displayLocalAuthorInfo :');

    let localAuthorName = await gitReadConfigKey( state.repoNumber, 'user.name', 'local');
    let localAuthorEmail = await gitReadConfigKey( state.repoNumber, 'user.email', 'local');    
    let globalAuthorName = await gitReadConfigKey( state.repoNumber, 'user.name', 'global');
    let globalAuthorEmail = await gitReadConfigKey( state.repoNumber, 'user.email', 'global');  
    
    console.log(`  localAuthorName = ${localAuthorName} `);   
    console.log(`  localAuthorEmail = ${localAuthorEmail} `);   
    console.log(`  globalAuthorName = ${globalAuthorName} `);   
    console.log(`  globalAuthorEmail = ${globalAuthorEmail} `);  
    console.log(`  settingAuthorName = ${state.repos[state.repoNumber].authorName} `);   
    console.log(`  settingAuthorEmail = ${state.repos[state.repoNumber].authorEmail} `);   
    
    
    let localGitConfigDefined = (localAuthorName !== null);  // Local is defined
    
        
    // Global
    if ( localGitConfigDefined == false ){  // Global because local is not defined
        console.log(`  use GLOBAL gitconfig`);
        
        // set textfield read-only
        document.getElementById('thisRepoAuthorName').readOnly = true;
        document.getElementById('thisRepoAuthorEmail').readOnly = true;
        
        // display text field values
        document.getElementById('thisRepoAuthorName').value  = globalAuthorName;
        document.getElementById('thisRepoAuthorEmail').value = globalAuthorEmail;
        
        // set globalCheckbox state
        document.getElementById('useGlobalAuthorInfo').checked = true
        
        // Hide warning text for empty local name  
        document.getElementById('warnThatLocalAuthorInfoMissing').style.visibility = 'collapse';
    }    
    
    
    // Local gitconfig exist
    if ( localGitConfigDefined == true ){ // Local is defined, therefore editable texts
        console.log(`  use LOCAL gitconfig`);
        
        // set textfield rw
        document.getElementById('thisRepoAuthorName').readOnly = false;
        document.getElementById('thisRepoAuthorEmail').readOnly = false;
        
        // display text field values from local gitconfig
        document.getElementById('thisRepoAuthorName').value  = localAuthorName;
        document.getElementById('thisRepoAuthorEmail').value = localAuthorEmail;
        
        // set globalCheckbox state
        document.getElementById('useGlobalAuthorInfo').checked = false
    }
    
    
    // Update stored author info from local git-config (scenario that local git-config is changed outside pragma-git, and settings.json is out of date)
    updateStoredLocalAuthorInfoFromGitConfig(localAuthorName, localAuthorEmail);
    
    console.log(`  settingAuthorName = ${state.repos[state.repoNumber].authorName} `);   
    console.log(`  settingAuthorEmail = ${state.repos[state.repoNumber].authorEmail} `);   
    
    return

    //
    // Internal function
    //
    
    // Make stored author info  in sync with local git-config
    function updateStoredLocalAuthorInfoFromGitConfig( gitLocalAuthorName, gitLocalAuthorEmail){  
        // 1) If git-config is empty -- remember old stored setting (settings.json)
        // 2) If git-config is not empty -- update stored setting (settings.json)
        
        
        //
        // user.name
        //
        
        if (gitLocalAuthorName == null){ // Fix null
            gitLocalAuthorName = "";
        }
        
        // Overwrite saved from local git-config if exists (keep saved if local git-config was empty)
        if (gitLocalAuthorName.trim.length == 0){
            //Keep  state.repos[state.repoNumber].authorName  because local git-config was empty
        }else{
            // Save git-config user.name
            state.repos[state.repoNumber].authorName = gitLocalAuthorName;
        }

        
        //
        // user.email
        //       
        
        if (gitLocalAuthorEmail == null){ // Fix null       
            gitLocalAuthorEmail = "";
        }   
         
        // Overwrite saved from local git-config if exists (keep saved if local git-config was empty)    
        if (gitLocalAuthorEmail.trim.length == 0){
            //Keep  state.repos[state.repoNumber].authorEmail  because local git-config was empty
        }else{
            // Save git-config user.email
            state.repos[state.repoNumber].authorEmail = gitLocalAuthorEmail;
        }
        
        
    }
  
}

async function updateProjectFolderInfo() {
    let html = '';
    let el = document.getElementById('projectFolderInfo');
    if (!el) return;

    if (state.repoNumber < 0 || !state.repos || !state.repos[state.repoNumber]) {
        html = '<code><table class="keyValueTable"><tr><td style="white-space: nowrap;"> &nbsp; Project path : &nbsp; </td><td> (No repository selected) </td></tr></table></code>';
        el.innerHTML = html;
        return;
    }

    let repo = state.repos[state.repoNumber];
    let folder = repo.localFolder || '';

    html += '<code><table class="keyValueTable">';
    html += `<tr><td style="white-space: nowrap;"> &nbsp; Project path : &nbsp; </td><td> ${folder} </td></tr>`;

    if (folder.startsWith('ssh:')) {
        let username = '';
        let hostname = '';
        let port = '';
        try {
            let parsed = new URL(folder);
            username = parsed.username || '';
            hostname = parsed.hostname || '';
            port = parsed.port ? `:${parsed.port}` : '';
        } catch (e) {
            let clean = folder.replace(/^ssh:\/\//, '');
            let hostPart = clean.split('/')[0];
            if (hostPart.includes('@')) {
                username = hostPart.split('@')[0];
                hostname = hostPart.split('@')[1];
            } else {
                hostname = hostPart;
            }
        }

        let defaultKey = (typeof getDefaultSshKey === 'function') ? getDefaultSshKey() : path.join(os.homedir(), '.ssh', 'id_ed25519');
        let privKey = repo.sshKey || (state.tools && state.tools.defaultSshKey) || defaultKey;
        if (privKey.endsWith('.pub')) {
            privKey = privKey.slice(0, -4);
        }

        let userPrefix = username ? `${username}@` : '';
        let remotePublicPath = `ssh://${userPrefix}${hostname}${port}/~/.ssh/authorized_keys`;

        html += `<tr><td style="white-space: nowrap;"> &nbsp; Private key (local) : &nbsp; </td><td> ${privKey} </td></tr>`;
        html += `<tr><td style="white-space: nowrap;"> &nbsp; Public key (server) : &nbsp; </td><td> ${remotePublicPath} </td></tr>`;
        html += `<tr><td style="white-space: nowrap;"> &nbsp; SSH configuration : &nbsp; </td><td> <button type="button" class="smallButton" style="padding: 1px 8px; vertical-align: middle;" onclick="openSshConfigDialog({ repoIndex: state.repoNumber })">Configure SSH...</button> </td></tr>`;
    }

    html += '</table></code>';
    el.innerHTML = html;
    return html;
}

async function updateRemoteInfo( ){
    let html = '';
    let creds = {};
    
    // Git credentials
    html +='<br><div> Git credentials :</div>';
    
    try{
        creds = await opener.getCredential();
        html += '<code><table class="keyValueTable">';
        Object.keys(creds).forEach( 
            (key)=> html +=  
            `<tr> 
                <td style="white-space: nowrap;"> &nbsp; ${key} : &nbsp; </td> 
                <td> ${ creds[key]} </td>
            </tr>`   // Style "white-space: nowrap" makes it fill width of column
        );
        
    
        let config_credential_username = await gitReadConfigKey( state.repoNumber, 'credential.username', '--local');
        
        if (config_credential_username && config_credential_username.trim().length > 0) {
            let clearButton = `<button class="smallButton" onclick=
            " gitRemoveConfigKey( ${state.repoNumber}, 'credential.username', 'local'); 
            _callback('systemInfoClicked', {id: ${state.repoNumber} })" 
            > Clear </button>`;
            
            html +=  
                `<tr> 
                    <td style="white-space: nowrap;"> &nbsp; credential.username : &nbsp; </td> 
                    <td> ${config_credential_username} (in local .git/config) ${clearButton}</td>
                </tr>`;
        } else {
            html +=  
                `<tr> 
                    <td style="white-space: nowrap;"> &nbsp; credential.username : &nbsp; </td> 
                    <td> <i>(not set)</i> </td>
                </tr>`;
        }
        
        html += '</table></code>';       
    }catch (err){
        html += '<code>Error reading git credentials : <br>';
        html += `${err}</code> <br>`
    }

    
    // Provider specific remote info
    html +='<br><div> Git remote info :</div>';
    try{
        provider = await opener.gitProvider( creds.url)
        let iconPath =  await provider.getValue('icon', localState.dark ? 'darkmode' : 'lightmode' );
        let iconLongPath =  opener.CWD_INIT + pathsep + await provider.getValue('icon', localState.dark ? 'darkmode' : 'lightmode' );
        let providerApiStatus = await provider.getValue('api-status');
        let providerApiUrl = await provider.getValue('api-url');
        console.log(providerApiUrl);
        let providerWebPageUrl = await provider.getValue('web-url');
        console.log(providerWebPageUrl);
        console.log('---');
        
        let isPrivate = await provider.getValue('is-private-repo');
        if (isPrivate){
            visibility = 'private';
        }else {
            if (isPrivate == false){
                visibility = 'public';
            }else{
                visibility = isPrivate; // Should be undefined
            }
        }
        let forkParentUrl = await provider.getValue('fork-parent');
        if (forkParentUrl == undefined){
            forkParentUrl = '(this is not a known fork)';
        }

        html += '<code> <table class="keyValueTable">';
        html +=     `<tr><td style="white-space: nowrap;"> &nbsp; Provider API status : &nbsp; </td><td> ${providerApiStatus} </td></tr>`
        html +=     `<tr><td style="white-space: nowrap;"> &nbsp; API output : &nbsp; </td> <td> <button class="smallButton" onclick="showJsonInPopup( provider.repoInfoStruct, 'Remote api content', '( ${providerApiUrl} )' )"> Show </button></td></tr>`;
        html +=     `<tr><td style="white-space: nowrap;"> &nbsp; Provider API URL : &nbsp; </td><td> ${providerApiUrl} </td></tr>`
        html +=     `<tr><td style="white-space: nowrap;"> &nbsp; Visibility : &nbsp; </td><td> ${visibility} </td></tr>`
        html +=     `<tr><td style="white-space: nowrap;"> &nbsp; Forked from : &nbsp; </td><td> ${forkParentUrl} </td></tr>` 
        html +=     `<tr><td style="white-space: nowrap;"> &nbsp; Icon path : &nbsp; </td><td> ${iconLongPath} <img style='vertical-align:middle; filter: none;' height="17" width="17" src="${iconPath}"> </td></tr>` 
        html +=     `<tr><td style="white-space: nowrap;"> &nbsp; Repo web page URL : &nbsp; </td><td> <a href="${providerWebPageUrl}" onclick="require('nw.gui').Shell.openExternal( this.href );return false;"> ${providerWebPageUrl} </a></td></tr>`
        
        
        html += '</table></code>';   
        
          
    }catch (err){
		html += '<code> <table class="keyValueTable"><tr><td style="white-space: nowrap;"> &nbsp';
		if ( err.toString().includes('unknown scriptName') ){
			html += 'Unknown git provider  <br>';
		}else{        
			html += 'Error reading git remote info  <br>';
		}
		html += `</td><td></table></code> <br>`
    }    
 
    // Show html
    document.getElementById('remoteInfo').innerHTML = await html;
 
    return html   
}
function showJsonInPopup(jsonData, title, subtitle) {
    
    // Bail out if already open
    if ( opener.showJsonInPopup_win !== undefined){
        return
    }
    
    
    let showJsonInPopupWindow;
    // Create a new window   
    gui.Window.open( 
        'jsonViewer.html', 
        {
            title: 'JSON Viewer',
            id: 'jsonViewerID', 
            show: true,
            width: 800,
            height: 600
        },
        win => win.on('loaded', function () {

                win.window.document.getElementById('headerText').innerHTML =  title;
                win.window.document.getElementById('subHeader').innerHTML =  subtitle;
                
                
                win.window.document.getElementById('json-display').innerHTML =  syntaxHighlight(jsonData);
                
                opener.showJsonInPopup_win = win;
                opener.updateWindowMenu('JSON Viewer', 'showJsonInPopup_win');
                
                opener.showWindow(win);
                        
                win.on('close', function() { 
                    opener.updateWindowMenu('JSON Viewer', 'showJsonInPopup_win');
                    opener.fixNwjsBug7973( win);
                    opener.showJsonInPopup_win = undefined;
                    
                } );
                
                
                // Close when main window is closed (see https://docs.nwjs.io/en/latest/References/Window/#event-closed )
                win.on('closed', function () {
                    win = null;
                });
    
               
                // Listen to main window's close event
                nw.Window.get().on('close', function () {
                  // Hide the window to give user the feeling of closing immediately
                  this.hide();
               
                  // If the new window is still open then close it.
                  if (win !== null) {
                    win.close(true);
                  }
                  
                  opener.showJsonInPopup_win = undefined;
               
                  // After closing the new window, close the main window.
                  this.close(true);
                });
                 
 
            }
        ) 
    );
    
    
    // Internal function               
    function syntaxHighlight(json) {
        
        let lastClassWasKey = false;  // Used to prohibit two key classes following each other   (avoid html trouble when json within json )
        
        if (typeof json != 'string') {
            json = JSON.stringify(json, null, 2);
        }
        
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
              
            function(match) {
                
                // Set css class
                let cls = 'number';
                if (/^"/.test(match)) {
                    cls = /:$/.test(match) ? 'key' : 'string';
                } else if (/true|false/.test(match)) {
                    cls = 'boolean';
                } else if (/null/.test(match)) {
                    cls = 'null';
                }
                
                // Make url link
                if ( match.includes('https') ){
                    cls = 'url';
                    match = `<a href=${match} onclick="require('nw.gui').Shell.openExternal( this.href );return false;">${match}</a>`;  // match contains "" already
                }
                
                
                // Make sure new line starts with class = 'key'   (avoid html trouble when json within json )
                if ( cls == 'key'){
                    if (lastClassWasKey){
                        PRE = '</div><div class="line">';   // If previous was class 'key', close, and open div again
                        POST = '';
                    }else{
                        PRE = '<div class="line">';  // If previous was not class 'key', just open new div
                        POST = '';
                    }
                    lastClassWasKey = true;   // This becomes lastClass
                }else{
                    PRE = '';
                    POST = '</div>';
                    lastClassWasKey = false;  // This becomes lastClass
                }
                
                
                return `${PRE}<span class="${cls}">${match}</span>${POST}`;
            }
        );
  }
            
 
}

async function updateGitconfigs( ){
    
    let html = '';
    
    // List config
    if (state.repoNumber >= 0){
        configList = await simpleGit(state.repos[state.repoNumber].localFolder).listConfig();
    }else{
        // No repo -- check global
        if (process.platform === 'win32') {  
            configList = await simpleGit('C:\\').listConfig();
        } else{
            configList = await simpleGit('/').listConfig();
        }
    }   
    
    // Server name -- populated if ssh folder :
    let server = '';
    let onServerString = '';
    // Write out if on ssh folder
    if (state.repos[state.repoNumber].localFolder.startsWith('ssh:') ){
        html += `<code>On server ${state.repos[state.repoNumber].localFolder} </code><br>`
        const fullUrl = state.repos[state.repoNumber].localFolder;
        const url = new URL(fullUrl);
        server = `${url.protocol}//${url.username}@${url.hostname}${url.port ? `:${url.port}` : ''}`;
        onServerString = ` ( on server ${server} )`
    }
    

    
    // Build html, loop by file
    let files = configList.files;
    for (fileURI of files) {
        
        // Title
        let fileTitle = server + fileURI;
        
        if ( fileURI == '.git/config' ){
            fileTitle = state.repos[state.repoNumber].localFolder + '/.git/config';
        }        
        
        if ( fileURI == 'command line:' ){
            fileTitle = 'Pragma-git internal' + onServerString;
            html+= `<br><div style="opacity: 50%; border-left-style: inset; padding-left: 5px;"> <div> ${fileTitle} :</div>`; 
        }else{
            html+= `<br><div> ${fileTitle} :</div>`; 
        }        
        
        
        // Loop configs of current file
        let values = configList.values[fileURI];
        for (const key in values) {
            if (values.hasOwnProperty(key)) {
                configString = `${key}: ${values[key]}`;
                html += `<code>&nbsp; ${configString}</code> <br>`
            }
        }
    }
    html += '</div>'
    
    
    document.getElementById('gitconfigs').innerHTML = await html; 
    
    // Add to elements
     html = await  simpleGit().raw( ['config',  '--get', 'core.askpass']) ;  // NOTE:  this will run askpass in ssh server when working on ssh local folder (which does not work!)
     document.getElementById('askpassPath').innerHTML = await html; 
     
     html = await simpleGit().raw( ['config',  '--get', 'mergetool.pragma-git.cmd']) ;  // NOTE:  this will run merge-tool in ssh server when working on ssh local folder (which does not work!)
     document.getElementById('pragmaMergePath').innerHTML = await html; 
     
    
    return html
}

function displayAlert(title, message){
    // Writes into alertDialog in settins.html
    // Example:
    //  divId = "resultRepo" (with title=resultRepoTitle, message=resultRepoMessage)
    //
    // first argument is ignored

    document.getElementById('alertTitle').innerHTML = title;
    document.getElementById('alertMessage').innerHTML = message;
    
    // Show message
    document.getElementById('alertDialog').showModal();
}


// Handle instant theme update for icons and table text
function onThemeChanged() {
    let isDark = document.body.classList.contains('dark');
    
    // 1. Force layout reflow on content sections to update CSS inherited colors
    let contents = document.querySelectorAll('.content, .tool-content, table');
    contents.forEach(el => {
        let orig = el.style.display;
        el.style.display = 'none';
        let _ = el.offsetHeight;
        el.style.display = orig;
    });
    
    // 2. Update provider icons for light/dark theme
    let imgs = document.querySelectorAll('img.remoteIcon');
    imgs.forEach(img => {
        if (isDark) {
            if (img.src.includes('github-mark.png')) {
                img.src = img.src.replace('github-mark.png', 'github-mark-white.png');
            }
        } else {
            if (img.src.includes('github-mark-white.png')) {
                img.src = img.src.replace('github-mark-white.png', 'github-mark.png');
            }
        }
    });
}
window.onThemeChanged = onThemeChanged;
