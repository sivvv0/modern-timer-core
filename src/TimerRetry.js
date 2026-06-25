class TimerRetry {
    constructor(maxRetries = 3, baseDelay = 1000, logger) {
        this.maxRetries = maxRetries;
        this.baseDelay = baseDelay;
        this.logger = logger;
        this.retryMap = new Map();
        this.backoffStrategies = {
            'linear': (attempt) => this.baseDelay * attempt,
            'exponential': (attempt) => this.baseDelay * Math.pow(2, attempt - 1),
            'fibonacci': (attempt) => this._fibonacci(attempt) * this.baseDelay,
            'fixed': () => this.baseDelay
        };
    }

    /**
     * Register a timer for retry
     */
    register(timerId, config = {}) {
        const {
            maxRetries = this.maxRetries,
            backoff = 'exponential',
            onRetry = null,
            onFail = null,
            onSuccess = null
        } = config;

        this.retryMap.set(timerId, {
            timerId,
            attempts: 0,
            maxRetries,
            backoff,
            onRetry,
            onFail,
            onSuccess,
            lastAttempt: null,
            nextAttempt: null
        });

        this.logger.debug(`Timer ${timerId} registered for retry`);
        return this;
    }

    /**
     * Execute with retry
     */
    async execute(timerId, fn, args = []) {
        const retryConfig = this.retryMap.get(timerId);
        if (!retryConfig) {
            throw new Error(`Timer ${timerId} not registered for retry`);
        }

        let attempt = 0;
        let lastError = null;

        while (attempt < retryConfig.maxRetries) {
            try {
                const result = await fn(...args);
                
                // Success
                if (retryConfig.onSuccess) {
                    await retryConfig.onSuccess(result, attempt);
                }
                
                this.retryMap.delete(timerId);
                return result;
            } catch (error) {
                lastError = error;
                attempt++;
                retryConfig.attempts = attempt;
                retryConfig.lastAttempt = Date.now();

                if (attempt < retryConfig.maxRetries) {
                    const delay = this._calculateDelay(retryConfig.backoff, attempt);
                    retryConfig.nextAttempt = Date.now() + delay;

                    if (retryConfig.onRetry) {
                        await retryConfig.onRetry(error, attempt, delay);
                    }

                    this.logger.warn(`Retry ${attempt}/${retryConfig.maxRetries} for timer ${timerId} in ${delay}ms`);
                    
                    await this._wait(delay);
                } else {
                    // All retries failed
                    if (retryConfig.onFail) {
                        await retryConfig.onFail(lastError);
                    }
                    
                    this.logger.error(`Timer ${timerId} failed after ${attempt} retries`);
                    this.retryMap.delete(timerId);
                    throw lastError;
                }
            }
        }
    }

    /**
     * Calculate delay using backoff strategy
     */
    _calculateDelay(strategy, attempt) {
        const fn = this.backoffStrategies[strategy] || this.backoffStrategies.exponential;
        return fn(attempt);
    }

    /**
     * Fibonacci sequence
     */
    _fibonacci(n) {
        if (n <= 1) return 1;
        let a = 0, b = 1;
        for (let i = 0; i < n; i++) {
            [a, b] = [b, a + b];
        }
        return a;
    }

    /**
     * Wait for specified delay
     */
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get retry status
     */
    getStatus(timerId) {
        return this.retryMap.get(timerId) || null;
    }

    /**
     * Cancel retry for a timer
     */
    cancel(timerId) {
        const deleted = this.retryMap.delete(timerId);
        if (deleted) {
            this.logger.info(`Retry cancelled for timer ${timerId}`);
        }
        return deleted;
    }

    /**
     * Get all retry statuses
     */
    getAllStatuses() {
        return Array.from(this.retryMap.values());
    }

    /**
     * Clear all retries
     */
    clearAll() {
        const count = this.retryMap.size;
        this.retryMap.clear();
        this.logger.info(`Cleared ${count} retry registrations`);
        return count;
    }

    /**
     * Set custom backoff strategy
     */
    setBackoffStrategy(name, fn) {
        if (typeof fn !== 'function') {
            throw new Error('Backoff strategy must be a function');
        }
        this.backoffStrategies[name] = fn;
        this.logger.info(`Custom backoff strategy "${name}" added`);
        return this;
    }
}

module.exports = TimerRetry;
