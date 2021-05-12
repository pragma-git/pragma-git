

// Learned from :
// https://blog.beardhatcode.be/2018/03/your-own-git-mergetool.html



// ---------
// INIT
// ---------
var gui = require("nw.gui"); 
var os = require('os');
var fs = require('fs');
var mime = require('mime-types'); // Mime

const pathsep = require('path').sep;  // Os-dependent path separator

var win;

// Remember state
var panes = 2;
var lastPaneNumber = panes; // Updates every InitUI
var cachedFile = {};  // Struct to store content from files loaded

var SAVED = false; // Flag to show that save has been performed.

// Read paths
//const ROOT = process.env.PWD;

// These three files are also defined in app.js
const SIGNALDIR = os.homedir() + pathsep + '.Pragma-git'+ pathsep + '.tmp';
const SIGNALFILE = SIGNALDIR + pathsep + 'pragma-merge-running';
const EXITSIGNALFILE = SIGNALDIR + pathsep + 'exit';

process.chdir( SIGNALDIR);
const ROOT = loadFile('repo_path').replace(/(\r\n|\n|\r)/gm, "");   
const BASE = loadFile('first').replace(/(\r\n|\n|\r)/gm, "");    // name of a temporary file containing the common base for the merge  ( Remove EOLs in these four rows)
const LOCAL = loadFile('second').replace(/(\r\n|\n|\r)/gm, "");  // name of a temporary file containing the contents of the file on the current branch
const REMOTE = loadFile('third').replace(/(\r\n|\n|\r)/gm, "");  // name of a temporary file containing the contents of the file to be merged
const MERGED = loadFile('fourth').replace(/(\r\n|\n|\r)/gm, ""); // name of the file to which the merge tool should write the result
console.log('PATHS : ')
console.log('$ROOT   = ' + ROOT);
console.log('$BASE   = ' + BASE);
console.log('$LOCAL  = ' + LOCAL);
console.log('$REMOTE = ' + REMOTE);
console.log('$MERGED = ' + MERGED);

// Set working folder
process.chdir( ROOT);  // Now all relative paths works

// HTML Title
const HTML_TITLE = 'File &nbsp;&nbsp; = &nbsp;&nbsp;' + MERGED

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

        
// Define help icon
const helpIcon = `<img style="vertical-align:middle;float: right" height="17" width="17"  src="../images/questionmark_black.png" onclick="opener._callback('help',{name: 'Merge Window'})">`;

//-----------
// FUNCTIONS
//-----------

// Start initiated from html
function injectIntoJs(document) {
    win = gui.Window.get();
    
    cachedFile.BASE = loadFile(BASE);
    cachedFile.LOCAL = loadFile(LOCAL);
    cachedFile.REMOTE = loadFile(REMOTE);
    cachedFile.MERGED = loadFile(MERGED);
    
    document.getElementById('title').innerHTML = HTML_TITLE;
    

    // Set saved gui mode settings
    collapse = global.state.pragmaMerge.hide_unchanged;

    if ( global.state.pragmaMerge.align ) {
        connect = 'align';
    }else{
        connect = null;
    }   

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
function initUI() {
    
    // New start
    options = optionsTemplate;
    
    
    options.mode = getMimeType(MERGED); // Mime
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
        document.getElementById('right3').innerHTML = 'other' + helpIcon;
        
        document.getElementById('Headers2').style.visibility = 'collapse';
        document.getElementById('Headers3').style.visibility = 'visible';
        
        disable2('two-way');
        enable2('three-way');
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
            
            if (global.localState.pinnedCommit !== ''){ 
                rightViewerLabel = 'pinned commit < ' + global.localState.pinnedCommit.substring(0,6) + ' >';
            }
            
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
        document.getElementById('editor2').innerHTML = editorLabel
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
    // Set size
    //
        
    resize();
    


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

// Make readonly
function readOnlyOption( readonly){
    if (readonly){
        // Make readonly
        options.revertButtons = false;
        options.readOnly = true; 
        document.getElementById('title').innerHTML = HTML_TITLE + ' &nbsp;&nbsp;(READ-ONLY VIEW)';
        
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

// Finishing
function finish( wayToFinish){
    
    switch(wayToFinish) {
        case 'cancel':  {
            closeWindowNicely(1);
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
    }catch(err){
        console.log('FAILED SAVING EXIT CODE TO FILE = ' + EXITSIGNALFILE);
        console.log(err);
        fs.writeFileSync(EXITSIGNALFILE,2,'utf8');// Special exit code if failed
    }
        
    // Remove file, to let script know it has stopped
    try {
        fs.unlinkSync(SIGNALFILE)
    
    } catch(err) {
        console.error(err)
    }
    
    // Store gui mode settings
    global.state.pragmaMerge.hide_unchanged = document.getElementById('hide-unchanged').checked;
    global.state.pragmaMerge.align = document.getElementById('align').checked;
    
    
    // Remove from menu
    opener.deleteWindowMenu('Pragma-merge');

    win.close();
}



