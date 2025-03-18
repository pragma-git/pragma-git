
//let cachedAllCredentials = [];
let provider;
let giturl;

async function runWhenDOMContentLoaded() {

            console.log(`localState.gitCreateRemoteRepoWindow.data.name = ${localState.gitCreateRemoteRepoWindow.data.name}`);
        
            // Read data transferred 
            let name = localState.gitCreateRemoteRepoWindow.data.name;
            let provider_url = localState.gitCreateRemoteRepoWindow.data.provider;
            
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
            
            // Initialize 
            //provider = await opener.opener.gitProvider(provider_url, initialize = true);
             
            
            console.log('create_remote_repository.html :DOM fully loaded and parsed');
                        
            // Import modules
            const util = require('./util_module.js'); // Pragma-git common functions
            const fetch = require('node-fetch');
            
            // Read all stored credentials
            //cachedAllCredentials = opener.opener.getAllCredentials();
        
            //// Parse existing url
            
            //let textarea = opener.document.getElementById(state.repoNumber + 10000).value;
            //let strings = textarea.split('/');
            
            //// "https://JanAxelssonTest:13241121251413142@github.com/JanAxelssonTest/test3.git" 
            //// ->  ["https:", "", "JanAxelssonTest@github.com", "JanAxelssonTest", "test3.git"]
            //let account = strings[3];
            
            //let repoSplit = strings[4].split('.'); // Split repo at '.'
            //let repo = repoSplit.slice(0, repoSplit.length - 1).join(".") ; // repo.git -> repo (split off last '.')
            
            //let token = strings[2].split('@')[0]; // token@github.com -> token  (or 'github.com' if no '@')
            
            //if ( token == 'github.com'){
                //token = '';
            //}
            
            //let creds = await opener.opener.getCredential(); // Read from pragma-git main
            //token = creds.password;
            
            //document.getElementById('accountName').value = account;
            //document.getElementById('token').value = token;
            //document.getElementById('repoName').value = repo;  // This element id does not exist
            
            
            //build('repoName'); // update html
            
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
    
    document.getElementById('outputUrl').textContent = url;
    
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
        document.getElementById('newRepoStatus').innerHTML = `Successfully created repository =  ${NEW_REPO}`;
        document.getElementById('newRepoStatus').classList.add('green');
        document.getElementById('newRepoStatus').classList.remove('red');
        
        document.getElementById('ok2').style="display: block;" ;
 
        document.getElementById('outputUrl').textContent = giturl;

    } else {
        //document.getElementById('newRepoStatus').innerHTML = `Failed creating repository =  ${NEW_REPO} <BR> Reason: ${message}`;
        document.getElementById('newRepoStatus').classList.add('red');
        document.getElementById('newRepoStatus').classList.remove('green');
        
        document.getElementById('ok2').style="display: none;" ;
        
    }


    //build('newRepoName');
}
