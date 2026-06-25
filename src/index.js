const TimerManager = require('./TimerManager');
const DiscordTimer = require('./DiscordTimer');

/**
 * Modern Timer Core - Discord.js timer management
 * @version 0.0.1
 */
class ModernTimerCore {
  /**
   * Create a new timer manager instance
   * @param {Object} options
   * @param {number} options.defaultInterval - Default interval in ms (default: 5000)
   * @param {boolean} options.autoClear - Auto clear timers on bot disconnect (default: true)
   * @param {number} options.maxTimers - Maximum timers allowed (default: 1000)
   */
  constructor(options = {}) {
    this.manager = new TimerManager(options);
    this.timers = [];
    this.isReady = false;
  }

  /**
   * Initialize with Discord client
   * @param {import('discord.js').Client} client - Discord.js client
   * @returns {ModernTimerCore}
   */
  initialize(client) {
    this.client = client;
    this.isReady = true;
    
    // Auto-cleanup on client destroy
    if (this.options.autoClear !== false) {
      client.once('destroy', () => this.clearAll());
    }
    
    return this;
  }

  /**
   * Create a repeating timer (setInterval)
   * @param {Function} callback - Function to execute
   * @param {number} interval - Time in ms between executions
   * @param {Object} options - Additional options
   * @param {Object} options.context - Discord context (guild, channel, user)
   * @param {boolean} options.immediate - Execute immediately on start
   * @param {number} options.maxExecutions - Max number of executions
   * @returns {Object} Timer object with control methods
   */
  setInterval(callback, interval, options = {}) {
    this._validateCallback(callback);
    const timer = this.manager.createInterval(callback, interval, options);
    this.timers.push(timer);
    
    if (options.immediate) {
      callback({ ...options.context, timer });
    }
    
    return this._wrapTimer(timer);
  }

  /**
   * Create a one-time timer (setTimeout)
   * @param {Function} callback - Function to execute
   * @param {number} delay - Time in ms before execution
   * @param {Object} options - Additional options
   * @param {Object} options.context - Discord context
   * @returns {Object} Timer object with control methods
   */
  setTimeout(callback, delay, options = {}) {
    this._validateCallback(callback);
    const timer = this.manager.createTimeout(callback, delay, options);
    this.timers.push(timer);
    return this._wrapTimer(timer);
  }

  /**
   * Execute callback as soon as possible (setImmediate)
   * @param {Function} callback - Function to execute
   * @param {Object} options - Additional options
   * @param {Object} options.context - Discord context
   * @returns {Object} Timer object with control methods
   */
  setImmediate(callback, options = {}) {
    this._validateCallback(callback);
    const timer = this.manager.createImmediate(callback, options);
    this.timers.push(timer);
    return this._wrapTimer(timer);
  }

  /**
   * Create a timer with custom configuration
   * @param {Object} config - Timer configuration
   * @param {string} config.type - 'interval', 'timeout', or 'immediate'
   * @param {Function} config.callback - Function to execute
   * @param {number} config.delay - Delay or interval in ms
   * @param {Object} config.options - Additional options
   * @returns {Object} Timer object
   */
  createTimer(config) {
    const { type, callback, delay, options = {} } = config;
    
    switch(type) {
      case 'interval':
        return this.setInterval(callback, delay, options);
      case 'timeout':
        return this.setTimeout(callback, delay, options);
      case 'immediate':
        return this.setImmediate(callback, options);
      default:
        throw new Error(`Invalid timer type: ${type}`);
    }
  }

  /**
   * Clear a specific timer
   * @param {Object} timer - Timer object returned from create methods
   * @returns {boolean} Success status
   */
  clear(timer) {
    if (!timer || typeof timer.clear !== 'function') {
      return false;
    }
    
    const success = timer.clear();
    if (success) {
      const index = this.timers.indexOf(timer._raw);
      if (index > -1) {
        this.timers.splice(index, 1);
      }
    }
    return success;
  }

  /**
   * Clear all timers
   * @returns {number} Number of timers cleared
   */
  clearAll() {
    const count = this.timers.length;
    this.manager.clearAll();
    this.timers = [];
    return count;
  }

  /**
   * Get timer statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      total: this.timers.length,
      active: this.timers.filter(t => t._raw && t._raw.isActive()).length,
      types: {
        interval: this.timers.filter(t => t._raw && t._raw.type === 'interval').length,
        timeout: this.timers.filter(t => t._raw && t._raw.type === 'timeout').length,
        immediate: this.timers.filter(t => t._raw && t._raw.type === 'immediate').length
      }
    };
  }

  /**
   * Wrap timer with Discord-specific methods
   * @private
   */
  _wrapTimer(timer) {
    const wrapped = {
      clear: () => this.clear(timer),
      isActive: () => timer.isActive(),
      getRemaining: () => timer.getRemaining ? timer.getRemaining() : null,
      getExecutions: () => timer.getExecutions ? timer.getExecutions() : 0,
      pause: timer.pause ? () => timer.pause() : null,
      resume: timer.resume ? () => timer.resume() : null,
      _raw: timer
    };
    
    return wrapped;
  }

  /**
   * Validate callback function
   * @private
   */
  _validateCallback(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }
  }
}

// Export factory function
const createTimerManager = (options = {}) => new ModernTimerCore(options);

module.exports = {
  ModernTimerCore,
  TimerManager,
  DiscordTimer,
  createTimerManager,
  default: createTimerManager
};
