// Methods common to more than one .js-file, in Pragma-git project

const myModule = {}

var fs = require('fs');

// Work on array with fields
myModule.cleanDuplicates = function ( myArray, objectField ){ 
    // Removes all elements in "myArray"  where the field "objectField" are duplicates
    //
    // So if objectField = 'localFolder' the duplicates in this kind of array are removed :
    // cleanDuplicates( [ {localFolder: "/Users/jan/Desktop/TEMP/Test-git"}, {localFolder: "/Users/jan/Desktop/TEMP/Test-git"}], 'localFolder' );
    // returns [ {localFolder: "/Users/jan/Desktop/TEMP/Test-git"}]
    
    // Display the list of array objects 
    console.log(myArray); 

    // Declare a new array 
    let newArray = []; 
      
    // Declare an empty object 
    let uniqueObject = {}; 
      
    // Loop for the array elements 
    for (let i in myArray) { 

        // Extract the title 
        objTitle = myArray[i][objectField]; 

        // Use the title as the index 
        uniqueObject[objTitle] = myArray[i]; 
    } 
      
    // Loop to push unique object into array 
    for (i in uniqueObject) { 
        newArray.push(uniqueObject[i]); 
    } 
      
    // Display the unique objects 
    console.log(newArray); 



    return newArray;
}
myModule.findObjectIndex = function ( myArray, objectField, stringToFind ){ 
    
    var foundIndex; //last found index
    // Loop for the array elements 
    for (let i in myArray) { 

        if (stringToFind === myArray[i][objectField]){
            foundIndex = i;
        }
    } 
    
    return Number(foundIndex);
}
myModule.findObjectIndexStartsWith = function ( myArray, objectField, stringToFind ){ 
    
    var foundIndex; //last found index
    // Loop for the array elements 
    for (let i in myArray) { 

        if (myArray[i][objectField].startsWith( stringToFind)){
            foundIndex = i;
        }
    } 
    
    return Number(foundIndex);
}


// Branch name filtered by allowed chars
myModule.branchCharFilter = function ( string ){
    
     // Remove ^~?:*[\ 
    string = string.replace( /[\^\~\?\:\*\[]/g, ''); //   (Test:   'abc:^~?*\[:d'.replace( /[\^\~\?\:\*\[\\]/g, '')   // should give abcd )
    // Remove more
    string = string.replace(/[\x00-\x1F\x7F-\x9F]/g, ""); // Remove control characters
    string = string.replace( ' ', '_'); // Removing space
    string = string.replace( '..', '.'); // Removing consecutive dots@{
    string = string.replace( '@{', '@'); // Stop sequence @{
    
    return string;   
    
}

// True if hidden branch
myModule.isHiddenBranch = function( hiddenBranchNames, branchToCheck){
    // Checks if localBranchToCheck is listed in hiddenBranchNames
    if (hiddenBranchNames === undefined){
        return false
    }

    let result = false;
    for (let j = 0; j < hiddenBranchNames.length; j++) { // Loop all branches
        if  ( branchToCheck === hiddenBranchNames[j] ){
            result = true;
        }
    }
    return result;
}      

// File system
myModule.mkdir = function (dir){
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
}
myModule.rm = function (f){
    if (fs.existsSync(f)){
        fs.unlinkSync(f);
    }
}


// Export
module.exports = myModule 
