

// Learned from :
// https://blog.beardhatcode.be/2018/03/your-own-git-mergetool.html

 

// ---------
// INIT
// ---------
var gui = require("nw.gui"); 
var os = require('os');
var fs = require('fs');
const isBinaryFileSync = require("isbinaryfile").isBinaryFileSync;
var mime = require('mime-types'); // Mime
const util = require('./util_module.js'); // Pragma-git common functions

const simpleGit = parent.opener.simpleGit;         // Defined in app.js
const pragmaLog = parent.opener.pragmaLog;         // Defined in app.js
const simpleGitLog = parent.opener.simpleGitLog;   // Defined in app.js

const pathsep = require('path').sep;  // Os-dependent path separator

var win;

// Remember state
var panes = global.state.pragmaMerge.mergePanes;
var lastPaneNumber = panes; // Updates every InitUI
var cachedFile = {};  // Struct to store content from files loaded

var SAVED = false; // Flag to show that save has been performed.
var CLOSED = false;// Flag to show that it was closed by code (and not by clicking to close window)
var EDIT = false;  // Flag if pragma-merge is used as editor instead of diff tool (called with args: file --edit)

// Read paths

// These three files are also defined in app.js
const SIGNALDIR = os.homedir() + pathsep + '.Pragma-git'+ pathsep + '.tmp';
const SIGNALFILE = SIGNALDIR + pathsep + 'pragma-merge-running';
const EXITSIGNALFILE = SIGNALDIR + pathsep + 'exit-pragma-merge';

process.chdir( SIGNALDIR);

// Read file names stored in different files
const ROOT = loadFile('repo_path').replace(/(\r\n|\n|\r)/gm, "");   

const BASE = loadFile('first').replace(/(\r\n|\n|\r)/gm, "");    // name of a temporary file containing the common base for the merge  ( Remove EOLs in these four rows)

const SECOND = loadFile('second').replace(/(\r\n|\n|\r)/gm, "");  // name of a temporary file containing the contents of the file on the current branch
const LOCAL = SECOND;

const THIRD = loadFile('third').replace(/(\r\n|\n|\r)/gm, "");  // name of a temporary file containing the contents of the file to be merged
const REMOTE = THIRD;

var MERGED = loadFile('fourth').replace(/(\r\n|\n|\r)/gm, ""); // name of the file to which the merge tool should write the result

var IS_BINARY_HISTORICAL = false;  // Assume non-binary historical file in view or edit mode

console.log('PATHS : ')
console.log('$ROOT   = ' + ROOT);
console.log('$BASE   = ' + BASE);
console.log('$LOCAL  = ' + LOCAL);
console.log('$REMOTE = ' + REMOTE);
console.log('$MERGED = ' + MERGED);

// Set mode if called as editor
if (SECOND == '--edit'){
    setupAsBinary();
    EDIT = true; 
    MERGED = BASE;  // MERGED is OUTPUT file for diff, and therefore I use it also in editor mode
}

// Set working folder
process.chdir( ROOT);  // Now all relative paths works


// HTML Title
const HTML_TITLE = 'File    =   ' + MERGED;
        
// Define help icon
//const helpIcon = `<img style="vertical-align:middle;float: right; padding-right: 20px" height="17" width="17"  src="../images/questionmark_black.png" onclick="parent.opener._callback('help',{name: 'Merge Window'})">`;

const helpIcon =     `  <!-- Help icon --> 
                <img id="help-icon" style="vertical-align:middle;float: right; padding-right: 20px" height="17" width="17"  
                    onclick="parent.opener._callback('help',{name: 'Merge Window'})"  
                    onmouseover="document.getElementById('help-icon').src='../images/questionmark_hover.png' " 
                    onmouseout="document.getElementById('help-icon').src='../images/questionmark_black.png' " 
                    src="../images/questionmark_black.png" >`;

// Modified from GUI
var connect = null; // null or "align"
var collapse = false; 

// Options for MergeView
const optionsTemplate = {
    lineNumbers: true,
    mode: "text/html",
    highlightDifferences: true,
    connect: connect,
    readOnly: false
  };
