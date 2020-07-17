#!/bin/bash

#
# second          C - D - E - Emod
#                /
# master  - A - B - F - G - Gmod
#                \
# third           T1 - T2 

./make_three_filled_branches.command


REPO=/tmp/threeBranches

cd $REPO



# Change files in master
git switch 'master'
echo 'A2 changed from master' > 'A-folder/A2'
git add 'A-folder/A2'
echo 'B changed from master' > B
git commit -a -m 'Emod' 

# Change files in second
git switch 'second'
echo 'A2 changed from second' > 'A-folder/A2'
git add 'A-folder/A2'

rm B # Extra : remove one file

git commit -a -m 'Gmod'


# Switch to master
git switch 'master'



