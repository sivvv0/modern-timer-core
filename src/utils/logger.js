const EventEmitter = require('events');

class Logger extends EventEmitter {
    constructor(level = 'info') {
        super();
        this.level = level;
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
            none: 4
        };
        this.logs = [];
        this.maxLogs = 1000;
    }

    /**
     * Log a debug message
     */
    debug(message, data = null) {
        this._log('debug', message, data);
    }

    /**
     * Log an info message
     */
    info(message, data = null) {
        this._log('info', message, data);
    }

    /**
     * Log a warning message
     */
    warn(message, data = null) {
        this._log('warn', message, data);
    }

    /**
     * Log an error message
     */
    error(message, error = null) {
        this._log('error', message, error);
    }

    /**
     * Internal log method
     */
    _log(level, message, data) {
        const levelValue = this.levels[level] || 0;
        const currentLevel = this.levels[this.level] || 0;

        if (levelValue < currentLevel) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data: data ? this._sanitize(data) : null
        };

        // Store log
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Emit event
        this.emit('log', logEntry);

        // Console output
        const color = {
            debug: '\x1b[36m',
            info: '\x1b[32m',
            warn: '\x1b[33m',
            error: '\x1b[31m'
        };

        console.log(
            `${color[level]}[${logEntry.timestamp}] [${level.toUpperCase()}] ${message}`,
            data ? data : ''
        );
    }

    /**
     * Sanitize data for logging
     */
    _sanitize(data) {
        if (!data) return null;
        
        // Don't log sensitive data
        const sensitive = ['password', 'token', 'secret', 'key', 'auth'];
        const sanitized = { ...data };
        
        for (const key of sensitive) {
            if (sanitized[key]) {
                sanitized[key] = '[REDACTED]';
            }
        }
        
        return sanitized;
    }

    /**
     * Set log level
     */
    setLevel(level) {
        if (this.levels[level] !== undefined) {
            this.level = level;
            this.info(`Log level set to ${level}`);
        }
        return this;
    }

    /**
     * Get logs
     */
    getLogs(level = null, limit = 100) {
        let logs = this.logs;
        if (level) {
            logs = logs.filter(log => log.level === level);
        }
        return logs.slice(-limit);
    }

    /**
     * Clear logs
     */
    clearLogs() {
        const count = this.logs.length;
        this.logs = [];
        return count;
    }

    /**
     * Create a child logger
     */
    child(prefix) {
        const child = new Logger(this.level);
        child._log = (level, message, data) => {
            super._log(level, `[${prefix}] ${message}`, data);
        };
        return child;
    }
}

module.exports = Logger;
