
//let cachedAllCredentials = [];
//let provider;
let giturl;
let name = localState.gitCreateRemoteRepoWindow.data.name;  // Provider name (Github, Gitlab, ...)
let outputURL;  // Communicates created URL between js and html
let allCredentials;  // struct with all credentials, read in at start (used to guess token etc

let matchedRepoIndeces;  // Indeces of all repos found, matching account text
let displayedRepoIndex = 0;   // One-based, so array index is one less.  0 means nothing to show
let displayedRepoMax = 0;

// Initialize
async function runWhenDOMContentLoaded() {

            console.log(`localState.gitCreateRemoteRepoWindow.data.name = ${localState.gitCreateRemoteRepoWindow.data.name}`);
        
            // Read data transferred 
            let provider_url = localState.gitCreateRemoteRepoWindow.data.provider;
            
            // Resolve provider instance and template replacement name
            try{
                provider = await opener.opener.gitProvider(provider_url,  initialize = false); // Unknown owner so far, just use static functions
                if (!name) {
                    name = await provider.getValue('provider-name');
                }
            }catch (err){
                console.warn('Failed resolving provider :');
                console.warn(err);
            }

            // Change text to correct provider (replace Github placeholder from create_remote_repository.html)
            replaceInText( document.body, 'Github', name); 
            
            // Change to provider's icon and provider-specific labels/links
            try{
                let iconPath =  await provider.getValue('icon', localState.dark ? 'darkmode' : 'lightmode' );
                document.getElementById( 'providerImage').src = iconPath;

                let labels = await provider.getValue('create-repo-labels');
                if (labels) {
                    let labelStruct = {
                        accountName_label: makeLabel(
                            labels.accountPreText, labels.accountPostText,
                            labels.accountLinkText, labels.accountLinkUrl
                        ),
                        token_label: makeLabel(
                            labels.tokenPreText, labels.tokenPostText,
                            labels.tokenLinkText, labels.tokenLinkUrl
                        )
                    };
                    setLabels( labelStruct);
                }
            }catch (err){
                console.warn('Failed getting provider icon or labels :');
                console.warn(err);
            }
            

            function setLabels( labelStruct){
                    document.getElementById("accountName_label").innerHTML = labelStruct.accountName_label;
                    document.getElementById("token_label").innerHTML = labelStruct.token_label;
            }
            
            function makeLabel( preText, postText, web_link_text, web_link){
                // Call with 4 or 2 arguments.
                //
                // 4 arguments : Makes innerHTML for a label in format : "preText LINK postText"
                //               where LINK is formatted as an <a> element showing link-text = "web_link_text", which opens in a web window with URL = "web_link"
                //
                // 2 arguments : returns innerHTML formated as : "preText postText"
                
                if (web_link == undefined ){
                    // 2 arguments
                    return   `${preText} ${postText}`
                }else{
                    // 4 arguments
                    return   `${preText} <a href="${web_link}" onclick="require('nw.gui').Shell.openExternal( this.href);return false;"> ${web_link_text} </a> ${postText}`
                }
            }

            console.log('create_remote_repository.html :DOM fully loaded and parsed');
            
            // Run after page displayed (get credentials, etc)
            setTimeout( runWhenPageLoaded, 10 );

        } 
    function replaceInText(element, pattern, replacement) { 
       
       for (let node of element.childNodes) {
           switch (node.nodeType) {
               case Node.ELEMENT_NODE:
                   replaceInText(node, pattern, replacement);
                   // Placeholder
                   if (node.type == 'textarea'){
                       node.placeholder = node.placeholder.replace( pattern, replacement);
                   }
                   break;
               case Node.TEXT_NODE:
                   node.textContent = node.textContent.replace(pattern, replacement);
                   break;
               case Node.DOCUMENT_NODE:
                   replaceInText(node, pattern, replacement);
           }
       }
    }
async function runWhenPageLoaded(){
        // Read all credentials
        try{
            allCredentials = await opener.opener.getAllCredentials();  // List all credentials information
            console.log('allCredentials : ');
            console.log(allCredentials);
            
            // Update finding password if accountName has already been typed
            let accountEl = document.getElementById('accountName');
            let tokenEl = document.getElementById('token');
            let accountText = accountEl ? accountEl.value : '';
            if (accountText.trim() !== '') {
                let existingToken = tokenEl ? tokenEl.value : '';
                processAccountName( accountText);
                if (tokenEl && tokenEl.value === '' && existingToken !== '') {
                    tokenEl.value = existingToken;
                }
            }
        }catch(err){
            console.error(err);
        }
            

}