var options = optionsTemplate;
  
var dv = {}; // initUI sets this CodeMirror.MergeView instance 
dv.panes = panes; // Initial value



//-----------
// FUNCTIONS
//-----------

async function setupAsBinary(){
        
    // Set Read-Only for Editor-mode 
    if ( (SECOND == '--edit') ){

        if  (THIRD == '--show'){
          
            // Override file with one from git
            let hash = global.localState.historyHash;
            await simpleGit( global.state.repos[global.state.repoNumber].localFolder ).show( [ hash + ':' + BASE ], onCatFile)
            function  onCatFile(err, res){
                cachedFile.BASE = res;
            }
            
            // Figure out if binary
            let fileBuffer = await Buffer.from( cachedFile.BASE);
            //IS_BINARY_HISTORICAL = await require("isbinaryfile").isBinaryFile( fileBuffer );
            IS_BINARY_HISTORICAL = isBinaryFileSync( fileBuffer );
            console.log('IS_BINARY_HISTORICAL = ' + IS_BINARY_HISTORICAL);
            
        }       

    }
}

// Start is initiated from html
function isBinaryFile(){

    try{
        if ( isBinaryFileSync(MERGED)  ){
            pragmaLog('Pragma-merge open file = "' + MERGED + '" (binary)');
            return true
        }        
    }catch (err){  
    }
        
    try{
        if ( (getMode() == 'EDITOR') && (THIRD == '--show') ){   
            console.log('IS_BINARY_HISTORICAL in isBinaryFile() = ' + IS_BINARY_HISTORICAL); 
            return IS_BINARY_HISTORICAL
        }
        
    }catch (err){  
    }
    
    return false
}
async function injectIntoJs(document) {
    win = gui.Window.get();
    
    cachedFile.BASE = loadFile(BASE);
    cachedFile.LOCAL = loadFile(LOCAL);
    cachedFile.REMOTE = loadFile(REMOTE);
    cachedFile.MERGED = loadFile(MERGED);
    
    // Set mode if called as editor
    if (SECOND == '--edit'){
        await setupAsBinary();
        EDIT = true; 
        MERGED = BASE;  // MERGED is OUTPUT file for diff, and therefore I use it also in editor mode
    }
    
    
    
    pragmaLog('Pragma-merge open file = "' + MERGED + '"');
    
    parent.document.title = HTML_TITLE;
    


    // Set saved gui mode settings
    collapse = global.state.pragmaMerge.hide_unchanged;

    if ( global.state.pragmaMerge.align ) {
        connect = 'align';
    }else{
        connect = null;
    }   
    
    console.log('Mime-modes : ');
    console.log(CodeMirror.mimeModes);

    
    // Set theme-selection GUI to current
    document.getElementById('theme-select').selectedIndex = 
        util.findObjectIndex( document.getElementById('theme-select').options, 'text', global.state.pragmaMerge.codeTheme );
    
    initUI();
    
        
    
    // Set Read-Only for Editor-mode 
    if ( (SECOND == '--edit') ){
        if  (THIRD == '--ro'){
            readOnlyOption( true); // Hides and changes some HTML
        }
        
        if  (THIRD == '--show'){
            readOnlyOption( true); // Hides and changes some HTML
          
            // Override file with one from git
            let hash = global.localState.historyHash;
            await simpleGit( global.state.repos[global.state.repoNumber].localFolder ).show( [ hash + ':' + BASE ], onCatFile)
            function  onCatFile(err, res){
                cachedFile.BASE = res;
            }
            
            // Figure out if binary
            let fileBuffer = await Buffer.from( cachedFile.BASE);
            //IS_BINARY_HISTORICAL = await require("isbinaryfile").isBinaryFile( fileBuffer );
            IS_BINARY_HISTORICAL = isBinaryFileSync( fileBuffer );
            console.log('IS_BINARY_HISTORICAL = ' + IS_BINARY_HISTORICAL);
            
        }       

    }
    
    // Force show binary scroll bar
    if (isBinaryFile()){
        dv.edit.refresh();  // Force redraw -- makes binary show scroll bars
    }
    
    document.getElementById('down').click()

};

