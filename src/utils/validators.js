/**
 * Validate Discord.js version
 */
function validateDiscordVersion(client) {
    // Check for v13
    if (client.constructor.version && 
        client.constructor.version.startsWith('13')) {
        return 'v13';
    }
    
    // Check for v14
    if (client.constructor.version && 
        client.constructor.version.startsWith('14')) {
        return 'v14';
    }

    // Fallback detection
    if (client.guilds && 
        typeof client.guilds.fetch === 'function' && 
        !client.guilds.array) {
        return 'v14';
    }

    if (client.guilds && 
        typeof client.guilds.array === 'function') {
        return 'v13';
    }

    throw new Error('Unable to detect Discord.js version. Please ensure you\'re using v13 or v14.');
}

/**
 * Validate timer configuration
 */
function validateTimerConfig(config) {
    const errors = [];

    if (!config.callback || typeof config.callback !== 'function') {
        errors.push('callback must be a function');
    }

    if (config.type && !['interval', 'timeout', 'immediate', 'cron', 'conditional'].includes(config.type)) {
        errors.push('Invalid timer type');
    }

    if (config.delay !== undefined && (typeof config.delay !== 'number' || config.delay < 0)) {
        errors.push('delay must be a positive number');
    }

    if (config.cron && typeof config.cron !== 'string') {
        errors.push('cron must be a string');
    }

    if (config.condition && typeof config.condition !== 'function') {
        errors.push('condition must be a function');
    }

    if (config.priority && !['high', 'normal', 'low'].includes(config.priority)) {
        errors.push('priority must be high, normal, or low');
    }

    if (config.concurrency !== undefined && (typeof config.concurrency !== 'number' || config.concurrency < 1)) {
        errors.push('concurrency must be a positive number');
    }

    if (config.tags && !Array.isArray(config.tags)) {
        errors.push('tags must be an array');
    }

    if (config.args && !Array.isArray(config.args)) {
        errors.push('args must be an array');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate cron expression
 */
function validateCron(cron) {
    // Simple validation for common cron formats
    const parts = cron.split(' ');
    if (parts.length < 5 || parts.length > 6) {
        return false;
    }

    // Validate each part
    const validators = {
        minute: /^(\*|[0-9]|[1-5][0-9]|\*\/[0-9]+)$/,
        hour: /^(\*|[0-9]|[1][0-9]|[2][0-3]|\*\/[0-9]+)$/,
        day: /^(\*|[1-9]|[1-2][0-9]|3[0-1]|\?|\*\/[0-9]+)$/,
        month: /^(\*|[1-9]|1[0-2]|\*\/[0-9]+)$/,
        dayOfWeek: /^(\*|[0-6]|\?|\*\/[0-9]+)$/
    };

    const keys = ['minute', 'hour', 'day', 'month', 'dayOfWeek'];
    for (let i = 0; i < 5; i++) {
        if (!validators[keys[i]].test(parts[i])) {
            return false;
        }
    }

    return true;
}

module.exports = {
    validateDiscordVersion,
    validateTimerConfig,
    validateCron
};
