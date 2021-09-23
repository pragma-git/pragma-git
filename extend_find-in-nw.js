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
            const isWysiwyg = document.getElementsByClassName('toastui-editor-mode-switch')[0].getElementsByClassName('tab-item')[0].classList.contains('active');
            const isMd = document.getElementsByClassName('toastui-editor-mode-switch')[0].getElementsByClassName('tab-item')[1].classList.contains('active');
            if (isWysiwyg){
                searchElement = document.getElementsByClassName('toastui-editor-contents')[1];
            }
            if (isMd){
                searchElement = document.getElementsByClassName('toastui-editor-md-preview')[0];
            }  
        }catch(err){}    
        
        
        // If Pragma-merge
        try{
            searchElement = document.getElementsByClassName( pragmaMergeSearchInEditorId)[0];  // Messaging variable defined in pragma-merge.html

        }catch(err){}            
        
          
        
        // Find all elements
        for (let i = 0; i < searchElement.children.length; i++) {
            let child = searchElement.children[i];
            if (child.tagName.toLowerCase() !== 'style' && child.tagName.toLowerCase() !== 'script') {
                elements.push(child);
            }
        }
    
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
        
        elements.forEach(function (element) {
        if (element.id !== 'find-in-nw-search-box') {
            window.findAndReplaceDOMText(element, {
            find: RegExp(text,'gi') ,
            wrap: 'mark',
            wrapClass: 'find-in-nw-token'
            });
        }
        });
        
        this.lastSearched = text;
        this.setDataPositionAttribute();
        this.initCurrentToken();
        this.updateCount();
        this.highlightCurrentToken();
    };

    //------------------------------------------------------------- 

    // Start listening to new keys
    
      findInNw.keyBindings();
      findInNw.keyDownPressed();  
      
              
      document.getElementById('find-in-nw-search-box').style.zIndex = 1000000;


}
