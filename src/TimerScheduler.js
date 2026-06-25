const EventEmitter = require('events');
const cron = require('node-cron');

class TimerScheduler extends EventEmitter {
    constructor(manager) {
        super();
        this.manager = manager;
        this.cronJobs = new Map();
        this.conditionalJobs = new Map();
        this.isInitialized = false;
        this.logger = manager.logger;
    }

    initialize() {
        if (this.isInitialized) return this;
        this.isInitialized = true;
        this.logger.info('TimerScheduler initialized');
        return this;
    }

    /**
     * Create a cron timer
     */
    createCron(timerId, callback, cronExpression, args) {
        if (!cron.validate(cronExpression)) {
            throw new Error(`Invalid cron expression: ${cronExpression}`);
        }

        const job = cron.schedule(cronExpression, () => {
            this.manager._executeTimer(timerId);
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        this.cronJobs.set(timerId, job);
        this.logger.info(`Cron job created for timer ${timerId}: ${cronExpression}`);
        
        return { timer: job, cron: cronExpression };
    }

    /**
     * Create a conditional timer
     */
    createConditional(timerId, callback, condition, args) {
        const checkCondition = () => {
            try {
                const result = condition();
                if (result) {
                    this.manager._executeTimer(timerId);
                    // Stop checking if it's a one-time condition
                    if (this.conditionalJobs.has(timerId)) {
                        clearInterval(this.conditionalJobs.get(timerId).interval);
                        this.conditionalJobs.delete(timerId);
                    }
                }
            } catch (error) {
                this.logger.error(`Condition check failed for timer ${timerId}`, error);
            }
        };

        // Check immediately
        setImmediate(checkCondition);

        // Continue checking every second
        const interval = setInterval(checkCondition, 1000);
        this.conditionalJobs.set(timerId, { interval, checkCondition });

        this.logger.info(`Conditional timer created for ${timerId}`);
        return { timer: null, condition: true };
    }

    /**
     * Clear a scheduled timer
     */
    clear(timerId) {
        let cleared = false;

        // Clear cron job
        if (this.cronJobs.has(timerId)) {
            const job = this.cronJobs.get(timerId);
            job.stop();
            this.cronJobs.delete(timerId);
            cleared = true;
        }

        // Clear conditional job
        if (this.conditionalJobs.has(timerId)) {
            const job = this.conditionalJobs.get(timerId);
            clearInterval(job.interval);
            this.conditionalJobs.delete(timerId);
            cleared = true;
        }

        if (cleared) {
            this.logger.debug(`Scheduled timer ${timerId} cleared`);
        }

        return cleared;
    }

    /**
     * Get all cron jobs
     */
    getAllCronJobs() {
        return Array.from(this.cronJobs.keys());
    }

    /**
     * Get all conditional jobs
     */
    getAllConditionalJobs() {
        return Array.from(this.conditionalJobs.keys());
    }

    /**
     * Destroy scheduler
     */
    destroy() {
        // Stop all cron jobs
        for (const [id, job] of this.cronJobs) {
            job.stop();
        }
        this.cronJobs.clear();

        // Clear all conditional jobs
        for (const [id, job] of this.conditionalJobs) {
            clearInterval(job.interval);
        }
        this.conditionalJobs.clear();

        this.isInitialized = false;
        this.logger.info('TimerScheduler destroyed');
    }
}

module.exports = TimerScheduler;
