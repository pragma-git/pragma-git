import nwbuild from "../../node_modules/nw-builder/src/index.js";
import { readFile } from 'node:fs/promises';

try{
// =========================================================================================================
// Initialize
// =========================================================================================================
  // Fixed constants
  const SOURCE = '/Users/jan/Documents/Projects/Pragma-git/dist/temp_pragma_git';
  const OUTPUT = '/Users/jan/Documents/Projects/Pragma-git/dist';
  const COPYRIGHT = "Copyright (c) 2024 Jan Axelsson";

  // Derived constants 
  const manifestData = JSON.parse(await readFile( `${SOURCE}/package.json`, 'utf8'));
  const VERSION = manifestData.version;       // Pragma-git version
  const NW_VERSION = manifestData.nwVersion;  // NW version
  
  // Others
  let options;

// =========================================================================================================
// General
// =========================================================================================================
  let generalOptions = { 
    mode: "build",
    flavor: "sdk",
    platform: "DUMMY",  // osx/win/linux
    version: NW_VERSION,// nwjs version
    arch: "DUMMY",      // x86/arm64
    srcDir: SOURCE,     // SOURCE from above
    cacheDir: "/Users/jan/Downloads/caches-nwjs",
    outDir: "DUMMY",    // Set for each build
    glob: "false",
    logLevel: "info",
    app: {}
  };

// =========================================================================================================
// MacOS x64 + arm64
// =========================================================================================================
  let macOptions = {
      name: "Pragma-git",
      /* File path of icon from where it is copied. */
      icon: `${SOURCE}/images/icon.png`,
      LSApplicationCategoryType: "public.app-category.developer-tools",
      CFBundleIdentifier: "io.github.pragma-git", 
      CFBundleName: "Pragma-git",
      CFBundleDisplayName: "Pragma-git",
      CFBundleSpokenName: "Pragma-git",
      CFBundleVersion: VERSION,
      CFBundleShortVersionString: VERSION,
      NSHumanReadableCopyright: COPYRIGHT,
      NSLocalNetworkUsageDescription: "Requires access to network to work with git remotely",
    }
  
  // osx arm64
  options = {  ...generalOptions, ...{ platform:'osx', arch: 'arm64', app: macOptions } };
  options.outDir = `${OUTPUT}/Pragma-git-${VERSION}-mac-${options.arch}`; // Pragma-git-0.0.0-mac-arm64
  
  console.log('\n=========================================================================================================')
  console.log(`Building ${options.platform} ${options.arch} => ${options.outDir}`)
  console.log('=========================================================================================================')
  console.log(options)
  await nwbuild(options);  


  // osx x64
  options = {  ...generalOptions, ...{ platform:'osx', arch: 'x64', app: macOptions } };
  options.outDir = `${OUTPUT}/Pragma-git-${VERSION}-mac-${options.arch}`; // Pragma-git-0.0.0-mac-arm64
  
  console.log('\n=========================================================================================================')
  console.log(`Building ${options.platform} ${options.arch} => ${options.outDir}`)
  console.log('=========================================================================================================')
  console.log(options)
  await nwbuild(options);  


// =========================================================================================================
// Win x64 
// =========================================================================================================
  let winOptions =  {
    name: 'Pragma-git',
    /* File path of icon from where it is copied. */
    icon: `${SOURCE}/images/icon.ico`,
    version: VERSION,
    comments: 'Pragma-git, the pragmatic git client',
    company: 'Jan Axelsson',
    fileDescription: 'Pragma-git, the pragmatic git client',
    fileVersion: VERSION,
    internalName: 'Pragma-git',
    legalCopyright: COPYRIGHT,
    originalFilename: 'Pragma-git',
    productName: 'Pragma-git',
    productVersion: VERSION,
  };

  // win x64
  options = {  ...generalOptions, ...{ platform:'win', arch: 'x64', app: winOptions } };
  options.outDir = `${OUTPUT}/Pragma-git-${VERSION}-${options.platform}-${options.arch}`; // Pragma-git-0.0.0-win-x64
  
  console.log('\n=========================================================================================================')
  console.log(`Building ${options.platform} ${options.arch} => ${options.outDir}`)
  console.log('=========================================================================================================')
  console.log(options)
  await nwbuild(options);  
  
// =========================================================================================================
// Linux x64 
// =========================================================================================================

  let linuxOptions =  {
    name: 'Pragma-git',
    genericName: 'Pragma-git',
    noDisplay: false,
    comment: 'Pragma-git, the pragmatic git client',
    /* File path of icon from where it is copied. */
    icon: `${SOURCE}/images/icon.png`,
    hidden: false,
    // TODO: test in different Linux desktop environments
    // onlyShowIn: [],
    // notShowIn: [],
    dBusActivatable: true,
    // TODO: test in Linux environment
    // tryExec: '/path/to/exe?'
    exec: './tests/fixtures/out/linux/Demo',
  }

  // linux x64
  options = {  ...generalOptions, ...{ platform:'linux', arch: 'x64', app: linuxOptions } };
  options.outDir = `${OUTPUT}/Pragma-git-${VERSION}-${options.platform}-${options.arch}`; // Pragma-git-0.0.0-linux-x64
  
  console.log('\n=========================================================================================================')
  console.log(`Building ${options.platform} ${options.arch} => ${options.outDir}`)
  console.log('=========================================================================================================')
  console.log(options)
  await nwbuild(options);  

// =========================================================================================================
// Finish up
// =========================================================================================================
}catch (err){
  console.warn(err);
  process.exit(1);
}
process.exit(0);
