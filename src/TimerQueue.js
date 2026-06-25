const EventEmitter = require('events');

class TimerQueue extends EventEmitter {
    constructor(concurrency = 5, logger) {
        super();
        this.concurrency = concurrency;
        this.logger = logger;
        this.queue = [];
        this.active = new Set();
        this.completed = new Set();
        this.failed = new Set();
        this.paused = false;
        this.processing = false;
        this.stats = {
            totalAdded: 0,
            totalProcessed: 0,
            totalFailed: 0,
            totalActive: 0,
            queueLength: 0
        };
    }

    /**
     * Initialize queue
     */
    initialize() {
        this.processing = true;
        this.logger.info('TimerQueue initialized');
        return this;
    }

    /**
     * Add a timer to the queue
     */
    add(timerId, priority = 0) {
        this.queue.push({ timerId, priority, addedAt: Date.now() });
        this.queue.sort((a, b) => b.priority - a.priority);
        this.stats.totalAdded++;
        this.stats.queueLength = this.queue.length;
        
        this.emit('added', { timerId, priority, queueLength: this.queue.length });
        this.logger.debug(`Timer ${timerId} added to queue (priority: ${priority})`);
        
        if (!this.paused && this.processing) {
            this._processQueue();
        }
        
        return this;
    }

    /**
     * Remove a timer from the queue
     */
    remove(timerId) {
        const index = this.queue.findIndex(item => item.timerId === timerId);
        if (index !== -1) {
            const removed = this.queue.splice(index, 1)[0];
            this.stats.queueLength = this.queue.length;
            this.emit('removed', { timerId, reason: 'manual' });
            this.logger.debug(`Timer ${timerId} removed from queue`);
            return true;
        }
        return false;
    }

    /**
     * Process the queue
     */
    async _processQueue() {
        if (this.paused || !this.processing) return;
        if (this.queue.length === 0) return;
        if (this.active.size >= this.concurrency) return;

        const item = this.queue.shift();
        if (!item) return;

        const { timerId } = item;
        this.active.add(timerId);
        this.stats.totalActive = this.active.size;
        this.stats.queueLength = this.queue.length;

        this.emit('processing', { timerId, active: this.active.size, queueLength: this.queue.length });
        this.logger.debug(`Processing timer ${timerId} (${this.active.size}/${this.concurrency})`);

        try {
            // The timer will be executed by the manager
            // We just track it here
            this.completed.add(timerId);
            this.stats.totalProcessed++;
            this.emit('completed', { timerId, duration: Date.now() - item.addedAt });
        } catch (error) {
            this.failed.add(timerId);
            this.stats.totalFailed++;
            this.emit('failed', { timerId, error });
            this.logger.error(`Timer ${timerId} failed in queue`, error);
        } finally {
            this.active.delete(timerId);
            this.stats.totalActive = this.active.size;
            
            // Clean up completed/failed sets (keep last 1000)
            if (this.completed.size > 1000) {
                const toDelete = Array.from(this.completed).slice(0, this.completed.size - 1000);
                for (const id of toDelete) {
                    this.completed.delete(id);
                }
            }
            if (this.failed.size > 1000) {
                const toDelete = Array.from(this.failed).slice(0, this.failed.size - 1000);
                for (const id of toDelete) {
                    this.failed.delete(id);
                }
            }
        }

        // Process next item
        if (this.queue.length > 0 && this.active.size < this.concurrency) {
            setImmediate(() => this._processQueue());
        } else if (this.queue.length === 0 && this.active.size === 0) {
            this.emit('empty');
        }
    }

    /**
     * Pause queue processing
     */
    pause() {
        this.paused = true;
        this.emit('paused');
        this.logger.info('Queue paused');
        return this;
    }

    /**
     * Resume queue processing
     */
    resume() {
        this.paused = false;
        this.emit('resumed');
        this.logger.info('Queue resumed');
        if (this.queue.length > 0 && this.active.size < this.concurrency) {
            this._processQueue();
        }
        return this;
    }

    /**
     * Set concurrency
     */
    setConcurrency(concurrency) {
        if (concurrency < 1) {
            throw new Error('Concurrency must be at least 1');
        }
        this.concurrency = concurrency;
        this.logger.info(`Queue concurrency set to ${concurrency}`);
        
        // Process more if possible
        if (this.queue.length > 0 && this.active.size < this.concurrency) {
            this._processQueue();
        }
        return this;
    }

    /**
     * Clear the queue
     */
    clear() {
        const count = this.queue.length;
        this.queue = [];
        this.stats.queueLength = 0;
        this.emit('cleared', { count });
        this.logger.info(`Queue cleared (${count} items)`);
        return count;
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            ...this.stats,
            queueLength: this.queue.length,
            activeCount: this.active.size,
            completedCount: this.completed.size,
            failedCount: this.failed.size,
            concurrency: this.concurrency,
            paused: this.paused,
            processing: this.processing
        };
    }

    /**
     * Get queue items
     */
    getQueueItems(limit = 100) {
        return this.queue.slice(0, limit);
    }

    /**
     * Get active items
     */
    getActiveItems() {
        return Array.from(this.active);
    }

    /**
     * Check if timer is in queue
     */
    isInQueue(timerId) {
        return this.queue.some(item => item.timerId === timerId);
    }

    /**
     * Check if timer is active
     */
    isActive(timerId) {
        return this.active.has(timerId);
    }

    /**
     * Check if timer is completed
     */
    isCompleted(timerId) {
        return this.completed.has(timerId);
    }

    /**
     * Check if timer failed
     */
    isFailed(timerId) {
        return this.failed.has(timerId);
    }

    /**
     * Get queue status for a timer
     */
    getTimerStatus(timerId) {
        if (this.active.has(timerId)) return 'active';
        if (this.completed.has(timerId)) return 'completed';
        if (this.failed.has(timerId)) return 'failed';
        if (this.isInQueue(timerId)) return 'queued';
        return 'unknown';
    }

    /**
     * Destroy queue
     */
    destroy() {
        this.pause();
        this.clear();
        this.processing = false;
        this.active.clear();
        this.completed.clear();
        this.failed.clear();
        this.removeAllListeners();
        this.logger.info('Queue destroyed');
    }
}

module.exports = TimerQueue;
