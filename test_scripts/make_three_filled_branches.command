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

# master commit A, A-folder/A2
echo 'master created' > A
echo 'master created' >  A1
echo 'master created' >  A2
echo 'master created' >  A3
git add .
mkdir 'A-folder'
touch 'A-folder/A2'
git add  'A-folder/A2'
git commit -m 'A'

# master commit B
echo 'master created' >  B
echo 'master created' >  B1
echo 'master created' >  B2
echo 'master created' >  B3
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
echo 'second created' >  C
git add .
git commit -m 'C'

# second branch D
echo 'second created' >   D
git add .
git commit -m 'D'

# second branch E
echo 'second created' >   E
git add .
git commit -m 'E'

#
# third  
#
git switch 'third'

# third branch T1
echo 'third created' >   T1
git add .
git commit -m 'T1'

# third branch T"
echo 'third created' >   T2
git add .
git commit -m 'T2'


# master branch
git switch 'master'

# master branch F
echo 'master created' >  F
git add .
git commit -m 'F'

# master branch G
echo 'master created' >  G
git add .
git commit -m 'G'



