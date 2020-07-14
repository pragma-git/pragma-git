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

# master branch (implicit)
git init

touch A
git add .
git commit -m 'A'

touch B
git add .
git commit -m 'B'


# make new branches
git branch 'second'
git branch 'third'


# second
git switch 'second'


touch C
git add .
git commit -m 'C'

touch D
git add .
git commit -m 'D'

touch E
git add .
git commit -m 'E'

# third
git switch 'third'

touch T1
git add .
git commit -m 'T1'

touch T2
git add .
git commit -m 'T2'


# master branch
git switch 'master'

touch F
git add .
git commit -m 'F'

touch G
git add .
git commit -m 'G'



