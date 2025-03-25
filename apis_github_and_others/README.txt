INTRODUCTION
    
    This folder is where a new provider (cloud git provider, such as github, gitlab, etc) is created, to be used inside pragma-git.
    
    A new provider is created by making files:
    - 1) A javascript file with the provider host address + the ending ".js" (for instance "github.com.js")
    - 2) Icon png files (16x16 pixels), which are referenced in the file from 1).
    
    and optionally to have a helper to create new repositories, also the following files has to be edited:
    - 3) Create a button in 'settings.html'
    - 4) Improve 'create_remote_repository.js' for specifics for the new Provider 

INSTRUCTIONS

    1) The javascript file :
    Use one of the "github.com.js", "gitlab.com.js", "bitbucket.org.js", as a template,
    and make sure all functionality is coded to work for the new provider.
    
    2) The icon file:
    Make new icon files in the "git-provider-icons" folder. Both a dark-mode  and a light-mode icon should be created (or use same file for both if it looks good).
    The size used is 16x16 pixels, which is compatible with repository menu, and tray menu for osx, windows, linux.
    If a larger file exists in this folder, it is not used, but stored as the original, in case new versions needs to be created at some later point.
