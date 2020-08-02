
// Define DEBUG features
var devTools = true;
var isPaused = false; // Stop timer. In console, type :  isPaused = true

// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');
        
const pathsep = require('path').sep;  // Os-dependent path separator
        
const simpleGit = require('simple-git');  



var state = global.state; // internal copy of global.state
var localState = global.localState; 

var win

const delayInMs = 1000;

// Initiate GUI update loop 
//var timer = _loopTimer( 1000);

// Storage of paths to backup files
//const backupExtension = '.orig';
var origFiles = [];  // Store files found to be conflicting.  Use to remove .orig files of these at the end

// ---------
// FUNCTIONS
// ---------    

async function injectIntoJs(document) {
    
    console.log('tagList.js entered');
    win = gui.Window.get();
    
    // For systems that have multiple workspaces (virtual screens)
    if ( win.canSetVisibleOnAllWorkspaces() ){
        win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
    }

    if (devTools == true){
        win.showDevTools();  // WARNING : causes redraw issues on startup
    }
    
    // Set size to match content
    let padding = Number(document.getElementById('outerContent').style.padding.replace('px','') );
    let dx = document.getElementById('outerContent').scrollWidth;
    let dy = document.getElementById('outerContent').scrollHeight;
    
    let hx = window.outerWidth - window.innerWidth;
    let hy = window.outerHeight - window.innerHeight;
    window.resizeTo(dx + hx + 2 * padding , dy + hy + 2 * padding);
    
    // Always on top
    win.setAlwaysOnTop( state.alwaysOnTop );
    
    // For systems that have multiple workspaces (virtual screens)
    if ( win.canSetVisibleOnAllWorkspaces() ){
        win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
    }

    // Populate window
    fillSelectWithValues(localState.arrayTagList, '*');

};
function fillSelectWithValues( tagValues, filterRule){
    let selectBox = document.getElementById("tagSelection");
    selectBox.innerHTML = "";
    
    for (let tag of tagValues) {
        if ( matchRuleExpl(tag, filterRule) ){
            let selectOption = document.createElement('option');
            selectOption.innerHTML=tag;
            selectOption.value=tag;
            selectBox.appendChild(selectOption);
        }
    }
    
}
function matchRuleExpl(str, rule) {
  // From : https://stackoverflow.com/questions/26246601/wildcard-string-comparison-in-javascript  
    
  // for this solution to work on any string, no matter what characters it has
  var escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");

  // "."  => Find a single character, except newline or line terminator
  // ".*" => Matches any string that contains zero or more characters
  rule = rule.split("*").map(escapeRegex).join(".*");

  // "^"  => Matches any string with the following at the beginning of it
  // "$"  => Matches any string with that in front at the end of it
  rule = "^" + rule + "$"

  //Create a regular expression object for matching string
  var regex = new RegExp(rule);

  //Returns true if it finds a match, otherwise it returns false
  return regex.test(str);
}

async function _callback( name, event, event2){

    
    console.log('_callback = ' + name);
    switch(name) {
        
        case 'onFilterKeyUp': {
            let filterRule = document.getElementById('tagFilterText').value;
            filterRule = filterRule + '*';  // Implicit end with wildcard
            fillSelectWithValues( localState.arrayTagList, filterRule)
            break;
        }
        case 'Select-button' : {
            console.log(event);
            opener._callback('tagCheckout',event); // Calling _callback in opening window
            closeWindow();
            break;
        }
        
        case 'Cancel-button' : {
            closeWindow();
            break;
        }


    } // End switch
    
    // ---------------
    // LOCAL FUNCTIONS
    // ---------------

    function makeListOfUnstagedFiles(){
        let unStaged = [];
        
        var table = document.getElementById("listFilesTableBody");
        
        for (var i = 0, row; row = table.rows[i]; i++) {
            //iterate through rows
            //rows would be accessed using the "row" variable assigned in the for loop
            
            let col = row.cells[0]; // First column
        
            let isChecked = col.children[0].checked;
            let file  = col.children[1].innerText;
            if (isChecked == false) {
                unStaged.push(file);
            }

            console.log(col);

        }

        return unStaged;
    };


// ================= END CALLBACK =================  
}

function closeWindow(){

    // Return
    
    localState.tagListWindow = false;  // Show to main program that window is closed
    win.close();
    
}

