const EventEmitter = require('events');
const TimerScheduler = require('./TimerScheduler');
const TimerPersistence = require('./TimerPersistence');
const TimerMetrics = require('./TimerMetrics');
const TimerRetry = require('./TimerRetry');
const TimerHook = require('./TimerHook');
const TimerGroup = require('./TimerGroup');
const TimerRateLimit = require('./TimerRateLimit');
const TimerQueue = require('./TimerQueue');
const TimerWorkerPool = require('./TimerWorkerPool');

class TimerManager extends EventEmitter {
    constructor(options = {}, logger) {
        super();
        this.options = options;
        this.logger = logger;
        
        // Core data
        this.timers = new Map();
        this.timerIdCounter = 0;
        this.client = null;
        this.discordVersion = null;
        this.cleanupInterval = null;
        
        // History
        this.history = new Map();
        
        // Initialize components
        this.scheduler = this.options.enableScheduler ? new TimerScheduler(this) : null;
        this.persistence = this.options.enablePersistence ? 
            new TimerPersistence(this.options.persistencePath, this.logger) : null;
        this.metrics = this.options.enableMetrics ? 
            new TimerMetrics(this.options.metricsInterval, this.logger) : null;
        this.retry = this.options.enableRetry ? 
            new TimerRetry(this.options.maxRetries, this.options.retryDelay, this.logger) : null;
        this.hooks = this.options.enableHooks ? new TimerHook(this.logger) : null;
        this.groups = this.options.enableGroups ? new Map() : null;
        this.rateLimiter = this.options.enableRateLimiting ? 
            new TimerRateLimit(this.options.maxRateLimit, this.options.rateLimitWindow, this.logger) : null;
        this.queue = this.options.enableQueue ? 
            new TimerQueue(this.options.queueConcurrency, this.logger) : null;
        this.workerPool = this.options.enableWorkerPool ? 
            new TimerWorkerPool(this.options.workerPoolSize, this.logger) : null;

        // Stats
        this.stats = {
            totalCreated: 0,
            totalCleared: 0,
            totalExecuted: 0,
            totalErrors: 0,
            totalRetries: 0,
            totalFailed: 0,
            totalPaused: 0,
            totalResumed: 0,
            active: 0,
            paused: 0,
            intervals: 0,
            timeouts: 0,
            immediates: 0,
            cron: 0,
            conditional: 0,
            byGroup: new Map(),
            byPriority: new Map(),
            executionTime: [],
            memoryUsage: [],
            uptime: 0,
            startTime: Date.now()
        };

        this.isInitialized = false;
    }

    /**
     * Set client and version
     */
    setClient(client, version) {
        this.client = client;
        this.discordVersion = version;
        return this;
    }

    /**
     * Initialize manager
     */
    initialize() {
        if (this.isInitialized) return this;
        
        // Setup cleanup interval
        if (this.options.autoCleanup) {
            this.cleanupInterval = setInterval(() => {
                this._cleanup();
            }, this.options.cleanupInterval);
        }

        // Initialize components
        if (this.scheduler) this.scheduler.initialize();
        if (this.metrics) this.metrics.initialize();
        if (this.workerPool) this.workerPool.initialize();
        if (this.queue) this.queue.initialize();
        if (this.persistence) this.persistence.initialize();
        
        // Load persisted timers
        this._loadPersistedTimers();

        this.isInitialized = true;
        this.logger.info('TimerManager initialized');
        return this;
    }

