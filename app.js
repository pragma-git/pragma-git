/* START :
 * ------
 * 
 *   /Applications/nwjs.app/Contents/MacOS/nwjs  --remote-debugging-port=9222  .
 *
 * Debug with chrome:
 *   http://127.0.0.1:9222/
 *
 *   Stop timer in console :  isPaused = true
 *
 * Secret : if onClick doesn't work on html-element, add this to CSS :  -webkit-app-region: no-drag;
 *
 * Package : https://github.com/nwjs/nw.js/wiki/How-to-package-and-distribute-your-apps
 */

/* Notes - window
 * 
 * From main window console : gui.Window.open('notes.html')
 * 
 * Add drop-down selection at bottom. From console of notes-window : 
d=document.createElement("select");

o = document.createElement("option")
o.innerText = 'repo';
d.appendChild( o );

o = document.createElement("option")
o.innerText = 'branch';
d.appendChild( o );

document.getElementsByClassName('te-mode-switch-section')[0].appendChild(d);
 * 
 * 
 * */ 


/* TESTS
 * 
 * 1) Succesful merges
 * 
 * setup : make_three_filled_branches.command 
 * Pragma-git : Stand in "master". Merge-button "second"
 *  
 * Expected : /tmp/threeBranches  "second" successfully merged into "master"
 *   
 * 
 * 2) Merge conflict
 * 
 * setup : create_merge_conflict.command
 * Pragma-git : Stand in "master". Merge-button "second"
 * 
 * Expected : /tmp/threeBranches is in conflict with A-folder/A2 being changed, and B deleted in "second". 
 * 
 * 
 * 3) Pull 
 * 
 * setup : create_pull_conflict.command
 * Pragma-git : Stand in "master". Pull button should be visible; press it.
 * 
 * Expected : /tmp/threeBranches is in conflict with remote master.  
 * 
 */
/* TECHNICAL OVERVIEW
 * ------------------
 * 
 * The program is run by the following functions : 
 * _loopTimer runs and calls _update 
 * _update() updates the display and handle which mode is used internally. 
 * _setMode( modeString) sets the mode up. for instance : _setMode('DEFAULT')
 * _callback handles user clicks, and will change mode according to the functionality of the user callback. 
 *           Some callbacks call _update() directly for immediate update
 * 
 * The app has multiple modes, which display and handle things differently.
 * For instance, textarea can have text, placeholder and read-only text, depending on mode. 
 * 
 * 
 * Mode Strings :
 * --------------
 * 
 * UNKNOWN                    lets _setMode determine correct mode
 * 
 * DEFAULT                    no git repositories
 *                            - Store-button = disabled
 *                            - placeholder = "Drop folder on window to get started"
 *         
 * NO_FILES_TO_COMMIT        standing on a repository and branch, but no files to update
 *                            - Store-button = disabled
 *                            - placeholder = "No changed files to store"
 * 
 * CHANGED_FILES             No text has been input yet
 *                           - Store-button = disabled
 *                           - placeholder = "Add description ..."
 * 
 * CHANGED_FILES_TEXT_ENTERED     At least one character written
 *                           - Store-button = enabled
 *                           - placeholder = disabled (automatically)
 * HISTORY 
 *                           - Store-button = disabled
 *                           - placeholder = shows history             
 * SETTINGS             
 *                           - Store-button = disabled
 *                           - placeholder = shows hints   
 * 
 * CONFLICT                  
 *                           - Store-button = disabled
 *                           - placeholder = shows hints   
 * 
 * State
 * -----
 * There are two variables that are global to all windows
 * - state                   - contains data that are also saved in settings file ($HOME/.Pragma-git/settings.json)
 * - localState              - contains state data (historyNumber, branchNumber, mode) which is not saved to file
 * 
 * 
 * Setting dialog
 * --------------
 * Communicates the following to the main window using global variables : 
 * - state.repos and state.repoNumber
 * - localState.mode
 * where the _update() makes sure to handle this information
 * 
 * 
 * 
 */

// Url to read latest release
const RELEASE_URL = 'https://api.github.com/repos/pragma-git/pragma-git/releases';
 
// Store default path 
var defaultPath = process.env.PATH;

// Define DEBUG features
var devTools = false;
var isPaused = false; // Stop timer. In console, type :  isPaused = true


// -----
// INIT
// -----

    // Import Modules
        const gui = require("nw.gui");    
        const os = require('os');
        const fs = require('fs');
        const path = require('path');
        
        const chokidar = require('chokidar');     // Listen to file update (used for starting and stopping Pragma-merge)
        const simpleGit = require('simple-git');  // npm install simple-git

        const util = require('./util_module.js'); // Pragma-git common functions
    
    // Constants 
        const WAIT_TIME = 3000; // Time to wait for brief messages being shown (for instance in message field)
        const pathsep = require('path').sep;  // Os-dependent path separator
        const tmpdir = os.tmpdir();
        
    // Handles to windows
        var main_win;
        var settings_win;
        var notes_win;
        var changed_win;
        var resolve_win;
        var graph_win;
        var about_win;
        var merge_win;

      
    // Files & folders
        const STARTDIR = process.cwd(); // Folder where this file was started
        const GIT_CONFIG_FOLDER = STARTDIR + pathsep + 'gitconfigs';  // Internally stored include scripts including mergetool definition.  See gitDefineBuiltInMergeTool()
    
        let settingsDir = os.homedir() + pathsep + '.Pragma-git'; 
        mkdir( settingsDir);
        
        var settingsFile = settingsDir + pathsep + 'settings.json';    
         
        let notesDir = settingsDir + pathsep + 'Notes'; 
        mkdir(notesDir);
        
        // Pragma-merge : Signaling files and folders 
        const SIGNALDIR = os.homedir() + pathsep + '.Pragma-git'+ pathsep + '.tmp';
        
        const MAINSIGNALFILE = SIGNALDIR + pathsep + 'pragma-git-running';  
        
        const MERGESIGNALFILE = SIGNALDIR + pathsep + 'pragma-merge-running';  
        const EXITMERGESIGNALFILE = SIGNALDIR + pathsep + 'exit-pragma-merge';
        
        const ASKPASSIGNALFILE = SIGNALDIR + pathsep + 'pragma-askpass-running'; 
        const EXITASKPASSIGNALFILE = SIGNALDIR + pathsep + 'exit-pragma-askpass';
        
    
    // State variables
    
        var lastKnown = {};
        lastKnown.repo;
        lastKnown.branch;
    
        var localState = [];
        localState.historyNumber = -1;
        localState.historyLength = 0;  // Number available in history or search 
        localState.branchNumber = 0;   // Used only when changing to next branch -- otherwise branch as in current repository TODO : Update value when changing Repo
        localState.mode = 'UNKNOWN'; // _setMode finds the correct mode for you
        localState.unstaged = [];    // List of files explicitly put to not staged (default is that all changed files will be staged)
        
        localState.settings = false;        // True when settings window is open
        localState.conflictsWindow = false; // True when conflicts window is open
        localState.fileListWindow = false; // True when conflicts window is open
        localState.aboutWindow = false; // True when conflicts window is open
        localState.notesWindow = {};
        localState.notesWindow.open = false; // True when notes window is open
        localState.graphWindow = false; // True when graph window is open
        localState.helpWindow = false; // True when help window is open
        
        localState.pinnedCommit = '';  // Empty signals no commit is pinned (pinned commits used to compare current history to the pinned)

    // Display text
        var textOutput = {
            value: '',        // First row is title, rows after are message
            placeholder: '', 
            readOnly : false
        };
        
    // Expose these to all windows 
        global.state = loadSettings(settingsFile); // json settings
        global.localState = localState; 

    // Collect settings
        var repoSettings = {}; 
   
        
    // Initiate asynchronous loops
        const seconds = 1000; // milliseconds per second
        var timer = _loopTimer('update-loop', 1 * seconds);     // GUI update loop
        var fetchtimer = _loopTimer('fetch-loop', 60 * seconds); // git-fetch loop
        try {
            gitFetch();
        }catch (err){
            
        }


    // Inititate listening to Pragma-merge start signal
       
       util.rm(MERGESIGNALFILE);
       const merge_watcher = chokidar.watch('file, dir, glob, or array', {
          ignored: /(^|[\/\\])\../, // ignore dotfiles
          persistent: true
        });
       merge_watcher.add(MERGESIGNALFILE);
       merge_watcher.on('add', path => {console.log(`File ${path} has been added`); startPragmaMerge() } )


    // Inititate listening to askpass start signal
       util.rm(ASKPASSIGNALFILE);
       const askpass_watcher = chokidar.watch('file, dir, glob, or array', {
          ignored: /(^|[\/\\])\../, // ignore dotfiles
          persistent: true
        });
       askpass_watcher.add(ASKPASSIGNALFILE);
       askpass_watcher.on('add', path => {console.log(`File ${path} has been added`); startPragmaAskPass() } )

              
    // Initiate pragma-git as default diff and merge tool
        gitDefineBuiltInMergeTool();

    
    // Mac-menu
        var mb; // Mac menubar
        var macWindowsMenu; // Mac windows menu
        var window_menu_handles_mapping = {}; // Store handles for window menu items
    
        
    // Workaround for Windows10 garbage collection (fix crash on branch contextual submenu)
        var cachedBranchMenu;  // Keep reference to popup menu, to avoid premature Windows10 garbage collection
        var workaround_store_submenus; // Workaround : Keep references to all submenu-item, to avoid premature Windows10 garbage collection
        
        var cachedRepoMenu;  // // Keep reference to popup menu, to avoid premature garbage collection (caused clicked on repo to fail fairly often)
        var cachedTagMenu;

    // Cached objects
        var cachedBranchList;  // Keep a cached list of branches to speed up things.  Updated when calling cacheBranchList

    
    
// ---------
// FUNCTIONS 
// ---------

