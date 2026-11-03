/**
 * run_ui_tests.js - Interactive & Automated UI Test Runner for Pragma-git
 *
 * Usage:
 *   node automated-tests/ui/run_ui_tests.js [options]
 *
 * Options:
 *   --scenario=<file>    Run a specific YAML scenario (default: ssh_clone_repo.yaml)
 *   --step, -i           Step-by-step interactive mode (pauses and prompts with verification instructions)
 *   --keep-artifacts     Keep test directories and cloned repos after test finishes
 *   --port=<num>         CDP remote debugging port (default: 9333, never 9222 to prevent dev collisions)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const CDPClient = require('./cdp_client');
const UIFixtures = require('./ui_fixtures');

// Parse CLI flags
function parseArgs(customArgs) {
    const rawArgs = customArgs || process.argv.slice(2);
    const isStepMode = rawArgs.includes('--step') || rawArgs.includes('-i');
    const keepArtifacts = rawArgs.includes('--keep-artifacts');
    const scenarioFlag = rawArgs.find(a => a.startsWith('--scenario='));
    const scenarioFile = scenarioFlag ? scenarioFlag.split('=')[1] : null;
    const portFlag = rawArgs.find(a => a.startsWith('--port='));
    const cdpPort = portFlag ? parseInt(portFlag.split('=')[1], 10) : 9333;
    return { isStepMode, keepArtifacts, scenarioFile, cdpPort };
}

let userPromptInterface = null;
let userPromptIterator = null;

function bringTerminalToFront() {
    if (process.platform === 'darwin') {
        try {
            const termApp = process.env.TERM_PROGRAM;
            if (termApp === 'Apple_Terminal') {
                execSync('osascript -e \'tell application "Terminal" to activate\'', { stdio: 'ignore' });
            } else if (termApp === 'iTerm.app') {
                execSync('osascript -e \'tell application "iTerm" to activate\'', { stdio: 'ignore' });
            } else {
                // Fallback: activate whichever terminal or IDE process is running
                execSync(`osascript -e '
                    tell application "System Events"
                        repeat with p in (every process)
                            if name of p is in {"Terminal", "iTerm2", "Code", "kitty", "alacritty", "wezterm-gui"} then
                                set frontmost of p to true
                                exit repeat
                            end if
                        end repeat
                    end tell
                '`, { stdio: 'ignore' });
            }
        } catch (_) {}
    }
}

function getUserPromptIterator() {
    if (!userPromptInterface) {
        userPromptInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });
        userPromptIterator = userPromptInterface[Symbol.asyncIterator]();
    }
    return userPromptIterator;
}

async function askUser(promptText) {
    bringTerminalToFront();
    process.stdout.write(promptText);
    const it = getUserPromptIterator();
    const { value } = await it.next();
    bringTerminalToFront();
    return value;
}

function closeUserPrompt() {
    if (userPromptInterface) {
        userPromptInterface.close();
        userPromptInterface = null;
        userPromptIterator = null;
    }
}

function printStepHeader(stepNum, totalSteps, title) {
    console.log('\n----------------------------------------------------------------------');
    console.log(`STEP [${stepNum}/${totalSteps}]: ${title}`);
}

function printStepVerification(verifyInstruction) {
    if (!verifyInstruction) return;
    console.log('    \x1b[33mWHAT TO VERIFY MANUALLY:\x1b[0m');
    verifyInstruction.split('\n').forEach(line => {
        console.log(`        \x1b[33m•\x1b[0m ${line}`);
    });
}

async function runUiScenario(scenarioNameOrFile, customArgs) {
    const { isStepMode, keepArtifacts, cdpPort } = parseArgs(customArgs);
    let targetFile = scenarioNameOrFile;
    if (!targetFile) {
        const parsed = parseArgs(customArgs);
        targetFile = parsed.scenarioFile || 'test_01_ssh_clone_repo.yaml';
    }
    if (!targetFile.endsWith('.yaml') && !targetFile.endsWith('.yml')) {
        targetFile += '.yaml';
    }

    const scenarioPath = path.resolve(__dirname, '../scenarios', targetFile);
    if (!fs.existsSync(scenarioPath)) {
        console.error(`\x1b[31mScenario file not found: ${scenarioPath}\x1b[0m`);
        process.exit(1);
    }

    const doc = yaml.load(fs.readFileSync(scenarioPath, 'utf8'));
    console.log(`\n\x1b[35m=== Starting UI Test: ${doc.name} ===\x1b[0m`);
    if (doc.description) {
        console.log(`\x1b[90m${doc.description}\x1b[0m`);
    }
    console.log(`Interactive mode (--step): ${isStepMode ? '\x1b[32mENABLED\x1b[0m' : 'DISABLED'}`);

    const fixtures = new UIFixtures();
    let currentCDP = null;

    const cleanup = () => {
        closeUserPrompt();
        if (currentCDP) currentCDP.close();
        fixtures.teardown(keepArtifacts);
    };

    process.on('SIGINT', () => {
        console.log('\n\x1b[31mInterrupted by user. Cleaning up...\x1b[0m');
        cleanup();
        process.exit(1);
    });

    try {
        console.log('\n[Fixtures] Setting up ephemeral OpenSSH server & sample git repo...');
        const env = await fixtures.setup();
        console.log(`[Fixtures] Test SSH Server running on 127.0.0.1:${env.sshdPort}`);
        console.log(`[Fixtures] Remote bare repo: ${env.originRepoPath}`);

        console.log(`[Fixtures] Launching NW.js with test profile on CDP port ${cdpPort}...`);
        fixtures.launchNW(cdpPort);

        // Map template variables
        const resolveTemplate = (str) => {
            if (typeof str !== 'string') return str;
            return str
                .replace(/\$\{TEST_SSHD_PORT\}/g, env.sshdPort)
                .replace(/\$\{USER\}/g, env.user)
                .replace(/\$\{ORIGIN_REPO_PATH\}/g, env.originRepoPath)
                .replace(/\$\{TARGET_CLONE_PATH\}/g, env.targetClonePath)
                .replace(/\$\{CLIENT_KEY\}/g, env.clientKey)
                .replace(/\$\{CLIENT_KEY_PUB\}/g, env.clientKeyPub);
        };

        const steps = doc.steps || [];
        const interactiveStepCount = steps.filter(s => s.action !== 'connect_window').length;
        let stepCounter = 0;
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const isConnectionStep = (step.action === 'connect_window');
            const stepTitle = step.name || step.action;
            const verify = step.verify ? resolveTemplate(step.verify) : null;

            if (!isConnectionStep) {
                stepCounter++;
                if (isStepMode) {
                    printStepHeader(stepCounter, interactiveStepCount, stepTitle);
                    await askUser('    \x1b[32m[Press ENTER to run]\x1b[0m ');
                } else {
                    console.log(`\nSTEP [${stepCounter}/${interactiveStepCount}]: ${stepTitle}`);
                }
            } else {
                console.log(`\n    --> Connecting to window: "${step.target || '*'}"`);
            }

            switch (step.action) {
                case 'connect_window': {
                    const target = resolveTemplate(step.target || '*');
                    let client = null;
                    try {
                        client = await CDPClient.connectToTarget(target, cdpPort);
                        console.log(`    \x1b[32m[PASS]\x1b[0m Connected to window "${target}" on port ${cdpPort}`);
                    } catch (err) {
                        console.error(`    \x1b[31m[FAIL]\x1b[0m Failed to connect to window "${target}" on port ${cdpPort}: ${err.message}`);
                        throw err;
                    }

                    // HARD SAFETY CHECK: Ensure the connected instance is never operating on the user's real ~/.Pragma-git
                    try {
                        const connectedSettingsFile = await client.eval('settingsFile');
                        const realSettingsFile = path.join(os.homedir(), '.Pragma-git', 'settings.json');
                        if (connectedSettingsFile && path.resolve(connectedSettingsFile) === path.resolve(realSettingsFile)) {
                            console.error(`\n\x1b[41;37m CRITICAL SAFETY ABORT \x1b[0m`);
                            console.error(`Target window is using the REAL user settings file: ${connectedSettingsFile}`);
                            console.error(`Aborting test immediately to protect developer configuration!`);
                            cleanup();
                            process.exit(1);
                        }
                    } catch (e) {
                        // Some windows (popups or non-app pages) may not have settingsFile defined
                    }

                    if (currentCDP) currentCDP.close();
                    currentCDP = client;
                    break;
                }
                case 'eval': {
                    const code = resolveTemplate(step.code);
                    await currentCDP.eval(code);
                    break;
                }
                case 'click_if_present': {
                    const selector = resolveTemplate(step.selector);
                    const timeout = step.timeout || 1500;
                    try {
                        await currentCDP.click(selector, timeout);
                        console.log(`    Dismissed dialog button: ${selector}`);
                    } catch (e) {
                        // Dialog was not open or already dismissed, continue
                    }
                    break;
                }
                case 'click': {
                    const selector = resolveTemplate(step.selector);
                    console.log(`    Clicking: ${selector}`);
                    await currentCDP.click(selector, step.timeout || 10000);
                    break;
                }
                case 'set_value': {
                    const selector = resolveTemplate(step.selector);
                    const value = resolveTemplate(step.value);
                    console.log(`    Setting "${selector}" = "${value}"`);
                    await currentCDP.setValue(selector, value, step.timeout || 10000);
                    break;
                }
                case 'fill': {
                    for (const [sel, val] of Object.entries(step.fields)) {
                        const resolvedSel = resolveTemplate(sel);
                        const resolvedVal = resolveTemplate(val);
                        console.log(`    Filling "${resolvedSel}" = "${resolvedVal}"`);
                        await currentCDP.setValue(resolvedSel, resolvedVal, step.timeout || 10000);
                    }
                    break;
                }
                case 'wait_for_selector': {
                    const selector = resolveTemplate(step.selector);
                    console.log(`    Waiting for selector "${selector}"...`);
                    await currentCDP.waitForSelector(selector, step.timeout || 15000);
                    break;
                }
                case 'wait_for_text': {
                    const selector = resolveTemplate(step.selector);
                    const text = resolveTemplate(step.text);
                    console.log(`    Waiting for "${selector}" to contain "${text}"...`);
                    await currentCDP.waitForText(selector, text, step.timeout || 15000);
                    break;
                }
                case 'wait': {
                    const ms = step.ms || 1000;
                    console.log(`    Waiting ${ms}ms...`);
                    await new Promise(r => setTimeout(r, ms));
                    break;
                }
                case 'inject_key': {
                    console.log('    Injecting public key into test server authorized_keys...');
                    fixtures.injectKeyToServer();
                    break;
                }
                case 'assert_text': {
                    const selector = resolveTemplate(step.selector);
                    const expected = resolveTemplate(step.expected);
                    const actual = await currentCDP.getText(selector);
                    if (!actual.includes(expected)) {
                        throw new Error(`Assertion failed: expected "${expected}" in "${selector}", but got: "${actual}"`);
                    }
                    console.log(`    \x1b[32m✓ Assertion passed:\x1b[0m "${selector}" contains "${expected}"`);
                    break;
                }
                default:
                    console.warn(`    Unknown step action: ${step.action}`);
            }

            if (isStepMode && verify) {
                printStepVerification(verify);
            }
        }

        console.log('\n\x1b[32m======================================================================');
        console.log('       ALL STEPS IN SCENARIO COMPLETED SUCCESSFULLY! [PASS]');
        console.log('======================================================================\x1b[0m');
        cleanup();
        return true;

    } catch (err) {
        console.error('\n\x1b[31m======================================================================');
        console.error('       TEST SCENARIO FAILED!');
        console.error('======================================================================\x1b[0m');
        console.error(err);
        cleanup();
        process.exit(1);
    }
}

if (require.main === module) {
    runUiScenario();
}

module.exports = { runUiScenario };
