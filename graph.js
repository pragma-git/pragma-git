// ---------
// INIT
// ---------


const test = 0; // test = 0, use Pragma-git.  test = 1 (complicated), 2 (simple), 3 (defining examples) use test cases


var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');
const simpleGit = require('simple-git');  
var util = require('./util_module.js'); // Pragma-git common functions
       
const pathsep = require('path').sep;  // Os-dependent path separator

// Global for whole app
//var state = global.state; // internal copy of global.state
//var localState = global.localState; 

var win

const DEV = false;  // Show additional info if DEV=true
var graphContent = '';  // This is where output is collected before putting it into graphContent element

const BUFFERTCOLS = '  '; // Allows to look to the left of current character
const BUFFERTROW = '                                                        ';


// Global for whole app
var state = global.state; // internal copy of global.state
var localState = global.localState; 

// Global in this window
let history = '';

//
// Example graphs
//
var graphText;
function testGraph(i){
// Real Example : git log --graph --date-order --oneline   
switch (i) {
 case 1 : {
graphText = String.raw`* 7ac659d (HEAD -> develop, origin/develop) Add script SPM viewer
* 7fe5f6f Fix accidental commit
*   d267661 Merge remote-tracking branch 'origin/develop' into develop
|\  
* | cf12312 Revert "Fix that search-field was not always fully shown"
| * bdfd286 Fix that search-field was not always fully shown
|/  
* 6f99d86 Improve again
* 6e60ebc Improve update script -- to solve installing deeper and deeper
* d9338fe Make update recognize github zip structure
* 8bcc562 USER_SCRIPT folder updated
* f300d65 Set version.txt
*   3924c62 Update from github
|\  
| * abeb22e (origin/feature/update, feature/update) Fix USER_SCRIPT path
| * 9848d08 Move update to github -- first commit
|/  
* aea50f1 Start testing Github site
*   33b9dc3 Fix opening 1.2.840.10008.1.2
|\  
| * f7097f6 Fix error opening 1.2.840.10008.1.2
| * 50f3260 test3
| *   f08591a Merge branch 'master' of https://github.com/JanAxelsson/imlook4d
| |\  
| | * 572046d Set theme jekyll-theme-architect
| * | 7b1e3cd test page 2
| * | 1af4e37 test page
| | * 44ad9df Set theme jekyll-theme-midnight
| |/  
| *   4970dcd (tag: 5.2.0) 5.2.0
| |\  
| |/  
|/|   
* | 6055e61 test
* | a1ffb44 Read PMOD Nifti version (extension to nifti to store PET time info)
* | c72f23d test
* | 2f14fe2 test2
* | 7acf9d4 test
* | 2edac63 SPM Tissue probability based ROIs
* | f766635 SPM align -- added dialog defining first frame
* | 68d2d89 Fixed SPM errors on DYN scans
* | 925c1cd Fixed error on NaN, reading native-space nii-ROIs
* | d1f9e54 (tag: remove, tag: list) Fixed: image update, for corrected transparency > 100%
* | 20364ce (tag: 5.1.3) Transparancy setting for overlays
* | 6a49f8f Export times to sif
* | 04e723c Improved docs for Modelling
* | f760983 Loop script -- fixed bug empty row
|/  
* f27abfd (tag: 5.1.2) Loop script -- introduced bold output
* 9b5a7ce Loop script -- improved empty rows
* d84e0fb Loop skript -- handle empty rows
* b4564aa PVE factors, allow input of PSF in units  mm
* 4eb7a8d Fix error in contour ROI
*   84fb8b0 (tag: 5.1.1) Merge remote-tracking branch 'origin/DEVELOP' into develop
|\  
* \   25fa970 Feature Named_measures finished
|\ \  
| * | dde2737 ROI-file : Save and Load measurements
| * | 21b04b3 Copy Values -- show slice and orientation
| * | 36362d2 First attempt - Save and Load measures
| * | 4db5e80 Refactor -- function for contextual measure submenus
| * | d401a27 Multiple changes -- move line, labels etc
| * | acf2db9 Show only on correct slice.  Delete all works
| * | 0e59ca6 Copy values - fix so that only current window values are copied
| * | 0a5693f Correct measurement errors
| * | 6610ec0 Submenues -- Copy values, delete, rename
| * | 0b0414a Measure -- rename contextual menu
| * | 2d98fb0 test -- measurement : make NAME submenu
| | * 6a8ec06 Revert "Started development of Coregister and Move ROIs"
| |/  
|/|   
* | a9e1081 test -- measurement : make NAME submenu
|/  
* 324421c Improved Measure-tool
* 599639a Allow loading RTSTRUC on non-DICOMs
* 8bb1364 Test
* 4a66f76 Open dialog Load ROI -- MacOS Catalina bug fix
* f8b708d Add elastix matlab interface
* 2535541 (tag: 5.0.23) Copy image -- fix for Windows
* 09b5328 (tag: 5.0.22) Modified Adaptive algorithm -- lessen impact of high out-of-ROI values
* b7a09a3 Improved attempt to Open .roi file if data moved
* 4e51f51 Attempt to Open .roi file if data moved
* d52852b (tag: 5.0.21) Add script "Adaptive Threshold within ROI "
* 3a22fc2 Fixed pixdim error saving Nifti
* e7efd55 First attempt Adaptive Threshold
* 1e0a256 Moved Ax-Cor-Sag dropdown sligthly
* 0396239 (tag: 5.0.20) Remove INFs from Make_cubic_voxels
* d2845dd Display error in user function from loop script
* 360acb6 (tag: 5.0.19) First trial -- bookmark in saved .roi file
* 5f056a8 (tag: 5.0.18) Open menu now opens .roi file
* 0b5c63c (tag: 5.0.17) Fixed ROI error in 2-dimensional images
* c8de4ac Water image model
* dff5b9d Help on MODELS - use same static html document
* 7ccb391 Help on Models - using static html document
* 816ac6a Water model on ROI, and save Cinp from TACT
* 37c2c09 Clear variables in Update_imlook4d
* 550fc47 Fix Copy to Clipboard paper size
*   6be1223 Merge branch 'master' into develop
|\  
* | 51d9794 Update help on load/save ROIs
| *   53ac480 (tag: 5.0.16) Merge remote-tracking branch 'origin/DEVELOP'
| |\  
| |/  
|/|   
* | ed3ce05 Save nifti ROIs
| *   d014a68 (tag: 5.0.15) Merge remote-tracking branch 'origin/DEVELOP'
| |\  
| |/  
|/|   
* | b32dedc Improved Clipboard -- OS dependent output
* | 870f93f (tag: 5.0.14) Clipboard PDF output format
* | b44d834 Draw Green ROI on top (so green will never be hidden)
* | 1c69f81 (tag: 5.0.13) Copy plot, hide drawing window
* | 48a7c39 (tag: 5.0.12) Copy plot from Time-activity curve and ModelWindow
* | a285ea2 Fix ROI-drawing matlab error in commit "Fix first image being blank.."
* | f292046 Improve Adjust Level GUI
* | eafa90e Fix first image being blank, before change slice
* | 9d22578 robustify SRTM and water-model
* |   6e0005c Merge remote-tracking branch 'origin/DEVELOP' into DEVELOP
|\ \  
* | | 502266d ImprovedreadRoiNamesFromFile for compatibility
| * | 5127bed (tag: 5.0.11) Fix screen dump white ROIs
| * | fcc39c7 (tag: 5.0.10) Add ROI edit color dropdown-menu
| * |   1d12afe Merge remote-tracking branch 'origin/DEVELOP' into develop
| |\ \  
| |/ /  
|/| |   
* | | 69ad5b4 Ask for RefRegion also in Water DoubleIntegral
* | | 03b15e4 Make faster by eliminating print Undo ROI size
|/ /  
* | 35d2157 (tag: 5.0.9) Fix saving ROIs when flip-and-rotate off
* | 4190d3d (tag: 5.0.8) Fix loading ROI if flip-and-rotate is off
* |   749d800 Merge remote-tracking branch 'origin/DEVELOP' into DEVELOP
|\ \  
* | | 662df14 Don't display savepath error if read-only
| * | e9cd77c (tag: 5.0.7) Fix for both Ax-Cor-Sag viewport error AND zoom viewport
|/ /  
* | 67fdc68 (tag: 5.0.6) Fixed ROI_info calculating every single ROI
* | 0d0ee17 Fix flip-rotate bug when changing Ax-Cor-Sag
* | 19cc757 Improved release to Google Drive
| *   9ed2161 (tag: 5.0.5) Merge branch 'develop'
| |\  
| |/  
|/|   
* | 1a9a9d3 Fix flip-rotate button rectangular image
* | 8778281 Renamed variable in Time-activty curve
| * e586afc gitignore updated
| *   dc7f6f6 Merge tag '5.0.4'
| |\  
* | | 57f0b8e Simplify release to Google Drive
| |/  
|/|   
* | 7a48c66 (tag: 5.0.4) SPM write -- fix changing matrix
* | c62133b Hiding and showing ROIs -- allow any order in ROI hide  and Ref ROI
* | 7b01bcd ROI naming from file -- handle "hidden" and "Ref ROIs"
* | 20441d4 Copy Table for window for TACT button press
* | c99a8d8 Copy table -- for TACT and Model windows
* | a02f38c Remove hidden ROIs - from "ROI data to workspace"
* | 0127c63 Fix show reference ROI for hidden ROIs
* | b9e4c5f TACT and model -- don't report hidden ROIs
| *   0553e25 (tag: Madde_reported_graphical_errors, tag: 5.0.3) Merge branch 'hotfix/Madde_reported_graphical_errors'
| |\  
* | \   81a6751 Merge branch 'hotfix/Madde_reported_graphical_errors' into develop
|\ \ \  
| | |/  
| |/|   
| * | 5262b4f Fix graphical error on load+save ROI
| |/  
* |   fbecc6e (tag: 5.0.2) Merge tag '5.0.1' into develop
|\ \  
| | *   3e4a6ee Merge remote-tracking branch 'origin/DEVELOP'
| | |\  
* | | \   1b75daa Merge branch 'hotfix/TACT-button-error' into develop
|\ \ \ \  
| | | * \   67a8110 (tag: TACT-button-error) Merge branch 'hotfix/TACT-button-error'
| | | |\ \  
| | |_|/ /  
| |/| | |   
| * | | | a400255 Fixed TACT-button error
| | |/ /  
| |/| |   
| | * |   03cf125 (tag: 5.0.1) Merge branch 'DEVELOP'
| | |\ \  
| | | |/  
| | | * 8df9417 Update working before 2017b
| | * |   6430e9e Merge branch 'DEVELOP'
| | |\ \  
| |/ / /  
| | | _   
| | * ea52589 Fix wrong rotation if "Flip+rotate" was off
| | * 72af086 Fix jumped off zoom when scrolling
| |/  
|/|   
* |   6e50943 Merge branch 'release' into develop
|\ \  
| * | d62f700 (release) SPM incompatibile routines -- catch errors in path save
* | |   dc2cdc4 Merge branch 'release' into develop
|\ \ \  
| |/ /  
| * | 4a12ae8 Fix nifti wrong magic code
| |/  
* |   118c8b6 PK Models -- links, and improved Patlak description
|\ \  
| |/  
|/|   
* | 5429dd4 (tag: 5.00) SPM apply atlas handles Dynamic PET
| * 9006076 SPM apply atlas handles Dynamic PET
|/  
* 750b618 Fixed Flip and rotate but, second iiteration
* 0c0a3f5 Faster ROI_info
* 49921b6 Fix Flip and rotate distortion and capping bug
*   9d26109 Merge remote-tracking branch 'origin/DEVELOP' into develop
|\  
* | 604d2e0 Help function rewritten
| * d68ede5 New help implemented
|/  
* 0fb041e Extended SRTM (changed condition)
* 7d07b47 Changed SPM center_origin for dynamic scanns
*   207ad02 Merge remote-tracking branch 'origin/DEVELOP' into develop
|\  
* | a92fad6 First attempt RTSTRUCCT loading
| * 6ee5c4b First attempt RTSTRUCCT loading
|/  
*   b766f5f Merge remote-tracking branch 'origin/DEVELOP' into develop
|\  
* \   93adcc2 Merge branch 'release' into develop
|\ \  
| | *   59ded19 Merge branch 'release' into develop
| | |\  
| |/ /  
|/| /   
| |/    
* | 35c3589 readRTSTRUCT function
| * 32594ed Logan and Patlak titles
| * 8c6fcc9 Improved ModelWindow data cursor
| * 150ef97 Flip skripts repaired
| * 113015d ModelWindow tooltip -- show frame number
| * e42c138 Model Window - consistent colors in residual and data
| * a06e89e Load ROI, store Reference ROIs
| * d6e6c66 Automatic ROI naming when opening Nifti with same name as ROI-file
| * a210c91 Fix incompatibilities from SPM Fieldtrip
| * aaecac7 Auto-read ROI names from file
| * 36c2986 Fix Import Sif error
| * e67adb2 Contour move to middle of pixel
| * 62d78fe Validate PVE correction script, dynamic data
| * f901515 Documented PVE correction functions
| * dbc32e7 FWHM dialog PVE correction
| * 4579482 TACT PVE correction (dynamic images)
| * 8c7698a ROI PVE-correction for static images
| * f5ed85c Fix Histogram script
| * 610f7ed Updated Help/About`

break;
}case 2 : {

// Some crazy examples
graphText = String.raw`
 * *   *  *  * *  *    * *  * *    
 * |  /   |  |  \  \   | |  | |   
 * | /   /    \  \  \  |/    \|    
 * | \  /      \    / /|      |\    
 * |  \            /  \|      |/     
 *     *          *    |\    /|     
                                  
  * * *   
   \|/   
    |    
   /|\    
  * * *  
             
  * *      * *
   \|      |/   
    |\    /|    
    * *  * *   
                                 
   *   *   *  *
   *   |  /    \
                       
   /   /   /   /   
  *   |   /    \   
  *   *  *      *   
                                                  
   *   *   *  *  
   |   |   |  |   
   *   |  /    \  
   *   * *      *  
                         
`

break;
}case 3 : {
// Examples defining algorithm
graphText = String.raw`
 * *      * *  A * *      * *  
  \|      |/   A  \|      |/           
   |\    /|    A   |\    /|    
   * *  * *    A   * *  * *             
                         
 \  \  \      /  /   / B \  \  \      /  /   /          
  |  *  \    |  *   /  B  |  *  \    |  *   /          
                          
 *  *  *    C   *  *  *    
/   |   \   C  /   |   \          
               
 * *       D  * *       
 |_|       D  |_|       this line is the important test
/   \      D /   \      
 
 *   *     E  *   *     
  \ /      E   \ /      
  / \      E   / \      
 *   *     E  *   *     
             NOTE: requires space not to fail
  * * *    F   * * *    
 /  |  \   F  /  |  \   
/   |   *  F     |   *       
             NOTE: requires space not to fail
                  
`  
break;
} 
}
return graphText;
}