// Main functions
async function _callback( name, event){ 
    console.log('_callback = ' + name);
    console.log(event);
    switch(name) {

      // Top title-bar
      case 'clicked-about': {
        showAbout();
        break;
      }
      case 'clicked-repo': {
        repoClicked(event);
        clearFindFields();
        
        // Remove pinned commit (Future: store in state.repos[i].pinnedCommit ?)
        localState.pinnedCommit = ''; 
        updateImageUrl('top-titlebar-pinned-icon', 'images/pinned_disabled.png');
        
                
        // Update repo in settings_win 
        try{
            await settings_win.window._callback('repoRadiobuttonChanged', {id: state.repoNumber });
        }catch(err){ 
        }
        
        cacheBranchList();
            
        await updateGraphWindow();
        await gitStashMap(state.repos[state.repoNumber].localFolder);
        
        break;
      }
      case 'clickedRepoContextualMenu': {
        console.log('Selected repo = ' + event.selectedRepo);
        console.log('Selected repo = ' + event.selectedRepoNumber);
        state.repoNumber = event.selectedRepoNumber;
        gitSetLocalBranchNumber();  // Update localState.branchNumber here, after repo is changed
        
        
        
        // Update remote info immediately
        gitFetch();  
        
        clearFindFields();
        localState.pinnedCommit = ''; // Remove pinned commit (Future: store in state.repos[i].pinnedCommit ?)
        _setMode('UNKNOWN');

        
        // Update repo in settings_win 
        try{
            await settings_win.window._callback('repoRadiobuttonChanged', {id: state.repoNumber });
        }catch(err){ 
        }
        
        await cacheBranchList();
        
        await gitStashMap(state.repos[state.repoNumber].localFolder);

        await updateGraphWindow();
        updateSettingsWindow();
       
        break;
      }
      case 'clicked-branch': {
            
        // Update remote info immediately
        gitFetch();  

        branchClicked(true, event); // 'menu' or 'cycle'
        
        break;
      }
      case 'clickedBranchContextualMenu': { 
        console.log('Selected branch = ' + event.selectedBranch);
        let branchName = event.selectedBranch;
        
        // Checkout local branch
        try{
            await simpleGit(state.repos[state.repoNumber].localFolder).checkout( branchName, onCheckout);
            function onCheckout(err, result){console.log(result)} 

        }catch(err){        
            console.log('Error checking out local branch, in branchClicked(). Trying to checkout of branch = ' + branchName);
            console.log(err);
        }  
        
        localState.branchNumber = event.branchNumber;  
        _setMode('UNKNOWN');
                        
        // Update remote info immediately
        gitFetch();  

        // Reset some variables
        localState.historyNumber = -1;
        
        cacheBranchList();
        
        gitSwitchBranch(branchName);
        
        break;
      }
      case 'clicked-notes':{
        if (localState.notesWindow.open == true) {
            try{ notes_win.focus(); }catch(err){ localState.notesWindow.open = false}
            return
        }
        let fileName = document.getElementById('top-titlebar-repo-text').innerText;
        fileName = path.basename( state.repos[state.repoNumber].localFolder );
        let filePath = notesDir + pathsep + fileName + '.md';
        global.arguments = [ filePath ];  // send through global.arguments
        let title = 'Notes';
        gui.Window.open('notes.html',
            {
                id: 'notesWindowId',
                position: 'center',
                width: 600,
                height: 600,
                title: title
            },
            win=>win.on('loaded', () => {notes_win = nw.Window.get(win.window);addWindowMenu(title, 'notes_win');} )
            )  
        
        localState.notesWindow.open = true;
        break;
      }
      case 'clicked-push-button': {
        gitPush();
        break;
      }
      case 'clicked-pull-button': {
        gitPull();

        await updateGraphWindow();
        
        break;
      }
      case 'clicked-merge-button': {
        mergeClicked();
        break; 
      }     
      case 'clickedMergeContextualMenu' : {
        let selectedBranch = event;
        console.log('clickedMergeContextualMenu, selected = ' + event.selectedBranch);
        console.log('clickedMergeContextualMenu, current  = ' + event.currentBranch);
        await gitMerge( event.currentBranch, event.selectedBranch); 
        
        break;
      }
      case 'tagSelected': { // Called from tagList.js
        switch (event.buttonText ){
            case 'Checkout' :
                checkoutTag(event.selected);
                break;
            case 'Delete' :
                deleteTag(event.selected);
                break;
        }
        break;
      }
      case 'clicked-close-button': {
        await closeWindow();
        break;
      }
      case 'clicked-minimize-button': {
        win.minimize();
        break;
      }

      // Middle field
      case 'message_key_up': {
        messageKeyUpEvent();
        break;
      }
      case 'file-dropped': {
        dropFile( event); 
        break;
      }
      case 'clicked-store-button': {
        await storeButtonClicked();
          
        // Update graph
        await _update();
        if (localState.graphWindow){
            _callback( 'clicked-graph');
        }
        break;
      }
        
      // History
      case 'clicked-up-arrow': {
        upArrowClicked();
        break;
      }
      case 'clicked-down-arrow': {
        downArrowClicked();
        break;
      }
      case 'clicked-find': {
        let delta = Math.round( 40 * state.zoomMain); 
        let fix = -1; // One pixel move settles visibility somehow
        
        if (document.getElementById('output_row').style.visibility == 'collapse' ){
            // Show find
            document.getElementById('output_row').style.visibility = 'visible';
            win.resizeTo(win.width, win.height + fix);
            win.resizeTo(win.width, win.height + delta);
            
            if (localState.graphWindow ){
                graph_win.window.injectIntoJs(graph_win.window.document); // Draws graph, selected, and pinned 
            }
        }else{
            // Hide find
            document.getElementById('output_row').style.visibility = 'collapse';
            win.resizeTo(win.width, win.height - delta);
            win.resizeTo(win.width, win.height - fix);
            
            resetHistoryPointer();  // Go to first in history
            upArrowClicked();// Get out of history
            
            if (localState.graphWindow ){
                graph_win.window.injectIntoJs(graph_win.window.document); // Draws graph, selected, and pinned 
            }
            
        }

        break;
      }
      case 'clicked-find-button' :{
        //resetHistoryPointer();   
        
        var history = await gitHistory();
        console.log(history);
        localState.historyNumber = 0;
        localState.historyLength =  history.length;
        localState.historyHash =  history[localState.historyNumber].hash;   
        localState.historyString =  historyMessage(history, localState.historyNumber);
    
        _setMode('HISTORY');
         
         
        // Update history in graph
        if (localState.graphWindow ){
            await graph_win.window.injectIntoJs(graph_win.window.document); // Draws graph, selected, and pinned 
        }
        
        //selectInGraph(localState.historyHash); 
         
        textOutput.value = localState.historyString;
        writeTextOutput( textOutput);
        
        status_data = await gitShowHistorical();
        console.log(status_data);
        await setStatusBar( fileStatusString( status_data));
        
                  
        break;
      }
      case 'help-on-find' :{
        gui.Window.open(
            'about_search.html#/new_page', 
            {   id: 'aboutSearchWindowId3',
                position: 'center',
                width: 600,
                height: 600
            });         
        break;
      }

      // Dialogs
      case 'newBranchNameKeyUp': {
        let string = document.getElementById("branchNameTextarea").value ;
        document.getElementById("branchNameTextarea").value = util.branchCharFilter( string) ;

        break;
      }
      case 'newTagNameKeyUp': {
        let string = document.getElementById("tagNameTextarea").value ;
        document.getElementById("tagNameTextarea").value = util.branchCharFilter( string) ;

        break;
      }
      case 'addBranchButtonPressed': {

        console.log('addBranchButtonPressed');
        console.log(event);

        let newBranchName = document.getElementById('branchNameTextarea').value;
        let gitflowPrefix = document.getElementById('gitflow').value + '/' ;
        
        if ( gitflowPrefix === 'none/'){
            gitflowPrefix = '';
        }
        
        if ( gitflowPrefix.length > 1){
            newBranchName = gitflowPrefix + newBranchName;
        }
        

        
        // Create and checkout new branch
        try{
            let folder = state.repos[ state.repoNumber].localFolder;
            let commit = 'HEAD';  // First guess
            
            // If history, change commmit
            if (localState.historyNumber > -1){
                commit = localState.historyHash;
            }
            
            // Create new branch
            let commands = [ 'checkout', '-b', newBranchName, commit];
            await simpleGit( folder).raw(  commands, onCreateBranch);
            function onCreateBranch(err, result ){console.log(result);};
            
            setStatusBar( 'Creating branch "' + newBranchName);
            await waitTime( 1000);  
                      
            setStatusBar( 'Moved into "' + newBranchName);
            waitTime( WAIT_TIME);  

            
        }catch(err){       
            displayAlert('Failed creating branch', err); 
            console.log('Failed creating branch ');
            console.log(err);
        } 
        
        
        cacheBranchList();

        _setMode('UNKNOWN');
        

        break;
      }
      case 'clicked-tag-button': {
        // Make dropdown menu with options 1) Create tag, 2) Checkout tag
        tagClicked();
        break;
      }
      case 'addTagButtonPressed' : {
        let newTagName = document.getElementById('tagNameTextarea').value;
      
        // Create new Tag
        try{
            let folder = state.repos[ state.repoNumber].localFolder;            
            let commit = 'HEAD';  // First guess
            
            // If history, change commmit
            if (localState.historyNumber > -1){
                commit = localState.historyHash;
            }
  
            // Create new Tag
            await simpleGit( folder).tag(  [newTagName, commit], onCreateTag);
            function onCreateTag(err, result ){console.log(result);console.log(err);};
            setStatusBar( 'Creating Tag "' + newTagName);
            waitTime( WAIT_TIME);  
        
            await updateGraphWindow();
        
           // Push tag to remote
            try{
                await simpleGit( state.repos[state.repoNumber].localFolder ).push( 'origin', {'--tags' : null}, onPush);
                function onPush(err, result) {console.log(result) };
            }catch (err){
                console.log('Failed pushing tag -- probably no remote repository' );
            }
            
            setStatusBar( 'Creating Tag "' + newTagName);
            waitTime( WAIT_TIME);  
            

            
        }catch(err){       
            displayAlert('Failed creating tag', err); 
            console.log('Failed creating tag ');
            console.log(err);
        } 
        break;

      }
    
      case 'detachedHeadDialog': {
        console.log('detachedHeadDialog -- returned ' + event);
        
        switch (event) {
            case  'Delete' : {
                // Move out of "detached Head" (losing track of it)
                branchClicked(false);
                
                cacheBranchList();
                
                break;
            }    
            case  'Cancel' : {
                break;
            }          
            
        }
        break; 
      } // end case 'detachedHeadDialog'  
      case 'initializeRepoOK' : {
          
        setStatusBar( 'Initializing git');
        
        // Read cached folder (cached in dropFile, when asking if initializing git )
        folder = localState.droppedRepoFolder;
        localState.droppedRepoFolder='';  // Clear
        
        await simpleGit(folder).init( onInit );
        function onInit(err, initResult) { }
        
        await simpleGit(folder).raw([ 'rev-parse', '--show-toplevel'], onShowToplevel);
        function onShowToplevel(err, showToplevelResult){ console.log(showToplevelResult); topFolder = showToplevelResult }
        
        await waitTime( 1000);
        
        //await gitAddCommitAndPush( 'First commit');

        topFolder = topFolder.replace(os.EOL, ''); // Remove ending EOL
        
        // Initial commit
        setStatusBar( 'Initial commit');
        let outputData;
        await simpleGit( folder )
            .raw( [  'commit', '--all' , '--allow-empty', '-m', 'Initial commit'] , onCommit);
            //.commit( 'Initial commit', {'--all' : null, '--allow-empty' : null} , onCommit);
            
        function onCommit(err, result) {console.log(result); outputData = result };
        
        await waitTime( 1000);
        console.log(outputData);
        
        
        // add repo to program
        try {
            await addExistingRepo( folder); 
        }catch(error){
            console.log(error);
        }

        // Update immediately
        await _setMode('UNKNOWN');
        await _update();
          
        break;  
      }

      // Bottom title-bar
      case 'clicked-folder': {
        folderClicked();
        break;
      }
      case 'clicked-terminal': {
        const terminalTab = require('terminal-tab');

        const options = {
          cwd: null,
          env: null,
          encoding: 'utf8'
        }
        
        // Mac and linux
        let folder = state.repos[ state.repoNumber].localFolder;
        let command = 'cd "' + folder + '";' + 'clear';
        
        // Windows  Note : called win32 also for 64-bit
        if (process.platform === 'win32') {  
            folder = path.normalize(folder);
            command = 'cd /d "' + folder + '" && ' + 'cls';
            
            var isUncPath = require('is-unc-path');
            if ( isUncPath(folder) ){
                command = 'pushd "' + folder + '" & ' + 'cls & echo NOTE : OPEN UNC PATH = ' + folder + ' (TEMPORARY MOUNT POINT)';
                
                // TODO, make a script to find network maopped pahts; run : 
                // powershell -Command "& {Get-WmiObject Win32_MappedLogicalDisk |  select Name, ProviderName}"
                // 
                /*  Get output in the form:
                  Name ProviderName
                  ---- ------------
                  G:   \\vll.se\gemensam
                  H:   \\vll.se\users\HJ\jaax02
                  K:   \\vll.se\data
                  P:   \\vll.se\program
                 */
                 // Find the mapped name (G: etc) and replace path with part matching ProviderName

            }
            
        }

 
        
        
        terminalTab.open( command, options)
        
        break;
      }     
      case 'clicked-status-text' : {
        if (localState.fileListWindow == true) {          
            try{ 
                resolve_win.focus();
                return
            }catch(err){ 
            }    
        }
            
        let status_data = await gitStatus();
        
        if (status_data.conflicted.length > 0){
            resolveConflicts(state.repos[state.repoNumber].localFolder);
        }else{
            listChanged();
        }
        
        localState.fileListWindow = true;
        
        break;
      }
      case 'clicked-graph':{

        // If window open, redraw and bail out
        if ( localState.graphWindow == true ){
            graph_win.window.injectIntoJs(graph_win.window.document);
            graph_win.focus();
            return
        }
        
        let title = "Graph";

        // Open new window (will open above old)
        gui.Window.open('graph.html',
            {
                id: 'graphWindowId',
                position: 'center',
                width: 600,
                height: 600,
                title: title
            }
            ,
            win=>win.on('loaded', () => {graph_win = nw.Window.get(win.window);addWindowMenu( title, 'graph_win');} )
            )  
            
        localState.graphWindow = true;
        
        break;
      }  
      case 'clicked-pinned-icon': {
        let isPinned = event;

        if (localState.graphWindow){
            // Draw in graph window, and in main window 
            let div = graph_win.window.document.getElementById( localState.historyHash );
            div.firstElementChild.firstElementChild.click(); // pin-icon in graph window (which calls drawPinImage)
        }else{
            // draw only in main window (since graph window not open)
            drawPinImage(isPinned); 
        }
        break;
      }     
      case 'clicked-pinned-hash': {
        
        // Strategy : 
        // If needed, change branch and apply filter => sure that pinned commit is found in history

        // If not pinned branch, change to pinned branch

            if (localState.pinnedBranch !== document.getElementById('top-titlebar-branch-text').innerText){
                let event = {};
                event.selectedBranch = localState.pinnedBranch;
                event.branchNumber = localState.pinnedBranchNumber;
                _callback('clickedBranchContextualMenu', event);
            }   

        
        // If pinned filter settings is different from when pinned, return to search terms when pinned
        
            if (    ( document.getElementById('findTextInput').value + document.getElementById('findFileInput').value
                     + document.getElementById('findDateInputAfter').value + document.getElementById('findDateInputBefore').value ) 
                    !==
                    ( localState.pinned_findTextInput + localState.pinned_findFileInput 
                     + localState.pinned_findDateInputAfter + localState.pinned_findDateInputBefore )    
                )
                {
                    document.getElementById('findTextInput').value = localState.pinned_findTextInput;
                    document.getElementById('findFileInput').value = localState.pinned_findFileInput;
                    document.getElementById('findDateInputAfter').value = localState.pinned_findDateInputAfter;
                    document.getElementById('findDateInputBefore').value =  localState.pinned_findDateInputBefore;    
                    document.getElementById("message_code_switch").checked = localState.pinned_findCode;            
                }

        // Jump to correct place in history (checking that pinned is indeed available)
        
            let history = await gitHistory();

            if ( !isNaN( util.findObjectIndex(history,'hash', localState.pinnedCommit) ) ){
                // Set localState
                localState.historyNumber = util.findObjectIndex(history,'hash', localState.pinnedCommit); 
                localState.historyHash = localState.pinnedCommit;
                localState.historyString = historyMessage(history, localState.historyNumber);
                
                selectInGraph(localState.historyHash);


            } else {
                console.log('ERROR -- could not find pinned commit');
                console.log('ERROR -- lookup found historical commit = ' + history[ localState.pinnedHistoryNumber].hash );
                console.log('ERROR -- not the same as  pinned commit = ' + localState.pinnedCommit );

            }           
            
                 
        // Display
            localState.mode = 'HISTORY';
            status_data = await gitShowHistorical();
            setStatusBar( fileStatusString( status_data)); 
            await _update();

        // Call again if not in history of branch
        
            if ( isNaN( util.findObjectIndex(history,'hash', localState.pinnedCommit) ) ){
                document.getElementById('down-arrow').click();
                localState.historyNumber = localState.pinnedHistoryNumber;
                document.getElementById('bottom-titlebar-pinned-text').click()
                localState.mode = 'HISTORY';
                status_data = await gitShowHistorical();
                await setStatusBar( fileStatusString( status_data)); 
            }
             
        
        break;
      } 
      case 'clicked-stash-button': {

        try{
            let stash_status;
            await simpleGit( state.repos[state.repoNumber].localFolder)
                .stash(['list'], onStash);
            function onStash(err, result ){  stash_status = result }
            
            gitStash();
            
        }catch(err){  
            console.log(err);
        }
        break;
      }           
      case 'clicked-stash_pop-button': {
        gitStashPop();
        break; 
      }      
      case 'clicked-settings': {
        showSettings();
        break;
      }

      // Help
      case 'help': {
           
        console.log('Help pressed');
        
        let fileName = STARTDIR + pathsep + 'HELP' + pathsep + event.name + '.html';
        let text = fs.readFileSync(fileName);
        let title = 'Help on ' + event.name;
                        
        // Update text            
        if ( localState.helpWindow == true ){
            
            // Delete menu for old help window
            let oldTitle = help_win.document.title;
            deleteWindowMenu(oldTitle);
            
            // Overwrite content for help window
            updateText( event.name, title, text);
            
            // Update menu
            addWindowMenu( title, 'help_win');
            return
        }
        
        
        // Local function - update text in html
        function updateText( name, title, text){
            help_win.document.getElementById("inner-content").innerHTML= text; // Set text in window
            help_win.document.getElementById("title").innerText= title; // Set window title
            help_win.document.getElementById("name").innerText= name; // Set document first header  
            help_win.focus();         
        };
                

        // Open new window -- and create closed-callback
        if ( localState.helpWindow == false ){
            gui.Window.open(
                'HELP' + pathsep + 'TEMPLATE_help.html',
                {   id: 'helpId',
                    position: 'center',
                    width: 600,
                    height: 700   
                },
                function(cWindows){ 
                    cWindows.on('closed', 
                        function(){
                            localState.helpWindow = false;
                            cWindows = null;  // dereference
                        }
                    );
                    
                    cWindows.on('loaded', 
                        function(){
                             // For systems that have multiple workspaces (virtual screens)
                            if ( cWindows.canSetVisibleOnAllWorkspaces() ){
                                cWindows.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
                                cWindows.setAlwaysOnTop(state.alwaysOnTop);
                            }
                            help_win = cWindows.window;
                            updateText( event.name, title, text);
                            addWindowMenu( title, 'help_win');
                            
                        }
                    )
                }
            );
        }

        // Show that window is open
        localState.helpWindow = true;


        break;
      }
     
      
      // TEST
      default: {
        // code block
      }  
    } // End switch(name)

    // ---------------
    // LOCAL FUNCTIONS
    // ---------------

    // title-bar
    async function repoClicked( type){
        
        //
        // Show menu
        //
        if (type == 'menu'){
            cachedRepoMenu= new gui.Menu();
            
            let currentRepo = state.repos[state.repoNumber].localFolder;
    
            // Add context cachedRepoMenu title-row
            cachedRepoMenu.append(new gui.MenuItem({ label: 'Switch to repo : ', enabled : false }));
            cachedRepoMenu.append(new gui.MenuItem({ type: 'separator' }));
            
            let repoNames = [];
                    
            // Add names of all repos
            for (var i = 0; i < state.repos.length; ++i) {
                
                let myEvent = [];
                console.log(i);
                console.log(state.repos[i].localFolder);
                myEvent.selectedRepo = path.basename( state.repos[i].localFolder );
                myEvent.selectedRepoNumber = i;
                myEvent.currentRepo = currentRepo;
                repoNames.push(myEvent.selectedRepo);
                    
                if (state.repoNumber != i ){
                    cachedRepoMenu.append(
                        new gui.MenuItem(
                            { 
                                label: myEvent.selectedRepo, 
                                click: () => { _callback('clickedRepoContextualMenu',myEvent);} 
                            } 
                        )
                    );
                    console.log(repoNames[i]);
                }else{
                    
                     cachedRepoMenu.append(
                        new gui.MenuItem(
                            { 
                                label: myEvent.selectedRepo, 
                                type: 'checkbox',
                                checked : true,
                                enabled: false,
                                click: () => { _callback('clickedRepoContextualMenu',myEvent);} 
                            } 
                        )
                    );                   
                }
    
            }

    
            // Popup as context cachedRepoMenu
            let pos = document.getElementById("top-titlebar-repo-arrow").getBoundingClientRect();
            await cachedRepoMenu.popup( Math.trunc(pos.left * state.zoomMain) -10,24);

            
            return; // BAIL OUT --  
            // Note :  _callback('clickedRepoContextualMenu',myEvent)  will be called when menu selection. localState.branchNumber is updated there
        }
        

        //
        // Cycle through stored repos
        //
        if (type == 'cycle'){
            state.repoNumber = state.repoNumber + 1;
            var numberOfRepos = state.repos.length;
            if (state.repoNumber >= numberOfRepos){
                state.repoNumber = 0;
            }
            gitSetLocalBranchNumber();  // Immediate update of localState.branchNumber
        }
        
        // Update remote info immediately
        gitFetch();  
        
        _setMode('UNKNOWN');
    }
    async function branchClicked( detectDetachedBranch, type){
        // Input detectDetachedBranch : true if I want to detect. False if I want to override detection

        let branchList = cachedBranchList;

        
        // If HISTORY, reset history counter without changing branch
        if ( getMode() === 'HISTORY'){
            resetHistoryPointer(); 
            upArrowClicked(); // Get out of history
            return;
        }
        
        
        // Determine status of local repository
        var status_data;  
        try{
            status_data = await gitStatus();
        }catch(err){
            console.log('Error in unComittedFiles,  calling  _mainLoop()');
            console.log(err);
        }
    
        //
        // If Detached Head (dialog and bail out if changes have been made to detached Head)
        //
        if (detectDetachedBranch && status_data.current == 'HEAD' ){ 
            
            // Is detached Head (lets see if any new commits)
            try{              
                let branchSummary;
                await simpleGit(state.repos[state.repoNumber].localFolder).branch( onLog);
                function onLog(err, result){console.log(result);console.log(err);branchSummary=result;}  // result.current is the detachment point.  result.detached = true if detached
                
                //branchSummary :
                //all: (5) ["7741225", "master", "second", "temp-branch-1", "third"]
                //current: "7741225"
                //branches:
                //7741225: {current: true, name: "7741225", commit: "7741225", label: "F"}                            <--- currentBranchObject below
                //master: {current: false, name: "master", commit: "660d091", label: "Merge branch 'temp-branch-1'"}
                //...
                
                let currentBranchName = branchSummary.current;
                
                // Test if commit-hash is the same as branch-name (meaning no commits have been done after detaching HEAD)
                let currentBranchObject = branchSummary.branches[currentBranchName];
                if ( currentBranchObject.name == currentBranchObject.commit){  // Works for checked-out commit. TODO : but not for checked-out tag!

                    try{
                        
                        // TODO : set localState.historyNumber from  state.repos[state.repoNumber].detachedBranch.hash;
                        
                        let branchName = state.repos[state.repoNumber].detachedBranch.detachedBranchName;
                        await gitSwitchBranch(branchName);
                        
                        
                        //await gitSwitchToRepo(state.repoNumber);  // Update (same as when changing repo)
                        
                        //var history = await gitHistory();
                        
                        ////localState.historyHash = state.repos[state.repoNumber].detachedBranch.hash;

                        
                        //gitShowHistorical();
                        
                    }catch(err){        
                        console.log(err);
                        gitCycleToNextBranch();
                    } 
  
                }else{
                    // Committed change in detached HEAD -- throw dialog
                    console.log('Commits on detached HEAD.  Show dialog');
                    document.getElementById('detachedHeadDialog').showModal(); // Show modal dialog : [Temp Branch] [Delete] [Cancel]
                }
                
                // End checking out branch
                _setMode('UNKNOWN');

                return

   
            }catch(err){        
                console.log(err);
                return
            }

        }
        
        // Reached here if  :
        // - branch named HEAD without changes
        // - other branch with given name  (not called HEAD)
     

        //
        // Checkout branch, or tell user to commit 
        //
    
        var uncommitedFiles = status_data.changedFiles; // Determine if no files to commit

        if ( uncommitedFiles && state.forceCommitBeforeBranchChange ){
            // Tell user to commit first (if that setting is enabled)
            
            let tempOutput = {};
            tempOutput.placeholder = 'Before changing branch :' + os.EOL + 'Add description and Store ...';
            tempOutput.value = '';
            await writeTimedTextOutput(tempOutput, WAIT_TIME);
            
            
        }else{
            // Checkout will be performed
            // - next branch 
            // - same as currentBranch if detached HEAD



            //
            // Alt 1) Show branch menu
            //
            if (type == 'menu'){

                cachedBranchMenu = new gui.Menu();
                
                let currentBranch = status_data.current;
                
                let dummy = await makeBranchMenu( cachedBranchMenu, currentBranch, branchList, 'clickedBranchContextualMenu'); 
        
                // Add context menu title-row
                cachedBranchMenu.insert(new gui.MenuItem({ type: 'separator' }), 0);
                cachedBranchMenu.insert(new gui.MenuItem({ label: 'Switch to branch : ', enabled : false }), 0);
                
                // Popup as context menu
                let pos = document.getElementById("top-titlebar-branch-arrow").getBoundingClientRect();
                cachedBranchMenu.popup( Math.trunc(pos.left * state.zoomMain ) - 10,24);
 
                return // BAIL OUT -- branch will be set from menu callback
            }


            
            //
            // Alt 2) Cycle through local branches
            //
            if (type == 'cycle'){ 
                
                let branchName; 

                // Get branch name (non-hidden)
                do { 
                    if (status_data.current === 'HEAD') { 
                        
                        // Keep branch number. Get that branch from branchList 
                        if (branchList.detached){  // Detached branch is before all other branches
                            localState.branchNumber++;
                        }       
                         
                    }else {
                        // Normal branch
                        
                        // Cycle branch number
                        localState.branchNumber = localState.branchNumber + 1;
                        if (localState.branchNumber >= branchList.local.length){
                            localState.branchNumber = 0;
                        }
                        // Get branchname after cycling
                        branchName = branchList.local[localState.branchNumber];
                    }
                    console.log(branchName);
                }
                while ( util.isHiddenBranch( state.repos[ state.repoNumber].hiddenBranches, branchList.local[localState.branchNumber]) ); // Look until non-hidden branch. NOTE: This can lock if all branches are hidden!!
        
                // Checkout local branch
                
                try{
                    gitSwitchBranch(branchName);
                }catch(err){        
                    console.log('Error checking out local branch, in branchClicked(). Trying to checkout of branch = ' + branchName);
                    console.log(err);
                } 
            } 
            
            cacheBranchList();
            
        } // End checking out branch
    
        console.log(branchList);
     
        _setMode('UNKNOWN');
       //await _update()
        
        // Reset some variables
        localState.historyNumber = -1;
    }
    function showAbout(){    
        console.log('About button pressed');
        
        let title = 'About';
                
        if ( localState.aboutWindow == true ){
            return
        }

        
        // Open new window -- and create closed-callback
        gui.Window.open(
            'about.html#/new_page', 
            {   id: 'aboutWindowId',
                position: 'center',
                width: 600,
                height: 700,
                title: title   
            },
            function(cWindows){ 
                cWindows.on('closed', 
                    function(){
                        localState.aboutWindow = false;
                        cWindows = null;  // dereference
                    }
                );
                
                cWindows.on('loaded', 
                    function(){
                         // For systems that have multiple workspaces (virtual screens)
                        if ( cWindows.canSetVisibleOnAllWorkspaces() ){
                            cWindows.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
                            cWindows.setAlwaysOnTop(state.alwaysOnTop);
                        }
                        about_win = nw.Window.get(cWindows.window);
                        addWindowMenu( title, 'about_win');
                    }
                );

            }
        );

        // Show that window is open
        localState.aboutWindow = true;
        
    }  
    async function mergeClicked(){

        let branchList = cachedBranchList;

        // Create an empty context menu
        cachedBranchMenu = new gui.Menu();
        
        let currentBranch = " ";
        
        try{
            let status_data = await gitStatus();
            currentBranch = status_data.current;
            console.log(currentBranch);
        }catch(err){
            console.log('Failed reading current branch');
        }

        // Add context menu title-row
        cachedBranchMenu.append(new gui.MenuItem({ label: 'Merge branch (select one) ... ', enabled : false }));
        cachedBranchMenu.append(new gui.MenuItem({ type: 'separator' }));
                
        // Add names of all branches
        let dummy = await makeBranchMenu( cachedBranchMenu, currentBranch, branchList, 'clickedMergeContextualMenu'); 

        // Add helping text
        cachedBranchMenu.append(new gui.MenuItem({ type: 'separator' }));
        cachedBranchMenu.append(new gui.MenuItem({ label: '... into branch "' + currentBranch +'"', enabled : false })); 

        // Popup as context menu
        let pos = document.getElementById("top-titlebar-merge-icon").getBoundingClientRect();
        await cachedBranchMenu.popup( Math.trunc(pos.left * state.zoomMain),24);
                

    }
    async function tagClicked(){
              
        // Create an empty context cachedTagMenu
        cachedTagMenu = new gui.Menu();

        
        // Add context cachedTagMenu to title-row

        cachedTagMenu.append(
            new gui.MenuItem(
                { 
                    label: 'New tag', 
                    click: () => { document.getElementById('tagNameInputDialog').showModal();} 
                } 
            )        
        )
        
        cachedTagMenu.append(
            new gui.MenuItem( 
                { 
                    label: 'Checkout tag ', 
                    click: () => { localState.tagListButton = 'Checkout'; tag_list_dialog();} 
                } 
            )        
        )

       
        cachedTagMenu.append(new gui.MenuItem({ type: 'separator' })); 
        
        cachedTagMenu.append(
            new gui.MenuItem(
                { 
                    label: 'Delete tag ', 
                    click: () => { localState.tagListButton = 'Delete'; tag_list_dialog();} 
                } 
            )        
        )

    

        // Popup as context cachedTagMenu
        let pos = document.getElementById("top-titlebar-merge-icon").getBoundingClientRect();
        await cachedTagMenu.popup( Math.trunc(pos.left * state.zoomMain),24);
                

    }
    async function checkoutTag(tagName){
        
        // I want to checkout with commit-hash -- and not tag name.
        //
        // (Reason is that I can then compare the detached branch which has the hash as a name, with the hash at current commit.
        //  If they are equal I am still at checkout point. If they are not equal, there have been new commits on the detached head.  
        //
        // If I would checkout with tag name, the name would be the tag name instead of the hash.  This would spoil identifying if at startpoint or not, as done in _callback/branchClicked )
        try{
            let folder = state.repos[state.repoNumber].localFolder;
            
            // get hash of tagName
            let hash;
            await simpleGit(folder).raw([ 'rev-parse', tagName], onShowToplevel);
            function onShowToplevel(err, result){ console.log(result); hash = result }
            hash = hash.replace(/(\r\n|\n|\r)/gm, ""); // Remove  EOL characters
            
            // checkout tag using hash
            await simpleGit(folder).checkout( hash, onCheckout);
            function onCheckout(err, result){console.log(result)} 
            
            localState.historyHash = hash;
            
            rememberDetachedBranch();
            
        }catch(err){
            console.log('Failed checking out tag = ' + tagName);
            console.log(err);
            
        }
        
        _setMode('UNKNOWN');
        
    }
    async function deleteTag(tagName){
        
        // Delete remote
        try{
            let folder = state.repos[state.repoNumber].localFolder;

            setStatusBar( 'Deleting tag');

            await simpleGit( folder )
            .raw( [  'push', '--delete' , 'origin', tagName] , onPush);
            function onPush(err, result) {console.log(result); console.log(err) };
            
            await waitTime( 1000);  
            
        }catch(err){
            console.log('Failed deleting remote tag = ' + tagName);
            console.log(err);
            
        }
        
        // Delete local
        try{
            let folder = state.repos[state.repoNumber].localFolder;

            setStatusBar( 'Deleting tag');

            await simpleGit( folder )
            .raw( [  'tag', '-d' , tagName] , onDelete);
            function onDelete(err, result) {console.log(result); console.log(err) };
            
            await waitTime( 1000);  
            
        }catch(err){
            console.log('Failed deleting local tag = ' + tagName);
            console.log(err);
            
        }
        
        _setMode('UNKNOWN');
        
    } 


    // main window
    async function storeButtonClicked() { 
        
        // Could be called for Store, or History Checkout 
        
        if ( getMode() == 'HISTORY' ){
            // History
            
            try{
                rememberDetachedBranch();
                
                // Checkout this commit (into a detached HEAD)             
                console.log('storeButtonClicked -- checking out historical commit = ' + localState.historyHash); 
                await simpleGit(state.repos[state.repoNumber].localFolder).checkout( localState.historyHash ,onDetachedHead);
                function onDetachedHead(err, result){console.log(result);console.log(err); history = result.all;} 
                
                // Set historyNumber to top
                localState.historyNumber = -1;
                
                // Leave history mode
                _setMode('UNKNOWN');
                    
            }catch(err){        
                console.log(err);
                
                displayAlert('Failed Checkout', err); 
            }
            
        }else{
            // Store
            await gitAddCommitAndPush( readMessage());
        }
        
}  
    async function downArrowClicked(){
        
        console.log('down arrow clicked');
        
        
        
        localState.historyNumber = localState.historyNumber + 1;
        
        // Get log
        var history = await gitHistory();
        
        localState.historyLength = history.length;
        
        // Test : get branches for current commit  (TODO : If useful -- maybe incorporate.  Now a bit cluttered display)
        var historyBranchesAtPoint = ""; // Do not comment out this row !
        //try{              
            //await simpleGit(state.repos[state.repoNumber].localFolder).branch(['--contains', history[localState.historyNumber + 1].hash], onHistoryBranches );
            //function onHistoryBranches(err, result){console.log(result);console.log(err); historyBranchesAtPoint = result.all;} 
            //historyBranchesAtPoint = ' [ ' + historyBranchesAtPoint + ' ]'; 
                
        //}catch(err){        
            //console.log(err);
            //console.log(historyBranchesAtPoint )       
        //}
               


        try{
            // Cycle through history
            console.log('downArrowClicked - Cycle through history');
            var numberOfHistorySteps = history.length;
            console.log('downArrowClicked - numberOfHistorySteps, localState');
            console.log(numberOfHistorySteps);
            console.log(localState);
            
            var numberOfBranches = state.repos.length;
            console.log('downArrowClicked - numberOfBranches');
            console.log(numberOfBranches);
            if (localState.historyNumber == numberOfHistorySteps){
                console.log('downArrowClicked - setting localState.historyNumber = last');
                localState.historyNumber = numberOfHistorySteps -1; // Set to last
            }
            
            
            if (localState.historyNumber > numberOfHistorySteps){
                console.log('downArrowClicked - setting localState.historyNumber = 0');
                localState.historyNumber = 0; // Set to first
            }
            
            
            localState.historyHash = history[localState.historyNumber].hash; // Store hash
            
            //// Reformated date ( 2020-07-01T09:15:21+02:00  )  =>  09:15 (2020-07-01)
            //localState.historyString = ( history[localState.historyNumber].date).substring( 11,11+5) 
            //+ ' (' + ( history[localState.historyNumber].date).substring( 0,10) + ')';
            
            //// Branches on this commit
            //localState.historyString += historyBranchesAtPoint;

            //// Message
            //localState.historyString += os.EOL 
            //+ os.EOL 
            //+ history[localState.historyNumber].message
            //+ os.EOL 
            //+ os.EOL 
            //+ history[localState.historyNumber].body;
            
            localState.historyString = historyMessage(history, localState.historyNumber);
            
            // Display
            //localState.mode = 'HISTORY';
            _setMode('HISTORY');
            //writeMessage( localState.historyString, false);
            textOutput.value = localState.historyString;
            writeTextOutput( textOutput);
            
            status_data = await gitShowHistorical();
            setStatusBar( fileStatusString( status_data));
            
            selectInGraph(localState.historyHash);
            

        }catch(err){       
            // Lands here if no repositories defined  or other errors 
            await _setMode('UNKNOWN');
            localState.historyNumber = -1;
            console.log(err);
        }    
    }
    async function upArrowClicked(){
        console.log('up arrow clicked');
        
        // Get log
        var history = await gitHistory();
        
        localState.historyLength = history.length;
    
        // Cycle through history
        var numberOfHistorySteps = history.length;
        localState.historyNumber = localState.historyNumber - 1;
        
        var numberOfBranches = state.repos.length;
        if (localState.historyNumber < 0){
            
            //selectInGraph(localState.historyHash);
            
            // Leave history browsing
            localState.historyNumber = -1;
            localState.historyString = "";
            localState.historyHash = "";
            
            selectInGraph(localState.historyHash);
            
            //writeMessage( '', false);  // empty message -- needed off for setMode to understand UNKNOWN mode
            textOutput.value = '';
            writeTextOutput( textOutput);
            _setMode('UNKNOWN');
            await _update()
            
        }else{
            // Show history
            
            //localState.historyHash = history[localState.historyNumber].hash; // Store hash
            
            //// Reformat date ( 2020-07-01T09:15:21+02:00  )  =>  09:15 (2020-07-01)
            //localState.historyString = ( history[localState.historyNumber].date).substring( 11,11+5) 
            //+ ' (' + ( history[localState.historyNumber].date).substring( 0,10) + ')'
            //+ os.EOL 
            //+ os.EOL 
            //+ history[localState.historyNumber].message
            //+ os.EOL 
            //+ os.EOL 
            //+ history[localState.historyNumber].body;  
            
            localState.historyString = historyMessage(history, localState.historyNumber);
            
            // Display            
            localState.mode = 'HISTORY';
            //writeMessage( localState.historyString, false);
            textOutput.value = localState.historyString;
            writeTextOutput( textOutput);
            
            status_data = await gitShowHistorical();
            setStatusBar( fileStatusString( status_data));    
                  
            // Store hash
            
            localState.historyHash = history[localState.historyNumber].hash;
            
            selectInGraph(localState.historyHash);
            
        }
    }
    function messageKeyUpEvent() { 
 
        // Bail out if read-only
        if ( textOutput.readOnly == true ){
            return
        }
        
        textOutput.value = readMessage();

        
        // It should be safe to assume that CHANGED_FILES of some sort -- otherwise
        if (textOutput.value.length > 0){
            _setMode( 'CHANGED_FILES_TEXT_ENTERED');
        }else{
            _setMode( 'CHANGED_FILES');
        }
        
    }
    async function dropFile(e) {
        e.preventDefault();
        
        // Reset css 
        document.getElementById('content').className = '';
        
        const item = e.dataTransfer.items[0];
        const entry = item.webkitGetAsEntry();
        
        var file = item.getAsFile().path;
        file = file.replace(/(\r\n|\n|\r)/gm, ""); // Remove windows EOL characters
        var folder = file; // Guess that a folder was dropped 
    
        if (entry.isFile) {
            folder = path.dirname(file); // Correct, because file was dropped
            console.log( 'Folder = ' + folder );
        } 
    
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
                await addExistingRepo( folder); 
            }
        }catch(error){
            console.log(error);
        }

        // Update immediately
        await _setMode('UNKNOWN');
        await _update();

    };
    function resetHistoryPointer(){
        localState.historyNumber = -1; // Reset to current
        downArrowClicked(); 
        
    }
    function clearFindFields(){
        document.getElementById('findTextInput').value = "";
        document.getElementById('findFileInput').value = "";
        document.getElementById('findDateInputAfter').value = "";
        document.getElementById('findDateInputBefore').value = "";
    }    

    // status-bar
    function folderClicked(){
        console.log('Folder clicked');
        //gui.Shell.openItem(state.repos[state.repoNumber].localFolder);
        gui.Shell.openItem( path.resolve(state.repos[state.repoNumber].localFolder) ); // Required for unc paths to work in Windows
    }
    function showSettings() {    
        
        console.log('Settings button pressed');
        
        if ( getMode() == 'SETTINGS' ){
            try{ settings_win.focus(); }catch(err){ }
            return
        }
        
        _setMode('SETTINGS');
        
        let title = "Settings";
        settings_win = gui.Window.open('settings.html' ,
            {
                id: 'settingsWindowId',
                position: 'center',
                width: 600,
                height: 700,
                title: title
            },
            win=>win.on('loaded', () => {settings_win = nw.Window.get(win.window);addWindowMenu(title, 'settings_win');} )
            ); 
        console.log(settings_win);
        localState.settings = true;  // Signals that Settings window is open -- set to false when window closes
     return   
    };

    function resolveConflicts( folder){
        
        let title = "Resolve Conflicts";
               
        if ( localState.conflictsWindow == true ){
            return
        }
        
        gui.Window.open('resolveConflicts.html#/new_page' ,
            {
                id: 'resolveConflictsWindowId',
                position: 'center',
                width: 600,
                height: 700,
                title: title
            },
                win=>win.on('loaded', () => {resolve_win = nw.Window.get(win.window);addWindowMenu(title, 'resolve_win');} )
            ); 
        console.log(resolve_win);
        localState.conflictsWindow = true;  // Signals that Conflicts window is open -- set to false when window closes
    }; 
    function listChanged(){
        
        let title = "Changed Files";
        
        gui.Window.open('listChanged.html#/new_page' ,
            {
                id: 'listChangedId',
                position: 'center',
                width: 600,
                height: 700,
                title: title
            },
                win=>win.on('loaded', 
                    () => {
                        try{ 
                            list_win.close(); // Close prior list_win if exists
                        }catch(err){ 
                        }
                        list_win = nw.Window.get(win.window);
                        addWindowMenu( title, 'list_win');
                    }
                )
            
            ); 
        console.log(settings_win);        
    };
   // ================= END CALLBACK ================= 
} 

