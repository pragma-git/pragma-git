// test_setup.js - Shared terminal colors and assertion helpers for Node.js tests in Pragma-git

const NO_COLOR = Boolean(process.env.NO_COLOR);

const BOLD = NO_COLOR ? '' : '\x1b[1m';
const NORMAL = NO_COLOR ? '' : '\x1b[0m';
const GREEN = NO_COLOR ? '' : '\x1b[32m';
const RED = NO_COLOR ? '' : '\x1b[31m';
const CYAN = NO_COLOR ? '' : '\x1b[36m';
const YELLOW = NO_COLOR ? '' : '\x1b[33m';
const BLUE = NO_COLOR ? '' : '\x1b[34m';
const MAGENTA = NO_COLOR ? '' : '\x1b[35m';

let passCount = 0;
let failCount = 0;

function assertPass(desc) {
    console.log(`  ${GREEN}[PASS]${NORMAL} ${desc}`);
    passCount++;
}

function assertFail(desc, details) {
    console.log(`  ${RED}[FAIL]${NORMAL} ${desc}`);
    if (details) console.log(`         ${details}`);
    failCount++;
}

function getPassCount() {
    return passCount;
}

function getFailCount() {
    return failCount;
}

function printSuiteResult() {
    const total = passCount + failCount;
    const failedStr = failCount > 0 ? `${RED}${failCount} failed${NORMAL}` : '0 failed';
    console.log(`Suite Result: ${GREEN}${passCount}/${total} passed${NORMAL}, ${failedStr}`);
    process.exit(failCount === 0 ? 0 : 1);
}

module.exports = {
    BOLD,
    NORMAL,
    GREEN,
    RED,
    CYAN,
    YELLOW,
    BLUE,
    MAGENTA,
    assertPass,
    assertFail,
    getPassCount,
    getFailCount,
    printSuiteResult
};
