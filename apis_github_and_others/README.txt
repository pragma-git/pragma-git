INTRODUCTION

    This folder is where a new provider (cloud or self-hosted git provider, such as GitHub, GitLab, Bitbucket, Gitea, etc.) is created, to be used inside pragma-git.

    All provider discovery, self-hosted detection, settings UI buttons, and "Create remote repository" dialog configuration are handled automatically through "general_git_rest_api.js" and the provider class files in this directory. No changes to "app.js", "settings.html", "settings.js", or "create_remote_repository.js" are needed when adding a new provider.

    A new provider is created by making files:
    - 1) A JavaScript file with the provider host address + the ending ".js" (for instance "github.com.js")
    - 2) Icon PNG files (16x16 pixels), which are referenced in the file from 1).

INSTRUCTIONS

    1) The JavaScript file:
    Use one of "github.com.js", "gitlab.com.js", "bitbucket.org.js", or "gitea.com.js" as a template,
    subclassing "general_git_rest_api.js", and make sure all functionality is coded to work for the new provider:
    - Repository metadata & operations: initialize(), getValue(), setValue(), createRepo()
    - Provider UI metadata in getValue():
      * 'provider-name' (e.g., 'github')
      * 'display-name' (e.g., 'Github', used for buttons in Settings and the Create Remote Repository window)
      * 'create-repo-labels' (tokenLabel, tokenPlaceholder, tokenHelpHtml, userLabel)
      * 'lightmode-icon' and 'darkmode-icon'
    - Optional credential token formatting & revocation checks:
      * formatTokenForDisplay(username, password)
      * parseTokenForCredential(owner, token)
      * isCredentialRevokedError(errorMessage)
    - Optional self-hosted server detection in "general_git_rest_api.js" (findProviderScript / detectProvider) if the provider supports self-hosted instances on custom domains.

    2) The icon file:
    Make new icon files in the "git-provider-icons" folder. Both a dark-mode and a light-mode icon should be created (or use the same file for both if it looks good).
    The size used is 16x16 pixels, which is compatible with the repository menu and tray menu for macOS, Windows, and Linux.
    If a larger file exists in this folder, it is not used, but stored as the original, in case new versions need to be created at some later point.
