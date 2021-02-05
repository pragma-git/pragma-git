
// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');
const simpleGit = require('simple-git');  

var util = require('./util_module.js'); // Pragma-git common functions
       
const pathsep = require('path').sep;  // Os-dependent path separator

// Global for whole app
var state = global.state; // internal copy of global.state
var localState = global.localState; 

var win

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
    switch(name) {  
        case 'checkboxChanged': {
            console.log('checkboxChanged');
            console.log(event);
            value = event.checked;
            state[id] = value;
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
            
            break;
        }
        case 'folderSelectButton' : {
            //This calls the hidden folder dialog input-element in settings.html
            document.getElementById("cloneFolderInputButton").value = "";  // Reset value (so that I am allowed to chose the same folder as last time)
            document.getElementById("cloneFolderInputButton").click();
            
            break;   
        }    
        case 'folderSelectButtonPressed' : {
            //This should be called when hidden input-element is changed (see id="cloneFolderInputButton", in settings.html)
            console.log('Selected folder = ');
            console.log(event.value);
            console.log(event);
            
            let localFolder = event.value;
            
            // I know that the last row has index same as length of number of repos
            document.getElementById(state.repos.length).value = localFolder;
        
            break;
        }   
        case 'cloneButtonPressed' : {
            console.log('cloneButtonPressed');
            
            // I know that the last row has index same as length of number of repos
            id = state.repos.length;
            
            let folder = document.getElementById(id).value;  // ID 3
            let URL = document.getElementById( id + 10000).value; // ID 10003
            
            await gitClone( folder, URL);
            

        
            break;
        }
        case 'repoRadiobuttonChanged': {
            console.log('repoRadiobuttonChanged');
            console.log(event);
            value = event.checked;
                
            try{                    
                // Set state (so it will be updated in main program)
                state.repoNumber = Number(id);  // id can be a string
                        
                // Replace table 
                document.getElementById("branchesTableBody").innerHTML = ""; 
                
                 // Display changes
                table = document.getElementById("branchesTableBody");
                let myLocalFolder = state.repos[id].localFolder;

                branchList = await gitBranchList( myLocalFolder);
                
                
                generateBranchTable( document, table, branchList); // generate the table first
                
                // Match size if unfolded (otherwise, mixup for icons '-' instead of '+'
                if ( document.getElementById("repoSettings").classList.contains('active') ){
                    increaseDivSize('foldableDiv1');
                }
                
    
                
                // Show current repo
                document.getElementById("currentRepo").innerHTML = myLocalFolder;


                
            }catch(err){
                // Probably no branches, because repo does not exist
            }
            
            break;
        }        
        case 'newBranchNameKeyUp': {

            let string = document.getElementById("branchNameTextarea").value;
            // Remove ^~?:*[\ 
            string = string.replace( /[\^\~\?\:\*\[]/g, ''); //   (Test:   'abc:^~?*\[:d'.replace( /[\^\~\?\:\*\[\\]/g, '')   // should give abcd )
            // Remove more
            string = string.replace(/[\x00-\x1F\x7F-\x9F]/g, ""); // Remove control characters
            string = string.replace( ' ', ''); // Removing space
            string = string.replace( '..', '.'); // Removing consecutive dots@{
            string = string.replace( '@{', '@'); // Stop sequence @{
            
            
            document.getElementById("branchNameTextarea").value = string;
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
            
            increaseDivSize('foldableDiv1');
            
            break;
        }
        case 'deleteBranchClicked' : {
            let branchName = event;
            localFolder = document.getElementById('currentRepo').innerHTML;  // This is what the user sees, so lets use that
            console.log('deleteBranchClicked -- branch = ' + branchName);
            
            try{
                await simpleGit( localFolder ).branch( ['-d', branchName], onDeleteBranch);
                function onDeleteBranch(err, result ){
                    console.log(result);
                    console.log(err);     
                }
            }catch(err){ 

                // Most likely, this is because the branch was not fully merged. 
                if ( err.message.includes('is not fully merged') ) {
                    document.getElementById('forceDeleteBranchDialog').showModal(); // Ask if force delete
                }else{                      
                    displayAlert('Failed deleting branch', err);  
                    increaseDivSize('foldableDiv1');     
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
            increaseDivSize('foldableDiv1');
            


            break;
        }
        case 'forceDeleteBranchClicked' : {
            let branchName = event;
            localFolder = document.getElementById('currentRepo').innerHTML;  // This is what the user sees, so lets use that
            console.log('forceDeleteBranchClicked -- branch = ' + branchName);
            
            try{
                await simpleGit(  state.repos[ state.repoNumber].localFolder  ).branch( ['-D', branchName], onDeleteBranch);
                function onDeleteBranch(err, result ){
                    console.log(result);
                    console.log(err);
                }
            }catch(err){ 
                
                displayAlert('Failed deleting branch', err);  
                increaseDivSize('foldableDiv1');     
                console.log('Error deleting local branch');
                console.log(err);
                return
            }
            
            // No errors -- Update branches table            
            table = document.getElementById("branchesTableBody");
            branchList = await gitBranchList( localFolder );
            
            document.getElementById("branchesTableBody").innerHTML = ""; 
            generateBranchTable( document, table, branchList); // generate the new branch table 
            increaseDivSize('foldableDiv1');
            
            break;
        }
        case 'setButtonClicked': {
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
            document.getElementById(textareaId).classList.add('grey');
            
            
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
                    
                    console.log('Repository set URL failed');
                    console.log(err);
                    document.getElementById(textareaId).classList.add('red');
                    document.getElementById(textareaId).classList.remove('grey');
                    document.getElementById(textareaId).classList.remove('green');
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
                document.getElementById(textareaId).classList.add('green');
                document.getElementById(textareaId).classList.remove('grey');
                document.getElementById(textareaId).classList.remove('red');
    
            }catch(err){
                
                //displayAlert('Failed verifying remote URL', err)
                console.log('Repository test failed');
                console.log(err);
                document.getElementById(textareaId).classList.add('red');
                document.getElementById(textareaId).classList.remove('grey');
                document.getElementById(textareaId).classList.remove('green');
            }

            
            break;
        }

    } // End switch
    


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
    for (i = 0; i < coll.length; i++) {
        state.settingsWindow.unfolded[coll[i].id] = ( coll[i].classList[1] == 'active');
    }
    
    // Read Dark mode 
    state.darkmode = document.querySelectorAll("input[name=darkmode]:checked")[0].value;
    
    // Set Git author name and email (stored in git, not in settings)
    try{
        commands = [ 'config', '--global', 'user.name', document.getElementById('authorName').value];
        await simpleGit(  state.repos[ state.repoNumber].localFolder  ).raw(commands ,onConfig);
        function onConfig(err, result ){ console.log(result); console.log(err);  }
    }catch(err){
        console.log('Failed storing git user.name');
    }
    
    try{  
        commands = [ 'config', '--global', 'user.email', document.getElementById('authorEmail').value];
        await simpleGit(  state.repos[ state.repoNumber].localFolder  ).raw(commands ,onConfig);
        function onConfig(err, result ){ console.log(result); console.log(err);  }
    }catch(err){
        console.log('Failed storing git user.email');
    }
    
     
    // Return
    localState.mode = 'UNKNOWN';
    
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

    //// Clone
    //try{
        //await simpleGit( folderName).clone(  repoURL, onClone);
        //function onClone(error, result ){console.log(result);console.log(error) }; 
    //}catch(err){ 
        //console.log(err);
        
        //displayAlert('Failed cloning', err)
        //return
    //}

    // Clone all branches
    //    ( this is done by making a bare repo in topFolder/.git : 
    //      and then undoing the bare repo : git config --unset core.bare)
    
    
    try{
        // 1) Clone bare repo
        let options = ['--mirror']
        let bareFolderName = topFolder + pathsep + '.git'; // Make a bare repository 
        await simpleGit( folderName).clone(  repoURL, bareFolderName,options, onClone);
        function onClone(error, result ){console.log(result);console.log(error) }; 
        
        // 2) Make a real repo 
        await simpleGit( topFolder ).raw( [  'config', '--unset' , 'core.bare'] , onConfig);
        function onConfig(err, result) {console.log(result); console.log(err) };
        
        // 3) Checkout default branch
        await simpleGit(topFolder).checkout( onCheckout);
        function onCheckout(err, result){console.log(result)};
        
    }catch(err){ 
        console.log(err);
        
        displayAlert('Failed cloning', err)
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
        state.repoNumber = index;  // Found that it could become a string sometimes
        localState.branchNumber = 0; // Should always start at 0, because that is the first one found in git lookup ( such as used in branchedClicked()  )
    
        // Set global
        state.repos[state.repoNumber].localFolder = topFolder;
        state.repos[state.repoNumber].remoteURL = document.getElementById( index + 10000).value;
        console.log( 'Git  folder = ' + state.repos[state.repoNumber].localFolder );

    }catch(err){
        console.log(err);
        return
    }
    
    // Update Settings display, repos
    document.getElementById("folderSelectButton").setAttribute("id", "dummy"); // Take away this id, before making a new button with same id

    document.getElementById("settingsTableBody").innerHTML = ""; 
    createHtmlTable(document);
    
    
                
    // Update Settings display, branches 
    table = document.getElementById("branchesTableBody");
    data2 = Object.keys(state.repos[0]);  // Used for headers
    
    branchList = await gitBranchList( localFolder2);
    
    document.getElementById('branchNameTextarea').value = ""; // Clear text field
    
    
    document.getElementById("branchesTableBody").innerHTML = ""; 
    generateBranchTable( document, table, branchList); // generate the new branch table 
    
    increaseDivSize('foldableDiv1');
            

        

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
        await simpleGit( folder).raw(  commands, onCreateBranch);
        function onCreateBranch(err, result ){
            console.log(result);
            console.log(err);
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
    
    // Write path to div
    if ( os.platform().startsWith('win') ){    
        document.getElementById('path').innerHTML = process.env.PATH
        .replace(/;\s*/g,';<br>'); // Replace semicolons
    }else{
        document.getElementById('path').innerHTML = process.env.PATH.replace(/:\s*/g,':<br>'); // Replace colons 
    }
    
    // Write system information to divs
    let VERSION = require('./package.json').version;
    document.getElementById('version').innerText = VERSION;
    document.getElementById('nw-version').innerText = process.versions['nw']  + '(' + process.versions['nw-flavor'] + ')';
    document.getElementById('platform').innerText = process.platform;
    

    
    // Set values according to state variable
    document.getElementById(state.darkmode).checked = true;
    
    document.getElementById('alwaysOnTop').checked = state.alwaysOnTop;
    document.getElementById('onAllWorkspaces').checked = state.onAllWorkspaces;
    
    document.getElementById('forceCommitBeforeBranchChange').checked = state.forceCommitBeforeBranchChange;
    document.getElementById('autoPushToRemote').checked = state.autoPushToRemote;
    document.getElementById('NoFF_merge').checked = state.NoFF_merge;
    document.getElementById('FirstParent').checked = state.FirstParent;
    
    document.getElementById('gitDiffTool').value = state.tools.difftool;
    document.getElementById('gitMergeTool').value = state.tools.mergetool;
    document.getElementById('pathAddition').value = state.tools.addedPath;
    
    // Set values according to git-config
    try{
        configList = await gitConfigList( state.repos[state.repoNumber].localFolder ); 
        console.log(configList);
        document.getElementById('authorName').value = configList['user.name'];
        document.getElementById('authorEmail').value = configList['user.email'];
        
    }catch(err){
        console.log(err);
    }
    
    
    
    
    // Disable onAllWorkspaces, for systems that DO NOT support multiple workspaces (virtual screens)
    if ( ! win.canSetVisibleOnAllWorkspaces() ){
        document.getElementById('onAllWorkspaces').disabled = true;
    }
    


    // Build repo table
    await createHtmlTable(document);  

    // Fold / unfold as last time
    for (entry of Object.entries( state.settingsWindow.unfolded) ) {
        console.log( entry);
        let id = entry[0];
        let unfolded = entry[1];
        if (unfolded == true){
            console.log('injectIntoSettingsJs -- unfolding :' + id);
            quickUnfold( document.getElementById(id)); 
        }
    }


    //
    // Internal function
    //
    async function quickUnfold(foldableButton){
        let content = foldableButton.nextElementSibling;
        console.log(content);
        
        // Quick unfold
        content.classList.add('quickUnfold'); 
        foldableButton.click();
    
        // Set transition time back after giving time  for redraw
        setTimeout(() => {  console.log("Wait, and turn off quick transitions!"); content.classList.remove('quickUnfold');}, 1000);
    
    };


};

// Draw
async function createHtmlTable(document){
    
    console.log('Settings - createHtmlTable entered');
    console.log('Settings - document :');
    console.log(document)

    // Repo table           
        //document.getElementById("header_Forget").style.visibility = "visible"; 
        document.getElementById("emptyTable_iFrame").style.height ="0px";
        
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

        
    // Current branch table 
        document.getElementById("emptyBranchTable_iFrame").style.height ="0px";
        
    // branch table is generated inside generateRepoTable

    if (state.repos.length == 0){
        // Show what is needed for empty folder   
        document.getElementById('hide').style.display = "none";
        document.getElementById("emptyTable_iFrame").style.height ="auto"; 
    }

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
            console.log('Element = ' + element );
     
    
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
            button.setAttribute("onclick", "_callback('setButtonClicked',this)");
            cell.appendChild(button);
            
            // Run test
            button.click();
            
                          
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
    
    //
    // Add input for cloning
    //

        let cell, text, button, textarea, radiobutton
        let row = table.insertRow();
        
        // Inner table
        let innerCell;
        let innerTable = document.createElement("table");
        innerTable.setAttribute("id", 'cloneTable');
        
        let innerTableRow = innerTable.insertRow();
        innerTableRow.setAttribute("class", 'cloneTableRow');
        
        // Into first cell : put a small table inside first cell
        cell = row.insertCell();
        
      
            
        
            // Into table cell :  Folder dialog

            innerCell = innerTableRow.insertCell();
            innerCell.setAttribute("class", 'action');
            
            button = document.createElement('button');
            button.setAttribute("id", "folderSelectButton");  // ID
            button.innerHTML = 'Folder';
            button.style.verticalAlign = "middle";
            
            button.setAttribute('onclick', '_callback("folderSelectButton",this)' ); 
            
            innerCell.appendChild(button);  
 
             //  Into table cell :  Local folder
            innerCell = innerTableRow.insertCell();
            innerCell.setAttribute("class", 'cloneLocalFolder');
            
            textarea = document.createElement('textarea');
            textarea.setAttribute("id", index);  // ID  
            
            innerCell.appendChild(textarea);
               
        cell.appendChild(innerTable); 


         //  Into table cell :  Remote URL textarea + button
        cell = row.insertCell();
        cell.setAttribute("class", 'remoteURL');
        
        textarea = document.createElement('textarea');
        textarea.setAttribute("id", index + 10000);  // ID
        cell.appendChild(textarea);
        
            // Test-button
        cell = row.insertCell();
        cell.setAttribute("class", 'setURL');
        button = document.createElement('button');
        button.setAttribute("id", index + 20000);  // ID
        button.innerHTML = 'Test';
        button.setAttribute("onclick", "_callback('setButtonClicked',this)");
        cell.appendChild(button);
 
        // Into table cell :  button
        cell = row.insertCell();
        cell.setAttribute("class", 'repoAction');
        
        button = document.createElement('button');
        button.setAttribute("id", "cloneButton");  // ID
        button.innerHTML = 'Clone';
        button.setAttribute('onclick','_callback("cloneButtonPressed",this)'); 
        cell.appendChild(button);       
                      
        //// Into table cell :  button
        //cell = row.insertCell();
        //cell.setAttribute("class", 'repoAction');
        
        //button = document.createElement('button');
        //button.setAttribute("id", index);
        //button.innerHTML = 'Forget';
        //button.onclick = forgetButtonClicked;

        //cell.appendChild(button);
           
  //<input id="folder-open-dialog" type="file" nwdirectory nwworkingdir="" nwdirectorydesc="Please select a folder" role="hidden" />  
    
    
    // Draw branch by simulating click
    let event =[];
    event.id = foundIndex; // Simulate first clicked
    
    await _callback( "repoRadiobuttonChanged", event);

    
    console.log(table);
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
        
        console.log('Element = ' + element );
        let row = table.insertRow();

         // Into table cell :   Branch name text
        cell = row.insertCell();
        cell.setAttribute("class", 'branchName');
        text = document.createTextNode( element);
        cell.appendChild(text);
        
        
        // Into table cell :  checkbox for hidden branch
        cell = row.insertCell();
        checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.checked = hiddenBranch;
        checkbox.id = 30000 + index;        
        checkbox.setAttribute('onclick', 
            "selectedBranch = '"  + element + "';" + 
            "_callback('hideBranchCheckboxChanged', this );"); 
        cell.appendChild(checkbox);
        
        
 
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
    
     
    // Into table cell :   Branch name textarea
    cell = row.insertCell();
    cell.setAttribute("class", 'branchName');
    
    textarea = document.createElement('textarea');
    textarea.setAttribute("id", 'branchNameTextarea');
    textarea.setAttribute( "onkeyup", "_callback('newBranchNameKeyUp', this);");  
    textarea.innerHTML = "";
    //textarea.onclick = forgetButtonClicked;
    
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
function  increaseDivSize(id){
    let content = document.getElementById(id);
     content.style.maxHeight = content.scrollHeight + "px";
};

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

