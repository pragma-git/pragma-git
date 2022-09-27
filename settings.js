
// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');
var util = require('./util_module.js'); // Pragma-git common functions
const pathsep = require('path').sep;  // Os-dependent path separator
const path = require('path');

let simpleGit = require('simple-git');
//function simpleGitLog(pwd) {  return simpleGit(pwd).outputHandler( opener.sendGitOutputToFile() ) } // Use as with simpleGit, but this one logs through pragmaLog
let simpleGitLog = opener.simpleGitLog; // Use as with simpleGit, but this one logs through pragmaLog


// Global for whole app
var state = global.state; // internal copy of global.state
var localState = global.localState; 

var win


// Counter for remote repos dialog    
var remoteRepos ={};  // Struct containing counter for GUI of remote repos
remoteRepos.fetch = {};
remoteRepos.push = {};  // Prepare for having different data in push
remoteRepos.fetch.pos = 1;  // Default, reserved for remotes/origin


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
            opener.pragmaLog('   settings radiobutton ' + id + ' = ' + value);
            
            // Reload main if Dark mode change
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
            console.log(event);
            value = event.checked;
            
            if ( document.getElementById('useGlobalAuthorInfo').checked ){
                // Remove from git config --local 
                await gitRemoveConfigKey( state.repoNumber, 'user.name', 'local');
                await gitRemoveConfigKey( state.repoNumber, 'user.email', 'local');
            }
            
            if ( !document.getElementById('useGlobalAuthorInfo').checked ){
                // Set git config --local from stored value
                try{ await gitWriteConfigKey( 'user.name', state.repos[state.repoNumber].authorName, 'local');   }catch (err) {}
                try{ await gitWriteConfigKey( 'user.email', state.repos[state.repoNumber].authorEmail, 'local'); }catch (err) {}
            }
            
            state.repos[state.repoNumber].useGlobalAuthorInfo = document.getElementById('useGlobalAuthorInfo').checked;
            
            let globalSelected = document.getElementById('useGlobalAuthorInfo').checked; // global checkbox selected checked/unchecked 
            await updateLocalAuthorInfoView( globalSelected ); 
         
            break;
        }
        case 'localAuthorNameChanged': {
            console.log('localAuthorNameChanged');
            console.log(event);
            value = event.checked;
            
            if ( document.getElementById('useGlobalAuthorInfo').checked ){
                return
            }
            
            if ( !document.getElementById('useGlobalAuthorInfo').checked ){
                // Set git config --local and store value  
                state.repos[state.repoNumber].authorName = document.getElementById('thisRepoAuthorName').value;
                try{ await gitWriteConfigKey( 'user.name', state.repos[state.repoNumber].authorName, 'local');   }catch (err) {}
            }
            
            // Make sure that blank authorname is not registered in git-config local
            if ( state.repos[ state.repoNumber ].authorName.trim().length == 0 ){
                state.repos[ state.repoNumber ].useGlobalAuthorInfo = true;
                
                document.getElementById('warnThatLocalAuthorInfoMissing').style.visibility = 'visible';
                
                // Remove from git config --local 
                await gitRemoveConfigKey( state.repoNumber, 'user.name', 'local');
                await gitRemoveConfigKey( state.repoNumber, 'user.email', 'local');
            }else{
                document.getElementById('warnThatLocalAuthorInfoMissing').style.visibility = 'collapse';
            }
         
            break;
        }
        case 'globalAuthorNameChanged': {
            console.log('globalAuthorNameChanged');
            console.log(event);

            try{ await gitRemoveConfigKey( state.repoNumber, 'user.name', 'global'); }catch (err) {}
            try{ await gitWriteConfigKey( 'user.name', document.getElementById('authorName').value, 'global');   }catch (err) {}

            break;
        }
        case 'localAuthorEmailChanged': {
            console.log('localAuthorEmailChanged');
            console.log(event);
            value = event.checked;
            
            if ( document.getElementById('useGlobalAuthorInfo').checked ){
                return
            }
            
            if ( !document.getElementById('useGlobalAuthorInfo').checked ){
                // Set git config --local and store value  
                state.repos[state.repoNumber].authorEmail = document.getElementById('thisRepoAuthorEmail').value;
                try{ await gitWriteConfigKey( 'user.email', state.repos[state.repoNumber].authorEmail, 'local');   }catch (err) {}
            }

            await updateLocalAuthorInfoView( ); 
         
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
            document.getElementById('forkFolder').value = localFolder;
            document.getElementById('addFolder').value = localFolder;
        
            break;
        }   
        case 'cloneButtonPressed' : {
            console.log('cloneButtonPressed');
            
            // I know that the last row has index same as length of number of repos
            id = state.repos.length;
            
            let folder = document.getElementById('cloneFolder').value;  
            let URL = document.getElementById('urlToClone').value; 
            
            document.getElementById('cloneStatus').innerHTML = 'Cloning in progress ';
            const dummy = await gitClone( folder, URL);
            document.getElementById('cloneStatus').innerHTML = '';
            
            // Replace table 
            document.getElementById("settingsTableBody").innerHTML = ""; 
            createHtmlTable(document);
            
            // Switch to Remote  tab
            document.getElementById('gitHubTab').click()

            break;
        }   
        case 'forkButtonPressed' : {
            console.log('forkButtonPressed');
            
            // I know that the last row has index same as length of number of repos
            id = state.repos.length;
            
            let folder = document.getElementById('forkFolder').value;  
            let URL = document.getElementById('urlTofork').value; 
            
            // Make a clone from fork-URL
            document.getElementById('forkStatus').innerHTML = 'Fork in progress ';
            const dummy = await gitClone( folder, URL);
            document.getElementById('forkStatus').innerHTML = '';
                 
            // Combine URL and folder name => repo folder
            let repoWithExtension = URL.replace(/^.*[\\\/]/, '');
            let repoName = repoWithExtension.split('.').slice(0, -1).join('.');
            let topFolder = folder + pathsep + repoName;
            topFolder = topFolder.replace(/[\\\/]$/, '')
    
            // Store forkedURL            
            try{
                const commands = [ 'remote', 'add','upstream', URL];
                await simpleGitLog( state.repos[id].localFolder).raw(  commands, onSetRemoteUrl);
                function onSetRemoteUrl(err, result ){
                    console.log(result);
                    console.log(err) ;
                };
                
                // Set if change didn't cause error (doesn't matter if URL works)
                state.repos[id].forkedFromURL = URL;
            }catch(err){
                console.log('Repository store fork-URL failed');
                console.log(err);
            } 
            
               
            // Remove remote origin (makes it a fork -- remote/origin has to be defined manually)
            await simpleGit(topFolder).removeRemote('origin',onDeleteRemoteUrl);
            function onDeleteRemoteUrl(err, checkResult) { }
                
            // Replace table 
            document.getElementById("settingsTableBody").innerHTML = ""; 
            createHtmlTable(document);
            
            // Switch to Remote  tab
            document.getElementById('gitHubTab').click()
            
            // Update store
            remoteRepos.fetch.names[index] = alias;
            remoteRepos.fetch.URLs[index] = newUrl;
            remoteRepos.push.names[index] = alias;
            remoteRepos.push.URLs[index] = newUrl;

            break;
        } 
        case 'addRepoButtonPressed' : {
            // If folder is a repo -> add
            // If not a repo show dialog doYouWantToInitializeRepoDialog
            // which calls _callback('initializeRepoOK')
            
            console.log('addRepoButtonPressed');

            let folder = document.getElementById('addFolder').value;  
            util.mkdir(folder); // Make folder if not existing
            
            // Dialog if repo does not exist
            try{
                var isRepo;
                await simpleGit(folder).checkIsRepo(onCheckIsRepo);
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
                console.log(error);
            }
            
            // Update cached branch list
            opener.cacheBranchList();

        
            break;
        }
        case 'initializeRepoOK' : {
            
            await opener._callback('initializeRepoOK', event);
            
            let folder = document.getElementById('addFolder').value; 
 
            // update list
            try {
                // Replace table 
                document.getElementById("settingsTableBody").innerHTML = ""; 
                createHtmlTable(document);
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
            
            
            console.log('repoRadiobuttonChanged');
            console.log(event);
                
            try{                    
                // Set state (so it will be updated in main program)
                state.repoNumber = Number(id);  // id can be a string
                        
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
                
                                
                drawBranchTab(document);

                
                    
                // Update repo name
                let folderObject =  await opener.gitLocalFolder() ;
                document.getElementById('shortCurrentRepo').innerText = folderObject.folderName;
                document.getElementById('currentRepo').innerText = folderObject.folderPath;
                
                opener.pragmaLog('   repopath = ' + folderObject.folderPath);
                opener.pragmaLog('   repo url = ' + state.repos[state.repoNumber].remoteURL ) ;
                opener.pragmaLog(' ');

                // Set Radiobutton (can be user-clicked from settings-window, or not set because callback initiated from main-window)
                document.getElementById(id).checked=true


                
                // Update display of local author info (read from git)
                await updateLocalAuthorInfoView();
                
                // Update local repo settingsDir
                
                document.getElementById('allowPushToRemote').checked = state.repos[state.repoNumber].allowPushToRemote;
                if ( state.repos[state.repoNumber].allowPushToRemote ){                                    
                    document.getElementById('autoPushDiv').style.visibility = 'visible';
                }else{
                    document.getElementById('autoPushDiv').style.visibility = 'collapse';
                } 
                
                document.getElementById('autoPushToRemote').checked = state.repos[state.repoNumber].autoPushToRemote;
                
                document.getElementById('NoFF_merge').checked = state.repos[state.repoNumber].NoFF_merge;
                document.getElementById('useGlobalAuthorInfo').checked = state.repos[state.repoNumber].useGlobalAuthorInfo;
                
                
 
                await updateLocalAuthorInfoView( state.repos[state.repoNumber].useGlobalAuthorInfo);       
                
                                
                // Update displayed .gitignore     
                let ignoreFileName = global.state.repos[global.state.repoNumber].localFolder + pathsep + '.gitignore'; 
                if (fs.existsSync(ignoreFileName) ){
                    document.getElementById('gitignoreText').innerText = fs.readFileSync(ignoreFileName);
                }

         

                
            }catch(err){
                // Probably no branches, because repo does not exist
            }
            
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
            
            let index = remoteRepos.fetch.pos - 1;
            
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
                let id = 10000 + state.repoNumber;
                document.getElementById(id).value = newUrl;
                state.repos[state.repoNumber].remoteURL = newUrl;
                testURL( id, event);
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
                    }else{
                            
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
                    
                    
                    // Push (doesn't harm, but sends an initial commit if created locally but not yet pushed)
                    opener.gitPush();
                    
                    
                } 
                
                
                
                          
            }
            testURL(textareaId, event);
            
            // Update Remote tab 
            if ( document.getElementById('newRepoAliasTextarea').value == 'origin' ){
                await opener.cacheBranchList(); 
                getRemoteRepoInfo();
                updateRemoteRepos();
                
                document.getElementById('additionalRemoteURL').value = newUrl;
            }

            break;
        }
        case 'makeUrlButtonClicked': {
            // For :
            // - Build a url
            
            nw.Window.open('Create_github_repository.html', 
                {},
                function(cWindows){ 
                    
                    cWindows.on('loaded', 
                        function(){
                            cWindows.show();     
                            
                            // Workaround so it is not hidden by windows
                            cWindows.setAlwaysOnTop(true); 
                        }
                    );
    
                }
            );

            break;
        }

    } // End switch
    


}

