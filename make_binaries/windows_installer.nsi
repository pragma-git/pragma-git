!include "MUI2.nsh"

Name "Pragma-git"
BrandingText "Jan Axelsson"

#  Taken from: NSIS Installation Script created by NSIS Quick Setup Script Generator v1.09.18
!define APP_NAME "Pragma-git"
!define COMP_NAME "Jan Axelsson"
!define WEB_SITE "http://www.dicom2usb.com"
!define COPYRIGHT "Author  © 2006"
!define DESCRIPTION "Application"
!define INSTALLER_NAME "C:\Users\jan\Desktop\Nsisqssg\Output\Pragma-git\setup.exe"
!define MAIN_APP_EXE "Pragma-git.exe"
!define INSTALL_TYPE "SetShellVarContext current"
!define REG_ROOT "HKCU"
!define REG_APP_PATH "Software\Microsoft\Windows\CurrentVersion\App Paths\${MAIN_APP_EXE}"
!define UNINSTALL_PATH "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"


# set the icon
!define MUI_ICON "../images/icon_installer.ico"

# define the resulting installer's name:
OutFile ..\dist\${OUTPUT}

# set the installation directory
InstallDir "$PROGRAMFILES\${APP_NAME}\"

# app dialogs
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN_TEXT "Start ${APP_NAME}"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${MAIN_APP_EXE}"

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
    WriteUninstaller "$INSTDIR\Uninstall ${MAIN_APP_EXE}"
    
    # create shortcuts in the start menu and on the desktop
    CreateShortCut "$SMPROGRAMS\Pragma-git.lnk" "$INSTDIR\${MAIN_APP_EXE}"
    #CreateShortCut "$SMPROGRAMS\Uninstall Pragma-git.lnk" "$INSTDIR\Uninstall ${MAIN_APP_EXE}"
    CreateShortCut "$DESKTOP\Pragma-git.lnk" "$INSTDIR\${MAIN_APP_EXE}"


    # REGISTRY SETTINGS
    
    WriteRegStr ${REG_ROOT} "${REG_APP_PATH}" "" "$INSTDIR\${MAIN_APP_EXE}"
    WriteRegStr ${REG_ROOT} "${UNINSTALL_PATH}"  "DisplayName" "${APP_NAME}"
    WriteRegStr ${REG_ROOT} "${UNINSTALL_PATH}"  "UninstallString" "$INSTDIR\Uninstall ${MAIN_APP_EXE}"
    WriteRegStr ${REG_ROOT} "${UNINSTALL_PATH}"  "DisplayIcon" "$INSTDIR\${MAIN_APP_EXE}"
    WriteRegStr ${REG_ROOT} "${UNINSTALL_PATH}"  "DisplayVersion" "${VERSION}"
    WriteRegStr ${REG_ROOT} "${UNINSTALL_PATH}"  "Publisher" "${COMP_NAME}"
    


SectionEnd


# ===================================================
# create a section to define what the uninstaller does
Section "Uninstall"
    
    # delete the installed files
    RMDir /r $INSTDIR
    
    # delete the shortcuts
    Delete "$SMPROGRAMS\Pragma-git.lnk"
    Delete "$SMPROGRAMS\Uninstall Pragma-git.lnk"
    Delete "$DESKTOP\Pragma-git.lnk"
    
    # REGISTRY SETTINGS
    DeleteRegKey ${REG_ROOT} "${REG_APP_PATH}"
    DeleteRegKey ${REG_ROOT} "${UNINSTALL_PATH}"

SectionEnd
