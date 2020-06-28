// ---------
// INIT
// ---------
    var gui = require("nw.gui");
    
    const simpleGit = require('simple-git')('/Users/jan/Desktop/TEMP/Test-git');  // npm install simple-git
    // Docs : https://www.npmjs.com/package/simple-git
    //        https://github.com/steveukx/git-js#readme  (nicely formmatted API)
    
    // Timer
    gitStatus();
    var timerId = setInterval(() => gitStatus(), 2000);


// ---------
// FUNCTIONS
// ---------

// Git commands
async function gitStatus(){
    var status_data;  
       
    await simpleGit.status((err, log) => {console.log(log); status_data = log})
    setStatusBar( 'Modified = ' + status_data.modified.length + ' |  New = ' + status_data.not_added.length + ' |  Deleted = ' + status_data.deleted.length);

    var currentBranch = status_data.current;
    var currentDir = simpleGit._executor.cwd;
    var filename = currentDir.replace(/^.*[\\\/]/, '');
    setTitleBar( filename + '  (' + currentBranch + ')');
}
async function gitAddAndCommit( message){
    var status_data;     
    var path = '.'; // All
    await simpleGit.add( path, (err, log) => {console.log(log); status_data = log});
    await simpleGit.commit( message, {'--all' : null} , (err, log) => {console.log(log); status_data = log});
    gitStatus();
}

// Statusbar
function updateStatusBar( text){
    newmessage = document.getElementById('bottom-titlebar-text').innerHTML + text;
    document.getElementById('bottom-titlebar-text').innerHTML = newmessage;
    console.log('updateStatusBar = ' + newmessage);
}
function setStatusBar( text){
    document.getElementById('bottom-titlebar-text').innerHTML = text;
    console.log('setStatusBar = ' + text);
}
function setTitleBar( text){
    document.getElementById('top-titlebar-text').innerHTML = text;
    console.log('setStatusBar = ' + text);
}

// Read message
function readMessage( ){
    return document.getElementById('message').value;
    
}

// ---------
// CALLBACKS
// ---------

// Response
storeButtonClicked =  function() {    
    gitAddAndCommit( readMessage());
}  

// Window functions
window.onfocus = function() { 
  console.log("focus");
  focusTitlebars(true);
};
window.onblur = function() { 
  console.log("blur");
  focusTitlebars(false);
};
window.onresize = function() {
  updateContentStyle();
};
window.onload = function() {
  var win = nw.Window.get();
  win.setAlwaysOnTop(true);
  
  updateContentStyle();
  gui.Window.get().show();
};
