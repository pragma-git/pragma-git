
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
function closeWindow(){
    
    // Read fields into state
    if ( !('tools' in state) ){
        state.tools = {};
    }
    state.tools.difftool = document.getElementById('gitDiffTool').value;
    state.tools.mergetool = document.getElementById('gitMergeTool').value;
    
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

    // Clone
    try{
        await simpleGit( folderName).clone(  repoURL, onClone);
        function onClone(error, result ){console.log(result);console.log(error) }; 
    }catch(err){ 
        console.log(err);
        displayMessage('resultRepo', 'Failed cloning', err)
        return
    }
        
    // Add this repo to state
    try{

        
        // Add folder last in  state array
        var index = state.repos.length;
        state.repos[index] = {}; 
        state.repos[index].localFolder = topFolder;
        
        // Clean duplicates from state based on name "localFolder"
        state.repos = cleanDuplicates( state.repos, 'localFolder' );  // TODO : if cleaned, then I want to set state.repoNumber to the same repo-index that exists
        
        try{
            // Set index to match the folder you added
            index = findObjectIndex( state.repos, 'localFolder', topFolder);  // Local function
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
    
    // Update Settings display
    document.getElementById("folderSelectButton").setAttribute("id", "dummy"); // Take away this id, before making a new button with same id
    
    document.getElementById("settingsTableBody").innerHTML = ""; 
    createHtmlTable(document);

        

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
        function onCreateBranch(err, result ){console.log(result);};
    }catch(err){        
        displayMessage('resultBranch', 'Failed creating branch', err);
        console.log('Error creating local branches, in gitCreateBranch');
        console.log(err);
    }

}

// Start initiated from settings.html
function injectIntoSettingsJs(document) {
    win = gui.Window.get();
    
    console.log('Settings - settings.js entered');  
    console.log('Settings - state :');  
    console.log(global.state);
    
    // Set values according to state variable
    document.getElementById('alwaysOnTop').checked = state.alwaysOnTop;
    document.getElementById('forceCommitBeforeBranchChange').checked = state.forceCommitBeforeBranchChange;
    document.getElementById('autoPushToRemote').checked = state.autoPushToRemote;
    
    document.getElementById('gitDiffTool').value = state.tools.difftool;
    document.getElementById('gitMergeTool').value = state.tools.mergetool;
    
    // Build repo table
    createHtmlTable(document);

};

// Draw
async function createHtmlTable(document){
    
    console.log('Settings - createHtmlTable entered');
    console.log('Settings - document :');
    console.log(document)
    
    // Create table if there are any repos
    if (state.repos.length > 0){        
        
        // Repo table           
            //document.getElementById("header_Forget").style.visibility = "visible"; 
            document.getElementById("emptyTable_iFrame").style.height ="0px";
            
            let table = document.getElementById("settingsTableBody");
            let data = Object.keys(state.repos[0]);
            console.log('Settings - data repos:');
            console.log(data);
            
            
                
            // Ammend data with a field for remote repo
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
            
            generateRepoTable( document, table, state.repos); // generate the table first
 
            
        // Current branch table 
            document.getElementById("emptyBranchTable_iFrame").style.height ="0px";
            
        // branch table is generated inside generateRepoTable
        
    }else{ 

        // Hide everything that does not apply to empty folder   
        document.getElementById('hide').style.display = "none";
        
        
        document.getElementById("emptyTable_iFrame").style.height ="auto"; 

   }
   
   //
   // Local functions
   //
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
   



}
async function generateRepoTable(document, table, data) {
    var index = 0; // Used to create button-IDs
    let currentRepoFolder = state.repos[state.repoNumber].localFolder;
    
    let foundIndex = 0;  // index matching currentRepoFolder
    
    //
    // Add repos to table
    //
               
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
            
                // Test-button
            cell = row.insertCell();
            cell.setAttribute("class", 'setURL');
            button = document.createElement('button');
            button.setAttribute("id", index + 20000);
            button.innerHTML = 'Set';
            button.setAttribute("onclick", "_callback('setButtonClicked',this)");
            cell.appendChild(button);
            
                          
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
    _callback( "repoRadiobuttonChanged", event);

    
    console.log(table);
}
function generateBranchTable(document, table, branchlist) {
    var index = 0; // Used to create button-IDs
    let cell, text, button;
 
 
    //
    // Add branches to table
    //
       
    // Loop rows in data
    for (let element of branchlist) {
        console.log('Element = ' + element );
        let row = table.insertRow();
        
        
        // Into table cell :  button
        cell = row.insertCell();
        cell.setAttribute("class", 'branchAction');
        
        button = document.createElement('button');
        button.setAttribute("id", index);
        button.innerHTML = 'Delete';
        button.onclick = forgetButtonClicked;
        cell.appendChild(button);
        
            // Hide button and callback
        button.style.display = "none";  
        button.onclick = forgetButtonClicked;  
        
    
         // Into table cell :   Branch name text
        cell = row.insertCell();
        cell.setAttribute("class", 'branchName');
        text = document.createTextNode( element );
        cell.appendChild(text);



        index ++;
    }
    console.log(table);
    
    //
    // Add branch (extra row at end)
    //
    let row = table.insertRow();
    
    // Into table cell :  button
    cell = row.insertCell();
    cell.setAttribute("class", 'action');
    
    button = document.createElement('button');
    button.setAttribute("id", "addBranchButtonPressed");
    button.innerHTML = 'Add';
    button.setAttribute('onclick','_callback("addBranchButtonPressed",this)'); 
    cell.appendChild(button);
    
      
    
    // Into table cell :   Branch name textarea
    cell = row.insertCell();
    cell.setAttribute("class", 'branchName');
    
    textarea = document.createElement('textarea');
    textarea.setAttribute("id", 'branchNameTextarea');
    textarea.innerHTML = "";
    //textarea.onclick = forgetButtonClicked;
    
    cell.appendChild(textarea);

   
}

function displayMessage(divId, title, message){
    // Writes into div in settins.html
    // Example:
    //  divId = "resultRepo" (with title=resultRepoTitle, message=resultRepoMessage)
    let titleId = divId + 'Title';
    let messageId = divId + 'Message';
    
    document.getElementById(titleId).innerHTML = title;
    document.getElementById(messageId).innerHTML = message;
    
    // Show message
    document.getElementById(divId).style.display = '';
}
function hideMesssage(divId){
    document.getElementById(divId).style.display = 'none';
    
}

// Utility (these are newer in settings.js)
function cleanDuplicates( myArray, objectField ){
    // Removes all elements in "myArray"  where the field "objectField" are duplicates
    //
    // So if objectField = 'localFolder' the duplicates in this kind of array are removed :
    // cleanDuplicates( [ {localFolder: "/Users/jan/Desktop/TEMP/Test-git"}, {localFolder: "/Users/jan/Desktop/TEMP/Test-git"}], 'localFolder' );
    // returns [ {localFolder: "/Users/jan/Desktop/TEMP/Test-git"}]
    
    // Display the list of array objects 
    console.log(myArray); 

    // Declare a new array 
    let newArray = []; 
      
    // Declare an empty object 
    let uniqueObject = {}; 
      
    // Loop for the array elements 
    for (let i in myArray) { 

        // Extract the title 
        objTitle = myArray[i][objectField]; 

        // Use the title as the index 
        uniqueObject[objTitle] = myArray[i]; 
    } 
      
    // Loop to push unique object into array 
    for (i in uniqueObject) { 
        newArray.push(uniqueObject[i]); 
    } 
      
    // Display the unique objects 
    console.log(newArray); 



    return newArray;
}
function findObjectIndex( myArray, objectField, stringToFind ){
    
    var foundIndex; //last found index
    // Loop for the array elements 
    for (let i in myArray) { 

        if (stringToFind === myArray[i][objectField]){
            foundIndex = i;
        }
    } 
    
    return Number(foundIndex);
}


 // NOTES :
    
    // Find all open windows
    //chrome.windows.getAll({populate: true}, function(wins){
        //console.log("windows", wins)
    //})
    
    ////var n = 1;
    ////chrome.windows.getAll({populate: true}, getAllResponse)
    ////function getAllResponse(wins) { console.log("windows", wins); getOneWindow(wins,n)}
    ////function getOneWindow(wins,n) { 
        
        ////console.log("Tab 0 window" + n , wins[n].tabs[0] ); 
        ////console.log("Tab 0 name,  window " + n , wins[n].tabs[0].title ); 
        ////console.log("Tab 0 name,  window " + n , wins[n].window ); 
        //////win = nw.Window.get().cWindow.tabs[0].title
    ////}
    
        //console.log('settings dialog pressed');
    
    //// TODO : Here settings can be done.  For instance remote git linking
    
    //var output;
    //try{
        //await simpleGit(state.repos[state.repoNumber].localFolder).log( (err, result) => {console.log(result); output = result;} );
    //}catch(err){        
        //console.log(err);
    //}   
    
    //var history = output.ListLogSummary.all;