async function _loopTimer( timerName, delayInMs){
    
    // Define timer  
    switch( timerName ) {        
        case 'update-loop':    
            return window.setInterval( _update, delayInMs );
            break;
    
        case 'fetch-loop':    
            return window.setInterval( gitFetch, delayInMs );
            break;

    }

    
}
async function _update(){ 
    // Bail out if isPaused = true
    if(isPaused) {
        return;
    }    
    
    // Variables
    let currentBranch = "";
    let modeName = getMode();
    let  status_data = [];
    let  folder = "";
    let fullFolderPath = "";
    
    if (state.repos.length >0){
        fullFolderPath = state.repos[ state.repoNumber].localFolder; 
    }
    
    // If not DEFAULT  --  since DEFAULT is special case (when nothing is defined)
    if ( modeName != 'DEFAULT'){  // git commands won't work if no repo
        
        try{
            status_data = await gitStatus();
            let result = await gitLocalFolder();
            folder = result.folderName;
            currentBranch = status_data.current; 
            gitSetLocalBranchNumber();  // Update localState.branchNumber here
        }catch(err){
            console.log(err);

        }

    }
    
    // If updated repo or branch
    if ( ( lastKnown.repo !== folder )||( lastKnown.branch !== currentBranch ) ){
        lastKnown.repo = folder;
        lastKnown.branch = currentBranch;
        _setMode('UNKNOWN');
    }
    
    
    // Validate repo and folder :
 
    // Check if localFolder exists 
    if (fs.existsSync( fullFolderPath ) ) {
        // If folder exists, I am allowed to check if repo
        
        // Check if repository 
        var isRepo;
        await simpleGit( fullFolderPath ).checkIsRepo(onCheckIsRepo);
        function onCheckIsRepo(err, checkResult) { isRepo = checkResult}
        
        if (!isRepo) {
            folder = "(not a repo) " + folder;
            currentBranch = "";
        }
    }else{    
        let nameOfFolder = fullFolderPath.replace(/^.*[\\\/]/, ''); // This is a substitute -- prefer to get it from git, but here it is unknown from git
        folder = "(not a folder) " + nameOfFolder;
    }   

    // If left settings window
        if ( localState.settings && (modeName != 'SETTINGS') ){  // mode is set to UNKNOWN, but localState.settings still true

            localState.settings = false;
            
            updateWithNewSettings();
            saveSettings();
                
            // Remove from menu
            deleteWindowMenu('Settings');
        }
 
    //
    // SET ICON VISIBILITY 
    //   
    
    let FALSE_IN_HISTORY_MODE  = !(modeName == 'HISTORY'); // Used in if statement to make it false when in history mode
       
    // If left conflicts window
        if ( localState.conflictsWindow && (modeName != 'CONFLICT') ){  
            localState.conflictsWindow = false;
        }
            
    // Push button (show if ahead of remote)
        try{
            if (status_data.ahead > 0){
                document.getElementById('top-titlebar-push-icon').style.visibility = 'visible'
            }else{
                document.getElementById('top-titlebar-push-icon').style.visibility = 'hidden'
            }
        }catch(err){  
            console.log(err);
        }
    
    // Pull button (show if behind remote)
        try{
            if (status_data.behind > 0){
                document.getElementById('top-titlebar-pull-icon').style.visibility = 'visible'
            }else{
                document.getElementById('top-titlebar-pull-icon').style.visibility = 'hidden'
            }
        }catch(err){  
            console.log(err);
        }
        
    // Merge button (hide if uncomitted files)
        try{
            if (status_data.changedFiles){
                document.getElementById('top-titlebar-merge-icon').style.visibility = 'hidden'
            }else{
                document.getElementById('top-titlebar-merge-icon').style.visibility = 'visible'
            }
        }catch(err){  
            console.log(err);
        }
        
    //// Branch button (hide if uncomitted files)
        //try{
            //if (status_data.changedFiles){
                //document.getElementById('top-titlebar-branch-icon').style.visibility = 'hidden'
            //}else{
                //document.getElementById('top-titlebar-branch-icon').style.visibility = 'visible'
            //}
        //}catch(err){  
            //console.log(err);
        //}
         
    // Tag button (hide if uncomitted files)
        try{
            if (status_data.changedFiles){
                document.getElementById('top-titlebar-tag-icon').style.visibility = 'hidden'
            }else{
                document.getElementById('top-titlebar-tag-icon').style.visibility = 'visible'
            }
        }catch(err){  
            console.log(err);
        }
        
               
    // Pinned commit (show if in history mode)
        try{
            if ( (modeName == 'HISTORY') || ( currentBranch == 'HEAD' ) ){
                document.getElementById('top-titlebar-pinned-icon').style.visibility = 'visible'
                document.getElementById('bottom-titlebar-pinned-text').style.visibility = 'visible'
                
                document.getElementById('top-titlebar-branch-arrow').innerHTML= '&#x25B2;';  // ▲
                
            }else{
                document.getElementById('top-titlebar-pinned-icon').style.visibility = 'hidden'
                document.getElementById('bottom-titlebar-pinned-text').style.visibility = 'hidden'
                
                document.getElementById('top-titlebar-branch-arrow').innerHTML = '&#x25BE;';  // ▾
            }
        }catch(err){  
            console.log(err);
        }        
               
               
    // Stash button (show if uncomitted files)
        try{
            if (status_data.changedFiles && FALSE_IN_HISTORY_MODE ){
                document.getElementById('bottom-titlebar-stash-icon').style.visibility = 'visible'
            }else{
                document.getElementById('bottom-titlebar-stash-icon').style.visibility = 'hidden'
            }
        }catch(err){  
            console.log(err);
        }
            
    // Stash-pop button (show if no changed files)
        let stash_status;
        if (state.repos.length > 0){
            try{
                
                await simpleGit( state.repos[state.repoNumber].localFolder)
                    .stash(['list'], onStash);
                function onStash(err, result ){  stash_status = result }
                
                
                //if ( (stash_status.length > 0) && (!status_data.changedFiles) ){
                if ( (stash_status.length > 0) && (!status_data.changedFiles) && FALSE_IN_HISTORY_MODE )
                {
                    document.getElementById('bottom-titlebar-stash_pop-icon').style.visibility = 'visible'
                }else{
                    document.getElementById('bottom-titlebar-stash_pop-icon').style.visibility = 'hidden'
                }
            }catch(err){  
                console.log(err);
            }
            
        }
        
    // All buttons if DEFAULT mode
        if (modeName == 'DEFAULT'){                        
            // Hide icons
            document.getElementById('top-titlebar-push-icon').style.visibility = 'hidden';
            document.getElementById('top-titlebar-pull-icon').style.visibility = 'hidden';
            document.getElementById('top-titlebar-merge-icon').style.visibility = 'hidden';
            document.getElementById('top-titlebar-branch-icon').style.visibility = 'hidden';
            document.getElementById('top-titlebar-tag-icon').style.visibility = 'hidden';        
            document.getElementById('bottom-titlebar-stash-icon').style.visibility = 'hidden';   
            document.getElementById('bottom-titlebar-stash_pop-icon').style.visibility = 'hidden';
            
            // Notes and folder icon hidden if no repo
            document.getElementById('top-titlebar-notes-icon').style.visibility = 'hidden';  
            document.getElementById('bottom-titlebar-folder-icon').style.visibility = 'hidden';  
        }else{
            // Notes and folder icon shown if repo
            document.getElementById('top-titlebar-notes-icon').style.visibility = 'visible'; // Notes icon
            document.getElementById('bottom-titlebar-folder-icon').style.visibility = 'visible'; // Folder icon
        }
               
                        
    //
    // WRITE TITLE-BAR, STATUS-BAR, MESSAGE (history only)
    //    
           
    // mode - dependent :
        switch( modeName ) {        
            case 'UNKNOWN': {  
                _setMode('UNKNOWN'); // _setMode finds the correct Mode if called by "UNKNOWN"
                break;
            }
                
            case 'DEFAULT': {  
                setTitleBar( 'top-titlebar-repo-text', ' ' );
                setTitleBar( 'top-titlebar-branch-text', ' ' );
                setStatusBar(' ');

                break;
            }
                
            case 'NO_FILES_TO_COMMIT': {  
                setTitleBar( 'top-titlebar-repo-text', folder );
                setTitleBar( 'top-titlebar-branch-text', '<u>' + currentBranch + '</u>' );
                setStatusBar( fileStatusString( status_data));
                
                // If not correct mode, fix :
                if (status_data.changedFiles){
                    _setMode('UNKNOWN');
                }
                break;
            }
                
            case 'CHANGED_FILES': {  
             
                try{
                    setTitleBar( 'top-titlebar-repo-text', folder );
                    setTitleBar( 'top-titlebar-branch-text', '<u>' + currentBranch + '</u>' );
                    setStatusBar( fileStatusString( status_data));            
                }catch(err){
                    console.log('update --  case "CHANGED_FILES" caught error');
                    _setMode('UNKNOWN');
                }
                return   
                setTitleBar( 'top-titlebar-repo-text', folder );
                setTitleBar( 'top-titlebar-branch-text', '<u>' + currentBranch + '</u>' );
                setStatusBar( fileStatusString( status_data));         
                // If not correct mode, fix :
                if (!status_data.changedFiles){
                    _setMode('UNKNOWN');
                }
                break;
            }
                
            case 'CHANGED_FILES_TEXT_ENTERED': {  
                setTitleBar( 'top-titlebar-repo-text', folder );
                setTitleBar( 'top-titlebar-branch-text', '<u>' + currentBranch + '</u>' );
                setStatusBar( fileStatusString( status_data));
                // If not correct mode, fix :
                if (!status_data.changedFiles){
                    _setMode('UNKNOWN');
                }
                break;
            }
                
            case 'HISTORY': {  

                let status;
            
                try{
                    status_data = await gitShowHistorical();
                }catch(err){
                    console.log('fileStatus -- caught error');
                    console.log(err);
                }
                console.log(status);
            
            
                //writeMessage( localState.historyString, false);
                textOutput.value = localState.historyString;
                writeTextOutput( textOutput);
            
                setTitleBar( 'top-titlebar-repo-text', folder );
                setTitleBar( 'top-titlebar-branch-text', '<u>' + currentBranch + '</u>' );
                setStatusBar( fileStatusString( status_data));
                
                break;
            }
                
            case 'SETTINGS': {  
                setTitleBar( 'top-titlebar-repo-text', folder );
                setTitleBar( 'top-titlebar-branch-text', '<u>' + currentBranch + '</u>' );
                try{
                    setStatusBar( fileStatusString( status_data));
                 }catch(err){
                    await _setMode('UNKNOWN');
                    setStatusBar(' ');
                    setTitleBar( 'top-titlebar-repo-text', folder );
                    setStatusBar( fileStatusString( status_data));
                }
                
                break;
            }
            
                            
            case 'CONFLICT': {  
                setTitleBar( 'top-titlebar-repo-text', folder );
                setTitleBar( 'top-titlebar-branch-text', '<u>' + currentBranch + '</u>' ); 
                    setStatusBar( fileStatusString( status_data)); 

                console.log('_update -- CONFLICT mode');
                console.log(status);

                break;
            }
            
            default: {
                console.log('run_timer - WARNING : NO MATCHING MODE WAS FOUND TO INPUT = ' + modeName);
            }
        }    
    // return
        return true


};
async function _setMode( inputModeName){
 /* Called from the following :
 * 
 * 'UNKNOWN':                       (let _setMode determine mode by itself)
 * 'DEFAULT':                       _mainLoop, repoClicked, branchClicked, downArrowClicked, upArrowClicked  (used for empty repo list)
 * 'NO_FILES_TO_COMMIT' :           _mainLoop
 * 'CHANGED_FILES':                 _mainLoop, messageKeyUpEvent
 * 'CHANGED_FILES_TEXT_ENTERED' :   messageKeyUpEvent
 * 'HISTORY':                       downArrowClicked, upArrowClicked
 * 'SETTINGS':
 * 'CONFLICT'
 * 
 */
    var newModeName;
    
    let currentMode = await getMode();
    console.log('setMode = ' + inputModeName + ' ( from current mode )= ' + currentMode + ')');
    
    var HEAD_title;    
           
    // Get current message
    var history;
    try{              
        await simpleGit(state.repos[state.repoNumber].localFolder).log( ['-1'],onCurrentMessage);
        function onCurrentMessage(err, result){
            // result.latest has following fields :  hash, date, message, refs, author_email, author_name
            console.log(result);
            console.log(err); 
            HEAD_title = result.latest.message;
            } 
            
    }catch(err){        
        console.log(err);
    }

    
    switch(inputModeName) {  
              
        //
        // UNKNOWN - DETERMINE MODE
        //      
        case 'UNKNOWN': {
                // Fallback guess
                newModeName = 'DEFAULT';  // Best guess so far -- need something else than UNKNOWN to stop infinit recursion
                
                // Reset some localState variables (and let the found mode correct)
                let copyOfLocalState = localState;  // Backup localState
                localState.historyNumber = -1;      // Guess that not in history browsing mode
                
                // Sources used to determinine mode
                let messageLength = readMessage().length;
                let numberOfRepos = state.repos.length;
                let historyNumberPointer = localState.historyNumber;
                let status_data = []; 
                status_data.changedFiles = false;
                
                // Populate  status_data
                try{
                    status_data = await gitStatus();
                    //console.log(' status_data, localState.historyNumber, messageLength, numberOfRepos, historyNumberPointer ');
                }catch(err){
                    status_data.changedFiles = false;  // No changed files, if status fails (probably because no repos)
                }

                // Log sources to determine mode
                console.log(status_data);  
                console.log(messageLength);
                console.log(numberOfRepos);
                console.log(historyNumberPointer);
                
                // Clean values that destroy working-out mode
                if (currentMode == 'HISTORY'){
                    textOutput.value = "";  // Text length is used to determine 'CHANGED_FILES_TEXT_ENTERED'
                    localState.historyString = "";
                    localState.historyHash = "";
                }
       
                // DEFAULT
                if ( numberOfRepos == 0 ){ 
                    newModeName = 'DEFAULT';  
                    _setMode( newModeName);
                    break;
                }    
                   
                // CONFLICT
                if (status_data.conflicted.length > 0){ 
                    newModeName = 'CONFLICT';  
                    _setMode( newModeName);
                    break;
                }     
 
                // NO_FILES_TO_COMMIT
                try{
                    if ( ( numberOfRepos > 0 ) && ( status_data.changedFiles  == false) ){  
                        newModeName = 'NO_FILES_TO_COMMIT'; 
                        _setMode( newModeName);
                        break;
                    }
                }catch(err){
                    console.log('_setMode --  case "CHANGED_FILES" caught error');
                }          
                 
                     
                // CHANGED_FILES 
                // CHANGED_FILES_TEXT_ENTERED
                if ( status_data.changedFiles== true){   
                    if ( messageLength  > 0 ) { newModeName = 'CHANGED_FILES_TEXT_ENTERED' }
                    if ( messageLength == 0 ) { newModeName = 'CHANGED_FILES' } 
                    _setMode( newModeName);
                }   
                
                break;
            }
                
        //
        // KNOWN MODE - UPDATE display state
        //            
        // - Store button -- enabled/disabled  Store/Checkout
        // - Message      -- placeholder/writeable/
        // 
        // all following
        case 'DEFAULT': {
            //if (currentMode ==  'DEFAULT') { return};
            newModeName = 'DEFAULT';
            setButtonText();// Set button
            document.getElementById('store-button').disabled = true;
            textOutput.value = "";
            textOutput.placeholder = "Get started by " + os.EOL 
               + "- dropping a folder onto this window, or " + os.EOL 
               + "- cloning a repository (settings, lower right corner)";    
            textOutput.readOnly = true;
            writeTextOutput(textOutput);
            
            setTitleBar( 'top-titlebar-repo-text', ''  );
            setTitleBar( 'top-titlebar-branch-text', '' );
            break;
        }
            
        case 'NO_FILES_TO_COMMIT': {
            // set by _mainLoop
            newModeName = 'NO_FILES_TO_COMMIT';
            textOutput.placeholder = '"' + HEAD_title + '"'; //+ os.EOL + "- is not changed" + os.EOL + "- nothing to Store"  ;
            if (currentMode ==  'NO_FILES_TO_COMMIT') { return};
            setButtonText();// Set button
            document.getElementById('store-button').disabled = true;
            textOutput.value = "";           
            textOutput.readOnly = true;
            writeTextOutput(textOutput);
            break;
        }
            
        case 'CHANGED_FILES': {
            // set by _mainLoop
            newModeName = 'CHANGED_FILES';
            textOutput.placeholder = '"' + HEAD_title + '"' + os.EOL + "- is MODIFIED" + os.EOL + "- type description and press Store"  ;
            //if (currentMode ==  'CHANGED_FILES') { return};
            setButtonText();// Set button
            document.getElementById('store-button').disabled = true;
            textOutput.value = "";          
            textOutput.readOnly = false;
            writeTextOutput(textOutput);
            break;
        }
            
        case 'CHANGED_FILES_TEXT_ENTERED': {
            // set by messageKeyUpEvent
            console.log( readMessage() );
            newModeName = 'CHANGED_FILES_TEXT_ENTERED';
            if (currentMode ==  'CHANGED_FILES_TEXT_ENTERED') { return};
            setButtonText();// Set button
            document.getElementById('store-button').disabled = false;  
            textOutput.value = readMessage();    
            textOutput.readOnly = false;
            // NOTE: Do not call writeTextOutput(textOutput); Reason : Characters may be lost -- better let browser window handle display self.
            break;
        }
            
        case 'HISTORY': {
            // set by downArrowClicked and upArrowClicked
            newModeName = 'HISTORY';
            if (currentMode ==  'HISTORY') { return};
            document.getElementById("store-button").innerHTML="Checkout";// Set button
            document.getElementById('store-button').disabled = false;
            // Text not fixed
            textOutput.value = "";
            textOutput.placeholder = "";    
            textOutput.readOnly = true;
            writeTextOutput(textOutput);
            break;
        }
            
        case 'SETTINGS': {
            newModeName = 'SETTINGS';
            if (currentMode ==  'SETTINGS') { return};
            setButtonText();// Set button
            document.getElementById('store-button').disabled = true;
            textOutput.value = "";
            textOutput.placeholder = 
                "You are in settings mode." + os.EOL + 
                "- Unfold a settings section ..." + os.EOL + 
                "- Close window when done";    
            textOutput.readOnly = true;
            writeTextOutput(textOutput);
            break;
        }
            
        case 'CONFLICT': {
            newModeName = 'CONFLICT';
            if (currentMode ==  'CONFLICT') { return};
            setButtonText();// Set button
            document.getElementById('store-button').disabled = true;
            textOutput.value = "";
            textOutput.placeholder = 
                "There is a file conflict to resolve" + os.EOL + 
                "- Click the message 'Conflicts ... ' (in status-bar below) " + os.EOL + 
                "- Write a message, and press Store when done";    
            textOutput.readOnly = true;
            writeTextOutput(textOutput);
            break;
        }
        
        default: {
            console.log('setMode - WARNING : NO MATCHING MODE WAS FOUND TO INPUT = ' + inputModeName);
        }    
    }
        
    console.log('setMode result : setMode = ' + newModeName + ' ( from current mode )= ' + currentMode + ')');
      
    // Remember mode
    localState.mode = newModeName;
    
    //writeTextOutput(textOutput); 
    
    // Show
    await _update()
    
    // Depending on mode: during _update(), text may have been entered (textOutput.value is changed).
    let newMessage = readMessage() ;
    if ( textOutput.value !== newMessage){
        textOutput.value = newMessage;
    }
    writeTextOutput(textOutput);  

    return newModeName;  // In case I want to use it with return variable
}

