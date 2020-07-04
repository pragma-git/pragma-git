
// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var state = global.state; // internal copy of global.state

var win

// ---------
// FUNCTIONS
// ---------        
function injectIntoSettingsJs(document) {
    win = gui.Window.get();
    
    console.log('Settings - settings.js entered');  
    console.log('Settings - state :');  
    console.log(global.state);
    

    createHtmlTable(document);

};

function createHtmlTable(document){
    
    console.log('Settings - createHtmlTable entered');
    console.log('Settings - document :');
    console.log(document)
    
    // Create table if there are any repos
    if (state.repos.length > 0){                   
        document.getElementById("header_Forget").style.visibility = "visible"; 
        document.getElementById("emptyTable_iFrame").style.height ="0px";
        
        let table = document.querySelector("table");
        let data = Object.keys(state.repos[0]);
        console.log('Settings - data :');
        console.log(data);
        generateTable( document, table, state.repos); // generate the table first
        generateTableHead( document, table, data);    // then the head
    }else{ 
        // Hide "Forget"-header, and show message for empty repo      
        //document.getElementById("settingsTable") = "";
        document.getElementById("header_Forget").style.visibility = "collapse"; 
        document.getElementById("emptyTable_iFrame").style.height ="auto"; 

   }

}
     
// Inspired and copied from  https://www.valentinog.com/blog/html-table/
function generateTableHead(document, table, data) {
    let thead = table.createTHead();
    let row = thead.insertRow();
    for (let key of data) {
        let th = document.createElement("th");
        let text = document.createTextNode(key);
        th.appendChild(text);
        row.appendChild(th);
        console.log(table);
    }
    // Add column header
    let th = document.createElement("th");
    let text = document.createTextNode('action');
    th.appendChild( text);
    row.appendChild(th);
    console.log(table);
}
       
function generateTable(document, table, data) {
    var index = 0; // Used to create button-IDs
    for (let element of data) {
        console.log('Element = ' + element );
        let row = table.insertRow();
        for (key in element) {
             let cell = row.insertCell();
             let text = document.createTextNode(element[key]);
             cell.appendChild(text);
        }
        // Add column of checkboxes
        let cell = row.insertCell();
        
        var button = document.createElement('button');
        button.setAttribute("id", index);
        button.innerHTML = 'Forget';
        button.onclick = forgetButtonClicked;

        cell.appendChild(button);
        index ++;
    }
    console.log(table);
}

function forgetButtonClicked(event){
    let index = event.currentTarget.getAttribute('id');
    console.log('Settings - button clicked');
    console.log('Settings - event id = ' + index);


    console.log('Settings - state.repos before and after removal of clicked element : ');
    console.log(state.repos);
    
    console.log('Settings - removing index = ' + index);
    state.repos.splice(index,1); // Remove index
    console.log(state.repos);

    
    // Point repoNumber to first repo in list
    state.repoNumber = 0;
    
    if ( state.repos.length == null){
        state.repoNumber - 1;
    }

    
    // Replace table 
    document.getElementById("settingsTable").innerHTML = ""; 
    createHtmlTable(document);
    

    console.log('Settings - updating table :');
    
    //generateTable( document, table, state.repos); // generate the table first
}

 
 // NOTES :
    
    // Find all open windows
    //chrome.windows.getAll({populate: true}, function(wins){
        //console.log("windows", wins)
    //})
    
    ////var n = 1;
    ////chrome.windows.getAll({populate: true}, getAllResponse)
    ////function getAllResponse(wins) { console.log("windows", wins); getOneWindow(wins,n)}
    ////function getOneWindow(wins,n) { 
        
        ////console.log("Tab 0 window" + n , wins[n].tabs[0] ); 
        ////console.log("Tab 0 name,  window " + n , wins[n].tabs[0].title ); 
        ////console.log("Tab 0 name,  window " + n , wins[n].window ); 
        //////win = nw.Window.get().cWindow.tabs[0].title
    ////}
    
        //console.log('settings dialog pressed');
    
    //// TODO : Here settings can be done.  For instance remote git linking
    
    //var output;
    //try{
        //await simpleGit(state.repos[state.repoNumber].localFolder).log( (err, result) => {console.log(result); output = result;} );
    //}catch(err){        
        //console.log(err);
    //}   
    
    //var history = output.ListLogSummary.all;