    /**
     * Create a timer with full options
     */
    createTimer(config) {
        const {
            callback,
            delay = 0,
            type = 'timeout',
            args = [],
            metadata = {},
            version = this.discordVersion,
            client = this.client,
            
            // Advanced options
            priority = 'normal',
            group = null,
            retry = true,
            retryCount = 3,
            timeout = null,
            debounce = false,
            throttle = false,
            runImmediately = false,
            cron = null,
            condition = null,
            onSuccess = null,
            onError = null,
            onComplete = null,
            persistent = false,
            tags = [],
            context = {},
            concurrency = 1,
            rateLimit = null,
            id = null
        } = config;

        // Validate
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        // Check rate limits
        if (this.rateLimiter && !this.rateLimiter.check(rateLimit || this.options.maxRateLimit)) {
            throw new Error('Rate limit exceeded');
        }

        // Check max timers
        if (this.timers.size >= this.options.maxTimers) {
            throw new Error(`Maximum timer limit reached (${this.options.maxTimers})`);
        }

        const timerId = id || ++this.timerIdCounter;
        let timerObject = null;

        // Create timer based on type
        switch (type) {
            case 'interval':
                timerObject = this._createInterval(timerId, callback, delay, args);
                this.stats.intervals++;
                break;
            case 'timeout':
                timerObject = this._createTimeout(timerId, callback, delay, args);
                this.stats.timeouts++;
                break;
            case 'immediate':
                timerObject = this._createImmediate(timerId, callback, args);
                this.stats.immediates++;
                break;
            case 'cron':
                if (!this.scheduler) throw new Error('Scheduler not enabled');
                timerObject = this.scheduler.createCron(timerId, callback, cron, args);
                this.stats.cron++;
                break;
            case 'conditional':
                if (!this.scheduler) throw new Error('Scheduler not enabled');
                timerObject = this.scheduler.createConditional(timerId, callback, condition, args);
                this.stats.conditional++;
                break;
            default:
                throw new Error(`Invalid timer type: ${type}`);
        }

        // Build timer data
        const timerData = {
            id: timerId,
            type,
            delay,
            createdAt: Date.now(),
            metadata,
            version,
            client,
            isActive: true,
            isPaused: false,
            args,
            
            // Advanced properties
            priority,
            group,
            retry,
            retryCount,
            timeout,
            debounce,
            throttle,
            runImmediately,
            cron,
            condition,
            onSuccess,
            onError,
            onComplete,
            persistent,
            tags,
            context,
            concurrency,
            rateLimit,
            
            // Internal tracking
            executions: 0,
            lastExecution: null,
            nextExecution: null,
            errors: 0,
            retries: 0,
            startTime: Date.now(),
            totalExecutionTime: 0,
            lastExecutionTime: 0,
            executionHistory: [],
            ...timerObject
        };

        // Store timer
        this.timers.set(timerId, timerData);
        this.stats.totalCreated++;
        this.stats.active++;

        // Add to group
        if (group && this.groups) {
            if (!this.groups.has(group)) {
                this.groups.set(group, new TimerGroup(group, this.logger));
            }
            this.groups.get(group).addTimer(timerId);
            this.stats.byGroup.set(group, (this.stats.byGroup.get(group) || 0) + 1);
        }

        // Update priority stats
        this.stats.byPriority.set(priority, (this.stats.byPriority.get(priority) || 0) + 1);

        // Add to queue if enabled
        if (this.queue && type !== 'interval') {
            this.queue.add(timerId);
        }

        // Persist if needed
        if (persistent && this.persistence) {
            this.persistence.saveTimer(timerData);
        }

        // Execute hooks
        if (this.hooks) {
            this.hooks.trigger('onTimerCreated', timerData);
        }

        // Log
        this.logger.info(`Timer ${timerId} created`, { type, group, priority, tags });

        // Emit event
        this.emit('timerCreated', timerData);

        // Run immediately if requested
        if (runImmediately) {
            setImmediate(() => this._executeTimer(timerId));
        }

        return timerData;
    }

    /**
     * Create interval timer
     */
    _createInterval(timerId, callback, delay, args) {
        const interval = setInterval(() => {
            this._executeTimer(timerId);
        }, delay);

        return { timer: interval };
    }

    /**
     * Create timeout timer
     */
    _createTimeout(timerId, callback, delay, args) {
        const timeout = setTimeout(() => {
            this._executeTimer(timerId);
        }, delay);

        return { timer: timeout };
    }

    /**
     * Create immediate timer
     */
    _createImmediate(timerId, callback, args) {
        const immediate = setImmediate(() => {
            this._executeTimer(timerId);
        });

        return { timer: immediate };
    }