function startPragmaMerge(){
    
    let title = "Pragma-merge";
    gui.Window.open('merge/pragma-merge.html', { 
            id: 'mergeWindowId',
            position: 'center',
            width: 600,
            height: 700,
            title: title
        },
            win=>win.on('loaded', () => {merge_win = nw.Window.get(win.window);addWindowMenu(title, 'merge_win');} )
    ); 
    

}
function startPragmaAskPass(){
     console.log('askpass');
     
         
    let title = "Password";
    gui.Window.open('askpass/askpass.html', { 
            id: 'askpassWindowId',
            position: 'center',
            width: 300,
            height: 400,
            title: title
        },
            win=>win.on('loaded', () => {} )
    ); 
    
    //        win=>win.on('loaded', () => {merge_win = nw.Window.get(win.window);addWindowMenu(title, 'merge_win');} )
    
}

// Git commands
async function gitIsInstalled(){
    var isInstalled = false;
    var resultMessage = "";
    try{
        await simpleGit().raw([ 'version'], test );
        function test(err, result){ 
            console.log(result); 
            resultMessage = result;
            
            if (err == undefined){
                isInstalled = true;
            }
        }; 
    }catch(err){
        console.log(err); 
    }

    // Alert dialog if not installed
    if ( !isInstalled){
        document.getElementById('gitNotInstalledAlert').showModal();
        return
    }
    
    state.git = isInstalled;

    return isInstalled;

}
async function gitDefineBuiltInMergeTool(){
    // Command git config --global --replace-all  include.path ~/.Pragma-git/pragma-git-config .*pragma-git.*
    // where the include files are named "pragma-git-config_XXX" (XXX=mac,win, linux)
    // The paths are relative installed Pragma-git
    //
    // Note that the internal diff tool is called pragma-git from a user's perspective
    // but the name is really pragma-merge (but the user doesn't know about this, since pragma-merge is a built-in part of Pragma-git)
    
    
    // Set up signalling folder  +  remove files that may interfere if left after a crash
    util.mkdir(SIGNALDIR); // In case it does not exist yet
    try{
        
    }catch(err){
        
    }
    util.rm(MERGESIGNALFILE);       // rm 'pragma-merge-running'
    util.rm(EXITMERGESIGNALFILE);   // rm 'exit-pragma-merge'
    
    util.rm(ASKPASSIGNALFILE);     // rm 'pragma-askpass-running'
    util.rm(EXITASKPASSIGNALFILE); // rm 'exit-pragma-askpass'
    
    
    // Find config file
    let configfile = "";
    switch (process.platform) {
      case 'darwin': {
        configfile = GIT_CONFIG_FOLDER + pathsep + 'pragma-git-config_mac';
        
        // Special DEV
        if ( STARTDIR.startsWith('/Users') ){
            configfile = STARTDIR + pathsep + 'gitconfigs' + pathsep + 'pragma-git-config_dev_mac';
        }
        
        break;
      }
      case 'linux': {
        configfile = GIT_CONFIG_FOLDER + pathsep + 'pragma-git-config_linux';
        break;
      }
      case 'win32': {
        // Note : called win32 also for 64-bit  
        configfile = GIT_CONFIG_FOLDER + pathsep + 'pragma-git-config_win';
        break;
      }
    }
    console.log('Config file = ' + configfile);
      
    // Git command
    let regex = '.*pragma-git.*'
    command = [  
        'config',  
        '--global',
        '--replace-all',
        'include.path',
        configfile,
        regex
    ];  
      
    // Set in global git .config file
    try{
        await simpleGit(  )
        .raw( command , onConfig);
    }catch(err){
        console.log('Failed setting internal merge tool');
        console.log(err);
    }  
    function onConfig(err, result) {console.log(result); console.log(err); };

    
}
async function gitStatus(){
    // Determine if changed files (from git status)
    let status_data = [] ;  
    status_data.changedFiles = false;
    status_data.current = "";
    
    // Make safe for empty repos
    if (state.repos.length == 0){ return status_data}
    if (state.repoNumber > (state.repos.length -1) ){ return status_data}

    
    // Handle normal status of uncommited
    try{
        await simpleGit( state.repos[state.repoNumber].localFolder)
            .status( onStatus);
        function onStatus(err, result ){  status_data = result }
        
        // New files can be not_added (user created them) or created (git merge created them)
        status_data.changedFiles = ( 
            (status_data.modified.length 
            + status_data.not_added.length 
            + status_data.created.length
            + status_data.deleted.length) > 0);
            
        status_data.current;  // Name of current branch

    }catch(err){
        console.log('Error in gitStatus()');
        console.log(err);
        
        // Substitute values, if status_data is unknown (because gitStatus fails with garbish out if not a repo)
        status_data = createEmptyGitStatus();
    }
 
    // return fields : 
    //      changedFiles (boolean) 
    //      modified, not_added, deleted (integers)
    //      conflicted; Array of files being in conflict (there is a conflict if length>0)
    
    return status_data;

    //
    // Internal functions
    //
        function createEmptyGitStatus(){
            status_data = [];
            status_data.conflicted = [];
            status_data.modified = []; // zero length
            status_data.not_added = [];
            status_data.created = [];
            status_data.deleted = [];
            status_data.changedFiles = false;
            status_data.ahead = 0;
            status_data.behind = 0;
            return status_data;
        };

}
async function gitReadConfig(){
            
        let out = [];
        await simpleGit( state.repos[state.repoNumber].localFolder ).listConfig( onConfig)
        function onConfig(err, result ){  out = result; console.log(out);console.log(err)}
        
        return out;
}
async function gitShowHistorical(){

    
    let showStatus;
    let outputStatus = []; // Will build a struct on this
    
    // TODO : questionable if needed (3 lines)
    outputStatus.added = [];
    outputStatus.deleted = [];
    outputStatus.modified = [];
    
    outputStatus.files = [];
    
    // Set two commit hashes
    let hash2 = localState.historyHash;
    let hash = hash2 + '^1' + '..' + hash2; // Guess historical: compare first parent with current commit
    
    // If pinned commit.   Difference between pinned and current history point, shows change going forward in time
    if (localState.pinnedCommit !== ''){
           
        if ( await gitIsFirstCommitOldest( localState.pinnedCommit, localState.historyHash) ){
            hash = localState.pinnedCommit + '..' + localState.historyHash; // compare pinned with current commit 
            outputStatus.reversedOrder = false;
        }else {
            hash = localState.historyHash + '..' + localState.pinnedCommit; // Reverse order
            outputStatus.reversedOrder = true;
        }
        console.log('git diff --name-status --oneline ' + hash);
    }   

    // Generate file status data
    try{

        // Read diff
        await simpleGit(state.repos[state.repoNumber].localFolder).diff( ['--name-status','--oneline', hash], onWhatChanged);
        function onWhatChanged(err, result){ console.log(result); showStatus = result } 
        console.log('fileStatus -- hash = ' + hash);
        
        let splitLines = showStatus.split(/\r?\n/); 
        
        for (let i = 0; i < splitLines.length; i++) { 
            let line = splitLines[i];  // Example "M       listChanged.html"
            
            if (line.length > 0)  // Last line may be empty from the git show command
            {   
                // Split into type and file name  
                let type = line.substring(0,1);  // "M"
                let fileName = line.substring(1).trim(); // "listChanged.html"
                
                switch (type){

                    case "A" :
                        outputStatus.added.push(fileName);
                        outputStatus.files.push( { path : fileName, index: type , working_dir : ' '} ); // Alternative storage mimicing the files-field in git status  (useful for listChanged.js)
                        break;
                    
                    case "D" :
                        outputStatus.deleted.push(fileName);
                        outputStatus.files.push( { path : fileName, index: type , working_dir : ' '} ); // Alternative storage mimicing the files-field in git status  (useful for listChanged.js)
                        break;
                    
                    case "M" :
                        outputStatus.modified.push(fileName);
                        outputStatus.files.push( { path : fileName, index: type , working_dir : ' '} ); // Alternative storage mimicing the files-field in git status  (useful for listChanged.js)
                        break;
                    
                    case "R" : // Count renamed as Modified
                        outputStatus.modified.push(fileName);
                        outputStatus.files.push( { path : fileName, index: type , working_dir : ' '} ); // Alternative storage mimicing the files-field in git status  (useful for listChanged.js)
                        break;
                                                
                    default :
                        break; // catches if hashes are listed (as in a merge)
                }
                //outputStatus.files.push( { path : fileName, index: type , working_dir : ' '} ); // Alternative storage mimicing the files-field in git status  (useful for listChanged.js)
                
                console.log('split = ' + line);
            }
        }


    }catch(err){
        console.log('fileStatus -- caught error');
        console.log(err);
    }
    
    return outputStatus;
    
}

