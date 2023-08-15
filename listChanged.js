
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
        
//const simpleGit = require('simple-git');  
simpleGit = opener.simpleGit;

const STARTDIR = process.cwd(); // Folder where this file was started

var state = global.state; // internal copy of global.state
var localState = global.localState; 

var lowRange = 1;
var rangeWidth = 1000;  // Update also in listChanged.html id="highRange"
var maxRange;

var win

var origFiles = [];  // Store files found to be conflicting.  Use to remove .orig files of these at the end

// ---------
// FUNCTIONS
// ---------    

// Start initiated from settings.html
async function injectIntoJs(document) {

    
    console.log('listChanged.js entered');
    win = gui.Window.get();
    
    // For systems that have multiple workspaces (virtual screens)
    if ( win.canSetVisibleOnAllWorkspaces() ){
        win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
    }
    
    let status_data;
    
    // Git Status
    try{
        if (localState.mode == 'HISTORY'){
            status_data = await opener.gitShowHistorical();  
        }else{
            status_data = await listGitStatus();    
        }
        maxRange = status_data.files.length;
    }catch(err){
        console.log("injectIntoJs -- Error " );
        console.log(err);
        return
    }
    
          
    if (devTools == true){
        win.showDevTools();  // WARNING : causes redraw issues on startup
    }

    // Update rangeWidth
    document.getElementById('lowRange').innerText = lowRange;
    document.getElementById('highRange').innerText = Math.min(   lowRange + rangeWidth - 1 , status_data.files.length );
    if (maxRange > rangeWidth){
        document.getElementById('fileRange').style.display = 'block';
    }
    
 
    // Draw table
    origFiles = createFileTable(status_data);
       
    
    // Change text that does not match History mode 
    if (localState.mode == 'HISTORY'){
        
        ////document.getElementById('instructionsHEAD').style.display = 'none'; // Only show instructions for history

        //// Change from default text (two alternatives, if pinned or simple history)
        //if (localState.pinnedCommit !== ''){ 
            //document.getElementById('listFiles').innerHTML = '&nbsp;  Files changed since commit ' + localState.pinnedCommit.substring(0,6) + ' :';  
        //}else{
            //document.getElementById('listFiles').innerHTML = '&nbsp;  Files changed since previous revision :';  
        //}
    }
    
    
    win.focus();


};

