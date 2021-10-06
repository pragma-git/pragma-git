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


    // Add plugin 
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
            //editor.insertText('\n '); // The space is important. If row starts without space, then a whole list-element is removed
            editor.exec('shiftEnter');  // My plugin-function for backspace
            return false;
          } 
          // Check for Backspace
          if ( (editor.getCurrentModeEditor().editorType == 'wysiwyg') && (pressed.keyCode === 8  ) )
          {
            //pressed.preventDefault();
            console.log('Backspace from notes.js');
            //editor.exec('preBackspace');  // My plugin-function for backspace
            editor.exec('backspace');  // My plugin-function for backspace
            return false;
          } 
    }


};
    function myPlugin() { // Plugin for backspace in wysiwyg editor
    // See : https://github.com/nhn/tui.editor/blob/master/docs/en/plugin.md    Description
    //       https://nhn.github.io/tui.editor/latest/                           API/Examples
    //
    // Run from debugger in wysiwyg mode : editor.exec('backspace')
    //
    // Mechanism : add a non-breaking space at end of line when doing Shift-ENTER
    //             add a non-breaking space before deleting last character on line
    //
    //
    // Reason:     I Found that backspace from line with no characters deletes parent node, but not if I leave a space after cursor when doing backspace
    //             I don't fully understand why this is. It is reported as Github nhn/tui.editor issue #1812
    //
        const wysiwygCommands = {
            preBackspace: preBackspace,
            backspace: backspaceFunction,
            shiftEnter: shiftEnterFunction
        }
        return { wysiwygCommands }
    }
    
        function preBackspace(payload, state, dispatch){ 
            return false
            let from = state.selection.ranges[0].$from.pos;
            editor.replaceSelection(' ', from, from);
        }
    
        function backspaceFunction(payload, state, dispatch){ 

            let from = state.selection.ranges[0].$from.pos; 
            let to = state.selection.ranges[0].$to.pos;
            
            editor.setSelection( from - 1, from);
            if (state.selection.ranges[0].$from.parentOffset > 1){   // More than one character on line
                editor.replaceSelection('');
                return true; // Change in editor content
            }else{
                editor.replaceSelection( String.fromCharCode(160) );  // Add non-breaking space when exactly one character left
                editor.setSelection( from -1 , from -1);              // Put cursor back at start of line (so that next backspace will go to previous line )
                return true; // Change in editor content
            }

            return false

        }
         function shiftEnterFunction(payload, state, dispatch){ 
            // Note : keep strange formatting, so that EOL will be included.  CharCode 160 is a non-breaking space
            let ENTER =`${String.fromCharCode(160)}
`;            
            let from = state.selection.ranges[0].$from.pos;
            let to = state.selection.ranges[0].$to.pos;
            
            // This is where I should put shift-Enter into last element
            editor.replaceSelection(ENTER, from , from );
            
            return false

        }

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

