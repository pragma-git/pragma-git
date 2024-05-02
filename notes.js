// ---------
// INIT
// ---------
const gui = require("nw.gui"); // TODO : don't know if this will be needed
const os = require('os');
const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');  // (const simpleGit = opener.simpleGit  --  Does not work);

var util = require('./util_module.js'); // Pragma-git common functions

const pathsep = require('path').sep;  // Os-dependent path separator
    
const settingsDir = os.homedir() + pathsep + '.Pragma-git'; 

var editor;  // Editor object
var filePath;// Path to open file
var fileDir; // Path to folder of open file

var repoName = 'unknown'

var cachedHistory;  // Cached history for all versions of this file
var historyNumber = -1; // step back in history.  -1 means not in history. First history is at index 0

// Save every 30 seconds
window.setInterval(save, 30 * 1000 );

// Start initiated from notes.html
async function injectIntoNotesJs(document) {
    win = gui.Window.get();
    
    filePath = global.arguments[0];
    fileDir = path.dirname(filePath);
    global.arguments =[]; // Empty this
    
    // Open file
    let content = "";
    try{
        content = fs.readFileSync(filePath,'utf8');
    }catch(err){
        
    }

    
    options = {
        el: document.querySelector('#editor'),
        previewStyle: 'vertical',
        height: '100%',
        initialValue: content
    };
    
    
    // Disable Google Analytics
    usageStatistics: false;
    
 
    // Add search button to toolbar
    button1 = document.createElement('button');
    button1.style = "top: -2px; position: absolute; right: 60px";
    button1.classList.add('my-icon');
    button1.setAttribute("id", 'find-icon');
    button1.innerHTML = '<img class="my-img" height="17" width="17"  src="images/find_hover.png" >';
    button1struct = {  
            name: 'find',
            event: 'clickCustomButton1',
            el: button1
        };
        
 
    // Add help button to toolbar
    button2 = document.createElement('button');
    button2.style = "top: -2px; position: absolute; right: 20px; ";
    button2.classList.add('my-icon');
    button2.setAttribute("id", 'help-icon');
    button2.innerHTML = '<img class="my-img" height="17" width="17"  src="images/questionmark_hover.png" >';
    button2struct = {  
            name: 'help',
            event: 'clickCustomButton2',
            el: button2
        };
    
 
    // Add history button to toolbar
    button3 = document.createElement('button');
    button3.style = "top: -2px; position: absolute; right: 120px";
    button3.classList.add('my-icon');
    button3.setAttribute("id", 'history-icon');
    button3.innerHTML = '<img class="my-img" height="17" width="17"  src="images/history_hover.png" >';
    button3struct = {  
            name: 'help',
            event: 'clickCustomButton3',
            el: button3
        };
 
    
    // Add buttons to editor options (omit 'scrollSync' function)
    options.toolbarItems = [
        ['heading', 'bold', 'italic', 'strike'],
        ['hr', 'quote'],
        ['ul', 'ol', 'task', 'indent', 'outdent'],
        ['table', 'image', 'link'],
        ['code', 'codeblock'],
        [ button1struct, button2struct, button3struct ],
    ];

        
    // Initiate Editor
    options.initialEditType = global.state.notesWindow.editMode; // Set wysiwyg or markdown
    
    editor =  new Editor( options);


    // Event listeners
    button1.addEventListener('click', () => {
        findInNw.showSearchBox();
    });
 

    button2.addEventListener('click', () => {
        let evt = {}; 
        evt.name='Notes';
        parent.opener._callback('help',evt); 
    });       
    
    button3.addEventListener('click', () => {
        let evt = {}; 
        evt.name='Notes';
        // Note : Action takes place in notes_iframe.html at  "Override document-click" 
        //        (this allows open/close menu from icon, and close menu from document-click)
    });       
      
    
    // Title
    repoName = path.basename( global.state.repos[global.state.repoNumber].localFolder);
    document.title = `Notes  —  ${repoName}  `;

    if (global.localState.dark){
        document.getElementById('editor').classList.add('dark');
        
        document.body.classList.add('dark');
        document.body.classList.remove('light');
    }
    //window.document.body.style.zoom = global.state.zoom;
    
    // Get history
    getHistory();

};

function save(){
    
    // Bail out if history menu is open
    if ( parent.document.getElementById("historyMenu").style.display == 'block' ){
        console.log('NO SAVE -- history menu is open');
        return
    }    
    
    // Bail out if find-in-nw has marked stuff
    if (findInNw.total > 0){
        console.log('WARNING DID NOT SAVE -- REASON: FIND IS OPEN, AND MARKS ARE INSERTED (Close find to save)');
        return
    }

    let content = "";
    try{
        content = editor.getMarkdown();
        fs.writeFileSync(filePath,content,'utf8');
    }catch(err){
        console.log('FAILED SAVING FILE = ' + filePath);
        console.log(err);
    }    

}
async function closeWindow(){
    
    // Clear tokens (if find is still open)
    findInNw.clearTokens();   // Clear all <mark> inserted in html 
    
    // Save file
    save(); 
    
    // Save settings
    if ( editor.isWysiwygMode() ){
        global.state.notesWindow.editMode = 'wysiwyg';
    }else{
        global.state.notesWindow.editMode = 'markdown';
    }
    
    parent.opener.saveSettings(); // Save settings to file
    
    
    
    // Remove from menu
    parent.opener.deleteWindowMenu('Notes');
    
    // Commmit .Pragma-git settings dir
    await parent.opener.commitSettingsDir('Saved Notes for ' + repoName);
    
    // Mark that closed
    global.localState.notesWindow.open = false;

    console.log('clicked close window');
}
async function getHistory(){
        
    let file = path.relative(settingsDir, filePath);
    
    let hash;    // hash of commit to get
    let text;    // text in file
    
    // Get hashes for all notes
    try{
        await simpleGit(settingsDir).log( [ file ], onHistory);
        function onHistory(err, result){
            console.log(result); 
            cachedHistory = result.all; 
            console.log(' ============ Found N = ' + cachedHistory.length);
        } 
    }catch(err){        
        console.log(err);
    } 
}
async function getHistoricalNote(){
    
    // Example :  oldText = await gitHistoricalNote( 1);
    
    let file = path.relative(settingsDir, filePath);
        
    if ( historyNumber > ( cachedHistory.length - 1 ) ){
        historyNumber = cachedHistory.length - 1;
    }
    if ( historyNumber < 0 ){
        historyNumber = -1;
    }
    

     
    let hash = cachedHistory[ historyNumber].hash;
    
    // Read text from file with historyNumber
    await simpleGit(settingsDir).show( [ hash + ':' + file ], onCatFile)
    function  onCatFile(err, res){
        text = res;
    }
    
    console.log(text);
    
    // Set editor text
    editor.setMarkdown(text);
    editor.moveCursorToStart();
    
    // Set info text in history menu
    let dateTime = cachedHistory[ historyNumber].date;
    let date = dateTime.substr(0,10);
    let time = dateTime.substr(11,5);
    
    parent.document.getElementById('info').innerHTML = time + '<br>' + date;
    
}
