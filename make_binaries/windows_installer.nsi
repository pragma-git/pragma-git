﻿;
; Multi/single user install, modified from https://github.com/Drizin/NsisMultiUser
;
;
!addplugindir /x86-ansi ".\assets-windows\NsisMultiUser\Plugins\x86-ansi"
!addplugindir /x86-unicode ".\assets-windows\NsisMultiUser\Plugins\x86-unicode"
!addincludedir ".\assets-windows\NsisMultiUser\Include"
!addincludedir ".\assets-windows\NsisMultiUser\Common"
!addincludedir ".\assets-windows"

!include UAC.nsh
!include NsisMultiUser.nsh
!include LogicLib.nsh
!include StdUtils.nsh

; ------------------------------------------------------------------------
; Installer defines
; ------------------------------------------------------------------------
!define PRODUCT_NAME "Pragma-git" ; name of the application as displayed to the user
!define PROGEXE "Pragma-git.exe" ; main application filename
!define COMPANY_NAME "Jan Axelsson" ; company, used for registry tree hierarchy
!define CONTACT "pragmagit@gmail.com" ; stored as the contact information in the uninstall info of the registry

!define COMMENTS "NsisMultiUser NSIS Full Demo, based on the NSIS built-in pages" ; stored as comments in the uninstall info of the registry
!define URL_INFO_ABOUT "https://github.com/Drizin/NsisMultiUser/tree/master/Demos/NSIS_Full" ; stored as the Support Link in the uninstall info of the registry, and when not included, the Help Link as well
!define URL_HELP_LINK "https://github.com/Drizin/NsisMultiUser/wiki" ; stored as the Help Link in the uninstall info of the registry
!define URL_UPDATE_INFO "https://github.com/Drizin/NsisMultiUser" ; stored as the Update Information in the uninstall info of the registry

!define PLATFORM "Win64"
!define MIN_WIN_VER "XP"
!define SETUP_MUTEX "${COMPANY_NAME} ${PRODUCT_NAME} Setup Mutex" ; do not change this between program versions!
!define APP_MUTEX "${COMPANY_NAME} ${PRODUCT_NAME} App Mutex" ; do not change this between program versions!
!define SETTINGS_REG_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
;!define LICENSE_FILE "License.txt" ; license file, optional

; ------------------------------------------------------------------------
; NsisMultiUser optional defines
; ------------------------------------------------------------------------
!define MULTIUSER_INSTALLMODE_ALLOW_BOTH_INSTALLATIONS 0
!define MULTIUSER_INSTALLMODE_ALLOW_ELEVATION 1
!define MULTIUSER_INSTALLMODE_ALLOW_ELEVATION_IF_SILENT 1 ; required for silent-mode allusers-uninstall to work, when using the workaround for Windows elevation bug
!define MULTIUSER_INSTALLMODE_DEFAULT_ALLUSERS 1

!if ${PLATFORM} == "Win64"
	!define MULTIUSER_INSTALLMODE_64_BIT 1
!endif
!define MULTIUSER_INSTALLMODE_DISPLAYNAME "${PRODUCT_NAME} ${VERSION} ${PLATFORM}"

; ------------------------------------------------------------------------
; Installer Attributes
; ------------------------------------------------------------------------
Name "${PRODUCT_NAME} v${VERSION} ${PLATFORM}"
OutFile ..\dist\${OUTPUT}
BrandingText '©2020 ${COMPANY_NAME}'

AllowSkipFiles off
SetOverwrite on ; (default setting) set to on except for where it is manually switched off
ShowInstDetails show
Unicode true ; properly display all languages (Installer will not work on Windows 95, 98 or ME!)
#SetCompressor /SOLID lzma
XPStyle on

# define the resulting installer's name:
!include Utils.nsh

!insertmacro MULTIUSER_PAGE_INSTALLMODE


PageEx instfiles
	PageCallbacks PageInstFilesPre EmptyCallback EmptyCallback
PageExEnd

; SIGNING -- remove next line if you're using signing after the uninstaller is extracted from the initially compiled setup
!include UninstallPages.nsh

