

// Learned from :
// https://blog.beardhatcode.be/2018/03/your-own-git-mergetool.html



// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');
var mime = require('mime-types'); //

//var util = require('util_module.js'); // Pragma-git common functions

var dmp = require('node_modules/diff-match-patch/index.js'); // Google diff-match-patch  TODO: -- needed?


// Remember state
var panes = 2;
var lastPaneNumber = panes; // Updates every InitUI
var cachedFile = {};  // Struct to store content from files loaded


// Read paths

const ROOT = process.env.PWD;

const BASE = nw.App.argv[0];   // name of a temporary file containing the common base for the merge
const LOCAL = nw.App.argv[1];  // name of a temporary file containing the contents of the file on the current branch
const REMOTE = nw.App.argv[2]; // name of a temporary file containing the contents of the file to be merged
const MERGED = nw.App.argv[3]; // name of the file to which the merge tool should write the result

console.log('PATHS : ')
console.log('$ROOT   = ' + ROOT);
console.log('$BASE   = ' + BASE);
console.log('$LOCAL  = ' + LOCAL);
console.log('$REMOTE = ' + REMOTE);
console.log('$MERGED = ' + MERGED);

// Set working folder
process.chdir( ROOT);  // Now all relative paths works


// Modified from GUI
var connect = null; // null or "align"
var collapse = false; 

// Options for MergeView
const optionsTemplate = {
    lineNumbers: true,
    mode: "text/html",
    highlightDifferences: true,
    connect: connect
  };
var options = optionsTemplate;
  
var dv = {}; // initUI sets this CodeMirror.MergeView instance
dv.panes = panes; // Initial value


window.setInterval(save, 30 * 1000 );  // TODO : autosave

/* .gitconfig howto
 * 
[mergetool "pragma-merge"]
    cmd = /Applications/nwjs.app/Contents/MacOS/nwjs  ~/Documents/Projects/Pragma-git/Pragma-git/merge "$BASE" "$LOCAL" "$REMOTE" "$MERGED"
    trustExitCode = true
*/ 

// Start initiated from html
function injectIntoJs(document) {
    cachedFile.BASE = loadFile(BASE);
    cachedFile.LOCAL = loadFile(LOCAL);
    cachedFile.REMOTE = loadFile(REMOTE);
    cachedFile.MERGED = loadFile(MERGED);
    
    document.getElementById('title').innerText = 'File = ' + MERGED;
    
    initUI();
};

function loadFile(filePath)  { 
    let content = "";
    try{
        content = fs.readFileSync(filePath,'utf8');
    }catch(err){
        
    }
    
    return content;
} 
function getMimeType(filePath){
    var fileExt = filePath.split('.').pop();
    
    return mime.lookup(fileExt);
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
  return Math.max(editorHeight(mergeView.leftOriginal()),
                  editorHeight(mergeView.editor()),
                  editorHeight(mergeView.rightOriginal()));
}
function resize(mergeView) {
  var height = mergeViewHeight(mergeView);
  for(;;) {
    if (mergeView.leftOriginal())
      mergeView.leftOriginal().setSize(null, height);
    mergeView.editor().setSize(null, height);
    if (mergeView.rightOriginal())
      mergeView.rightOriginal().setSize(null, height);

    var newHeight = mergeViewHeight(mergeView);
    if (newHeight >= height) break;
    else height = newHeight;
  }
  mergeView.wrap.style.height = height + "px";
}

