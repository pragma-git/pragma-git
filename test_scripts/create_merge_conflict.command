#!/bin/bash

#
# second   A1   A1      A   
#          A2   A2       
#          A3   A3       
#               B 
#
#
#
#                   ---- C2
#                 /
#          A --- B 
#                 \    
#                   - C1 --- C3
#    
# master   A1    A1   
#          A2    A2    B
#          A3    A3    B
#                B
#                  +D
#
#
      
#
# Emod and Gmod are new compared to created with "make_three_filled_branches.command"


REPO=/tmp/twoBranches

# start all over
rm -rf $REPO

mkdir  $REPO
cd $REPO
git init

#
# master branch 
#
git checkout -b 'master'

# master commit A, B
echo 'master created DD' >  DD
echo 'master created UD' >  UD
echo 'master created DU' >  DU
echo 'master created UU' >  UU
git add .
git commit -m 'A'


# branch master to second
git checkout -b 'second'


# work on branch master - commit C1 
git checkout 'master'
rm DD
echo 'master created AU' >  AU
rm DU 
echo 'master created AA' >  AA
echo 'master edited UU' >>  UU
echo 'master edited UD' >>  UD

git add .
git commit -m 'C1'


# work on branch second - commit C2 
git checkout 'second'
rm DD
rm UD 
echo 'second created UA' >  UA
echo 'second created AA' >  AA
echo 'second edited UU' >>  UU
echo 'second edited DU' >>  DU

git add .
git commit -m 'C2'


## work on branch master - commit C3
#git checkout 'master'
#echo 'master created AU' >  AU

#git add .
#git commit -m 'C3'


# End in branch master
git checkout 'master'











