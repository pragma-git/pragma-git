// ---------
// INIT
// ---------

    var gui = require("nw.gui");
    
    const simpleGit = require('simple-git')('/Users/jan/Desktop/TEMP/Test-git');  // npm install simple-git
    
    // May be split : simpleGit = require('simple-git'); simpleGit('/Users/jan/Desktop/TEMP/Test-git').api-function......
    //
    // Get toplevel for git : git rev-parse --show-toplevel (could be useful to stop user from giving wrong folder)
    
    // TODO : 
    // - How to select folder?
    // - How to setup remote repository ?
    // - How to switch branch
    // - How to pull ?
    // - How to merge ?
    // - How to initialize git-flow ?
    // - How to checkout
    // - How to handle change in checkout which is not HEAD ?  Auto-create branch ?
    
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
    // Read git status
    var status_data;  
    await simpleGit.status((err, log) => {console.log(log); status_data = log})
    setStatusBar( 'Modified = ' + status_data.modified.length + ' |  New = ' + status_data.not_added.length + ' |  Deleted = ' + status_data.deleted.length);

    // Get name of current branch
    var currentBranch = status_data.current;


    // Get name of local folder  
    var currentDir = simpleGit._executor.cwd;    
    var foldername = currentDir.replace(/^.*[\\\/]/, '');
    
    // KEEP HERE: May be useful in future 
    //
    // 1) Get name of Repo
    //var rawOut; 
    //await simpleGit.raw([ 'config', '--get', 'remote.origin.url'], (err, log) => {console.log(log); rawOut = log})
    //var repoName = rawOut.replace(/^.*[\\\/]/, '');
    
    // 2) Get list of all settings in local 
    //var listOut; 
    //await simpleGit.raw([ 'config', '--list'], (err, log) => {console.log(log); listOut = log})
    //
    // 3) Get list of local branches
    //var branchList;
    //await simpleGit.branch(['--list'], (err, log) => {console.log(log); branchList = log.all})
    
  
    setTitleBar( foldername + '  (<u>' + currentBranch + '</u>)'  );
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

// User actions
storeButtonClicked =  function() {    
    gitAddAndCommit( readMessage());
}  
function dropFile(e) {
    e.preventDefault();
    
    const item = e.dataTransfer.items[0];
    const entry = item.webkitGetAsEntry();
    if (entry.isFile) {
        const file = item.getAsFile();
        console.log( 'Dropped file = ' + file.path );
    } else if (entry.isDirectory) {
        const dir = item.getAsFile();
        console.log( 'Dropped folder = ' + dir.path );
    }
        
    return false;
};


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
