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

/* ISSUES
 * ------
 * 
 * - check correct characters in add branch name (settings.js)  :https://wincent.com/wiki/Legal_Git_branch_names
 *   Maybe online validation of text ?
 * 
 * /* Namnförslag
 * digit
 * gitenough 
 * legit
 * agit -- Agit is the short form o agitated. It refers to people who looks so mean or somewhat close to a yeti. It can also refer to people who looks so stressed and fucked up. 
 * gitsy (finns)
 * gitta / gitaH
 * gitty  (finns)  -- "Being very happy while showing signs of nervousness. Being happy while exhibiting behavior associated with not thinking clearly"
  */
/* TODO
 * ----
 * 
 * Open questions
 * 
 * - Pull 
 * 
 * - Show the commit message for current commit in placeholder, with text like : You are working on the revison : ....
 * 
 * - Hide-branch feature (settings checkbox column, and then put them in state.repos.hidden.  Would require updating of branchList commands in app.js
 *
 * - Add pull from remote (icon in title-bar after "repo(branch)"
 * 
 * - How to handle local changes when pulling ?  Stash, pull, pop ?   ( https://stackoverflow.com/questions/10414769/git-pull-keeping-local-changes )
 *
 * - How to checkout ? (Maybe let Store button become Chechout when browsing history ?)  document.getElementById("store-button").innerHTML="Checkout"
 * 
 * - How to handle change in checkout which is not HEAD (detached head)?  
 *   1) Auto-create branch if find that it is detached head on commit?   "git checkout -b newbranch"
 *   2) Dialog to ask if create new branch or move to top ?  
 *   3) Instead: save as non-git in separate folder ? That would be easier to understand.
 *
 * - See list of files clicking on Modified / New / Deleted
 * 
 * - How to setup remote repository ?  (see : https://medium.com/@erbalvindersingh/pushing-a-git-repo-online-to-github-via-nodejs-and-simplegit-package-17893ecebddd , or try my version by implementing raw REST calls)
 * 
 * - How to pull ? Auto-pull before push ?
 * - How to merge ?
 * 
 * - How to initialize git-flow ?
 * 
 * Docs : https://www.npmjs.com/package/simple-git
 *        https://github.com/steveukx/git-js#readme  (nicely formmatted API)
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
 *                           - placeholder = shows history   
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
        localState.settings = false;  // True when settings window is open
        localState.mode = 'UNKNOWN'; // _setMode finds the correct mode for you
        
        
    // Expose these to all windows 
        global.state = loadSettings(settingsFile); // json settings
        global.localState = localState;   

    // Collect settings
        var repoSettings = {}; 
   
        
    // Initiate GUI update loop 
        var timer = _loopTimer( 1000);


// ---------
// FUNCTIONS
// ---------

// main functions
function _callback( name, event){
    console.log('_callback = ' + name);
    switch(name) {
      case 'clicked-store-button':
        storeButtonClicked();
        break;
      case 'message_key_up':
        messageKeyUpEvent();
        break;
      case 'clicked-up-arrow':
        upArrowClicked();
        break;
      case 'clicked-down-arrow':
        downArrowClicked();
        break;
      case 'clicked-repo':
        repoClicked();
        break;
      case 'clicked-branch':
        branchClicked();
        break;
      case 'clicked-folder':
        folderClicked();
        break;
      case 'clicked-push-button':
        gitPush();
        break;
      case 'clicked-pull-button':
        gitPull();
        break;
        
        
        
        
      case 'clicked-settings':
        showSettings();
        break;
      case 'clicked-about':
        showAbout();
        break;
      case 'clicked-close-button':
        closeWindow();
        break;
      case 'file-dropped':
        dropFile( event); 
        break;
      default:
        // code block
    }

    // ---------------
    // LOCAL FUNCTIONS
    // ---------------

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
    
        
        // Find top folder in initialized local repo
        var topFolder;
        
        try{
            var isRepo;
            await simpleGit(folder).checkIsRepo(onCheckIsRepo);
            function onCheckIsRepo(err, checkResult) { isRepo = checkResult}
            
            console.log('dropFolder CHECK IF REPO = ' + isRepo);
            
            // If not a repo
            if (!isRepo){
                // Ask permisson to init repo
                var nameOfFolder = folder.replace(/^.*[\\\/]/, '');
                var string = 'This folder is not a repository.'+ os.EOL;
                string += 'Do you want to initialize this folder as a git repository ?' + os.EOL;
                string += 'The name of the repository will be "' + nameOfFolder + '" ';
                
                // Create repo
                if ( confirmationDialog(string) ) {
                    
                    setStatusBar( 'Initializing git');
                    
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
                    
                }else{
                    // bail out if rejected permission
                    return 
                }
            }
            
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
        state.repos = cleanDuplicates( state.repos, 'localFolder' );  // TODO : if cleaned, then I want to set state.repoNumber to the same repo-index that exists
        try{
            // Set index to match the folder you added
            index = findObjectIndex( state.repos, 'localFolder', topFolder);  // Local function
        }catch(err){
            index = state.repos.length; // Highest should be last added
        }
        
        // Set to current
        state.repoNumber = index;
        localState.branchNumber = 0; // Should always start at 0, because that is the first one found in git lookup ( such as used in branchedClicked()  )
    
        // Set global
        state.repos[state.repoNumber].localFolder = topFolder;
        console.log( 'Git  folder = ' + state.repos[state.repoNumber].localFolder );
        
        // Update immediately
        await _setMode('UNKNOWN');
        await _update();
        
        //
        // Local function definitions
        //
        
        function findObjectIndex( myArray, objectField, stringToFind ){
            
            var foundIndex; //last found index
            // Loop for the array elements 
            for (let i in myArray) { 
        
                if (stringToFind === myArray[i][objectField]){
                    foundIndex = i;
                }
            } 
            
            return foundIndex;
        }
    
    
    
    };


    // title-bar
    function repoClicked(){
        // Cycle through stored repos
        state.repoNumber = state.repoNumber + 1;
        var numberOfRepos = state.repos.length;
        if (state.repoNumber >= numberOfRepos){
            state.repoNumber = 0;
        }
        
        _setMode('UNKNOWN');
    }
    async function branchClicked(){
        
        // Determine status of local repository
        var status_data;  
        try{
            status_data = await gitStatus();
        }catch(err){
            console.log('Error in unComittedFiles,  calling  _mainLoop()');
            console.log(err);
        }
     
        // Determine if no files to commit
        var uncommitedFiles = status_data.changedFiles;

    
        // Checkout branch  /  Warn about uncommited (if that setting is enabled)
        if ( uncommitedFiles && state.forceCommitBeforeBranchChange ){
            // Let user know that they need to commit before changing branch
            await writeTimedMessage( 'Before changing branch :' + os.EOL + 'Add description and Store ...', true, WAIT_TIME)
            _setMode('UNKNOWN');
            
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
     
        await _update()
        
        // Reset some variables
        localState.historyNumber = -1;
    }
    function showAbout(){    
        console.log('About button pressed');
        
        about_win = gui.Window.open('about.html#/new_page', {
            position: 'center',
            width: 600,
            height: 450,
            
        });
        
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


    // main window
    function storeButtonClicked() { 
        gitAddCommitAndPush( readMessage());
}  
    async function downArrowClicked(){
        
        console.log('down arrow clicked');
        
        // Get log
        var history;
        try{              
            await simpleGit(state.repos[state.repoNumber].localFolder).log( onHistory);
            function onHistory(err, result){console.log(result); history = result.all;} 
                
        }catch(err){        
            console.log(err);
        }
        

        try{
            await _setMode('HISTORY');
            
            // Cycle through history
            console.log('downArrowClicked - Cycle through history');
            var numberOfHistorySteps = history.length;
            localState.historyNumber = localState.historyNumber + 1;
            console.log('downArrowClicked - numberOfHistorySteps, localState');
            console.log(numberOfHistorySteps);
            console.log(localState);
            
            var numberOfBranches = state.repos.length;
            console.log('downArrowClicked - numberOfBranches');
            console.log(numberOfBranches);
            if (localState.historyNumber >= numberOfHistorySteps){
                console.log('downArrowClicked - setting localState.historyNumber = 0');
                localState.historyNumber = 0;
            }
            
            // Reformat date ( 2020-07-01T09:15:21+02:00  )  =>  09:15 (2020-07-01)
            var historyString = ( history[localState.historyNumber].date).substring( 11,11+8) 
            + ' (' + ( history[localState.historyNumber].date).substring( 0,10) + ')'
            + os.EOL 
            + history[localState.historyNumber].message;
            
            // Display
            writeMessage( historyString, false);
            
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
            await simpleGit(state.repos[state.repoNumber].localFolder).log( onHistory);
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
            writeMessage( '', false);  // empty message -- needed off for setMode to understand UNKNOWN mode
            _setMode('UNKNOWN');
            await _update()
        }else{
            // Show history
            _setMode('HISTORY');
            
            // Reformat date ( 2020-07-01T09:15:21+02:00  )  =>  09:15 (2020-07-01)
            var historyString = ( history[localState.historyNumber].date).substring( 11,11+8) 
            + ' (' + ( history[localState.historyNumber].date).substring( 0,10) + ')'
            + os.EOL 
            + history[localState.historyNumber].message;
            
            // Display
            writeMessage( historyString, false);
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
        localState.settings = true;
     return   
    };
// ================= END CALLBACK ================= 
} 
async function _loopTimer( delayInMs){
    
    // Define timer
    let timer = window.setInterval( _update, delayInMs );
    return timer
    

    
}
async function _update(){ 
    // Bail out if isPaused = true
    if(isPaused) {
        return;
    }
    
    // Variables
    let modeName = getMode();
    let  status_data;
    let  folder;
    
    // DEFAULT is special case with git
    if ( modeName != 'DEFAULT'){  // git commands won't work if no repo
        status_data = await gitStatus();
        let result = await gitLocalFolder();
        folder = result.folderName;
    }
    
    // If left settings window
    if ( localState.settings && (modeName != 'SETTINGS') ){
        localState.settings = false;
        updateWithNewSettings();
    }
    
    // Update Push button
    if (status_data.ahead > 0){
        document.getElementById('top-titlebar-push-icon').style.visibility = 'visible'
    }else{
        document.getElementById('top-titlebar-push-icon').style.visibility = 'hidden'
    }
    
    // Update Pull button
    if (status_data.behind > 0){
        document.getElementById('top-titlebar-pull-icon').style.visibility = 'visible'
    }else{
        document.getElementById('top-titlebar-pull-icon').style.visibility = 'hidden'
    }
        
    switch( modeName ) {        
        case 'UNKNOWN':
            _setMode('UNKNOWN'); // _setMode finds the correct Mode if called by "UNKNOWN"
            break;
            
        case 'DEFAULT':
            setTitleBar( 'top-titlebar-repo-text', ' ' );
            setTitleBar( 'top-titlebar-branch-text', ' ' );
            setStatusBar(' ');
            break;
            
        case 'NO_FILES_TO_COMMIT':
            setTitleBar( 'top-titlebar-repo-text', folder );
            setTitleBar( 'top-titlebar-branch-text', '  (<u>' + status_data.current + '</u>)' );
            setStatusBar( 'Modified = ' + status_data.modified.length + ' |  New = ' + status_data.not_added.length + ' |  Deleted = ' + status_data.deleted.length);
            // If not correct mode, fix :
            if (status_data.changedFiles){
                _setMode('UNKNOWN');
            }
            break;
            
        case 'CHANGED_FILES':
            try{
                setTitleBar( 'top-titlebar-repo-text', folder );
                setTitleBar( 'top-titlebar-branch-text', '  (<u>' + status_data.current + '</u>)' );
                setStatusBar( 'Modified = ' + status_data.modified.length + ' |  New = ' + status_data.not_added.length + ' |  Deleted = ' + status_data.deleted.length);            
                // If not correct mode, fix :
                if (!status_data.changedFiles){
                    _setMode('UNKNOWN');
                }
            }catch(err){
                console.log('update --  case "CHANGED_FILES" caught error');
                _setMode('UNKNOWN');
            }
            setTitleBar( 'top-titlebar-repo-text', folder );
            setTitleBar( 'top-titlebar-branch-text', '  (<u>' + status_data.current + '</u>)' );
            setStatusBar( 'Modified = ' + status_data.modified.length + ' |  New = ' + status_data.not_added.length + ' |  Deleted = ' + status_data.deleted.length);            
            // If not correct mode, fix :
            if (!status_data.changedFiles){
                _setMode('UNKNOWN');
            }
            break;
            
        case 'CHANGED_FILES_TEXT_ENTERED':
            setTitleBar( 'top-titlebar-repo-text', folder );
            setTitleBar( 'top-titlebar-branch-text', '  (<u>' + status_data.current + '</u>)' );
            setStatusBar( 'Modified = ' + status_data.modified.length + ' |  New = ' + status_data.not_added.length + ' |  Deleted = ' + status_data.deleted.length);
            // If not correct mode, fix :
            if (!status_data.changedFiles){
                _setMode('UNKNOWN');
            }
            break;
            
        case 'HISTORY':
            setTitleBar( 'top-titlebar-repo-text', folder );
            setTitleBar( 'top-titlebar-branch-text', '  (<u>' + status_data.current + '</u>)' );
            setStatusBar( 'Modified = ' + status_data.modified.length + ' |  New = ' + status_data.not_added.length + ' |  Deleted = ' + status_data.deleted.length);
            break;
            
        case 'SETTINGS':
            setTitleBar( 'top-titlebar-repo-text', folder );
            setTitleBar( 'top-titlebar-branch-text', '  (<u>' + status_data.current + '</u>)' );
            try{
                setStatusBar( 'Modified = ' + status_data.modified.length + ' |  New = ' + status_data.not_added.length + ' |  Deleted = ' + status_data.deleted.length);
            }catch(err){
                await _setMode('UNKNOWN');
                setStatusBar(' ');
                setTitleBar( 'top-titlebar-repo-text', folder );
                setTitleBar( 'top-titlebar-branch-text', '' );
            }
            
            break;
            
        default:
            console.log('run_timer - WARNING : NO MATCHING MODE WAS FOUND TO INPUT = ' + modeName);
    }    
    
    return true

    //
    // Local functions
    //
    function updateWithNewSettings(){
        //Called when left settings window
        win.setAlwaysOnTop( state.alwaysOnTop );
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
 * 
 */
    var newModeName;
    
    let currentMode = await getMode();
    console.log('setMode = ' + inputModeName + ' ( from current mode )= ' + currentMode + ')');
    
   
    
    
    switch(inputModeName) {        
        case 'UNKNOWN': 
            {
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
                
                
                // DEFAULT
                if ( numberOfRepos == 0 ){ 
                    newModeName = 'DEFAULT';  
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
                
                // HISTORY
                if ( historyNumberPointer > -1 ){ 
                    newModeName = 'HISTORY'; 
                    localState.historyNumber = copyOfLocalState.historyNumber; // Keep existing     
                    _setMode( newModeName);
                    break;
                }  

                break;
            }
            
        case 'DEFAULT':
            //if (currentMode ==  'DEFAULT') { return};
            newModeName = 'DEFAULT';
            document.getElementById('store-button').disabled = true;
            document.getElementById('message').value = "";
            document.getElementById('message').placeholder = "Get started by dropping a folder onto this window ...";    
            document.getElementById("message").readOnly = true;
            
            setTitleBar( 'top-titlebar-repo-text', ''  );
            setTitleBar( 'top-titlebar-branch-text', '' );
            break;
            
        case 'NO_FILES_TO_COMMIT':
            // set by _mainLoop
            newModeName = 'NO_FILES_TO_COMMIT';
            if (currentMode ==  'NO_FILES_TO_COMMIT') { return};
            document.getElementById('store-button').disabled = true;
            document.getElementById('message').value = "";
            document.getElementById('message').placeholder = "No changed files to store";            
            document.getElementById("message").readOnly = true;
            break;
            
        case 'CHANGED_FILES':
            // set by _mainLoop
            newModeName = 'CHANGED_FILES';
            //if (currentMode ==  'CHANGED_FILES') { return};
            document.getElementById('store-button').disabled = true;
            document.getElementById('message').value = "";
            document.getElementById('message').placeholder = "You have changed files." + os.EOL + "Add description and press Store";        
            document.getElementById("message").readOnly = false;
            break;
            
        case 'CHANGED_FILES_TEXT_ENTERED':
            // set by messageKeyUpEvent
            newModeName = 'CHANGED_FILES_TEXT_ENTERED';
            if (currentMode ==  'CHANGED_FILES_TEXT_ENTERED') { return};
            document.getElementById('store-button').disabled = false;
            //document.getElementById('message').value = "";
            //document.getElementById('message').placeholder = "Get started by dropping a folder onto this window";    
            document.getElementById("message").readOnly = false;
            break;
            
        case 'HISTORY':
            // set by downArrowClicked and upArrowClicked
            newModeName = 'HISTORY';
            if (currentMode ==  'HISTORY') { return};
            document.getElementById('store-button').disabled = true;
            // Text not fixed
            document.getElementById('message').value = "";
            document.getElementById('message').placeholder = "";    
            document.getElementById ("message").readOnly = true;
            break;
            
        case 'SETTINGS':
            newModeName = 'SETTINGS';
            if (currentMode ==  'SETTINGS') { return};
            document.getElementById('store-button').disabled = true;
            document.getElementById('message').value = "";
            document.getElementById('message').placeholder = "You are in settings mode." + os.EOL + "Edit in settings dialog window";    
            document.getElementById("message").readOnly = true;
            break;
            
        default:
            console.log('setMode - WARNING : NO MATCHING MODE WAS FOUND TO INPUT = ' + inputModeName);
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
        var string = 'Cannot find "git" !'+ os.EOL;
        string += ' ' + os.EOL;
        string += 'Please make sure "git" is installed. ' + os.EOL;
        string += 'See manual for help (question mark icon in top-left corner of the main window) ' ;
        
        alert(string);
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
        
        status_data.changedFiles = ( (status_data.modified.length + status_data.not_added.length + status_data.deleted.length) > 0);
        //console.log(status_data);
        status_data.current;  // Name of current branch
    }catch(err){
        console.log('Error in _mainLoop()');
        console.log(err);

    }
 
    // return fields : 
    //      changedFiles (boolean) 
    //      modified, not_added, deleted (integers)
    return status_data;  
}
async function gitBranchList(){
    // Made available for other scripts by export command
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
    
    // Add all files
    setStatusBar( 'Adding files');
    var path = '.'; // Add all
    await simpleGit( state.repos[state.repoNumber].localFolder )
        .add( path, onAdd );
        
    function onAdd(err, result) {console.log(result) }
    
    await waitTime( 1000);
    
    // Commit including deleted
    setStatusBar( 'Commiting files  (to ' + currentBranch + ')');
    await simpleGit( state.repos[state.repoNumber].localFolder )
        .commit( message, {'--all' : null} , onCommit);
        
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
    writeMessage('',false);  // Remove this message  
    _setMode('UNKNOWN');  
    await _update()
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
            
            await writeTimedMessage( 'Successfully pulled files from remote' + os.EOL + error, true, WAIT_TIME);
        }catch(err){
            console.log('Error in gitPull()');
            console.log(err);
            error = err;
            await writeTimedMessage( 'Failure pulling files from remote ' + os.EOL + error, true, WAIT_TIME);
        }
        _setMode('UNKNOWN');
    }else {
        writeTimedMessage( 'No files can be pulled from remote' + os.EOL + error, true, WAIT_TIME);
    }

}

