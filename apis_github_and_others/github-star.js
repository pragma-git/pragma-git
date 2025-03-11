const myModule = {}
/**
 Module for starring a github repository.
 
 Usage :
     token = 'YOUR_PERSONAL_ACCESS_TOKEN'; // Replace with your token
     owner = 'owner_name'; // Replace with repository owner's username
     repo = 'repository_name'; // Replace with the repository name
    
     a = require('apis_github_and_others/github-star.js');
     ok = await a.starRepository(owner, repo, token);                   // ok = true if success, false if fail
     ok = await a.unstarRepository(owner, repo, token);                 // ok = true if success, false if fail
     isStarred = await a.isRepositoryStarred(owner, repo, token);       // isStarred = true if starred, false if not starred
 
 
 Usage example:
     url = 'https://github.com/JanAxelssonTest/Pull_test_repo.git'      // Or other github repo url
     creds = await getCredential(url); // From git credential helper
     token = creds.password;
     owner = 'pragma-git'; // Replace with repository owner's username
     repo = 'pragma-git'; // Replace with the repository name
     
     a = require('apis_github_and_others/github-star.js');
     
     isStarred = await a.isRepositoryStarred(owner, repo, token);
     console.log(`isStarred = ${isStarred}`);
     
     ok = await a.starRepository(owner, repo, token);
     isStarred = await a.isRepositoryStarred(owner, repo, token);
     console.log(`isStarred = ${isStarred}`);
     
     ok = await a.unstarRepository(owner, repo, token);
     isStarred = await a.isRepositoryStarred(owner, repo, token);
     console.log(`isStarred = ${isStarred}`);
*/

myModule.starRepository = async function (owner, repo, token) {
    const url = `https://api.github.com/user/starred/${owner}/${repo}`;
    
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3.star+json',
        },
    });

    if (response.ok) {
        console.log(`Successfully starred ${owner}/${repo}`);
    } else {
        const error = await response.json();
        console.error(`Error starring repository: ${error.message}`);
    }
    
    return response.ok
}
myModule.unstarRepository = async function(owner, repo, token) {
    const url = `https://api.github.com/user/starred/${owner}/${repo}`;
    
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3.star+json',
        },
    });

    if (response.ok) {
        console.log(`Successfully unstarred ${owner}/${repo}`);
    } else {
        const error = await response.json();
        console.error(`Error unstarring repository: ${error.message}`);
    }
    
    return response.ok
}
myModule.isRepositoryStarred = async function(owner, repo, token) {
    const url = `https://api.github.com/user/starred/${owner}/${repo}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3.star+json',
        },
    });

    let output = false;
    if (response.status === 204) {
        console.log(`The repository ${owner}/${repo} is starred by you.`);
        output = true;
    } else if (response.status === 404) {
        console.log(`The repository ${owner}/${repo} is not starred by you.`);
        output = false;
    } else {
        const error = await response.json();
        console.error(`Error checking starred status: ${error.message}`);
        output = undefined;
    }
    
    
    return response.ok
}


// Export
module.exports = myModule 