//
// Functions
//

// Start
async function injectIntoJs(document){
    win = gui.Window.get();
      
    // For systems that have multiple workspaces (virtual screens)
    if ( win.canSetVisibleOnAllWorkspaces() ){
        win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
    }
    
    let folder = state.repos[ state.repoNumber].localFolder;
    //let graphText = 'Error reading graph';
     
    // Find complete history graph
    try{
        // Emulate 'git log --graph --date-order --oneline' with addition of long-hash at end
        let commands = [ 'log', '--graph', '--date-order', '--oneline', '--pretty', '--format=%d%sH=%H']; // %d decorate, %s message, H= catch phrase, %H long hash
        await simpleGit( folder).raw(  commands, onCreateBranch);
        function onCreateBranch(err, result ){graphText = result; console.log(result); };
    }catch(err){        
        console.log(err);
    }

    // History from Pragma-git (honoring settings)
    //   If --first-parent  then off-branch commits will yield branch-number NaN, and be marked 'off-branch' by Pragma-git
    //   If not --first-parent, then all commits will be shown with commit number
    history = await opener.gitHistory();
    console.log(history);
    
    if (test !== 0 ){
        graphText = testGraph(test); // Draw one of included test cases
    }

    // Draw full graph, and label current branch
    let branchHistory = await readBranchHistory();
    await drawGraph( document, graphText, branchHistory);

    

    // Select current history commit in opened graph
    try{
        let divSelect = document.getElementById( localState.historyHash );
        divSelect.classList.add('selected');  
        localState.selectedDiv = divSelect;
    }catch(err){  
    }
    
    // Select pinned commit in opened graph
    try{
        let divPin = document.getElementById( localState.pinnedCommit );
        divPin.firstElementChild.firstElementChild.src = 'images/pinned_enabled.png' 
        divPin.firstElementChild.classList.add('selected');  
        localState.pinnedDiv = divPin;
    }catch(err){  
    }
    
        

}

