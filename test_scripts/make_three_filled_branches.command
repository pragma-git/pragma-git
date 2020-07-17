#!/bin/bash

#
# second          C - D - E 
#                /
# master  - A - B - F - G 
#                \
# third           T1 - T2 

REPO=/tmp/threeBranches

# start all over
rm -rf $REPO

mkdir  $REPO
cd $REPO
git init

#
# master branch 
#
git switch 'master'

# master branch A, A-folder/A2
touch A
git add .
mkdir 'A-folder'
touch 'A-folder/A2'
git add  'A-folder/A2'
git commit -m 'A'

# master branch B
touch B
git add .
git commit -m 'B'


# make new branches
git branch 'second'
git branch 'third'




#
# second
#
git switch 'second'


# second branch C
touch C
git add .
git commit -m 'C'

# second branch D
touch D
git add .
git commit -m 'D'

# second branch E
touch E
git add .
git commit -m 'E'

#
# third  
#
git switch 'third'

# third branch T1
touch T1
git add .
git commit -m 'T1'

# third branch T"
touch T2
git add .
git commit -m 'T2'


# master branch
git switch 'master'

# master branch F
touch F
git add .
git commit -m 'F'

# master branch G
touch G
git add .
git commit -m 'G'