function loadFile(filePath)  { 
    let content = "";
    try{
        content = fs.readFileSync(filePath,'utf8');
        console.log('Success reading "' + filePath +'"');
    }catch(err){
        console.warn('failed reading "' + filePath +'"');
    }
    
    return content;
} 
function findMimeFromExtension( extension){
    
    // Read  "node_modules/codemirror/mode/meta.js"  to find mime-type  
    
    // My version below works better than this :
    //found = CodeMirror.findModeByFileName(extension);
    
    console.log('Find mime-mode from extension (=' + extension + ')');
    
    let found = undefined;
    
    modeInfo = CodeMirror.modeInfo;
    
    
    //
    // Search extensions
    //   
    
    modeInfo.forEach( handleMode);
    
    function handleMode( row){
        if (row.ext == undefined){
            return;
        }
        
        i = row.ext.length - 1;
        while ( ( i >= 0 )  ){
            if ( row.ext[i] == extension ){
                found = row;
            }
            //console.log( row.ext[i] );
            i--;
        }
        
    }
    
    console.log( 'Found mime-mode = ' + found);
    
    if (found !== undefined){
        return  found.mime
    }
    
    //
    // Reach here if undefined -- search using shebang
    //
    let sheBang = cachedFile.BASE.split('\n')[0].split(' ')[0].split('/').pop();  // #!/bin/bash -x => bash 
    console.log('Plan B) Find mime-mode from shebang (=' + sheBang + ')');
    
    modeInfo.forEach( handleShebang);
    function handleShebang( row){
        if (row.ext == undefined){
            return;
        }
        
        i = row.ext.length - 1;
        while ( ( i >= 0 )  ){
            if ( row.ext[i] == sheBang ){
                found = row;
            }
            //console.log( row.ext[i] );
            i--;
        }
        
    }
    
    console.log( 'Found mime-mode = ' + found);
    
    if (found !== undefined){
        return  found.mime
    }  
    
    //
    // End with false if nothing found
    //   
    return false 
    
}


// Callbacks
function themeSelected( themeName){
    let root = document.documentElement;
    
    // Save setting
    global.state.pragmaMerge.codeTheme = themeName;
    
    if (themeName == "default"){
        root.style.setProperty('--markerColor', 'antiquewhite');
        return
    }
    console.log(themeName);
    
    // Load theme into iframe head
    let themeDir = 'node_modules/codemirror/theme/';
    let themeCssFile = themeDir + themeName + '.css';
    loadjscssfile( themeCssFile, "css") //dynamically load and add this .css file
    
    // Load theme into iframe head -- Override CodeMirror theme catalog with own (will be a non-existing file reference if not exists -- and won't be used then)
    themeDir = 'codeMirror_theme_override/'; 
    themeCssFile = themeDir + themeName + '.css';
    loadjscssfile( themeCssFile, "css") //dynamically load and add this .css file

    // Replace selected theme
    cm = document.getElementsByClassName("CodeMirror");
    for (var i = 0; i < cm.length; i++) {
      let themeString = 'cm-s-' + themeName;
      let classString = themeString + ' editorBackground';
      cm[i].className = cm[i].className.replace('cm-s-default', classString);
    }
    
    // Read chunk color from html option-tag
    let index = util.findObjectIndex( document.getElementById('theme-select').options, 'text', global.state.pragmaMerge.codeTheme );
    let chunkColor = document.getElementById('theme-select').options[index].getAttribute('chunk-color')
    
    // Set color from specification in pragma-merge_iframe.html 
    
    // Alt 1) specified chunkColor
    let color = chunkColor;
    
    // Alt 2) specified alpha
    if (chunkColor.substr(0,2) == "0.") {
        alpha = chunkColor;
        color = 'rgba(128, 128, 128, ' + alpha + ')';

    }
    
    root.style.setProperty('--markerColor', color);   
}
    function loadjscssfile(filename, filetype){
        // From http://www.javascriptkit.com/javatutors/loadjavascriptcss.shtml
        if (filetype=="js"){ //if filename is a external JavaScript file
            var fileref=document.createElement('script')
            fileref.setAttribute("type","text/javascript")
            fileref.setAttribute("src", filename)
        }
        else if (filetype=="css"){ //if filename is an external CSS file
            var fileref=document.createElement("link")
            fileref.setAttribute("rel", "stylesheet")
            fileref.setAttribute("type", "text/css")
            fileref.setAttribute("href", filename)
        }
        if (typeof fileref!="undefined")
            document.getElementsByTagName("head")[0].appendChild(fileref)
    }
