
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
//var timer = _loopTimer( 1000);

// Storage of paths to backup files
//const backupExtension = '.orig';
var origFiles = [];  // Store files found to be conflicting.  Use to remove .orig files of these at the end

// ---------
// FUNCTIONS
// ---------    

// Start initiated from settings.html
async function injectIntoJs(document) {

    
    console.log('tagList.js entered');
    win = gui.Window.get();
    
    // For systems that have multiple workspaces (virtual screens)
    if ( win.canSetVisibleOnAllWorkspaces() ){
        win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
    }

    if (devTools == true){
        win.showDevTools();  // WARNING : causes redraw issues on startup
    }
    
    // Set size to match content
    let padding = Number(document.getElementById('outerContent').style.padding.replace('px','') );
    let dx = document.getElementById('outerContent').scrollWidth;
    let dy = document.getElementById('outerContent').scrollHeight;
    
    let hx = window.outerWidth - window.innerWidth;
    let hy = window.outerHeight - window.innerHeight;
    window.resizeTo(dx + hx + 2 * padding , dy + hy + 2 * padding);
    
    // Always on top
    win.setAlwaysOnTop( state.alwaysOnTop );
    
    // For systems that have multiple workspaces (virtual screens)
    if ( win.canSetVisibleOnAllWorkspaces() ){
        win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
    }




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

            closeWindow();
            break;
        }
         
        case 'diffLinkAll' : {
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
            
            commit = event;
            file = event2;
            
            file = file.replace('/','//');
            
            tool = state.tools.difftool;

            // Prepare for git diff with previous commit and selected commit in history log
            command = [  
                'difftool',
                '-y',  
                '--tool',
                tool,
                commit + "^:" + file,
                commit + ":" + file
            ];

            // Git 
            status_data;
            try{
                simpleGit( state.repos[state.repoNumber].localFolder)
                    .raw(command, onStatus );
                    function onStatus(err, result){ console.log(result); console.log(err); status_data = result; };
            }catch(err){
                console.log('diffLinkHistory -- caught error ');
                console.log(err);
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
            try{
                await simpleGit( state.repos[state.repoNumber].localFolder).status( onStatus );
                function onStatus(err, result ){ status_data = result; console.log(result); console.log(err) };
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
                    .raw( [  'reset', '--', file ] , onReset); 
                    function onReset(err, result) {console.log(result) }
                    
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
                await simpleGit( state.repos[state.repoNumber].localFolder).status( onStatus );
                function onStatus(err, result ){ status_data = result; console.log(result); console.log(err) };
            }catch(err){
                console.log("deleteLink -- Error " );
                console.log(err);
                return
            }

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

    // Return
    
    localState.fileListWindow = false;  // Show to main program that window is closed
    win.close();
    
}