    /**
     * Execute timer
     */
    async _executeTimer(timerId) {
        const timerData = this.timers.get(timerId);
        if (!timerData || !timerData.isActive || timerData.isPaused) return;

        // Check concurrency
        if (timerData.executions >= timerData.concurrency) {
            this.logger.warn(`Timer ${timerId} concurrency limit reached`);
            return;
        }

        // Check debounce
        if (timerData.debounce && timerData.lastExecution) {
            const timeSinceLast = Date.now() - timerData.lastExecution;
            if (timeSinceLast < timerData.debounce) {
                this.logger.debug(`Timer ${timerId} debounced`);
                return;
            }
        }

        // Check throttle
        if (timerData.throttle && timerData.lastExecution) {
            const timeSinceLast = Date.now() - timerData.lastExecution;
            if (timeSinceLast < timerData.throttle) {
                this.logger.debug(`Timer ${timerId} throttled`);
                return;
            }
        }

        // Update timer state
        timerData.executions++;
        timerData.lastExecution = Date.now();
        const startTime = Date.now();

        try {
            // Execute callback
            let result;
            
            // Check for worker pool
            if (this.workerPool && this.workerPool.isEnabled()) {
                result = await this.workerPool.execute(timerData.callback, timerData.args);
            } else {
                result = await timerData.callback(...timerData.args);
            }

            // Update stats
            const executionTime = Date.now() - startTime;
            timerData.totalExecutionTime += executionTime;
            timerData.lastExecutionTime = executionTime;
            
            // Store in history
            this._addHistory(timerId, {
                timestamp: Date.now(),
                executionTime,
                success: true,
                result
            });

            // Success callback
            if (timerData.onSuccess) {
                await timerData.onSuccess(result, timerData);
            }

            this.stats.totalExecuted++;
            this.emit('timerExecuted', { id: timerId, type: timerData.type, executionTime });

            // Update metrics
            if (this.metrics) {
                this.metrics.recordExecution(timerId, executionTime);
            }

        } catch (error) {
            // Handle error
            timerData.errors++;
            this.stats.totalErrors++;

            // Store in history
            this._addHistory(timerId, {
                timestamp: Date.now(),
                success: false,
                error: error.message
            });

            this.logger.error(`Timer ${timerId} error`, error);
            this.emit('timerError', { id: timerId, error });

            // Error callback
            if (timerData.onError) {
                await timerData.onError(error, timerData);
            }

            // Retry logic
            if (timerData.retry && timerData.retries < timerData.retryCount) {
                timerData.retries++;
                this.stats.totalRetries++;
                
                this.logger.info(`Retrying timer ${timerId} (${timerData.retries}/${timerData.retryCount})`);
                
                setTimeout(() => {
                    this._executeTimer(timerId);
                }, this.options.retryDelay * Math.pow(2, timerData.retries - 1)); // Exponential backoff
            } else if (timerData.retries >= timerData.retryCount) {
                this.stats.totalFailed++;
                this.logger.error(`Timer ${timerId} failed after ${timerData.retryCount} retries`);
                
                if (timerData.type === 'timeout' || timerData.type === 'immediate') {
                    this.clearTimer(timerId);
                }
            }
        }

        // Complete callback
        if (timerData.onComplete) {
            await timerData.onComplete(timerData);
        }

        // Clear one-time timers
        if (timerData.type === 'timeout' || timerData.type === 'immediate') {
            this.clearTimer(timerId);
        }
    }

    /**
     * Add execution history
     */
    _addHistory(timerId, entry) {
        if (!this.history.has(timerId)) {
            this.history.set(timerId, []);
        }
        const history = this.history.get(timerId);
        history.push(entry);
        
        // Keep last 100 entries
        if (history.length > 100) {
            history.shift();
        }
    }

    /**
     * Clear timer by ID
     */
    clearTimer(timerId) {
        const timerData = this.timers.get(timerId);
        if (!timerData) return false;

        // Clear the timer
        if (timerData.type === 'interval') {
            clearInterval(timerData.timer);
        } else if (timerData.type === 'timeout') {
            clearTimeout(timerData.timer);
        } else if (timerData.type === 'immediate') {
            clearImmediate(timerData.timer);
        } else if (timerData.type === 'cron' || timerData.type === 'conditional') {
            if (this.scheduler) {
                this.scheduler.clear(timerId);
            }
        }

        timerData.isActive = false;
        this.timers.delete(timerId);
        this.stats.active--;
        this.stats.totalCleared++;

        // Remove from group
        if (timerData.group && this.groups) {
            const group = this.groups.get(timerData.group);
            if (group) {
                group.removeTimer(timerId);
                const count = this.stats.byGroup.get(timerData.group) || 0;
                if (count > 0) {
                    this.stats.byGroup.set(timerData.group, count - 1);
                }
            }
        }

        // Remove from queue
        if (this.queue) {
            this.queue.remove(timerId);
        }

        // Remove from persistence
        if (timerData.persistent && this.persistence) {
            this.persistence.deleteTimer(timerId);
        }

        // Execute hooks
        if (this.hooks) {
            this.hooks.trigger('onTimerCleared', timerData);
        }

        this.logger.info(`Timer ${timerId} cleared`);
        this.emit('timerCleared', timerData);
        
        return true;
    }

