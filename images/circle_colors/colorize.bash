#!/bin/bash 
# Develop script
#  used to generate images
# Converts circle_black.png to different colored images


#
# Define functions
#

colorize() {
  
    OUTPUTCOLOR=$1
    echo "'$OUTPUTCOLOR',"
    
    convert "../circle_black.png" -channel RGB -fuzz 90% -fill $OUTPUTCOLOR -opaque black "circle_$OUTPUTCOLOR.png"
    
    #convert "../circle_black.png" \
    #\( -clone 0 -alpha extract \) \
    #\( -clone 0 -alpha off -channel rgba -fuzz 20% \
    #-fill $OUTPUTCOLOR +opaque "#80C145" \) \
    #\( -clone 2 -alpha extract \) \
    #\( -clone 1 -clone 2 -compose multiply -composite \) \
    #-delete 0,1,3 \
    #-alpha off -compose over -compose copy_opacity -composite "circle_$OUTPUTCOLOR.png"
}


echo " "
echo "LIST TO COPY INTO graph.js : (ignore last ',')"
echo " "

#
# Generate images
#

colorize 'red'
colorize 'blue'
colorize 'orange'
colorize 'purple'
colorize 'salmon'
colorize 'orange4'
colorize 'tan'
colorize 'goldenrod1'
colorize 'olive'
colorize 'LawnGreen'
colorize 'PaleTurquoise1'
colorize 'DeepSkyBlue'


echo ' '
