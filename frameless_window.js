// ---------
// INIT
// ---------

    var gui = require("nw.gui");
    const simpleGit = require('simple-git');  // npm install simple-git
    
    var repoSettings = {}; // Declare a struct
    repoSettings.localFolder = '/Users/jan/Desktop/TEMP/Test-git';
    
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
    try{
        await simpleGit(repoSettings.localFolder).status((err, result) => {console.log(result); console.log(err);status_data = result})
    }catch(err){
        console.log('ERROR');
    }
    setStatusBar( 'Modified = ' + status_data.modified.length + ' |  New = ' + status_data.not_added.length + ' |  Deleted = ' + status_data.deleted.length);

    // Get name of current branch
    var currentBranch = status_data.current;


    // Get name of local folder  
    var currentDir = simpleGit(repoSettings.localFolder)._executor.cwd;    
    var foldername = currentDir.replace(/^.*[\\\/]/, '');
    
    // KEEP HERE: May be useful in future 
    //
    // 1) Get name of Repo
    //var rawOut; 
    //await simpleGit.raw([ 'config', '--get', 'remote.origin.url'], (err, result) => {console.log(result); rawOut = result})
    //var repoName = rawOut.replace(/^.*[\\\/]/, '');
    
    // 2) Get list of all settings in local 
    //var listOut; 
    //await simpleGit.raw([ 'config', '--list'], (err, result) => {console.log(result); listOut = result})
    //
    // 3) Get list of local branches
    //var branchList;
    //await simpleGit.branch(['--list'], (err, result) => {console.log(result); branchList = result.all})
    
  
    setTitleBar( foldername + '  (<u>' + currentBranch + '</u>)'  );
}
async function gitAddAndCommit( message){
    var status_data;     
    var path = '.'; // All
    await simpleGit(repoSettings.localFolder).add( path, (err, result) => {console.log(result); status_data = result});
    await simpleGit(repoSettings.localFolder).commit( message, {'--all' : null} , (err, result) => {console.log(result); status_data = result});
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
async function dropFile(e) {
    e.preventDefault();
    
    // Reset css 
    document.getElementById('content').className = '';
    
    const item = e.dataTransfer.items[0];
    const entry = item.webkitGetAsEntry();
    
    var file = item.getAsFile().path;
    var folder = file; // Guess that a folder was dropped 
    
    // 
    if (entry.isFile) {
        folder = require('path').dirname(file); // Correct, because file was dropped
        console.log( 'Folder = ' + folder );
    } 
    // Find top folder in local repo
    var topFolder;
    await simpleGit(folder).raw([ 'rev-parse', '--show-toplevel'], (err, result) => {console.log(result); topFolder = result});
    topFolder = topFolder.replace('\n', ''); // Remove ending EOL
    
    // Set global
    repoSettings.localFolder = topFolder;
    console.log( 'Git  folder = ' + repoSettings.localFolder );
    
    // Update immediately
    gitStatus();
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
