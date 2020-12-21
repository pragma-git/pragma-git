// Extend find-in-nw to accept Shortcut keys for Mac; and Ctrl for Windows and Linux 
// - MacOs Command key as well as Ctrl
// - Shortcut G to find next

function extendFindInNw(){

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
  
// Start listening to new keys

  findInNw.keyBindings();
  findInNw.keyDownPressed();  
}
