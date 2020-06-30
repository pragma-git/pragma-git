// Start :
//   /Applications/nwjs.app/Contents/MacOS/nwjs  --remote-debugging-port=9222  .
//
// Debug with chrome:
//   http://127.0.0.1:9222/
//
//   Stop timer in console : clearInterval(timer)
//
// Secret if onClick doesn't work on html-element, add this to CSS :  -webkit-app-region: no-drag;


// TODO : Open questions
// - Make settings dialog
// - See if I can use simple-git.js Promise version (see : https://medium.com/@erbalvindersingh/pushing-a-git-repo-online-to-github-via-nodejs-and-simplegit-package-17893ecebddd )
// - How to setup remote repository ?  (see : https://medium.com/@erbalvindersingh/pushing-a-git-repo-online-to-github-via-nodejs-and-simplegit-package-17893ecebddd , or try my version by implementing raw REST calls)
// - How to switch branch
// - How to pull ? Auto-pull before push ?
// - How to merge ?
// - How to initialize git-flow ?
// - How to checkout
// - How to handle change in checkout which is not HEAD ?  Auto-create branch ?

// Docs : https://www.npmjs.com/package/simple-git
//        https://github.com/steveukx/git-js#readme  (nicely formmatted API)



// ---------
// INIT
// ---------


    var gui = require("nw.gui");    
    var os = require('os');
    var fs = require('fs');
    const simpleGit = require('simple-git');  // npm install simple-git
 
    const pathsep = require('path').sep;  // Os-dependent path separator
    const tmpdir = os.tmpdir();
      
    // Files & folders
    var settingsDir = os.homedir() + pathsep + '.Pragma-git'; mkdir( settingsDir);
    var settingsFile = settingsDir + pathsep + 'repo.json';    
       
    // json settings
    var jsonData = loadSettings(settingsFile);


    // Collect settings
    var repoSettings = {}; 
    repoSettings.localFolder = '/Users/jan/Desktop/TEMP/Test-git';
    
  
    // Timer
    gitStatus();
    var timer = setInterval(() => gitStatus(), 2000);


// ---------
// FUNCTIONS
// ---------

// Git commands
async function gitStatus(){
    // Read git status
    var status_data;  
    try{
        // Understand this: 
        // - simpleGit(dir).status( handler_function)
        // - handler_function is defined as an anonymous function with arrow ('=>') notation
        // - the two outputs from status are input variables to the anonymous function.
        await simpleGit(repoSettings.localFolder).status((err, result) => {console.log(result); console.log(err);status_data = result})
    }catch(err){
        console.log('Error in gitStatus()');
        console.log(err);
    }
 
    // If no files to commit
    if ( (status_data.modified.length + status_data.not_added.length + status_data.deleted.length) == 0){
        setStoreButtonEnableStatus( false );
        writeMessage( 'No changed files to store', true); // Write to placeholder
    }else {
        var message = readMessage();
        if (message.length == 0){
            writeMessage( 'Add description...', true);
        }
    }
    
    // Status
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
    

  
    setTitleBar( 'top-titlebar-repo-text', foldername   );
    setTitleBar( 'top-titlebar-branch-text', '  (<u>' + currentBranch + '</u>)' );
}
async function gitAddCommitAndPush( message){
    var status_data;     
    
    // Read current branch
    try{
        await simpleGit(repoSettings.localFolder).status((err, result) => {console.log(result); console.log(err);status_data = result})
    }catch(err){
        console.log('Error in gitStatus()');
        console.log(err);
    }
    var currentBranch = status_data.current;
    var remoteBranch = currentBranch; // Assume that always same branch name locally and remotely
    
    // Add all files
    setStatusBar( 'Adding files');
    var path = '.'; // Add all
    await simpleGit(repoSettings.localFolder).add( path, (err, result) => {console.log(result) });
    await waitTime( 1000);
    
    // Commit including deleted
    setStatusBar( 'Commiting files  (to ' + currentBranch + ')');
    await simpleGit(repoSettings.localFolder).commit( message, {'--all' : null} , (err, result) => {console.log(result) });
    await waitTime( 1000);
    
    // Push (and create remote branch if not existing)
    setStatusBar( 'Pushing files  (to remote ' + remoteBranch + ')');
    await simpleGit(repoSettings.localFolder).push( remoteBranch, {'--set-upstream' : null}, (err, result) => {console.log(result) }); 
    await waitTime( 1000);  
        
    gitStatus();
}

// Test
function waitTime( delay) {
  console.log("starting fast promise")
  return new Promise(resolve => {
    setTimeout(function() {
      resolve("fast")
      console.log("fast promise is done")
    }, delay)
  })
}

// OS commands
function mkdir(dir){
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
}

// Utility functions
function updateStatusBar( text){
    newmessage = document.getElementById('bottom-titlebar-text').innerHTML + text;
    document.getElementById('bottom-titlebar-text').innerHTML = newmessage;
    console.log('updateStatusBar = ' + newmessage);
}
function setStatusBar( text){
    document.getElementById('bottom-titlebar-text').innerHTML = text;
    console.log('setStatusBar = ' + text);
}
function setTitleBar( id, text){
    document.getElementById(id).innerHTML = text;
    console.log('setTitleBar (element ' + id + ') = ' + text);
}

