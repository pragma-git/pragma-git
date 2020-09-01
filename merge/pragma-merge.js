


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
    connect: connect,
    collapseIdentical: collapse
  };
  
var dv; // initUI sets this CodeMirror.MergeView instance



window.setInterval(save, 30 * 1000 );  // TODO : autosave

/* 
 * .gitconfig:
 * 
[mergetool "pragma-merge"]
    cmd = /Applications/nwjs.app/Contents/MacOS/nwjs  ~/Documents/Projects/Pragma-git/Pragma-git/merge "$BASE" "$LOCAL" "$REMOTE" "$MERGED"
    trustExitCode = true
*/

// Start initiated from notes.html
async function injectIntoNotesJs(document) {
    
    
    
    win = gui.Window.get();
    win.showDevTools(); 
    

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
    

    //value = document.documentElement.innerHTML;
    //orig1 = "<!doctype html>\n\n" + value.replace(/\.\.\//g, "codemirror/").replace("yellow", "orange");
    //orig2 = value.replace(/\u003cscript/g, "\u003cscript type=text/javascript ")
    //.replace("white", "purple;\n      font: comic sans;\n      text-decoration: underline;\n      height: 15em");
    
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




function initUI() {
  if (value == null) return;
    
  
 //let editorValue = dv.editor().getValue(); // Store changes 
 
 document.getElementById('title').innerText = 'File = ' + MERGED;
 
  
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
        options.orig = loadFile(LOCAL)
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
    
    // Apply mode-dependency
    document.getElementById('editor2').innerHTML = editorLabel;
    document.getElementById('right2').innerHTML = rightViewerLabel;
    
    document.getElementById('Headers2').style.visibility = 'visible';
    document.getElementById('Headers3').style.visibility = 'collapse';
  }
  
  if ( panes == 3){

    options.origLeft = loadFile(LOCAL);
    options.value = loadFile(BASE);  // editor
    options.orig = loadFile(REMOTE); 
    
    document.getElementById('LOCAL3').innerHTML = 'LOCAL ';
    document.getElementById('BASE3').innerHTML = 'MERGED ';
    document.getElementById('REMOTE3').innerHTML = 'OTHER (REMOTE)';
    
    document.getElementById('Headers2').style.visibility = 'collapse';
    document.getElementById('Headers3').style.visibility = 'visible';
  }  
  
  var target = document.getElementById("view");
  target.innerHTML = "";

  dv = CodeMirror.MergeView(target, options);

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









function save(){
    //let content = "";
    //try{
        //content = editor.getMarkdown();
        //fs.writeFileSync(filePath,content,'utf8');
    //}catch(err){
        //console.log('FAILED SAVING FILE = ' + filePath);
        //console.log(err);
    //}    

}

function closeWindow(){
    // Save file
    
    save(); 
    
    // Save settings
    global.state.notesWindow.editMode = editor.currentMode;
    opener.saveSettings(); // Save settings to file
    
    

    console.log('clicked close window');
    
    window.process.exit(1);
}
