!include "MUI2.nsh"

Name "Pragma-git"
BrandingText "Jan Axelsson"

# set the icon
!define MUI_ICON "../images/icon.ico"

# define the resulting installer's name:
OutFile ..\dist\${OUTPUT}

# set the installation directory
InstallDir "$PROGRAMFILES\Pragma-git\"

# app dialogs
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN_TEXT "Start Pragma-git"
!define MUI_FINISHPAGE_RUN "$INSTDIR\Pragma-git.exe"

!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

# default section start
Section

  # delete the installed files
  RMDir /r $INSTDIR

  # define the path to which the installer should install
  SetOutPath $INSTDIR

  # specify the files to go in the output path
  File /r ..\dist\${EXEFOLDER}\*

  # create the uninstaller
  WriteUninstaller "$INSTDIR\Uninstall Pragma-git.exe"

  # create shortcuts in the start menu and on the desktop
  CreateShortCut "$SMPROGRAMS\Pragma-git.lnk" "$INSTDIR\Pragma-git.exe"
  CreateShortCut "$SMPROGRAMS\Uninstall Pragma-git.lnk" "$INSTDIR\Uninstall Pragma-git.exe"
  CreateShortCut "$DESKTOP\Pragma-git.lnk" "$INSTDIR\Pragma-git.exe"

SectionEnd

# create a section to define what the uninstaller does
Section "Uninstall"

  # delete the installed files
  RMDir /r $INSTDIR

  # delete the shortcuts
  Delete "$SMPROGRAMS\Pragma-git.lnk"
  Delete "$SMPROGRAMS\Uninstall Pragma-git.lnk"
  Delete "$DESKTOP\Pragma-git.lnk"

SectionEnd