let accountLookupTimer = null;

// Update from credential
function processAccountName( accountText, skipAccountLookup = false){  // Looks up credentials by accountText
    // Check if known url, and get password etc into token field
    let cleanAccount = (accountText || '').trim();
    if (!provider || !provider.giturl || cleanAccount === '') {
        matchedRepoIndeces = [];
        displayedRepoIndex = 0;
        displayedRepoMax = 0;
        let rangeEl = document.getElementById('matchedRepoRange');
        if (rangeEl) rangeEl.style.display = 'none';
        updateCredentialsText();
        return;
    }
    
    let baseGitUrl = provider.giturl.replace(/\/+$/, '');
    let urlToMatch = (baseGitUrl + '/' + cleanAccount + '/').toLowerCase();  // Finds github repos with JanAxelsson, but not JanAxelssonTest
    console.log(`Account name = ${cleanAccount},  url = ${urlToMatch}`);

    let credsList = Array.isArray(allCredentials) ? allCredentials : [];
    matchedRepoIndeces = [];
    for (let i = 0; i < credsList.length; i++) {
        if (credsList[i] && typeof credsList[i].url === 'string' && credsList[i].url.toLowerCase().startsWith(urlToMatch)) {
            matchedRepoIndeces.push(i);
        }
    }
    matchedRepoIndeces = getIndecesToUniqueCredentials( credsList, matchedRepoIndeces);  // Get indeces with unique credentials
    
    // If empty
    if (displayedRepoMax <= 0 ){
        displayedRepoIndex = 0;
    }
    
    displayedRepoMax = matchedRepoIndeces.length;
    
    // If just turned non-empty
    if (displayedRepoMax > 0 ){
        displayedRepoIndex = 1;
    }
    
    let rangeEl = document.getElementById('matchedRepoRange');
    if (rangeEl) {
        if (displayedRepoMax > 1 ){
            rangeEl.style.display = 'block';  // Show arrow buttons (to switch between credentials)
        }else{
            rangeEl.style.display = 'none';   // Hide arrow buttons (to switch between credentials)
        }
    }
    
    updateCredentialsText();

    // Also query the account-level credential in the password manager so accounts without repos in state.repos are found
    if (!skipAccountLookup && typeof opener !== 'undefined' && opener && opener.opener && typeof opener.opener.getCredential === 'function') {
        if (accountLookupTimer) clearTimeout(accountLookupTimer);
        accountLookupTimer = setTimeout(async () => {
            try {
                let accountEl = document.getElementById('accountName');
                let currentInput = (accountEl ? accountEl.value : '').trim();
                if (currentInput.toLowerCase() !== cleanAccount.toLowerCase()) return;

                let accountUrl = baseGitUrl + '/' + cleanAccount;
                let acctCred = await opener.opener.getCredential(accountUrl);
                if (acctCred && acctCred.password !== undefined) {
                    acctCred.url = accountUrl + '/';
                    if (!Array.isArray(allCredentials)) {
                        allCredentials = [];
                    }
                    allCredentials.unshift(acctCred);
                    processAccountName(currentInput, true);
                }
            } catch (e) {}
        }, 150);
    }
   
}
    function getIndecesToUniqueCredentials( allCredentials, matchedRepoIndeces) { 
        
        let seen = Object.create(null); // Store a map.  Avoids prototype issues
        let foundIndeces = []; //last found index
        
        // Loop for the array elements 
        for (let i in matchedRepoIndeces) { 
            let index = matchedRepoIndeces[i];
            if (!allCredentials || !allCredentials[index]) continue;
            let creds = allCredentials[index].username + allCredentials[index].password;  // Make a compound string with both
            
            // Skip showing undefined passwords
            if (allCredentials[index].password === undefined ){
                continue
            }
            
            // Add unque password
            if (!seen[creds] ) {
                foundIndeces.push(Number(index));
                seen[creds] = true;
            }
    
        } 
        
        return foundIndeces;
    }
    function updateCredentialsText(){ // Show credential texts etc in html
        
        let guessedUsername, guessedPassword;
        
        // Get username and password
        if (displayedRepoMax > 0){
            guessedUsername = allCredentials[ matchedRepoIndeces[ displayedRepoIndex - 1] ].username;
            guessedPassword = allCredentials[ matchedRepoIndeces[ displayedRepoIndex - 1] ].password;
            if (provider && typeof provider.formatTokenForDisplay === 'function') {
                guessedPassword = provider.formatTokenForDisplay(guessedUsername, guessedPassword);
            }
        }else{
            guessedUsername = '';
            guessedPassword = '';
        }
        
        // Update html
        document.getElementById("token").value = guessedPassword;
        document.getElementById("matchedCurrentPos").innerText = displayedRepoIndex;
        document.getElementById("matchedMax").innerText = displayedRepoMax;
        
    }   

