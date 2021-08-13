// ---------
// INIT
// ---------



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

var MODE = 'git-log-graph'; // Default, is set by state.graph.swimlane;

const UNIQUE_EOL = 'X3.17X';  // Used as EOL in git log to split rows to make it improbable to mix up output with EOL
const unsetNodeImageFile = 'images/circle_grey.png';

var gui = require("nw.gui"); 
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
var childMap ;          // Store mapping from parent to child hashes

var nodeMap;            // Map hash to commit (same object as in commitArray, but can be looked up)
var commitArray;        // Array with same commits as in nodeMap
var columnOccupiedStateArray; // Array used to mark occupied columns, stores last known occupied row-number of branch segment

const BUFFERTCOLS = '  '; // Allows to look to the left of current character
const BUFFERTROW = '                                                                                                                                                                    ';

let NUMBER_OF_KNOWN_BRANCHES = 0;  // This marks the last branch with known branchname in branchNames map

// Global for whole app
var state = global.state; // internal name of global.state
var localState = global.localState; 

// Global in this window
let history = '';
var graphText;  // Output from git log

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
        document.getElementById('graph_mode_switch').checked = state.graph.swimlanes;
        colorSwitchTexts(); // Set switch-text-colors (see graph.html)
        
        if  ( state.graph.swimlanes ){
            MODE = 'swim-lanes';
        }else{
            MODE = 'git-log-graph';
        }
              
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
    
        // Commit log output format
        const messageFormat = '--format=S=%s T=%aI D=%d H=%H P=%P N=%N' + UNIQUE_EOL;  // %aI = author date, strict ISO 8601 format

        
    //
    // Set HTML
    //

        // Write header text
        let repoName = opener.window.document.getElementById('top-titlebar-repo-text').innerText;
        let branchName = opener.window.document.getElementById('top-titlebar-branch-text').innerText;
        document.getElementById('repoName').innerText = repoName;
        document.getElementById('branchName').innerText = branchName;

        
    //
    // Create git-log commands
    //
           
        // Normal log command    
        let commands = [ 'log',  '--date-order', '--oneline',  '--pretty', '--graph',  messageFormat];       
         
        // Show all log command 
        if (state.graph.showall){
            commands = [ 'log',  '--branches', '--tags',  '--date-order', '--oneline',  '--pretty', '--graph',  messageFormat];
        }
        

        
    //
    // Draw graph in HTML
    //   
            
        try{
            await simpleGit( folder).env('GIT_NOTES_REF', 'refs/notes/branchname').raw(  commands, onLog);
            function onLog(err, result ){graphText = result; console.log(result); };  
        }catch(err){        
            console.log(err);
        }
        
        // Draw full graph, and label current branch
        let branchHistory = await readBranchHistory();
        await drawGraph( document, graphText, branchHistory, history);
        
            
        document.getElementById('colorHeader').innerHTML = ''; // Clear 'colorHeader' html
        await drawBranchColorHeader( branchNames); // Append to 'colorHeader' html
        
        
        // Populate branch-name edit menu
        await populateDropboxBranchSelection();
 
    
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
function stop(commit){  // Use for conditional-debug-stop in debugger
    // Debug stop on commit selected in graph-window (use in conditional break-point in debugger)
    //
    // Create a conditional break point, and write condtion : stop(commit)
    // (where variable commit is within scope)
    return (opener.localState.historyHash == commit.hash)
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
    state.graph.swimlanes = document.getElementById('graph_mode_switch').checked;  // True if swimlanes, false if normal git
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
async function gitCommitMessage(hash){ // TODO: remove 
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
async function drawGraph( document, graphText, branchHistory, history){
    // document :       HTML document
    // graphText :      output from  raw git log graph
    // branchHistory :  output from  git log with --oneParent (used to find which commits are in current branch)
    // history :        the history after search, used to set different color for  commits found/not found in Search
   
  
    // GUI constants
            
        // Node image
        const IMG_H = 12;
        const IMG_W = 12;
            
        // Grid dimensions
        const COL_WIDTH = 20; // 20
        const LEFT_OFFSET = 10;
        const TOP_OFFSET = 0.5 * IMG_H; 
        var NUMBER_OF_BRANCHES = 1 // Default, will be changed below
    
        // Get ROW_HEIGHT from graph.html css  
        r = document.querySelector(':root');
        const ROW_HEIGHT = getComputedStyle(r).getPropertyValue('--textRowHeight'); 
         
        // Merge and Branch connectors
        var R = 15; // arc radius for branch and merge.  Note : R <= COL_WIDTH & R <= ROW_HEIGHT
        
        //console.log(graphText);

    // Initiate variables
        
        var graphContent = '';
        var dateContent = '';
        
        branchNames = new Map();   // Empty list of branch names
        childMap = new Map();  // List of children for commits
        nodeMap = new Map();  // Map of commit nodes
        commitArray = [];
        
        columnOccupiedStateArray = [];  
 
        let splitted = graphText.split( UNIQUE_EOL + '\n');
        
        let previousDate = 'dummy'
    

    
    //
    // Pass 1 : Loop each row - collect commit info
    //
    
    /*
        Get values from graphText (which comes from 'git log graph'), and store commits
        
        Commits stored two ways :
            commitArray[row]
            nodeMap.set( thisCommit.hash, thisCommit);
        
        For each row, the struct is populated :
            thisCommit.hash                 - commit hash
            thisCommit.parents              - array of parents
            thisCommit.notFoundInSearch     - true is the commits reachable from pragma-git ( false if on other branch, or filtered by search)
            thisCommit.message              - commit message
            thisCommit.decoration           - commit decoration (branch HEAD, tag, etc)
            thisCommit.branchName           - derived from 1) Notes, 2) from decoration. Decoration wins if conflict
            thisCommit.unknownBranchName    - if branch name not determined
            thisCommit.y                    - row
     
     */
        let line = 0; 
        
        
        let branchList =  await opener.gitBranchList();
        let localBranchList = branchList.local;
        
        for(var row = 0; row < splitted.length; row++) {
    
            // Disect git-log row into useful parts
            [ date, hashInThisRow, thisRow, decoration, noteInThisRow, parents, graphNodeIndex] = splitGitLogRow( splitted[row] );
     
            // Style if commit is not in history (because of search)
            let index = util.findObjectIndex( history, 'hash', hashInThisRow );
            let notFoundInSearch = isNaN( index);  // history shorter than full git log and branchHistory, because of search 

                     
            // Add date (only print when date is different to previous)
            if (date == previousDate){
                date = '';
            }else{
                // Keep date, and remember new date
                previousDate = date; 
            }
            dateContent += '<div class="date"><pre>' +  date + '</pre></div>';
     
     
            /* Record children hashes
               (Allows me to go up (children) and down (parents)
               So, the git parent info from each commit NODE, is transformed to a
               childMap of the CHILDREN of a commit NODE 

                   
                     NODE                       CHILDREN                   
                    / |  \   git commits   =>    \ | /      childMap(NODE-hash)  =>  array of CHILDREN-hashes
                    PARENTS                       NODE      nodeMap(NODE-hash)   =>  commit node           
                            
             */
             
            // Make new entry for mapping from node to children
            for (let i = 0; i < parents.length; i++){
                if (childMap.has( parents[i] )){
                    childMap.get( parents[i] ).push( hashInThisRow) ;
                }else{
                    childMap.set( parents[i],  [ hashInThisRow ] ); 
                } 

            }
            
            
            
            // Store commit info & NUMBER_OF_BRANCHES (additional info will be added in PASS 2)
                let thisCommit = {};
    
                thisCommit.hash = hashInThisRow;
                thisCommit.parents = parents;
                thisCommit.notFoundInSearch = notFoundInSearch;
                thisCommit.message = thisRow;
                thisCommit.decoration = decoration;
                
                
            // Alt 1 : branchName in Note
                thisCommit.branchName = noteInThisRow;  // branchName from note, or ""

            
            // Alt 2: Override branchName from decoration
                thisCommit.unknownBranchName = true;
                let test = decoration; 
                localBranchList.forEach( 
                    (entry) => { 
                        if (test.includes(entry)) { 
                            thisCommit.branchName = entry;
                            thisCommit.unknownBranchName = false;
                        };
                    } 
                )
                
                 // Register branchName and next integer number
                if ( !branchNames.has(thisCommit.branchName) && ( thisCommit.branchName !== "") ){
                    branchNames.set(thisCommit.branchName, branchNames.size);
                }
                
                thisCommit.unknownBranchName = !branchNames.has(thisCommit.branchName);
                
                
            
            // Row number
            
                thisCommit.y = line; 

            

            // Store thisCommit
            commitArray.push( thisCommit);
            nodeMap.set( hashInThisRow, thisCommit);
                           
            line++;
        } // End for
        
      
         NUMBER_OF_KNOWN_BRANCHES = branchNames.size;
         let HIGHEST_LANE = NUMBER_OF_KNOWN_BRANCHES;
 

     //
     // PASS 2 : Determine x-position for a commmit
     //          
     //       
     
        /*
            Definitions :
            
              A segment goes beween a branchPoint and a mergePoint, following first-parent
         
              *                                            (mergePoint)
              |\
              | *  startOfSegment         on segment                          START when DEBUG==true
              | *                         on segment
              | *  segment ends here      on segment 
              |/
              *    afterEndOfSegment      not on segment   (branchPoint)      END when DEBUG==true
               
              First-parents afterEndOfSegment may have an unknown branch name.  Lane 0 is reserved for unknown first-parent branches.
        */
    
        /*      
            Add following fields to commit-struct created in PASS 1 :
                commit.x                        - the lane to display the commit node
                commit.occupiedColumns          - array, each element represent a lane. Each stores a number which is the row of next commit in that lane.
                                                  If the number is the same as the array element number, the lane is free 
                                                  (example: [229, 1, 2, 512], means that lane 1 and 2 are free)
                commit.START                    - see above drawing. Start of segment. Commit before mergepoint
                commit.END                      - see above drawing. End of segment. Branchpoint
         
         */
         
        for(var i = 0; i < commitArray.length; i++) {
            
            // Config variables
            let DEBUG = true;       // true = show debug info on commit messages
            let COMPRESS = false;   // true = compressed lanes (TODO true is not perfect)
            
            if (MODE == 'git-log-graph') {  // Use switch in graph.html to set compress on / off
                COMPRESS = true;
            }
            
            let commit = commitArray[i];
            
            // Can be used for determining (5) and (6) ? .  Not used so far -- maybe remove ?
            commit.START = false;
            commit.END = false;
            
            if (DEBUG) 
                commit.message = i + ' -- ' + commit.message;  // DEBUG : Show number
            
            
            // Start of Segment -- get lane + assign branch if unknown
            if ( isStartOfSegment(commit)  ){ 
                commit.START = true;
                
                if (DEBUG) 
                    commit.message = 'START -- ' + commit.message;  // DEBUG : Mark that first in segment
                
                // Assign a branchname if unknown
                if ( !branchNames.has(commit.branchName)){
                    commit.branchName = commit.hash;  // Name of branch = hash of latest commit
                    branchNames.set( commit.branchName, getBestLane(commit));
                    NUMBER_OF_BRANCHES = branchNames.size +1; 
                }
                
                // Set lane
                if (MODE == 'swim-lanes') {  
                    commit.x = branchNames.get( commit.branchName);
                }   
                if (MODE == 'git-log-graph') {  
                    commit.x = getBestLane(commit) ;
                }
                

                console.log( `i = ${i}   NEW SEGMENT ${commit.x} AT   ${commit.message}  [${columnOccupiedStateArray.toString()}]`);

            }
            

            // On a segment
                 
                // If known branch
                if (commit.x == undefined){
                    commit.branchName = "";
                }
                  
                // If unknown branch name -- get branchname and lane from child 
                nameUnknownBranchFromPriorInSegment(commit);

                
                // Mark as occupied
                markLaneAsOccupied(commit);             
                
                
            
            // If after end of segment
                if ( isAfterEndOfSegment(commit)){ // NOTE: isEndOfSegment performs some actions ( marks lanes as free)
                    
                    commit.END = true;

                   // Set first-parent (if branch was not explicitly named)
                   //if ( isFirstParent(commit) && branchNames.has(commit.branchName) && (branchNames.get(commit.branchName) > NUMBER_OF_KNOWN_BRANCHES)){
                   //let isUnknownBranch = (branchNames.get(commit.branchName) > NUMBER_OF_KNOWN_BRANCHES);
                   
                   let isUnknownBranch = commit.unknownBranchName;
                   if ( isOnFirstParentLane(commit) && isUnknownBranch ){
                       commit.x = 0;  // Put on lane reserved for unknown first-parent
                   }
                   
                   
                }

            // Wrap up
            
                commit.occupiedColumns = [...columnOccupiedStateArray];  // Store copy of array in each commit
            
                
                if (DEBUG) {
                    commit.message = `${commit.message}      (branchName=${commit.branchName.substring(0,12)})     [${columnOccupiedStateArray.toString()}]       lane=${commit.x}` // DEBUG : Write out columnOccupiedStateArray
                }
                
                if (commit.x > HIGHEST_LANE){
                    HIGHEST_LANE = commit.x;
                }
                   
                // Add message text 
                graphContent += parseMessage( commit.hash, commit.message, commit.decoration, commit.notFoundInSearch)
                         

            //
            // PASS 2 : Internal functions
            //

                function markLaneAsOccupied(commit){
                    let lane = commit.x ;
                    let until = nodeMap.get(commit.parents[0]).y;  // Add one extra row
                    
                    // Fill up if array too short
                    while (lane > columnOccupiedStateArray.length){
                        columnOccupiedStateArray.push(0);
                    }
                    
                    // Mark as occupied
                    columnOccupiedStateArray[ lane] = until;
                    
                }
                function getBestLane(commit){
                    // Look for lowest row-number in all children
                    // That of parent[0] 
                    
                    /*
                       commit.occupiedColumns is an array showing how far a lane is occupied downwards (or a number lower than the commit's row, when not occupied)
                       
                       Best lane is the next lane to the right,  which is not occupied (in the whole range of rows examined)
                     
                       The lane must be available from the child that is furthest up, called lowestY down to the commit.
                       
                       Lane 0 is reserved for unknown first-parents
                     
                     
                    */

                    let lowestY  = commit.y;  // Start search at this commit
               
                    // Find child that starts furthest up
                    let childrenHashes;
                    if (childMap.has(commit.hash) ){
                        childrenHashes = childMap.get( commit.hash );                
                        for(let i = 0; i < childrenHashes.length; i++){
                            let child = nodeMap.get(childrenHashes[i]);
    
                            if (child.y < lowestY){
                                lowestY = child.y;
                            }
                        }
                    
                    }else{
                        // Typically this happens at HEAD of a branch
                        lowestY = commit.y - 1;  // Next commit
                        if (lowestY < 0){  // Top of graph
                            lowestY = 0;
                        }
                    }
                    
                    // Find highest occupied column in range between lowestY and commit
                    let highestOccupiedCol = 0;
                    for(let row = lowestY; row < commit.y ; row++){
                        let c = commitArray[row].occupiedColumns; // array with next occupied row number for each column
                        console.log(c.toString());
                        
                        // Find next occupied column      
                        let col = highestOccupiedCol; // Start value  (I know that array never becomes shorter with higher row)          
                        while ( col < c.length ){
                            if ( row < c[col] ){
                                highestOccupiedCol = col + 1;
                            }else{
                                // Here is the first non-occupied lane at this row
                                if (COMPRESS)
                                    break  
                            }
                            col++;
                        }
                    }
                    return highestOccupiedCol
                    
                };
                function isOnFirstParentLane(commit){
                    
                     if ( childMap.has(commit.hash) ){
                        let childrenHashes = childMap.get(commit.hash); 
                        
                        // Check if commit is first-parent to one of the children
                        if (childrenHashes.length >= 1){  // Octupus merge >1, normal merge == 1
                            for(var i = 0; i < childrenHashes.length; i++){
                                let child = nodeMap.get( childrenHashes[i] );                       
                                if ( ( child.parents[0] == commit.hash ) && ( child.x == 0) ){
                                    return true
                                }
                            }
                        }
           
                    }    
                    // Cannot be first-parent if came here
                    return false                 
                    
                }
                function isStartOfSegment(commit){
                    /*
                     Start of Segment is the top-most commit, o :
                     
                         1) Merge  => new segment if not first-parent
                                 *      child
                                 |\   
                                 F o    F = first-parent,  is "start of segment"
                                        o = commit to test (commit variable in this function)
                                 
                         2) o is latest commit on branch        
                                     o  o has no child
                                     |
                                     *    
                    */
                    if ( childMap.has(commit.hash) ){
                        let childrenHashes = childMap.get(commit.hash); 
                        
                        // Check if NOT start of segment 
                        if (childrenHashes.length >= 1){  // Octupus merge >1, normal merge == 1
                            for(var i = 0; i < childrenHashes.length; i++){
                                let child = nodeMap.get( childrenHashes[i] );                       
                                if ( child.parents[0] == commit.hash ){
                                     // Found proof that commit is NOT start of segment
                                    return false
                                }
                            }
                            
                        // 1) Commit must be start of segment
                        return true
                        }
           
                    }else{  
                        // 2) o is last commit on branch    
                        return true
                    }
                };  
                function isAfterEndOfSegment(commit){
                    /*
                     Definition :
                         "After end of Segment" is the bottom-most commit, o, from this a branch operation was performed 
                         o has at least two children, with o as first-parent :
                     
                     Branch point o has two children. Commit c is at end of a branch segment
                           
                                 * c     *, c are two children that both has o as first-parent
                                 |/   
                                 o       o = branch-point = commit after segment
                                 |       
                                 
                                 
                                 * is not on a branch, but c is.  
                    */ 
                    
                    let count = 0; // Number of branched segments converging at this commit  
                    let lastOfSegment = [];  
                      
                    if ( childMap.has(commit.hash) ){
                        let childrenHashes = childMap.get(commit.hash); 
                        
                        // Identify children that are "end of branch segment"
                        if (childrenHashes.length >= 1){  
                            for(var i = 0; i < childrenHashes.length; i++){
                                let child = nodeMap.get( childrenHashes[i] );                       
                                if ( child.parents[0] == commit.hash ){
                                    // Only end of branched segment have a last point :
                                    if ( child.x !== commit.x ){  
                                        count ++;  // Count end of branch segments
                                        lastOfSegment.push(child);  // Store last commit (c) in segment
                                    }
                                }
                            }
                        }
                        
                        // Unset columns for all "end of branch segments" (identified above)
                        if (count >= 1){  // is end of segment only if a branch point
                            commit.message = 'END -- ' + commit.message;  // DEBUG : Mark that first in segment
                            
                             for(var i = 0; i < lastOfSegment.length; i++){              
                                let lane = lastOfSegment[i].x;      
                                columnOccupiedStateArray[ lane ] = lane; // This could be anything less than row, but for debugging purposes I set it to the same as lane
                                
                                if (lane == 0) { // Block column until next parent   
                                    columnOccupiedStateArray[ lane ] =  nodeMap.get( commit.parents[0] ).y;  
                                }
                                
                                console.log( `i = ${commit.y}   END SEGMENT  ${lastOfSegment[i].x} AT   ${commit.message}  [${columnOccupiedStateArray.toString()}]`);
                            }
                        }

                    }
                    return (count >= 1);  // True if one or more 
              
                }
                function nameUnknownBranchFromPriorInSegment(commit){
                    /*
                     Copy info from child, if in same segment as child
                                *      child
                                |
                                o      commit
                    */
                    if ( childMap.has(commit.hash) ){
                        // Find which child is matched to this commit
                        let childrenHashes = childMap.get( commit.hash );
                        for(var i = 0; i < childrenHashes.length; i++){
                            let child = nodeMap.get( childrenHashes[i] );
                            if ( child.parents[0] == commit.hash ){ 
                                // Found the child to copy from
                                if (commit.branchName == ""){  // Copy only if branchName is unknown (keep info intact for named branches)
                                //if (commit.unknownBranchName  ){
                                //if (true){
                                    commit.branchName = child.branchName;
                                    commit.x = child.x;
                                    commit.unknownBranchName = child.unknownBranchName;
                                }
                            }
                        }
                    }
                }
            // End internal functions
    
        } // End PASS 2
 
    //
    // Initiate drawing
    //
        draw = SVG();
        
        // Define arcs used for branch and merge curves
        const arc = draw.defs().path(`M ${R} 0 A ${R} ${R} 0 0 1  0 ${R}`)
            .fill('none')
            .stroke({ color: '#888', width: 3  });
        const arcBranch = draw.defs().use(arc).move(-R,-R);
        const arcBranch2  = draw.defs().use(arc).flip('x').move(-R,-R);
        
        const arcMerge  = draw.defs().use(arc).flip('y').move(-R,-R);
        const arcMerge2  = draw.defs().use(arc).flip('both').move(-R,-R);

     
    //
    // PASS 3 : Draw nodes-connections & help-line
    //   

        /*
         
             *    x1, y1 is coordiante of one of the children of commit
             |
             *    x0, y0 is coordinate of a commit
          
        */
    
        for(var j = 0; j < commitArray.length - 1; j++) { 
 
            let commit = commitArray[j];
            let x0 = commit.x;
            let y0 = commit.y;
            
            let hashInThisRow = commit.hash;
  
  
            // Draw SVG horizontal help-line TODO : 
            draw.line( LEFT_OFFSET + x0 * COL_WIDTH, 
                       TOP_OFFSET + y0 * ROW_HEIGHT , 
                       LEFT_OFFSET + HIGHEST_LANE * COL_WIDTH , 
                       TOP_OFFSET + y0 * ROW_HEIGHT
                    ).stroke({ color: '#888', width: 0.25}); 
                    
     
            // Draw connections between nodes
            if ( childMap.has( hashInThisRow ) ){
                let childHashes = childMap.get(hashInThisRow);
                let numberOfChildren = childHashes.length;
                for (let i = 0; i < childHashes.length; i++){
                    let child = nodeMap.get(childHashes[i]);
                    let x1 = child.x;
                    let y1 = child.y;
                    
                    drawConnection( draw, commit, child, R, numberOfChildren)
                }

            }
        } 
         
         
    //
    // PASS 4 : Draw nodes (ontop of lines)
    //   
    
        for(var j = 0; j < commitArray.length - 1; j++) { 
            let id = 'img_' + commitArray[j].hash;
            //drawNode( draw, commitArray[j].x, commitArray[j].y, commitArray[j].branchName, commitArray[j].notFoundInSearch,id );
            drawNode( draw, commitArray[j], commitArray[j].branchName, commitArray[j].unknownBranchName,id );
            
        }
           
    
    
    // 
    // Attach data to HTML
    //
        document.getElementById('datesSwimLane').innerHTML = dateContent;      
    
        document.getElementById('mySvg').innerHTML = ''; // Clear
        draw.addTo( document.getElementById('mySvg') ).size( LEFT_OFFSET + (HIGHEST_LANE + 1) * COL_WIDTH , TOP_OFFSET + (line +1) * ROW_HEIGHT  )
    
        document.getElementById('graphContent').innerHTML = graphContent;    
    
        toggleDate( state.graph.showdate); // Show / hide date column    


        // Draw circle in correct color
        let branchName = opener.window.document.getElementById('top-titlebar-branch-text').innerText;
        if ( branchNames.has(branchName) ){

            if ( branchNames.get(branchName) < NUMBER_OF_KNOWN_BRANCHES ){
                
                // Get image file name
                let colorNumber = branchNames.get(branchName) % colorImageNameDefinitions.length; // start again if too high number
                let colorName = colorImageNameDefinitions[ colorNumber];
                colorFileName = `images/circle_colors/circle_${colorName}.png`;
                
                // Change HTML image
                document.getElementById('headerBranchCircle').src = colorFileName;
            }
        } 
 
    
        function drawConnection( draw, commit, child, R, numberOfChildren){
            
            /* Inputs : 
                    draw - draw object
                    commit - X0, Y0 coordiantes
                    child - X1, Y1 coordinates
                    R - bend radius in pixels
                    numberOfChildren - not used
            
             
            
               Different connection types :
               
                  (1) "going-around"                               (2) "merge"                (3) "branch"      (4) "straight"
                                                                                       
                               x1                                       x1                           x1                x1                        
                            y1 * ------\    rounded corner ,         y1 * ---\                   y1  *                 *
                                       |    radius R                         |                       |                 |
                                       |                                     |                       |                 |
                                       |                                     |                       |                 |
                       x0              |                                     |                       |                 |
                   y0  *  -------------/    rounded corner,              y0  *          END y0 * ----/                 *
                                            radius R                         x0 START          x0                      x0
                                       ^                                               
                                       |                               x1 < x0               x1 > x0             x1 == x0
                                    lineCol                          lineCol == x0         lineCol == x1           
                               
                               
                                    
                  (5)  "right-merge"           (6) "left-branch"
                        (2) but going right               (3) but going left                                
                                                     
                                  x1                   x1
                        /-------- *  y1            y1  * 
                        |                              |
                    y0  *                              \------- * y0 END
                  START x0                                      x0
                                                 
                            x1 > x0                   x1 < x0    
                                                            
                                                                   
             **/
            
            // Get row and column coordinates
                let x0 = commit.x;
                let y0 = commit.y;
                let x1 = child.x;
                let y1 = child.y;
            
            
            // Get lineColumn (used for case 1 - 3)
                let lineCol = x0; 
                if (x1 > x0)
                    lineCol = x1;  
                              
                // Get new lane, if crossing a commit 
                if ( isCrossingNode( commit, child) )
                    lineCol = getBestLane(commit);
         
    
            // Identify connection type
            
                let type;
    
                if (x0 == x1){
                    type = 4;  // Most common
                }else if ( (lineCol > x0) && (lineCol > x1) ) { // vertical to the right
                    type = 1;  
                }else if ( (x1 < x0)  && commit.START) {  // merge
                    type = 2;
                }else if ( (x1 > x0) && commit.END) {  // branch
                    type = 3;
                }else if ( (x1 > x0)  && commit.START) { // merge right 
                    type = 5;
                }else if ( (x1 < x0) && commit.END) { // branch left
                    type = 6; 
                }
                       
            
            // Convert to pixel coordinates (Capital letters)
            
                let X0 = LEFT_OFFSET + x0 * COL_WIDTH;
                let Y0 = TOP_OFFSET + y0 * ROW_HEIGHT
                
                let X1 = LEFT_OFFSET + x1 * COL_WIDTH;
                let Y1 = TOP_OFFSET + y1 * ROW_HEIGHT
                
                let LINECOL = LEFT_OFFSET + lineCol * COL_WIDTH;
                
                
            // Top horizontal
                
                if ((type == 1) || (type == 2)){
                    draw.line( X1, Y1, LINECOL - R, Y1).stroke({ color: '#888', width: 3}); // horizontal
                    draw.use(arcMerge).move( LINECOL, Y1  ); // arc
                }
                
                if (type == 5 ){
                    draw.line( X1, Y1, X0 + R, Y1).stroke({ color: '#888', width: 3}); // horizontal
                    draw.use(arcMerge2).move( X0, Y1  ); // arc
                }

                
            // Vertical
            
                switch (type){
                    case 1: draw.line( LINECOL, Y0 - R, LINECOL, Y1 + R).stroke({ color: '#888', width: 3});  break;
                    case 2: draw.line( X0, Y0 - 0, X0, Y1 + R).stroke({ color: '#888', width: 3});  break;
                    case 3: draw.line( X1, Y0 - R, X1, Y1 + 0).stroke({ color: '#888', width: 3});  break;
                    case 4: draw.line( X0, Y0 - 0, X0, Y1 + 0).stroke({ color: '#888', width: 3});  break;
                    case 5: draw.line( X0 , Y0 + 0, X0, Y1 + R).stroke({ color: '#888', width: 3});  break;
                    case 6: draw.line( X1 , Y0 - R, X1, Y1 + 0).stroke({ color: '#888', width: 3});  break;
                }
                 
                
            // Bottom horizontal
                
                if ((type == 1) || (type == 3)){
                    draw.line( X0, Y0, LINECOL - R, Y0).stroke({ color: '#888', width: 3}); // horizontal
                    draw.use(arcBranch).move( LINECOL, Y0  ); // arc
                }                  
                
                if (type == 6 ){
                    draw.line( X0, Y0, X1 + R, Y0).stroke({ color: '#888', width: 3}); // horizontal
                    draw.use(arcBranch2).move( X1 , Y0  );
                }
     
                
                
            return    
    
        
             //   
             // Internal function   
             //
                function isCrossingNode( commit, child){
                    
                    let x0 = commit.x;
                    let x1 = child.x;
                    
                    // Check if crossing a node between commit and child
                    for(let row = child.y + 1; row < commit.y ; row++){
                        let c = commitArray[row].occupiedColumns; // array with next occupied row number for each column
            
                        if ( (x1 > x0) && ( c[x1] > commit.y) ){  // Compare with drawConnection, follow child lane x1
                            return true
                        }
                        if ( (x1 < x0) && ( c[x0] > commit.y) ){   // Compare with drawConnection, follow commit lane x0
                            return true
                        }
                    }
                    return false
                    
                }
    
        };
        function drawNode( draw, commit, branchName, notFoundInSearch, id){
            
            let x0 = commit.x;
            let y0 = commit.y;
            
            // Figure out if known or current branch
            let colorFileName;
            let tooltipText = 'unknown';
     
            if (notFoundInSearch){
                colorFileName = unsetNodeImageFile;
                if (x0 == 0)
                    colorFileName = 'images/circle_green.png'; // Draw node
                    
            }else{
                colorFileName = 'images/circle_green.png'; // Draw node
    
                // When branch is known from Notes
                if ( branchNames.has(branchName) && (branchNames.get(branchName) <= NUMBER_OF_KNOWN_BRANCHES)){
                    
                    // Get image file name
                    let colorNumber = branchNames.get(branchName) % colorImageNameDefinitions.length; // start again if too high number
        
                    let colorName = colorImageNameDefinitions[ colorNumber];
                    colorFileName = `images/circle_colors/circle_${colorName}.png`;
                    tooltipText = branchName;
        
                }
            }
    
            // Convert from col / row to pixel coordinates
            let X0 = LEFT_OFFSET + x0 * COL_WIDTH;
            let Y0 = TOP_OFFSET + y0 * ROW_HEIGHT
            
            draw.image(colorFileName).
            id(id).
            size(IMG_W,IMG_H).
            move( X0 - 0.5 * IMG_W, Y0 - 0.5 * IMG_H); // Center image on coordinate point
        };
        function splitGitLogRow( gitLogRow ){
            
    
            
            // gitLogRow -  is a full row from log
            
                // Example row format :
                // | * S=Removed edge from questionmark buttons T=2021-05-12T14:56:13+02:00 D= H=d02f9251ba8bb00750052398b799c9105f84beda P=c3a3f0a65aba567c525ad1df0e324c028e4c185e N=feature/main_window_zoom
         
         
                // Pick row apart from back to start
         
                // Notes : Separate log row from Notes at end
                let startOfNote = gitLogRow.lastIndexOf('N=');  // From git log pretty format .... H=%H (ends in long hash)
                let noteInThisRow = gitLogRow.substring(startOfNote + 2) ; // Skip N=  
                if ( (startOfNote !==-1) && ( noteInThisRow.length > 0) ){
                    noteInThisRow = getLastBranchInNote( gitLogRow.substring(startOfNote + 2) ); // Get if Note has multiple historical rows
                }
                
                // Parents : Separate log row from parents(at end now when Notes removed)
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
                let startOfDate = gitLogRow.lastIndexOf('T=');  // From git log pretty format .... T=%d (ends in date)
                let date = gitLogRow.substring(startOfDate + 2, startOfDecore -1); // Skip T=
                date = date.substring(0,10);
                  
                // Message : Separate log row from message (at end now when date removed)
                let startOfMessage = gitLogRow.lastIndexOf('S=');  // From git log pretty format .... S=%s (ends in message)
                let message = gitLogRow.substring(startOfMessage + 2, startOfDate -1); // Skip S=
                
                // Position of '*' node
                let graphPartOfText = gitLogRow.substring(0, startOfMessage); // This may start with crud (previous empty line) + '/n' +  good graph info
                let goodGraphPart = graphPartOfText.split('\n');
                let graphNodeIndex = goodGraphPart[goodGraphPart.length -1].indexOf('*');
                graphNodeIndex = 0.5 * graphNodeIndex;  // Every second column is unused
                                
                if (startOfDate == -1){
                    date = ''; // When no date found (set blank date)
                }
                
                // Current row
                let thisRow = message;
                thisRow = thisRow.replace(/</g, '&lt;').replace(/>/g, '&gt;');  // Make tags in text display correctly
        
                // Parse missing features (= lines without commits)
                if (startOfHash == -1){
                    thisRow = gitLogRow; // When no hash found (lines without commits)
                }
                
                // Split parents into array
                let parents = parentInThisRow.split(' ');
        
                
                return [ date, hashInThisRow, thisRow, decoration, noteInThisRow, parents, graphNodeIndex] 
          
            // Internal functions
                function getLastBranchInNote( noteInThisRow){
                    /*
                      Format from git log graph command:
        
                        N=feature/swim-lanes
                        |\  
                        | | develop
                        | | 
                        | | develop
                        | | 
                     
                      Strategy : 
                        - split by EOL
                        - get second to last
                        - split by ' ', and get last string 
        
                     */
                    
                    
        
                                
                    let multipleNotes = noteInThisRow.split('\n');
                    let lastNote = multipleNotes[ multipleNotes.length - 2].split(' ');  // Every second row, then split selected by space
                    let endOfLastNote = lastNote[lastNote.length - 1];
                    
                    //noteInThisRow = multipleNotes[ multipleNotes.length - 2].split('')[0]; // Take part before last EOL (some graphics curd gets there)
                    //noteInThisRow = noteInThisRow.replace(/(\r\n|\n|\r)/gm, ""); // Remove  EOL characters;
                    
                    noteInThisRow = endOfLastNote;
                
                    
                    if ( !branchNames.has(noteInThisRow) ){
                        // New noteInThisRow
                        branchNames.set(noteInThisRow, branchNames.size); // Register branchName and next integer number
                    }
        
                    return noteInThisRow;
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
               
        }
      

    
} // ------------------------------------------------------------
    function drawPinnedImage(hash){
        
        const PIN_IMG1 = '<img class="pinned-icon" height="17" width="17" style="vertical-align:middle;"';
        const PIN_IMG2 = ' src="' + PINNED_DISABLED_IMAGE + '"> ';
        return PIN_IMG1 + ` onclick="setPinned('` + hash + `')" ` + PIN_IMG2;
    }        
    function parseMessage( hash, text, decoration, notFoundInSearch){
                
        let cl = 'text';
        
        let styling = '';
        if (notFoundInSearch){
            styling = ' notInSearch';
        }
        
        
        let html = '<div class="' + cl + styling + '" id="' + hash + '" >' + `<pre>` + drawPinnedImage(hash) +  text +  `</pre>` + ' </div>' ; 
        html += '<pre class="decoration"> &nbsp;' + decoration + '</pre>'

        return html 
    };
 

// Stored branch name
function drawBranchColorHeader( branchNames){
    
    
    const colorFileName = 'images/circle_green.png';
    
    let html = '';

    
    html += `
    <div id="unknown_first_parent_header" class="branchHeaderRow"> 
        <img class="node" src="${colorFileName}"> 
        <pre> Unknown first-parent branch </pre>
    </div>`;
    
    
    html += `
    <div class="branchHeaderRow"> 
        <img class="node" src="${unsetNodeImageFile}"> 
        <pre> Unknown branch </pre> 
    </div>`;
    
    
    html += `
    <div class="branchHeaderRow"> 
        <pre> </pre> 
    </div>`;
    
          

    
    let longestBranchName = 'Unknown first-parent branch'
    let idToLongestBranchName = 'unknown_first_parent_header';
    let count = 0;
    
    branchNames.forEach(handleMapElements);
    
    function handleMapElements(value, key, map) {
        
        count++;
        
        if (count > NUMBER_OF_KNOWN_BRANCHES){
            return
        }
        
        
        // Write HTML text, and node image
        let colorFileName = getColorFileName(key);
        let id = `branchHeader_${value}`;

        html += `
        <div id="${id}" class="branchHeaderRow"> 
            <img class="node" src="${colorFileName}"> 
            <pre>${key}</pre>
        </div>`;

        
        // Find longest branch name
        if (key.length > longestBranchName){
            longestBranchName = key.length;
            idToLongestBranchName = id;
        }
    }
    
    // Set HTML
    document.getElementById('colorHeader').innerHTML = html;

    // Set width of Branch Color Header box
    if ( document.getElementById('colorHeader').style.width < document.getElementById(idToLongestBranchName).offsetWidth){ 
        document.getElementById('rightInsert').style.width = document.getElementById(idToLongestBranchName).offsetWidth + 20;
    }
    
    
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
                    //await myFunction(cleanedHashString);
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
        try{
            document.getElementById(img_id).href.baseVal = `images/circle_colors/circle_${colorName}.png`;  // svg node
        }catch (err){
            document.getElementById(img_id).src = `images/circle_colors/circle_${colorName}.png`;  // html img node
        }
        
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