async function gitSwitchToRepo(repoNumber){ // TODO : Does not seem to be used
    

    let myEvent = [];
    console.log(state.repos[state.repoNumber].localFolder);
    myEvent.selectedRepo = path.basename( state.repos[state.repoNumber].localFolder );
    myEvent.selectedRepoNumber = state.repoNumber;
    myEvent.currentRepo =  state.repos[state.repoNumber].localFolder;
    
    state.repoNumber = repoNumber;  
    
    _callback('clickedRepoContextualMenu',myEvent);

    
    await updateGraphWindow();
}

async function gitSwitchBranch(branchName){
        
    if (branchName == undefined){
        gitCycleToNextBranch();
        return;
    }
    
    try{
        await simpleGit(state.repos[state.repoNumber].localFolder).checkout( branchName, onCheckout);
        function onCheckout(err, result){console.log(result)}                                  
    }catch (err){
        gitCycleToNextBranch();
    }
    // Update info
    gitFetch();  
    cacheBranchList();
        await updateGraphWindow();
    
}
async function gitSwitchBranchNumber(branchNumber){
    
    if (localState.branchNumber == undefined){
        localState.branchNumber = 0;
    }
        
    // Get branchname after cycling
    branchName = cachedBranchList.local[localState.branchNumber];
    
    await gitSwitchBranch(branchName)
}
async function gitCycleToNextBranch(){
    
    if (localState.branchNumber == undefined){
        localState.branchNumber = 0;
    }
    
    // Cycle branch number
    localState.branchNumber = localState.branchNumber + 1;
    if (localState.branchNumber >= cachedBranchList.local.length){
        localState.branchNumber = 0;
    }
                
    await gitSwitchBranchNumber(localState.branchNumber); 
}

async function gitSetLocalBranchNumber(){
        
    let branchSummary;
    try{
        await simpleGit(state.repos[state.repoNumber].localFolder).branch( onLog);
        function onLog(err, result){console.log(result);console.log(err);branchSummary=result;}  
        // branchSummary.current :  the checked-out branch name 
        // branchSummary.all     :  an array of all branch names
        localState.branchNumber = branchSummary.all.findIndex( (s) => { return (s === branchSummary.current) } ); // Search using javascript String.findIndex function (compare with current branchName) 
    }catch (err){
        console.log('Failed determining branchNumber');
    }

}
async function gitBranchList(){
    
// This returns a struct being extended from the type branchSummaryResult from simpleGit
// with all branch names in struct.all, and a few additional fields (see below) 
    
/*   BACKGROUND :
     ------------
     
     Branch,example branch "dev", exists in many places:
     a) dev is local
     b) remotes/origin/dev is tracking remote repository. That is:  b) is local cache of c)
     c) dev is branch on remote repository (referred to as origin/dev in local git)
    
     If a) is changed and commited, git knows that b) and therefore c) is not synced with a) 
     Push updates c) and b) to be in sync with a)
     Fetch syncs b) with c)
    
    
     Tracking :
    
     If remote branch c) is not defined by an URL, c) cannot be updated, and b) will not be  updated  => Push arrow will be shown
     Solution: turn off b) tracking c) [ git branch --unset-upstream dev ]. In this case I don't want to delete b), but hide it.
    
     When b) is tracking c) : Branch menu should
     - show local branch a) 
     - hide tracking branch b) if a) exists
    
     When b) is NOT tracking c) : Branch menu should
     - show local branch a) 
     - hide local branch b) if a) exists 
    
     That is: the same requirement, need to hide b) if a) exist.
    
    
     THIS FUNCTION :
     ---------------
     This function returns extendedBranchSummaryResult, an extended version of SimpleGits BranchSummaryResult
     (a simple duplicate of BranchSummaryResult with additional fields)
    
     which is extended with field SHOW :
     *  extendedBranchSummaryResult.branches[ branchName].show  which is :
        -- false if b) branch and has a local counterpart a) 
        -- true  if b) branch and no local counterpart a) 
        -- true if a) branch 
        
     and extended with a special list of local a) branches in field LOCAL :
     *  extendedBranchSummaryResult.local  -- containing a list of only the local branches a) 
     

*/


    let extendedBranchSummaryResult;
    
    // Create extended branch summary
    try{
        await simpleGit(state.repos[state.repoNumber].localFolder).branch(['--all', '-vv'], onBranchList);
        console.log(extendedBranchSummaryResult);  
    }catch(err){        
        console.log('Error determining local branches, in branchClicked()');
        console.log(err);
    }

    return extendedBranchSummaryResult;
    
    
    //
    // Define local functions
    //
    function onBranchList(err, result ){
        
        
        // Extend branchSummaryResult from simpleGit
        extendedBranchSummaryResult = result;
        extendedBranchSummaryResult.local = []; // Local branches only
        
        // Set defauls for all branches
        for (let i = 0; i < extendedBranchSummaryResult.all.length; i++) {
            let branchName = extendedBranchSummaryResult.all[i];
            extendedBranchSummaryResult.branches[branchName].show = true;
        }

        // Loop branches and set new fields
        for (let i = 0; i < extendedBranchSummaryResult.all.length; i++) {
                            
            let branchName = extendedBranchSummaryResult.all[i];

            //
            // Set extendedBranchSummaryResult.show for remote, this remote has an existing local with matching name
            //               
            
                if ( branchName.startsWith('remotes') ){
                    let remoteBranchName = branchName;
                    extendedBranchSummaryResult.branches[ remoteBranchName ].show = ! localVersionExists( extendedBranchSummaryResult.all, remoteBranchName);   
                } else{
                    extendedBranchSummaryResult.local.push( branchName );
                }

        }
    }  
 } 
    function localVersionExists( allBranchNames, remoteBranchToCheck){
        // Checks if remoteBranchToCheck (of format xxx/yyyy/THIS) exists as local version (=THIS) in allBranchNames
          
        // Build local equivalent to remote name
        let parts = remoteBranchToCheck.split('/').slice(2); // Everything from second slash ( remotes/origin/KEEPTHIS )
        let derivedLocalName='';
        for (let j=0; j < parts.length; j++){ 
            derivedLocalName += parts.slice(j,j+1) + '/' ; // build parts
        }
        derivedLocalName = derivedLocalName.substring(0,derivedLocalName.length-1); // Remove trailing '/'     
        
        // At this point: a remote branch gives a correct derivedLocalName, which would match if a matching local exists
        //                a local branch  gives a derivedLocalName equal to itself
        
        // Check if derivedLocalName (local version of branchName) exists
        let result = false;
        for (let j = 0; j < allBranchNames.length; j++) { // Loop all branches
            if  ( derivedLocalName === allBranchNames[j] ){
                result = true;
            }
        }
        
        return result;
    }

async function gitHistory() {
    let history;
    
    let searchMessage = document.getElementById('findTextInput').value;
    let searchFile = document.getElementById('findFileInput').value;
    let since = document.getElementById('findDateInputAfter').value;
    let until = document.getElementById('findDateInputBefore').value;
    
    let command = [];
    if (state.FirstParent){
        command.push('--first-parent'); 
    }
    
    // Add only if filter is visible
    if (document.getElementById('output_row').style.visibility == 'visible' ){
    
        // Build command depending on input  
        if ( !isNullOrWhitespace(searchMessage) ){
            // Two options, message or code search
            if ( document.getElementById("message_code_switch").checked ){
                // message text
                command.push('-S'); 
                command.push(searchMessage);
                command.push('--regexp-ignore-case'); 
            }else{
                // code
                command.push('--grep'); 
                command.push(searchMessage);
                command.push('--regexp-ignore-case'); 
            }
        }
         
        if ( !isNullOrWhitespace(since) ){
            command.push('--since'); 
            command.push(since);
        }
         
        if ( !isNullOrWhitespace(until) ){
            command.push('--until'); 
            command.push(until);
        }
        
        if ( !isNullOrWhitespace(searchFile) ){
            command.push('--'); 
            command.push('*' + searchFile + '*' ); // Allow subfolders before file name, and partial file name
        }
    }
 
    try{
        await simpleGit(state.repos[state.repoNumber].localFolder).log( command, onHistory);
        function onHistory(err, result){console.log(result); history = result.all; console.log(' ============ Found N = ' + history.length);} 
    }catch(err){        
        console.log(err);
    }   
    return history; 
    
    function isNullOrWhitespace( input ) {
        return !input || !input.trim();
    }
    
}