; Languages (first alphabetical is default language) - must be inserted after all pages
LoadLanguageFile "${NSISDIR}\Contrib\Language files\English.nlf"
!insertmacro MULTIUSER_LANGUAGE_INIT

; Reserve files
ReserveFile /plugin LangDLL.dll

; ------------------------------------------------------------------------
; Functions
; ------------------------------------------------------------------------
Function CheckInstallation
	; if there's an installed version, uninstall it first (I chose not to start the uninstaller silently, so that user sees what failed)
	; if both per-user and per-machine versions are installed, unistall the one that matches $MultiUser.InstallMode
	StrCpy $0 ""
	${if} $HasCurrentModeInstallation = 1
		StrCpy $0 "$MultiUser.InstallMode"
	${else}
		!if ${MULTIUSER_INSTALLMODE_ALLOW_BOTH_INSTALLATIONS} = 0
			${if} $HasPerMachineInstallation = 1
				StrCpy $0 "AllUsers" ; if there's no per-user installation, but there's per-machine installation, uninstall it
			${elseif} $HasPerUserInstallation = 1
				StrCpy $0 "CurrentUser" ; if there's no per-machine installation, but there's per-user installation, uninstall it
			${endif}
		!endif
	${endif}

	${if} "$0" != ""
		${if} $0 == "AllUsers"
			StrCpy $1 "$PerMachineUninstallString"
			StrCpy $3 "$PerMachineInstallationFolder"
		${else}
			StrCpy $1 "$PerUserUninstallString"
			StrCpy $3 "$PerUserInstallationFolder"
		${endif}
		${if} ${silent}
			StrCpy $2 "/S"
		${else}
			StrCpy $2 ""
		${endif}
	${endif}
FunctionEnd

Function RunUninstaller
	StrCpy $0 0
	ExecWait '$1 /SS $2 _?=$3' $0 ; $1 is quoted in registry; the _? param stops the uninstaller from copying itself to the temporary directory, which is the only way for ExecWait to work
FunctionEnd


; ------------------------------------------------------------------------
; Sections
; ------------------------------------------------------------------------
InstType "Typical"
InstType "Minimal"
InstType "Full"


Section "Core Files (required)" SectionCoreFiles
	SectionIn 1 2 3 RO

	!insertmacro UAC_AsUser_Call Function CheckInstallation ${UAC_SYNCREGISTERS}
	${if} $0 != ""
		HideWindow
		ClearErrors
		${if} $0 == "AllUsers"
			Call RunUninstaller
  		${else}
			!insertmacro UAC_AsUser_Call Function RunUninstaller ${UAC_SYNCREGISTERS}
  		${endif}
		${if} ${errors} ; stay in installer
			SetErrorLevel 2 ; Installation aborted by script
			BringToFront
			Abort "Error executing uninstaller."
		${else}
			${Switch} $0
				${Case} 0 ; uninstaller completed successfully - continue with installation
					BringToFront
					Sleep 1000 ; wait for cmd.exe (called by the uninstaller) to finish
					${Break}
				${Case} 1 ; Installation aborted by user (cancel button)
				${Case} 2 ; Installation aborted by script
					SetErrorLevel $0
					Quit ; uninstaller was started, but completed with errors - Quit installer
				${Default} ; all other error codes - uninstaller could not start, elevate, etc. - Abort installer
					SetErrorLevel $0
					BringToFront
					Abort "Error executing uninstaller."
			${EndSwitch}
		${endif}

		; Just a failsafe - should've been taken care of by cmd.exe
		!insertmacro DeleteRetryAbort "$3\${UNINSTALL_FILENAME}" ; the uninstaller doesn't delete itself when not copied to the temp directory
		RMDir "$3"
	${endif}

	SetOutPath $INSTDIR
	; Write uninstaller and registry uninstall info as the first step,
	; so that the user has the option to run the uninstaller if sth. goes wrong
	WriteUninstaller "${UNINSTALL_FILENAME}"
	; SIGNING -- or this if you're using signing:
	; File "${UNINSTALL_FILENAME}"
	
	!insertmacro MULTIUSER_RegistryAddInstallInfo ; add registry keys

	# specify the files to go in the output path
	File /r ..\dist\${EXEFOLDER}\*
        
