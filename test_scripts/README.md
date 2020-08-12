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

**Pragma-git :** Stand in "master". Pull button should be visible; press it.

**Expected :** /tmp/threeBranches is in conflict with remote master.