// Button clicks        
async function createRepo(){// Create Repo

    //
    // Assume just creating a remote repo
    //   
    let OWNER = document.getElementById('accountName').value.trim();               
    let NEW_REPO = document.getElementById('newRepoName').value.trim();
    let TOKEN = document.getElementById('token').value.trim();
    let DESCRIPTION = document.getElementById('repoDescription').value;
    let PRIVATE = document.getElementById('privateRepo').checked;
    
    let response = await provider.createRepo( OWNER, TOKEN, NEW_REPO, DESCRIPTION, PRIVATE );  
    let ok = response.ok;
    giturl = response.giturl;  // global variable in this file

        
    if (ok){
        document.getElementById('newRepoStatus').innerHTML = `Successfully created repository =  ${giturl}`;
        document.getElementById('newRepoStatus').classList.add('green');
        document.getElementById('newRepoStatus').classList.remove('red');
 
        outputURL = giturl;
        
        // Set credential in password manager before showing '2) Set as Remote'
        await rememberCredential( giturl, OWNER, TOKEN);
        
        document.getElementById('ok2').style="display: block;" ;

    } else {
        document.getElementById('newRepoStatus').innerHTML = `Failed creating repository =  ${giturl} `;
        document.getElementById('newRepoStatus').classList.add('red');
        document.getElementById('newRepoStatus').classList.remove('green');
        
        document.getElementById('ok2').style="display: none;" ;
        
    }
}
    async function rememberCredential( giturl, OWNER, TOKEN){
        console.log('rememberCredential');
        
        try{
            let cleanOwner = (OWNER || '').trim();
            let cleanToken = (TOKEN || '').trim();
            let cred = (provider && typeof provider.parseTokenForCredential === 'function')
                ? provider.parseTokenForCredential(cleanOwner, cleanToken)
                : { username: cleanOwner, password: cleanToken };

            let baseGitUrl = (provider && provider.giturl) ? provider.giturl.replace(/\/+$/, '') : '';
            if (!baseGitUrl && giturl) {
                try {
                    let u = new URL(giturl);
                    baseGitUrl = `${u.protocol}//${u.host}`;
                } catch (e) {}
            }

            // 1. Store account-level credential in password manager so the latest Create Repo token is always remembered first (1 of N)
            //    without overwriting repo-specific fine-grained PATs on other existing repositories
            if (baseGitUrl && cleanOwner) {
                let accountUrl = `${baseGitUrl}/${cleanOwner}`;
                await opener.opener.setCredential(accountUrl, cred.username, cred.password);
            }

            // 2. Store credential for the newly created repository URL
            await opener.opener.setCredential( giturl, cred.username, cred.password);

            // 3. Prepend to in-memory allCredentials so this token is first (1 of N) while keeping other unique repo tokens accessible
            if (Array.isArray(allCredentials)) {
                allCredentials.unshift({
                    username: cred.username,
                    password: cred.password,
                    url: giturl
                });
            }
        }catch(err){
            console.error(err);
        }
    }
function finalizeAndClose(){ 
    
    // Copy and click Set Remote Button
    let textarea_id = 'additionalRemoteURL';
    opener.document.getElementById(textarea_id).value = outputURL;
               
    opener.document.getElementById('setRemoteURLButton').click();
    

    // Set default in Settings / Remote tab
    
    opener.document.getElementById('allowPushToRemote').checked = false; 
    opener.document.getElementById('allowPushToRemote').click(); 
    
    opener.document.getElementById('autoPushToRemote').checked = false; 
    opener.document.getElementById('autoPushToRemote').click(); 
    
    
    window.close()
}