    /**
     * Clear all timers in a group
     */
    clearGroup(groupName) {
        if (!this.groups || !this.groups.has(groupName)) {
            return 0;
        }

        const group = this.groups.get(groupName);
        const timerIds = group.getAllTimers();
        let count = 0;

        for (const id of timerIds) {
            if (this.clearTimer(id)) {
                count++;
            }
        }

        this.groups.delete(groupName);
        this.logger.info(`Cleared ${count} timers from group ${groupName}`);
        return count;
    }

    /**
     * Clear timers by tag
     */
    clearByTag(tag) {
        let count = 0;
        const toRemove = [];

        for (const [id, timer] of this.timers) {
            if (timer.tags && timer.tags.includes(tag)) {
                toRemove.push(id);
            }
        }

        for (const id of toRemove) {
            if (this.clearTimer(id)) {
                count++;
            }
        }

        this.logger.info(`Cleared ${count} timers with tag ${tag}`);
        return count;
    }

    /**
     * Pause a timer
     */
    pauseTimer(timerId) {
        const timerData = this.timers.get(timerId);
        if (!timerData || !timerData.isActive) return false;

        timerData.isPaused = true;
        this.stats.totalPaused++;
        
        if (timerData.type === 'interval') {
            clearInterval(timerData.timer);
        }

        this.emit('timerPaused', timerData);
        this.logger.info(`Timer ${timerId} paused`);
        return true;
    }

    /**
     * Resume a timer
     */
    resumeTimer(timerId) {
        const timerData = this.timers.get(timerId);
        if (!timerData || !timerData.isActive || !timerData.isPaused) return false;

        timerData.isPaused = false;
        this.stats.totalResumed++;

        if (timerData.type === 'interval') {
            timerData.timer = setInterval(() => {
                this._executeTimer(timerId);
            }, timerData.delay);
        }

        this.emit('timerResumed', timerData);
        this.logger.info(`Timer ${timerId} resumed`);
        return true;
    }

    /**
     * Update timer configuration
     */
    updateTimer(timerId, config) {
        const timerData = this.timers.get(timerId);
        if (!timerData) return false;

        const { delay, args, metadata, tags, priority, group } = config;

        if (delay !== undefined) {
            timerData.delay = delay;
            if (timerData.type === 'interval' && timerData.isActive && !timerData.isPaused) {
                // Restart interval with new delay
                clearInterval(timerData.timer);
                timerData.timer = setInterval(() => {
                    this._executeTimer(timerId);
                }, delay);
            }
        }

        if (args !== undefined) timerData.args = args;
        if (metadata !== undefined) timerData.metadata = { ...timerData.metadata, ...metadata };
        if (tags !== undefined) timerData.tags = tags;
        if (priority !== undefined) timerData.priority = priority;
        
        if (group !== undefined && this.groups) {
            // Remove from old group
            if (timerData.group && this.groups.has(timerData.group)) {
                this.groups.get(timerData.group).removeTimer(timerId);
            }
            // Add to new group
            timerData.group = group;
            if (!this.groups.has(group)) {
                this.groups.set(group, new TimerGroup(group, this.logger));
            }
            this.groups.get(group).addTimer(timerId);
        }

        this.emit('timerUpdated', timerData);
        this.logger.info(`Timer ${timerId} updated`);
        return true;
    }

    /**
     * Get timers by group
     */
    getTimersByGroup(groupName) {
        if (!this.groups || !this.groups.has(groupName)) {
            return [];
        }
        const group = this.groups.get(groupName);
        const timerIds = group.getAllTimers();
        return timerIds.map(id => this.timers.get(id)).filter(t => t);
    }

