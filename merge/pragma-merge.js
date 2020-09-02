

// Learned from :
// https://blog.beardhatcode.be/2018/03/your-own-git-mergetool.html



// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');

var util = require('../util_module.js'); // Pragma-git common functions

var dmp = require('node_modules/diff-match-patch/index.js'); // Google diff-match-patch  TODO: -- needed?


// Remember state
var panes = 2;
var lastPaneNumber = panes; // Updates every InitUI


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
var connect = "align"; 
var collapse = false; 

var options = {
    lineNumbers: true,
    mode: "text/html",
    highlightDifferences: true,
    connect: connect
  };
  
var dv; // initUI sets this CodeMirror.MergeView instance



window.setInterval(save, 30 * 1000 );  // TODO : autosave

/* .gitconfig howto
 * 
[mergetool "pragma-merge"]
    cmd = /Applications/nwjs.app/Contents/MacOS/nwjs  ~/Documents/Projects/Pragma-git/Pragma-git/merge "$BASE" "$LOCAL" "$REMOTE" "$MERGED"
    trustExitCode = true
*/

// Start initiated from notes.html
async function injectIntoJs(document) {
    
    
    
    win = gui.Window.get();
    //win.showDevTools(); 
    

// Good placement for Three way sync   

    // Editor
    value = loadFile(BASE);
    
    // Left
    orig1 = loadFile(LOCAL);
    
    // Right 
    orig2 = loadFile(REMOTE);
    

// Good placement for Two way sync   

    // Editor
    value = loadFile(LOCAL);
    
    // Left
    orig1 = loadFile(REMOTE);
    
    // Right 
    delete orig2;   
    

    initUI();

    let d = document.createElement("div"); d.style.cssText = "width: 50px; margin: 7px; height: 14px"; dv.editor().addLineWidget(57, d)

    console.log(arguments);

    
    // Open file
    let content = "";
    try{
        content = fs.readFileSync(filePath,'utf8');
    }catch(err){
        
    }

};
function loadFile(filePath)  { 
    let content = "";
    try{
        content = fs.readFileSync(filePath,'utf8');
    }catch(err){
        
    }
    return content;
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
    
    // Set state as set with clicky-buttons
    options.collapseIdentical = collapse; // Updated from GUI button
    options.connect = connect; // null or 'align'
    
    // Set display of clicky-buttons
    document.getElementById("two-way").classList.add('enabled');
    document.getElementById("three-way").classList.remove('enabled');
    
    
    
    
    if (value == null) return;

 
     document.getElementById('title').innerText = 'File = ' + MERGED;
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
    
      if ( panes == 3){
    
        // content
        options.origLeft = loadFile(LOCAL);
        options.value = loadFile(BASE);  // editor
        options.orig = loadFile(REMOTE); 
        
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
            options.value = loadFile(REMOTE);  // editor
            options.orig = loadFile(LOCAL)
            break; 
          }
          case 'HISTORY_DIFF':  { 
            editorLabel = 'selected'; 
            rightViewerLabel = 'previous';
            options.value = loadFile(REMOTE);  // editor TODO: turn off edit in HISTORY_DIFF
            options.orig = loadFile(LOCAL);
            
            readOnlyOption(true); // Sets this mode to read only
            break;
          }
          case 'MERGE':  { 
            editorLabel = 'this'; 
            rightViewerLabel = 'other';
            options.value = loadFile(LOCAL);  // editor
            options.orig = loadFile(REMOTE)
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