async function keepThis(){
    pragmaLog('Pragma-merge : Selected to keep THIS binary file.');
     await gitCheckout([ MERGED, '--ours']);

    closeWindowNicely(0);
    document.getElementById('isBinaryMerge').close();
    
    parent.window.close();  // Implies finish('unloadWindow');  because of pragma-merge_iframe.html unload-eventlistener
}
async function keepOther(){
    pragmaLog('Pragma-merge : Selected to keep OTHER binary file.');
    await gitCheckout([ MERGED, '--theirs']);
    
    closeWindowNicely(0);
    document.getElementById('isBinaryMerge').close();
    
    parent.window.close();  // Implies finish('unloadWindow');  because of pragma-merge_iframe.html unload-eventlistener
}
async function gitCheckout(options){
    let file = options[0];
    
    let folder = global.state.repos[global.state.repoNumber].localFolder;
    
    await simpleGitLog(folder).checkout( options, onCheckout);
    function onCheckout(err, result){
        console.log(result); 
        console.log(err); 
    } 
    
    simpleGitLog(folder).add( file, onAdd);
    function onAdd(err, result){
        console.log(result); 
        console.log(err); 
    } 
    
}
function addAllButtonClicked( clickedButtonName){

    // Identify side
    if (clickedButtonName =='right'){
        codeMirror = dv.right.orig;
        diffView = dv.right;
        mergeAll( codeMirror, diffView);
    }
    if (clickedButtonName =='left'){
        codeMirror = dv.left.orig;
        diffView = dv.left;
        mergeAll( codeMirror, diffView);
    }
    

   function mergeAll( pane, diffView){
        let chunks = diffView.chunks;
        console.log('Found ' + chunks.length + ' elements');
        for (let i = chunks.length -1; i >= 0 ; i--) {  // Replace from end to top, so character positions are not destroyed before using them
            copyChunk(dv, dv.edit, pane, chunks[i]);
        }
        chunks = diffView.chunks;
    }

     // Copied from merge.js -- and modified
     function copyChunk(dv, to, from, chunk) {
        let Pos = CodeMirror.Pos;  // Import function from CodeMirror
        
        if (dv.diffOutOfDate) return;
        var origStart = chunk.origTo > from.lastLine() ? Pos(chunk.origFrom - 1) : Pos(chunk.origFrom, 0)
        var origEnd = Pos(chunk.origTo, 0)
        var editStart = chunk.editTo > to.lastLine() ? Pos(chunk.editFrom - 1) : Pos(chunk.editFrom, 0)
        var editEnd = Pos(chunk.editTo, 0)
        to.replaceRange(from.getRange(origStart, origEnd), editStart, editEnd); 
     }

}

// Standard CodeMirror
function toggleDifferences() {
  dv.setShowDifferences(highlight = !highlight);
}
function mergeViewHeight(mergeView) {
  function editorHeight(editor) {
    if (!editor) return 0;
    return editor.getScrollInfo().height;
  }
  return global.state.zoom * Math.max(editorHeight(mergeView.leftOriginal()),
                  editorHeight(mergeView.editor()),
                  editorHeight(mergeView.rightOriginal()));
}
function resize() {
    
    let elements = document.getElementsByClassName('CodeMirror');
    for (i = 0;  i< elements.length; i++){
        document.getElementsByClassName('CodeMirror')[i].style.height = document.body.offsetHeight  - 86 + 'px'
    }
    document.getElementsByClassName('CodeMirror-merge')[0].style.height = document.body.offsetHeight  - 86+ 'px'


}