// Util
async function readBranchHistory(){ // history of current branch (--first-parent)

    let command = ['--first-parent'];
    let history = '';
    
    try{
        await simpleGit(state.repos[state.repoNumber].localFolder).log( command, onHistory);
        function onHistory(err, result){console.log(result); history = result.all; console.log(' ============ Found N = ' + history.length);} 
    }catch(err){        
        console.log(err);
    }  
    return history;
}


// Callbacks
function setPinned(hash, isPinned){ // Called from EventListener added in html
    // This function updates main window

    localState.pinnedCommit = hash; 
    localState.historyHash = hash;
    localState.historyNumber = util.findObjectIndex(history,'hash', hash);
    //opener._callback('clicked-pinned-icon', isPinned);
    opener.drawPinImage(isPinned);
    
    console.log(localState.pinnedDiv);
}
async function setHistoricalCommit(hash){ // Called prior to DOM update
    // Get item number in history of current branch (or NaN if off-branch)
    localState.historyNumber = util.findObjectIndex(history,'hash', hash); 
    
    // Set history in main window
    localState.historyHash = hash;
    localState.historyString = await gitCommitMessage(hash);
    localState.historyLength = history.length;
    await opener._setMode('HISTORY');
    await opener._update();
}
function closeWindow(){
    localState.graphWindow = false;  // Show to main program that window is closed
    win.close(); 
}

