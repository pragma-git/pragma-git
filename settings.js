
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
            
            // Update cached branch list
            opener.cacheBranchList();
                
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
            let URL = document.getElementById('urlToClone').value; 
            
            document.getElementById('cloneStatus').innerHTML = 'Cloning in progress ';
            const dummy = await gitClone( folder, URL);
            document.getElementById('cloneStatus').innerHTML = '';
            
            // Replace table 
            document.getElementById("settingsTableBody").innerHTML = ""; 
            createHtmlTable(document);

        
            break;
        }  
        case 'addRepoButtonPressed' : {
            // If folder is a repo -> add
            // If not a repo show dialog doYouWantToInitializeRepoDialog
            // which calls _callback('initializeRepoOK')
            
            console.log('addRepoButtonPressed');

            let folder = document.getElementById('addFolder').value;  
            
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
            
            await opener._callback('initializeRepoOK');
            
            let folder = document.getElementById('addFolder').value; 
 
            // add repo to program
            try {
                await opener.addExistingRepo( folder); 
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

                
                    
                // Update repo name
                let folderObject =  await opener.gitLocalFolder() ;
                document.getElementById('shortCurrentRepo').innerText = folderObject.folderName;
                document.getElementById('currentRepo').innerText = folderObject.folderPath;

                // Set Radiobutton (can be user-clicked from settings-window, or not set because callback initiated from main-window)
                document.getElementById(id).checked=true
                
                // Update displayed .gitignore 
                let ignoreFileName = global.state.repos[global.state.repoNumber].localFolder + pathsep + '.gitignore'; 
                document.getElementById('gitignoreText').innerText = fs.readFileSync(ignoreFileName);

                
                // Update cached branch list
                opener.cacheBranchList();

                
            }catch(err){
                // Probably no branches, because repo does not exist
            }
            
            break;
        }        
        case 'newBranchNameKeyUp': {

            document.getElementById('branchNameTextarea').value = util.branchCharFilter( document.getElementById('branchNameTextarea').value)
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
                await simpleGit(  state.repos[ state.repoNumber].localFolder  ).branch( ['-D', branchName], onDeleteBranch);
                function onDeleteBranch(err, result ){
                    console.log(result);
                    console.log(err);
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
                
                let localFolder3 = state.repos[ realId].localFolder; 

                // Set remote url
                newUrl = document.getElementById(textareaId).value;
                try{
                    const commands = [ 'remote', 'set-url','origin', newUrl];
                    await simpleGit( localFolder3).raw(  commands, onSetRemoteUrl);
                    function onSetRemoteUrl(err, result ){
                        console.log(result);
                        console.log(err)  
                    };
                    
                    // Set if change didn't cause error (doesn't matter if URL works)
                    state.repos[realId].remoteURL = newUrl;
                }catch(err){
                    console.log('Repository set URL failed');
                    console.log(err);
                }           
            }
            testURL(textareaId, event);

            break;
        }
        case 'makeUrlButtonClicked': {
            // For :
            // - Build a url
            
            nw.Window.open('Create_github_repository.html', {});

            break;
        }

    } // End switch
    


}

async function testURL(textareaId, event){
    
    let outputColor = 'red'
    
    document.getElementById(textareaId).classList.add('grey');  // Make grey until known if success or fail
    
    let repoId = textareaId - 10000;
    let remoteURL
            
    // Test if remote URL works
    try{
            remoteURL = document.getElementById(textareaId).value;
        
            console.log('textareaId = ' + textareaId);
            console.log('TESTURL ID = ' + repoId);
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
                console.log('onListRemote');
                console.log(err);
                outputColor = 'green'
                if (result == undefined){
                    outputColor = 'red'
                }
            };


    }catch(err){
        
        outputColor = 'red'
        document.getElementById(textareaId).classList.add('red');
        console.log('Repository test failed ' + remoteURL);
        console.log(err);
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

    
    // Return (NOTE: Settings window is a'mode' in app.js -- let app.js _update take care of this)
    localState.mode = 'UNKNOWN';
    //localState.settings = false;
    
 
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
        await simpleGit( folderName).clone(  repoURL, topFolder, options, onClone);
        function onClone(error, result ){console.log(result);console.log(error) }; 
        
        // 2) Checkout default branch
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
    document.getElementById('latestVersion').innerText = localState.LATEST_RELEASE;
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
    document.getElementById('StashPop').checked = state.StashPop;
    
    
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
    
    // Set Zoom
    document.getElementById('zoom').value = state.zoom;
    document.getElementById('zoomMain').value = state.zoomMain;
    
    // Disable onAllWorkspaces, for systems that DO NOT support multiple workspaces (virtual screens)
    if ( ! win.canSetVisibleOnAllWorkspaces() ){
        document.getElementById('onAllWorkspaces').disabled = true;
    }
    
    // Build repo table
    document.getElementById("settingsTableBody").innerHTML = ""; 
    await createHtmlTable(document);  


    // Set tab from setting
    tabButton[state.settingsWindow.selectedTab].click();

    document.getElementById('cloneTab').click(); 
    
    
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

// Draw
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