async function gitLocalFolder(){
    
    let gitFolders = [];

    try{
        gitFolders.folderPath = await simpleGit(state.repos[state.repoNumber].localFolder)._executor.cwd;    
        gitFolders.folderName = gitFolders.folderPath.replace(/^.*[\\\/]/, '');
     }catch(err){
        gitFolders.folderName = ""; 
        gitFolders.folderPath = ""; 
        
        console.log('gitLocalFolder - Error getting name of local folder');
        console.log(err);
    } 
    // return fields : 
    //    foldername, folderPath
    return gitFolders;
    
}
async function gitAddCommitAndPush( message){
    
    var status_data;     
    
    
    // Read current branch
    try{
        status_data = await gitStatus();
    }catch(err){
        console.log('Error in gitAddCommitAndPush()');
        console.log(err);
    }
    var currentBranch = status_data.current;
    var remoteBranch = currentBranch; // Assume that always same branch name locally and remotely

    
    // Add all files to index
    setStatusBar( 'Adding files');
    var path = '.'; // Add all
    await simpleGit( state.repos[state.repoNumber].localFolder )
        .add( path, onAdd );   
    function onAdd(err, result) {console.log(result) }
    
    
    // Remove localState.unstaged from index
    for (var file of localState.unstaged) {
         await simpleGit( state.repos[state.repoNumber].localFolder )
        .raw( [  'reset', '--', file ] , onReset); 
    }
    function onReset(err, result) {console.log(result) }
    
    await waitTime( 1000);
    
    // Commit 
    setStatusBar( 'Commiting files  (to ' + currentBranch + ')');
    try{
        await simpleGit( state.repos[state.repoNumber].localFolder )
        .commit( message, onCommit);    
        function onCommit(err, result) {console.log(result) };
    }catch(err){
        console.log('Error in gitAddCommitAndPush()');
        console.log(err);
        
        if ( err.toString().includes('empty ident name') ){
            displayAlert('Settings error - you cannot commit!', "Please add Author's name in Settings ( under Software settings)" );
        }
    }
    
    // Add branch in git notes (git notes --ref=branchname add -m 'name of branch')
    await gitRememberBranch( 'HEAD', currentBranch);

    // Push 
    await waitTime( 1000);
    
    if (state.autoPushToRemote){ 
        await gitPush();
    }
      
    // Finish up
    localState.unstaged = [];
    //writeMessage('',false);  // Remove this message 
    textOutput.value = '';
    writeTextOutput( textOutput);
    _setMode('UNKNOWN');  
    await _update()
}
async function gitRememberBranch( hash, name){
    
    // The notes versions can be viewed from command line using :
    //  git notes --ref branchname show HASH
    // for instance
    //  git notes --ref branchname show HEAD
    
    try{   
        // Add branch in git notes (git notes --ref=branchname append -m 'name of branch')    
        await simpleGit( state.repos[state.repoNumber].localFolder )
            .raw( [  'notes', '--ref', 'branchname', 'append' , '-m', name, hash] , onNotes);
        function onNotes(err, result) {console.log( `gitRememberBranch( ${hash}, ${name}) `);console.log(result);console.log(err) };
    }catch(err){
        console.log('Error in gitRememberBranch() -- creating branch-note');   
        console.log(err);
    }  
}

async function gitStash(){
    // Stash
    try{
        await simpleGit( state.repos[state.repoNumber].localFolder ).stash( ['push', '--include-untracked'], onStash);
        function onStash(err, result) {console.log(result);console.log(err) };
    
    }catch(err){
        console.log('Error in gitStash()');
        console.log(err);
    }
 
    setStatusBar( 'Stashing files');
    await waitTime( 1000);    
    
    await gitStashMap(state.repos[state.repoNumber].localFolder);
    await updateGraphWindow();
}
async function gitStashPop( stashRef){
    // If argument stashRef is empty, the lastest stash is applied using : ´stash pop´ or ´stash apply´ (depending on stage.StashPop, from settings dialog)
    // Else, a specific stash through commands : ´stash pop stashRef´ or ´stash apply stashRef´ 

    
    // pop / apply from settings
    let options = ['apply'];
    if (state.StashPop){    
        options = ['pop'];
    }
     
    // Use stashRef if available
    if( stashRef !== undefined) {
        options.push( stashRef);
    }
    
    // Stash 
    try{
        await simpleGit( state.repos[state.repoNumber].localFolder ).stash( options, onStashPop);
        function onStashPop(err, result) {console.log(result);console.log(err) };
    }catch(err){
        // TODO : gitStashPop -- Possibility for this error : error: could not restore untracked files from stash
        // Solution https://gist.github.com/demagu/729c0a3605a4bd2e4c3d
        //
        console.error('Error in gitStashPop()');
        console.error(err);
    }
 
    setStatusBar( 'Retrieving stashed files');
    await waitTime( 1000);   
    
    await gitStashMap(state.repos[state.repoNumber].localFolder);
    await updateGraphWindow();
         
}
async function gitStashMap( folder ){
    
    const UNIQUE_EOL = 'X3.17X';  // Used as EOL in git log to split rows to make it improbable to mix up output with EOL
    
    var stashMap = new Map();  // Map  commit-hash -> { stash: "stash@{1}", message:  "WIP on develop: 52a9cf2 Copy hash, when clicking hash in main window" }.  52a9cf2 same as short commit-hash
    
    let rawOutput;
    try{
        //await simpleGit(folder).stash(['list', '--format="P=%H REF=%gd S=%s' + UNIQUE_EOL + '"'], (err, res) => { rawOutput = res; } );
        await simpleGit(folder).raw(
            [ 'log', '--walk-reflogs', '--no-abbrev-commit', '--format=H=%P REF=%gd S=%s' + UNIQUE_EOL + '', 'refs/stash'], 
            (err, res) => { rawOutput = res; global.res = res} 
        );
    }catch(err){
        console.log('ERROR in gitStashMap');
        console.log('      Repo = '  + folder);
        console.log(err);
        global.stashMap = stashMap;
        return
    }
  

    let splitted = rawOutput.split( UNIQUE_EOL + '\n');
    
    console.log(splitted);
    
    for(var row = 0; row < splitted.length; row++) {
        
        text = splitted[row] ;
        
        let startOfMessage = text.lastIndexOf('S=');  // From git stash list --format="H=%H REF=%gd S=%s"
        let messageInThisRow = text.substring(startOfMessage + 2) ; // Skip S=  
        
        let startOfRef = text.lastIndexOf('REF=');  
        let refinThisRow = text.substring(startOfRef + 4, startOfMessage - 1); 
        
        // Multiple parent hashes, the first one is the commit that stash came from
        let startOfHash = text.lastIndexOf('H=');  
        let hashesInThisRow = text.substring(startOfHash + 2, startOfRef - 1); 
        
        // Split of the first hash
        let hashOfStashCommitParent = hashesInThisRow.split( ' ');
        let hashInThisRow = hashOfStashCommitParent[0];
        
        // For verification, read short hash and test if same as commit-hash
        let startOfHashPartOfMessage = messageInThisRow.lastIndexOf(':');
        let hashPartOfMessage = messageInThisRow.substring(startOfHashPartOfMessage + 2, startOfHashPartOfMessage + 2 + 7) ; // Skip ': ' and keep next 7 characters 
        let warn = false;
        if ( !hashInThisRow.includes(hashPartOfMessage) ){
            warn = true;
            console.warn("WARNING - gitStashMap -- could not verify stash's parent commit from log message");
            // Test if reason is that hash is not in message
            if ( hashInThisRow.substring(0,7) !== hashPartOfMessage){
                console.warn("        - reason : hash was not included in message from git log");
            }
            console.warn('        - ' + text);
            console.warn(" ");
        }
        
        // Read stash number from REF
        
        let stashNumber = refinThisRow.substring( refinThisRow.lastIndexOf('{') + 1,  refinThisRow.lastIndexOf('}')  ) 
    
        
        
        let valueStruct = { stash : refinThisRow, message : messageInThisRow, stashNumber : stashNumber, warning : warn};
        
        // Add to array for this key, if same hash as previously
        if ( stashMap.has(hashInThisRow) ){
            let array = stashMap.get(hashInThisRow);
            array.push(valueStruct);
            stashMap.set( hashInThisRow, array);
        }else{
            let array = [ valueStruct ]
            stashMap.set( hashInThisRow, array);
        }

    }
    // Store globaly, so that graph window can use
    global.stashMap = stashMap;

}     

async function gitPush(){
    
    // Read current branch
    try{
        status_data = await gitStatus();
    }catch(err){
        console.log('Error in gitPush()');
        console.log(err);
    }
    var currentBranch = status_data.current;
    var remoteBranch = currentBranch; // Assume that always same branch name locally and remotely
    
    let configItems = await gitReadConfig();

    // Push
    setStatusBar( 'Pushing files  (to remote ' + remoteBranch + ')');
    
    let attempt = '';
    try{
        // Bail out if remote not configured 
        let c = configItems.all['remote.origin.url'];
        if (c === undefined ||  c.trimEnd().trimStart() === '') {
            console.log('URL empty or undefined'); // Nothing to push to 
            return
        }else{
            console.log('URL defined'); 
        }

        
        // Test if remote works
        await simpleGit(state.repos[state.repoNumber].localFolder).listRemote( ['--heads'], onListRemote); 
        function onListRemote(err, result) {console.log(result) };
        
        // remote.origin.mirror  -- two cases
        if ( configItems.all['remote.origin.mirror'] === 'true'){
            // 'mirror' incompatible with refspace ('origin') and '--tags'
            await simpleGit( state.repos[state.repoNumber].localFolder ).push( onPush);
        }else{
            
            // Sometimes github gives an error, with files being locked. This is an attempt to retry a second time
            try{
                await push();
                console.log('success push - first attempt');
            }catch(err){
                // Try again
                attempt = ' - on second attempt';
                console.warn('First push attempt failed, with error : ');
                console.warn(err);
                console.warn('wait for push 2');
                console.warn(' ');
                setTimeout( await push, 3000);
                console.log('success push - second attempt');
            }
            
            async function push(){
                 // Push commits and tags, and set upstream
                await simpleGit( state.repos[state.repoNumber].localFolder ).push( 'origin', currentBranch,{'--set-upstream' : null, '--tags' : null}, onPush);
                
                // Push branchname notes (git push origin refs/notes/branchname)
                await simpleGit( state.repos[state.repoNumber].localFolder ).push( 'origin', 'refs/notes/branchname', onPush);               
            }

        }
        function onPush(err, result) {console.log(result) };  
        

    }catch(err){
        displayAlert('Push Error' + attempt , err);
    }
    
    await waitTime( 1000);  

}
function gitFetch(){ // Fetch and ls-remote
    console.log('Starting gitFetch()');
     
    var error = "";

    //
    // Fetch
    //
     try{

        // Fetch
        simpleGit( state.repos[state.repoNumber].localFolder ).fetch( onFetch);
        function onFetch(err, result) {console.log(result) };
        
        // TODO : remove if I found no problems with this comment-out
        //// List remote branches
        //simpleGit(state.repos[state.repoNumber].localFolder).listRemote( ['--heads'], onListRemote);    
        
        //async function onListRemote(err, result ){ 
              
            //let b = await gitBranchList();
            //console.log(b);
            //console.log(result); 
            //console.log(err); 
          
            //// Parse remote branch names
            //let splitted = result.split("\n");
            //console.log(splitted)

            //let remoteShortBranchNames = []; // Branch names existing on remote ( format: master)
            
            //for(var row = 0; row < (splitted.length - 1); row++) {
                //let index = splitted[row].lastIndexOf('/'); // Format such as 'refs/heads/master'
                //let remoteBranchName = splitted[row].substring(index + 1); // Extract last part ('master' in example)
                //remoteShortBranchNames[row] = remoteBranchName; 
                
                //// New version
                //let parts = splitted[row].split('/');
                //remoteBranchName = '';
                //for ( i = 2; i < parts.length - 1; i++ ){
                    //remoteBranchName += parts[i] + '/';
                //}
                //remoteBranchName += parts[parts.length - 1];
                //remoteShortBranchNames[row] = remoteBranchName; 

            //}
        
        //}

    }catch(err){
        console.log('Error in gitFetch()');
        console.log(err);
        error = err;
    }
    
    
            
    //
    // Get notes (git fetch origin refs/notes/*:refs/notes/*)  really want to get branchname notes, but why not get all
    //
    
    try{

        // Fetch
        simpleGit( state.repos[state.repoNumber].localFolder ).fetch( 'origin', 'refs/notes/*:refs/notes/*', onFetch);
        function onFetch(err, result) {console.log(result) };        
        
        
    }catch(err){
        console.log('Error in gitFetch() -- failed getting notes');
        console.log(err);
        error = err;
    }    
    
  
}
async function gitPull(){
    
    var error = "";
    // Read current branch
    try{
        status_data = await gitStatus();
    }catch(err){
    }
    
    var currentBranch = status_data.current;
    var remoteBranch = currentBranch; // Assume that always same branch name locally and remotely

    // Pull
    if (status_data.behind > 0){
        setStatusBar( 'Pulling files  (from remote ' + remoteBranch + ')');

        try{
            await simpleGit( state.repos[state.repoNumber].localFolder ).pull( onPull);
            function onPull(err, result) {console.log(result) };
            
            //await writeTimedMessage( 'Pulled files from remote' + os.EOL + error, true, WAIT_TIME);
            
            let tempOutput = {};
            tempOutput.placeholder = 'Pulled files from remote' + os.EOL + error;
            tempOutput.value = '';
            await writeTimedTextOutput(tempOutput, WAIT_TIME);
            
            
        }catch(err){
            
            displayAlert('Failed pulling remote file', err); 
            console.log('Error in gitPull()');
            console.log(err);
            error = err;
            
        }
        _setMode('UNKNOWN');
    }else {
        displayAlert('No files can be pulled from remote', err);
    }

}
async function gitMerge( currentBranchName, selectedBranchName){

    console.log('gitMerge, merge branch = ' + selectedBranchName);
    console.log('gitMerge, into current branch =  ' + currentBranchName);
    
    await waitTime( 1000);
    
    let mergeResult;  
    let mergeError;  // mergeError.conflicts
    
    // Set No-fast-forward option according to settings
    let options = ['--no-commit' ];
    if (state.NoFF_merge){
        options = ['--no-ff', '--no-commit' ];
    }
    
    // Merge
    try{
        setStatusBar( 'Merging "' + selectedBranchName + '" -> "' + currentBranchName + '"');
        await simpleGit( state.repos[state.repoNumber].localFolder )
            .mergeFromTo( selectedBranchName, currentBranchName, options, onMerge);
            
        function onMerge(err, result) {console.log(result); mergeResult = result; mergeError = err };
       
        await waitTime( 1000);  
    }catch(err){
        console.log('gitMerge failed');     
    }
  
      
    // Finish up
    //writeMessage('',false);  // Remove this message  
    
    //await _setMode('UNKNOWN');
    await _setMode('CHANGED_FILES_TEXT_ENTERED');
    await _update()
    
    textOutput.value = "Merge branch '" + selectedBranchName + "' into " + currentBranchName;
    textOutput.readOnly = false;
    //textOutput.placeholder = 'Write description of Merge, and press Store';
    writeTextOutput( textOutput);
}
    
async function gitIsFirstCommitOldest( oldCommit, newCommit){ 
    // Checks if first parameter is older commit than second parameter
    // Caching of oldCommit, newCommit, cachedResult in persistent struct gitIsFirstCommitOldest
    
    // Cache functionality
    if( typeof gitIsFirstCommitOldest.oldCommit == 'undefined' ) {    
        await calculate(oldCommit, newCommit); // Sets all cached variables
        return gitIsFirstCommitOldest.cachedResult;  // Returns cached result
    }
    
    if ( ( oldCommit === gitIsFirstCommitOldest.oldCommit) && ( newCommit === gitIsFirstCommitOldest.newCommit) ){
        return gitIsFirstCommitOldest.cachedResult;  // Returns cached result
    }else{
        await calculate(oldCommit, newCommit);       // Sets cache variables
        return gitIsFirstCommitOldest.cachedResult;  // Returns new cached result
    }

    // Internal function - calculate true / false
    async function calculate(oldCommit, newCommit){
        
        function onLog(err, result){ console.log(result); return result } 
        let old = await simpleGit(state.repos[state.repoNumber].localFolder).log( [oldCommit], onLog);
        let newest = await simpleGit(state.repos[state.repoNumber].localFolder).log( [newCommit], onLog);
        
        console.log('gitIsFirstCommitOldest --  old =' + old.latest.date + '  new = ' + newest.latest.date  );
        console.log('gitIsFirstCommitOldest --  old < newest =' + (old.latest.date < newest.latest.date) );
        
        // Remember cached inputs    
        gitIsFirstCommitOldest.oldCommit = oldCommit;
        gitIsFirstCommitOldest.newCommit = newCommit;
        
        // Remember cached output
        gitIsFirstCommitOldest.cachedResult = ( old.latest.date < newest.latest.date );
        
        return;         
    }
}

function rememberDetachedBranch(){
    state.repos[state.repoNumber].detachedBranch = {};
    state.repos[state.repoNumber].detachedBranch.hash = localState.historyHash;  // TODO :  Is this necessary ?
    state.repos[state.repoNumber].detachedBranch.detachedBranchName = cachedBranchList.local[ localState.branchNumber];

    saveSettings(); // Make sure detached branch is saved
}