// Redraw 
async function initUI( keep) {
    /*
     * initUI is called when window opened, and when clicking in the GUI that changes the appearance
     * (Change 2-3 panes, "align" and "hide unchanged" checkboxes, "all"-buttons (MERGE and UNCOMMITTED_DIFF mode), 
     * 
     * Pragma-merge has the following  modes :
     * MERGE              2/3 panes R/W
     * UNCOMMITTED_DIFF   2 panes R/W
     * HISTORICAL_DIFF    2 panes R/O
     * EDITOR             1 pane  R/W or R/O
     * 
     * Opening in 3-pane mode (MERGE mode) the middle pane becomes empty for lines that are different in left and right panes.
     * Opening in 2-pane mode (MERGE mode) the left pane shows the whole local file, and the right pane the whole "remote" file.
     * 
     * The expected behavior switching between 3 and 2 pane mode would be the same as opening the file directly (above description)
     * 
     * Switching from 3 to 2 panes (MERGE mode) therefore shows the files as they were when first opened -- thus discarding any changes made in Pragma-merge
     * 
     * 
    */

    
    // New start
    options = optionsTemplate;
    
    // MIMI : New method (used)
    let fileExt = MERGED.split('.').pop();
    options.mode = findMimeFromExtension( fileExt)
    if (options.mode == false){
        let fileName = MERGED.split(pathsep).pop();
        let mime = CodeMirror.findModeByFileName( fileName );
        if (mime !== undefined){
            options.mode = mime.mime;
        }
    }
    
    
    console.log('MIME-type (new method) = ' + options.mode);
    
    
    // Set state as set with clicky-buttons
    options.collapseIdentical = collapse; // Updated from GUI button
    options.connect = connect; // null or 'align'
    
    // Set display of clicky-buttons
    document.getElementById("two-way").classList.add('enabled');
    document.getElementById("three-way").classList.remove('enabled');
    

    // Get executable bits 
    let showExecutableBitDiffersState = 'collapse'; // May be changed to 'visible' if relevant bits differ
    let execBits = await getExecutableFlags(BASE);
  
    
     //
     // 2 or 3 panes
     //
      if (getMode() !== 'MERGE'){
          // Only 'MERGE' can have 3 panes.  Fallback
          panes = 2;
          
          // Hide panes buttons
          document.getElementById('two-way').style.visibility = 'collapse';
          document.getElementById('two-way').style.width = '0px';
          
          document.getElementById('three-way').style.visibility = 'collapse';
          document.getElementById('three-way').style.width = '0px';
      }

      if ( panes == 3){  // This section is type MERGE if 3-panes (because above section forces others to 2-pane)
    
        // content
        options.origLeft = cachedFile.LOCAL;

        if (keep){
            options.value = dv.editor().getValue();
        }else{
            options.value = cachedFile.BASE;
        }
        
        

        options.orig = cachedFile.REMOTE; 
        
        // html
        document.getElementById('left3').innerHTML = 'this ';
        document.getElementById('editor3').innerHTML = 'merge here ';
        document.getElementById('right3').innerHTML = 'other' + helpIcon;
        
        document.getElementById('Headers2').style.visibility = 'collapse';
        document.getElementById('Headers3').style.visibility = 'visible';
        
        document.getElementById('right2_all').style.visibility = 'collapse';  // The one for 2 panes should be collapsed when 3 panes
        
        disable2('two-way');
        enable2('three-way');
      }  
      
      if ( panes == 2){
        options.origLeft = null;
        
        let editorLabel;
        let rightViewerLabel;
        
                
        document.getElementById('right2_all').style.visibility = 'collapse';  // Add-all button -- guess collapsed, correct if MERGE or UNCOMMITTED_DIFF
        
        // Set mode-dependent params
        switch (getMode() ){
          case 'UNCOMMITTED_DIFF': { 
            editorLabel = 'new'; 
            rightViewerLabel = 'stored';

            if (keep){
                options.value = dv.editor().getValue();
            }else{
                options.value = loadFile(REMOTE);
            }
            
            document.getElementById('right2_all').style.visibility = 'visible';  // Add-all button
            
            options.orig = cachedFile.LOCAL;

            if ( execBits.uncommitted !== execBits.HEAD ){
                showExecutableBitDiffersState = 'visible';
                editorLabel = `${editorLabel} <code>(x${execBits.uncommitted ? '+' : '-'})</code>`;
                rightViewerLabel = `${rightViewerLabel} <code>(x${execBits.HEAD ? '+' : '-'})</code>`;
            }
            
            break; 
          }
          case 'HISTORY_DIFF':  { //
            editorLabel = 'selected'; 
            rightViewerLabel = 'previous';
            
            if (global.localState.pinnedCommit !== ''){ 
                rightViewerLabel = 'pinned commit < ' + global.localState.pinnedCommit.substring(0,6) + ' >';
            }
            
            options.value = cachedFile.REMOTE;  // Can't be changed, because readonly
            options.orig = cachedFile.LOCAL;
            
            readOnlyOption(true); // Sets this mode to read only
            
            if ( execBits.previous !== execBits.selected ){
                showExecutableBitDiffersState = 'visible';
                editorLabel = `${editorLabel} <code>(x${execBits.selected ? '+' : '-'})</code>`;
                rightViewerLabel = `${rightViewerLabel} <code>(x${execBits.previous ? '+' : '-'})</code>`;
            }
            
            break;
          }
          case 'MERGE':  { 
            editorLabel = 'this'; 
            rightViewerLabel = 'other'; 
            
            if (keep){
                options.value = dv.editor().getValue();
            }else{
                options.value = cachedFile.LOCAL;
            }
            
            document.getElementById('right2_all').style.visibility = 'visible';  // Add-all button
            
            options.orig = cachedFile.REMOTE
            break;
          }
          case 'EDITOR':  { 
            editorLabel = 'this'; 
            rightViewerLabel = 'empty'; 
            
            if ( dv.panes == panes ){ // Not changed number of panes
                // 1) dv.editor().getValue() if not changed from 3-pane
                try{
                    options.value = dv.editor().getValue();  // Use content, in case it has been edited
                }catch(err){
                    // Lands here on open when dv not fully defined
                    options.value = cachedFile.BASE;
                }
            }else{
                // 2) cachedFile.LOCAL if changed from 3-pane
                options.value = cachedFile.BASE;
            }
            
            
            options.orig = cachedFile.BASE
            
            
            break;
          }          
          
          
        } 
   
        // Apply mode-dependency html
        document.getElementById('editor2').innerHTML = editorLabel;
        document.getElementById('right2').innerHTML = rightViewerLabel + helpIcon;
        
        document.getElementById('Headers2').style.visibility = 'visible';
        document.getElementById('Headers3').style.visibility = 'collapse';
          
           
        enable2('two-way');
        disable2('three-way');
      }


    //
    // Set content 
    // 
    
    var target = document.getElementById("view");
    target.innerHTML = "";
    
    dv = CodeMirror.MergeView(target, options);
    
    // Remember current number of panes (not part of CodeMirror, but I chose to store it here)
    dv.panes = panes;
    
    //
    // Set buttons 
    // 
    if (connect == 'align'){
        enable('align'); 
    }else{
        disable('align'); 
    }
    
    if (collapse){
        enable('hide-unchanged'); 
    }else{
        disable('hide-unchanged'); 
    }
    
    //
    // Set size, theme, and show search icons
    //
        
    resize();
    
    if ( panes == 2){
        addSearch('editor2', 'CodeMirror-merge-editor');
        addSearch('right2', 'CodeMirror-merge-right');
    }
    if ( panes == 3){
        addSearch('left3', 'CodeMirror-merge-left');
        addSearch('editor3', 'CodeMirror-merge-editor');
        addSearch('right3', 'CodeMirror-merge-right');
    }
    if ( getMode() == 'EDITOR'){
        changeToEditor();
    }

    themeSelected( global.state.pragmaMerge.codeTheme);
    document.getElementById('showExecutableBitDiffers').style.visibility = showExecutableBitDiffersState;

}
function addSearch(headerId, editorId){
    
    let leftPos = document.getElementsByClassName(editorId)[0].getBoundingClientRect().x + 40;
    let searchIconElementId = headerId + '_search';
    
    let headerElement = document.getElementById(headerId);
        
    headerElement.innerHTML = headerElement.innerHTML + 
    `  <!-- Search button --> 
                <img id="${searchIconElementId}" style='left:${leftPos}px;position: absolute' height="17" width="17"  
                    onclick="pragmaMergeSearchInEditorId = '${editorId}'; positionSearchBoxPragmaMerge()" 
                    onmouseover="document.getElementById('${searchIconElementId}').src='../images/find_hover.png' " 
                    onmouseout="document.getElementById('${searchIconElementId}').src='../images/find_black.png' " 
                    src="../images/find_black.png" >`;
}
function changeToEditor(){
    document.getElementsByClassName('CodeMirror-merge-gap')[0].style.visibility = 'collapse';
    document.getElementsByClassName('CodeMirror-merge-right')[0].style.visibility = 'collapse';
    document.getElementsByClassName('CodeMirror-merge-editor')[0].style.width = '-webkit-fill-available';
    
    document.getElementById('right2_search').style.visibility = 'collapse';
    document.getElementById('right2').style.visibility = 'collapse';
    document.getElementById('right2').style.position = 'fixed'; // ;Makes editor2 header move to right
    document.getElementById('editor2').style.width = '-webkit-fill-available';
    
    
    document.getElementById('editor2_search').style.right = '20px';
    document.getElementById('editor2_search').style.left = 'unset';
    
    document.getElementById('find-in-nw-search-box').style.right = '20px';
    document.getElementById('find-in-nw-search-box').style.left = 'unset';

    document.getElementById('align').style.display = 'none';
    document.getElementById('align-text').style.display = 'none';
    document.getElementById('hide-unchanged').style.display = 'none';
    document.getElementById('hide-unchanged-text').style.display = 'none';
 
    document.getElementById('up').style.display = 'none';
    document.getElementById('down').style.display = 'none';
} 

