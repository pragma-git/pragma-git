// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');

var util = require('./util_module.js'); // Pragma-git common functions

var editor;  // Editor object
var filePath;// Path to open file


window.setInterval(save, 1000 );



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
    editor = new Editor({
      el: document.querySelector('#editor'),
      height: '100%',
      initialValue: content,
      initialEditType: 'wysiwyg', //  wysiwyg or markdown
      previewStyle: 'vertical'
    });


    // Easiest way to set text (in empty editor)
    //editor.insertText(content);
    
    // Easiest way to read text
    //editor.getMarkdown()

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
    save(); // Save file

    console.log('clicked close window');
}
