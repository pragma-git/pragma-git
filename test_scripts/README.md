TESTS
-----

 

### Succesful merges

**setup : **make_three_filled_branches.command

**Pragma-git :** Stand in "master". Merge-button "second"

**Expected :** /tmp/threeBranches "second" successfully merged into "master"

 

### Merge conflict

**setup :** create_merge_conflict.command

**Pragma-git :** Stand in "master". Merge-button "second"

**Expected :** /tmp/threeBranches is in conflict with A-folder/A2 being changed,
and B deleted in "second".

 

### Pull

**setup :** create_pull_conflict.command

**Pragma-git :** Stand in "master". Pull button should be visible; press it.

**Expected :** /tmp/threeBranches is in conflict with remote master.