// Git
async function gitCommitMessage(hash){
    let folder = state.repos[ state.repoNumber].localFolder;
    let text = '';
    try{
        // Emulate 'git show -s --format=%s ' with addition of long-hash at end
        let commands = [ 'show', '-s', '--format=%B', hash]; // %B multi-line message
        await simpleGit( folder).raw(  commands, onReadCommitMessage);
        function onReadCommitMessage(err, result ){text = result; console.log(result); };
    }catch(err){        
        console.log(err);
    }
    return text;
}

// GUI 
function drawGraph( document, graphText, history){
    
    // document  HTML document
    // graphText output from  raw git log graph
    // history   output from  git log with --oneParent (used to find which commits are in current branch)
    
    
    graphText +=  "\n" + BUFFERTROW + "\n" + BUFFERTROW; 
    
    console.log(graphText)
    
    let splitted = graphText.split("\n");
    console.log(splitted)
    
    
    // Loop each row
    
    for(var row = 0; row < (splitted.length - 1); row++) {
        let sumFound ='';
        
        // Separate log row from ending long hash
        let startOfHash = splitted[row].lastIndexOf('H=');  // From git log pretty format .... H=%H (ends in long hash)
        let hashInThisRow = splitted[row].substring(startOfHash + 2); // Skip H=
        
        // Current row
        let thisRow = splitted[row].substring(0, startOfHash);
        if (startOfHash == -1){
            thisRow = splitted[row]; // When no hash found (lines without commits)
        }

        // Parse row
        graphContent += '<div class="firstcol"></div> ' // First column on row
        for(var i = 0 ; i < thisRow.length ; i++){
            let total = '';
            let found = '';

            
            // Draw node
            if (  a(0,'*') ){
                // Figure out if local branch, or not
                if ( util.findObjectIndexStartsWith(history,'hash', hashInThisRow) >= 0){
                    total += '<img class="node" src="images/circle_green.png">'; // Draw node
                }else{
                    total += '<img class="node" src="images/circle_black.png">'; // Draw node
                }
            }
     
            //
            // Draw lines
            //
            
            // Select what to draw -- first hit wins :
            
            // -------------
            if (  a(0,'|') && a(-1, '\\') && b(0,'|') && b(1,'\\')  ) {
                // A) Crossing down-right 
                found = 'A1';
                total += '<img class="pipe" src="images/pipe.png">';
                total += '<img class="widebackslash" src="images/widebackslash.png">';  
            }else if (  a(0,'|') && a(1, '/') && b(-1,'/') && b(0,'|')  ) {
                
                // A) Crossing down-left 
                found = 'A2';
                total += '<img class="pipe" src="images/pipe.png">';
                total += '<img class="wideslash"  src="images/wideslash.png">';  
                   
            // -------------
            }else if (  a(0,'\\') && !b(1,' ') && ( b(2,' ') || b(2,'|') || b(2,'/')  ) ) {   
            // B) back-slash 
                found = 'B1';
                total += '<img class="backslash" src="images/backslash.png">';
                
            }else if (  a(0,'/') && !b(-1,' ') && ( b(-2,' ') || b(-2,'|') || b(-2,'\\') )  ) {
                // B) slash 
                found = 'B2';
                total += '<img class="slash" src="images/slash.png">';
             
            // -------------   
            }else if (  a(0,'|')  ) {
                
                if (  a(0,'|') && !b( -1,'\\') && !b( -1,' ')  && !b( -1,'_') ) {
                // C) slash 
                    found += ' C1';
                    total += '<img class="slash" src="images/slash.png">';
                    
                }
                if (  a(0,'|') && !b( 0,' ') ) {
                // C) pipe 
                    found += ' C2';
                    total += '<img class="pipe" src="images/pipe.png">';
                    
                }
                if (  a(0,'|') && !b( 1,'/') && !b( 1,' ') && !b( 1,'_') ) {
                // C) back-slash 
                    found += ' C3';
                    total += '<img class="backslash" src="images/backslash.png">';
                }
            // -------------    
            }else if (  a(0,'_') && prev( 1,'/') ) {
            // D) bridge
                found = 'D2';
                total += '<img class="bridge bridgeleft" src="images/bridge.png">';
            }else if (  a(0,'_')  && prev(-1,'\\') ){
            // D) bridge
                found = 'D3';
                total += '<img class="bridge bridgeright" src="images/bridge.png">';
                }else if (  a(0,'_') ) {
            // D) bridge
                found = 'D1';
                total += '<img class="bridge" src="images/bridge.png">';
              
            // -------------
            }else if (  a(0,'\\') && b(0,'/')  ) {
            // E) pipe 
                found = 'E1';
                total += '<img class="pipe" src="images/pipe.png">';
                
            }else if (  a(0,'/') && b( 0,'\\')  ) {
            // E) pipe 
                found = 'E2';
                total += '<img class="pipe" src="images/pipe.png">';
                
            // -------------
            }else if (  a(0,'*') ){ 
            // F) draw one or more lines from node
            
                if (  a(0,'*') && b( -1,'/') && ( b( 0,'|')||b( 0,' ')||b( 0,'*') ) ) {
                // F) slash 
                    found += ' F1';
                    total += '<img class="slash" src="images/slash.png">'; 
                }
                if (  a(0,'*') && !b( 0,' ') && ( b( 0,'|')||b( 0,' ')||b( 0,'*') )  ) {
                // F) pipe 
                    found += ' F2';
                    total += '<img class="pipe" src="images/pipe.png">';
                }
                if (  a(0,'*') && b( 1,'\\') && ( b( 0,'|')||b( 0,' ')||b( 0,'*')||b( 0,'_') ) ) {
                // F) back-slash 
                    found += ' F3';
                    total += '<img class="backslash" src="images/backslash.png">';
                }
            // -------------
    
            }else if (  !a(0,'*') && !a(0,'\\')  && !a(0,'|') && !a(0,'/') && !a(0,'_') && !a(0,' ') ){
            // TEXT if nothing else
                let rowText = '(' + row + ') ';
                graphContent += '<div class="text" id="' + hashInThisRow + '" >' + drawCommitRow( hashInThisRow, thisRow.substring(i), DEV) + ' </div>'; 
                sumFound += ' ' + thisRow.substring(i);
                i = thisRow.length; // set end-of-loop
                continue // skip rest of row
                
            }else if ( i == (thisRow.length - 1) ) {
                // Print out info for non-commit rows
                graphContent += '<div class="text">' +  drawNonCommitRow(hashInThisRow, thisRow.substring(i), DEV) + '</div>';
            }
    
            // Make div with graphContent from above
            graphContent += '<div>' + total +'</div>';
            
            if (found !== ''){
                sumFound += ' ' + found;
            }
        }
        console.log('ROW = ' + row + '  '  +sumFound);
        
        function a(index, c){
            let currentRow = BUFFERTCOLS + thisRow;
            index = index + BUFFERTCOLS.length;
            let answer = currentRow[i+index] === c;
            return answer;
        }
        
        function b(index, c){
            let nextRow = BUFFERTCOLS + splitted[ row + 1];
            index = index + BUFFERTCOLS.length;
            let answer = nextRow[i+index] === c;
            return answer;
        }    
        
        function prev(index, c){
            let currentRow = BUFFERTCOLS + splitted[ row - 1];
            index = index + BUFFERTCOLS.length;
            let answer = currentRow[i+index] === c;
            return answer;
        }    
    }
    
    // Print to graphContent element
    console.log(document);
    document.getElementById('graphContent').innerHTML = graphContent; 
    
}
function drawCommitRow(hash, text, isDev){
    if (isDev){
        return `<pre onclick="setHistoricalCommit('` + hash + `')">` + drawPinnedImage(hash) +  text + `   ` + sumFound +  `</pre>`;
    }else{
        return `<pre onclick="setHistoricalCommit('` + hash + `')">` + drawPinnedImage(hash) +  text +  `</pre>`;
    }
}
function drawNonCommitRow(hash, text, isDev){
    if (isDev){
        return '<pre>'  +  text + '   ' + sumFound +  '</pre>';
    }else{
        return '<pre>'  +  text + '</pre>';
    }
}
function drawPinnedImage(hash){
    const PIN_IMG1 = '<img class="pinned-icon" height="17" width="17" style="vertical-align:middle;"';
    const PIN_IMG2 = ' src="images/pinned_disabled.png"> ';
    return PIN_IMG1 + ` onclick="setPinned('` + hash + `')" ` + PIN_IMG2;
    //return PIN_IMG1 + ` id="` + hash + `" ` + PIN_IMG2;
}
