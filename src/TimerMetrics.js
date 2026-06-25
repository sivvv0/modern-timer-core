const EventEmitter = require('events');

class TimerMetrics extends EventEmitter {
    constructor(interval, logger) {
        super();
        this.interval = interval;
        this.logger = logger;
        this.metricsInterval = null;
        
        this.metrics = {
            totalExecutions: 0,
            totalErrors: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            minExecutionTime: Infinity,
            maxExecutionTime: 0,
            executionsPerMinute: 0,
            errorsPerMinute: 0,
            activeTimers: 0,
            byType: {
                interval: { count: 0, executions: 0, avgTime: 0 },
                timeout: { count: 0, executions: 0, avgTime: 0 },
                immediate: { count: 0, executions: 0, avgTime: 0 },
                cron: { count: 0, executions: 0, avgTime: 0 },
                conditional: { count: 0, executions: 0, avgTime: 0 }
            },
            history: [],
            lastMinuteExecutions: [],
            lastMinuteErrors: []
        };

        this.executionTimestamps = [];
        this.errorTimestamps = [];
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return this;

        this.metricsInterval = setInterval(() => {
            this._collectMetrics();
        }, this.interval);

        this.isInitialized = true;
        this.logger.info('TimerMetrics initialized');
        return this;
    }

    /**
     * Record a timer execution
     */
    recordExecution(timerId, executionTime) {
        this.metrics.totalExecutions++;
        this.metrics.totalExecutionTime += executionTime;
        this.metrics.minExecutionTime = Math.min(this.metrics.minExecutionTime, executionTime);
        this.metrics.maxExecutionTime = Math.max(this.metrics.maxExecutionTime, executionTime);
        this.metrics.averageExecutionTime = this.metrics.totalExecutionTime / this.metrics.totalExecutions;

        // Track for per-minute metrics
        this.executionTimestamps.push(Date.now());
        if (this.executionTimestamps.length > 1000) {
            this.executionTimestamps.shift();
        }

        // Update by type
        const timer = this._getTimer(timerId);
        if (timer && this.metrics.byType[timer.type]) {
            this.metrics.byType[timer.type].executions++;
            const type = this.metrics.byType[timer.type];
            type.avgTime = ((type.avgTime * (type.executions - 1)) + executionTime) / type.executions;
        }

        // Store history
        this.metrics.history.push({
            timestamp: Date.now(),
            timerId,
            executionTime,
            success: true
        });

        // Keep last 1000 history entries
        if (this.metrics.history.length > 1000) {
            this.metrics.history.shift();
        }

        this.emit('executionRecorded', { timerId, executionTime });
    }

    /**
     * Record an error
     */
    recordError(timerId, error) {
        this.metrics.totalErrors++;
        
        // Track for per-minute metrics
        this.errorTimestamps.push(Date.now());
        if (this.errorTimestamps.length > 1000) {
            this.errorTimestamps.shift();
        }

        this.emit('errorRecorded', { timerId, error });
    }

    /**
     * Update active timers count
     */
    updateActiveTimers(count) {
        this.metrics.activeTimers = count;
    }

    /**
     * Update timer type counts
     */
    updateTimerTypeCounts(timers) {
        // Reset counts
        for (const type in this.metrics.byType) {
            this.metrics.byType[type].count = 0;
        }

        // Count timers by type
        for (const timer of timers) {
            if (this.metrics.byType[timer.type]) {
                this.metrics.byType[timer.type].count++;
            }
        }
    }

    /**
     * Collect metrics
     */
    _collectMetrics() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        // Calculate executions per minute
        this.metrics.executionsPerMinute = this.executionTimestamps.filter(
            t => t > oneMinuteAgo
        ).length;

        // Calculate errors per minute
        this.metrics.errorsPerMinute = this.errorTimestamps.filter(
            t => t > oneMinuteAgo
        ).length;

        // Calculate error rate
        const errorRate = this.metrics.totalExecutions > 0 ?
            (this.metrics.totalErrors / this.metrics.totalExecutions) * 100 : 0;

        // Get timer count
        const timerCount = this._getTimerCount();

        const metricsSnapshot = {
            timestamp: now,
            ...this.metrics,
            errorRate: errorRate.toFixed(2) + '%',
            timerCount,
            memoryUsage: process.memoryUsage()
        };

        this.emit('metricsCollected', metricsSnapshot);
        this.logger.debug('Metrics collected', {
            executionsPerMinute: metricsSnapshot.executionsPerMinute,
            activeTimers: metricsSnapshot.activeTimers,
            avgExecutionTime: metricsSnapshot.averageExecutionTime.toFixed(2)
        });

        return metricsSnapshot;
    }

    /**
     * Get a timer by ID
     */
    _getTimer(timerId) {
        // This would need access to the timer manager
        // For now, we'll return null
        return null;
    }

    /**
     * Get timer count
     */
    _getTimerCount() {
        // This would need access to the timer manager
        return 0;
    }

    /**
     * Get metrics statistics
     */
    getStats() {
        return {
            ...this.metrics,
            errorRate: this.metrics.totalExecutions > 0 ?
                ((this.metrics.totalErrors / this.metrics.totalExecutions) * 100).toFixed(2) + '%' : '0%',
            historyCount: this.metrics.history.length
        };
    }

    /**
     * Get metrics history
     */
    getHistory(limit = 100) {
        return this.metrics.history.slice(-limit);
    }

    /**
     * Reset metrics
     */
    reset() {
        this.metrics = {
            totalExecutions: 0,
            totalErrors: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            minExecutionTime: Infinity,
            maxExecutionTime: 0,
            executionsPerMinute: 0,
            errorsPerMinute: 0,
            activeTimers: 0,
            byType: {
                interval: { count: 0, executions: 0, avgTime: 0 },
                timeout: { count: 0, executions: 0, avgTime: 0 },
                immediate: { count: 0, executions: 0, avgTime: 0 },
                cron: { count: 0, executions: 0, avgTime: 0 },
                conditional: { count: 0, executions: 0, avgTime: 0 }
            },
            history: [],
            lastMinuteExecutions: [],
            lastMinuteErrors: []
        };
        this.executionTimestamps = [];
        this.errorTimestamps = [];
        this.logger.info('Metrics reset');
    }

    /**
     * Destroy metrics
     */
    destroy() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        this.isInitialized = false;
        this.logger.info('TimerMetrics destroyed');
    }
}

module.exports = TimerMetrics;
