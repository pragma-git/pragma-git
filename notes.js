// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');

const Editor = require('@toast-ui/editor');

var util = require('./util_module.js'); // Pragma-git common functions

var editor;  // Editor object
var filePath;



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
     
    
    //const Editor = toastui.Editor;
    editor = new Editor({
      el: document.querySelector('#editor'),
      height: '100%',
      initialValue: content,
      initialEditType: 'markdown', //  wysiwyg or markdown
      previewStyle: 'vertical'
    });


    // Easiest way to set text (in empty editor)
    //editor.insertText(content);
    
    // Easiest way to read text
    //editor.getMarkdown()

};
