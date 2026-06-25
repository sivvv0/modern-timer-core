const TimerManager = require('./TimerManager');
const { validateDiscordVersion } = require('./utils/validators');
const Logger = require('./utils/logger');
const helpers = require('./utils/helpers');

class ModernTimerCore {
    constructor(client, options = {}) {
        if (!client) {
            throw new Error('Discord.js client is required');
        }

        // Validate Discord.js version
        this.discordVersion = validateDiscordVersion(client);

        this.client = client;
        this.options = {
            // Core options
            autoCleanup: true,
            cleanupInterval: 60000,
            maxTimers: 1000,
            
            // Feature options
            enableScheduler: true,
            enablePersistence: false,
            persistencePath: './timers.json',
            enableMetrics: true,
            metricsInterval: 60000,
            enableRetry: true,
            maxRetries: 3,
            retryDelay: 1000,
            enableGroups: true,
            enableRateLimiting: false,
            maxRateLimit: 100,
            rateLimitWindow: 60000,
            enableQueue: false,
            queueConcurrency: 5,
            enableWorkerPool: false,
            workerPoolSize: 4,
            enableHooks: true,
            enableLogging: true,
            logLevel: 'info',
            ...options
        };

        // Initialize logger
        this.logger = new Logger(this.options.logLevel);

        // Initialize timer manager
        this.manager = new TimerManager(this.options, this.logger);
        this.initialized = false;
        
        // Store version info
        this.version = require('../package.json').version;
        
        // Store helper methods
        this.helpers = helpers;
    }

    /**
     * Initialize the timer system
     */
    initialize() {
        if (this.initialized) return this;
        
        // Pass client and version to manager
        this.manager.setClient(this.client, this.discordVersion);
        
        // Initialize all components
        this.manager.initialize();
        
        this.initialized = true;
        this.logger.info(`ModernTimerCore v${this.version} initialized with Discord.js ${this.discordVersion}`);
        
        return this;
    }

    /**
     * Create a new timer with full options
     */
    createTimer(config) {
        if (!this.initialized) {
            this.initialize();
        }
        return this.manager.createTimer({
            ...config,
            version: this.discordVersion,
            client: this.client
        });
    }

    /**
     * Create a setInterval timer
     */
    createInterval(callback, delay, options = {}) {
        return this.createTimer({
            callback,
            delay,
            type: 'interval',
            ...options
        });
    }

    /**
     * Create a setTimeout timer
     */
    createTimeout(callback, delay, options = {}) {
        return this.createTimer({
            callback,
            delay,
            type: 'timeout',
            ...options
        });
    }

    /**
     * Create a setImmediate timer
     */
    createImmediate(callback, options = {}) {
        return this.createTimer({
            callback,
            type: 'immediate',
            ...options
        });
    }

    /**
     * Create a cron timer
     */
    createCron(callback, cronExpression, options = {}) {
        return this.createTimer({
            callback,
            cron: cronExpression,
            type: 'cron',
            ...options
        });
    }

    /**
     * Create a conditional timer
     */
    createConditional(callback, condition, options = {}) {
        return this.createTimer({
            callback,
            condition,
            type: 'conditional',
            ...options
        });
    }

    /**
     * Create a timer that runs once with retry logic
     */
    createReliableTimer(callback, delay, retryCount = 3, options = {}) {
        return this.createTimer({
            callback,
            delay,
            type: 'timeout',
            retry: true,
            retryCount,
            ...options
        });
    }

    /**
     * Create a debounced timer
     */
    createDebouncedTimer(callback, delay, options = {}) {
        return this.createTimer({
            callback,
            delay,
            type: 'timeout',
            debounce: delay,
            ...options
        });
    }

    /**
     * Create a throttled timer
     */
    createThrottledTimer(callback, delay, options = {}) {
        return this.createTimer({
            callback,
            delay,
            type: 'interval',
            throttle: delay,
            ...options
        });
    }

    /**
     * Clear a timer by ID
     */
    clearTimer(timerId) {
        return this.manager.clearTimer(timerId);
    }

    /**
     * Clear all timers in a group
     */
    clearGroup(groupName) {
        return this.manager.clearGroup(groupName);
    }

    /**
     * Clear all timers with specific tags
     */
    clearByTag(tag) {
        return this.manager.clearByTag(tag);
    }

    /**
     * Clear all timers
     */
    clearAllTimers() {
        return this.manager.clearAllTimers();
    }

    /**
     * Get all active timers
     */
    getAllTimers() {
        return this.manager.getAllTimers();
    }

    /**
     * Get timers by group
     */
    getTimersByGroup(groupName) {
        return this.manager.getTimersByGroup(groupName);
    }

    /**
     * Get timers by tag
     */
    getTimersByTag(tag) {
        return this.manager.getTimersByTag(tag);
    }

    /**
     * Get timer statistics
     */
    getStats() {
        return this.manager.getStats();
    }

    /**
     * Pause a timer
     */
    pauseTimer(timerId) {
        return this.manager.pauseTimer(timerId);
    }

    /**
     * Resume a timer
     */
    resumeTimer(timerId) {
        return this.manager.resumeTimer(timerId);
    }

    /**
     * Update timer configuration
     */
    updateTimer(timerId, config) {
        return this.manager.updateTimer(timerId, config);
    }

    /**
     * Get timer execution history
     */
    getTimerHistory(timerId) {
        return this.manager.getTimerHistory(timerId);
    }

    /**
     * Export all timers configuration
     */
    exportTimers() {
        return this.manager.exportTimers();
    }

    /**
     * Import timers configuration
     */
    importTimers(timersData) {
        return this.manager.importTimers(timersData);
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.manager.destroy();
        this.initialized = false;
        this.logger.info('ModernTimerCore destroyed');
    }
}

module.exports = ModernTimerCore;
module.exports.TimerManager = TimerManager;
module.exports.helpers = helpers;