// Main functions 
async function _callback( name, event, event2){

    let id = event.id;
    let file;
    let commit;
    let status_data;
    let tool;
    
    console.log('_callback = ' + name);
    switch(name) {
        case 'applySelectedFilesButton': {
            console.log('applySelectedFilesButton');
            console.log(event);
            
            localState.unstaged = makeListOfUnstagedFiles();

            // Note : This will be done once again after pressing Store (in case something has happened)
               
            // Add all files to index (all newest versions of working-tree files will be in index)
            var path = '.'; // Add all
            await simpleGit( state.repos[state.repoNumber].localFolder )
                .add( path, onAdd );   
            function onAdd(err, result) {console.log(result) ;console.log(err); }
            
            // Remove localState.unstaged from index
            for (let file of localState.unstaged) {
                 await simpleGit( state.repos[state.repoNumber].localFolder )
                .raw( [  'reset', '--', file ] , onReset); 
            }
            function onReset(err, result) {console.log(result) ;console.log(err);}

            break;
        }         
        case 'applyRestoreAllButton': {
            console.log('applyRestoreAllButton');
            console.log(event);
            
            // Add all files to index (all newest versions of working-tree files will be in index)
            var path = '.'; // Add all
            await simpleGit( state.repos[state.repoNumber].localFolder )
                .add( path, onAdd );   
            function onAdd(err, result) {console.log(result) ;console.log(err); }
            
            // Reset all tracked files            
            await simpleGit( state.repos[state.repoNumber].localFolder )
                .raw( [  'reset', '--hard' ] , onReset); 

            function onReset(err, result) {console.log(result) ;console.log(err);}

            closeWindow();
            break;
        }         
        case 'diffLinkAll' : { // NOTE : Hidden in html now
            console.log('diffLinkAll');
            console.log(event);
            
            tool = state.tools.difftool;

            
            // Prepare command  --  Can be either history mode, or normal mode
            if (localState.mode == 'HISTORY') {
                // History
                console.log('diffLinkAll -- history');
                
                commit = event;

                tool = state.tools.difftool;
    
                // Prepare for git diff with previous commit and selected commit in history log
                command = [  
                    'difftool',  
                    '--tool',
                    tool,
                    '--dir-diff',
                    commit + "^" ,
                    commit
                ];  
                    
                
            } else {
                // Not history
                console.log('diffLinkAll -- normal');
                
                // Prepare for git diff HEAD (which compares staged/unstaged workdir file to HEAD)
                command = [  
                    'difftool',
                    '--tool',
                    tool,
                    '--dir-diff',
                    'HEAD'
                ];
            }
       
            // Git 
            try{
                simpleGit( state.repos[state.repoNumber].localFolder).raw(command );
            }catch(err){
                console.log('diffLink -- caught error ');
                console.log(err);
            }
            
            
            
            
            break;
        }
        case 'fileCheckoutLink': {
            // Checks for already modified version, and warns with dialog
            // If allow overwrite, or uncommitted does not exist => call callback 'fileCheckout'
            let commit = event;
            let file = event2;   
            
            
            // Check if uncommited modified
            let status_data = await listGitStatus();
            console.log(status_data);
            if ( status_data.modified.includes(file) ){
                selectedFile = file;
                selectedCommit = commit;
                document.getElementById('fileCheckoutDialog').showModal();
                return
            }
            
            // Use same callback as for Modal dialog
            _callback('fileCheckout', commit, file);
                  
            break;
        }
        case 'fileCheckout': {
            let commit = event;
            let file = event2;   

   
             // Prepare for git diff 
            command = [  
                'checkout',
                commit,
                file
            ];


            console.log(command);

            // Git 
            try{
                simpleGit( state.repos[state.repoNumber].localFolder).raw(command );
            }catch(err){
                console.error('fileCheckoutLink -- caught error ');
                console.error(err);
            }
            
                                
            break;
        }
        case 'diffLink': {
            console.log('diffLink');
            console.log(event);
            
            file = event;
            file = file.replace('/','//');
            
            tool = state.tools.difftool;

            // Prepare for git diff HEAD (which compares staged/unstaged workdir file to HEAD)
            command = [  
                'difftool',
                '-y',  
                '--tool',
                tool,
                'HEAD',
                '--',
                file
            ];

            // Git 
            status_data;
            try{
                simpleGit( state.repos[state.repoNumber].localFolder)
                    .raw(command, onStatus );
                    function onStatus(err, result){ console.log(result); console.log(err); status_data = result; };
            }catch(err){
                console.log('diffLink -- caught error ');
                console.log(err);
            }
        

            break;
        }
        case 'diffLinkHistory': {
         
            // Three inputs
            console.log('diffLinkHistory');
            console.log(event);

            tool = state.tools.difftool;
            
            // Set first commit to previous historical; or to pinned commit
            let commit1 = event;
            let commit2 = event2;
            
             // Prepare for git diff 
            command = [  
                'difftool',
                '-y',  
                '--tool',
                tool,
                commit1,
                commit2
            ];


            console.log(command);

            // Git 
            try{
                simpleGit( state.repos[state.repoNumber].localFolder).raw(command );
            }catch(err){
                console.log('diffLinkHistory -- caught error ');
                console.log(err);
            }
        

            break;
        }
        case 'editLinkHistory': {  // Used both for historical and uncommmitted new files
         
            // Three inputs
            console.log('editLinkHistory');
            console.log(event);

            let file = event;
            let rw_switch = event2; // --rw or --ro  or --show 
            

            // Setup running pragma-merge in edit mode 
            try{
                
                const { exec } = require("child_process");
                opener.pragmaLog('Starting pragma-merge in edit mode');
                
                // Mac or Linux
                let CD = 'cd  "' + state.repos[state.repoNumber].localFolder + '"; ';  // Change to repo folder
                let RUN = opener.CWD_INIT + pathsep + 'pragma-merge "' + file + '"' + '  --edit ' + rw_switch; // Start using absolute path of pragma-merge
                let COMMAND = CD + RUN;
                
                // Windows
                if (process.platform === 'win32') {
                    let PRAGMA_MERGE = `${opener.CWD_INIT}/pragma-merge`
					//"%PROGRAMFILES%\\Git\\bin\\sh.exe" -c " cd 'C:/Users/jan/menu-test2'; 'C:\\Users\\jan\\test-clone\\pragma-git\\pragma-merge ' 'New folder/tjena.txt.txt' --edit --rw "
	                let EXE = `"%PROGRAMFILES%\\Git\\bin\\sh.exe" -c ` ;
	                let RUNWIN  = `" cd '${state.repos[state.repoNumber].localFolder}'; '${PRAGMA_MERGE}' '${file}' --edit --rw "`;
	                COMMAND = EXE + RUNWIN;
				}
                
                exec( COMMAND, 
                    (error, stdout, stderr) => {
                      // catch err, stdout, stderr
                        if (error) {
                            opener.pragmaLog('-Error starting pragma-merge');
                            opener.pragmaLog(error.toString());
                            return;
                        }
                        if (stderr) {
                            opener.pragmaLog('-An error occured running pragma-merge');
                            return;
                        }
                        opener.pragmaLog('-Result of running pragma-merge script',stdout);
                    }
                );
                
                
            }catch(err){
                console.log('editLinkHistory -- caught error ');
                console.log(err);
            }
        

            break;
        }
        case 'discardLink': {
            console.log('discardLink');
            console.log(event);
            
            file = event;   
            try{
                
                // Unstage (may not be needed, but no harm)
                 await simpleGit( state.repos[state.repoNumber].localFolder )
                    .raw( [  'reset', '--', file ] , onReset); 
                    function onReset(err, result) {console.log(result) }
             
                // Checkout, to discard changes
                simpleGit( state.repos[state.repoNumber].localFolder)
                    .checkout(file, onGitCheckout );
                    function onGitCheckout(err, result){ console.log(result); console.log(err);  };

                
            }catch(err){
                console.log('discardLink -- caught error ');
                console.log(err);
            }
                
    
            // Git Status
            let status_data;
            try{
                if (localState.mode == 'HISTORY'){
                    status_data = await opener.gitShowHistorical();  
                }else{
                    status_data = await listGitStatus();
                }
            }catch(err){
                console.log("discardLink -- Error " );
                console.log(err);
                return
            }
            

            origFiles = createFileTable(status_data); // Redraw, and update origFiles;
            break;
        }
        case 'deleteLink': {
            console.log('deleteLink');
            console.log(event);
            
            file = event;   
            try{
                 
                // Unstage (may not be needed, but no harm)
                 await simpleGit( state.repos[state.repoNumber].localFolder )
                    .raw( [  'reset', '--', file ] ); 
                    
                // Delete from file system                   
                let filePath = state.repos[state.repoNumber].localFolder + pathsep + file;
                console.log('deleteLink -- deleting file = ' + filePath);
                fs.unlinkSync(filePath)
  
            }catch(err){
                console.log('deleteLink -- caught error ');
                console.log(err);
            }
                
    
            // Git Status
            try{
                if (localState.mode == 'HISTORY'){
                    status_data = await opener.gitShowHistorical();  
                }else{
                    status_data = await listGitStatus();
                }
            }catch(err){
                console.log("deleteLink -- Error " );
                console.log(err);
                return
            }

            origFiles = createFileTable(status_data); // Redraw, and update origFiles;
            break;
        }           
        case 'ignoreLink': {
            console.log('ignoreLink');
            console.log(event);
            
            // File paths
            const ignoreFileName = global.state.repos[global.state.repoNumber].localFolder + pathsep + '.gitignore';      
            const settingsDir = os.homedir() + pathsep + '.Pragma-git';        
            
            file = event;   
            
            // Close Git-gitignore Editor
                gui.Window.getAll( 
        
                    function allWindowsCallback( windows) {
                        for (let i = 0; i < windows.length; i++) {
                            let win_handle =  windows[i];
                            console.log(win_handle.window.document.title);
                            if ( win_handle.window.document.title == 'Git-ignore Editor' ){
                                win_handle.close();
                            }
                        }    
                    }
                ); 
            
            
            // Append to file
                try{
                     
                    // Unstage (may not be needed, but no harm)
                     await simpleGit( state.repos[state.repoNumber].localFolder )
                        .raw( [  'reset', '--', file ] ); 
                        
                    // Append to .gitignore                  
                    fs.appendFile(ignoreFileName, '\n' + file, function (err) {
                        if (err) throw err;
                        console.log('Added "' + file +'" to gitignore = ' + ignoreFileName);
                    });
      
                }catch(err){
                    console.log('ignoreLink -- caught error ');
                    console.log(err);
                }
                
    
            // Git Status
                try{
                    if (localState.mode == 'HISTORY'){
                        status_data = await opener.gitShowHistorical();  
                    }else{
                        status_data = await listGitStatus();
                    }
                }catch(err){
                    console.log("ignoreLink -- Error " );
                    console.log(err);
                    return
                }

            // Finish
                origFiles = createFileTable(status_data); // Redraw, and update origFiles;
            break;
        }           
        case 'radioButtonChanged' : {
            // TODO : stage or unstage depending on what happened
            // see https://stackoverflow.com/questions/31705665/oncheck-listener-for-checkbox-in-javascript
            
            let checked = event.checked;
            let file2 = event.parentElement.innerText;
            //file2 = '"' + file2 + '"';
            
            if ( checked ) {
                await simpleGit( state.repos[state.repoNumber].localFolder )
                .add( [file2], onAdd );   
    
            } else {
                 await simpleGit( state.repos[state.repoNumber].localFolder )
                .raw( [  'reset', '--', file2 ] , onReset); 
            }
            // Local functions
            function onAdd(err, result) {console.log(result) ;console.log(err);}
            function onReset(err, result) {console.log(result) ;console.log(err);}

            break;
        }

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
            
            let col = row.cells[0]; // First column
        
            let isChecked = col.children[0].checked;
            let file  = col.children[1].innerText;
            if (isChecked == false) {
                unStaged.push(file);
            }

            console.log(col);

        }

        return unStaged;
    };


