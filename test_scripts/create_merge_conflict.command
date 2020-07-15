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



# Change file A in master
git switch 'master'
echo 'A changed from master' > A
echo 'B changed from master' > B
git commit -a -m 'Emod'

# Change file A in second
git switch 'second'
echo 'A changed from second' > A
echo 'B changed from second' > B
git commit -a -m 'Gmod'

# End in master
git switch 'master'