function setStoreButtonEnableStatusFromText() {
    // Enable if message text 
    var message = readMessage();
    setStoreButtonEnableStatus( (message.length > 0 ));
}
function setStoreButtonEnableStatus( enableStatus) {
    document.getElementById('store-button').disabled = !enableStatus;
}

// Message
function readMessage( ){
    return document.getElementById('message').value;
}
function writeMessage( message, placeholder){
    if (placeholder){
        document.getElementById('message').value = "";
        document.getElementById('message').placeholder = message;
    }else{
        document.getElementById('message').value = message;
    }
}

// Settings
function saveSettings(){
    
    // Update current window position
        win = gui.Window.get();
        jsonData.position.x = win.x;
        jsonData.position.y = win.y;
        jsonData.position.width = win.width;
        jsonData.position.height = win.height;  
    
    // Save settings
    var jsonString = JSON.stringify(jsonData, null, 2);
    fs.writeFileSync(settingsFile, jsonString);
}
function loadSettings(settingsFile){
    try{
        jsonString = fs.readFileSync(settingsFile);
        jsonData = JSON.parse(jsonString);
    }catch(err){
        // Defaults
        jsonData = {};
        jsonData.localFolder = '/Users/jan/Desktop/TEMP/Test-git';
        jsonData.homedir = os.homedir();
        
        jsonData.repos = [];
        jsonData.repos[0] = {}; 
        jsonData.repos[0].localFolder = '/Users/jan/Desktop/TEMP/Test-git';
        jsonData.repos[1] = {}; 
        jsonData.repos[1].localFolder = '/Users/jan/Documents/Projects/Pragma-git/Pragma-git';

    }
    
    // Move window
    try{
        // Validate position on screen
        if ( (jsonData.position.x + jsonData.position.width) > screen.width ) {
            jsonData.position.x = screen.availLeft;
        }
        
        if ( (jsonData.position.y + jsonData.position.height) > screen.height ){
            jsonData.position.y = screen.availTop;
        }
        
        // Position and size window
        win = gui.Window.get();
        win.moveTo( jsonData.position.x, jsonData.position.y);
        win.resizeTo( jsonData.position.width, jsonData.position.height);

        
    }catch(err){
        console.log('Error setting window position and size');
        console.log(err);
    }
    return jsonData;
}

// ---------
// CALLBACKS
// ---------

// Title bar
function closeWindow() {
    // Store window position
    jsonData["position"] = {}; // New level
    jsonData["position"]["x"] = gui.Window.get().x;
    jsonData["position"]["y"] = gui.Window.get().y;
    jsonData["position"]["height"] = gui.Window.get().height;
    jsonData["position"]["width"] = gui.Window.get().width;
    
    saveSettings();
    gui.App.closeAllWindows();
}

function updateImageUrl(image_id, new_image_url) {
  var image = document.getElementById(image_id);
  if (image)
    image.src = new_image_url;
}
function focusTitlebars(focus) {
  var bg_color = focus ? "#3a3d3d" : "#7a7c7c";
    
  var titlebar = document.getElementById("top-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
  titlebar = document.getElementById("bottom-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
  titlebar = document.getElementById("left-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
  titlebar = document.getElementById("right-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
}
function updateContentStyle() {
  var content = document.getElementById("content");
  if (!content)
    return;

  var left = 0;
  var top = 0;
  var width = window.outerWidth;
  var height = window.outerHeight;

  var titlebar = document.getElementById("top-titlebar");
  if (titlebar) {
    height -= titlebar.offsetHeight + 36 + 2;
    top += titlebar.offsetHeight;
  }
  titlebar = document.getElementById("bottom-titlebar");
 
  // Adjust content width by border
  width -=   6 ; // Width in content border

  var contentStyle = "position: absolute; ";
  contentStyle += "left: " + left + "px; ";
  contentStyle += "top: " + top + "px; ";
  contentStyle += "width: " + width + "px; ";
  contentStyle += "height: " + height  + "px; ";
  content.setAttribute("style", contentStyle);
}

function repoClicked(){
    console.log('repo clicked');
}
function branchClicked(){
    console.log('branch clicked');
}


// Content
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
    topFolder = topFolder.replace(os.EOL, ''); // Remove ending EOL
    
    // Set global
    repoSettings.localFolder = topFolder;
    console.log( 'Git  folder = ' + repoSettings.localFolder );
    
    // Update immediately
    gitStatus();
};
function storeButtonClicked() { 
    gitAddCommitAndPush( readMessage());
}  


// Status bar
function showAbout() {    
    console.log('About button pressed');
    
    about_win = gui.Window.open('about.html#/new_page', {
        position: 'center',
        width: 600,
        height: 600
    });
    
    // gui.Window.get().y  // Gets position of my gui window
}
function settingsDialog() {    
    console.log('settings dialog pressed');
    
    // TODO : Here settings can be done.  For instance remote git linking
}

// ------
// EVENTS
// ------
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
