


// Learned from :
// https://blog.beardhatcode.be/2018/03/your-own-git-mergetool.html



// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');

var util = require('../util_module.js'); // Pragma-git common functions

var dmp = require('node_modules/diff-match-patch/index.js'); // Google diff-match-patch

var editor;  // Editor object
var filePath;// Path to open file

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

// Setup
process.chdir( ROOT);  // Now all relative paths works



window.setInterval(save, 30 * 1000 );

// Start as:
// ~/Documents/Projects/Pragma-git/Pragma-git/merge > /Applications/nwjs.app/Contents/MacOS/nwjs  --remote-debugging-port=9222  . 'hej' 'du'

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
}
