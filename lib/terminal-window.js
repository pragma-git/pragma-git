function runInTerminal(shellCommand) {
    const { spawn, execSync } = require('child_process');
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';

    let terminal = '';
    let args = [];

    // --- MAC LOGIC ---
    if (isMac) {
        terminal = 'osascript';
        const appleScript = `tell application "Terminal" to do script ${JSON.stringify(shellCommand + '; exit')}`;
        args = ['-e', appleScript, '-e', 'tell application "Terminal" to activate'];
    }

    // --- WINDOWS (WSL) LOGIC ---
    else if (isWin) {
        // Vi använder 'cmd.exe /c start' för att öppna ett nytt fönster
        terminal = 'cmd.exe';
        // Vi kör WSL inuti det nya fönstret
        args = ['/c', 'start', 'wsl.exe', 'bash', '-c', `${shellCommand}; echo 'Tryck Enter för att stänga...'; read`];
    }

    // --- LINUX LOGIC ---
    else if (isLinux) {
        // 1. Hitta bästa tillgängliga terminal
        const terminalList = ['x-terminal-emulator', 'gnome-terminal', 'konsole', 'xfce4-terminal', 'xterm'];
        terminal = '';
        for (const t of terminalList) {
            try {
                execSync(`which ${t}`, { stdio: 'ignore' });
                terminal = t;
                break;
            } catch (e) {}
        }

        // 2. Detektera om terminalen kräver ny (--) eller gammal (-e) syntax
        let useDoubleDash = false;
        if (terminal === 'gnome-terminal' || terminal === 'xfce4-terminal') {
            try {
                // Moderna GNOME (>3.27) kräver "--"
                const help = execSync(`${terminal} --help`, { encoding: 'utf8' });
                if (help.includes('-- ')) useDoubleDash = true;
            } catch (e) {}
        }

        // 3. Bygg argumenten
        // Vi paketerar kommandot i en bash-instans för att hantera ; exec bash
        const innerCmd = `${shellCommand}; exec bash`;

        if (useDoubleDash) {
            // Modern syntax (GNOME, m.fl.)
            args = ['--', 'bash', '-c', innerCmd];
        } else {
            // Klassisk syntax (xterm, Konsole, äldre GNOME)
            // Här måste vi använda JSON.stringify för att hålla ihop bash-kommandot
            args = ['-e', `bash -c ${JSON.stringify(innerCmd)}`];
        }

        console.log(`Linux: Använder ${terminal} med ${useDoubleDash ? '--' : '-e'}`);
    }


    // --- EXECUTION ---
    console.log(`Försöker starta terminal: ${terminal} på ${process.platform}`);
    
    const terminalProcess = spawn(terminal, args);

    terminalProcess.on('error', (err) => {
        console.error(`Kunde inte starta terminalen (${terminal}):`, err.message);
    });

    terminalProcess.on('close', (code) => {
        if (code === 0) {
            console.log(`Terminal (${terminal}) startad framgångsrikt.`);
        } else {
            console.warn(`Terminalprocessen avslutades med kod ${code}`);
        }
    });
}








function runInTerminalWindow_Mac( shellCommand){
        
     const { spawn } = require('child_process');

    // 1. Skapa AppleScript-kommandot.
    // JSON.stringify(sshCommand) ser till att hela SSH-strängen skickas korrekt till Terminal.app.
    const appleScript = `tell application "Terminal" to do script ${JSON.stringify(shellCommand)}`;
    
    // 2. Kör kommandot och aktivera Terminal.app (för att få fönstret längst fram)
    terminalProcess = spawn('osascript', [
        '-e', appleScript,
        '-e', 'tell application "Terminal" to activate'
    ]);

    // Log
    terminalProcess.on('error', (error) => {
        console.error(`Error launching Terminal: ${error.message}`);
    });
    
    terminalProcess.on('close', (code) => {
        if (code === 0) {
            console.log('Terminal launched and SSH session started in target directory');
        } else {
            console.error(`Terminal launch exited with code ${code}`);
        }
    }); 
    
}
function runInTerminalWindow_Linux( command){
        
     const { spawn } = require('child_process');

    //
    // Set terminal command (assume command is run with -e flag)
    //
    
    let terminalCommand = `gnome-terminal -- bash -c '${command}' `;  // Default
    
    if ( state.tools.terminal.trim() !== '' ) {
        terminalCommand = `${state.tools.terminal} -e bash -c '${command}' `;
    }


    if (isGnome()) {
        terminalCommand = `gnome-terminal -- bash -c '${command}' `;  // -e is depreciated  
    } else if (isXterm()) {
        terminalCommand = `xterm -e  bash -c '${command}' `;
    } else if (isXtermEmulator()) {
        terminalCommand = `x-terminal-emulator -e  bash -c '${command}' `;
    }
    

   // Execute command 
    terminalProcess = spawn(terminalCommand);

 
    // Log
    terminalProcess.on('error', (error) => {
        console.error(`Error launching Terminal: ${error.message}`);
    });
    
    terminalProcess.on('close', (code) => {
        if (code === 0) {
            console.log('Terminal launched and SSH session started in target directory');
        } else {
            console.error(`Terminal launch exited with code ${code}`);
        }
    }); 
    
    
    //
    // Internal functions 
    //
    function isGnome(){
          try {
            child_process.execSync('which gnome-terminal')
            return true
          } catch(e) {
            return false
          }
    }                
    function isXterm(){
          try {
            child_process.execSync('which xterm')
            return true
          } catch(e) {
            return false
          }
    }                
    function isXtermEmulator(){
          try {
            child_process.execSync('which x-terminal-emulator')
            return true
          } catch(e) {
            return false
          }
    }     
    
}
