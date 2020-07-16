
// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');
        
const pathsep = require('path').sep;  // Os-dependent path separator
        
const simpleGit = require('simple-git');  



var state = global.state; // internal copy of global.state
var localState = global.localState; 

var win

// ---------
// FUNCTIONS
// ---------    

// Start initiated from settings.html
async function injectIntoSettingsJs(document) {
    console.log('resolveConflicts.js entered');
    win = gui.Window.get();
    let status_data;
    
    try{
        await simpleGit( state.repos[state.repoNumber].localFolder).status( onStatus );
        function onStatus(err, result ){ status_data = result; console.log(result); console.log(err) };
    }catch(err){
        
    }

    createConflictingFileTable(document, status_data);
    createDeletedFileTable(document, status_data);

};

// Callbacks 
async function _callback( name, event){
    
    // Hide all messages
    hideMesssage('resultRepo');
    hideMesssage('resultBranch');
    
    let id = event.id;
    let value, table, data2, branchList;
    //var localFolder = "";
    let textareaId, realId;
    let newUrl;
    
    console.log('_callback = ' + name);
    switch(name) {
        
        
        case 'checkboxChanged':
            console.log('checkboxChanged');
            console.log(event);
            value = event.checked;
            state[id] = value;
            break;
    
        case 'folderSelectButton' :
            //This calls the hidden folder dialog input-element in settings.html
            document.getElementById("cloneFolderInputButton").value = "";  // Reset value (so that I am allowed to chose the same folder as last time)
            document.getElementById("cloneFolderInputButton").click();
            
            break;       
            
        case 'folderSelectButtonPressed' :
            //This should be called when hidden input-element is changed (see id="cloneFolderInputButton", in settings.html)
            console.log('Selected folder = ');
            console.log(event.value);
            console.log(event);
            
            let localFolder = event.value;
            
            // I know that the last row has index same as length of number of repos
            document.getElementById(state.repos.length).value = localFolder;
        
            break;
    

            
        case 'cloneButtonPressed' :
            console.log('cloneButtonPressed');
            
            // I know that the last row has index same as length of number of repos
            id = state.repos.length;
            
            let folder = document.getElementById(id).value;  // ID 3
            let URL = document.getElementById( id + 10000).value; // ID 10003
            
            await gitClone( folder, URL);
        
            break;

            
        case 'repoRadiobuttonChanged':
            console.log('repoRadiobuttonChanged');
            console.log(event);
            value = event.checked;
            
            // Replace table 
            document.getElementById("branchesTableBody").innerHTML = ""; 
            
             // Display changes
            table = document.getElementById("branchesTableBody");
            data2 = Object.keys(state.repos[id]);
            let myLocalFolder = state.repos[id].localFolder;
            //localFolder = state.repos[id].localFolder;
            
            try{
                branchList = await gitBranchList( myLocalFolder);
                generateBranchTable( document, table, branchList); // generate the table first
            }catch(err){
                // Probably no branches, because repo does not exist
            }
            
            // Show current repo
            document.getElementById("currentRepo").innerHTML = myLocalFolder;
            
            // Set state (so it will be updated in main program)
            state.repoNumber = Number(id);  // id can be a string
            
            break;
 
         
        case 'newBranchNameKeyUp':

            let string = document.getElementById("branchNameTextarea").value;
            // Remove ^~?:*[\ 
            string = string.replace( /[\^\~\?\:\*\[]/g, ''); //   (Test:   'abc:^~?*\[:d'.replace( /[\^\~\?\:\*\[\\]/g, '')   // should give abcd )
            // Remove more
            string = string.replace( ' ', ''); // Removing space
            string = string.replace( '..', '.'); // Removing consecutive dots@{
            string = string.replace( '@{', '@'); // Stop sequence @{
            
            
            document.getElementById("branchNameTextarea").value = string;
            break;        
 
           
        case 'addBranchButtonPressed':
        
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
            
            break;
    
 
    
        case 'setButtonClicked':
            // For :
            // - Set button
            // - Test button used in cloning
 
            let isSetButton = event.innerHTML == "Set";    
               
            console.log('setButtonClicked');
            console.log(event);
            value = event.value;
            
            
            realId = id - 20000; // Test button id:s are offset by 20000 (see generateRepoTable)
            textareaId = realId + 10000; // URL text area id:s are offset by 10000 (see generateRepoTable)
        
            
            // Make black, to show user that something happened (if green or red before
            document.getElementById(textareaId).style.color='grey';
            
            
            //  Set remote URL 
            if ( isSetButton ){
                
                let localFolder3 = state.repos[ realId].localFolder; 

                // Set remote url
                newUrl = document.getElementById(textareaId).value;
                try{
                    const commands = [ 'remote', 'set-url','origin', newUrl];
                    await simpleGit( localFolder3).raw(  commands, onSetRemoteUrl);
                    function onSetRemoteUrl(err, result ){console.log(result);console.log(err)  };
                    
                    // Set if change didn't cause error (doesn't matter if URL works)
                    state.repos[realId].remoteURL = newUrl;
                }catch(err){
                    displayMessage('resultRepo', 'Failed setting remote URL', err)
                    console.log('Repository set URL failed');
                    console.log(err);
                    document.getElementById(textareaId).style.color='orange';
                }           
            }

            // Test if remote URL works
            try{
                let remoteURL = document.getElementById(textareaId).value;
                //await simpleGit().listRemote( remoteURL, onListRemote);
                
                    const commands = [ 'ls-remote', remoteURL];
                    await simpleGit().raw(  commands, onListRemote);
                    function onSetRemoteUrl(err, result ){console.log(result) };
                
                function onListRemote(err, result ){console.log(result) };
                document.getElementById(textareaId).style.color='green';
    
            }catch(err){
                displayMessage('resultRepo', 'Failed verifying remote URL', err)
                console.log('Repository test failed');
                console.log(err);
                document.getElementById(textareaId).style.color='red';
            }

    
            // git remote set-url origin https://JanAxelssonTest:jarkuC-9ryvra-migtyb@github.com/JanAxelssonTest/test.git
            
            break;


    } // End switch
}
function closeWindow(){

    // Return
    localState.mode = 'UNKNOWN';
    
}

// Draw
function createConflictingFileTable(document, status_data) {
    var index = 0; 
    let table = document.getElementById('conflictingTableBody'); // table body
    let cell, row;

    for (let i in status_data.files) {
        let fileStruct = status_data.files[i];
        if ( fileStruct.working_dir == 'U' ){
            console.log( fileStruct.path);
            
            let row = table.insertRow();

            
             // Into table cell :   path
            cell = row.insertCell();
            text = document.createTextNode( fileStruct.path );
            cell.appendChild(text);
            
        } 
        index = index + 1;
    }
}
function createDeletedFileTable(document, status_data) {
    var index = 10000; // Checkbox id
    let table = document.getElementById('deletedTableBody'); // table body
    let cell, row;
    
    for (let i in status_data.files) { 
        let fileStruct = status_data.files[i];
        if ( fileStruct.working_dir == 'D' ){
            console.log( fileStruct.path);
            
            let row = table.insertRow();

            //
            // First cell
            //
                cell = row.insertCell();
                cell.setAttribute("class", 'localFolder');
                
                // Checkbox
                var checkbox = document.createElement('input');
                checkbox.setAttribute("name", "repoGroup");
                checkbox.setAttribute("onclick", "_callback('repoRadiobuttonChanged',this)");
                checkbox.type = 'checkbox';
                checkbox.id = index;
                checkbox.checked = true;
                
                
                // Label
                var label = document.createElement('label')
                label.htmlFor = index;
                
                var description = document.createTextNode( fileStruct.path);
                label.appendChild(description);
                
                var newline = document.createElement('br');
                
                cell.appendChild(checkbox);
                cell.appendChild(label);
                cell.appendChild(newline);
            
            
            
            
        } 
        index = index + 1;
    }

   

   
}
