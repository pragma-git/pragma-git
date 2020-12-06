TESTS
-----

 

### Succesful merges

**setup :** make_three_filled_branches.command

**Pragma-git :** Stand in "master". Merge-button "second"

**Expected :** /tmp/threeBranches "second" successfully merged into "master"

 

### Merge conflict

**setup :** create_merge_conflict.command

**Pragma-git :** Stand in "master". Merge-button "second"

**Expected :** /tmp/twoBranches has all possible conflicts, both within files,
as well as between branches

 

### Pull

**setup :** create_pull_conflict.command

**settings :**

/tmp/threeBranches,

remote =
<https://JanAxelssonTest:01e0b46efb5c37ceba6e72e7433a7e0863e016c7@github.com/JanAxelssonTest/Pull_test_repo>

**Pragma-git :** Stand in "master". Pull button should be visible; press it.

**Expected :** /tmp/threeBranches is in conflict with remote master.

 

### Detect remote branch

**setup :** create_remote_only_branch.command

**Pragma-git :** Stand in "master"

**Expected :** /tmp/clonedRemote_branch_test_repo

"second” and ”third” should be on remote only. Select them from branch dropdown
remote submenu, and they should appear at menu top level
