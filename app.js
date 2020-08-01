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

/* TODO
 * ----
 * 
 * Open questions
 * 
 * - Resolve conflicts -- add all options in https://git-scm.com/docs/git-status.  
 * 
 *   create_merge_conflict.command  should be extended with all these
 * 
 *   X shows the status of the index, and Y shows the status of the work tree
 *       D           D    unmerged, both deleted
 *       A           U    unmerged, added by us
 *       U           D    unmerged, deleted by them
 *       U           A    unmerged, added by them
 *       D           U    unmerged, deleted by us
 *       A           A    unmerged, both added
 *       U           U    unmerged, both modified
 *    
 * 
 * - tag  pop-up menu with options :  new tag, find tag, remove tag, list tags
 * 
 * - history : list window (can this be same as tag list window ?)
 * 
 * - help setting up remote ssh non-bare repository (https://stackoverflow.com/questions/1764380/how-to-push-to-a-non-bare-git-repository) 
 *   and clone from local to that repo
 * 
 * 
 * - Ask if I want to remove a temp-branch which is merged ?  Would be helpful
 * 
 * - Hide-branch feature (settings checkbox column, and then put them in state.repos.hidden.  Would require updating of branchList commands in app.js
 *
 * - Single file history
 * 
 * - Idea : Page with problem-solver
 *   - git reflog
 *   -
 * 
 * - add scribble area (note) for each branch and repo
 * 
 * - add script-button row (configurable from settings for each repository)
 * 
 * - How to setup remote repository ?  (see : https://medium.com/@erbalvindersingh/pushing-a-git-repo-online-to-github-via-nodejs-and-simplegit-package-17893ecebddd , or try my version by implementing raw REST calls)
 * 
 * - How to initialize git-flow ?
 * 
 * 
 *  Menu Windows
 *   var mb = new gui.Menu({type: 'menubar'});
 *   mb.createMacBuiltin('My App');
 *   gui.Window.get().menu = mb;
 *   console.log( mb.items[2].submenu.items[0].label ) // Menu/Fönster
 * 
 * Docs : https://www.npmjs.com/package/simple-git
 *        https://github.com/steveukx/git-js#readme  (nicely formmatted API)
*/
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
 * - state                   - contains data that are also saved in settings file ($HOME/.Pragma-git/repo.json)
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
/* BUILD
 
 Using nw-builder (https://www.npmjs.com/package/nw-builder)
 
 * MacOS :
 ~/Documents/Projects/Pragma-git/node_modules/.bin/nwbuild -p osx64 -o ~/Pragma-git  ~/Documents/Projects/Pragma-git/Pragma-git
 
 * All Platforms :
~/Documents/Projects/Pragma-git/node_modules/.bin/nwbuild \
  --platforms win32,win64,osx64,linux32,linux64 \
  --buildDir ~/Pragma-git \
  --name Pragma-git \
  ~/Documents/Projects/Pragma-git/Pragma-git

 */

/* New repo
 *  
 * Create github repo
 * Drop files and initialize (TODO: initialize and do first commmit)
 * Make first commit
 * git remote add origin https://github.com/JanAxelssonTest/test3.git  // git push -u origin master denied
 * git remote set-url origin https://JanAxelssonTest:jarkuC-9ryvra-migtyb@github.com/JanAxelssonTest/test3.git 
 * git push -u origin master
 */ 

// Define DEBUG features
var devTools = false;
var isPaused = false; // Stop timer. In console, type :  isPaused = true


// -----
// INIT
// -----

    // Import Modules
        var gui = require("nw.gui");    
        var os = require('os');
        var fs = require('fs');
        const simpleGit = require('simple-git');  // npm install simple-git
        
        var util = require('./util_module.js'); // Pragma-git common functions
     
    
    // Constants 
        const WAIT_TIME = 5000; // Time to wait for brief messages being shown (for instance in message field)
        global.globalString = "This can be accessed anywhere!";
        const pathsep = require('path').sep;  // Os-dependent path separator
        const tmpdir = os.tmpdir();
        
    // Handles to windows
        var settings_win;
 
      
    // Files & folders
        let settingsDir = os.homedir() + pathsep + '.Pragma-git'; mkdir( settingsDir);
        var settingsFile = settingsDir + pathsep + 'repo.json';    
        
    
    // State variables
        var localState = [];
        localState.historyNumber = -1;
        localState.branchNumber = 0;  
        localState.mode = 'UNKNOWN'; // _setMode finds the correct mode for you
        localState.unstaged = [];    // List of files explicitly put to not staged (default is that all changed files will be staged)
        
        localState.settings = false;        // True when settings window is open
        localState.conflictsWindow = false; // True when conflicts window is open
        localState.fileListWindow = false; // True when conflicts window is open
        localState.aboutWindow = false; // True when conflicts window is open
        
        
    // Expose these to all windows 
        global.state = loadSettings(settingsFile); // json settings
        global.localState = localState;   

    // Collect settings
        var repoSettings = {}; 
   
        
    // Initiate asynchronous loops
        const seconds = 1000; // milliseconds per second
        var timer = _loopTimer('update-loop', 1 * seconds);     // GUI update loop
        var fetchtimer = _loopTimer('fetch-loop', 60 * seconds); // git-fetch loop


