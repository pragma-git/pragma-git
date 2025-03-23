
//let cachedAllCredentials = [];
let provider;
let giturl;
let name = localState.gitCreateRemoteRepoWindow.data.name;  // Provider name (Github, Gitlab, ...)
let outputURL;  // Communicates created URL between js and html

async function runWhenDOMContentLoaded() {

            console.log(`localState.gitCreateRemoteRepoWindow.data.name = ${localState.gitCreateRemoteRepoWindow.data.name}`);
        
            // Read data transferred 
            let provider_url = localState.gitCreateRemoteRepoWindow.data.provider;
            
            // Change text to correct provider (replace Github from original file)
            replaceInText( document.body, 'Github', name); 
            
            // Change to provider's icon
            try{
                provider = await opener.opener.gitProvider(provider_url,  initialize = false); // Unknown owner so far, just use static functions
                let iconPath =  await provider.getValue('icon', localState.dark ? 'darkmode' : 'lightmode' );
                document.getElementById( 'providerImage').src = iconPath;
            }catch (err){
                console.warn('Failed getting image :');
                console.warn(err);
            }
            
            // Change texts and links for providers
            let labelStruct = {};
            switch (name) {
                
                case 'Github': {
                    labelStruct.accountName_label = makeLabel( 
                        'Github username (', ')', 
                        'Register Github account', 'https://github.com/join'
                    );
                    labelStruct.token_label = makeLabel( 
                        'Token (', ')', 
                        'Create personal access token', 'https://github.com/settings/tokens'
                    );

                    setLabels( labelStruct);
                    break;
                };
                
                case 'Gitlab': {
                    labelStruct.accountName_label = makeLabel( 
                        'Gitlab username (', ')', 
                        'Register a Gitlab account', 'https://gitlab.com/users/sign_up'
                    );
                    labelStruct.token_label = makeLabel( 
                        'Token (', ')', 
                        'Create personal access token', 'https://gitlab.com/-/user_settings/personal_access_tokens'
                    );

                    setLabels( labelStruct);
                    break;
                };
                
                case 'Bitbucket': {
                    labelStruct.accountName_label = makeLabel( 
                        'Bitbucket username (', ')', 
                        'Register a Bitbucket account', 'https://bitbucket.org/'
                    );
                    labelStruct.token_label = makeLabel( 
                        'Username:app_password (', ')', 
                        'Create a Bitbucket app-password', 'https://bitbucket.org/account/settings/app-passwords/'
                    );

                    setLabels( labelStruct);
                    break;
                };
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

function build(repoField){ // Build git url
    
    // Read textareas
    let username = document.getElementById('accountName').value;
    let token = document.getElementById('token').value;
    let repoName = document.getElementById(repoField).value;
    
    // Verify repo name
    repoName = util.branchCharFilter( repoName) ;
    document.getElementById(repoField).value = repoName;
    
    if (token != ''){
        token = token + '@';
    }
    let url = 'https://' + token + 'github.com/' + username + '/' + repoName + '.git';
    
    outputURL = url;
    
    return url;
}
async function createRepo(){// Create Repo

    //
    // Assume just creating a remote repo
    //   
    let OWNER = document.getElementById('accountName').value;               
    let NEW_REPO = document.getElementById('newRepoName').value;
    let TOKEN = document.getElementById('token').value;
    let DESCRIPTION = document.getElementById('repoDescription').value;
    let PRIVATE = document.getElementById('privateRepo').checked;
    
    let response = await provider.createRepo( OWNER, TOKEN, NEW_REPO, DESCRIPTION, PRIVATE );  
    let ok = response.ok;
    giturl = response.giturl;  // global variable in this file

        
    if (ok){
        document.getElementById('newRepoStatus').innerHTML = `Successfully created repository =  ${giturl}`;
        document.getElementById('newRepoStatus').classList.add('green');
        document.getElementById('newRepoStatus').classList.remove('red');
        
        document.getElementById('ok2').style="display: block;" ;
 
        outputURL = giturl;
        
        // Set credential
        await rememberCredential( giturl, OWNER, TOKEN);

    } else {
        document.getElementById('newRepoStatus').innerHTML = `Failed creating repository =  ${giturl} <BR> Reason: ${message}`;
        document.getElementById('newRepoStatus').classList.add('red');
        document.getElementById('newRepoStatus').classList.remove('green');
        
        document.getElementById('ok2').style="display: none;" ;
        
    }
}
async function rememberCredential( giturl, OWNER, TOKEN){
    console.log('rememberCredential');
    
    try{
            switch (name) {
                
                case 'Github': {
                    opener.opener.setCredential( giturl, OWNER, TOKEN);
                    break;
                };
                
                case 'Gitlab': {
                    opener.opener.setCredential( giturl, OWNER, TOKEN);
                    break;
                };
                
                case 'Bitbucket': {
                    // Recommended to use app-password
                    
                    // Guess OAuth
                    let username = 'x-token-auth';
                    let password = TOKEN;
                    
                    // Corect if App-password (which is what I recommend)
                    let splitToken = TOKEN.split(':');
                    if ( splitToken.length == 2){
                        username = splitToken[0];
                        password = splitToken[1];
                    }
                    
                    await opener.opener.setCredential( giturl, username, password);
                    break;
                };
            }
    }catch(err){
        console.err(err);
    }
}