// Show button states
function enable(id){
    document.getElementById(id).checked = true;
}
function disable(id){
    document.getElementById(id).checked = false;
}
function enable2(id){
    document.getElementById(id).classList.remove('disabled');
    document.getElementById(id).classList.add('enabled');
}
function disable2(id){
    document.getElementById(id).classList.remove('enabled');
    document.getElementById(id).classList.add('disabled');
}

// Get / set mode
function readOnlyOption( readonly){
    if (readonly){
        // Make readonly
        options.revertButtons = false;
        options.readOnly = true; 
        parent.document.title = `${HTML_TITLE}    ( READ-ONLY VIEW )`;
        
        // Hide Buttons
        document.getElementById('cancel').style.visibility = 'collapse';
        document.getElementById('save').style.visibility = 'collapse';
        document.getElementById('reload').style.visibility = 'collapse';

        // Show Close button
        document.getElementById('close').style.visibility = 'visible';
        document.getElementById('close').style.float = 'right';

    }
}
function getMode( ){
    
    if ( EDIT ){
        console.log('--edit');
        return 'EDITOR';
    }
    if ( REMOTE == MERGED){
        return 'UNCOMMITTED_DIFF';
    }    
    if ( BASE == MERGED){
        return 'HISTORY_DIFF';
    }  
    
    
    return 'MERGE'
}

