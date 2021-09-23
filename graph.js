// ---------
// INIT
// ---------

// Constants and variables

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
    
    var win
    
    var sumFound;
    
    var graphContent = '';  // This is where output is collected before putting it into graphContent element
    var dateContent = '';   // This is where date output is collected for swim-lane version of Graph
    
    var branchNames;        // map  branchname => index 0, 1, 2, ... calculated in drawGraph
    var mapVisibleBranchToTopCommit;  // map branchName to hash of newest commit
    var mapTopCommitToBranchName; // reverse, map first commit on branch to branchName
    var childMap ;          // Store mapping from parent to child hashes
    
    var nodeMap;            // Map hash to commit (same object as in commitArray, but can be looked up)
    var commitArray;        // Array with same commits as in nodeMap
    var columnOccupiedStateArray; // Array used to mark occupied columns, stores last known occupied row-number of branch segment
    
    const BUFFERTCOLS = '  '; // Allows to look to the left of current character
    const BUFFERTROW = '                                                                                                                                                                    ';
    
    let NUMBER_OF_KNOWN_BRANCHES = 0;  // This marks the last branch with known branchname in branchNames map
    
    var lastSelectedBranchName = '';  // Used to set default when renaming commit's branch name
    
    var infoNodes = [];  // An array of nodes that have been redrawn with mouse-over svg node circle

// GUI constants
        
    // Node image
    const IMG_H = 12;
    const IMG_W = 12;
        
    // Grid dimensions
    const COL_WIDTH = 20; // 20
    const LEFT_OFFSET = 10;
    const TOP_OFFSET = 0.5 * IMG_H; 
    
    var ROW_HEIGHT;  // Read from CSS in drawGraph
    const R = 15; // arc radius for branch and merge.  Note : R <= COL_WIDTH & R <= ROW_HEIGHT
            

// Global for whole app
    var state = global.state; // internal name of global.state
    var localState = global.localState; 