// Modified 
function initUI() {
    
    // New start
    options = optionsTemplate;
    
    
    options.mode = getMimeType(MERGED);
    console.log('MIME-type = ' + options.mode);
    
    // Set state as set with clicky-buttons
    options.collapseIdentical = collapse; // Updated from GUI button
    options.connect = connect; // null or 'align'
    
    // Set display of clicky-buttons
    document.getElementById("two-way").classList.add('enabled');
    document.getElementById("three-way").classList.remove('enabled');

 
    
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
        
        if ( dv.panes == panes ){ 
            // 1) dv.editor().getValue() if not changed from 2-pane
            try{
                options.value = dv.editor().getValue();  // Use content, in case it has been edited
            }catch(err){
                // Lands here on open when dv not fully defined
                options.value = cachedFile.BASE;
            }
        }else{ 
            // 2) cachedFile.BASE if changed from 2-pane
            options.value = cachedFile.BASE;
        } 
        
        options.orig = cachedFile.REMOTE; 
        
        // html
        document.getElementById('left3').innerHTML = 'this ';
        document.getElementById('editor3').innerHTML = 'merge here ';
        document.getElementById('right3').innerHTML = 'other';
        
        document.getElementById('Headers2').style.visibility = 'collapse';
        document.getElementById('Headers3').style.visibility = 'visible';
        
        disable('two-way');
        enable('three-way');
      }  
      
      if ( panes == 2){
        options.origLeft = null;
        
        let editorLabel;
        let rightViewerLabel;
        
        // Set mode-dependent params
        switch (getMode() ){
          case 'UNCOMMITTED_DIFF': { 
            editorLabel = 'new'; 
            rightViewerLabel = 'stored';
            try{
                options.value = dv.editor().getValue();  // Use content, in case it has been edited
            }catch(err){
                options.value = loadFile(REMOTE);
            }
            
            options.orig = cachedFile.LOCAL;
            break; 
          }
          case 'HISTORY_DIFF':  { //
            editorLabel = 'selected'; 
            rightViewerLabel = 'previous';
            options.value = cachedFile.REMOTE;  // Can't be changed, because readonly
            options.orig = cachedFile.LOCAL;
            
            readOnlyOption(true); // Sets this mode to read only
            break;
          }
          case 'MERGE':  { 
            editorLabel = 'this'; 
            rightViewerLabel = 'other'; 
            
            if ( dv.panes == panes ){ // Not changed number of panes
                // 1) dv.editor().getValue() if not changed from 3-pane
                try{
                    options.value = dv.editor().getValue();  // Use content, in case it has been edited
                }catch(err){
                    // Lands here on open when dv not fully defined
                    options.value = cachedFile.LOCAL;
                }
            }else{
                // 2) cachedFile.LOCAL if changed from 3-pane
                options.value = cachedFile.LOCAL;
            }
            
            
            options.orig = cachedFile.REMOTE
            break;
          }
        } 
        
        // Apply mode-dependency html
        document.getElementById('editor2').innerHTML = editorLabel;
        document.getElementById('right2').innerHTML = rightViewerLabel;
        
        document.getElementById('Headers2').style.visibility = 'visible';
        document.getElementById('Headers3').style.visibility = 'collapse';
          
           
        enable('two-way');
        disable('three-way');
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


}

// Show button states
function enable(id){
    document.getElementById(id).classList.remove('disabled');
    document.getElementById(id).classList.add('enabled');
}
function disable(id){
    document.getElementById(id).classList.remove('enabled');
    document.getElementById(id).classList.add('disabled');
}

// Make readonly
function readOnlyOption( readonly){
    if (readonly){
        // Make readonly
        options.revertButtons = false;
        options.readOnly = true; 
        document.getElementById('title').innerText = document.getElementById('title').innerText + ' (READ-ONLY)';
        
        // Hide Save and cancel buttons
        document.getElementById('cancel').style.visibility = 'collapse';
        document.getElementById('save').style.visibility = 'collapse';

        
        // Show Close button
        document.getElementById('close').style.visibility = 'visible';
        document.getElementById('close').style.float = 'right';

    }
}

function getMode( ){
    if ( REMOTE == MERGED){
        return 'UNCOMMITTED_DIFF';
    }    
    if ( BASE == MERGED){
        return 'HISTORY_DIFF';
    }
    
    
    return 'MERGE'
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

function closeWindow(){
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

function exitWithErrorCode(){
    // Only way I managed to close with an exit code different to 0 (this is equivalent to kill -9 in linux)
    process.kill(process.ppid, 'SIGKILL'); // Error code 137
}