// Get info
async function getExecutableFlags( file){
    let executableResults = { uncommitted: undefined, HEAD: undefined, HEAD_1: undefined, selected: undefined, previous:  undefined};

    
     // Uncommitted (check executable flag directly -- Windows does only check if file exists)
    executableResults.uncommitted = !!(fs.statSync( BASE).mode & fs.constants.S_IXUSR)

    
    // HEAD
    await simpleGit( ROOT ).raw(  [ 'ls-tree', '-r', 'HEAD', file ], onLsFilesHEAD);
    function onLsFilesHEAD(err, result ){ 
        let info = result.split(' ')[0];  // '100755 4828b6ff0081ff5c16b026877dd348e85a0bb28e 0	Dockerize_defacing/deface.bash' => '100755'
        executableResults.HEAD = ( info == '100755');
    } 

    // HEAD~1
    await simpleGit( ROOT ).raw(  [ 'ls-tree', '-r', 'HEAD~1', file ], onLsFilesHEAD_1);
    function onLsFilesHEAD_1(err, result ){ 
        let info = result.split(' ')[0];  // '100755 4828b6ff0081ff5c16b026877dd348e85a0bb28e 0	Dockerize_defacing/deface.bash' => '100755'
        executableResults.HEAD_1 = ( info == '100755');
    } 
     
     
    // Bail out if not historical
    let hash = global.localState.historyHash;
    if ( (hash == undefined) || ( hash.trim() == '') ){
        return executableResults;
    }
    
    // selected (historical) 
    await simpleGit( ROOT ).raw(  [ 'ls-tree', '-r', hash, file ], onLsFilesSelected);
    function onLsFilesSelected(err, result ){ 
        let info = result.split(' ')[0];  // '100755 4828b6ff0081ff5c16b026877dd348e85a0bb28e 0	Dockerize_defacing/deface.bash' => '100755'
        executableResults.selected = ( info == '100755');
    }    
     
    // previous (historical) 
    await simpleGit( ROOT ).raw(  [ 'ls-tree', '-r', `${hash}~1`, file ], onLsFilesPrevious);
    function onLsFilesPrevious(err, result ){ 
        let info = result.split(' ')[0];  // '100755 4828b6ff0081ff5c16b026877dd348e85a0bb28e 0	Dockerize_defacing/deface.bash' => '100755'
        executableResults.previous = ( info == '100755');
    } 
       
    
    
    
    return executableResults;
}

