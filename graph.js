// ---------
// INIT
// ---------


const test = 0; // test = 0, use Pragma-git.  test = 1 (complicated), 2 (simple), 3 (defining examples) use test cases

// Note: colorImageNameDefinitions values are echoed to console, when generating colored images with script 'colorize.bash'
const colorImageNameDefinitions = [
'red',
'blue',
'orange',
'purple',
'salmon',
'orange4',
'tan',
'goldenrod1',
'olive',
'LawnGreen',
'PaleTurquoise1',
'DeepSkyBlue'
];

const unsetNodeImageFile = 'images/circle_black.png';

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

var sumFound;

const DEV = false;  // Show additional info if DEV=true
var graphContent = '';  // This is where output is collected before putting it into graphContent element
var dateContent = '';   // This is where date output is collected for swim-lane version of Graph

var branchNames;        // map  branchname => index 0, 1, 2, ... calculated in drawGraph
var childMap ;          // Store mapping from parent to child [x ,y ] coordinates
var commitArray;   // Store each commit

const BUFFERTCOLS = '  '; // Allows to look to the left of current character
const BUFFERTROW = '                                                                                                                                                                    ';


// Global for whole app
var state = global.state; // internal name of global.state
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
                         
 | *    A | *  
 | |\   A | |\        
 |_|/   A *_|/    
 | *    A | *     
            
                                                    
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
}case 4 : {
graphText = String.raw`
| * Fix ROI bug after 'Clear ROI' D=
| * Add script SPM viewer D=
| | *-.   WIP on develop: 7fe5f6f Fix accidental commit D= (refs/stash)
| | |\ \  
| |/ / /  
| | * | index on develop: 7fe5f6f Fix accidental commit D=
| |/ /  
| | * untracked files on develop: 7fe5f6f Fix accidental commit D= 
                        
                       
                       
| | * | Faster ROI drawing D=
| | * | Cleaned up ROI drawing D=
* | | |   Merge remote-tracking branch 'origin/release' into release D=
|\ \ \ \  
| | |_|/  THIS CONNECTS ONE TOO LOW WHEN DRAWING 
| |/| |   
| | * |   Merge remote-tracking branch 'origin/DEVELOP' into DEVELOP D=
| | |\ \  
| |/ / /  
|/| | /   
| | |/    
| * |   Merge branch 'DEVELOP' into release D=
                                                  
                                                                                                    
                                                                                                                                                      
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
        
    //
    // Init
    //  
    
    
    document.getElementById('showDate').checked = state.graph.showdate;
    document.getElementById('showAll').checked = state.graph.showall;
    
          
    // For systems that have multiple workspaces (virtual screens)
    if ( win.canSetVisibleOnAllWorkspaces() ){
        win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
    }
    
    let folder = state.repos[ state.repoNumber].localFolder;

    //
    // Read history
    //    
        
        // History from Pragma-git (honoring settings)
        //   If --first-parent  then off-branch commits will yield branch-number NaN, and be marked 'off-branch' by Pragma-git
        //   If not --first-parent, then all commits will be shown with commit number
        history = await opener.gitHistory();
        console.log(history);
        
        if (test !== 0 ){
            graphText = testGraph(test); // Draw one of included test cases
        }
        
    
        // Commit log output format
        const messageFormat = '--format=%s T=%aI D=%d H=%H P=%P N=%N';  // %aI = author date, strict ISO 8601 format

        
    //
    // Take 1 : Parse first N rows (quicker)
    //
        const firstPassN = 55;
        
        // Write header text
        let repoName = opener.window.document.getElementById('top-titlebar-repo-text').innerText;
        let branchName = opener.window.document.getElementById('top-titlebar-branch-text').innerText;
        document.getElementById('repoName').innerText = repoName;
        document.getElementById('branchName').innerText = branchName;
        
        // Normal log command    
        let commands = [ 'log',  '--date-order', '--oneline',  '--pretty',    messageFormat];       
         
        // Show all log command 
        if (state.graph.showall){
            commands = [ 'log',  '--branches', '--tags',  '--date-order', '--oneline',  '--pretty',    messageFormat];
        }
        
        
                
        
        // TEST : Swimlanes
        
            
            try{
                let shortHistoryCommand= [...commands]; // Clone
                //shortHistoryCommand.push('-' + firstPassN);
                
                await simpleGit( folder).env('GIT_NOTES_REF', 'refs/notes/branchname').raw(  shortHistoryCommand, onLog);
                function onLog(err, result ){graphText = result; console.log(result); };  
            }catch(err){        
                console.log(err);
            }
            
            // Draw full graph, and label current branch
            let branchHistory = await readBranchHistory();
            await drawGraph_swim_lanes( document, graphText, branchHistory, history);
            //await drawGraph( document, graphText, branchHistory, history);
            
            
        document.getElementById('colorHeader').innerHTML = ''; // Clear 'colorHeader' html
        drawBranchColorHeader( branchNames); // Append to 'colorHeader' html
            return
        
        
        
        
        // Find short history graph
        try{
            let shortHistoryCommand= [...commands]; // Clone
            shortHistoryCommand.push('-' + firstPassN);
            
            await simpleGit( folder).env('GIT_NOTES_REF', 'refs/notes/branchname').raw(  shortHistoryCommand, onLog);
            function onLog(err, result ){graphText = result; console.log(result); };  
        }catch(err){        
            console.log(err);
        }
    
        // Draw full graph, and label current branch
        branchHistory = await readBranchHistory();
        await drawGraph( document, graphText, branchHistory, history);
        
        // Draw node-color header
        document.getElementById('colorHeader').innerHTML = ''; // Clear 'colorHeader' html
        drawBranchColorHeader( branchNames); // Append to 'colorHeader' html
    
            
    
    //
    // Take 2 : Parse all rows 
    //
         
         
        // Find complete history graph
        try{
            await simpleGit( folder).env('GIT_NOTES_REF', 'refs/notes/branchname').raw(  commands, onLog);
            function onLog(err, result ){graphText = result; console.log(result); };
        }catch(err){        
            console.log(err);
        }
        
         
        // Draw full graph, and label current branch
        branchHistory = await readBranchHistory();
        await drawGraph( document, graphText, branchHistory, history);
    

        // Draw node-color header
        document.getElementById('colorHeader').innerHTML = ''; // Clear 'colorHeader' html
        drawBranchColorHeader( branchNames); // Append to 'colorHeader' html
        
        // Populate branch-name edit menu
        populateDropboxBranchSelection();
    
    //
    // Draw current and pinned commits
    //
             
    
        // Select current history commit in opened graph
        try{
            let divSelect = document.getElementById( localState.historyHash );
            divSelect.classList.add('selected');  
            
            // Selected should not be graphed if
            // - same commit is pinned
            if (localState.pinnedCommit !== localState.historyHash ) {
                localState.selectedDiv = divSelect;
            }
        }catch(err){  
        }
        try{
            opener.selectInGraph(localState.historyHash);
        }catch(err){}
        
        // Select pinned commit in opened graph
        try{
            let divPin = document.getElementById( localState.pinnedCommit );
            divPin.firstElementChild.firstElementChild.src = PINNED_ENABLED_IMAGE; // Note -- defined in graph.html, dark/light mode image paths
            divPin.classList.add('selected');  
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
function getColorFileName( name){
    // Determine name of color class
    let colorFileName = unsetNodeImageFile;
    
    // Test, to show all colors on nodes without notes
    //let colorName = colorImageNameDefinitions[ row % colorImageNameDefinitions.length ];
    //colorFileName = `images/circle_colors/circle_${colorName}.png`;
    
    if ( branchNames.has(name) ){
        let colorNumber = branchNames.get(name) % colorImageNameDefinitions.length; // start again if too high number
        let colorName = colorImageNameDefinitions[ colorNumber];
        colorFileName = `images/circle_colors/circle_${colorName}.png`;
    }
    return colorFileName
}

// Callbacks
async function setPinned(hash, isPinned){ // Called from EventListener added in html
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
    localState.historyString = opener.historyMessage(history, localState.historyNumber);
    localState.historyLength = history.length;
    
    await opener._setMode('HISTORY');
    await opener._update();
}
function closeWindow(){
    localState.graphWindow = false;  // Show to main program that window is closed
    
    // Store setting
    state.graph.showdate = document.getElementById('showDate').checked;
    state.graph.showall = document.getElementById('showAll').checked;
    opener.saveSettings();

    
    // Remove from menu
    opener.deleteWindowMenu('Graph');
    
    win.close(); 
}
function toggleDate( show){
    if (show){
          document.getElementById('datesSwimLane').style.visibility = 'visible';  
          document.getElementById('datesSwimLane').style.width = 'fit-content'; 
          //document.getElementById('graphContent').style.marginLeft =  document.getElementById('datesSwimLane').getBoundingClientRect()['width'];  
    }else{
          document.getElementById('datesSwimLane').style.visibility = 'hidden';  
          document.getElementById('datesSwimLane').style.width = '0'; 
          //document.getElementById('graphContent').style.marginLeft =  document.getElementById('datesSwimLane').getBoundingClientRect()['width']; 
    }
    document.getElementById('graphContent').style.left = document.getElementById('mySvg').getBoundingClientRect()['x'] + document.getElementById('mySvg').getBoundingClientRect()['width'];

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

// Graphics
function drawGraph_swim_lanes( document, graphText, branchHistory, history){
    // document :       HTML document
    // graphText :      output from  raw git log graph
    // branchHistory :  output from  git log with --oneParent (used to find which commits are in current branch)
    // history :        the history after search, used to set different color for  commits found/not found in Search
   
  
    // GUI constants
            
        // Node image
        const IMG_H = 12;
        const IMG_W = 12;
            
        // Grid dimensions
        const COL_WIDTH = 20;
        const LEFT_OFFSET = 10;
        const TOP_OFFSET = 0.5 * IMG_H; 
        var NUMBER_OF_BRANCHES = 15 // Default, will be changed below
    
        // Get ROW_HEIGHT from graph.html css  
        r = document.querySelector(':root');
        const ROW_HEIGHT = getComputedStyle(r).getPropertyValue('--textRowHeight'); 
         
        // Merge and Branch connectors
        var R = 15; // arc radius for branch and merge.  Note : R <= COL_WIDTH & R <= ROW_HEIGHT
    

    // Initiate variables
        
        var graphContent = '';
        var dateContent = '';
        
        branchNames = new Map();   // Empty list of branch names
        childMap = new Map();  // List of children for commits
        commitArray = [];
 
        let splitted = graphText.split("\n");
        console.log(splitted)
        
        let previousDate = 'dummy'
    

    
    //
    // Loop each row - collect commit info
    //
        let line = 0; 
        
        for(var row = 0; row < (splitted.length - 1); row++) {
            
                            
            // Skip row added by the git log format option %N  (contains only characters '|' and ' ')
            if (isDumbRow(splitted[row])){
                continue // skip row
            }
    
            // Disect git-log row into useful parts
            [ date, hashInThisRow, thisRow, decoration, noteInThisRow, parents] = splitGitLogRow( splitted[row] );
     
     
            // Style if commit is not in history (because of search)
            let index = util.findObjectIndex( history, 'hash', hashInThisRow );
            let notFoundInSearch = isNaN( index);  // history shorter than full git log and branchHistory, because of search 
    
    
            // Figure out if known or current branch
            let colorFileName = unsetNodeImageFile;
            let tooltipText = 'unknown';


            // When branch is known from Notes
            let x0 = 0; 
            if ( branchNames.has(noteInThisRow) ){
                x0 = branchNames.get(noteInThisRow);  // In column coordinates
            }
             
             
            // Add message text 
            graphContent += parseMessage( hashInThisRow, thisRow, decoration, notFoundInSearch)
            
            
            // Add date (only print when date is different to previous)
            if (date == previousDate){
                date = '';
            }else{
                // Keep date, and remember new date
                previousDate = date; 
            }
            dateContent += '<div class="date"><pre>' +  date + '</pre></div>';
     
     
            // Record coordinates of commit with parents
            for (let i = 0; i < parents.length; i++){
                
                let x = 0; // default column
                if (branchNames.has(noteInThisRow) ){
                    x = branchNames.get(noteInThisRow);
                }
                
                let array = [ x , line ];
                if (childMap.has( parents[i] )){
                    childMap.get( parents[i] ).push( array) ;
                }else{
                    childMap.set( parents[i],  [ array ] ); // Coordinates x is branch number, line is obviously displayed line number
                } 
            }
            
            // Store commit info
            let thisCommit = {};
            thisCommit.x = x0;
            thisCommit.y = line; 
            thisCommit.branchName = noteInThisRow;
            thisCommit.hash = hashInThisRow;
            
            commitArray.push( thisCommit);
                           
            line++;
        }
 
    //
    // Initiate drawing
    //
        draw = SVG();
        
        // Define arcs used for branch and merge curves
        const arc = draw.defs().path(`M ${R} 0 A ${R} ${R} 0 0 1  0 ${R}`).fill('none').stroke({ color: '#888', width: 3, linecap: 'round', linejoin: 'round' });
        const arcBranch = draw.defs().use(arc).move(-R,-R);
        const arcMerge  = draw.defs().use(arc).flip('y').move(-R,-R);
    
        NUMBER_OF_BRANCHES = branchNames.size;
      
        // Draw vertical lines for each swim-lane
        for (var i = 0; i < NUMBER_OF_BRANCHES; i++) {
            const x0 = LEFT_OFFSET + i * COL_WIDTH;
            const x1 = x0;
            const y0 = TOP_OFFSET ;
            const y1 = TOP_OFFSET + splitted.length * ROW_HEIGHT;
            //draw.line( x0  , y0, x1, y1).stroke({ color: '#888', width: 0.25})
        }          
     
     
    //
    // Draw connections between nodes
    //   
    
        for(var j = 0; j < (commitArray.length - 1); j++) { 
 
            let x0 = commitArray[j].x;
            let line = commitArray[j].y;
            let branchName = commitArray[j].branchName;
            
            let hashInThisRow = commitArray[j].hash;
  
  
            // Draw SVG horizontal help-line TODO : 
            draw.line( LEFT_OFFSET + x0 * COL_WIDTH, 
                       TOP_OFFSET + line * ROW_HEIGHT , 
                       LEFT_OFFSET + NUMBER_OF_BRANCHES * COL_WIDTH , 
                       TOP_OFFSET + line * ROW_HEIGHT
                    ).stroke({ color: '#888', width: 0.25}); 
                    
     
            // Draw SVG line between nodes
            if ( childMap.has( hashInThisRow ) ){
                let coordinatePairs = childMap.get(hashInThisRow);
                for (let i = 0; i < coordinatePairs.length; i++){
                    let x1 = coordinatePairs[i][0];
                    let y1 = coordinatePairs[i][1];
                    
                    drawConnection( draw, x0, line, x1, y1, R)
                }
            }
        }
         
         
    //
    // Draw nodes (ontop of lines)
    //   
    
        for(var j = 0; j < (commitArray.length - 1); j++) { 
    
            let x0 = commitArray[j].x;
            let line = commitArray[j].y;
            let branchName = commitArray[j].branchName;
            
            let colorNumber = branchNames.get(branchName) % colorImageNameDefinitions.length; // start again if too high number
            let colorName = colorImageNameDefinitions[ colorNumber];
            let colorFileName = `images/circle_colors/circle_${colorName}.png`;
            
            // Draw commit node
            drawNode( draw, x0, line, branchName);
        }
           
      
      
    
    // 
    // Internal functions
    //   
    
    function drawConnection( draw, x0, y0, x1, y1, R){
        // Inputs : column and row for first and second point
        
        // Convert to pixel coordinates
        let X0 = LEFT_OFFSET + x0 * COL_WIDTH;
        let Y0 = TOP_OFFSET + y0 * ROW_HEIGHT
        
        let X1 = LEFT_OFFSET + x1 * COL_WIDTH;
        let Y1 = TOP_OFFSET + y1 * ROW_HEIGHT
                
                
        // Draw connection   
        if (x1 == x0){
            draw.line( X0, Y0, X1, Y1).stroke({ color: '#888', width: 3});  
        }     
        // Branch
        if (x1 > x0){
            draw.line( X0, Y0, X1 - R, Y0).stroke({ color: '#888', width: 3}); // horizontal
            draw.use(arcBranch).move( X1, Y0  );
            draw.line( X1, Y0 - R, X1, Y1).stroke({ color: '#888', width: 3}); // vertical
        }
        // Merge
        if (x1 < x0){
            draw.line( X0, Y0, X0, Y1 + R).stroke({ color: '#888', width: 3});  // vertical
            draw.use(arcMerge).move( X0, Y1  );
            draw.line( X1, Y1, X0 - R, Y1).stroke({ color: '#888', width: 3}); // horizontal
        }
    };
    
    function drawNode( draw, x0, y0, branchName){
        
        // Figure out if known or current branch
        let colorFileName = unsetNodeImageFile;
        let tooltipText = 'unknown';
        
        if ( util.findObjectIndexStartsWith(branchHistory,'hash', hashInThisRow) >= 0){
            // current branch
            colorFileName = 'images/circle_green.png'; // Draw node
        }

        // When branch is known from Notes
        let col = LEFT_OFFSET ; 
        if ( branchNames.has(branchName) ){
            
            // Get image file name
            let colorNumber = branchNames.get(branchName) % colorImageNameDefinitions.length; // start again if too high number
            let colorName = colorImageNameDefinitions[ colorNumber];
            colorFileName = `images/circle_colors/circle_${colorName}.png`;
            tooltipText = branchName;
            
            // Get column 
            col = LEFT_OFFSET + x0 * COL_WIDTH;   // In pixel coordinates

        }else{
            //continue
        }

        
        // Convert from col / row to pixel coordinates
        let X0 = LEFT_OFFSET + x0 * COL_WIDTH;
        let Y0 = TOP_OFFSET + y0 * ROW_HEIGHT
        
        draw.image(colorFileName).
        size(IMG_W,IMG_H).
        move( X0 - 0.5 * IMG_W, Y0 - 0.5 * IMG_H); // Center image on coordinate point
    };
    
    
    // 
    // Attach data to HTML
    //
    document.getElementById('datesSwimLane').innerHTML = dateContent;      

    document.getElementById('mySvg').innerHTML = ''; // Clear
    draw.addTo( document.getElementById('mySvg') ).
        size( LEFT_OFFSET + NUMBER_OF_BRANCHES * COL_WIDTH , TOP_OFFSET + (line +1) * ROW_HEIGHT  )

    document.getElementById('graphContent').innerHTML = graphContent;    

    toggleDate( state.graph.showdate); // Show / hide date column

}
function drawGraph( document, graphText, branchHistory, history){
    
    // document :       HTML document
    // graphText :      output from  raw git log graph
    // branchHistory :  output from  git log with --oneParent (used to find which commits are in current branch)
    // history :        the history after search, used to set different color for  commits found/not found in Search
    
    
    graphContent = '';
    
    graphText +=  "\n" + BUFFERTROW + "\n" + BUFFERTROW; 
    
    console.log(graphText)
    
    let splitted = graphText.split("\n");
    console.log(splitted)
    
    let previousDate = 'dummy'
    
    branchNames = new Map();   // Empty list of branch names
    
    
    // Loop each row
    
    for (var row = 0; row < (splitted.length - 1); row++) {
        
                        
        // Skip row added by the git log format option %N  (contains only characters '|' and ' ')
        if (isDumbRow(splitted[row])){
            continue // skip row
        }

        let sumFound ='';
        
        // Disect git-log row into useful parts
        [ date, hashInThisRow, thisRow, decoration, noteInThisRow] = splitGitLogRow( splitted[row] );
        

        // Only show date when new date
        if (date == previousDate){
            date = '';
        }else{
            // Keep date, and remember new date
            previousDate = date; 
        }

        
                    
        // Style if commit is not in history (because of search)
        let index = util.findObjectIndex( history, 'hash', hashInThisRow );
        let notFoundInSearch = isNaN( index);  // history shorter than full git log and branchHistory, because of search 
        
        let styling = '';
        if (notFoundInSearch){
            styling = ' notInSearch';
        }
        

        
        //
        // Parse row
        //
        
        // Empty column
        graphContent += '<div class="firstcol"></div> ' // First column on row
        
         // Show/hide date
        if (state.graph.showdate){
            graphContent += '<div class="date"><pre>' +  date + '</pre></div>';
        }
        
        
        // Parse git log graphics
        for(var i = 0 ; i < thisRow.length ; i++){
            let total = ''; // Collect graph HTML for current row
            let found = ''; // Record found item (used for logging)

            //
            // Draw node
            //
            if (  a(0,'*') ){
                let id = `id="img_${hashInThisRow}" `;
                
                // Figure out if known or current branch
               let colorFileName = unsetNodeImageFile;
               let tooltipText = 'unknown';
                
                if ( util.findObjectIndexStartsWith(branchHistory,'hash', hashInThisRow) >= 0){
                    // current branch
                    colorFileName = 'images/circle_green.png'; // Draw node
                }


                // Test, to show all colors on nodes without notes
                //let colorName = colorImageNameDefinitions[ row % colorImageNameDefinitions.length ];
                //colorFileName = `images/circle_colors/circle_${colorName}.png`;
                
                if ( branchNames.has(noteInThisRow) ){
                    let colorNumber = branchNames.get(noteInThisRow) % colorImageNameDefinitions.length; // start again if too high number
                    let colorName = colorImageNameDefinitions[ colorNumber];
                    colorFileName = `images/circle_colors/circle_${colorName}.png`;
                    
                    tooltipText = noteInThisRow;
                }
                    
                total += `<img class="node" ${id} src="${colorFileName}" title="${tooltipText}">`; // Draw node   
                
                
            }

            
            //
            // Draw lines
            //
            
            // Select what to draw -- first hit wins (if-elseif chain)
            // C1-C3 can draw more than one element (within same elseif test)
            //
            // Generally standing on character at coordinate a0, and comparing with characters at next rows a and b
            // Exception to this is noted below (D2, D3)
            //
            // Graph text from git log must be padded with spaces on left and bottom, to allow look left, and look ahead
            
            // ------------------------------------------------------------------------------   
            //    A1) -0-     A2) -0-     A3) --0     A4) --0
            // a:     \|           |/           \         _|/
            // b:      |\         /|          _|/      
            //
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
                    
            }else if (  a(0,'\\')  && b(-2,'_')  && b(-1,'|')  && b(0,'/') ) {
            // A3) slash  - skip connecting pipe in some cases
                found = 'A3';
                total += '<img class="slash" src="images/slash.png">';
                
            }else if (  a(0,'/')  && a(-1,'|')  && a(-2,'_') ) {
            // A4) slash  - skip connecting pipe draw, second part
                found = 'A4';
                // Draw nothing
             
            // ------------------------------------------------------------------------------   
            //    B1) 0--     B2) --0    X = anything but space  
            // a:     \             /    B1: Y = [ space | / ]   
            // b:      XY         YX     B2: Y = [ space | \ ]
            //
            }else if (  a(0,'\\') && !b(1,' ') && ( b(2,' ') || b(2,'|') || b(2,'/')  || b(2,'_') ) ) {   
            // B) back-slash 
                found = 'B1';
                total += '<img class="backslash" src="images/backslash.png">';
                
            }else if (  a(0,'/') && !b(-1,' ') && ( b(-2,' ') || b(-2,'|') || b(-2,'\\') || b(-2,'_' )  )  ){
                // B) slash 
                found = 'B2';
                total += '<img class="slash" src="images/slash.png">';
             
            // ------------------------------------------------------------------------------   
            //    C1) -0      C2)  0      C3) 0-          C1: X = anything but [ space \ _ ]
            // a:      |           |          \           C2: X = anything but space 
            // b:     X            X           X          C3: X = anything but [ space / _ ]    
            //  
            // Note: Zero, one or more of C1-C3 can be true
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
                
            // ------------------------------------------------------------------------------   
            //    D2) -0-     D3) -0-     D1) -0-     NOTE: D2 and D3 is standing on b0 and comparing with previous
            // a:       /         \            _  
            // b:      _           _              
            //              
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
              
            // ------------------------------------------------------------------------------   
            //    E1)  0     E2)   0  
            // a:      \           /       
            // b:      /           \              
            //      
            }else if (  a(0,'\\') && b(0,'/')  ) {
            // E) pipe 
                found = 'E1';
                total += '<img class="pipe" src="images/pipe.png">';
                
            }else if (  a(0,'/') && b( 0,'\\')  ) {
            // E) pipe 
                found = 'E2';
                total += '<img class="pipe" src="images/pipe.png">';
                
            // ------------------------------------------------------------------------------   
            //    F1) -0-     F2)  0      F3) -0-    
            // a:      *           *           *       X = one of [ space | * ]
            // b:     /X           X           X\    
            //  
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
                
            // ------------------------------------------------------------------------------   
            //    G1)  0-    G2)   0-  
            // a:      -X          X-             X = one of [ * \ | / _ - . ]
            // b:                 
            //      
            }else if ( 
                a(0,'-') &&
                ( a(1,'*') || a(1,'\\')  || a(1,'|') || a(1,'/') || a(1,'_')  || a(1,'-') || a(1,'.') )   
            ){
            // G1) short bridge (checks for non-space node to right -- that way stopping it from being commit message)
                found = 'G1';
                total += '<img class="bridge" src="images/bridge.png">';
            }else if (  
                ( a(0,'*') || a(0,'\\')  || a(0,'|') || a(0,'/') || a(0,'_')  || a(0,'-') || a(0,'.')   )   && 
                a(1,'-') 
            ){
            // G2) short bridge (non-space node to left -- I think this is correct, but have not seen this in the wild)
                found = 'G2';
                total += '<img class="bridge" src="images/bridge.png">';
                
            // ------------------------------------------------------------------------------   
            //    H1)  0-     H2)  -0      H3)  0    
            // a:      .            .           .      
            // b:       \          /            |    
            //  
            }else if (  a(0,'.') && b( 1,'\\')  ) {
            // H1) point corner and '\'
                found = 'H1';
                total += '<img class="backslash" src="images/backslash.png">';
            }else if (  a(0,'.') && b( -1,'/')  ) {
            // H2) point corner and  '/'
                found = 'H2';
                total += '<img class="slash" src="images/slash.png">';
            }else if (  a(0,'.') && b( 0,'|')  ) {
            // H3) point corner and '|'
                found = 'H3';
                total += '<img class="slash" src="images/pipe.png">'; 
                
            // ------------------------------------------------------------------------------ 
            //    COMMIT MESSAGE)      
            //                                      not one of [ * \ | / _ space ] 
            //    
            }else if (  !a(0,'*') && !a(0,'\\')  && !a(0,'|') && !a(0,'/') && !a(0,'_') && !a(0,' ')   ){
            // TEXT if nothing else
            
                // Different class when showing test cases
                let cl = 'text';
                if (test != 0) { 
                    cl = 'courier';
                }
                
                // Print Text part
                let rowText = '(' + row + ') ';
                sumFound += ' ' + thisRow.substring(i);
                //graphContent += '<div class="' + cl + styling + '" id="' + hashInThisRow + '" >' + drawCommitRow( hashInThisRow, decoration, thisRow.substring(i), DEV) + ' </div>' ; 
                //graphContent += '<pre class="decoration"> &nbsp;' + decoration + '</pre>'
                
                graphContent += parseMessage( hashInThisRow, thisRow.substring(i), decoration, notFoundInSearch)
                
                i = thisRow.length; // set end-of-loop
                continue // skip rest of row
                
            }else if ( i == (thisRow.length - 1) ) {

                // Print out info for non-commit rows
                graphContent += '<div class="text">' +  drawNonCommitRow(hashInThisRow, thisRow.substring(i), DEV) + '</div>';
                
            }
    
            // Make div with graphContent from above
            graphContent += '<div>' + total + '</div>';
            
            if (found !== ''){
                sumFound += ' ' + found;
            }
        }
        
        // Log parsing
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
    function splitGitLogRow( gitLogRow ){
        

        
        // gitLogRow -  is a full row from log
        
            // Example row format :
            // T=Sun Mar 28 01:11:41 2021 S=Fix main window commit D= (HEAD -> develop) H=c52c473b6e43f8e34e663c537a5bfb2968e50fc1
            // | * Removed edge from questionmark buttons T=2021-05-12T14:56:13+02:00 D= H=d02f9251ba8bb00750052398b799c9105f84beda P=c3a3f0a65aba567c525ad1df0e324c028e4c185e N=feature/main_window_zoom
     
     
            // Pick row apart from back to start
     
            // Notes : Separate log row from Notes at end
            let startOfNote = gitLogRow.lastIndexOf('N=');  // From git log pretty format .... H=%H (ends in long hash)
            let noteInThisRow = gitLogRow.substring(startOfNote + 2); // Skip N=    
            
            if ( (startOfNote !==-1) && ( noteInThisRow.length > 0) ){
                if ( !branchNames.has(noteInThisRow) ){
                    // New noteInThisRow
                    branchNames.set(noteInThisRow, branchNames.size); // Register branchName and next integer number
                }
            }
            
            // Parents : Separate log row from long hash (at end now when Notes removed)
            let startOfParents = gitLogRow.lastIndexOf('P=');  // From git log pretty format .... H=%H (ends in long hash)
            let parentInThisRow = gitLogRow.substring(startOfParents + 2, startOfNote - 1); // Skip H=
            
            // Hash : Separate log row from long hash (at end now when Parents removed)
            let startOfHash = gitLogRow.lastIndexOf('H=');  // From git log pretty format .... H=%H (ends in long hash)
            let hashInThisRow = gitLogRow.substring(startOfHash + 2, startOfParents - 1); // Skip H=
            
            // Decoration : Separate log row from decorate (at end now when hash removed)
            let startOfDecore = gitLogRow.lastIndexOf('D=');  // From git log pretty format .... D=%d (ends in decoration)
            let decoration = gitLogRow.substring(startOfDecore + 2, startOfHash - 1); // Skip D=
            decoration = decoration.replace(/->/g, '&#10142;'); // Make arrow if '->'
             
            // Date : Separate log row from date (at end now when decorate removed)
            let startOfDate = gitLogRow.lastIndexOf('T=');  // From git log pretty format .... T=%d (ends in decoration)
            let date = gitLogRow.substring(startOfDate + 2, startOfDecore -1); // Skip T=%aI
            date = date.substring(0,10);
            
                            
            if (startOfDate == -1){
                date = ''; // When no date found (set blank date)
            }
            
            // Current row
            let thisRow = gitLogRow.substring(0, startOfDate);
            thisRow = thisRow.replace(/</g, '&lt;').replace(/>/g, '&gt;');  // Make tags in text display correctly
            
            if (noteInThisRow.length > 0){
                thisRow += ` (${noteInThisRow})`;
            }
    
            // Parse missing features (= lines without commits)
            if (startOfHash == -1){
                thisRow = gitLogRow; // When no hash found (lines without commits)
            }
            
            // Split parents into array
            let parents = parentInThisRow.split(' ');
    
            
            return [ date, hashInThisRow, thisRow, decoration, noteInThisRow, parents]
        
    }
    function isDumbRow(s){
        // Dumb row is defined as consisting only of '|' connections, without any nodes
        // This can occur because of git log format, where %N causes an extra line-break - a "dumb" line
        for(let j = 0 ; j < s.length ; j++){
            if ( ( s[j] !== '|' ) && ( s[j] !== ' ' ) ){ // Other character than '|' or ' ' => not dumb row
                return false
            }
        }
        return true
    }
    function drawPinnedImage(hash){
        
        const PIN_IMG1 = '<img class="pinned-icon" height="17" width="17" style="vertical-align:middle;"';
        const PIN_IMG2 = ' src="' + PINNED_DISABLED_IMAGE + '"> ';
        return PIN_IMG1 + ` onclick="setPinned('` + hash + `')" ` + PIN_IMG2;
        //return PIN_IMG1 + ` id="` + hash + `" ` + PIN_IMG2;
    }        
    function parseMessage( hash, text, decoration, notFoundInSearch){
        
        let cl = 'text';
        
        let styling = '';
        if (notFoundInSearch){
            styling = ' notInSearch';
        }
        
        
        let html = '<div class="' + cl + styling + '" id="' + hash + '" >' + `<pre>` + drawPinnedImage(hash) +  text +  `</pre>` + ' </div>' ; 
        html += '<pre class="decoration"> &nbsp;' + decoration + '</pre>'
        //html += decoration 
        
        //return '<div>' + html + '</div> <br>'
        return html 
    };
 
    // TODO : remove (?)
    function drawCommitRow(hash, decoration, text, isDev){
        if (isDev){
            //return `<pre onclick="setHistoricalCommit('` + hash + `')">` + drawPinnedImage(hash) +  text +  `   ` + sumFound +  `</pre><div>`;
            return `<pre>` + drawPinnedImage(hash) +  text +  `   ` + sumFound +  `</pre><div>`;
        }else{
            //return `<pre onclick="setHistoricalCommit('` + hash + `')">` + drawPinnedImage(hash) +  text +  `</pre>`;
            return `<pre>` + drawPinnedImage(hash) +  text +  `</pre>`;
        }
    }
    function drawNonCommitRow(hash, text, isDev){
        if (isDev){
            return '<pre>'  +  text + '   ' + sumFound +  '</pre>';
        }else{
            return '<pre>'  +  text + '</pre>';
        }
    }
       
       

// Stored branch name
function drawBranchColorHeader( branchNames){
    
    
    const colorFileName = 'images/circle_green.png';
    
    let html = 
    `<div>  <img class="node" src="${colorFileName}"> </div>  
    <div class="colorHeaderText"> 
        <pre style="position: absolute; "> Unknown parent branch </pre> 
    </div> <br>
    
    `;
    
    html += 
    `<div>  <img class="node" src="${unsetNodeImageFile}"> </div>  
    <div class="colorHeaderText"> 
        <pre style="position: absolute; "> Unknown branch </pre> 
    </div> <br>

    `;  
    
    html += 
    `<div>   </div>  
    <div class="colorHeaderText"> 
        <pre style="position: absolute; "> </pre> 
    </div> <br>
    
    `;        
          

    branchNames.forEach(handleMapElements);

    function handleMapElements(value, key, map) {
        console.log(`m[${key}] = ${value}`);
        let colorFileName = getColorFileName(key)
        html += `<div> <img class="node" src="${colorFileName}"> </div>  <div class="colorHeaderText"> <pre style="position: absolute; "> ${key} </pre> </div> <br>`;
    }
    
    document.getElementById('colorHeader').innerHTML = html;
    
}
async function populateDropboxBranchSelection(){

    let html = '';
    
    // Local branches
    let localBranches;
    try{
        localBranches = await simpleGit(state.repos[state.repoNumber].localFolder).branchLocal( );
        console.log(localBranches);  
    }catch(err){        
        console.log('Error determining local branches, in branchClicked()');
        console.log(err);
        return
    }
    
    function onBranchList(err, result ){
        localBranches = result;
    }

    html += '<optgroup label="Local branches">';
    localBranches.all.forEach( function(value){
        html += `<option value="${value}">${value}</option>`
    });
    html += '</optgroup>';
       
    //  Commands
    html += '<optgroup label="Commands">';
    html += `<option value="remove">Unset branch name</option>`
    html += '</optgroup>';
    
    document.getElementById('branchDropboxSelection').innerHTML = html;
}
async function applyBranchNameEdit(){
    await loopSelectedRange( setNodeBranchNames);
    drawBranchColorHeader( branchNames);
}
async function loopSelectedRange( myFunction){
    console.log(`loopSelectedRange on function = ${Function.name}`);

    
    let oldest = localState.selectedDiv.id;
    let newest = localState.shiftSelectedDiv.id;
    
    let hashes = `${oldest}^..${newest}`;

    let commands = [ '--ancestry-path', '--oneline',  '--pretty', '--format="%H"',  hashes];    
         
    // Sometimes a complicated commit path is when oldest == newest. Simplify this known case
    if ( newest === oldest ){
        hashes = oldest;
        commands = [ '--oneline',  '--pretty', '--format="%H"',  hashes];
    }
    
    console.log(`oldest =  ${ document.getElementById(oldest).innerText} ` );
    console.log(`newest =  ${ document.getElementById(newest).innerText} ` );
    
    
    console.log(`hashes range = ${hashes}`);
    let foundHashes = '';
         
    // Find hashes
    try{
        await simpleGit( state.repos[ state.repoNumber].localFolder).log(  commands, await onLog);
    }catch(err){        
        console.log(err);
    }
    
    // Called by git log, delegating work to myFunction :
    async function onLog(err, result ){ 
        console.log(result); 
        foundHashes = result.latest.hash.split('\n');
        console.log(foundHashes); 
        
        // Sometimes a complicated commit path is when oldest == newest. Simplify this known case
        if ( newest === oldest ){
            foundHashes = [ oldest ];
        }
        
        // Iterate found hashes and call myFunction
        for (const hash of foundHashes) {
            let cleanedHashString = hash.replace(/\"/g,''); // Remove extra '"' -signs
            try{
                console.log(`CALL  in loopSelectedRange(${myFunction.name}).onLog  with hash = ${cleanedHashString}   ${document.getElementById(cleanedHashString).innerText}`);
                await myFunction(cleanedHashString);
                //await opener.waitTime(1000);
                
                // Redraw when last is done (this is only way I got it not to call  injectIntoJs(document)  prematurely)
                if ( (cleanedHashString == oldest) && ( myFunction.name == 'setNodeBranchNames')){
                    console.log('DONE WITH LAST -- CALL injectIntoJs(document) ');
                    injectIntoJs(document);
                    await myFunction(cleanedHashString);
                }
                
            }catch(err){
                console.log(`ERROR in loopSelectedRange(${myFunction.name}).onLog  with hash = ${cleanedHashString}   ${document.getElementById(cleanedHashString).innerText}`);
            }
        }
        
    }
        
}
    function markNodeTexts(hashString) {
        let id = hashString;
        document.getElementById(id).classList.add('multimarked');
    }; 
    async function setNodeBranchNames(hashString) {
        var start = window.performance.now();
        var end;
 
        console.log(`Enter setNodeBranchNames with hash = ${hashString}  ${document.getElementById(hashString).innerText}`);
        
        let name = document.getElementById('branchDropboxSelection').value;
        
        //
        // Do commands and bail out
        //
        if ( name == 'remove'){
            // Remove from git notes (git notes --ref=branchname remove )
            try{   
                await simpleGit( state.repos[state.repoNumber].localFolder )
                    .raw( [  'notes', '--ref', 'branchname', 'remove' , '--ignore-missing', hashString] , onNotes);
                function onNotes(err, result) {console.log( `Remove note for hash = ${hashString} `);console.log(result);};
                    
                let colorFileName = unsetNodeImageFile;
                document.getElementById( `img_${hashString}`).src = colorFileName;
                
            }catch(err){
                console.log('Error in setNodeBranchNames() -- removing branch-note');   
                console.log(err);
            }  
            // Bail out when command done
            return;
        }
        
        //
        // Set branch name
        //
        let id = hashString;
        let img_id = `img_${hashString}`;
                            
        // Add branchname to map if not existing
        if ( !branchNames.has(name) ){
            branchNames.set(name, branchNames.size);  
        }
       
        // Set image
        let colorNumber = branchNames.get(name) % colorImageNameDefinitions.length; // start again if too high number
        let colorName = colorImageNameDefinitions[ colorNumber];
        document.getElementById(img_id).src = `images/circle_colors/circle_${colorName}.png`;
        
        // Set name
        await opener.gitRememberBranch( hashString, name);
        end = window.performance.now();
        
        // Remove selected 
        document.getElementById(id).classList.remove('multimarked');
        
        // Clean shiftSelectedDiv (this will be done every time, but its simplest that way)
        localState.shiftSelectedDiv = '';
        
        
        console.log(`Exit setNodeBranchNames with hash = ${hashString}`);
        
        console.log(`Execution time: ${end - start} ms`);

    };

