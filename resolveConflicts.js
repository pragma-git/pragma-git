
// Define DEBUG features
var devTools = true;
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
var timer = _loopTimer( 1000);

// Storage of paths to backup files
const backupExtension = '.orig';
var origConflictingFiles = [];  // Store files found to be conflicting.  Use to remove .orig files of these at the end

// ---------
// FUNCTIONS
// ---------    

// Start initiated from settings.html
async function injectIntoJs(document) {

    
    console.log('resolveConflicts.js entered');
    win = gui.Window.get();
    let status_data;
    
          
    if (devTools == true){
        win.showDevTools();  // WARNING : causes redraw issues on startup
    }

    
    try{
        await simpleGit( state.repos[state.repoNumber].localFolder).status( onStatus );
        function onStatus(err, result ){ status_data = result; console.log(result); console.log(err) };
    }catch(err){
        
    }

    // Draw tables, and store found files 
    let a = createConflictingFileTable(document, status_data);
    document.getElementById('collapsibleConflict').click();  // Open collapsed section 1)
    
    let b = createDeletedFileTable(document, status_data);
    document.getElementById('collapsibleDeleted').click();   // Open collapsed section 2)
    
    document.getElementById('collapsibleResolved').click();  // Open collapsed section 3)
    
    // Store conflicting file-list
    origConflictingFiles = a.concat(b);

};

