// Init
var gui = require("nw.gui");

// Response

storeButtonClicked =  function() {
    sequentialStart(); 
}
async function sequentialStart(){
  setStatusBar('Start git commit');
  console.log('==SEQUENTIAL START==')

  // 1. Execution gets here almost instantly
  try{
      const commit = await gitCommit('/Users/jan/Desktop/TEMP/Test-git', readMessage(), '/tmp/Pragma-git-log.txt') 
      console.log(commit) 
      setStatusBar('Start git commit');
    }catch(e){
        console.log(e)
        setStatusBar(e.toString());
        return
    }

  
  const slow = await resolveAfter1Seconds()
  console.log(slow) // 2. this runs 2 seconds after 1.
  setStatusBar('Middle');

  const fast = await resolveAfter1Seconds()
  console.log(fast) // 3. this runs 3 seconds after 1.
  setStatusBar('End');
  
}
function gitCommit( path, message, last_log_file) {
    var failed = false;
    
    // Prepare external command
    var nwGui = require('nw.gui')
    , nwShell = nwGui.Shell
    , child_process = require('child_process')
    , exec = child_process.exec
    , execSync = child_process.execSync
    , execFile = child_process.execFile
    , execFileSync = child_process.execFileSync;
    
    console.log("Starting git commit")
    
    // Run asynchronous code
    const gitCommitPromise = 
        new Promise(function ourAsyncWork(resolve, reject){
            try{
                //execSync("cd '/Users/jan/Desktop/TEMP/Test-git' ;git commit -a -m 'test message' > /tmp/Pragma-git-log.txt");
                execSync("cd " +  path + ";git commit -a -m '" + message + "' > " + last_log_file);
                resolve("Done!");
            }catch(e){
                reject(new Error("Git commit error1"));
                failed = true;
            }
        })
        .then( function(returnedValue){
            console.log(returnedValue);
        })
        .catch( function(error){
            console.log(error);
            setStatusBar('Git commit error2');  // Overridden by setStatusBar in calling function 
            // TODO find reason and write it out
        }
    );
        
    // Throw error (so calling function can terminate downstream calls)  
    if (failed == true ){
        throw 'Git commit error3';
    }
}
function resolveAfter1Seconds() {
  console.log("starting fast promise")
  return new Promise(resolve => {
    setTimeout(function() {
      resolve("fast")
      console.log("fast promise is done")
    }, 1000)
  })
}

// Statusbar
function updateStatusBar( message){
    newmessage = document.getElementById('bottom-titlebar-text').innerHTML + message;
    document.getElementById('bottom-titlebar-text').innerHTML = newmessage;
    console.log('updateStatusBar = ' + newmessage);
}
function setStatusBar( message){
    document.getElementById('bottom-titlebar-text').innerHTML = message;
    console.log('setStatusBar = ' + message);
}
// Read message
function readMessage( ){
    return document.getElementById('message').value;
    
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
