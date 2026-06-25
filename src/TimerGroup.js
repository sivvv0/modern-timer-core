const EventEmitter = require('events');

class TimerGroup extends EventEmitter {
    constructor(name, logger) {
        super();
        this.name = name;
        this.logger = logger;
        this.timers = new Set();
        this.metadata = {};
        this.createdAt = Date.now();
        this.isPaused = false;
        this.executionCount = 0;
        this.totalExecutionTime = 0;
    }

    /**
     * Add a timer to the group
     */
    addTimer(timerId) {
        this.timers.add(timerId);
        this.emit('timerAdded', { group: this.name, timerId });
        this.logger.debug(`Timer ${timerId} added to group ${this.name}`);
        return this;
    }

    /**
     * Remove a timer from the group
     */
    removeTimer(timerId) {
        const deleted = this.timers.delete(timerId);
        if (deleted) {
            this.emit('timerRemoved', { group: this.name, timerId });
            this.logger.debug(`Timer ${timerId} removed from group ${this.name}`);
        }
        return deleted;
    }

    /**
     * Get all timers in the group
     */
    getAllTimers() {
        return Array.from(this.timers);
    }

    /**
     * Get timer count
     */
    getTimerCount() {
        return this.timers.size;
    }

    /**
     * Check if group has a timer
     */
    hasTimer(timerId) {
        return this.timers.has(timerId);
    }

    /**
     * Pause the group
     */
    pause() {
        this.isPaused = true;
        this.emit('paused', { group: this.name });
        this.logger.info(`Group ${this.name} paused`);
        return this;
    }

    /**
     * Resume the group
     */
    resume() {
        this.isPaused = false;
        this.emit('resumed', { group: this.name });
        this.logger.info(`Group ${this.name} resumed`);
        return this;
    }

    /**
     * Set group metadata
     */
    setMetadata(key, value) {
        this.metadata[key] = value;
        this.emit('metadataUpdated', { group: this.name, key, value });
        return this;
    }

    /**
     * Get group metadata
     */
    getMetadata(key) {
        return this.metadata[key];
    }

    /**
     * Record execution
     */
    recordExecution(executionTime) {
        this.executionCount++;
        this.totalExecutionTime += executionTime;
        this.emit('executionRecorded', { group: this.name, executionTime });
    }

    /**
     * Get group statistics
     */
    getStats() {
        return {
            name: this.name,
            timerCount: this.timers.size,
            executionCount: this.executionCount,
            totalExecutionTime: this.totalExecutionTime,
            averageExecutionTime: this.executionCount > 0 ? 
                this.totalExecutionTime / this.executionCount : 0,
            isPaused: this.isPaused,
            createdAt: this.createdAt,
            metadata: this.metadata,
            timers: Array.from(this.timers)
        };
    }

    /**
     * Clear all timers in the group
     */
    clear() {
        const timerIds = Array.from(this.timers);
        this.timers.clear();
        this.emit('cleared', { group: this.name, timerIds });
        this.logger.info(`Group ${this.name} cleared (${timerIds.length} timers)`);
        return timerIds;
    }

    /**
     * Destroy the group
     */
    destroy() {
        const timerIds = this.clear();
        this.removeAllListeners();
        this.logger.info(`Group ${this.name} destroyed`);
        return timerIds;
    }
}

module.exports = TimerGroup;
