// Extend find-in-nw to accept Command key for Mac; and Ctrl for Windows and Linux
// - shortcut G to find next 
// - arrow keys to find next / previous
//
// Extend to search from any base element (was hard-coded to body in original find-in-nw)
// Add: FULL textarea search & highlight support via mirrored overlay + caret navigation.

function extendFindInNw(elementToSearch){
    
    console.log(elementToSearch);

    // ------------------------------------------------------------
    // One-time: inject CSS for textarea overlay highlights
    // ------------------------------------------------------------
    function ensureTextareaHighlightStyle(){
      if (document.getElementById('ta-hit-style')) return;

    const css = `
      .ta-hit-container { position: relative; }
    
      /* Textarea must be above the backdrop and transparent so highlight shows through */
      .ta-hit-container textarea {
        position: relative;
        z-index: 1;
        background: transparent !important;
      }
    
      /* The mirrored highlight layer sits underneath the textarea */
      .ta-hit-backdrop {
        position: absolute;
        z-index: 0;
        top: 0; left: 0; right: 0; bottom: 0;
        pointer-events: none;
        color: transparent; /* we only want the background of <mark>, not overlay text color */
        white-space: pre-wrap; word-wrap: break-word;
        overflow: hidden;
      }
    
      .ta-hit-highlights {
        white-space: pre-wrap;
        word-wrap: break-word;
      }
    
      /* IMPORTANT:
         Do NOT set any styles for .find-in-nw-token here.
         We want the package’s existing .find-in-nw-token rules (compiled from index.sass)
         to style both normal DOM marks and our overlay marks identically.
      */
    `;

      const style = document.createElement('style');
      style.id = 'ta-hit-style';
      style.textContent = css;
      document.head.appendChild(style);
    }
    ensureTextareaHighlightStyle();

    // ------------------------------------------------------------
    // Helpers for textarea highlighting (mirror overlay + caret)
    // ------------------------------------------------------------
    function setupTextareaOverlay(ta){
      if (ta._hitSetup) return ta._hitSetup; // idempotent

      // Wrap textarea
      const container = document.createElement('div');
      container.className = 'ta-hit-container';

      const backdrop = document.createElement('div');
      backdrop.className = 'ta-hit-backdrop';

      const highlights = document.createElement('div');
      highlights.className = 'ta-hit-highlights';

      backdrop.appendChild(highlights);
      ta.parentNode.insertBefore(container, ta);
      container.appendChild(backdrop);
      container.appendChild(ta);

      // Keep overlay aligned with textarea
      const cs = getComputedStyle(ta);
      [
        'fontFamily','fontSize','lineHeight','letterSpacing',
        'paddingTop','paddingRight','paddingBottom','paddingLeft',
        'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
        'boxSizing','whiteSpace'
      ].forEach(p => { backdrop.style[p] = cs[p]; });

      // Sync scroll
      ta.addEventListener('scroll', () => {
        backdrop.scrollTop = ta.scrollTop;
        backdrop.scrollLeft = ta.scrollLeft;
      });

      // Keep overlay live while the user types (only when a query is active)
      ta.addEventListener('input', () => {
        const q = findInNw.lastSearched;
        if (!q) { backdrop.style.display = 'none'; return; }
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = findMatchesInTextarea(ta, re);
        renderTextareaHighlights(ta, matches);
      });

      ta._hitSetup = { container, backdrop, highlights };
      return ta._hitSetup;
    }

    function findMatchesInTextarea(ta, regex){
      const text = ta.value;
      const matches = [];
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(text))) {
        if (!m[0]) { regex.lastIndex++; continue; } // safeguard zero-length
        matches.push({ start: m.index, end: m.index + m[0].length });
        if (!regex.global) break;
      }
      return matches;
    }

    // Render highlights with data-* and token class so navigation works
    function renderTextareaHighlights(ta, matches){
      const { backdrop, highlights } = setupTextareaOverlay(ta);

      const escapeHTML = s => s.replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      }[c]));

      const txt = ta.value;

      if (!matches || matches.length === 0) {
        highlights.textContent = txt;      // plain mirror
        backdrop.style.display = 'none';
        return;
      }

      let out = '';
      let pos = 0;
      for (const {start, end} of matches){
        out += escapeHTML(txt.slice(pos, start));
        // add the canonical token class + caret data
        out += `<mark class="find-in-nw-token" data-ta-start="${start}" data-ta-end="${end}">`
            + escapeHTML(txt.slice(start, end))
            + `</mark>`;
        pos = end;
      }
      out += escapeHTML(txt.slice(pos));
      highlights.innerHTML = out;
      backdrop.style.display = 'block';
    }

    function clearAllTextareaHighlights(){
      document.querySelectorAll('textarea').forEach(ta => {
        const setup = ta._hitSetup || null;
        if (setup){
          setup.highlights.textContent = ta.value; // plain mirror
          setup.backdrop.style.display = 'none';
        }
      });
    }

    // Move caret to current token if it belongs to a textarea overlay
    function syncCaretToCurrentTextareaToken(){
      // find-in-nw typically marks the current token with one of these classes
      const current =
        document.querySelector('.find-in-nw-current-token') ||
        document.querySelector('.find-in-nw-token.find-in-nw-token-current') ||
        document.querySelector('.find-in-nw-token.current');

      if (!current) return;

      // Only handle if the current token is inside our textarea overlay
      const inOverlay = current.closest('.ta-hit-highlights');
      if (!inOverlay) return;

      const container = current.closest('.ta-hit-container');
      if (!container) return;

      const ta = container.querySelector('textarea');
      if (!ta) return;

      const start = parseInt(current.getAttribute('data-ta-start'), 10);
      const end   = parseInt(current.getAttribute('data-ta-end'), 10);
      if (Number.isNaN(start) || Number.isNaN(end)) return;

      // 1) Move caret/selection into the textarea at the match range
      try { ta.setSelectionRange(start, end, 'none'); } catch (_) { ta.setSelectionRange(start, end); }

      // 2) Scroll textarea to reveal selection (center-ish)
      const { backdrop } = ta._hitSetup || {};
      if (backdrop) {
        const viewHeight  = ta.clientHeight || 0;
        const tokenTop    = current.offsetTop;
        const tokenBottom = tokenTop + current.offsetHeight;
        const curTop      = ta.scrollTop;

        let target = curTop;
        const pad = 10;
        if (tokenTop < curTop) {
          target = Math.max(0, tokenTop - pad);
        } else if (tokenBottom > curTop + viewHeight) {
          target = Math.max(0, tokenBottom - viewHeight + pad);
        }
        if (target !== curTop) {
          ta.scrollTop = target; // backdrop scroll auto-syncs via the scroll listener
        }
      }
    }

    // ------------------------------------------------------------
    // Positioning helpers (your originals)
    // ------------------------------------------------------------

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
        
        
        // If Notes, override base search element -- two modes Wysiwyg (button 1) and Markdown (button 0)
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
        
        // If Settings
        try{
            if (document.title == 'Settings'){
                // Determine which tab to search in
                const contentElements = document.getElementsByClassName('content');
                
                for (let el of contentElements) {
                    const style = window.getComputedStyle(el);
                    if (style.display === 'contents') {
                        searchElement = el;
                        break
                    }
                }

            }
        }catch(err){
            // Not a Settings window
        }      
               
        // Find all elements
        for (let i = 0; i < searchElement.children.length; i++) {
            let child = searchElement.children[i];
            if (child.tagName.toLowerCase() !== 'style' && child.tagName.toLowerCase() !== 'script') {
                elements.push(child);
            }
        }
        console.log(`searchElement = ${searchElement}`); 
        console.log(searchElement); 
        console.log(`elements = ${elements}`);    
        console.log(elements); 
        return elements;
    };  
    //-------------------------------------------------------------    
    
    // Add Command to Shortcut-F  for all OS:es
    findInNw.keyBindings = function () {
        document.onkeydown = function (pressed) {
          console.log(pressed)
          
          // Check for `CTRL+W or Command+W`  (Need to implement because extended_find-in-nw overrides general window closing)
          if ( (pressed.ctrlKey || pressed.metaKey) && pressed.keyCode === 87 ){
            console.log('Close window')
            win.close();
            return 
          }
                          
          // Inhibit Ctrl Q event listener for closing window
          if ( (pressed.ctrlKey || pressed.metaKey) && pressed.keyCode === 81 ){
              pressed.preventDefault();
          }
        
          // Check for `CTRL+F or Command+F`
          if ( (pressed.ctrlKey || pressed.metaKey) && pressed.keyCode === 70 )
          {
            pressed.preventDefault();
            
            // Special case for Pragma-merge (default ctrl-F should bind to merge pane )
            if ( document.getElementsByClassName('CodeMirror-merge-editor')[0] !== undefined ){
                let leftPos = document.getElementsByClassName('CodeMirror-merge-editor')[0].getBoundingClientRect().x;
                document.getElementById('find-in-nw-search-box').style.left = (leftPos + 40 ).toFixed() +'px';
                document.getElementById('find-in-nw-search-box').style.right = 'auto';
                document.getElementById('find-in-nw-search-box').style.top = '-6px';
                pragmaMergeSearchInEditorId = 'searchElement'; findInNw.positionSearchBoxPragmaMerge()
                return
            }

            // Normal case
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
    // Add Ctrl-C, V, A
    findInNw.keyDownPressed = function () {
        const input = document.getElementById('find-in-nw-input');
        input.addEventListener('keydown', function (evt) {
          // if (evt.key === 'Enter') { this.highlightNext(); }
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
          if ( (evt.ctrlKey || evt.metaKey) && evt.keyCode === 86 ){
            console.log('V')
            // document.execCommand('paste');  // Avoid duplicate
          }
          if ( (evt.ctrlKey || evt.metaKey) && evt.keyCode === 67 ){
            console.log('C')
            document.execCommand('copy');
          }
          if ( (evt.ctrlKey || evt.metaKey) && evt.keyCode === 88 ){
            console.log('X')
            document.execCommand('cut');
          }
          if ( (evt.ctrlKey || evt.metaKey) && evt.keyCode === 65 ){
            console.log('A')
            document.execCommand('selectAll');
          }
        }.bind(this));  
     
      }; 
    //------------------------------------------------------------- 
    
    // Perform case-insensitive search (now also includes <textarea>)
    findInNw.search = function (text) {
        // Clear existing highlights (DOM + textarea overlays)
        this.clearTokens();
        clearAllTextareaHighlights();

        const elements = this.getElementsToSearch();
        console.log(elements);
        
        // Search HTML (exclude the search box and all <textarea> descendants)
        elements.forEach(function (element) {
          if (element.id !== 'find-in-nw-search-box') {
            window.findAndReplaceDOMText(element, {
              find: RegExp( text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),'gi'), // literal
              wrap: 'mark',
              wrapClass: 'find-in-nw-token',
              filterElements: (node) => node.nodeName.toLowerCase() !== 'textarea'
            });
          }
        });
        
        // Search for hash (element id in text class, in Graph)
        if (text.length >= 2){ // Only search for hash when string is 2 characters or more         
            try{
                let hashText = text.toLowerCase();
                let textElements = document.getElementsByClassName('text');
                textElements.forEach(function (textElement) {
                  if (textElement.id.startsWith(hashText)) {
                    window.findAndReplaceDOMText(textElement, {
                      find: RegExp(textElement.innerText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),'gi'), // literal
                      wrap: 'mark',
                      wrapClass: 'find-in-nw-token'
                    });
                  }
                });
            }catch (err){
                // Will fail in other windows
            }
        }

        // ---- NEW: Search inside all <textarea> values and render overlay highlights
        const taRegex = RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        
        // Only search in elements defined above
        elements.forEach(el => {
          el.querySelectorAll('textarea').forEach(ta => {
            const matches = findMatchesInTextarea(ta, taRegex);
            renderTextareaHighlights(ta, matches);
          });
        });

        
        this.lastSearched = text;
        this.setDataPositionAttribute();
        this.initCurrentToken();
        this.updateCount();
        this.highlightCurrentToken(); // we'll sync caret below via wrapper
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
            document.getElementsByClassName('ProseMirror')[1].contentEditable = true; 
            editor.wwEditor.view.editable = true; 
        }catch (err){
            // Not a Notes window
        }
        
        // Standard findInNw hideSearchBox
        document.getElementById("find-in-nw-search-box").classList.remove("find-in-nw-search-box-visible");
        document.body.focus();
        this.clearTokens();

        // NEW: also clear textarea overlays when closing search
        clearAllTextareaHighlights();
    }

    // ------------------------------------------------------------
    // Start listening to new keys
    // ------------------------------------------------------------
    findInNw.keyBindings();
    findInNw.keyDownPressed();  
    
    document.getElementById('find-in-nw-search-box').style.zIndex = 1000000;

    // ------------------------------------------------------------
    // Wrap navigation to sync caret if current token is in a textarea
    // ------------------------------------------------------------
    if (typeof findInNw.highlightNext === 'function') {
      const _origNext = findInNw.highlightNext.bind(findInNw);
      findInNw.highlightNext = function(){
        const result = _origNext();
        syncCaretToCurrentTextareaToken();
        return result;
      };
    }

    if (typeof findInNw.highlightPrevious === 'function') {
      const _origPrev = findInNw.highlightPrevious.bind(findInNw);
      findInNw.highlightPrevious = function(){
        const result = _origPrev();
        syncCaretToCurrentTextareaToken();
        return result;
      };
    }

    if (typeof findInNw.highlightCurrentToken === 'function') {
      const _origCur = findInNw.highlightCurrentToken.bind(findInNw);
      findInNw.highlightCurrentToken = function(){
        const result = _origCur();
        syncCaretToCurrentTextareaToken();
        return result;
      };
    }

}
