!include "MUI2.nsh"

Unicode True

Name "Pragma-git"
BrandingText "Jan Axelsson"

#  Taken from: NSIS Installation Script created by NSIS Quick Setup Script Generator v1.09.18
!define APP_NAME "Pragma-git"
!define COMP_NAME "Jan Axelsson"
!define WEB_SITE "https://pragma-git.github.io"
!define COPYRIGHT "Jan Axelsson © 2020"
!define DESCRIPTION "Application"
!define MAIN_APP_EXE "${APP_NAME}.exe"
!define REG_APP_PATH "Software\Microsoft\Windows\CurrentVersion\App Paths\${MAIN_APP_EXE}"
!define UNINSTALL_PATH "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"

# MULTI-USER
!define REG_ROOT "HKEY_LOCAL_MACHINE"  

# set the icon
!define MUI_ICON "../../images/icon_installer.ico"

# define the resulting installer's name:
OutFile ..\..\dist\${OUTPUT}

# set the installation directory
InstallDir "$PROGRAMFILES64\${APP_NAME}\"

# app dialogs
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN_TEXT "Start ${APP_NAME}"

#http://mdb-blog.blogspot.com/2013/01/nsis-lunch-program-as-user-from-uac.html
!define MUI_FINISHPAGE_RUN "$WINDIR\explorer.exe"
!define MUI_FINISHPAGE_RUN_PARAMETERS "$INSTDIR\${MAIN_APP_EXE}"
#!define MUI_FINISHPAGE_RUN "$INSTDIR\${MAIN_APP_EXE}"

!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

# default section start
Section

    SetShellVarContext all  # Sets $SMPROGRAMS, $DESKTOP, correct for multi-user
    SetRegView 64           # Registry 64-bit application (avoids Wow6432 extra registry node)

    # delete the installed files
    RMDir /r $INSTDIR
    
    # define the path to which the installer should install
    SetOutPath $INSTDIR
    
    # specify the files to go in the output path
    File /r ..\..\dist\${EXEFOLDER}\*
    
    # create the uninstaller
    WriteUninstaller "$INSTDIR\Uninstall ${MAIN_APP_EXE}"
    
    # create shortcuts in the start menu and on the desktop
    CreateShortCut "$SMPROGRAMS\${APP_NAME}.lnk" "$INSTDIR\${MAIN_APP_EXE}"
    CreateShortCut "$SMPROGRAMS\Uninstall ${APP_NAME}.lnk" "$INSTDIR\Uninstall ${MAIN_APP_EXE}"
    CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${MAIN_APP_EXE}"


    # REGISTRY SETTINGS
    
    WriteRegStr ${REG_ROOT} "${REG_APP_PATH}" "" "$INSTDIR\${MAIN_APP_EXE}"
    WriteRegStr ${REG_ROOT} "${UNINSTALL_PATH}"  "DisplayName" "${APP_NAME}"
    WriteRegStr ${REG_ROOT} "${UNINSTALL_PATH}"  "UninstallString" "$\"$INSTDIR\Uninstall ${MAIN_APP_EXE}$\""
    WriteRegStr ${REG_ROOT} "${UNINSTALL_PATH}"  "DisplayIcon" "$INSTDIR\${MAIN_APP_EXE}"
    WriteRegStr ${REG_ROOT} "${UNINSTALL_PATH}"  "DisplayVersion" "${VERSION}"
    WriteRegStr ${REG_ROOT} "${UNINSTALL_PATH}"  "Publisher" "${COMP_NAME}"
    

SectionEnd


# ===================================================
# create a section to define what the uninstaller does
Section "Uninstall"

    SetShellVarContext all  # Sets $SMPROGRAMS, $DESKTOP, correct for multi-user
        
    # delete the installed files
    RMDir /r $INSTDIR
    
    # delete the shortcuts
    Delete "$SMPROGRAMS\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\Uninstall ${APP_NAME}.lnk"
    Delete "$DESKTOP\${APP_NAME}.lnk"
    
    # REGISTRY SETTINGS
    DeleteRegKey ${REG_ROOT} "${REG_APP_PATH}"
    DeleteRegKey ${REG_ROOT} "${UNINSTALL_PATH}"

SectionEnd
