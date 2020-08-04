#!/bin/bash

#
# second          C - D - E - *Emod
#                /
# master  - A - B - F - G - *Gmod
#                \
# third           T1 - T2 
#
# Emod and Gmod are new compared to created with "make_three_filled_branches.command"

./make_three_filled_branches.command

# master has files ABFG
# second has files ABCDE
#
# in B, the following files exist (common to both branches)
#  A, A1, A2,A3 , A-folder/A2, 
#  B, B1, B2, B3 exist 
#
# The plan is now to modify them :
# master : delete A, add A4, delete A2, add A5, edit A3
# second : delete B, add B4, delete A2, add A5, edit A3

REPO=/tmp/threeBranches

cd $REPO

# Make new conflicting commits Emod, Gmod

#   X shows the status of the index, and Y shows the status of the work tree
#       D           D    unmerged, both deleted     A2 Accept
#       A           U    unmerged, added by us      G  Conflict
#       U           D    unmerged, deleted by them  B  Accept 
#       U           A    unmerged, added by them    B4 Accept
#       D           U    unmerged, deleted by us    A  Accept
#       A           A    unmerged, both added       A5 Conflict
#       U           U    unmerged, both modified    A3 Conflict



# resolveConflicts.js:453 XY = UU  A3 
# resolveConflicts.js:453 XY = AA  A5
# resolveConflicts.js:453 XY = D   B
# resolveConflicts.js:453 XY = A   B4
# resolveConflicts.js:453 XY = A   C
# resolveConflicts.js:453 XY = A   D
# resolveConflicts.js:453 XY = A   E
# resolveConflicts.js:453 XY = AU  G   Why not A4 ?

# Change files in second
git switch 'second'
rm B
echo 'second created B4' > B4
rm A2 # both deleted
echo 'second created A5' > A5 # Both created
echo 'second edited A3' >> A3
git add .
git commit -a -m 'Gmod'

# Change files in master
git switch 'master'
rm A
echo 'master created A4' > A4
rm A2 # both deleted
echo 'master created A5' > A5 # Both created
echo 'master edited A3' >> A3
git add .
git commit -a -m 'Emod' 


# Switch to master
git switch 'master'



