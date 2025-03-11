This folder is where a new provider (cloud git provider, such as github, gitlab, etc) is created, to be used inside pragma-git.

A new provider is created by making two files:
- 1) A javascript file with the provider host address + the ending ".js" (for instance "github.com.js")
- 2) Icon png files (16x16 pixels), which are referenced in the file from 1).

1) The javascript file :
Use one of the "github.com.js", "gitlab.com.js", "bitbucket.org.js", as a template,
and make sure all functionality is coded to work for the new provider.

2) The icon file:
Make new icon files in the "git-provider-icons" folder. Both a dark-mode  and a light-mode icon should be created (or use same file for both if it looks good).
The size used is 16x16 pixels, which is compatible with repository menu, and tray menu for osx, windows, linux.
If a larger file exists in this folder, it is not used, but stored as the original, in case new versions needs to be created at some later point.


Ignore the file "github-star.js",
which is used internally in pragma-git, to allow starring of github repositories
(for now  only to star pragma-git, if the user wish to do that).
