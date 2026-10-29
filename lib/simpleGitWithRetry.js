const simpleGitOriginal = require('simple-git');

/**
 * Simple wrapper for simple-git that automatically retries failed operations
 * This is especially useful for index.lock errors that happen when git is busy
 * 
 * Usage: 
 *     const simpleGit = require('./simpleGitWithRetry');
 *     const git = simpleGit('./my-repo', gitOptions, { maxRetries: 3 });  // Example with default retryOptions, but modifying one of them
 *     await git.add('.'); // Will retry automatically on index.lock errors  
 * 
 * Note: 
 *     At this point, app.js do not set retryOptions
 */
    function simpleGitWithRetry( baseDir, gitOptions = {}, retryOptions = {}) {
        
            // Default settings - you can change these defaults if you want
            const config = {
                    // How many times to retry before giving up
                    maxRetries: retryOptions.maxRetries || 3,
                    
                    // Base delay between retries (in milliseconds)
                    // Each retry waits longer: 100ms, 200ms, 300ms, etc.
                    delay: retryOptions.delay || 100,
                    
                    // Which error messages should trigger a retry
                    // 'index.lock' is the main one we care about
                    retryPatterns: retryOptions.retryPatterns || [
                        'index.lock',
                        'another git process seems to be running'
                    ]
            };

        
            // Create the original simple-git instance, forwarding gitOptions
            const gitInstance = simpleGitOriginal(baseDir, gitOptions);
            
            // Wrap it with our retry logic
            return wrapWithRetryLogic(gitInstance, config);
    }

/**
 * Wraps a simple-git instance in a Proxy so that:
 *    - Commands that talk to git are automatically retried on errors
 *    - Chainable config methods (env, addConfig, cwd, etc.) keep working
 */
    function wrapWithRetryLogic(gitInstance, config) {
    
        /**
         * These simple-git methods do NOT run git commands.
         * They simply update internal settings and return `this`
         * so that you can do:
         *
         *     git.env(...).raw(...)
         *
         * These must stay synchronous, or chaining breaks.
         */
        const CHAINABLE_METHODS = new Set([
            'env',
            'addConfig',
            'cwd',
            'outputHandler',
            'customBinary'
        ]);
    
        // We need a reference to the proxy itself for chaining
        let proxy = null;
    
        /**
         * Create a JavaScript Proxy.
         *
         * A Proxy lets us intercept property access:
         *     git.someMethod
         *
         * Before the real method runs, we get a chance to wrap it,
         * modify arguments, add retry logic, etc.
         */
        proxy = new Proxy(gitInstance, {
            /**
             * The `get` trap runs EVERY TIME someone does:
             *
             *        git.methodName
             *
             * We can return the original method, OR wrap it,
             * OR replace it entirely.
             */
            get(obj, methodName) {
                const original = obj[methodName];
    
                // If it's not a function (e.g., a property), return it as-is
                if (typeof original !== "function") {
                    return original;
                }
    
                /**
                 * PART 1: Handle synchronous chainable methods
                 *
                 * These methods (like env()) return `this` normally.
                 * If we turned them into async functions, they’d return Promises
                 * and your chain would break.
                 *
                 * So here we keep them 100% synchronous.
                 */
                if (CHAINABLE_METHODS.has(methodName)) {
                    return function (...args) {
                        // Call the real simple-git method
                        original.apply(obj, args);
    
                        // Return the Proxy instead of the raw git instance
                        // so chaining continues through *our* wrapper
                        return proxy;
                    };
                }
    
                /**
                 * PART 2: Wrap async git commands with retry logic
                 *
                 * Most methods that run git return Promises,
                 * so this wrapper must be async.
                 */
                return async function (...args) {
                    let lastError = null;
    
                    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
                        try {
                            // Try running the real git method
                            const result = await original.apply(obj, args);

                            // If this succeeded on retry attempt
                            if (attempt > 1) {
                                global.log?.(`✓ Git ${methodName} succeeded on attempt ${attempt}`);
                            }
    
                            /**
                             * some simple-git methods return the instance for chaining,
                             * we must preserve that behavior
                             */
                            if (result === obj) {
                                return proxy;
                            }
    
                            return result; // success!
                        } catch (error) {
                            lastError = error;
    
                            const shouldRetry = shouldRetryOperation(error, config.retryPatterns);
    
                            // Retry if:
                            //    - the error is retryable
                            //    - we have remaining attempts
                            if (shouldRetry && attempt < config.maxRetries) {

                                const delay = config.delay * attempt;

                                global.log?.(`↻ Git ${methodName} failed (attempt ${attempt}/${config.maxRetries}): ${getShortError(error)}`);
                                global.log?.(`   Waiting ${delay}ms before retry...`);

                                await wait(delay);
                                continue;
                            }
    
                            break; // no more retries
                        }
                    }

                    // Final failure after all attempts
                    global.err?.(`✗ Git ${methodName} failed after ${config.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    
                    // Throw the last error after all attempts
                    throw lastError;
                };
            }
        });
    
        // Return the Proxy as the wrapped git instance
        return proxy;
    }
    
/**
 * Checks if an error message matches any of our retry patterns
 */
    function shouldRetryOperation(error, retryPatterns) {
        if (!error) return false;
        
        const errorMessage = error.message || error.toString();
        
        // Check if the error contains any of our retry patterns
        for (const pattern of retryPatterns) {
            if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
                return true;
            }
        }
        
        return false;
    }

/**
 * Gets a short version of the error message for logging
 */
        function getShortError(error) {
            if (!error) return 'Unknown error';
            
            const fullMessage = error.message || error.toString();
            
            // Take first line or first 80 characters
            const firstLine = fullMessage.split('\n')[0];
            if (firstLine.length <= 80) return firstLine;
            
            return firstLine.substring(0, 80) + '...';
        }
    
    /**
     * Waits for specified milliseconds
     */
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Export the function
    module.exports = simpleGitWithRetry;
    
    // For ES6 import compatibility
    module.exports.default = simpleGitWithRetry;
