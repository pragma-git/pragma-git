
// Define DEBUG features
var devTools = false;
var isPaused = false; // Stop timer. In console, type :  isPaused = true

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

const delayInMs = 1000;

// Initiate GUI update loop 
//var timer = _loopTimer( 1000);

// Storage of paths to backup files
//const backupExtension = '.orig';
var origFiles = [];  // Store files found to be conflicting.  Use to remove .orig files of these at the end

// ---------
// FUNCTIONS
// ---------    

// Start initiated from settings.html
async function injectIntoJs(document) {

    
    console.log('resolveConflicts.js entered');
    win = gui.Window.get();
    
    // For systems that have multiple workspaces (virtual screens)
    if ( win.canSetVisibleOnAllWorkspaces() ){
        win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
    }
    
    
    
    
    let status_data;
    
          
    if (devTools == true){
        win.showDevTools();  // WARNING : causes redraw issues on startup
    }

    
    try{
        await simpleGit( state.repos[state.repoNumber].localFolder).status( onStatus );
        function onStatus(err, result ){ status_data = result; console.log(result); console.log(err) };
    }catch(err){
        
    }


    // Draw table
    origFiles = createFileTable(document, status_data);
    document.getElementById('listFiles').click();  // Open collapsed section 

};

// Main functions 
async function _callback( name, event){

    let id = event.id;
    
    console.log('_callback = ' + name);
    switch(name) {
        
        
        case 'applySelectedFilesButton':
            console.log('applySelectedFilesButton');
            console.log(event);
            
            localState.unstaged = makeListOfUnstagedFiles();
            
            
            //
            // This will be done once again after pressing Store (in case something has happened)
            //
               
            // Add all files to index
            var path = '.'; // Add all
            await simpleGit( state.repos[state.repoNumber].localFolder )
                .add( path, onAdd );   
            function onAdd(err, result) {console.log(result) ;console.log(err); }
            
            
            // Remove localState.unstaged from index
            for (var file of localState.unstaged) {
                 await simpleGit( state.repos[state.repoNumber].localFolder )
                .raw( [  'reset', '--', file ] , onReset); 
            }
            function onReset(err, result) {console.log(result) ;console.log(err);}
                    
                    
                    
            
            
            
            
            closeWindow();
            break;
            
        
        //case 'resolveAllDeletedButton':
            //console.log('resolveAllDeletedButton');
            //console.log(event);
            //gitResolveDeletions( state.repos[state.repoNumber].localFolder);
            //break;
     
        //case 'conflictsResolvedButton':
            //console.log('conflictsResolvedButton');
            //console.log(event);
            //gitDeleteBackups( state.repos[state.repoNumber].localFolder);
            //break;
            
        //case 'undoMergeButton':
            //console.log('undoMergeButton');
            //console.log(event);
            //gitUndoMerge( state.repos[state.repoNumber].localFolder);
            //break;


    } // End switch
    
    // ---------------
    // LOCAL FUNCTIONS
    // ---------------

    function makeListOfUnstagedFiles(){
        let unStaged = [];
        
        var table = document.getElementById("listFilesTableBody");
        
        for (var i = 0, row; row = table.rows[i]; i++) {
            //iterate through rows
            //rows would be accessed using the "row" variable assigned in the for loop
            for (var j = 0, col; col = row.cells[j]; j++) {
                //iterate through columns
                //columns would be accessed using the "col" variable assigned in the for loop
            
                let isChecked = col.children[0].checked;
                let file  = col.children[1].innerText;
                if (isChecked == false) {
                    unStaged.push(file);
                }

                console.log(col);
           }  
        }

        return unStaged;
    };


// ================= END CALLBACK =================  
}
async function _loopTimer( delayInMs){
    
    // Define timer
    let timer = window.setInterval( _update, delayInMs );
    return timer
    

    
}
async function _update(){
    if(isPaused) {
        return;
    }
    
    
    let folder = state.repos[state.repoNumber].localFolder;
    let status_data;
    try{
        await simpleGit( folder).status( onStatus );
        function onStatus(err, result ){ 
            status_data = result; 
            console.log(result); 
            console.log(err);
            createConflictingFileTable(document, status_data);
            // createDeletedFileTable(document, status_data);  // CANNOT be updated because that changes checkboxes back
        };
    }catch(err){
        
    }
    
}

function closeWindow(){

    // Return
    localState.mode = 'UNKNOWN';
    
    win.close();
    
}

// Draw
function createFileTable(document, status_data) {
    var index = 10000; // Checkbox id
    let cell, row;
    let foundFiles = [];
        
    // Old tbody
    let old_tbody = document.getElementById('listFilesTableBody');

    // Make  a new tbody
    let tbody = document.createElement("tbody"); // Empty tbody
    tbody.setAttribute('id','listFilesTableBody');

    // Fill tbody with content
    for (let i in status_data.files) { 
        let fileStruct = status_data.files[i];
        let file = fileStruct.path;
        file = file.replace(/"|_/g,''); // Replace all "  -- solve git bug, sometimes giving extra "-characters
        
        let XY = fileStruct.index + fileStruct.working_dir;  // See : https://git-scm.com/docs/git-status
        
        console.log( '[' + XY + '] ' + fileStruct.path);
        
        // Remember found file
        foundFiles.push(file);
        
        let row = tbody.insertRow();

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
            switch (XY) {
                case "D " :
                    label.setAttribute("class","deleted"); // index+work_dir "D " " D"
                    break;
                case " D" :
                    label.setAttribute("class","deleted"); // index+work_dir "D " " D"
                    break;
                case "M " :
                    label.setAttribute("class","modified"); // index+work_dir "M " " M"
                    break;
                case " M" :
                    label.setAttribute("class","modified"); // index+work_dir "M " " M"
                    break;
                case "A " :
                    label.setAttribute("class","added"); // index+work_dir "A " "??"
                    break;
                case "??" :
                    label.setAttribute("class","added"); // untracked (lets view it as added)
                    break;
            
            }
            
            var description = document.createTextNode( file);
            label.appendChild(description);
            
            var newline = document.createElement('br');
            
            cell.appendChild(checkbox);
            cell.appendChild(label);
            cell.appendChild(newline);
            
            // Adjust checkbox value according to localState.unstaged
            if ( localState.unstaged.includes(file) ){
                checkbox.checked = false;
            }
        
            
            
        index = index + 1;
    }
        
    // Replace old tbody content with new tbody
    old_tbody.parentNode.replaceChild(tbody, old_tbody);

    
    return foundFiles;
}

