// ---------
// INIT
// ---------
const gui = require("nw.gui"); // TODO : don't know if this will be needed
const os = require('os');
const fs = require('fs');
const path = require('path');
const simpleGit = require()

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
    button1.style = "background-color: transparent; position: absolute; right: 60px";
    button1.setAttribute("id", 'find-icon');
    button1.innerHTML = '<img  height="20" width="20"  src="images/find.png" >';
    button1struct = {  
            name: 'find',
            event: 'clickCustomButton1',
            el: button1
        };
        
 
    // Add help button to toolbar
    button2 = document.createElement('button');
    button2.style = "background-color: transparent; position: absolute; right: 20px";
    button2.setAttribute("id", 'help-icon');
    button2.innerHTML = '<img height="20" width="20"  src="images/questionmark_hover.png" >';
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
    
    
 // Plugin
    function myPlugin() {
    // See : https://github.com/nhn/tui.editor/blob/master/docs/en/plugin.md    Description
    //       https://nhn.github.io/tui.editor/latest/                           API/Examples
    //
    // Run from debugger : editor.exec('jan', 'hej' )
 
        const wysiwygCommands = {
            backspace: backspaceFunction
        }
        return { wysiwygCommands }
    }
    
    function backspaceFunction(payload, state, dispatch){
              
        let from = state.selection.ranges[0].$from.pos;
        let to = state.selection.ranges[0].$to.pos;
        
        if ( from !== to){  // A range is selected
            false;  // No change in editor content
        }
        
        // A cursor without a range
        editor.replaceSelection('', from - 1, from);
        
        // TODO: - end of element, jump to previous element : 
        if (state.selection.ranges[0].$from.parentOffset){
            
        }
        
        
        return true; // Change in editor content
    }

    
    options.plugins = [myPlugin];
  
        
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
    
    
    // Keybinding NEW-LINE and WYSIWYG ≈
    document.onkeydown = function (pressed) {
          console.log(pressed)
          // Check for Soft Enter (SHIFT-ENTER)
          if ( pressed.shiftKey && pressed.keyCode === 13 )
          {
            //pressed.preventDefault();
            console.log('SHIFT ENTER from notes.js');
            editor.insertText('\n');  // The new line entered in editor, will be rendered by customHTMLRenderer (above)
            return false;
          } 
          // Check for Backspace
          if ( pressed.keyCode === 8 )
          {
            //pressed.preventDefault();
            console.log('Backspace from notes.js');
            editor.exec('backspace');  // My plugin for backspace
            return false;
          } 
    }
    
    
    //// Add new BACKSPACE COMMAND
    //// (base on : https://github.com/nhn/tui.editor/issues/844)
    //const CommandManager = editor.commandManager;
    //const cusCommand = CommandManager.addCommand('markdown', {
      //name: 'customCommand',
      //exec: (mde, data) => {
        //// do some stuff
        //const cm = mde.getEditor();
        //const doc = cm.getDoc();
        //const range = mde.getCurrentRange();
    
        //const from = {
          //line: range.from.line,
          //ch: range.from.ch,
        //};
    
        //const to = {
          //line: range.to.line,
          //ch: range.to.ch,
        //};
    
        //let { text, url } = data;
        //const replaceText = `<a href="${url}" class="attachment" target="_blank">${text}</a>`;
    
        //doc.replaceRange(replaceText, from, to, '+customCommand');
      //},
    //});
    
        
    //editor.addCommand(cusCommand);
    
    //editor.exec('customCommand', {
      //url: 'https://wwww.dn.se',
      //text: 'TEST',
    //});

  
  



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
    
    // Commmit .Pragma-git settings dir
    await opener.commitSettingsDir();
    
    // Mark that closed
    global.localState.notesWindow.open = false;
    
    // Remove from menu
    opener.deleteWindowMenu('Notes');

    console.log('clicked close window');
}