// Main functions 
async function _callback( name, event){

    let id = event.id;
    
    console.log('_callback = ' + name);
    switch(name) {
        
        
        case 'resolveAllConflictsButton':
            console.log('resolveAllConflictsButton');
            console.log(event);
            gitResolveConflicts( state.repos[state.repoNumber].localFolder);
            break;
            
        
        case 'resolveAllDeletedButton':
            console.log('resolveAllDeletedButton');
            console.log(event);
            gitResolveDeletions( state.repos[state.repoNumber].localFolder);
            break;
     
        case 'conflictsResolvedButton':
            console.log('conflictsResolvedButton');
            console.log(event);
            gitDeleteBackups( state.repos[state.repoNumber].localFolder);
            break;
            
        case 'undoMergeButton':
            console.log('undoMergeButton');
            console.log(event);
            gitUndoMerge( state.repos[state.repoNumber].localFolder);
            break;


    } // End switch
    
    // ---------------
    // LOCAL FUNCTIONS
    // ---------------

    
    async function gitResolveConflicts( folder){
        let tool = state.tools.mergetool;
        let command = [  
            'mergetool', 
            '--gui' , 
            '--tool=' + tool 
        ];
        try{
            // Store conflicting file names
            console.log('gitResolveConflicts -- Resolving conflicting files');
            
            // Resolve with external merge tool
            //writeMessage( 'Resolving conflicts');
            await simpleGit( folder).raw(command, onResolveConflict );
            function onResolveConflict(err, result){ console.log(result); console.log(err) };
            //await waitTime( 1000);
            
            console.log('gitResolveConflicts -- Finished resolving conflicting files');
            
            // TODO (A) : clean out *.orig  backup files created by git mergetool
            //
            // I would like to remove all *.orig for the conflicting files once conflict resolved
            //
            // 1) store the conflicting files names : in "localState.conflict.repo[repoNumber].conflicting_files before merge
            //
            // 2) Then remove files.orig if conflict is resolved
            //
            
            // TODO (B) : Write message text "Merged  selectedBranch  into  currentBranch "  (replace with names)
            
            
        }catch(err){
            console.log('gitResolveConflicts -- caught error ');
            console.log(err);
            // If external diff tool does not exist => write messate about this
            
        }
        
        // Update table
        let status_data;
        try{
            console.log('gitResolveConflicts -- update table getting status');
            await simpleGit( state.repos[state.repoNumber].localFolder).status( onStatus );
            function onStatus(err, result ){ status_data = result; console.log(result); console.log(err) };
            
            console.log('gitResolveConflicts -- redraw table ');
            createConflictingFileTable(document, status_data)
        }catch(err){
            console.log('gitResolveConflicts -- error redrawing table');
            console.log(err);
        }
        
        
    }
    async function gitResolveDeletions( folder){
        
        var tbody = document.getElementById("deletedTableBody");
        for (var i = 0, row; row = tbody.rows[i]; i++) {
           //iterate through rows (accessed using the "row" variable assigned in the for loop)
           
            let fileName = row.cells[0].getElementsByTagName('label')[0].innerText;
            let checked  = row.cells[0].getElementsByTagName('input')[0].checked;
            
            if (checked){
                // Remove
                try{
                    // Store conflicting file names
                    console.log('gitResolveDeletions -- deleting file = ' +fileName);
                    await simpleGit( folder).rm(fileName, onDelete );
                    function onDelete(err, result){ console.log(result); console.log(err) };
        
                }catch(err){
                    console.log('gitResolveDeletions -- caught error deleting file = ' +fileName);
                    console.log(err);
                }
            }else{
                // Add
                try{
                    // Store conflicting file names
                    console.log('gitResolveDeletions -- add file = ' +fileName);
                    await simpleGit( folder).add(fileName, onAdd );
                    function onAdd(err, result){ console.log(result); console.log(err) };
        
                }catch(err){
                    console.log('gitResolveDeletions -- caught error adding file = ' +fileName);
                    console.log(err);
                }                
            }

            
        }
        

        //try{
            //// Store conflicting file names
            //console.log('gitResolveDeletions -- Resolving conflicting files');
            
            //// Resolve with external merge tool
            ////writeMessage( 'Resolving conflicts');
            //await simpleGit( folder).raw(command, onResolveConflict );
            //function onResolveConflict(err, result){ console.log(result); console.log(err) };

        //}catch(err){
            //console.log('gitResolveDeletions -- caught error ');
            //console.log(err);
            //// If external diff tool does not exist => write messate about this
            
        //}
        
        // Update table
        let status_data;
        try{
            console.log('gitResolveDeletions -- update table getting status');
            await simpleGit( state.repos[state.repoNumber].localFolder).status( onStatus );
            function onStatus(err, result ){ 
                status_data = result; 
                console.log(result); 
                console.log(err) 
                createDeletedFileTable(document, status_data); 
            };
            
            console.log('gitResolveDeletions -- redraw table ');
            createDeletedFileTable(document, status_data)
        }catch(err){
            console.log('gitResolveDeletions -- error redrawing table');
            console.log(err);
        }
        
        
    }
    function gitDeleteBackups( folder){
        
        // Remove .orig
        for (let i in origConflictingFiles) {
            try {
                let file = folder + pathsep + origConflictingFiles[i] + backupExtension;
                console.log('gitDeleteBackups -- deleting file = ' + file);
                fs.unlinkSync(file)
                //file removed
            }catch(err) {
                console.log('gitDeleteBackups -- failed deleting file');
                console.log(err)
            }
        }
         
        // Remove _BACKUP_nnnn, _BASE_nnnn, B_LOCAL_nnnn, B_REMOTE_nnnn
        // - BASE is the first commit down the tree the two branches split off from. It is the first common ancestor. Often it is useful to have this to help decide which of the newer commits you want.
        // - LOCAL is your local file, the one in the current branch you are standing on.
        // - REMOTE is the remote file, of the branch you are merging into your common on.
        
        // Take the originally conflicting files one-by-one
        for (let i in origConflictingFiles) {

            
            try {
                            
                let path = folder + pathsep + origConflictingFiles[i];
                let directory = path.match(/(.*)[\/\\]/)[1]||'';
                let fileName = path.split(/^.*[\\\/]/).pop();
                
                // Look for files that start with fileName followed by "_"
                let filesInThisFolder = fs.readdirSync(directory);
                for (let j in filesInThisFolder) {
                    if ( filesInThisFolder[j].startsWith(fileName + '_')  ){
                        // Identified as A_BASE_12345 etc, should be removed :
                        console.log('Found matching file = ' + filesInThisFolder[j]);
                        let file = folder + pathsep + filesInThisFolder[j];
                        fs.unlinkSync(file);
                    }

                }

            }catch(err) {
                console.log('gitDeleteBackups -- failed deleting file');
                console.log(err)
            }
        }
        
        // Close window
        closeWindow();
               
    }
    async function gitUndoMerge( folder){
        let tool = state.tools.mergetool;
        let command = [  
            'mergetool', 
            '--gui' , 
            '--tool=' + tool 
        ];
        try{
            // Store conflicting file names
            console.log('gitUndoMerge -- entered');
            
            // Resolve with external merge tool
            //writeMessage( 'Resolving conflicts');
            await simpleGit( folder).merge(['--abort'], onUndoMerge );
            function onUndoMerge(err, result){ console.log(result); console.log(err) };
            //await waitTime( 1000);
            
            console.log('gitUndoMerge -- Finished ');
            
        }catch(err){
            console.log('gitUndoMerge -- caught error ');
            console.log(err);
        }
        
        // Close window
        closeWindow();

        
    }


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
function createConflictingFileTable(document, status_data) {
    var index = 0; 
    let cell, row;
    let foundFiles = [];
    
    // Old tbody
    let old_tbody = document.getElementById('conflictingTableBody');

    // Make  a new tbody
    let tbody = document.createElement("tbody"); // Empty tbody
    tbody.setAttribute('id','conflictingTableBody');

    // Fill tbody with content
    for (let i in status_data.files) {
        let fileStruct = status_data.files[i];
        if ( fileStruct.working_dir == 'U' ){
            
            // remember found file
            foundFiles.push(fileStruct.path);
            console.log( fileStruct.path);
            
            let row = tbody.insertRow();

            
             // Into tbody cell :   path
            cell = row.insertCell();
            text = document.createTextNode( fileStruct.path );
            cell.appendChild(text);
            
        } 
        index = index + 1;
    }
    
    // Replace old tbody content with new tbody
    old_tbody.parentNode.replaceChild(tbody, old_tbody);
    
    return foundFiles;
}
function createDeletedFileTable(document, status_data) {
    var index = 10000; // Checkbox id
    let cell, row;
    let foundFiles = [];
        
    // Old tbody
    let old_tbody = document.getElementById('deletedTableBody');

    // Make  a new tbody
    let tbody = document.createElement("tbody"); // Empty tbody
    tbody.setAttribute('id','deletedTableBody');

    // Fill tbody with content
    for (let i in status_data.files) { 
        let fileStruct = status_data.files[i];
        if ( fileStruct.working_dir == 'D' ){
            console.log( fileStruct.path);
            
            // Remember found file
            foundFiles.push(fileStruct.path);
            
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
                
                var description = document.createTextNode( fileStruct.path);
                label.appendChild(description);
                
                var newline = document.createElement('br');
                
                cell.appendChild(checkbox);
                cell.appendChild(label);
                cell.appendChild(newline);
            
            
            
            
        } 
        index = index + 1;
    }
        
    // Replace old tbody content with new tbody
    old_tbody.parentNode.replaceChild(tbody, old_tbody);

    
    return foundFiles;
}