// Global in this window
    let history = '';
    var graphText;  // Output from git log
    
    var COMPRESS;
    const DEBUG = state.graph.debug;       // true = show debug info on commit messages

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
        document.getElementById('showHidden').checked = state.graph.showHiddenBranches;
        document.getElementById('graph_mode_switch').checked = state.graph.swimlanes;
        colorSwitchTexts(); // Set switch-text-colors (see graph.html)
        
        // Create empty hiddenBranches list if undefined
        if ( state.repos[state.repoNumber].hiddenBranches == undefined ){
            state.repos[state.repoNumber].hiddenBranches = [];
        }
        
        
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
        
        // Hide "Show hidden branches checkbox" visible only when hidden branches
        if (( state.repos[state.repoNumber].hiddenBranches == undefined ) || ( state.repos[state.repoNumber].hiddenBranches.length == 0) ){
            document.getElementById('hiddenBranchesDiv').style.contentVisibility = 'hidden' ;
        }else{
            document.getElementById('hiddenBranchesDiv').style.contentVisibility = 'visible' ; 
        }
        
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
function stop(commit){  // Use for conditional-debug-stop in debugger
    // Debug stop on commit selected in graph-window (use in conditional break-point in debugger)
    //
    // Create a conditional break point, and write condtion : stop(commit)
    // (where variable commit is within scope)
    return (opener.localState.historyHash == commit.hash)
}
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
function showBranch( branchName){ // True if branch should be shown (in contrast to hidden)
    if (state.graph.showHiddenBranches ){
        return true;
    }else{
        return !state.repos[state.repoNumber].hiddenBranches.includes(branchName );
    }
    
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
    state.graph.swimlanes = document.getElementById('graph_mode_switch').checked;  // True if swimlanes, false if compressed view
    state.graph.showHiddenBranches = document.getElementById('showHidden').checked;
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

var isMouseOverCommitCircle = false;  // Used to stop infoBox from getting caught when leaving a commit circle before infoBox is drawn
function makeMouseOverNodeCallbacks(){  // Callbacks to show info on mouseover commit circles
        
    //
    // Circle mouse events
    //

    var arrElem = document.getElementsByTagName('image');
    
    // Size utility function
    function sizeNodes( hash, size){
        let node = draw.node.getElementById( 'img_' + hash);
        let commit = nodeMap.get(hash);
        
        let X0 = LEFT_OFFSET + commit.x * COL_WIDTH;
        let Y0 = TOP_OFFSET + commit.y * ROW_HEIGHT
        
        SVG( node )
            .size(size,size)
            .move( X0 - 0.5 * size , Y0 - 0.5 * size);
    }
    function resetNodeSize(){
            // Reset node sizes
            for (let i = 0; i < infoNodes.length; i++){
                sizeNodes( infoNodes[i], IMG_H)
            }
            infoNodes = [];
            return
    }

    // Other utility functions
    function closeInfoBox(){  // Info box closing
            document.getElementById('displayedMouseOver').style.visibility = 'collapse';
            resetNodeSize();
    }
    function hasMouseLeft(){  // Tels if mouse is outside commmit circle
        return !isMouseOverCommitCircle;  // true if mouse is not over
    }
    
    //
    // Add mouse events for each circle
    //
    for (var i = arrElem.length; i-- ;) {
    

        // onmouseout     
                       
        arrElem[i].onmouseleave = function(e) {
            closeInfoBox();
            isMouseOverCommitCircle = false;
            return
        };
        
        
        // onmouseover 
        
        arrElem[i].onmouseenter = async function(e) {
            
            isMouseOverCommitCircle = true;
            
            resetNodeSize(); // Clear resized nodes
            
            console.log(e);
            let hash = e.toElement.id.substring(4);  // Because element id starts with "img_" followed by hash
            let commit = nodeMap.get(hash);
            
            // Get git author
            let author = await gitCommitAuthor(hash);
              
            console.log( 'commit : ' + commit.message );
            
            let imageSrc = e.target.href.baseVal;
            
            // Parents      
            let parentHashes = commit.parents;
            let ParentHeader = 'Parent';
            if (parentHashes.length > 1)
                ParentHeader = 'Parents';
            
            // HTML 
            let html =``
            
            let branchName = commit.branchName;
            
            
            let parenthesis = '';
  
            if ( commit.hiddenBranchName ){
                branchName = mapTopCommitToBranchName.get(commit.branchName); // Because branchName is the hash for hidden branches
                parenthesis = ' (hidden)';
            }
            
            if ( commit.unknownBranchName ){
                parenthesis = ' (' + commit.branchName.substring(0,6) + ')';
                branchName = 'unknown '
            }
            
            
            
            
            // HTML Branch
            html += `<h2> 
                <img class="node" src="${imageSrc}" style="display:inline; position : unset" > &nbsp;
                <span> ${branchName}  ${parenthesis} </span>
                 </h2>` 
                 
            html += '<HR><BR>'   
            
                     
            
            
            // HTML Commit
            html += `<B><U>Commit </U></B> : <BR><BR> 
                 <b><div> &nbsp; <img class="node" src="${imageSrc}" style="display:inline; position : unset" > &nbsp;
                    <span style = "left: 30 px; position: relative"> ${commit.message}</span>
                 </div></b>
                 <BR><BR>`
            
            html += ` &nbsp; <i> ${author} </i><BR><BR>`
            html += ` &nbsp; ${commit.hash} <BR><BR>`
            
            
            html += '<HR><BR>' 
            
             // Change commit node size
            sizeNodes( hash, IMG_H + 6);
            infoNodes.push(hash);  // Remember hash of resized node
            
            
            // HTML Parents   
            html += `<B><U> ${ParentHeader} : </U></B> <BR><BR>` 
            
            for (let i = 0; i < parentHashes.length; i++){
                
                // First commit has no parent hashes
                if (parentHashes[i] == "")
                    continue

                 let id = "img_" + parentHashes[i];
                 let imageSrc = document.getElementById(id).href.baseVal;
                 
                html += ` <b><div> &nbsp; 
                    <img class="node" src="${imageSrc}" style="display:inline; position : unset" > &nbsp;
                    <span style = "left: 30 px; position: relative"> ${nodeMap.get( parentHashes[i] ).message} </span>
                 </div></b>
                  <BR>`
                  
                // Change parent node size  
                sizeNodes( parentHashes[i], IMG_H + 6); 
                
                infoNodes.push(parentHashes[i]); // Remember hash of resized node
            }
            
            html +='<BR><div>';
            
            
            // HTML Parent Hashes
            for (let i = 0; i < parentHashes.length; i++){
                html +=  '&nbsp; ' + parentHashes[i]   + '<BR>';
            }
            
            
            html +='</div>';
                
            
            // Display HTML 
            
            document.getElementById('displayedMouseOver').innerHTML = html;
              
            document.getElementById('displayedMouseOver').style.visibility = 'visible';
            
            // Set x to the right of lane
            let x = getFreeLane(commit, false);
            if (commit.x > x )
                x = commit.x;

            let X0 = LEFT_OFFSET + (x + 1) * COL_WIDTH;
            document.getElementById('displayedMouseOver').style.left = e.clientX + X0 + 20;
            
            // Set y so that info box always on screen
            let top = e.clientY - 15 - document.getElementById('displayedMouseOver').getBoundingClientRect().height;
            if (top < 0)
                top = e.clientY - 15;
                
            
            document.getElementById('displayedMouseOver').style.top = top;                
        
        
            // Check if mouse left during execution
            if (hasMouseLeft() ){
                closeInfoBox();
            }
        
        };
    
    }
}        


// Git
async function gitCommitAuthor(hash){ 
    let folder = state.repos[ state.repoNumber].localFolder;
    let text = '';
    try{
        let commands = [ 'show',  '-s', '--format=%aN (%aE)', hash]; // Author
        await simpleGit( folder).raw(  commands, onGitCommitAuthor);
        function onGitCommitAuthor(err, result ){text = result; console.log(result); };
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
          
    
    //
    // SETUP
    //  
  
  
        
            // Get ROW_HEIGHT from graph.html css  
            r = document.querySelector(':root');
            ROW_HEIGHT = getComputedStyle(r).getPropertyValue('--textRowHeight'); 
 
    
        // Initiate variables
        
            var NUMBER_OF_BRANCHES = 1 // Default, will be changed below
            
            var graphContent = '';
            var dateContent = '';
            
            branchNames = new Map();   // Empty list of branch names
            childMap = new Map();  // List of children for commits
            nodeMap = new Map();  // Map of commit nodes
            mapVisibleBranchToTopCommit = new Map();  // Map of branchName to commit hash of first commit on branch (used for clickable branch names)
            mapTopCommitToBranchName = new Map(); // Map of hash (of first commit on hidden branch) to branchName
            
            commitArray = [];
            
            columnOccupiedStateArray = [];  
     
            let splitted = graphText.split( UNIQUE_EOL + '\n');
            
            let previousDate = 'dummy'
    
    
        // Initiate drawing
     
            draw = SVG();  // Global variable
            
            // Define arcs used for branch and merge curves
            const arc = draw.defs().path(`M ${R} 0 A ${R} ${R} 0 0 1  0 ${R}`)
                .fill('none')
                .stroke({ color: '#888', width: 3  });
            const arcBranch = draw.defs().use(arc).move(-R,-R);
            const arcBranch2  = draw.defs().use(arc).flip('x').move(-R,-R);
            
            const arcMerge  = draw.defs().use(arc).flip('y').move(-R,-R);
            const arcMerge2  = draw.defs().use(arc).flip('both').move(-R,-R);
         
    
    //
    // Pass 1 : Loop each row - collect commit info
    //
        /*
            Get values from graphText (which comes from 'git log graph'), and store commits
            Some values are updated in Pass 2 (parent branchName, lane, hidden and unknown status)
            
            Commits stored two ways :
                commitArray[row]
                nodeMap.set( thisCommit.hash, thisCommit);
                
            Also maps :
                mapTopCommitToBranchName - used to map a hash to a branchName.  Used for hidden commits
                mapVisibleBranchToTopCommit  - reverse, maps branch to hash.  Used to create href from branch-list to top commit
            
            For each row, the struct is populated :
                thisCommit.hash                 - commit hash
                thisCommit.parents              - array of parents
                thisCommit.notFoundInSearch     - true is the commits reachable from pragma-git ( false if on other branch, or filtered by search)
                thisCommit.message              - commit message
                thisCommit.decoration           - commit decoration (branch HEAD, tag, etc)
                thisCommit.branchName           - derived from 1) Notes, 2) from decoration. Decoration wins if conflict.  If hidden this ""
                thisCommit.unknownBranchName    - if branch name not determined     ( pass 2 copies this to all in same branch)
                thisCommit.hiddenBranchName     - if branch is hidden               ( pass 2 copies this to all in same branch)
                thisCommit.y                    - row
         
         */
        let line = 0; 
        
        let branchList =  await opener.gitBranchList();
        let localBranchList = branchList.local;
        
        let sortedLocalBranchList = localBranchList.sort(function(a, b) {
                return a.length - b.length; // sort by length (shortest first, longest last)
            });        
        
        for(var row = 0; row < splitted.length; row++) {
    
            // Disect git-log row into useful parts
            [ date, hashInThisRow, thisRow, decoration, noteInThisRow, parents, graphNodeIndex] = splitGitLogRow( splitted[row] );
            
            console.log(row + ' -- ' + noteInThisRow + '   ' + thisRow);
     
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
             
            // Make new entry for mapping from node to children (only if there are parents)
            if ( parents[0] !== ""){
                for (let i = 0; i < parents.length; i++){
                    if (childMap.has( parents[i] )){
                        childMap.get( parents[i] ).push( hashInThisRow) ;
                    }else{
                        childMap.set( parents[i],  [ hashInThisRow ] ); 
                    } 
    
                }
            }
            
            
            
            // Store commit info & NUMBER_OF_BRANCHES (additional info will be added in PASS 2)
                let thisCommit = {};
    
                thisCommit.x = 0;
                thisCommit.y = line;  // Row number
                thisCommit.hash = hashInThisRow;
                thisCommit.parents = parents;
                thisCommit.notFoundInSearch = notFoundInSearch;
                thisCommit.message = thisRow;
                thisCommit.decoration = decoration;
                thisCommit.branchName = "";  // Default (hidden or unknown)
                
                
            // Get branchName
            
                // If stored with committed
                let branchName = noteInThisRow; // ("" if not stored in a git-note)
                                
                // Branch from decoration (find longest match to existing branch name)
                if (decoration !== ''){
                    sortedLocalBranchList.forEach( 
                        (entry) => { 
                            if (decoration.includes(entry)  ) {  
                                branchName = entry;
                            }
                        } 
                    )      
                }  
                
                // is topmost commit on a branch
                let isTopCommit = ( !branchNames.has(branchName) && ( branchName !== "") );   
                
            // Visible / hidden branch
                if ( showBranch(branchName) ){
                    // Visible branch
                    
                    thisCommit.hiddenBranchName = false; 
                    
                    // First time seeing branch -- register branchName to next integer number
                    if (isTopCommit){
                        mapVisibleBranchToTopCommit.set( branchName, thisCommit.hash);  // BranchName -> top commit  (used to link GUI branch-list href to commit)
                        
                        if (showBranch(branchName)){
                            branchNames.set(branchName, branchNames.size);       // Add to branchNames map, thus obtain an index for this branch in that map
                        }
                    }                   
                }else{
                    // Hidden branch      
                    thisCommit.hiddenBranchName = true;
                }
                

            // Top commit -> branchName (both hidden and visible branches)
                if ( isTopCommit ){ 
                    mapTopCommitToBranchName.set( thisCommit.hash, branchName); 
                }
                
                   // mapTopCommitToBranchName.set( thisCommit.hash, branchName); 


            // Unknown branch ?
                thisCommit.unknownBranchName = false; 
                if (branchName == ''){      
                    thisCommit.unknownBranchName = true; 
                }               
            
            
            // Store 
                thisCommit.branchName = branchName;
                thisCommit.x = branchNames.get(branchName);
    

            // Store thisCommit (only if a commit row)
                if ( hashInThisRow !== ""){
                    commitArray.push( thisCommit);
                    nodeMap.set( hashInThisRow, thisCommit);
                }
            
                           
            line++;
        } // End for
        
      
         NUMBER_OF_KNOWN_BRANCHES = branchNames.size;
         let HIGHEST_LANE = 1;
         
         nodeMap.delete("");  // Delete empty node

     //
     // PASS 2 :  x-position  +  draw connections
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

   
            Add following fields to commit-struct created in PASS 1 :
                commit.x                        - the lane to display the commit node
                commit.occupiedColumns          - array, each element represent a lane. Each stores a number which is the row of next commit in that lane.
                                                  If the number is the same as the array element number, the lane is free 
                                                  (example: [229, 1, 2, 512], means that lane 1 and 2 are free)
                commit.START                    - see above drawing. Start of segment. Commit before mergepoint
                commit.END                      - see above drawing. End of segment. Branchpoint
         
         */
             
        // Config variables
        
        COMPRESS = false;   // Placement of known nodes.  true = compressed lanes  false = swim-lanes
        if (MODE == 'git-log-graph') {  // Use switch in graph.html to set compress on / off
            COMPRESS = true;
        }
        
        // Placement of unknown nodes
        let COMPRESSUNKNOWN1 = true;        // Unknown node placement -- find first. 
        let COMPRESSUNKNOWN2 = COMPRESS;   // Connection placement. True = find free lane starting from left.  False = find last free lane (to the right)
                    
        for(var i = 0; i < commitArray.length; i++) {

            
            let commit = commitArray[i];
            
            // Can be used for determining (5) and (6) ? .  Not used so far -- maybe remove ?
            commit.START = false;
            commit.END = false;
            
            if (DEBUG) 
                commit.message = i + ' -- ' + commit.message;  // DEBUG : Show number
            
            //
            // Start of Segment -- get lane + assign branch if unknown
            //
                
                if ( isStartOfSegment(commit)  ){ 
                    commit.START = true;
                    
                    if (DEBUG) 
                        commit.message = 'START -- ' + commit.message;  // DEBUG : Mark that first in segment
                    
                    // Assign a branchname if unknown
                    if ( !branchNames.has(commit.branchName)){
                        commit.branchName = commit.hash;  // Name of branch = hash of latest commit
                        
                        // Lane for unknown branch should land compressed, instead of to far right
                        let bestLane = getFreeLane(commit, true); 
                        
                        branchNames.set( commit.branchName, bestLane ); // Add unknown or hidden branch as hash
                        NUMBER_OF_BRANCHES = branchNames.size +1; 
                    }
    
                    console.log( `i = ${i}   NEW SEGMENT ${commit.x} AT   ${commit.message}  [${columnOccupiedStateArray.toString()}]`);
    
                }
            
            //
            // On a segment
            //
                     
                // Set lane
                if (MODE == 'swim-lanes') {  
                    commit.x = branchNames.get( commit.branchName);
                }   
                if (MODE == 'git-log-graph') {  
                    commit.x = getFreeLane(commit, COMPRESS) ;
                }

                  
                // Get lane if same branch as prior.
                // Copy branchName from firstChild if branchName is unknown ( child having this as first parent)
                copyFromPriorInSegment(commit);
                
                
               // Reserve space for connections between nodes
                let hashInThisRow = commit.hash;
                if ( childMap.has( hashInThisRow ) ){
                    let childHashes = childMap.get(hashInThisRow);
                    let numberOfChildren = childHashes.length;
                    for (let i = 0; i < childHashes.length; i++){
                        let child = nodeMap.get(childHashes[i]);
                        let x1 = child.x;
                        let y1 = child.y;
                        
                        // Get new lane, if crossing a commit lane 
                       if ( isCrossingNodeOrLane( commit, child) ){
                            let lineCol = getFreeLane(commit, COMPRESSUNKNOWN2);  // Find first free lane (false = rightmost)
                            //console.log('lineCol = ' + lineCol);
                            markConnectionAsOccupied(commit, child, lineCol)
                        }

                    }
                }
                

                // Mark Node as occupied lane
                markLaneAsOccupied(commit);   
                               

   
            //
            // If after end of segment
            //
                if ( isAfterEndOfSegment(commit, true)){ // NOTE: isEndOfSegment performs some actions ( marks lanes as free, because of second argument = true)
                    
                    commit.END = true;

                   // Set first-parent (if branch was not explicitly named)
                   let unknownBranchName = commit.unknownBranchName ;
                   if ( isOnFirstParentLane(commit) && unknownBranchName ){
                       commit.x = 0;  // Put on lane reserved for unknown first-parent
                   }
                   
                   
                }

            //
            // Draw connections
            //
            
                commit.occupiedColumns = [...columnOccupiedStateArray];  // Store copy of array in each commit
                
                
                                
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

                if (DEBUG) {
                    
                    commit.message = `( U=${commit.unknownBranchName}  H=${commit.hiddenBranchName} )   ` + 
                        `${commit.message}      (branchName=${commit.branchName.substring(0,12)})     [${columnOccupiedStateArray.toString()}]       lane=${commit.x}` // DEBUG : Write out columnOccupiedStateArray
                }
                
                if (commit.x > HIGHEST_LANE){
                    HIGHEST_LANE = commit.x;
                }
                   
                // Add message text 
                graphContent += parseMessage( commit.hash, commit.message, commit.decoration, commit.notFoundInSearch)
  
        } // End PASS 2
 
     
    //
    // PASS 3 : Draw nodes & help-line
    //   
        /*
         
             *    x1, y1 is coordiante of one of the children of commit
             |
             *    x0, y0 is coordinate of a commit
          
        */
        for(var j = 0; j < commitArray.length; j++) { 
 
            let commit = commitArray[j];
            let x0 = commit.x;
            let y0 = commit.y;
            
            let hashInThisRow = commit.hash;
  

            // Draw node
            let id = 'img_' + commitArray[j].hash;
            drawNode( draw, commitArray[j], commitArray[j].branchName, commitArray[j].unknownBranchName,id );
            
  
            // Draw SVG horizontal help-line 
            draw.line( LEFT_OFFSET + x0 * COL_WIDTH, 
                       TOP_OFFSET + y0 * ROW_HEIGHT , 
                       LEFT_OFFSET + HIGHEST_LANE * COL_WIDTH , 
                       TOP_OFFSET + y0 * ROW_HEIGHT
                    ).stroke({ color: '#888', width: 0.25}); 
        }                  

    
    // 
    // Attach graph and text to HTML
    //
        {
            document.getElementById('datesSwimLane').innerHTML = dateContent;      
        
            document.getElementById('mySvg').innerHTML = ''; // Clear
            draw.addTo( document.getElementById('mySvg') ).size( LEFT_OFFSET + (HIGHEST_LANE + 1) * COL_WIDTH , TOP_OFFSET + (line +1) * ROW_HEIGHT  )
        
            document.getElementById('graphContent').innerHTML = graphContent;    
        
            toggleDate( state.graph.showdate); // Show / hide date column    
    
    
            // Draw branch-title circle in correct color
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
            
            // Make MouseOver callbacks for node images  
            makeMouseOverNodeCallbacks();

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
                        |                              |
                        |                              |
                        |                              |
                    y0  *                              \------- * y0 END
                  START x0                                      x0
                                                 
                            x1 > x0                   x1 < x0    
                        lineCol == x0              lineCol == x1  
                            
                                                            
                 (7) "going-around"                           
                                                               
                              x1                              
                      /------ *  y1     
                      |                     
                      |                       
                      |                       
                      |                       
                      \------------- * y0      
                                    x0            
                      ^                       
                      |                       
                   lineCol        



                   First 2-6 is identified
                   If the identified connection crosses a node which is not on correct branch, then 1 is chosen         
                             
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

         
    
            // Identify connection type 2-6
            
                let type;
    
                if (x0 == x1){
                    type = 4;  // Most common
                    lineCol = x0;
                }else if ( (x1 > x0) && commit.END) {  // branch
                    type = 3;
                    lineCol = x1;
                }else if ( (x1 > x0) ) { // merge right 
                    type = 5;
                    lineCol = x0;
                }else if ( (x1 < x0) && commit.END) { // branch left
                    type = 6; 
                    lineCol = x1;
                }else if ( (x1 < x0)) {  // merge
                    type = 2;
                    lineCol = x0;
                }
                
    
            // Identify connection type 1 or 7 ( go around)
                            
                if (  ( (y0 - y1) > 1 ) && isCrossingNodeOfWrongBranchVerticalSegment( commit, child, lineCol)  ){ // (y1 - y0) > 1  causes speedup 
                    lineCol = getFreeLane(commit,false); // false gives right-most free lane. true may give inbetween x1 and x0 (needs an S-shaped line, which I don't have)
                    
                    if ( (lineCol > x0) && (lineCol > x1) ) { // vertical to the right
                        type = 1;
                    }  
                    
                    // Prepared for vertical to left, but this cannot happen because of "false" in a above getFreeLane(commit,false) call.
                    if ( (lineCol < x0) && (lineCol < x1) ) { // vertical to the left
                        type = 7;
                    }
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
                    case 5: draw.line( X0, Y0 + 0, X0, Y1 + R).stroke({ color: '#888', width: 3});  break;
                    case 6: draw.line( X1, Y0 - R, X1, Y1 + 0).stroke({ color: '#888', width: 3});  break;
                    case 7: draw.line( LINECOL, Y0 - R, LINECOL, Y1 + 0).stroke({ color: '#888', width: 3});  break;
                }


            // Debug Vertical :  test for commits crossed on vertical line
                if (DEBUG){
                    let X = X0;
                    let x = x0;
                    
                    if ( (type == 3) || (type == 6 ) ){
                        x = x1;
                        X = X1;
                    }
                        
                    if ( isCrossingNodeOfWrongBranchVerticalSegment( commit, child, x) ){
                        commit.message = `CROSS WARN ( ${child.y} &#10142; ${commit.y} ) -- ${commit.message}`; // &#10142; = arrow
                    }
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

        };
        function isCrossingNodeOfWrongBranchVerticalSegment( commit, child, x){

            let thisBranchName = commit.branchName;
            
            for (let i = child.y + 1; i < commit.y; i++){
                
                // Skip if other lane
                if ( commitArray[i].x != x) {
                    continue;
                }
                
                if ( commitArray[i].branchName !== thisBranchName ){
                    return true
                }
            }
            return false
        }
        function isCrossingNodeOrLane( commit, child){
            
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
    
                //// When branch is known from Notes
                //if ( branchNames.has(branchName) && (branchNames.get(branchName) <= NUMBER_OF_KNOWN_BRANCHES)){
                if ( commit.hiddenBranchName ){
                    colorFileName = unsetNodeImageFile;
                }else{
                    
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

                    
                    noteInThisRow = endOfLastNote;

                    return noteInThisRow;
                }

               
        }
      

    
} // END DRAWGRAPH ------------------------------------------------------------
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
        html += '<pre id="desc_' +  hash + '" class="decoration"> &nbsp;' + decoration + '</pre>'

        return html 
    };
    function markLaneAsOccupied(commit){
        if (nodeMap.get(commit.parents[0]) == undefined){
            return
        }
        
        let lane = commit.x ;
        let until = nodeMap.get(commit.parents[0]).y;  // Add one extra row
        
        // Fill up if array too short
        while (lane > columnOccupiedStateArray.length){
            columnOccupiedStateArray.push(0);
        }
        
        // Mark as occupied
        columnOccupiedStateArray[ lane] = until;
          
    }
    function markConnectionAsOccupied(commit, child, occupiedColumn){
        for ( row = child.y; row < commit.y; row++){
            commitArray[row].occupiedColumns[ occupiedColumn] = commit.y;
            //console.log(row);
        }
    }
    function getFreeLane(commit, COMPRESS){
        // Look for lowest row-number in all children
        // That of parent[0] 
        
        /*
           commit.occupiedColumns is an array showing how far a lane is occupied downwards (or a number lower than the commit's row, when not occupied)
           
         
           1) A free lane must be available from the child that is furthest up, called lowestY down to the commit. 
           2) Best lane is the next lane to the right,  which is not occupied (in the whole range of rows examined)  
              An unknown branch can not be placed on the swim-lane of a known branch 

              Lane 0 is reserved for unknown first-parents
         
         
        */

        let lowestY  = commit.y;  // Start search at this commit
   
        // 1) Find child that starts furthest up
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
        
        // 2) Find highest occupied column in range between lowestY and commit
            let highestOccupiedCol = 1; // Column 0 is reserved for first-parent. Search from next column
            
            for(let row = lowestY; row < commit.y ; row++){
                let c = commitArray[row].occupiedColumns; // array with next occupied row number for each column
                
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
              
                                  
                // Mark occupied if commit is on an active swimlane
                if ( ( MODE == 'swim-lanes' ) &&  isOnActiveSwimlane(col, commit) ){ 
                    highestOccupiedCol = highestOccupiedCol + 1;
                }
                
                function isOnActiveSwimlane(lane, commit){
                    // Looks from commit to end of segment
                    
                    // Extent of segment
                    let start = commit.y;
                    

                    while ( !isAfterEndOfSegment(commit, false) && ( commit.y < commitArray.length - 1) ){
                        commit = nodeMap.get( commit.parents[0]);
                    }
                    let end = commit.y - 1;
                    //console.log('start = ' + start + '   End = ' + end);
                    
                    // Return true any commit is on active swimlane
                    let i = start;
                    while ( i < end){
                        if ( lane == branchNames.get(commitArray[i].branchName) ){
                            console.log('commit.y = ' + commit.y );
                            return true
                        }
                        i++;
                    }
                    return false
                }
            }
            
        return highestOccupiedCol
        
    };
    function isOnNamedBranch(commit){
        if ( branchNames.has( commit.branchName ) ){
            return ( branchNames.get( commit.branchName ) < NUMBER_OF_KNOWN_BRANCHES ); // Named branches are below index NUMBER_OF_KNOWN_BRANCHES
        }
        return false
    }
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
    function isAfterEndOfSegment(commit, cleanOccupied){
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
            if ( (count >= 1) && cleanOccupied ){  // is end of segment only if a branch point
                if (DEBUG)
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
    function copyFromPriorInSegment(commit){
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
                if ( child.parents[0] == commit.hash ){ // Copy from first-parent
                    // Found the child to copy from
                    //if ( (commit.branchName == "") || ( commit.branchName == child.branchName) ){ 
                    if ( commit.hiddenBranchName  ||  commit.unknownBranchName || ( commit.branchName == child.branchName) ){ 
                        commit.branchName = child.branchName;
                        commit.x = child.x;
                        commit.unknownBranchName = child.unknownBranchName;
                        commit.hiddenBranchName = child.hiddenBranchName;
                    }
                }
            }
        }
    }
        
// Branch name
function drawBranchColorHeader( branchNames){
    
    // Set new lastSelectedBranchName if incorrect
    let firstBranchNameInBranchNames = branchNames.entries().next().value[0]; // First element of map
    if ( !branchNames.has(firstBranchNameInBranchNames) ){
        lastSelectedBranchName = firstBranchNameInBranchNames;
    }
    
    
    
    const colorFileName = 'images/circle_green.png';
    
    let html = '';

    
    html += `
    <div id="unknown_first_parent_header" class="branchHeaderRow"> 
        <img class="node" src="${colorFileName}"> 
        <pre> Unknown first-parent branch </pre>
    </div>`;
    
    let unknownAndHiddenText = 'Unknown branch';
    if ( ( !state.graph.showHiddenBranches ) && ( document.getElementById('hiddenBranchesDiv').style.contentVisibility == 'visible' ) ){
        unknownAndHiddenText = 'Hidden / Unknown branch';
    }
    
    
    html += `
    <div class="branchHeaderRow"> 
        <img class="node" src="${unsetNodeImageFile}"> 
        <pre> ${unknownAndHiddenText} </pre> 
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


        // Link, with javascript to scroll, and then blink element to get attention (blink function defined in graph.html)
        html += `
        <div id="${id}" class="branchHeaderRow" style="cursor: pointer" 
            onclick = "
                var el=document.getElementById( '${mapVisibleBranchToTopCommit.get(key)}' );
                var desc=document.getElementById( 'desc_${mapVisibleBranchToTopCommit.get(key)}' );
                el.scrollIntoView(true);
                blink(el)
                blink(desc)
        "> 
            <img class="node" src="${colorFileName}"> 
            <pre>${key} </pre>
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
        if (value == lastSelectedBranchName){
            html += `<option value="${value}" selected="${value}">${value}</option>`
        }else{
            html += `<option value="${value}">${value}</option>`
        }
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
        lastSelectedBranchName = name;
        
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