// Utility functions
function getMode(){
    return localState.mode;
}
function confirmationDialog(text) {    
    console.log('confirmationDialog called');
    
    //var dialog_win = gui.Window.open('confirmationDialog.html#/new_page', {
        //position: 'center',
        //width: 300,
        //height: 100,
        //focus: true
    //});

    console.log('Opened Confirmation Dialog');
    
    return confirm(text);
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
    var message_area = document.getElementById("message");
    var message_area_style = "height: " + (height - 28).toString() + "px; ";
    message_area_style += "width: 100%; " ;
    message_area_style += "resize: none; " ;
    message_area.setAttribute("style", message_area_style);

  
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

    
    try{
        jsonString = fs.readFileSync(settingsFile);
        state = JSON.parse(jsonString);
        
        console.log('Input json file');
        console.log(state);
        
        // Sanity check on repoNumber
        if ( state.repoNumber >= state.repos.length ){
            state.repoNumber = 0;
        }        
        // Sanity check on repoNumber
        if ( state.repos.length == 0){
            state.repoNumber = -1;
        }
    
    }catch(err){
        console.log('Error loading settings -- setting defaults');
        // Defaults
        state = {};
        
        state.repoNumber = -1; // Indicate that no repos exist yet
        localState.branchNumber = 0;
        
        state.repos = [];
        
        state.alwaysOnTop = true;
        state.forceCommitBeforeBranchChange = true;
        state.autoPushToRemote = true;
        
        console.log(err);

    }
    
    
    // Clean duplicate in state.repos based on name "localFolder"
    state.repos = cleanDuplicates( state.repos, 'localFolder' );
    console.log('State after cleaning duplicates');
    console.log(state);
    
    if ( state.repoNumber > state.repos.length ){
        state.repoNumber = 0; // Safe, because comparison  (-1 > state.repos.length)  is false
    }
    
    
    // Place window
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

        
    }catch(err){
        console.log('Error setting window position and size');
        console.log(err);
    }
    


    
    return state;
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



