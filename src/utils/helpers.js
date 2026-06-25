/**
 * Generate a unique ID
 */
function generateId(prefix = 'timer') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    return `${prefix}_${timestamp}_${random}`;
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
    return `${Math.floor(ms / 86400000)}d ${Math.floor((ms % 86400000) / 3600000)}h`;
}

/**
 * Deep clone an object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Function) return obj;
    
    const cloned = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function retry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                await sleep(delay);
            }
        }
    }
    throw lastError;
}

/**
 * Throttle a function
 */
function throttle(fn, delay) {
    let lastCall = 0;
    let timeout = null;
    
    return function throttled(...args) {
        const now = Date.now();
        const remaining = delay - (now - lastCall);
        
        if (remaining <= 0) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            lastCall = now;
            return fn.apply(this, args);
        }
        
        if (!timeout) {
            timeout = setTimeout(() => {
                lastCall = Date.now();
                timeout = null;
                fn.apply(this, args);
            }, remaining);
        }
    };
}

/**
 * Debounce a function
 */
function debounce(fn, delay) {
    let timeout = null;
    
    return function debounced(...args) {
        if (timeout) {
            clearTimeout(timeout);
        }
        
        timeout = setTimeout(() => {
            fn.apply(this, args);
            timeout = null;
        }, delay);
    };
}

/**
 * Get memory usage
 */
function getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
        rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(usage.external / 1024 / 1024) + 'MB'
    };
}

/**
 * Safe stringify for objects with circular references
 */
function safeStringify(obj, indent = 2) {
    const cache = new Set();
    const result = JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
                return '[Circular]';
            }
            cache.add(value);
        }
        return value;
    }, indent);
    cache.clear();
    return result;
}

module.exports = {
    generateId,
    formatDuration,
    deepClone,
    sleep,
    retry,
    throttle,
    debounce,
    getMemoryUsage,
    safeStringify
};
