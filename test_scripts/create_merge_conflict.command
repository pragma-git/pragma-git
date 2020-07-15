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
git commit -a -m 'Emod'

# Change file A in second
git switch 'second'
echo 'A changed from second' > A
git commit -a -m 'Gmod'

# End in master
git switch 'master'
