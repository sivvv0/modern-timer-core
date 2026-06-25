class TimerRateLimit {
    constructor(maxRequests = 100, windowMs = 60000, logger) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.logger = logger;
        this.requests = new Map();
        this.windowStart = Date.now();
        this.totalRequests = 0;
        this.rejectedRequests = 0;
    }

    /**
     * Check if request is allowed
     */
    check(key = 'default', count = 1) {
        this._cleanup();

        const now = Date.now();
        const requestKey = key;

        if (!this.requests.has(requestKey)) {
            this.requests.set(requestKey, []);
        }

        const timestamps = this.requests.get(requestKey);
        const recentRequests = timestamps.filter(t => t > now - this.windowMs);

        if (recentRequests.length + count > this.maxRequests) {
            this.rejectedRequests++;
            this.logger.warn(`Rate limit exceeded for ${requestKey}`);
            return false;
        }

        // Add requests
        for (let i = 0; i < count; i++) {
            timestamps.push(now);
        }

        this.totalRequests++;
        return true;
    }

    /**
     * Get remaining requests
     */
    getRemaining(key = 'default') {
        this._cleanup();
        
        if (!this.requests.has(key)) {
            return this.maxRequests;
        }

        const timestamps = this.requests.get(key);
        const now = Date.now();
        const recentRequests = timestamps.filter(t => t > now - this.windowMs);
        
        return Math.max(0, this.maxRequests - recentRequests.length);
    }

    /**
     * Reset rate limit for a key
     */
    reset(key = 'default') {
        if (this.requests.has(key)) {
            this.requests.delete(key);
            this.logger.debug(`Rate limit reset for ${key}`);
            return true;
        }
        return false;
    }

    /**
     * Reset all rate limits
     */
    resetAll() {
        const count = this.requests.size;
        this.requests.clear();
        this.totalRequests = 0;
        this.rejectedRequests = 0;
        this.windowStart = Date.now();
        this.logger.info(`Reset all rate limits (${count} keys)`);
        return count;
    }

    /**
     * Get rate limit stats
     */
    getStats() {
        const now = Date.now();
        const stats = {
            totalRequests: this.totalRequests,
            rejectedRequests: this.rejectedRequests,
            activeKeys: this.requests.size,
            windowMs: this.windowMs,
            maxRequests: this.maxRequests,
            keys: {}
        };

        for (const [key, timestamps] of this.requests) {
            const recent = timestamps.filter(t => t > now - this.windowMs);
            stats.keys[key] = {
                total: timestamps.length,
                recent: recent.length,
                remaining: Math.max(0, this.maxRequests - recent.length)
            };
        }

        return stats;
    }

    /**
     * Set custom rate limit for a key
     */
    setLimit(key, maxRequests) {
        // Store custom limit for this key
        if (!this._customLimits) {
            this._customLimits = new Map();
        }
        this._customLimits.set(key, maxRequests);
        this.logger.debug(`Custom rate limit set for ${key}: ${maxRequests}`);
        return this;
    }

    /**
     * Get max requests for a key
     */
    _getMaxRequests(key) {
        if (this._customLimits && this._customLimits.has(key)) {
            return this._customLimits.get(key);
        }
        return this.maxRequests;
    }

    /**
     * Check with custom max requests
     */
    checkWithLimit(key, count = 1, maxRequests) {
        this._cleanup();

        const limit = maxRequests || this._getMaxRequests(key);
        const now = Date.now();

        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }

        const timestamps = this.requests.get(key);
        const recentRequests = timestamps.filter(t => t > now - this.windowMs);

        if (recentRequests.length + count > limit) {
            this.rejectedRequests++;
            this.logger.warn(`Rate limit exceeded for ${key} (limit: ${limit})`);
            return false;
        }

        for (let i = 0; i < count; i++) {
            timestamps.push(now);
        }

        this.totalRequests++;
        return true;
    }

    /**
     * Cleanup old timestamps
     */
    _cleanup() {
        const now = Date.now();
        const cutoff = now - this.windowMs;

        for (const [key, timestamps] of this.requests) {
            const filtered = timestamps.filter(t => t > cutoff);
            if (filtered.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, filtered);
            }
        }
    }

    /**
     * Get time until reset
     */
    getTimeUntilReset(key = 'default') {
        if (!this.requests.has(key)) {
            return 0;
        }

        const timestamps = this.requests.get(key);
        if (timestamps.length === 0) {
            return 0;
        }

        const oldest = Math.min(...timestamps);
        const resetTime = oldest + this.windowMs;
        const now = Date.now();
        
        return Math.max(0, resetTime - now);
    }
}

module.exports = TimerRateLimit;