async function commitSettingsDir(){  // Settings dir local incremental backup is done in a git repository 

    // Message (format: 2021-09-29@09:24 )
    var currentdate = new Date();
    var message = currentdate.getFullYear() 
    + "-" + (currentdate.getMonth() + 1).toString().padStart(2, "0") 
    + "-" + currentdate.getDate().toString().padStart(2, "0") 
    + "@" + currentdate.getHours().toString().padStart(2, "0") 
    + ":" + currentdate.getMinutes().toString().padStart(2, "0");
 
 
    // Copy .gitignore to settings Dir
    const gitignore = settingsDir + pathsep + '.gitignore';
    const gitignoreTemplate = 'template-gitignore-settings-dir';
    if (!fs.existsSync(gitignore)){
        fs.copyFile(gitignoreTemplate, gitignore, (err) => {
            if (err) throw err;
            console.log('gitignoreTemplate was copied SETTINGSDIR/.gitignore');
        });
    }
 
    // Initialize (safe is it is already a repository)
    await simpleGit(settingsDir).init( onInit );
    function onInit(err, initResult) { }

 
    // Add all
    var path = '.'; 
    await simpleGit( settingsDir )
        .add( path, onAdd );   
    function onAdd(err, result) {console.log(result) }

    
    // Commit 
    try{
        await simpleGit( settingsDir )
        .commit( message, onCommit);    
        function onCommit(err, result) {console.log(result) };
    }catch(err){
        console.log('Error in gitAddCommitAndPush()');
        console.log(err);
        
        if ( err.toString().includes('empty ident name') ){
            displayAlert('Settings error - you cannot commit!', "Please add Author's name in Settings ( under Software settings)" );
        }
    }
}
    

// Branch-menu functions

async function cacheBranchList(){

    try{
        cachedBranchList = await gitBranchList();
        let currentBranch = cachedBranchList.current; 
        
    }catch(err){        
        console.log('Error determining local branches, in branchClicked()');
        console.log(err);
    }                

}
function makeBranchMenu(menu, currentBranch, branchList, callbackName){ // helper for branchClicked and mergeClicked
        // menu is a nw.Menu
        // currentBranch is a string
        // branchList is a struct where branchList.all is an array of branch names
        // callbackName is a string
        
            
            workaround_store_submenus = []; // Clear submenu-item references to avoid premature Windows10 garbage collection
        
            let branchNames = branchList.all;
                        
            // If detached HEAD, remove one item from menu
            if (currentBranch === 'HEAD') { 
                branchNames.shift();  // Remove first item
            }
        
        
            //
            // Loop branch list
            //           
            
            let submenuInProgress = false;
            let cachedFirstPart = ' ';
            let numberOfHiddenBranches = 0;
            let submenu = new gui.Menu(); // Prepare an empty submenu for future use
            let remoteSubmenu = new gui.Menu(); // Prepare an empty submenu for future use
            
            for (var i = 0; i < branchNames.length; ++i) {
                
                // Populate utility variables 
                let firstPart = branchNames[i].split('/',1).toString();
                let secondPart = branchNames[i].substring( branchNames[i].indexOf('/') + 1);
                let myEvent = { selectedBranch: branchNames[i], currentBranch: currentBranch, branchNumber: i }; // Will be used when creating menu callback 
                
                // Logics
                let isSubMenuItem = branchNames[i].includes("/") ;
                let requireNewSubMenu = (firstPart !== cachedFirstPart);

                let isRemoteBranch = (firstPart === 'remotes');
                let isLocalBranch = !isRemoteBranch;
                let showRemote = branchList.branches[ branchNames[i] ].show; 
                
                let isCurrentBranch = ( currentBranch === branchNames[i] );
                
                // Don't show remote if merge-menu (because merge requires local branch)
                if ( ( callbackName === "clickedMergeContextualMenu") && (firstPart == "remotes") ) { 
                    continue 
                }
                 
                 
                // Add finished submenu to menu
                if ( submenuInProgress && (firstPart !== cachedFirstPart) ) {
                    menu.append( new gui.MenuItem( { label : cachedFirstPart, submenu: submenu }  )); 
                    submenuInProgress = false;
                    submenu = new gui.Menu(); // Prepare an empty submenu for future use
                }                   
                       
                               
                // Skip hidden menus  
                if ( util.isHiddenBranch( state.repos[ state.repoNumber].hiddenBranches, branchNames[i]) ){
                    console.log(`Hidden branch = ${branchNames[i]}`);
                    numberOfHiddenBranches++; 
                    continue;
                }
                
                
                // Show simple branch name 
                if ( !isSubMenuItem ){
                    menu.append( new gui.MenuItem( { 
                        label : branchNames[i], 
                        type: 'checkbox',
                        checked : isCurrentBranch,
                        enabled: !isCurrentBranch,
                        click :  () => { _callback(callbackName,myEvent);}  
                    }));    
                }
                
                // Submenu item
                if ( isSubMenuItem ){
                    //console.log( `Branch : ${firstPart}/${secondPart}`);
                   
                    // Special case for remote
                    if (isRemoteBranch){    
                        myEvent.selectedBranch = secondPart.substring( myEvent.selectedBranch.indexOf('/') ); // Shorten to look like a local branch in callback
                    }
                    
                    // Add to submenu
                    if ( (isRemoteBranch && showRemote) || isLocalBranch ) {
                        
                        let tempSubMenu = new gui.MenuItem( { 
                                label: secondPart,
                                type: 'checkbox',
                                checked : isCurrentBranch,
                                enabled: !isCurrentBranch,  
                                click :  () => { _callback( callbackName, myEvent); }  
                            });
                        
                        if (isRemoteBranch && showRemote) {
                            remoteSubmenu.append( tempSubMenu); 
                            submenuInProgress = false;
                        }else {
                            submenu.append( tempSubMenu); 
                            submenuInProgress = true;
                        }
                        
                        workaround_store_submenus.push( tempSubMenu); // Keep submenu-item reference to avoid premature Windows10 garbage collection
                        
                        console.log(`${i}:  Local branch = ${branchNames[i]}  showRemote = ${showRemote} `);
                    }
 
                    
                }
                cachedFirstPart = firstPart;
  
            } // End - branch list loop 
                 
                
            // Add remotes to menu
            if ( remoteSubmenu.items.length > 0 ){
                menu.append(new gui.MenuItem({ type: 'separator' }));
                menu.append( new gui.MenuItem( { label : cachedFirstPart, submenu: remoteSubmenu }  )); 
            }
                 
                 
            // Add last submenu to menu 
            if ( submenuInProgress) {
                menu.append( new gui.MenuItem( { label : cachedFirstPart, submenu: submenu }  )); 
                
            }   
  
            // Indicate how many hidden branches exists
            if (numberOfHiddenBranches > 0){
                menu.append(new gui.MenuItem({ type: 'separator' }));
                menu.append(new gui.MenuItem({ label: '(' + numberOfHiddenBranches + ' hidden branches )', enabled : false }));
            }
            
 

        };


// Utility functions
function getMode(){
    return localState.mode;
}
function waitTime( delay) {
// Delay in milliseconds
   console.log("starting delay ")
   return new Promise( resolve => {
        setTimeout(
            function() {
                    resolve("delay ")
                    console.log("delay is done")
            }
            , delay
        )
  })
}
function mkdir(dir){
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
}
async function addExistingRepo( folder) {
        // Get top folder
        var topFolder;
        try{

            // Find top folder of Repo
            await simpleGit(folder).raw([ 'rev-parse', '--show-toplevel'], onShowToplevel);
            function onShowToplevel(err, showToplevelResult){ console.log(showToplevelResult); topFolder = showToplevelResult } //repeated for readibility
            //topFolder = topFolder.replace(os.EOL, ''); // Remove ending EOL
            topFolder = topFolder.replace(/(\r\n|\n|\r)/gm, ""); // Remove windows EOL characters
    
        }catch(error){
            console.log(error);
        }


        
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
        state.repoNumber = index;
        localState.branchNumber = 0; // Should always start at 0, because that is the first one found in git lookup ( such as used in branchedClicked()  )
    
        // Set global
        state.repos[state.repoNumber].localFolder = topFolder;
        console.log( 'Git  folder = ' + state.repos[state.repoNumber].localFolder );
}    
function setPath( additionalPath){
    
    let sep = ':';  // mac or linux
    if ( os.platform().startsWith('win') ){
        sep = ';';
    }
    
    // Add to path 
    try{
        process.env.PATH = defaultPath + sep + additionalPath; 
    }catch(err){
        console.log(err);
    }
    
    // Correct if empty
    if (additionalPath.length  == 0 ){
         process.env.PATH = defaultPath;
    }
    
}
function selectInGraph(hash){
        
        if (localState.graphWindow){  
            
            if (hash !==''){
                // Select by clicking
                let div = graph_win.window.document.getElementById( hash );
                div.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
                div.firstElementChild.click();
            }else{
                // Deselect
                let div = graph_win.window.document.getElementById(localState.selectedDiv.id);
                div.classList.remove('selected');
            }
        }
    }
function getSettingsDir(){
    return settingsDir;
}
function closeAllChildWindows( inputWin){
    // This function loops all open windows.
    // Window that have inputWin as parent = child window, and are closed.
    // Windows are identified by their title
    
    let inputTitle = inputWin.window.document.title;
    
    // Loop all windows and close if child to parent
    gui.Window.getAll( 
    
        function allWindowsCallback( windows) {
            
            // Loop all windows
            for (let i = 0; i < windows.length; i++) {
                
                let win_handle =  windows[i];
                try{   
                    let parentTitle = win_handle.window.opener.document.title;
                    // Close if child window (its parent has same title as inputWin)
                    if (parentTitle == inputTitle){
                        win_handle.close();
                    }
                }catch(err){
                }
            }    
        } 
    );    
    
    
}
function setButtonText(){  // Store or Commit, depending on setting for autopush
    // Store-button : Store or Commit depending on setting
    if (state.autoPushToRemote){
        document.getElementById('store-button').innerText = 'Store';
    }else{
        document.getElementById('store-button').innerText = 'Commit';
    }
         
}
async function getLatestRelease( url ){     

    let outData; 
    
    await fetch(url)
    .then(response => response.json())
    .then(data => { 
        outData = data[0];
    });
    return outData; // outData.tag_name is latest release
}   
         

// Update other windows
async function updateGraphWindow(){
    
    await _update();
    if (localState.graphWindow){
        _callback( 'clicked-graph');
    }

    win.focus();
}
async function updateSettingsWindow(){

    await _update();

    if (localState.settings){
        settings_win.window.injectIntoSettingsJs(settings_win.window.document)
    }
    
    win.focus();
}


