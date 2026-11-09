/**
 * cdp_client.js - Minimal Chrome DevTools Protocol (CDP) client over WebSocket
 * Connects directly to NW.js or Chrome with --remote-debugging-port=<port>
 */

const http = require('http');
const WebSocket = require('ws');

class CDPClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.msgId = 1;
        this.pendingRequests = new Map();
        this.eventListeners = new Map();
    }

    static async getTargets(port = 9222) {
        return new Promise((resolve, reject) => {
            const req = http.get(`http://127.0.0.1:${port}/json`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
        });
    }

    static async connectToTarget(titleOrUrlPattern, port = 9222, maxRetries = 60) {
        let lastTargets = [];
        for (let i = 0; i < maxRetries; i++) {
            try {
                const targets = await CDPClient.getTargets(port);
                lastTargets = targets;
                const target = targets.find(t => 
                    (t.title && t.title.includes(titleOrUrlPattern)) || 
                    (t.url && t.url.includes(titleOrUrlPattern)) ||
                    (titleOrUrlPattern === '*' && t.type === 'page')
                );
                if (target && target.webSocketDebuggerUrl) {
                    const client = new CDPClient(target.webSocketDebuggerUrl);
                    await client.connect();
                    return client;
                }
            } catch (err) {
                // Wait for NW.js to start
            }
            await new Promise(r => setTimeout(r, 500));
        }
        throw new Error(`Timeout waiting for target matching: "${titleOrUrlPattern}" on port ${port}. Discovered targets: ${JSON.stringify(lastTargets)}`);
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.on('open', () => resolve());
            this.ws.on('error', reject);
            this.ws.on('message', (raw) => {
                try {
                    const msg = JSON.parse(raw);
                    if (msg.id && this.pendingRequests.has(msg.id)) {
                        const { resolve, reject } = this.pendingRequests.get(msg.id);
                        this.pendingRequests.delete(msg.id);
                        if (msg.error) {
                            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                        } else {
                            resolve(msg.result);
                        }
                    } else if (msg.method) {
                        const listeners = this.eventListeners.get(msg.method) || [];
                        listeners.forEach(cb => cb(msg.params));
                    }
                } catch (e) {
                    console.error('CDP parse error:', e);
                }
            });
        });
    }

    async send(method, params = {}) {
        const id = this.msgId++;
        const payload = JSON.stringify({ id, method, params });
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.ws.send(payload, (err) => {
                if (err) {
                    this.pendingRequests.delete(id);
                    reject(err);
                }
            });
        });
    }

    async eval(expression) {
        const res = await this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            const desc = res.exceptionDetails.exception ? (res.exceptionDetails.exception.description || res.exceptionDetails.exception.value) : '';
            throw new Error(`Eval exception: ${res.exceptionDetails.text || ''} ${desc}`);
        }
        return res.result ? res.result.value : undefined;
    }

    async click(selector, timeoutMs = 10000) {
        await this.waitForSelector(selector, timeoutMs);
        return this.eval(`(() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) throw new Error("Element not found: " + ${JSON.stringify(selector)});
            el.scrollIntoView({ block: "center", inline: "center" });
            el.click();
            return true;
        })()`);
    }

    async setValue(selector, value, timeoutMs = 10000) {
        await this.waitForSelector(selector, timeoutMs);
        return this.eval(`(() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) throw new Error("Element not found: " + ${JSON.stringify(selector)});
            el.scrollIntoView({ block: "center", inline: "center" });
            el.focus();
            el.value = ${JSON.stringify(value)};
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        })()`);
    }

    async getText(selector, timeoutMs = 10000) {
        await this.waitForSelector(selector, timeoutMs);
        return this.eval(`(() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return '';
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                return (el.value !== undefined && el.value !== null) ? el.value : '';
            }
            return el.innerText || el.textContent || el.value || '';
        })()`);
    }

    async isVisible(selector) {
        return this.eval(`(() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return false;
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        })()`);
    }

    async waitForSelector(selector, timeoutMs = 10000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const found = await this.eval(`!!document.querySelector(${JSON.stringify(selector)})`);
            if (found) return true;
            await new Promise(r => setTimeout(r, 100));
        }
        throw new Error(`Timeout waiting for selector: ${selector}`);
    }

    async waitForText(selector, expectedText, timeoutMs = 15000) {
        const start = Date.now();
        let lastText = '';
        while (Date.now() - start < timeoutMs) {
            lastText = await this.getText(selector, 1000).catch(() => '');
            if (lastText && lastText.includes(expectedText)) return true;
            await new Promise(r => setTimeout(r, 200));
        }
        throw new Error(`Timeout waiting for selector "${selector}" to contain "${expectedText}". Last actual content: "${lastText}"`);
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

module.exports = CDPClient;