// Finishing
function finish( wayToFinish){
    
    switch(wayToFinish) {
        case 'cancel':  {
            closeWindowNicely(1);
            //if (getMode() == 'MERGE'){
                //closeWindowNicely(100);  // Error code if Merge
            //}else{
                //closeWindowNicely(1);  // Error code if Diff
            //}
            break;
        }
        case 'close':  {
            closeWindowNicely(0);
            break;
        }
        case 'save':  {
            save();
            SAVED=true;
            closeWindowNicely(0);
            break;
        }
        case 'unloadWindow':  {
            // This function will be called when window is unloaded, regardless. 
            // 
            if (SAVED){
                closeWindowNicely(0);
            }else{
                closeWindowNicely(1);
            }

            break;
        }
    }
    parent.opener.updateChangedListWindow();
    win.close();

}
function save(){
    let content = "";
    try{
        content = dv.editor().getValue(); 
        fs.writeFileSync(MERGED,content,'utf8');
    }catch(err){
        console.log('FAILED SAVING FILE = ' + MERGED);
        console.log(err);
    }    
}
function closeWindowNicely(exitCode){
    
    // Write exit code to file for script to pick up
    try{
        fs.writeFileSync(EXITSIGNALFILE,exitCode+'','utf8'); // Exit code as string
        pragmaLog('Pragma-merge exit code = ' + exitCode );
    }catch(err){
        console.log('FAILED SAVING EXIT CODE TO FILE = ' + EXITSIGNALFILE);
        console.log(err);
        fs.writeFileSync(EXITSIGNALFILE,2,'utf8');// Special exit code if failed
    }

    
    // Store gui mode settings
    global.state.pragmaMerge.hide_unchanged = document.getElementById('hide-unchanged').checked;
    global.state.pragmaMerge.align = document.getElementById('align').checked;
    global.state.pragmaMerge.mergePanes = panes;
    
    
    // Remove from menu
    parent.opener.deleteWindowMenu('Pragma-merge');
        
        
    // Remove file, to let script know it has stopped
    try {
        fs.unlinkSync(SIGNALFILE)
    
    } catch(err) {
        console.error(err)
        pragmaLog('ERROR in closeWindowNicely : ');
        pragmaLog(err);
    }
    
    CLOSED = true;
    //win.close();
}



