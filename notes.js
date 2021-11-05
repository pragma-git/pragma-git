// ---------
// INIT
// ---------
const gui = require("nw.gui"); // TODO : don't know if this will be needed
const os = require('os');
const fs = require('fs');
const path = require('path');

var util = require('./util_module.js'); // Pragma-git common functions

var editor;  // Editor object
var filePath;// Path to open file


window.setInterval(save, 30 * 1000 );



// Start initiated from notes.html
async function injectIntoNotesJs(document) {
    win = gui.Window.get();
    
    filePath = global.arguments[0];
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
    button1.style = "background-color: transparent; top: -2px; position: absolute; right: 60px";
    button1.setAttribute("id", 'find-icon');
    button1.innerHTML = '<img  height="17" width="17"  src="images/find.png" >';
    button1struct = {  
            name: 'find',
            event: 'clickCustomButton1',
            el: button1
        };
        
 
    // Add help button to toolbar
    button2 = document.createElement('button');
    button2.style = "background-color: transparent; top: -2px; position: absolute; right: 20px";
    button2.setAttribute("id", 'help-icon');
    button2.innerHTML = '<img height="17" width="17"  src="images/questionmark_hover.png" >';
    button2struct = {  
            name: 'help',
            event: 'clickCustomButton2',
            el: button2
        };
    
    // Add buttons to editor options (omit 'scrollSync' function)
    options.toolbarItems = [
        ['heading', 'bold', 'italic', 'strike'],
        ['hr', 'quote'],
        ['ul', 'ol', 'task', 'indent', 'outdent'],
        ['table', 'image', 'link'],
        ['code', 'codeblock'],
        [ button1struct, button2struct ],
    ];

        
    // Initiate Editor
    options.initialEditType = global.state.notesWindow.editMode; // Set wysiwyg or markdown
    
    //const Editor = require('@toast-ui/editor'); 
    editor =  new Editor( options);


    // Event listeners
    button1.addEventListener('click', () => {
        findInNw.showSearchBox();
    });
 

    button2.addEventListener('click', () => {
        let evt = {}; 
        evt.name='Notes';
        opener._callback('help',evt); 
    });       
    
    
    // Title
    let repoName = path.basename( global.state.repos[global.state.repoNumber].localFolder);
    document.title = `Notes  —  ${repoName}  `;



};

function save(){
    
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
    
    opener.saveSettings(); // Save settings to file
    
    
    // Remove from menu
    opener.deleteWindowMenu('Notes');
    
    // Commmit .Pragma-git settings dir
    await opener.commitSettingsDir();
    
    // Mark that closed
    global.localState.notesWindow.open = false;

    console.log('clicked close window');
}