// ---------
// FUNCTIONS
// ---------

// Main functions
async function _callback( name, event){
    console.log('_callback = ' + name);
    console.log(event);
    switch(name) {
      case 'clicked-store-button': {
        storeButtonClicked();
        break;
      }
      case 'clicked-minimize-button': {
        win.minimize();
        break;
      }
      case 'message_key_up': {
        messageKeyUpEvent();
        break;
      }
      case 'clicked-up-arrow': {
        upArrowClicked();
        break;
      }
      case 'clicked-down-arrow': {
        downArrowClicked();
        break;
      }
      case 'clicked-repo': {
        repoClicked();
        break;
      }
      case 'clicked-branch': {
        branchClicked(true);
        break;
      }
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

        _setMode('UNKNOWN');
        

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
            //await waitTime( 1000);  

            waitTime( WAIT_TIME);  

            
        }catch(err){       
            displayAlert('Failed creating tag', err); 
            console.log('Failed creating tag ');
            console.log(err);
        } 
        break;

      }
      case 'clicked-folder': {
        folderClicked();
        break;
      }
      case 'clicked-stash-button': {
          
    // Stash -- ask to overwrite if stash exists
        try{
            let stash_status;
            await simpleGit( state.repos[state.repoNumber].localFolder)
                .stash(['list'], onStash);
            function onStash(err, result ){  stash_status = result }
            
            
            if (stash_status.length > 0) {
                // Ask permission to overwrite stash
                //document.getElementById('doYouWantToOverWriteStashDialog').showModal();
                document.getElementById('stashOverwriteDialog').showModal();
            }else{
                // No stash exists, OK to stash
                gitStash();
            }
        }catch(err){  
            console.log(err);
        }
        break;
      }     
      case 'stashOverwriteDialog': {
         {
        console.log('stashOverwriteDialog -- returned ' + event);
        
        switch (event) {
            case  'Replace' : {
                gitStash();
                break;
            }    
            case  'Cancel' : {
                break;
            }          
            
        }
        break; 
      } // end case 'stashOverwriteDialog' 
          
          
          
        gitStash();
        break;   
      }     
      case 'clicked-stash_pop-button': {
        gitStashPop();
        break; 
      }      
      case 'clicked-push-button': {
        gitPush();
        break;
      }
      case 'clicked-pull-button': {
        gitPull();
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
        gitMerge( event.currentBranch, event.selectedBranch); 
        break;
      }
      case 'clicked-settings': {
        showSettings();
        break;
      }
      case 'clicked-about': {
        showAbout();
        break;
      }
      case 'clicked-close-button': {
        closeWindow();
        break;
      }
      case 'clicked-status-text' : {
        if (localState.fileListWindow == true) {
                return
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
      case 'file-dropped': {
        dropFile( event); 
        break;
      }
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
      case 'detachedHeadDialog': {
        console.log('detachedHeadDialog -- returned ' + event);
        
        switch (event) {
            case  'Delete' : {
                // Move out of "detached Head" (losing track of it)
                branchClicked(false);
                break;
            }    
            case  'Cancel' : {
                break;
            }          
            
        }
        break; 
      } // end case 'detachedHeadDialog'  
      default: {
        // code block
      }  
    } // End switch(name)

    // ---------------
    // LOCAL FUNCTIONS
    // ---------------

    // title-bar
    function repoClicked(){
        // Cycle through stored repos
        state.repoNumber = state.repoNumber + 1;
        var numberOfRepos = state.repos.length;
        if (state.repoNumber >= numberOfRepos){
            state.repoNumber = 0;
        }
        
        // Update remote info immediately
        gitFetch();  
        
        _setMode('UNKNOWN');
    }
    async function branchClicked( detectDetachedBranch ){
        // Input detectDetachedBranch : true if I want to detect. False if I want to override detection
        
        // Determine status of local repository
        var status_data;  
        try{
            status_data = await gitStatus();
        }catch(err){
            console.log('Error in unComittedFiles,  calling  _mainLoop()');
            console.log(err);
        }
        
        //
        // If Detached Head (dialog if needed, then bail out)
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
                    // No commited change in detached head -- don't throw dialog
                    console.log('No commits in checked-out detached HEAD : ' + currentBranchObject.name);
                    console.log('Continue to change branch');
                }else{
                    console.log('Commits on detached HEAD.  Show dialog');
                    document.getElementById('detachedHeadDialog').showModal(); // Show modal dialog : [Temp Branch] [Delete] [Cancel]
                    return
                }
   
            }catch(err){        
                console.log(err);
                return
            }

        }
        
        
     
        // Determine if no files to commit
        var uncommitedFiles = status_data.changedFiles;

    
        // Checkout branch  /  Warn about uncommited (if that setting is enabled)
        if ( uncommitedFiles && state.forceCommitBeforeBranchChange ){
            // Let user know that they need to commit before changing branch
            await writeTimedMessage( 'Before changing branch :' + os.EOL + 'Add description and Store ...', true, WAIT_TIME)
            
        }else{
                
            // Determine local branches
            var branchList;
            try{
                branchList = await gitBranchList();
            }catch(err){        
                console.log('Error determining local branches, in branchClicked()');
                console.log(err);
            }
            
            // Cycle through local branches
            localState.branchNumber = localState.branchNumber + 1;
            var numberOfBranches = branchList.length;
            if (localState.branchNumber >= numberOfBranches){
                localState.branchNumber = 0;
            }
            var branchName = branchList[localState.branchNumber];
    
        
            // Checkout local branch
            try{
                await simpleGit(state.repos[state.repoNumber].localFolder).checkout( branchName, onCheckout);
                function onCheckout(err, result){console.log(result)} 

            }catch(err){        
                console.log('Error checking out local branch, in branchClicked(). Trying to checkout of branch = ' + branchName);
                console.log(err);
            }  
        }
    
        console.log(branchList);
     
        _setMode('UNKNOWN');
       //await _update()
        
        // Reset some variables
        localState.historyNumber = -1;
    }
    function showAbout(){    
        console.log('About button pressed');
        
                
        if ( localState.aboutWindow == true ){
            return
        }
        
        // Open new window -- and create closed-callback
        let about_win = gui.Window.open(
            'about.html#/new_page', 
            {   id: 'aboutWindowId',
                position: 'center',
                width: 600,
                height: 700   
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
                        }
                    }
                )
            }
        );

        // Show that window is open
        localState.aboutWindow = true;
        
    }
    function closeWindow(a){
        console.log('Close argument = ' + a);  
        
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
    async function mergeClicked(){
              
        // Create an empty context menu
        var menu = new gui.Menu();
        
        let branchList = await gitBranchList();
        let currentBranch = " ";
        
        try{
            let status_data = await gitStatus();
            currentBranch = status_data.current;
            console.log(currentBranch);
        }catch(err){
            console.log('Failed reading current branch');
        }
  
        let menuItems = branchList;
        
        // Add context menu title-row
        menu.append(new gui.MenuItem({ label: 'Merge (selected one) ... ', enabled : false }));
        menu.append(new gui.MenuItem({ type: 'separator' }));
                
        // Add names of all branches
        for (var i = 0; i < menuItems.length; ++i) {
            if (currentBranch != menuItems[i]){
                let myEvent = [];
                myEvent.selectedBranch = menuItems[i];
                myEvent.currentBranch = currentBranch;
                menu.append(
                    new gui.MenuItem(
                        { 
                            label: menuItems[i], 
                            click: () => { _callback('clickedMergeContextualMenu',myEvent);} 
                        } 
                    )
                );
                console.log(menuItems[i]);
            }else{
                console.log('Skipped current branch = ' + menuItems[i]);
            }

        }
 
        
        menu.append(new gui.MenuItem({ type: 'separator' }));
        menu.append(new gui.MenuItem({ label: '... into "' + currentBranch +'"', enabled : false })); 
        
        // Add Cancel line
        menu.append(new gui.MenuItem({ type: 'separator' }));
        //menu.append(new gui.MenuItem({ label: 'CANCEL merge' }));
        menu.append(
            new gui.MenuItem(
                { 
                    label: 'CANCEL merge', 
                    click: () => { console.log('Contextual menu -- clicked CANCEL');} 
                } 
            )
        );
        
        

        // Popup as context menu
        let pos = document.getElementById("top-titlebar-merge-icon").getBoundingClientRect();
        await menu.popup(pos.left, pos.top + 24);
                

    }
 
    // main window
    async function storeButtonClicked() { 
        
        // Could be called for Store, or History Checkout 
        
        if ( getMode() == 'HISTORY' ){
            // History
            
            try{
                
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
            gitAddCommitAndPush( readMessage());
        }
        
}  
    async function downArrowClicked(){
        
        console.log('down arrow clicked');
        
        
        
        localState.historyNumber = localState.historyNumber + 1;
        
        // Get log
        var history;
        try{              
            await simpleGit(state.repos[state.repoNumber].localFolder).log( ['--first-parent'],onHistory);
            function onHistory(err, result){console.log(result);console.log(err); history = result.all;} 
                
        }catch(err){        
            console.log(err);
        }
        
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
                console.log('downArrowClicked - setting localState.historyNumber = 0');
                localState.historyNumber = numberOfHistorySteps -1; // Set to last
            }
            
            
            localState.historyHash = history[localState.historyNumber].hash; // Store hash
            
            // Reformated date ( 2020-07-01T09:15:21+02:00  )  =>  09:15 (2020-07-01)
            localState.historyString = ( history[localState.historyNumber].date).substring( 11,11+5) 
            + ' (' + ( history[localState.historyNumber].date).substring( 0,10) + ')';
            
            // Branches on this commit
            localState.historyString += historyBranchesAtPoint;

            // Message
            localState.historyString += os.EOL 
            + os.EOL 
            + history[localState.historyNumber].message
            + os.EOL 
            + os.EOL 
            + history[localState.historyNumber].body;
            
            // Display
            //localState.mode = 'HISTORY';
            _setMode('HISTORY');
            writeMessage( localState.historyString, false);
            
            status_data = await gitShow(localState.historyHash);
            setStatusBar( fileStatusString( status_data));

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
        var history;
        try{
            await simpleGit(state.repos[state.repoNumber].localFolder).log( ['--first-parent'], onHistory);
            function onHistory(err, result){console.log(result); history = result.all;} 
        }catch(err){        
            console.log(err);
        }   
    
        // Cycle through history
        var numberOfHistorySteps = history.length;
        localState.historyNumber = localState.historyNumber - 1;
        
        var numberOfBranches = state.repos.length;
        if (localState.historyNumber < 0){
            // Leave history browsing
            localState.historyNumber = -1;
            localState.historyString = "";
            localState.historyHash = "";
            writeMessage( '', false);  // empty message -- needed off for setMode to understand UNKNOWN mode
            _setMode('UNKNOWN');
            await _update()
        }else{
            // Show history
            //_setMode('HISTORY');
            
            localState.historyHash = history[localState.historyNumber].hash; // Store hash
            
            // Reformat date ( 2020-07-01T09:15:21+02:00  )  =>  09:15 (2020-07-01)
            localState.historyString = ( history[localState.historyNumber].date).substring( 11,11+5) 
            + ' (' + ( history[localState.historyNumber].date).substring( 0,10) + ')'
            + os.EOL 
            + os.EOL 
            + history[localState.historyNumber].message
            + os.EOL 
            + os.EOL 
            + history[localState.historyNumber].body;  
            
            // Display            
            localState.mode = 'HISTORY';
            writeMessage( localState.historyString, false);
            
            status_data = await gitShow(localState.historyHash);
            setStatusBar( fileStatusString( status_data));    
                  
            // Store hash
            
            localState.historyHash = history[localState.historyNumber].hash;
        }
    }
    function messageKeyUpEvent() { 
        // Enable if message text 
        //var message = readMessage();
        //setStoreButtonEnableStatus( (message.length > 0 ));
        
        // Bail out if read-only
        if ( document.getElementById("message").readOnly == true ){
            return
        }
        
        // It should be safe to assume that CHANGED_FILES of some sort -- otherwise
        if (readMessage().length > 0 ){
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
            folder = require('path').dirname(file); // Correct, because file was dropped
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

    // status-bar
    function folderClicked(){
        console.log('Folder clicked');
        gui.Shell.showItemInFolder(state.repos[state.repoNumber].localFolder);
    }
    function showSettings() {    
        
        console.log('Settings button pressed');
        
        if ( getMode() == 'SETTINGS' ){
            return
        }
        
        _setMode('SETTINGS');
        
        settings_win = gui.Window.open('settings.html#/new_page' ,
            {
                id: 'settingsWindowId',
                position: 'center',
                width: 600,
                height: 700,
                title: "Settings"
            }
            ); 
        console.log(settings_win);
        localState.settings = true;  // Signals that Settings window is open -- set to false when window closes
     return   
    };

    function resolveConflicts( folder){
               
        if ( localState.conflictsWindow == true ){
            return
        }
        
        resolve_win = gui.Window.open('resolveConflicts.html#/new_page' ,
            {
                id: 'resolveConflictsWindowId',
                position: 'center',
                width: 600,
                height: 700,
                title: "Resolve Conflicts"
            }
            ); 
        console.log(resolve_win);
        localState.conflictsWindow = true;  // Signals that Conflicts window is open -- set to false when window closes
    };
    
    function listChanged(){
        resolve_win = gui.Window.open('listChanged.html#/new_page' ,
            {
                id: 'listChangedId',
                position: 'center',
                width: 600,
                height: 700,
                title: "List Changed Files"
            }
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
    let fullFolderPath = state.repos[ state.repoNumber].localFolder;
    
    // If not DEFAULT  --  since DEFAULT is special case (when nothing is defined)
    if ( modeName != 'DEFAULT'){  // git commands won't work if no repo
        try{
            status_data = await gitStatus();
            let result = await gitLocalFolder();
            folder = result.folderName;
            currentBranch = status_data.current; 
        }catch(err){
            console.log(err);

        }

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
        try{
            let stash_status;
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
                setTitleBar( 'top-titlebar-branch-text', '  (<u>' + currentBranch + '</u>)' );
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
                    setTitleBar( 'top-titlebar-branch-text', '  (<u>' + currentBranch + '</u>)' );
                    setStatusBar( fileStatusString( status_data));            
                }catch(err){
                    console.log('update --  case "CHANGED_FILES" caught error');
                    _setMode('UNKNOWN');
                }
                setTitleBar( 'top-titlebar-repo-text', folder );
                setTitleBar( 'top-titlebar-branch-text', '  (<u>' + currentBranch + '</u>)' );
                setStatusBar( fileStatusString( status_data));            
                // If not correct mode, fix :
                if (!status_data.changedFiles){
                    _setMode('UNKNOWN');
                }
                break;
            }
                
            case 'CHANGED_FILES_TEXT_ENTERED': {  
                setTitleBar( 'top-titlebar-repo-text', folder );
                setTitleBar( 'top-titlebar-branch-text', '  (<u>' + currentBranch + '</u>)' );
                setStatusBar( fileStatusString( status_data));
                // If not correct mode, fix :
                if (!status_data.changedFiles){
                    _setMode('UNKNOWN');
                }
                break;
            }
                
            case 'HISTORY': {  

                let status;
                let hash = localState.historyHash;
            
                try{
                    status_data = await gitShow(hash);
                }catch(err){
                    console.log('fileStatus -- caught error');
                    console.log(err);
                }
                console.log(status);
            
            
                writeMessage( localState.historyString, false);
            
            
                setTitleBar( 'top-titlebar-repo-text', folder );
                setTitleBar( 'top-titlebar-branch-text', '  (<u>' + currentBranch + '</u>)' );
                setStatusBar( fileStatusString( status_data));
                
                break;
            }
                
            case 'SETTINGS': {  
                setTitleBar( 'top-titlebar-repo-text', folder );
                setTitleBar( 'top-titlebar-branch-text', '  (<u>' + currentBranch + '</u>)' );
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
                setTitleBar( 'top-titlebar-branch-text', '  (<u>' + currentBranch + '</u>)' ); 
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

    //
    // Local functions
    //
    function updateWithNewSettings(){
        //Called when left settings window
        //
        // NOTE : To implement a new setting that affects the gui, 
        // add code to these places :
        // - app.js/updateWithNewSettings (this function)  -- applies directly after settings window is left
        // - app.js/loadSettings                           -- applies when starting app.js
        // - settings.js/injectIntoSettingsJs              -- correctly sets the parameter in the settings.html form
        // - settings.html                                 -- where the form element for the setting is shown
        
        
        win.setAlwaysOnTop( state.alwaysOnTop );
        
        // For systems that have multiple workspaces (virtual screens)
        if ( win.canSetVisibleOnAllWorkspaces() ){
            win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
        }
        saveSettings();
    }

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
                    document.getElementById('message').value = "";  // Text length is used to determine 'CHANGED_FILES_TEXT_ENTERED'
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
                    break;
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
            document.getElementById("store-button").innerHTML="Store";// Set button
            document.getElementById('store-button').disabled = true;
            document.getElementById('message').value = "";
            document.getElementById('message').placeholder = "Get started by dropping a folder onto this window ...";    
            document.getElementById("message").readOnly = true;
            
            setTitleBar( 'top-titlebar-repo-text', ''  );
            setTitleBar( 'top-titlebar-branch-text', '' );
            break;
        }
            
        case 'NO_FILES_TO_COMMIT': {
            // set by _mainLoop
            newModeName = 'NO_FILES_TO_COMMIT';
            document.getElementById('message').placeholder = '"' + HEAD_title + '"'; //+ os.EOL + "- is not changed" + os.EOL + "- nothing to Store"  ;
            if (currentMode ==  'NO_FILES_TO_COMMIT') { return};
            document.getElementById("store-button").innerHTML="Store";// Set button
            document.getElementById('store-button').disabled = true;
            document.getElementById('message').value = "";           
            document.getElementById("message").readOnly = true;
            break;
        }
            
        case 'CHANGED_FILES': {
            // set by _mainLoop
            newModeName = 'CHANGED_FILES';
            document.getElementById('message').placeholder = '"' + HEAD_title + '"' + os.EOL + "- is MODIFIED" + os.EOL + "- type description and press Store"  ;
            //if (currentMode ==  'CHANGED_FILES') { return};
            document.getElementById("store-button").innerHTML="Store";// Set button
            document.getElementById('store-button').disabled = true;
            document.getElementById('message').value = "";          
            document.getElementById("message").readOnly = false;
            break;
        }
            
        case 'CHANGED_FILES_TEXT_ENTERED': {
            // set by messageKeyUpEvent
            newModeName = 'CHANGED_FILES_TEXT_ENTERED';
            if (currentMode ==  'CHANGED_FILES_TEXT_ENTERED') { return};
            document.getElementById("store-button").innerHTML="Store";// Set button
            document.getElementById('store-button').disabled = false;
            //document.getElementById('message').value = "";  // Don't want to destory typed text
            //document.getElementById('message').placeholder = "Get started by dropping a folder onto this window";    
            document.getElementById("message").readOnly = false;
            break;
        }
            
        case 'HISTORY': {
            // set by downArrowClicked and upArrowClicked
            newModeName = 'HISTORY';
            if (currentMode ==  'HISTORY') { return};
            document.getElementById("store-button").innerHTML="Checkout";// Set button
            document.getElementById('store-button').disabled = false;
            // Text not fixed
            document.getElementById('message').value = "";
            document.getElementById('message').placeholder = "";    
            document.getElementById ("message").readOnly = true;
            break;
        }
            
        case 'SETTINGS': {
            newModeName = 'SETTINGS';
            if (currentMode ==  'SETTINGS') { return};
            document.getElementById("store-button").innerHTML="Store";// Set button
            document.getElementById('store-button').disabled = true;
            document.getElementById('message').value = "";
            document.getElementById('message').placeholder = 
                "You are in settings mode." + os.EOL + 
                "- Unfold a settings section ..." + os.EOL + 
                "- Close window when done";    
            document.getElementById("message").readOnly = true;
            break;
        }
            
        case 'CONFLICT': {
            newModeName = 'CONFLICT';
            if (currentMode ==  'CONFLICT') { return};
            document.getElementById("store-button").innerHTML="Store";// Set button
            document.getElementById('store-button').disabled = true;
            document.getElementById('message').value = "";
            document.getElementById('message').placeholder = 
                "There is a file conflict to resolve" + os.EOL + 
                "- Click the message 'Conflicts ... ' (in status-bar below) " + os.EOL + 
                "- Write a message, and press Store when done";    
            document.getElementById("message").readOnly = true;
            break;
        }
        
        default: {
            console.log('setMode - WARNING : NO MATCHING MODE WAS FOUND TO INPUT = ' + inputModeName);
        }    
    }
        
    console.log('setMode result : setMode = ' + newModeName + ' ( from current mode )= ' + currentMode + ')');
      
    // Remember mode
    localState.mode = newModeName;

    await _update()
    
    return newModeName;  // In case I want to use it with return variable
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
            isInstalled = true;
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
async function gitStatus(){
    // Determine if changed files (from git status)
    let status_data = [] ;  
    status_data.changedFiles = false;
    status_data.current = "";
    
    // Make safe for empty repos
    if (state.repos.length == 0){ return status_data}
    if (state.repoNumber > (state.repos.length -1) ){ return status_data}
    
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
        //console.log(status_data);
        status_data.current;  // Name of current branch
        
    }catch(err){
        console.log('Error in gitStatus()');
        console.log(err);
        
        // Substitute values, if status_data is unknown (because gitStatus fails with garbish out if not a repo)
        status_data = [];
        status_data.conflicted = [];
        status_data.modified = []; // zero length
        status_data.not_added = [];
        status_data.created = [];
        status_data.deleted = [];
        status_data.changedFiles = false;
        status_data.ahead = 0;
        status_data.behind = 0;

    }
 
    // return fields : 
    //      changedFiles (boolean) 
    //      modified, not_added, deleted (integers)
    //      conflicted; Array of files being in conflict (there is a conflict if length>0)
    return status_data;  
}
async function gitShow(commit){
    
    let showStatus;
    let outputStatus = []; // Will build a struct on this
    
    // TODO : questionable if needed (3 lines)
    outputStatus.added = [];
    outputStatus.deleted = [];
    outputStatus.modified = [];
    
    outputStatus.files = [];
    
    let hash = localState.historyHash;
    
    try{
        // Read status
        await simpleGit(state.repos[state.repoNumber].localFolder).show( ['--name-status','--oneline',hash], onWhatChanged);
        function onWhatChanged(err, result){ console.log(result); showStatus = result } 
        console.log('fileStatus -- hash = ' + hash);
        
        let splitLines = showStatus.split(/\r?\n/); 
        
        for (let i = 1; i < splitLines.length; i++) { 
            let line = splitLines[i];  // Example "M       listChanged.html"
            
            if (line.length > 0)  // Last line may be empty from the git show command
            {   
                // Split into type and file name  
                let type = line.substring(0,1);  // "M"
                let fileName = line.substring(1).trim(); // "listChanged.html"
                
                switch (type){

                    case "A" :
                        outputStatus.added.push(fileName);
                        break;
                    
                    case "D" :
                        outputStatus.deleted.push(fileName);
                        break;
                    
                    case "M" :
                        outputStatus.modified.push(fileName);
                        break;
                }
                outputStatus.files.push( { path : fileName, index: type , working_dir : ' '} ); // Alternative storage mimicing the files-field in git status  (useful for listChanged.js)
                
                console.log('split = ' + line);
            }
        }

        
        
        
    }catch(err){
        console.log('fileStatus -- caught error');
        console.log(err);
    }
    
    // Store in localState
    localState.history_status_data = outputStatus;
    
    return outputStatus;
    
}
async function gitBranchList(){
    let branchList;
    
    try{
        await simpleGit(state.repos[state.repoNumber].localFolder).branch(['--list'], onBranchList);
        function onBranchList(err, result ){console.log(result); branchList = result.all};
    }catch(err){        
        console.log('Error determining local branches, in branchClicked()');
        console.log(err);
    }
    return branchList
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
        console.log('Error in _mainLoop()');
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
    //await simpleGit( state.repos[state.repoNumber].localFolder )
        //.commit( message, {'--all' : null} , onCommit);
    await simpleGit( state.repos[state.repoNumber].localFolder )
        .commit( message, onCommit);        
    function onCommit(err, result) {console.log(result) };
    
    await waitTime( 1000);
    
    if (state.autoPushToRemote){
        //// Push (and create remote branch if not existing)
        //setStatusBar( 'Pushing files  (to remote ' + remoteBranch + ')');
        //await simpleGit( state.repos[state.repoNumber].localFolder )
            ////.push( remoteBranch, currentBranch, {'--set-upstream' : null}, onPush);
            //.push( 'origin', currentBranch,{'--set-upstream' : null}, onPush);
            
        //function onPush(err, result) {console.log(result) };
        
        //await waitTime( 1000);  
        await gitPush();
      
    }
      
    // Finish up
    localState.unstaged = [];
    writeMessage('',false);  // Remove this message  
    _setMode('UNKNOWN');  
    await _update()
}

async function gitCheckoutTag(tagName){
    
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
        
    }catch(err){
        console.log('Failed checking out tag = ' + tagName);
        console.log(err);
        
    }
    
}

async function gitStash(){
    // Stash
    try{
        // Drop old stashes
        if (state.onlyOneStash){   
            await simpleGit( state.repos[state.repoNumber].localFolder ).stash( ['clear'], onStashClear);
            function onStashClear(err, result) {console.log(result);console.log(err) };
        }
        
        await simpleGit( state.repos[state.repoNumber].localFolder ).stash( ['push', '--include-untracked'], onStash);
        function onStash(err, result) {console.log(result);console.log(err) };
    
    }catch(err){
        console.log('Error in gitStash()');
        console.log(err);
    }
 
    setStatusBar( 'Stashing files');
    await waitTime( 1000);      
}
async function gitStashPop(){
    // Stash pop
    try{
        await simpleGit( state.repos[state.repoNumber].localFolder ).stash( ['pop'], onStashPop);
        function onStashPop(err, result) {console.log(result);console.log(err) };
    
    }catch(err){
        // TODO : gitStashPop -- Possibility for this error : error: could not restore untracked files from stash
        // Solution https://gist.github.com/demagu/729c0a3605a4bd2e4c3d
        //
        console.log('Error in gitStashPop()');
        console.log(err);
    }
 
    setStatusBar( 'Retrieving stashed files');
    await waitTime( 1000);        
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
    

    // Push
    setStatusBar( 'Pushing files  (to remote ' + remoteBranch + ')');
    
    await simpleGit( state.repos[state.repoNumber].localFolder ).push( 'origin', currentBranch,{'--set-upstream' : null}, onPush);
    function onPush(err, result) {console.log(result) };
    
    await waitTime( 1000);  

}
async function gitFetch(){
    console.log('Running gitFetch()');
     
    var error = "";

    // Fetch
     try{
        await simpleGit( state.repos[state.repoNumber].localFolder ).fetch( onFetch);
        function onFetch(err, result) {console.log(result) };
        
    }catch(err){
        console.log('Error in gitFetch()');
        console.log(err);
        error = err;
        displayAlert('Failure fetching from remote', err); 
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
            
            await writeTimedMessage( 'Pulled files from remote' + os.EOL + error, true, WAIT_TIME);
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
    
    // Merge
    try{
        setStatusBar( 'Merging "' + selectedBranchName + '" -> "' + currentBranchName + '"');
        await simpleGit( state.repos[state.repoNumber].localFolder )
            .mergeFromTo( selectedBranchName, currentBranchName, {} , onMerge);
            
        function onMerge(err, result) {console.log(result); mergeResult = result; mergeError = err };
       
        await waitTime( 1000);  
    }catch(err){
        console.log('gitMerge failed');     
    }
  
      
    // Finish up
    writeMessage('',false);  // Remove this message  
    
    _setMode('UNKNOWN');
    await _update()
}

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
        fs.mkdirSync(dir);
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

// Title bar
function setTitleBar( id, text){
    if (text.length == 0){
        text = " ";
    }
    document.getElementById(id).innerHTML = text;
    //console.log('setTitleBar (element ' + id + ') = ' + text);
}
function updateImageUrl(image_id, new_image_url) {
  var image = document.getElementById(image_id);
  if (image)
    image.src = new_image_url;
}
function focusTitlebars(focus) {
  var bg_color = focus ? "#3a3d3d" : "#7a7c7c";
    
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
    
    // This is to make statusbar and titlebar position well
    var content = document.getElementById("content");
    if (!content)
    return;
    
    var left = 0;
    var top = 0;
    var width = window.outerWidth; 
    var height = window.outerHeight;
    
    var titlebar = document.getElementById("top-titlebar");
    if (titlebar) {
        height -= titlebar.offsetHeight + 36 + 2;
        top += titlebar.offsetHeight;
    }
    titlebar = document.getElementById("bottom-titlebar");
    
    // Adjust content width by border
    width -=   6 ; // Width in content border
    
    var contentStyle = "position: absolute; ";
    contentStyle += "left: " + left + "px; ";
    contentStyle += "top: " + top + "px; ";
    contentStyle += "width: " + width + "px; ";
    contentStyle += "height: " + height  + "px; ";
    content.setAttribute("style", contentStyle);
    
    // This is to make message textarea follow window resize
    //var message_area = document.getElementById("message");
    //var message_area_style = "height: " + (height - 28 - 8).toString() + "px; ";
    //message_area_style += "width: 100%; " ;
    //message_area_style += "resize: none; " ;
    //message_area.setAttribute("style", message_area_style);

  
}

// Message
function readMessage( ){
    try{
        return document.getElementById('message').value;
    }catch(err){
        console.log(err);
        return '';
    }
    
}
function writeMessage( message, placeholder){
    if (placeholder){
        document.getElementById('message').value = "";
        document.getElementById('message').placeholder = message;
    }else{
        document.getElementById('message').value = message;
    }
}
async function  writeTimedMessage( message, placeholder, time){
    // Give the user the time to read the message, then restore previous message
    
    // Pause timer
    isPaused = true;
    
    
    // Store old message
    var oldMessage_value = document.getElementById('message').value;
    var oldMessage_placeholder = document.getElementById('message').placeholder;
    
    // Show new message and wait
    writeMessage( message, placeholder);
    await waitTime( time).catch({});
    
    document.getElementById('message').value = oldMessage_value;
    document.getElementById('message').placeholder = oldMessage_placeholder;
    
    // Restore old message (if user hasn't written something in the wait time
    if ( document.getElementById('message').length == 0 ){
        writeMessage( oldMessage, placeholder);
    }
    
    // Restart timer
    isPaused = false;  
} 
function setStoreButtonEnableStatus( enableStatus) {
    document.getElementById('store-button').disabled = !enableStatus;
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
        document.getElementById('bottom-titlebar-text').innerHTML = text + '   (' + getMode() + ')'; // Show app's mode when in devMode
    }else {
        document.getElementById('bottom-titlebar-text').innerHTML = text;
    }
}
function fileStatusString( status_data){
    
    if (localState.mode == 'HISTORY'){
        // Work on hash from current history pointer
        
        return 'Modified = ' 
        + status_data.modified.length 
        + ' |  New = ' + ( status_data.added.length )
        + ' |  Deleted = ' + status_data.deleted.length;
        
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

// Settings
function saveSettings(){
    
    // Update current window position
        win = gui.Window.get();
        state.position.x = win.x;
        state.position.y = win.y;
        state.position.width = win.width;
        state.position.height = win.height;  
    
    // Save settings
    var jsonString = JSON.stringify(state, null, 2);
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
        jsonString = fs.readFileSync(settingsFile);
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
    
        // 4) Build new state (with keys in the order I want them;  making json-file easier for humans, if always same ordr)
            state = {};
        
        // Repos (default is empty)
            console.log('- setting repos');
            state.repoNumber = setting( state_in.repoNumber, -1);
            state.repos = setting( state_in.repos, [] );
        
        // Visual
            console.log('- setting visual settings');
            state.alwaysOnTop = setting( state_in.alwaysOnTop, true);
            state.onAllWorkspaces = setting( state_in.onAllWorkspaces, true);
        
        // Git
            console.log('- setting git settings');
            state.forceCommitBeforeBranchChange = setting( state_in.forceCommitBeforeBranchChange, true);
            state.autoPushToRemote = setting( state_in.autoPushToRemote, true);
            state.onlyOneStash = setting( state_in.onlyOneStash, true);
            
        // External tools (three levels -- state.tools.difftool )
            console.log('- setting external tools ');

            state.tools = setting( state_in.tools, {} ); 
            state.tools.difftool = setting( state_in.tools.difftool, "");
            state.tools.mergetool = setting( state_in.tools.mergetool, "");
            
            console.log('State after amending non-existing with defaults ');
            console.log(state);
        
        // Position
            state.position = setting( state_in.position, {} ); 
        
        // Settings window folding  (four levels -- state.settingsWindow.unfolded.repoSettings )
            state.settingsWindow = setting( state_in.settingsWindow, {} );
            state.settingsWindow.unfolded = setting( state_in.settingsWindow.unfolded, [] );
            state.settingsWindow.unfolded.repoSettings = setting( state_in.settingsWindow.unfolded.repoSettings, true );
            state.settingsWindow.unfolded.softwareSettings = setting( state_in.settingsWindow.unfolded.softwareSettings, false );
            state.settingsWindow.unfolded.instructions = setting( state_in.settingsWindow.unfolded.instructions, false );

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

    // Position window
    try{
        // Validate position on screen
        if ( (state.position.x + state.position.width) > screen.width ) {
            state.position.x = screen.availLeft;
        }
        
        if ( (state.position.y + state.position.height) > screen.height ){
            state.position.y = screen.availTop;
        }
        
        // Position and size window
        win = gui.Window.get();
        win.moveTo( state.position.x, state.position.y);
        win.resizeTo( state.position.width, state.position.height);
        
        // For systems that have multiple workspaces (virtual screens)
        if ( win.canSetVisibleOnAllWorkspaces() ){
            win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
        }

        
    }catch(err){
        console.log('Error setting window position and size');
        console.log(err);
    }
    


    
    return state;
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
    
 
}
function dev_show_tag_list(){
    
            gui.Window.open(
                'tagList.html#/new_page' ,
                {
                    id: 'tagListWindowId',
                    position: 'center',
                    title: "Select one tag"
                }
            ); 

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
  focusTitlebars(false);
};
window.onresize = function() {
  //win.reload();
  updateContentStyle();
};
window.onload = function() {
  var win = nw.Window.get();

  
  // Fix for overshoot of content outside window
  if (document.getElementById('content').offsetWidth > window.innerWidth){
    win.reload();
    updateContentStyle(); 
  }

   
  win.width = win.width +1; // Try to force redraw -- to fix the layout problems
  
  updateContentStyle(); 
  win.show();
  //updateContentStyle(); 
  
  focusTitlebars(true);
  win.setAlwaysOnTop(true);
  
  
  if (devTools == true){
      win.showDevTools();  // WARNING : causes redraw issues on startup
  }
  
  _setMode('UNKNOWN');
  _update();
  
  // Throws an alert dialog if git missing (use setTimeout to allow drawing of gui to continue)
  setTimeout(gitIsInstalled, 2000);

};