SectionEnd


SectionGroup /e "Integration" SectionGroupIntegration
	
	
	Section "Program Group" SectionProgramGroup
		SectionIn 1 3
	
		!insertmacro MULTIUSER_GetCurrentUserString $0
		CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}$0"
		CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}$0\${PRODUCT_NAME}.lnk" "$INSTDIR\${PROGEXE}"
	
		!ifdef LICENSE_FILE
			CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}$0\License Agreement.lnk" "$INSTDIR\${LICENSE_FILE}"
		!endif
		${if} $MultiUser.InstallMode == "AllUsers"
			CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}$0\Uninstall.lnk" "$INSTDIR\${UNINSTALL_FILENAME}" "/allusers"
		${else}
			CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}$0\Uninstall.lnk" "$INSTDIR\${UNINSTALL_FILENAME}" "/currentuser"
		${endif}
	SectionEnd
	
	
	Section "Desktop Icon" SectionDesktopIcon
		SectionIn 1 3
	
		!insertmacro MULTIUSER_GetCurrentUserString $0
		CreateShortCut "$DESKTOP\${PRODUCT_NAME}$0.lnk" "$INSTDIR\${PROGEXE}"
	SectionEnd
	
	
	Section /o "Start Menu Icon" SectionStartMenuIcon
		SectionIn 3
	
		${if} ${AtLeastWin7}
			${StdUtils.InvokeShellVerb} $0 "$INSTDIR" "${PROGEXE}" ${StdUtils.Const.ShellVerb.PinToStart}
		${else}
			!insertmacro MULTIUSER_GetCurrentUserString $0
			CreateShortCut "$STARTMENU\${PRODUCT_NAME}$0.lnk" "$INSTDIR\${PROGEXE}"
		${endif}
	SectionEnd
	
	

	Section /o "Quick Launch Icon" SectionQuickLaunchIcon
		SectionIn 3
	
		${if} ${AtLeastWin7}
			${StdUtils.InvokeShellVerb} $0 "$INSTDIR" "${PROGEXE}" ${StdUtils.Const.ShellVerb.PinToTaskbar}
		${else}
			; The $QUICKLAUNCH folder is always only for the current user
			CreateShortCut "$QUICKLAUNCH\${PRODUCT_NAME}.lnk" "$INSTDIR\${PROGEXE}"
		${endif}
	SectionEnd
SectionGroupEnd


Section "-Write Install Size" ; hidden section, write install size as the final step
	!insertmacro MULTIUSER_RegistryAddInstallSizeInfo
SectionEnd


; ------------------------------------------------------------------------
; Callbacks
; ------------------------------------------------------------------------
Function .onInit
	!insertmacro CheckPlatform ${PLATFORM}
	!insertmacro CheckMinWinVer ${MIN_WIN_VER}
	${ifnot} ${UAC_IsInnerInstance}
		!insertmacro CheckSingleInstance "Setup" "Global" "${SETUP_MUTEX}"
		!insertmacro CheckSingleInstance "Application" "Local" "${APP_MUTEX}"
	${endif}

	!insertmacro MULTIUSER_INIT
FunctionEnd


Function EmptyCallback
FunctionEnd


Function PageInstFilesPre
	GetDlgItem $0 $HWNDPARENT 1
	SendMessage $0 ${BCM_SETSHIELD} 0 0 ; hide SHIELD (Windows Vista and above)
FunctionEnd


Function .onUserAbort
	MessageBox MB_YESNO|MB_ICONEXCLAMATION "Are you sure you want to quit $(^Name) Setup?" IDYES mui.quit

	Abort
	mui.quit:
FunctionEnd


Function .onInstFailed
	MessageBox MB_ICONSTOP "${PRODUCT_NAME} ${VERSION} could not be fully installed.$\r$\nPlease, restart Windows and run the setup program again." /SD IDOK
FunctionEnd


; ------------------------------------------------------------------------
; SIGNING -- remove next line if you're using signing after the uninstaller is extracted from the initially compiled setup
; ------------------------------------------------------------------------
!include Uninstall.nsh