// Dialogs
async function tag_list_dialog(){
            
            let tagList;
            
            try{
                // List tags

                await simpleGit( state.repos[state.repoNumber].localFolder ).tag( ['--list'], onTagList);
                function onTagList(err, result) {console.log(result);console.log(err); tagList = result };
                
                // Make array of tags (from one result-string)
                localState.arrayTagList = tagList.split(os.EOL);
            
            }catch(err){
                console.log('Error in tagList()');
                console.log(err);
            }
    
    
            gui.Window.open(
                'tagList.html#/new_page' ,
                {
                    id: 'tagListWindowId',
                    position: 'center',
                    title: "Select one tag"
                }
            ); 
            
            localState.tagListWindow = true;

}
function displayAlert(title, message){
    
    // Copied from settings.js
    
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


// MacOS Menu
function initializeWindowMenu(){
    if (process.platform !== 'darwin'){
        return
    }   
    
    // Assumption:  Window menu is last to the right
    
    
    // Read localized Window name (using original Window menu)
    let mb0 = new gui.Menu({type: 'menubar'});
    mb0.createMacBuiltin('Pragma-git',{hideEdit: false, hideWindow: false}); // NOTE: hideEdit = true, stops shortcuts for copy/paste
    
    let localWindowMenuName = mb0.items[mb0.items.length -1].label;
    
    
    // Replace with own Window Menu (use localized name from above)
    mb = new gui.Menu({type: 'menubar'});
    mb.createMacBuiltin('Pragma-git',{hideEdit: false, hideWindow: true}); // NOTE: hideEdit = true, stops shortcuts for copy/paste

    mb.append(
        new gui.MenuItem({
            label: localWindowMenuName,
            submenu: new gui.Menu()
        })
    );
    
    
    // Assume Window menu is last to the right
    let WindowMenu = mb.items.length - 1;    
    macWindowsMenu = mb.items[WindowMenu].submenu;
    

    // Own menu to implement "Bring all to front"
    mb.items[WindowMenu].submenu = macWindowsMenu;
    
    // Show menu
    gui.Window.get().menu = mb;

   
    //
    // Generate Window submenu items
    //
   
     
    // Menu : Minimize
    macWindowsMenu.append(new gui.MenuItem(
            { 
                label: "Minimize", 
                key: 'M',
                modifiers: "cmd",
                click: () =>  minimizeWindow()
            } 
        )
    );  
     
    // Menu : Close
    macWindowsMenu.append(new gui.MenuItem(
            { 
                label: "Close", 
                key: 'W',
                modifiers: "cmd",
                click: () =>  closeSelectedWindow()
            } 
        )
    );    
 
 
    // Add separator
    macWindowsMenu.append(new gui.MenuItem({ type: 'separator' }));
    
       
    // Menu : Show all
    let click = `() =>  { showAllWindows( ) } `;
    macWindowsMenu.append(new gui.MenuItem(
            { 
                label: "Show all", 
                click: eval(click)
            } 
        )
    ); 
     
    // Menu : Hide all
    click = `() =>  { hideAllWindows( ) } `;
    macWindowsMenu.append(new gui.MenuItem(
            { 
                label: 'Hide all', 
                click: eval(click)
            } 
        )
    );   
    
    // Menu : Close all
    click = `() =>  { closeAllWindows( ) } `;
    macWindowsMenu.append(new gui.MenuItem(
            { 
                label: 'Close all', 
                click: eval(click)
            } 
        )
    );  
 
    // Add separator
    macWindowsMenu.append(new gui.MenuItem({ type: 'separator' }));
    
    // Add main window to menu
    addWindowMenu( 'Main Window', 'main_win');
    
}
function addWindowMenu(title,winHandleNameAsString){
    
    if (process.platform !== 'darwin'){
        return
    }   
    
    winHandle = eval(winHandleNameAsString); // Convert from string to handle
    
    let click = `() => { ${winHandleNameAsString}.focus(); }`;
    
    // Add new menu to Windows with callback
    macWindowsMenu.append(new gui.MenuItem(
            { 
                label: title, 
                click: eval(click)
            } 
        )
    ); 
    
    // Store mapping between Menu name and handle variable
    window_menu_handles_mapping[title] = winHandleNameAsString;
}
function deleteWindowMenu(title){
    
    if (process.platform !== 'darwin'){
        return
    }   
    
    // Make of all items except deleted
    let menuItemNumber = util.findObjectIndex( macWindowsMenu.items, 'label', title);
    let guiMenuItems = macWindowsMenu.items;
    guiMenuItems.splice(menuItemNumber, 1); // Remove menu to delete from list
    
    // Create new default menu
    initializeWindowMenu();
    console.log('macWindowsMenu.items.length = ' + macWindowsMenu.items.length);
    
    // Build new menu
    for (var j = macWindowsMenu.items.length; j < guiMenuItems.length; j++){
        let label = guiMenuItems[j].label;
        let winHandleNameAsString = window_menu_handles_mapping[label];
        addWindowMenu( guiMenuItems[j].label, winHandleNameAsString)
    }
}
function showAllWindows(){

    gui.Window.getAll( 
        
        function allWindowsCallback( windows) {
            for (let i = 0; i < windows.length; i++) {
                let win_handle =  windows[i];
                win_handle.focus();
            }    
        } 
    );
}
function hideAllWindows(){

        gui.Window.getAll( 
        
            function allWindowsCallback( windows) {
                for (let i = 0; i < windows.length; i++) {
                    let win_handle =  windows[i];
                    if ( win_handle.title !== 'Pragma-git'){
                        win_handle.minimize();
                    }
                }    

            } 
        );
}
function closeAllWindows(){
    
        gui.Window.getAll( 
        
            function allWindowsCallback( windows) {
                for (let i = 0; i < windows.length; i++) {
                    let win_handle =  windows[i];
                    if ( win_handle.title !== 'Pragma-git'){
                        win_handle.close();
                    }
                }    

            } 
        );
        
        
}
function minimizeWindow(){

    gui.Window.getAll( 
        
        function allWindowsCallback( windows) {
            for (let i = 0; i < windows.length; i++) {
                let win_handle =  windows[i];
                if ( win_handle.window.document.hasFocus() ){
                    win_handle.minimize();
                }
            }    
        } 
    ); 
}
function closeSelectedWindow(){

    gui.Window.getAll( 
        
        function allWindowsCallback( windows) {
            for (let i = 0; i < windows.length; i++) {
                let win_handle =  windows[i];
                if ( win_handle.window.document.hasFocus() ){
                    win_handle.close();
                }
            }    
        } 
    ); 
}


// Title bar
function setTitleBar( id, text){
    if (text.length == 0){
        text = " ";
    }
    // Update only if changed (no need to redraw)
    if ( document.getElementById(id).innerHTML !== text){
        document.getElementById(id).innerHTML = text;
    }
    //console.log('setTitleBar (element ' + id + ') = ' + text);
}
function updateImageUrl(image_id, new_image_url) {
  var image = document.getElementById(image_id);
  if (image)
    image.src = new_image_url;
}
function focusTitlebars(focus) {
  var bg_color = focus ? "#404040" : "#303030";
    
  var titlebar = document.getElementById("top-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
  titlebar = document.getElementById("bottom-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
  titlebar = document.getElementById("left-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
  titlebar = document.getElementById("right-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
}
function updateContentStyle() {
 
    
    
    // zoom factor
    var zoom = state.zoomMain;
    window.document.body.style.zoom = zoom;

    // Window size is in screen coordinates
    // Scale to window coordinates :
    var height = window.outerHeight / zoom;
    var width = window.outerWidth / zoom;
    
    // Element heights adding up to Window size
    var tb_height = document.getElementById("top-titlebar").offsetHeight; // In same coordinates as window
    var arrow_buttons_height = document.getElementById('arrow_table').offsetHeight;
    var outputRowHeight = document.getElementById('output_row').offsetHeight; // Search folds out here
       
    // Translate to zoomed in-window coordinates
    var content_height = ( height  - 2 * tb_height ) - 6;

    
    // Set content size
    var top = tb_height;
    var contentStyle = "position: absolute; ";
    contentStyle += "left: 0px; ";
    contentStyle += "top: " + top + "px; ";
    contentStyle += "height: " + content_height  + "px; ";
    document.getElementById('content').setAttribute("style", contentStyle);;

    console.log('-----------');
    console.log(top);
    console.log(content_height);
    console.log('-----------');

}


// Message
function writeTextOutput(textOutputStruct){
    document.getElementById('message').value = textOutputStruct.value;
    document.getElementById('message').placeholder = textOutputStruct.placeholder;  
    document.getElementById('message').readOnly = textOutputStruct.readOnly; 
    textOutput = textOutputStruct;
}
async function writeTimedTextOutput(textOutputStruct, time){
    // Give the user the time to read the message, then restore previous message
    
    // Pause timer
    isPaused = true;
    
    
    // Store old message
    let oldTextOutput = textOutput;
    
    // Show new message and wait
    //writeMessage( message, placeholder);
    textOutput.value = textOutputStruct.value;
    textOutput.placeholder = textOutputStruct.placeholder;
    writeTextOutput( textOutput);
    await waitTime( time).catch({});

    
    // Restore old message (if user hasn't written something in the wait time
    if ( (textOutput.value.length )== 0 ){
        //writeMessage( oldMessage, placeholder);
        textOutput = oldTextOutput;
        writeTextOutput( textOutput);
    }
    
    // Restart timer
    isPaused = false;      
    
}
function readMessage(){
    // returns message text ( which consists of a title row, OPTIONALLY followed by an empty line and a long multi-line message)
    try{
        let message = document.getElementById('message').value;
        return message;
    }catch(err){
        console.log(err);
        textOutput.value = '';
        return textOutput;
    }
    
}

function setStoreButtonEnableStatus( enableStatus) {
    document.getElementById('store-button').disabled = !enableStatus;
}
function historyMessage(history, historyNumber ){
            
    // Test : get branches for current commit  (TODO : If useful -- maybe incorporate.  Now a bit cluttered display)
    var historyBranchesAtPoint = ""; // Do not comment out this row !
    //try{              
        //await simpleGit(state.repos[state.repoNumber].localFolder).branch(['--contains', history[historyNumber + 1].hash], onHistoryBranches );
        //function onHistoryBranches(err, result){console.log(result);console.log(err); historyBranchesAtPoint = result.all;} 
        //historyBranchesAtPoint = ' [ ' + historyBranchesAtPoint + ' ]'; 
            
    //}catch(err){        
        //console.log(err);
        //console.log(historyBranchesAtPoint )       
    //}
    
    
    
    let historyHash = history[historyNumber].hash; // Store hash
    
    // Reformated date ( 2020-07-01T09:15:21+02:00  )  =>  09:15 (2020-07-01)
    let historyString = ( history[historyNumber].date).substring( 11,11+5) 
    + ' (' + ( history[historyNumber].date).substring( 0,10) + ')';
    
    // Branches on this commit
    historyString += historyBranchesAtPoint;

    // Message
    historyString += os.EOL 
    + os.EOL 
    + history[historyNumber].message
    + os.EOL 
    + os.EOL 
    + history[historyNumber].body;
    
    return historyString
}


// Output row (below message)
function writeOutputRow( htmltext){
    document.getElementById("output_row").style.visibility = 'visible';
    document.getElementById("output_text").innerHTML = htmltext;
}
function clearOutputRow( ){
    document.getElementById("output_row").style.visibility = 'collapsed';
    document.getElementById("output_text").innerHTML = '';
}


// Statusbar
function updateStatusBar( text){
    newmessage = document.getElementById('bottom-titlebar-text').innerHTML + text;
    document.getElementById('bottom-titlebar-text').innerHTML = newmessage;
    console.log('updateStatusBar = ' + newmessage);
}
function setStatusBar( text){
    if (devTools){
        if ( document.getElementById('bottom-titlebar-text').innerHTML !== text){
            document.getElementById('bottom-titlebar-text').innerHTML = text + '   (' + getMode() + ')'; // Show app's mode when in devMode
        }
    }else {
        // Update only if changed (no need to redraw)
        if ( document.getElementById('bottom-titlebar-text').innerHTML !== text){
            document.getElementById('bottom-titlebar-text').innerHTML = text;
        }
        
        // Pinned commit
        if (localState.pinnedCommit === ''){
            let hashText = '';
            if ( getMode() === 'HISTORY'){
                hashText = '< ' + localState.historyHash.substring(0,6) + ' >';
            }
            if ( document.getElementById('bottom-titlebar-pinned-text').innerHTML !== hashText){
                 document.getElementById('bottom-titlebar-pinned-text').innerHTML = hashText;
            }
        }else{
            let pinnedText = '< <u>compared to ' + localState.pinnedCommit.substring(0,6) + '</u> >';
            if ( document.getElementById('bottom-titlebar-pinned-text').innerHTML !== pinnedText){
                 document.getElementById('bottom-titlebar-pinned-text').innerHTML = pinnedText;
            }
        }
    }
}
function fileStatusString( status_data){

    
    let historyStatus = '&nbsp;&nbsp;  (' 
        + ( localState.historyNumber + 1 )  
        + ' of ' 
        + localState.historyLength 
        + ')';
 
    if ( isNaN(localState.historyNumber) ){
        historyStatus = '<B>&nbsp;&nbsp;  (off branch)</B>';
    }
       
    if (localState.mode == 'HISTORY'){
        // Work on hash from current history pointer
        
        return 'Modified = ' 
            + status_data.modified.length 
            + ' |  New = ' + ( status_data.added.length )
            + ' |  Deleted = ' + status_data.deleted.length
            + ' ' + historyStatus;
        
    }else{
        // Normal operation, work on git status from HEAD
        try{
            if (status_data.conflicted.length > 0){
                return 'Conflicts = ' + status_data.conflicted.length + ' (click here to resolve)';
                
            }else{
                return 'Modified = ' 
                + status_data.modified.length 
                + ' |  New = ' + ( status_data.not_added.length + status_data.created.length )
                + ' |  Deleted = ' + status_data.deleted.length;

            }
        }catch(err){
            
        }
    }
};
function drawPinImage(isPinned){


        // Store pinned history number and branch
        localState.pinnedHistoryNumber = localState.historyNumber;
        localState.pinnedBranch = document.getElementById('top-titlebar-branch-text').innerText;
        localState.pinnedBranchNumber = localState.branchNumber;
        
        // Store find settings
        localState.pinned_findTextInput = document.getElementById('findTextInput').value;
        localState.pinned_findFileInput = document.getElementById('findFileInput').value;
        localState.pinned_findDateInputAfter = document.getElementById('findDateInputAfter').value;
        localState.pinned_findDateInputBefore = document.getElementById('findDateInputBefore').value;
        localState.pinned_findCode = document.getElementById("message_code_switch").checked;

        
        // Set or unset
        if ( isPinned && ( getMode() === 'HISTORY' ) ){
            // Do not allow to pin if outside history mode
            localState.pinnedCommit = localState.historyHash;
            updateImageUrl('top-titlebar-pinned-icon', 'images/pinned_enabled_hover.png');
        }
        if (!isPinned){
            localState.pinnedCommit = '';
            updateImageUrl('top-titlebar-pinned-icon', 'images/pinned_disabled_hover.png');
        }
    
}


// Settings
function saveSettings(){
    
    // Update current window position
        win = gui.Window.get();
        state.position.x = win.x;
        state.position.y = win.y;
        state.position.width = win.width;
        state.position.height = win.height;  
    
    // Save settings
    let jsonString = JSON.stringify(state, null, 2);
    fs.writeFileSync(settingsFile, jsonString);
}
function loadSettings(settingsFile){
    // 1) Try to read file into state_in
    // 2) If fails, set state_in empty
    // Use internal function "setting" to :
    // 3) If some struct keys are missing in state_in, create them
    // 4) Build a new state struct -- setting default value for each undefined parameter (otherwise, keep parameter value from state_in)
    

    try{
        // 1) Read json
        let jsonString = fs.readFileSync(settingsFile);
        state_in = JSON.parse(jsonString);
        
        console.log('state -- read from json file');
        console.log(state_in);


    }catch(err){
        console.log('Error loading settings -- setting defaults');
        // 2) Defaults
        state_in = {};            
    }
    
    //
    // Set from state_in, or default value if parameter missing
    //
    
        // Internal function (returns defaultValue if input undefined)
        function setting( input, defaultValue){
            if (input == undefined){
                console.log(defaultValue);
                return defaultValue
            }
            console.log(input);
            return input;
        }
        
        // 3) Make sure multiple struct levels exist in state_in
                            
            state_in.tools = setting( state_in.tools, {} ); 
            state_in.settingsWindow = setting( state_in.settingsWindow, {} ); 
            state_in.settingsWindow.unfolded = setting( state_in.settingsWindow.unfolded, {} ); 
            state_in.notesWindow = setting( state_in.notesWindow, {} ); 
            state_in.pragmaMerge = setting( state_in.pragmaMerge, {} ); 
            state_in.graph = setting( state_in.graph, {} ); 
    
        // 4) Build new state (with keys in the order I want them;  making json-file easier for humans, if always same ordr)
            state = {};
        
        // Repos (default is empty)
            console.log('- setting repos');
            state.repoNumber = setting( state_in.repoNumber, -1);
            state.repos = setting( state_in.repos, [] );
        
        // Visual
            console.log('- setting visual settings');
            state.darkmode = setting( state_in.darkmode, 'system');
            state.alwaysOnTop = setting( state_in.alwaysOnTop, true);
            state.onAllWorkspaces = setting( state_in.onAllWorkspaces, true);
            
            state.zoom = setting( state_in.zoom, '1.0');
            state.zoomMain = setting( state_in.zoomMain, '1.0');
            
        
        // Git
            console.log('- setting git settings');
            state.forceCommitBeforeBranchChange = setting( state_in.forceCommitBeforeBranchChange, true);
            state.autoPushToRemote = setting( state_in.autoPushToRemote, true);
            state.NoFF_merge = setting( state_in.NoFF_merge, true);
            state.FirstParent = setting( state_in.FirstParent, true);
            state.StashPop = setting( state_in.StashPop, true);
            
            
            
        // External tools (three levels -- state.tools.difftool )
            console.log('- setting external tools ');

            state.tools = setting( state_in.tools, {} ); 
            state.tools.difftool = setting( state_in.tools.difftool, "");
            state.tools.mergetool = setting( state_in.tools.mergetool, "");
            state.tools.addedPath = setting( state_in.tools.addedPath, "");
            
            console.log('State after amending non-existing with defaults ');
            console.log(state);
        
        // Position
            state.position = setting( state_in.position, {} ); 
        
        // Settings window folding  (four levels -- state.settingsWindow.unfolded.repoSettings )
            state.settingsWindow = setting( state_in.settingsWindow, {} );
            state.settingsWindow.selectedTab = setting( state_in.settingsWindow.selectedTab, [] );
            
            // Remove historical settings (used when folding instead of tabs)
            delete state.settingsWindow.unfolded;
        
        // Notes window (this setting is updated when closing notes window)
            state.notesWindow = setting( state_in.notesWindow, {} );
            state.notesWindow.editMode = setting( state_in.notesWindow.editMode, "wysiwyg");
            
        // Diff viewer mode
            state.pragmaMerge = setting( state_in.pragmaMerge, {} );
            state.pragmaMerge.hide_unchanged = setting( state_in.pragmaMerge.hide_unchanged, false );
            state.pragmaMerge.align = setting( state_in.pragmaMerge.align, false );
            
        // Graph window
            state.graph = setting( state_in.graph, {} );
            state.graph.showdate = setting( state_in.graph.showdate, false );
            state.graph.showall = setting( state_in.graph.showall, false );
            state.graph.showHiddenBranches = setting( state_in.graph.showHiddenBranches, true );
            state.graph.swimlanes  = setting( state_in.graph.swimlanes, false );
            state.graph.debug  = setting( state_in.graph.debug, false );  // Note, set by editing settings.json
            

    //
    // Post-process state
    //

    // Sanity check on repoNumber
    if ( state.repoNumber >= state.repos.length ){
        state.repoNumber = 0;
    }        
    
    // Sanity check on repoNumber
    if ( state.repos.length == 0){
        state.repoNumber = -1;
    }

        
    // Clean duplicate in state.repos based on name "localFolder"
    state.repos = util.cleanDuplicates( state.repos, 'localFolder' );
    console.log('State after cleaning duplicates');
    console.log(state);
    
    if ( state.repoNumber > state.repos.length ){
        state.repoNumber = 0; // Safe, because comparison  (-1 > state.repos.length)  is false
    }
    
    
    // Scale minimum window size to zoom level
    win = gui.Window.get();
        
    let manifest = require('./package.json');
    let min_width =  Math.round( manifest.window.min_width * state.zoomMain );
    let min_height = Math.round( manifest.window.min_height * state.zoomMain);
    win.setMinimumSize( min_width, min_height);

    // Position window
    try{
        // Validate position on screen
        if ( (state.position.x + state.position.width) > screen.width ) {
            state.position.x = screen.availLeft;
        }
        
        if ( (state.position.y + state.position.height) > screen.height ){
            state.position.y = screen.availTop;
        }
        
        // Position and size from saved setting 
        win.moveTo( state.position.x, state.position.y);
        win.resizeTo( state.position.width, state.position.height );
 
      
    }catch(err){
        console.log('Error setting window position and size');
        console.log(err);
    }


    // Update using same functions as when leaving settings window
    updateWithNewSettings();
    

    cacheBranchList();
    
    console.log('END LOAD SETTINGS');
    console.log(localState);
    console.log(state);
    
    return state;
}
function updateWithNewSettings(){
    //Called when left settings window
    //
    // NOTE : To implement a new setting that affects the gui, 
    // add code to these places :
    // - app.js/updateWithNewSettings (this function)  -- applies directly after settings window is left
    // - app.js/loadSettings                           -- applies when starting app.js
    // - settings.js/injectIntoSettingsJs              -- correctly sets the parameter in the settings.html form
    // - settings.html                                 -- where the form element for the setting is shown
    
    
    localState.dark = state.darkmode;
    
    win.setAlwaysOnTop( state.alwaysOnTop );
    
    // For systems that have multiple workspaces (virtual screens)
    if ( win.canSetVisibleOnAllWorkspaces() ){
        win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
    }
    
    // Update path
    setPath( state.tools.addedPath);

    
    // Blank external diff -> use built in pragma-merge
    if ( state.tools.difftool.trim().length == 0 ){
        state.tools.difftool = "pragma-git";
    }      
    
    // Blank external merge -> use built in pragma-merge
    if ( state.tools.mergetool.trim().length == 0 ){
        state.tools.mergetool = "pragma-git";
    }   

    // Set dark mode
    switch (state.darkmode) {
      case 'system': {
        localState.dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        break;
      }
      case 'light': {
        localState.dark = false;
        break;
      }
      case 'dark': {
        localState.dark = true;
        break;
      }
    }
    

}


// Dev test
function dev_show_all_icons(){
    isPaused = true;
    document.getElementById('bottom-titlebar-stash-icon').style.visibility = 'visible'
    document.getElementById('bottom-titlebar-stash_pop-icon').style.visibility = 'visible'
    document.getElementById('top-titlebar-branch-icon').style.visibility = 'visible'
    document.getElementById('top-titlebar-tag-icon').style.visibility = 'visible'
    document.getElementById('top-titlebar-merge-icon').style.visibility = 'visible'
    document.getElementById('top-titlebar-push-icon').style.visibility = 'visible'
    document.getElementById('top-titlebar-pull-icon').style.visibility = 'visible'
    document.getElementById('top-titlebar-pinned-icon').style.visibility = 'visible' 
    document.getElementById('bottom-titlebar-pinned-text').style.visibility = 'visible'
    
 
}

// -------------
// WINDOW EVENTS
// -------------
window.onfocus = function() { 
  console.log("focus");
  focusTitlebars(true);
};
window.onblur = function() { 
  console.log("blur");
 
  // Do not blur if always on top
  if ( state.alwaysOnTop === false){
    focusTitlebars(false);  
  }
};
window.onresize = function() {
  //win.reload();
  updateContentStyle();
};
window.onload = async function() {
  var win = nw.Window.get();
  main_win = win;

  
  console.log('PATH 1 = ' + process.env.PATH);
  defaultPath = process.env.PATH;


  updateContentStyle(); 
  updateContentStyle(); 
  
  focusTitlebars(true);
  win.setAlwaysOnTop(true);
  
  
  if (devTools == true){
      win.showDevTools();  // WARNING : causes redraw issues on startup
  }
  
  _setMode('UNKNOWN');
  _update();
  
  // Throws an alert dialog if git missing (use setTimeout to allow drawing of gui to continue)
  setTimeout(gitIsInstalled, 2000);
  
  win.setAlwaysOnTop( state.alwaysOnTop );
  
  initializeWindowMenu();
  
  // Write signal file that pragma-git is running
  fs.writeFileSync(MAINSIGNALFILE,'running','utf8'); // Signal file that pragma-git is up

  win.show();
  
  // Set global
    let releaseData = await getLatestRelease( RELEASE_URL );
    global.LATEST_RELEASE = await releaseData.tag_name;
    await gitStashMap( state.repos[state.repoNumber].localFolder );

};
async function closeWindow(a){
    console.log('Close argument = ' + a);  
    
    // Commit settings
    try{
        await commitSettingsDir();    
    }catch (err){
        
    }
    
    // Remove signaling file
    util.rm(MAINSIGNALFILE);

    
    // Fold search fields
    if (document.getElementById('output_row').style.visibility == 'visible' ){
        _callback('clicked-find');
    }
    
    // Store window position
    state.position = {}; // New level
    state.position.x = gui.Window.get().x;
    state.position.y  = gui.Window.get().y;
    state.position.height = gui.Window.get().height;
    state.position.width = gui.Window.get().width;
    
    saveSettings();
    gui.App.closeAllWindows();
      
    // Hide the window to give user the feeling of closing immediately
    this.hide();



    // If the new window is still open then close it.
    if (win !== null) {
      win.close(true)
    }

    // After closing the new window, close the main window.
    this.close(true);
} 


