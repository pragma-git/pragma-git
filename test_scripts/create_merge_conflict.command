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
echo 'A changed from master' > A
echo 'B changed from master' > B
git commit -a -m 'Emod'

# Change files in second
git switch 'second'
echo 'A changed from second' > A
echo 'B changed from second' > B
rm B # Extra : remove one file

git commit -a -m 'Gmod'

# End in master
git switch 'master'