    /**
     * Get timers by tag
     */
    getTimersByTag(tag) {
        const result = [];
        for (const timer of this.timers.values()) {
            if (timer.tags && timer.tags.includes(tag)) {
                result.push(timer);
            }
        }
        return result;
    }

    /**
     * Get timer history
     */
    getTimerHistory(timerId) {
        return this.history.get(timerId) || [];
    }

    /**
     * Export all timers
     */
    exportTimers() {
        const exportData = {
            version: this.discordVersion,
            exportedAt: Date.now(),
            timers: []
        };

        for (const timer of this.timers.values()) {
            exportData.timers.push({
                id: timer.id,
                type: timer.type,
                delay: timer.delay,
                args: timer.args,
                metadata: timer.metadata,
                group: timer.group,
                tags: timer.tags,
                priority: timer.priority,
                persistent: timer.persistent,
                cron: timer.cron,
                condition: timer.condition
            });
        }

        return exportData;
    }

    /**
     * Import timers
     */
    importTimers(timersData) {
        let count = 0;
        for (const timerConfig of timersData.timers) {
            try {
                // Need callback - this should be provided by the user
                this.logger.warn(`Skipping timer ${timerConfig.id} - callback required`);
                count++;
            } catch (error) {
                this.logger.error(`Failed to import timer ${timerConfig.id}`, error);
            }
        }
        return count;
    }

    /**
     * Get all active timers
     */
    getAllTimers() {
        return Array.from(this.timers.values());
    }

    /**
     * Get timer statistics
     */
    getStats() {
        return {
            ...this.stats,
            total: this.timers.size,
            paused: this.stats.paused,
            uptime: Date.now() - this.stats.startTime,
            versionStats: this._getVersionStats(),
            metrics: this.metrics ? this.metrics.getStats() : null,
            queue: this.queue ? this.queue.getStats() : null,
            workerPool: this.workerPool ? this.workerPool.getStats() : null
        };
    }

    /**
     * Get version distribution
     */
    _getVersionStats() {
        const versions = { v13: 0, v14: 0 };
        for (const timer of this.timers.values()) {
            if (timer.version === 'v13') versions.v13++;
            else if (timer.version === 'v14') versions.v14++;
        }
        return versions;
    }

    /**
     * Clean up expired timers
     */
    _cleanup() {
        const toRemove = [];
        
        for (const [id, timer] of this.timers) {
            // Check for timeout timers that should be cleaned
            if (timer.type === 'timeout' || timer.type === 'immediate') {
                if (!timer.isActive) {
                    toRemove.push(id);
                }
            }
            
            // Check for stale timers (no execution for long time)
            if (timer.type === 'interval' && timer.lastExecution) {
                const timeSinceExecution = Date.now() - timer.lastExecution;
                if (timeSinceExecution > timer.delay * 3) {
                    this.logger.warn(`Timer ${id} appears to be stale, cleaning up`);
                    toRemove.push(id);
                }
            }
        }

        for (const id of toRemove) {
            this.clearTimer(id);
        }

        if (toRemove.length > 0) {
            this.logger.debug(`Cleaned up ${toRemove.length} timers`);
        }
    }

    /**
     * Load persisted timers
     */
    _loadPersistedTimers() {
        if (!this.persistence) return;
        
        const persisted = this.persistence.loadAllTimers();
        for (const timerData of persisted) {
            try {
                // Recreate timer with persisted data
                // Note: callback needs to be provided
                this.logger.info(`Loaded persisted timer ${timerData.id}`);
            } catch (error) {
                this.logger.error(`Failed to load persisted timer ${timerData.id}`, error);
            }
        }
    }

    /**
     * Destroy manager
     */
    destroy() {
        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Clear all timers
        this.clearAllTimers();

        // Destroy components
        if (this.scheduler) this.scheduler.destroy();
        if (this.metrics) this.metrics.destroy();
        if (this.workerPool) this.workerPool.destroy();
        if (this.queue) this.queue.destroy();
        if (this.persistence) this.persistence.destroy();

        this.isInitialized = false;
        this.logger.info('TimerManager destroyed');
    }

    /**
     * Clear all timers
     */
    clearAllTimers() {
        const timerIds = Array.from(this.timers.keys());
        let count = 0;
        
        for (const id of timerIds) {
            if (this.clearTimer(id)) {
                count++;
            }
        }
        
        return count;
    }
}

module.exports = TimerManager;
