// Extend find-in-nw to accept Command key for Mac; and Ctrl for Windows and Linux 
// - shortcut G to find next 
// - arrow keys to find next / previous
//
// Extend to search from any base element (was hard-coded to body in original find-in-nw)

function extendFindInNw( elementToSearch){
    
    
    // Pragma-merge window -- This is my own version to be used in pragma-merge
    findInNw.positionSearchBoxPragmaMerge = function (){

        // Call normal search box
        findInNw.showSearchBox();
        
        // Set position getting editor from variable 'pragmaMergeSearchInEditorId' as defined on mouse click on search icon
        let leftPos = document.getElementsByClassName(pragmaMergeSearchInEditorId)[0].getBoundingClientRect().x + 40;
        document.getElementById('find-in-nw-search-box').style.left = leftPos + 'px';
        document.getElementById('find-in-nw-search-box').style.right = 'auto';
        document.getElementById('find-in-nw-search-box').style.top = '-6px';
    }
    //-------------------------------------------------------------      
       
    // Graph window -- This is my own version to be used in Graph
    findInNw.positionSearchBoxGraph = function (){

        // Call normal search box
        findInNw.showSearchBox();
        
        // Set position getting editor from variable 'pragmaMergeSearchInEditorId' as defined on mouse click on search icon
        document.getElementById('find-in-nw-search-box').style.right = '55px';
    }   
    //------------------------------------------------------------- 

    // Different base elements depending on Graph window or Notes (wysiwyg or markdown mode are also different)
    findInNw.getElementsToSearch = function () {
        const elements = [];
        
        // Initial guess - base search element
        let searchElement = document.body; 
        
        
        // If Notes, overide base search element -- two modes Wysiwyg (button 1) and Markdown (button 0)
        try{
            const isWysiwyg = document.getElementsByClassName('toastui-editor-mode-switch')[0].getElementsByClassName('tab-item')[1].classList.contains('active');
            const isMd = document.getElementsByClassName('toastui-editor-mode-switch')[0].getElementsByClassName('tab-item')[0].classList.contains('active');
            if (isWysiwyg){
                console.log('isWysiwyg');
                searchElement = document.getElementsByClassName('toastui-editor-contents')[1];
            }
            if (isMd){
                console.log('isMd');
                searchElement = document.getElementsByClassName('toastui-editor-contents')[0];

            }  
        }catch(err){
            // Not a Notes window 
        }    
        
        
        // If Pragma-merge
        try{
            searchElement = document.getElementsByClassName( pragmaMergeSearchInEditorId)[0];  // Messaging variable defined in pragma-merge.html
            
            if (searchElement == undefined){
                searchElement = document.getElementsByClassName('CodeMirror-merge-editor')[0];  // The merge pane
            }

        }catch(err){
            // Not a Pragma-merge window
        }            
         
        
        // If Graph
        try{
            if (graphSearchInEditorId){  // graphSearchInEditorId = true if a graph window
                searchElement = document.getElementById( 'graphContent');  
            }

        }catch(err){
            // Not a Graph window
        }      
        
        
                 
    
        // Find all elements
        for (let i = 0; i < searchElement.children.length; i++) {
            let child = searchElement.children[i];
            if (child.tagName.toLowerCase() !== 'style' && child.tagName.toLowerCase() !== 'script') {
                elements.push(child);
            }
        }
        console.log(elements);    
        return elements;
    };  
    //-------------------------------------------------------------    
    
    // Add MacOs Command to Shortcut-F
    findInNw.keyBindings = function () {
        document.onkeydown = function (pressed) {
          console.log(pressed)
          // Check for `CTRL+F or Command+F`
          if ( (pressed.ctrlKey || pressed.metaKey) && pressed.keyCode === 70 )
          {
            pressed.preventDefault();
            
            // Special for Pragma-merge (default ctrl-F should bind to merge pane )
            if ( document.getElementsByClassName('CodeMirror-merge-editor')[0] !== undefined ){
                let leftPos = document.getElementsByClassName('CodeMirror-merge-editor')[0].getBoundingClientRect().x;
                document.getElementById('find-in-nw-search-box').style.left = (leftPos + 40 ).toFixed() +'px';
                document.getElementById('find-in-nw-search-box').style.right = 'auto';
                document.getElementById('find-in-nw-search-box').style.top = '-6px';
                pragmaMergeSearchInEditorId = 'searchElement'; findInNw.positionSearchBoxPragmaMerge()
                return
            }

            // Normal
            this.showSearchBox();
            return false;
          // Check for `ESCAPE`
          } else if (pressed.keyCode === 27) {
            pressed.preventDefault();
            this.hideSearchBox();
            return false;
          }
        }.bind(this);
    };
    //------------------------------------------------------------- 
      
    
    // Add Up and Down shortcuts : Shortcut-G,  Arrow Down, Arrow Up
    findInNw.keyDownPressed = function () {
        const input = document.getElementById('find-in-nw-input');
        input.addEventListener('keydown', function (evt) {
          //if (evt.key === 'Enter') {
            //console.log('ENTER')
            //this.highlightNext();
          //}
          if ( (evt.ctrlKey || evt.metaKey) && evt.keyCode === 71 ){
            console.log('CTRL-G')
            this.highlightNext();
          }
          if ( evt.keyCode === 40 ){
            console.log('Arrow Down')
            this.highlightNext();
          }
          if ( evt.keyCode === 38 ){
            console.log('Arrow Up')
            this.highlightPrevious();
          }
        }.bind(this));  
     
      }; 
    //------------------------------------------------------------- 
    
    // Perform case-insensitive search
    
    findInNw.search = function (text) {
        this.clearTokens();
        const elements = this.getElementsToSearch();
        
        console.log(elements);
        
        // Search HTML
        let numberFoundInHtml = 0;
        elements.forEach(function (element) {
        if (element.id !== 'find-in-nw-search-box') {
                window.findAndReplaceDOMText(element, {
                find: RegExp(text,'gi') ,
                wrap: 'mark',
                wrapClass: 'find-in-nw-token'
                });
            }
        });
        
        
        // Search for hash (element id in text class, in Graph)
        if (text.length >= 2){ // Only search for hash when string is 2 characters or more         
            try{
                let hashText = text.toLowerCase();
                let textElements = document.getElementsByClassName('text');
                textElements.forEach(function (textElement) {
                if (textElement.id.startsWith( hashText  ) ) {
                    window.findAndReplaceDOMText(textElement, {
                        find: RegExp(textElement.innerText,'gi') ,
                        wrap: 'mark',
                        wrapClass: 'find-in-nw-token'
                        });
                    }
                });
            }catch (err){
                // Will fail in other windows
            }

        }
        
        this.lastSearched = text;
        this.setDataPositionAttribute();
        this.initCurrentToken();
        this.updateCount();
        this.highlightCurrentToken();
    };

    //------------------------------------------------------------- 
    
    findInNw.showSearchBox = function() {
        
        // Remove modern button for case-sensitive
        try{
            document.getElementById('find-in-nw-case-sensitive').remove();
        }catch (err){}
        
        // Special for Notes window
        /**
         * Toastui is used in Notes window.  
         * Toastui 3.0 introduced a new node structure, and event handlers on changes of the DOM.
         * 
         * Problem is, that findInNw works by changing the HTML DOM. Toastui then updates an internal-DOM, which in turn is translated to HTML view.
         * The problem is that a change is signaled when findInNw changes HTML DOM, and that change is not in the internal-DOM, 
         * =>  the updated HTML view reflects the original internal DOM 
         * 
         * The workaround implemented here:
         *   - Let the toastui WYSIWYG editor be readonly when searchbox is visible. 
         *     That way, edits are not expected, and no event is thrown to start the translation from internal-DOM to HTML view.
         *     (this means that internal-DOM is out of sync with HTML DOM -- and that is not good)
         *   - As an extra precaution, also the underlying ProseMirror is made read-only.  
         *     This way the user cannot write anything in the WYSIWYG editor while search box is open
         *   - And finally, when the search box is closed, both WYSIWYG editor and Prosemirror are made editable again.
         * 
         * This is implemented in findInNw.showSearchBox and findInNw.hideSearchBox
         * */
         
        // Special for Notes window
        try{
            const isWysiwyg = document.getElementsByClassName('toastui-editor-mode-switch')[0].getElementsByClassName('tab-item')[1].classList.contains('active');
            if (isWysiwyg){
                console.log('Show search box for isWysiwyg, make read only');
                document.getElementsByClassName('ProseMirror')[1].contentEditable = false;  // Make WYSIWYG non-editable (otherwise toast-ui 3.0 updates DOM and removes visual search result)
                editor.wwEditor.view.editable = false;
            }
        }catch (err){
            // Not a Notes window
        } 
        
        // Standard findInNw showSearchBox
        const e = document.getElementById("find-in-nw-search-box")
          , t = document.getElementById("find-in-nw-input");
        e.classList.add("find-in-nw-search-box-visible");
        const n = window.getSelection().toString();
        n && n.indexOf("\n") < 0 && (t.value = n),
        t.value && this.search(t.value),
        t.focus()
        console.log('Show search box');
    }

    //------------------------------------------------------------- 
      findInNw.hideSearchBox = function(){
                  
        // Special for Notes window
        try{       
            console.log('Hide search box for isWysiwyg, make read write');
            // Make WYSIWYG non-editable (otherwise toast-ui 3.0 updates DOM and removes visual search result)
           document.getElementsByClassName('ProseMirror')[1].contentEditable = true; 
           editor.wwEditor.view.editable = true; 
        }catch (err){
            // Not a Notes window
        }
        
        // Standard findInNw hideSearchBox
        document.getElementById("find-in-nw-search-box").classList.remove("find-in-nw-search-box-visible"),
        document.body.focus(),
        this.clearTokens();

      }

    //------------------------------------------------------------- 
    
    // Start listening to new keys
    
      findInNw.keyBindings();
      findInNw.keyDownPressed();  
      
              
      document.getElementById('find-in-nw-search-box').style.zIndex = 1000000;


}