// ================= END CALLBACK =================  
}
function closeWindow(){
    
    // This used to be a button in listChanged.html, no apply selected files when closing window instead
    _callback('applySelectedFilesButton',this);  

    // Return
    
    localState.fileListWindow = false;  // Show to main program that window is closed

    // Remove from menu
    opener.deleteWindowMenu("Changed Files");
    
    win.close();
    
}
async function listGitStatus(){  
    
    // This function adds untracked files tostatus_data.files
    // That is not done by opener.gitStatus since it is very time consuming if alot of untracked files, and thus locks the main window.
    // Thus, it is delegated to be done if needed -- that is in listChanged.js
     
    let status_data = await opener.gitStatus(); 
      
    // Update status_data.files to reflect also the non-tracked files that gitStatus does not fill in
    for (var i = 0; i < status_data.not_added.length; ++i) {              
        let fileName = status_data.not_added[i];            
        status_data.files.push( { path : fileName, index: '?' , working_dir : '?'} ); // Mimicing the files-field in git status 
    }  
    
    return status_data;
}
// Draw
function createFileTable(status_data) {

    var index = 10000; // Checkbox id
    let cell, row;
    let foundFiles = [];

        
    // Old tbody
    let old_tbody = document.getElementById('listFilesTableBody');

    // NOTE : Hidden in html now

    //// Table header (change onClick for history mode)
    //if (localState.mode == 'HISTORY'){
        //let commit = localState.historyHash;
        //document.getElementById('diffAllSpan').setAttribute( 
            //"onClick", 
            //"_callback('diffLinkAll', " + "'" + commit  + "') " 
            //);  // Send commit hash for history
    //}

    // Make  a new tbody
    let tbody = document.createElement("tbody"); // Empty tbody
    tbody.setAttribute('id','listFilesTableBody');
    
    console.log(status_data);

    // Fill tbody with content
    for (let j in status_data.files.slice( lowRange - 1, lowRange + rangeWidth - 1) ) { 
        i = Number(j) + lowRange - 1;
        let fileStruct = status_data.files[i];
        let file = fileStruct.path;
        file = file.replace(/"/g,''); // Replace all "  -- solve git bug, sometimes giving extra "-characters
        
        let filetext = file; // First guess is that text is file path (for rename, it will be different)
        
        // See : https://git-scm.com/docs/git-status
        let X = fileStruct.index;
        let Y = fileStruct.working_dir
        let XY = X + Y;  
        
        //console.log( '[' + XY + '] ' + fileStruct.path);
        
        // Remember found file
        foundFiles.push(file);
        
        let row = tbody.insertRow();

        //
        // First cell  --  Filename + icon + checkbox 
        //
            cell = row.insertCell();
            cell.setAttribute("class", 'localFolder');
            
            // Add checkbox to cell 
            if (localState.mode != 'HISTORY'){
                var checkbox = document.createElement('input');
                checkbox.setAttribute("name", "fileGroup");
                checkbox.setAttribute("onclick", "_callback('radioButtonChanged', this );" ) ; // Quotes around file
                checkbox.type = 'checkbox';
                checkbox.id = index;
                checkbox.checked = true;
                cell.appendChild(checkbox);
                
                // Adjust checkbox value according to localState.unstaged
                if ( localState.unstaged.includes(file) ){
                    checkbox.checked = false;
                }   
            }

            // Label
            let typeOfChanged;
            
            var label = document.createElement('label')
            label.htmlFor = index;
            switch (XY) {
                case "D " :
                    label.setAttribute("class","deleted"); // index+work_dir "D " " D"
                    typeOfChanged = 'deleted';
                    break;
                case " D" :
                    label.setAttribute("class","deleted"); // index+work_dir "D " " D"
                    typeOfChanged = 'deleted';
                    break;
                    
                case "M " :
                    label.setAttribute("class","modified"); // index+work_dir "M " " M"
                    typeOfChanged = 'modified';
                    break;
                case " M" :
                    label.setAttribute("class","modified"); // index+work_dir "M " " M"
                    typeOfChanged = 'modified';
                    break;
                case "MM" :
                    label.setAttribute("class","modified"); // index+work_dir "M " " M"
                    typeOfChanged = 'modified';
                    break;

                case "A " :
                    label.setAttribute("class","added"); // index+work_dir "A " "??"
                    typeOfChanged = 'added';
                    break;
                case "??" :
                    label.setAttribute("class","added"); // untracked (lets view it as added)
                    typeOfChanged = 'added';
                    break;
            
            }
            
            switch (X) {
                case "R" :
                    label.setAttribute("class","renamed"); // 
                    typeOfChanged = 'renamed';
                    
                    let substrings = file.split(String.fromCharCode(9)); // ["100", "imlook4d/HELP/Abdomen window.txt", "imlook4d/HELP/CT Abdomen window.txt"]
                    
                    if ( substrings.length <= 1){
                        filetext = file;
                    }else{
                        filetext = substrings[1] + ' -> ' + substrings[2];
                    }
                    
                break;
            }
            
            
            var description = document.createElement('div');
            description.innerHTML =  filetext.replace(/->/g, '&#10142;'); // Make arrow if '->'
            
            label.appendChild(description);

            cell.appendChild(label);
  
        //
        // Second cell  --  action links 
        //      
            cell = row.insertCell();
            
            if (localState.mode == 'HISTORY'){
                // diff-link for history vs previous history
                let commit = localState.historyHash;
                cell.appendChild( diffLinkHistory( document, commit, file) );
                cell.appendChild( fileCheckoutLink( document, commit, file) );
                
            }else{ // NOT HISTORY
                // diff-link for working_dir and staged vs HEAD
                let commit = 'HEAD'
                //cell.appendChild( diffLinkHistory( document, commit, file) );
                cell.appendChild( diffLink( document, file));
                
                                    
                if (typeOfChanged == 'added'){  // two files to compare only in modified (only one file in added)
                    var addLink = document.createElement('span');
                    addLink.setAttribute('style', "color: var(--link-color); cursor: pointer");
                    addLink.setAttribute('onclick', "_callback('editLinkHistory', " + "'" + file + "' , '--rw ') ");
                    addLink.textContent=" (edit)";
                    cell.appendChild(addLink);  
                }  
                 
                // Make restore link (only if modified or deleted) 
                if (typeOfChanged == 'modified' || typeOfChanged == 'deleted'){  
                    var discardLink = document.createElement('span');
                    discardLink.setAttribute('style', "color: var(--link-color); cursor: pointer");
                    discardLink.setAttribute('onclick',
                        "selectedFile = '"  + file + "';" + 
                        "document.getElementById('restoreDialog').showModal();" );  // Opens dialog from html-page
                    discardLink.textContent=" (restore)";
                    cell.appendChild(discardLink);         
                }        
                
                // Make ignore link (only if added) 
                if ( typeOfChanged == 'added'){  
                    var ignoreLink = document.createElement('span');
                    ignoreLink.setAttribute('style', "color: var(--link-color); cursor: pointer");
                    ignoreLink.setAttribute('onclick',
                        "selectedFile = '"  + file + "';" + 
                        "document.getElementById('ignoreDialog').showModal();" );  // Opens dialog from html-page
                    ignoreLink.textContent=" (ignore)";
                    cell.appendChild(ignoreLink);         
                }    
                
                // Make delete link (only if modified or added) 
                if (typeOfChanged == 'modified' || typeOfChanged == 'added'){  
                    var discardLink = document.createElement('span');
                    discardLink.setAttribute('style', "color: var(--link-color); cursor: pointer");
                    discardLink.setAttribute('onclick',
                        "selectedFile = '"  + file + "';" + 
                        "document.getElementById('deleteDialog').showModal();" );  // Opens dialog from html-page
                    discardLink.textContent=" (delete)";
                    cell.appendChild(discardLink);         
                }                    
            }
            // Internal functions

            function fileCheckoutLink(document, commit, file){
                // Make fileCheckout link (work_dir)
                var fileCheckoutLink = document.createElement('span');
                if ( (typeOfChanged == 'modified')||(typeOfChanged == 'added') ){ // allow this for added or modified
                    fileCheckoutLink.setAttribute('style', "color: var(--link-color); cursor: pointer");
                    fileCheckoutLink.setAttribute('onclick', 
                        "_callback('fileCheckoutLink', "  + "'"  + commit + "', " + "'"  + file + "')" );
                    fileCheckoutLink.textContent=" (checkout)";
                    return  fileCheckoutLink;
                }else{
                    fileCheckoutLink.innerHTML="";
                    return  fileCheckoutLink;
                }
            };
            function diffLink(document, file){
                // Make diff link (work_dir)
                var diffLink = document.createElement('span');
                if (typeOfChanged == 'modified'){ // two files to compare only in modified (only one file in deleted or added)
                    diffLink.setAttribute('style', "color: var(--link-color); cursor: pointer");
                    diffLink.setAttribute('onclick', "_callback('diffLink'," + "'"  + file + "')");
                    diffLink.textContent=" (diff)";
                    return  diffLink;
                }else{
                    diffLink.innerHTML="";
                    return  diffLink;
                }
            };
            function diffLinkHistory(document, commit, file){
                // Make diff link (history)
                var diffLink = document.createElement('span');
                diffLink.innerHTML="";
                    
                if (typeOfChanged == 'modified'){  // two files to compare only in modified (only one file in deleted or added)
                    
                    let commit1 = commit + "^:" + file;
                    let commit2 = commit + ":" + file;  
                                               
                    // Correct if pinned commit                        
                    if (localState.pinnedCommit !== ''){ 
                        commit1 = localState.pinnedCommit + ":" + file;
                        commit2 = commit + ":" + file;           
                    }  

                    diffLink.setAttribute('style', "color: var(--link-color); cursor: pointer");
                    diffLink.setAttribute('onclick', "_callback('diffLinkHistory', " + "'" + commit1 + "', '" + commit2 + "') ");
                    diffLink.textContent=" (diff)";
                }
                    
                if (typeOfChanged == 'added'){  // only one file in added

                    diffLink.setAttribute('style', "color: var(--link-color); cursor: pointer");
                    diffLink.setAttribute('onclick', "_callback('editLinkHistory', " + "'" + file + "' , '--show ') ");
                    diffLink.textContent=" (view)";
                }   
                                 
                if (typeOfChanged == 'renamed'){  // two files to compare only in modified (only one file in deleted or added)
                    
                    let substrings = file.split(String.fromCharCode(9)); // ["100", "imlook4d/HELP/Abdomen window.txt", "imlook4d/HELP/CT Abdomen window.txt"]
                    
                     // Set first commit to previous historical; or to pinned commit
                    let commit1 = commit + "^:" + substrings[1];
                    let commit2 = commit + ":" + substrings[2];
                             
                    // Correct if pinned commit                        
                    if (localState.pinnedCommit !== ''){ 
                        commit1 = localState.pinnedCommit + ":" + substrings[2];
                        commit2 = commit + ":" + substrings[1];      
                    }   
                    
                    

                    diffLink.setAttribute('style', "color: var(--link-color); cursor: pointer");
                    diffLink.setAttribute('onclick', "_callback('diffLinkHistory', " + "'" + commit1 + "', '" + commit2 + "') ");
                    diffLink.textContent=" (diff)";
                    
                    // If 100% equal, don't make a link (diff is meaningless, and doesn't work)
                    if (substrings[0] === '100'){
                        diffLink.setAttribute('onclick', "");
                        diffLink.textContent="";
                    }
                    
                }               
                return  diffLink;
            };   

            
        //
        // Button
        //      
        
            if (localState.mode == 'HISTORY'){            
                document.getElementById("applyButtonDiv").style.display = "none"; 
                document.getElementById("applyButtonDiv").style.height= '0px';      
                
                
        document.getElementById('commitFootnote').style.display = 'none'; // Only show instructions for history
                
            }
            // ================= END  Internal functions  in  createFileTable =================

            
            
        index = index + 1;
    }
        
    // Replace old tbody content with new tbody
    old_tbody.parentNode.replaceChild(tbody, old_tbody);

    
    return foundFiles;
}

