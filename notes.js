// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');

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
     
    
    // See notes about how editor is loaded in "notes.html"
    let options = {
      el: document.querySelector('#editor'),
      height: '100%',
      initialValue: content,
      previewStyle: 'vertical',
      usageStatistics: false
    }

    options.initialEditType = global.state.notesWindow.editMode; // Set wysiwyg or markdown

    editor =  new Editor( options);
    
    
    
    //
    // Add search button to toolbar
    //
    
    button = document.createElement('button');
    button.setAttribute("id", 'find-icon');
    button.innerHTML = '<img style="vertical-align:middle;float: right" height="17" width="17"  src="images/find.png" >';

    
    const toolbar = editor.getUI().getToolbar();
    toolbar.insertItem(0, {
        type: 'button',
        options: {
          className: 'first',
          event: 'clickCustomButton',
          tooltip: 'Search in Notes',
          el: button,
          text: '🔍',
          style: 'background-image: url("images/find.png");'
        }
    });
    
    
    editor.eventManager.addEventType('clickCustomButton');
    editor.eventManager.listen('clickCustomButton', function() {
        findInNw.showSearchBox();
    });


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

function closeWindow(){
    
    // Clear tokens (if find is still open)
    findInNw.clearTokens();   // Clear all <mark> inserted in html 
    
    // Save file
    save(); 
    
    // Save settings
    global.state.notesWindow.editMode = editor.currentMode;
    opener.saveSettings(); // Save settings to file
    
    // Mark that closed
    global.localState.notesWindow.open = false;
    

    console.log('clicked close window');
}
