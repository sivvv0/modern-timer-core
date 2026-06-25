const fs = require('fs');
const path = require('path');

class TimerPersistence {
    constructor(filePath, logger) {
        this.filePath = filePath;
        this.logger = logger;
        this.timers = new Map();
        this.isInitialized = false;
        this.saveInterval = null;
    }

    initialize() {
        if (this.isInitialized) return this;
        
        // Create directory if it doesn't exist
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Load existing timers
        this.loadAllTimers();

        // Auto-save every 5 minutes
        this.saveInterval = setInterval(() => {
            this.saveAllTimers();
        }, 300000);

        this.isInitialized = true;
        this.logger.info('TimerPersistence initialized');
        return this;
    }

    /**
     * Save a timer
     */
    saveTimer(timerData) {
        this.timers.set(timerData.id, {
            id: timerData.id,
            type: timerData.type,
            delay: timerData.delay,
            metadata: timerData.metadata,
            group: timerData.group,
            tags: timerData.tags,
            priority: timerData.priority,
            version: timerData.version,
            createdAt: timerData.createdAt,
            persistent: timerData.persistent,
            cron: timerData.cron,
            condition: timerData.condition,
            // Don't save callbacks or functions
        });
        
        this.saveAllTimers();
        this.logger.debug(`Timer ${timerData.id} saved to persistence`);
    }

    /**
     * Delete a timer
     */
    deleteTimer(timerId) {
        this.timers.delete(timerId);
        this.saveAllTimers();
        this.logger.debug(`Timer ${timerId} deleted from persistence`);
    }

    /**
     * Load all timers
     */
    loadAllTimers() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf8');
                const parsed = JSON.parse(data);
                
                this.timers.clear();
                for (const timer of parsed.timers) {
                    this.timers.set(timer.id, timer);
                }
                
                this.logger.info(`Loaded ${this.timers.size} timers from persistence`);
                return Array.from(this.timers.values());
            }
        } catch (error) {
            this.logger.error('Failed to load timers from persistence', error);
        }
        return [];
    }

    /**
     * Save all timers
     */
    saveAllTimers() {
        try {
            const data = {
                version: '1.0.0',
                updatedAt: Date.now(),
                timers: Array.from(this.timers.values())
            };
            
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
            this.logger.debug(`Saved ${this.timers.size} timers to persistence`);
        } catch (error) {
            this.logger.error('Failed to save timers to persistence', error);
        }
    }

    /**
     * Get a timer by ID
     */
    getTimer(timerId) {
        return this.timers.get(timerId);
    }

    /**
     * Get all timers
     */
    getAllTimers() {
        return Array.from(this.timers.values());
    }

    /**
     * Destroy persistence
     */
    destroy() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
        
        // Save one last time
        this.saveAllTimers();
        this.isInitialized = false;
        this.logger.info('TimerPersistence destroyed');
    }
}

module.exports = TimerPersistence;