async function testURL(textareaId, event){
    
    let outputColor = 'red'
    
    document.getElementById(textareaId).classList.add('grey');  // Make grey until known if success or fail
    
    let remoteURL
            
    // Test if remote URL works
    try{
            remoteURL = document.getElementById(textareaId).value;
        
            console.log('textareaId = ' + textareaId);
            console.log('remoteURL = ' + remoteURL);
    
             
            const commands = [ 'ls-remote', remoteURL];
            
            // Two versions, with and without askpass dialog
            if ( event.type == 'no_askpass'){
                document.getElementById(textareaId).classList.remove('green');
                document.getElementById(textareaId).classList.remove('grey');
                document.getElementById(textareaId).classList.add('red'); 
                await simpleGit().env('GIT_ASKPASS', '').raw(  commands, onListRemote); // GIT_ASKPASS='' inhibits askpass dialog window
            }else{
                await simpleGit().raw(  commands, onListRemote); // default askpass 
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
    }
                
    // Set color        
    document.getElementById(textareaId).classList.remove('green');
    document.getElementById(textareaId).classList.remove('grey');
    document.getElementById(textareaId).classList.remove('red');
    document.getElementById(textareaId).classList.add(outputColor);
 }
function forgetButtonClicked(event){
    let index = event.currentTarget.getAttribute('id');
    console.log('Settings - button clicked');
    console.log('Settings - event id = ' + index);


    console.log('Settings - state.repos before and after removal of clicked element : ');
    console.log(state.repos);
    
    console.log('Settings - removing index = ' + index);
    state.repos.splice(index,1); // Remove index
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

    

    console.log('Settings - updating table :');
    
    //generateRepoTable( document, table, state.repos); // generate the table first
}
async function closeWindow(){

    // Read fields into state
    if ( !('tools' in state) ){
        state.tools = {};
    }
    state.tools.difftool = document.getElementById('gitDiffTool').value;
    state.tools.mergetool = document.getElementById('gitMergeTool').value;
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
    
    opener.deleteWindowMenu('Settings')
    
 
}


// Git
async function gitClone( folderName, repoURL){
     
    //example :
    // /Users/jan/Desktop/TEMP/cloned-TestJanAxelssonTest/
    // https://github.com/JanAxelssonTest/test3.git
    
    
    // Combine URL and folder name => repo folder
    let repoWithExtension = repoURL.replace(/^.*[\\\/]/, '');
    let repoName = repoWithExtension.split('.').slice(0, -1).join('.');
    let topFolder = folderName + pathsep + repoName;
    topFolder = topFolder.replace(/[\\\/]$/, '')


    // Clone

    try{
        // 1) Clone 
        let options = [];
        opener.mkdir(folderName);  // Create folder if it does not exist
        await simpleGitLog(folderName).clone(  repoURL, topFolder, options, onClone);
        function onClone(error, result ){}; 
        
        // 2) Checkout default branch
        await simpleGitLog(topFolder).checkout( onCheckout);
        function onCheckout(err, result){
            // if err =="Error: fatal: You are on a branch yet to be born"
            // This happens for instance when a Github repo is created, but no commits exist.
            // Reuse dialog : document.getElementById('doYouWantToInitializeRepoDialog').showModal(); ?
            // which asks permisson to init repo
            if ( err.toString().includes('to be born') ) {  // if err == "Error: fatal: You are on a branch yet to be born"
                localState.droppedRepoFolder = topFolder;
                document.getElementById('doYouWantToInitializeRepoDialog').showModal();  // handle in _callback('initializeRepoOK')
                return
            }                    
        };
        
    }catch(err){ 
        console.log(err);
        opener.pragmaLog(err);
        
        //displayAlert('Failed cloning', err)
        return
    }
        
    // Add this repo to state
    try{

        
        // Add folder last in  state array
        var index = state.repos.length;
        state.repos[index] = {}; 
        state.repos[index].localFolder = topFolder;
        
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
        
        // Update "Allow git push" setting
        let allowPush = document.getElementById('allowPushToRemoteClone').checked;  // Read from checkbox in the clone command
        state.repos[state.repoNumber].allowPushToRemote = allowPush;  // Set to state for this repo (so it will be redrawn)
        
        // Set other per repo settings to default value
        state.repos[state.repoNumber].autoPushToRemote = true;
        state.repos[state.repoNumber].NoFF_merge = true;
        
        // Change to Software tab (In repo tab, where we already are)
        Array.from(document.querySelectorAll('button')).find(el => el.textContent === 'Software (this repo)').click();

    }catch(err){
        console.log(err);
        return
    }


} 
async function gitBranchList( folderName){
    let branchList;
    
    try{
        await simpleGit( folderName).branch(['--list'], onBranchList);
        function onBranchList(err, result ){console.log(result); branchList = result.all};
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
            output = await simpleGit().getConfig( key, scope);
        }else{
            output = await simpleGit( state.repos[ repoNumber].localFolder).getConfig( key, scope);
        } 
        
        console.log(output);
    }catch(err){ 
        console.error(err); 
        
    }  
    
    return await output.value;             
}
async function gitWriteConfigKey( key, value, scope){

        
    try{
        if (scope == 'global'){
            await simpleGit().addConfig(key, value, false, scope);
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
         simpleGit(  state.repos[ repoNumber].localFolder  ).raw(commands ,onConfig);
        function onConfig(err, result ){ }
    }catch(err){
        console.error('Failed removing key = ' + key + ' from ' + scope + ' scope');
    }
                       
}

async function fixEmptyLocalAuthors(){ // Empty local author info removed

    for (let i = 0; i < state.repos.length; i++){

        // Default to global authorinfo if missing
        if ( state.repos[i].authorName == undefined || state.repos[i].authorName.trim().length == 0 ){
            state.repos[i].useGlobalAuthorInfo = true;
            
            // Clean from git config --local 
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

 
    // For systems that have multiple workspaces (virtual screens)
    if ( win.canSetVisibleOnAllWorkspaces() ){
        win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
    } 
    
    // Always on top
    win.setAlwaysOnTop( state.alwaysOnTop );
    
    console.log('Settings - settings.js entered');  
    console.log('Settings - state :');  
    console.log(global.state);
    
    // Write path to System info 
    if ( os.platform().startsWith('win') ){    
        document.getElementById('path').innerHTML = process.env.PATH
        .replace(/;\s*/g,';<br>'); // Replace semicolons
    }else{
        document.getElementById('path').innerHTML = process.env.PATH.replace(/:\s*/g,':<br>'); // Replace colons 
    }
    
    // Draw tabs
    await drawBranchTab(document);
    await drawRepoTab(document);
    await drawSoftwareTab(document);
    
    // Simulate callback for changed repo (fill in some checkboxes specific for current repo)
    _callback('repoRadiobuttonChanged', {id: state.repoNumber});
    
    // Set tab from setting
    tabButton[state.settingsWindow.selectedTab].click();

    // Set Software as first sub-tab in Repo tab
    document.getElementById('SoftwareTab').click(); 
    
    
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
        
        // Set tab from setting
        let tab = 1; // Repository tab
        tabButton[ tab ].click();
    }



};


// Remote repos functionality
function getRemoteRepoInfo() { // Reads data for current repo

    // Read and put 'origin' first
    let  input = { names: opener.cachedBranchList.remoteRepos.fetch.names, URLs: opener.cachedBranchList.remoteRepos.fetch.URLs } ;
    setOriginFirst( input );
    remoteRepos.fetch.names = input['names'];
    remoteRepos.fetch.URLs  = input['URLs'];
    
    input = { names: opener.cachedBranchList.remoteRepos.push.names, URLs: opener.cachedBranchList.remoteRepos.push.URLs } ;
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
}



// Draw
async function drawBranchTab(document){
    let myLocalFolder = state.repos[state.repoNumber].localFolder;
    
    document.getElementById("branchesTableBody").innerHTML = ""; 
    table = document.getElementById("branchesTableBody");
    let branchList = await gitBranchList( myLocalFolder);
    generateBranchTable(document, table, branchList); 
}
async function drawRepoTab(document){
    
    let data = state.repos;
    let table = document.getElementById("settingsTableBody");
    generateRepoTable(document, table, data);
}
async function drawSoftwareTab(document){
    
    // Write system information to divs
    
    let VERSION = require('./package.json').version;
    document.getElementById('version').innerText = VERSION;
    document.getElementById('latestVersion').innerText = localState.LATEST_RELEASE;
    document.getElementById('nw-version').innerText = process.versions['nw']  + '(' + process.versions['nw-flavor'] + ')';
    document.getElementById('platform').innerText = process.platform;
    
    
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
    document.getElementById('pathAddition').value = state.tools.addedPath;
    
    // Set values according to git-config
    try{
        //configList = await gitConfigList( state.repos[state.repoNumber].localFolder ); 
        //console.log(configList);
        document.getElementById('authorName').value  = await gitReadConfigKey( state.repoNumber, 'user.name', 'global');
        document.getElementById('authorEmail').value = await gitReadConfigKey( state.repoNumber, 'user.email','global');
        
        // Show for local repo
        await updateLocalAuthorInfoView();  
        
    }catch(err){
        console.error(err);
    }
    
    // Set Zoom
    document.getElementById('zoom').value = state.zoom;
    document.getElementById('zoomMain').value = state.zoomMain;
    
    // Disable onAllWorkspaces, for systems that DO NOT support multiple workspaces (virtual screens)
    if ( ! win.canSetVisibleOnAllWorkspaces() ){
        document.getElementById('onAllWorkspaces').disabled = true;
    }
    
}

async function createHtmlTable(document){
    
    console.log('Settings - createHtmlTable entered');
    console.log('Settings - document :');
    console.log(document)
    
            
    // branch table is generated inside generateRepoTable

    

    // Repo table           
        
        let table = document.getElementById("settingsTableBody");
        console.log('Settings - data repos:');

        // Amend data with a field for remote repo
        for (let i in state.repos) {
            let configList;
            try{
                configList = await gitConfigList( state.repos[i].localFolder ); 
                state.repos[i].remoteURL = configList["remote.origin.url"];
                console.log( state.repos[i].localFolder);
                console.log( configList["remote.origin.url"]);   
            }catch(err){
                configList = [];
                console.log( state.repos[i].localFolder);
                console.log( 'Caught error');
            }
        }   
        
        await generateRepoTable( document, table, state.repos); // generate the table first



}
async function generateRepoTable(document, table, data) {
    var index = 0; // Used to create button-IDs
    
    
    let foundIndex = 0;  // index matching currentRepoFolder
    
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
            cell.setAttribute("class", 'localFolder');
            
    
            var radiobox = document.createElement('input');
            radiobox.setAttribute("name", "repoGroup");
            radiobox.setAttribute("onclick", "_callback('repoRadiobuttonChanged',this)");
            radiobox.type = 'radio';
            radiobox.id = index;
            radiobox.value = 'email';
            
            var label = document.createElement('label')
            label.htmlFor = index;
            var description = document.createTextNode(element.localFolder);
            label.appendChild(description);
            
            var newline = document.createElement('br');
            
            cell.appendChild(radiobox);
            cell.appendChild(label);
            cell.appendChild(newline);
            

            
            // Set radio-button to current repo
            if ( currentRepoFolder == element.localFolder){
                radiobox.setAttribute("checked", true);
                foundIndex = index;
            }
    
              
             //  Into table cell :  Remote URL textarea + button
            cell = row.insertCell();
            cell.setAttribute("class", 'remoteURL');
            
            textarea = document.createElement('textarea');
            textarea.setAttribute("id", index + 10000);
            textarea.value = element.remoteURL;
            cell.appendChild(textarea);
            
            // Test-button (Set)
            cell = row.insertCell();
            cell.setAttribute("class", 'setURL');
            button = document.createElement('button');
            button.setAttribute("id", index + 20000);
            button.innerHTML = 'Set';
            button.setAttribute("onclick", "_callback('setButtonClicked',this)"); // this.type='submit'; 
            cell.appendChild(button);
                       
            // Run test
            //_callback('setButtonClicked',{id: index + 20000, type: 'no_askpass'}); // this.type='no_askpass';
            testURL(index + 10000, {type: 'no_askpass', id: index + 20000});
                          
            // Into table cell :  button
            cell = row.insertCell();
            cell.setAttribute("class", 'repoAction');
            
            button = document.createElement('button');
            button.setAttribute("id", index);
            button.innerHTML = 'Forget';
            button.onclick = forgetButtonClicked;
    
            cell.appendChild(button);
            
            //
            // Validate repo and folder
            //
            


                             
            // Check if localFolder exists -- make red otherwise
            if (fs.existsSync(element.localFolder)) {
                // If folder exists, I am allowed to check if repo
                
                // Check if repository -- make red otherwise
                var isRepo;
                await simpleGit(element.localFolder).checkIsRepo(onCheckIsRepo);
                function onCheckIsRepo(err, checkResult) { isRepo = checkResult}
                if (!isRepo) {
                    label.style.color = 'red';
                    label.innerHTML = '<b><i>(not a repo)</i></b> : ' + label.innerHTML ;
                }
            }else{    
                // localFolder missiong -- make red 
                label.style.color = 'red';
                label.innerHTML = '<b><i>(not a folder)</i></b> : ' + label.innerHTML;
            }
            
      
            
            
        
     
            // counter update
            index ++;
        }
    } // if any repos

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
    console.log(table);
    
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
async function updateLocalAuthorInfoView( globalSelected ){
    // The principle is that if local does not exist => checkbox will be selected to use global
    // BUT, if local is manually selected with checkbox, globalSelected is true/false (call with one argument)
    // (if called without argument, globalSelected = undefined )
    
    
     // Read local from git
    let localAuthorName = await gitReadConfigKey( state.repoNumber, 'user.name', 'local');
    let localAuthorEmail = await gitReadConfigKey( state.repoNumber, 'user.email', 'local');
    
    // Must be global if local is undefined
    let useGlobal = ( localAuthorName == undefined );
    

    // If local    
    if (  globalSelected == false  ){
        if (localAuthorName == undefined)
            localAuthorName = document.getElementById('authorName').value;
        if (localAuthorEmail == undefined)
            localAuthorEmail = document.getElementById('authorEmail').value;
        
        // Show / hide warning text for empty name        
        if ( state.repos[ state.repoNumber ].authorName.trim().length == 0 ){       
            document.getElementById('warnThatLocalAuthorInfoMissing').style.visibility = 'visible';
        }else{
             document.getElementById('warnThatLocalAuthorInfoMissing').style.visibility = 'collapse';
        }
        
        useGlobal = false;
    }
    
    // If Global
    if (globalSelected == true){
        useGlobal = true;
        document.getElementById('warnThatLocalAuthorInfoMissing').style.visibility = 'collapse';
    }
    
    
    // Update HTML according to local / global
    
    if ( useGlobal ){
        state.repos[state.repoNumber].useGlobalAuthorInfo = true;
            
       //document.getElementById('useGlobalAuthorInfo').checked = true   
        document.getElementById('thisRepoAuthorName').value = document.getElementById('authorName').value;
        document.getElementById('thisRepoAuthorEmail').value = document.getElementById('authorEmail').value;
    
        document.getElementById('thisRepoAuthorName').readOnly = true;
        document.getElementById('thisRepoAuthorEmail').readOnly = true;
        
        document.getElementById('warnThatLocalAuthorInfoMissing').style.visibility = 'collapse';
    }else{
        state.repos[state.repoNumber].useGlobalAuthorInfo = false;
        
        //document.getElementById('useGlobalAuthorInfo').checked = false
        document.getElementById('thisRepoAuthorName').readOnly = false;
        document.getElementById('thisRepoAuthorEmail').readOnly = false;
        
        document.getElementById('thisRepoAuthorName').value = localAuthorName;
        document.getElementById('thisRepoAuthorEmail').value = localAuthorEmail; 


    }   
            

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

