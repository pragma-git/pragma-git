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
      previewStyle: 'vertical'
    }

    options.initialEditType = global.state.notesWindow.editMode; // Set wysiwyg or markdown

    editor = new Editor( options);


};
function save(){
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
    // Save file
    save(); 
    
    // Save settings
    global.state.notesWindow.editMode = editor.currentMode;
    opener.saveSettings(); // Save settings to file
    
    

    console.log('clicked close window');
}
