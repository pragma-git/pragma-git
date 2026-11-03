
// Define DEBUG features
var devTools = false;
var isPaused = false; // Stop timer. In console, type :  isPaused = true

// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');
        
const pathsep = require('path').sep;  // Os-dependent path separator
        
const simpleGit = opener.simpleGit;

var state = global.state; // internal copy of global.state
var localState = global.localState; 

var win;

const delayInMs = 1000;

// Default sort order: descending (newest versions first, e.g. 2.0.1 before 0.9.1)
var sortDescending = true;

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
    let dx = document.getElementById('outerContent').scrollWidth * global.state.zoom;
    let dy = document.getElementById('outerContent').scrollHeight * global.state.zoom;
    
    let hx = window.outerWidth - window.innerWidth;
    let hy = window.outerHeight - window.innerHeight;
    window.resizeTo(dx + hx + 2 * padding , dy + hy + 2 * padding + 32);
    
    // Always on top
    win.setAlwaysOnTop( state.alwaysOnTop );
    
    // For systems that have multiple workspaces (virtual screens)
    if ( win.canSetVisibleOnAllWorkspaces() ){
        win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
    }

    // Initialize sort button display & populate window
    updateSortButtonDisplay();
    refreshTagList();
    
    // Set button name
    document.getElementById('Select-button').innerHTML =  localState.tagListButton;
    
    // Set title window_menu_handles_mapping
    tagDialogType = localState.tagListButton;
    document.title = 'Select tag to ' + tagDialogType;

};

function updateSortButtonDisplay() {
    let btn = document.getElementById('sortOrderButton');
    if (!btn) return;
    btn.innerHTML = '&uarr;&darr;'; // Bold adjacent arrows without space (↑↓)
    if (sortDescending) {
        btn.title = 'Current sort: Newest first (click to toggle order)';
    } else {
        btn.title = 'Current sort: Oldest first (click to toggle order)';
    }
}

function sortTags(tags, descending = true) {
    if (!Array.isArray(tags)) return [];
    return tags.slice().sort((a, b) => {
        let cmp = a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        return descending ? -cmp : cmp;
    });
}

function refreshTagList() {
    let filterRule = document.getElementById('tagFilterText').value.trim();
    if (!filterRule) {
        filterRule = '*';
    } else if (!filterRule.endsWith('*')) {
        filterRule = filterRule + '*';
    }
    let sorted = sortTags(localState.arrayTagList, sortDescending);
    fillSelectWithValues(sorted, filterRule);
}

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
    if (selectBox.options.length > 0) {
        selectBox.selectedIndex = 0;
    }
}

function matchRuleExpl(str, rule) {
  // From : https://stackoverflow.com/questions/26246601/wildcard-string-comparison-in-javascript  
  var escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  rule = rule.split("*").map(escapeRegex).join(".*");
  rule = "^" + rule + "$";
  var regex = new RegExp(rule);
  return regex.test(str);
}

async function _callback( name, event, event2){
    
    console.log('_callback = ' + name);
    switch(name) {
        
        case 'onFilterKeyUp': {
            refreshTagList();
            break;
        }

        case 'toggleSortOrder': {
            sortDescending = !sortDescending;
            updateSortButtonDisplay();
            refreshTagList();
            break;
        }

        case 'Select-button' : {
            console.log(event);
            opener._callback('tagSelected',event); // Calling _callback in opening window
            closeWindow();
            break;
        }
        
        case 'Cancel-button' : {
            closeWindow();
            break;
        }

    } // End switch
}

function closeWindow(){
    localState.tagListWindow = false;  // Show to main program that window is closed
    win.close();
}
