const EventEmitter = require('events');

class TimerManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      defaultInterval: options.defaultInterval || 5000,
      maxTimers: options.maxTimers || 1000,
      autoClear: options.autoClear !== undefined ? options.autoClear : true
    };
    
    this.timers = new Map();
    this.timerId = 0;
    this._activeTimers = 0;
  }

  /**
   * Create interval timer
   */
  createInterval(callback, interval, options = {}) {
    this._checkLimit();
    
    const id = ++this.timerId;
    const timerObj = {
      id,
      type: 'interval',
      callback,
      interval: interval || this.options.defaultInterval,
      options,
      startTime: Date.now(),
      executions: 0,
      maxExecutions: options.maxExecutions || Infinity,
      paused: false,
      isActive: true,
      _interval: null
    };

    this._startInterval(timerObj);
    this.timers.set(id, timerObj);
    this._activeTimers++;
    
    this.emit('timerStart', { id, type: 'interval' });
    return timerObj;
  }

  /**
   * Create timeout timer
   */
  createTimeout(callback, delay, options = {}) {
    this._checkLimit();
    
    const id = ++this.timerId;
    const timerObj = {
      id,
      type: 'timeout',
      callback,
      delay: delay || this.options.defaultInterval,
      options,
      startTime: Date.now(),
      executed: false,
      isActive: true,
      _timeout: null
    };

    this._startTimeout(timerObj);
    this.timers.set(id, timerObj);
    this._activeTimers++;
    
    this.emit('timerStart', { id, type: 'timeout' });
    return timerObj;
  }

  /**
   * Create immediate timer
   */
  createImmediate(callback, options = {}) {
    this._checkLimit();
    
    const id = ++this.timerId;
    const timerObj = {
      id,
      type: 'immediate',
      callback,
      options,
      startTime: Date.now(),
      executed: false,
      isActive: true,
      _immediate: null
    };

    this._startImmediate(timerObj);
    this.timers.set(id, timerObj);
    this._activeTimers++;
    
    this.emit('timerStart', { id, type: 'immediate' });
    return timerObj;
  }

  /**
   * Clear timer by object or id
   */
  clear(timer) {
    const id = typeof timer === 'object' ? timer.id : timer;
    const timerObj = this.timers.get(id);
    
    if (!timerObj || !timerObj.isActive) {
      return false;
    }

    this._clearTimer(timerObj);
    timerObj.isActive = false;
    this._activeTimers--;
    this.timers.delete(id);
    
    this.emit('timerClear', { id, type: timerObj.type });
    return true;
  }

  /**
   * Clear all timers
   */
  clearAll() {
    const timers = Array.from(this.timers.values());
    timers.forEach(timer => this._clearTimer(timer));
    
    const count = this.timers.size;
    this.timers.clear();
    this._activeTimers = 0;
    
    this.emit('clearAll', { count });
    return count;
  }

  /**
   * Pause a timer
   */
  pause(timer) {
    const id = typeof timer === 'object' ? timer.id : timer;
    const timerObj = this.timers.get(id);
    
    if (!timerObj || !timerObj.isActive || timerObj.paused) {
      return false;
    }

    if (timerObj.type === 'interval') {
      clearInterval(timerObj._interval);
      timerObj._interval = null;
      timerObj.paused = true;
      timerObj.pauseTime = Date.now();
      
      this.emit('timerPause', { id, type: 'interval' });
      return true;
    }
    
    return false;
  }

  /**
   * Resume a paused timer
   */
  resume(timer) {
    const id = typeof timer === 'object' ? timer.id : timer;
    const timerObj = this.timers.get(id);
    
    if (!timerObj || !timerObj.isActive || !timerObj.paused) {
      return false;
    }

    if (timerObj.type === 'interval') {
      const elapsed = Date.now() - timerObj.pauseTime;
      const remaining = timerObj.interval - (elapsed % timerObj.interval);
      
      timerObj._interval = setInterval(() => {
        this._executeInterval(timerObj);
      }, remaining);
      
      timerObj.paused = false;
      
      this.emit('timerResume', { id, type: 'interval' });
      return true;
    }
    
    return false;
  }

  /**
   * Get timer stats
   */
  getStats() {
    return {
      total: this.timers.size,
      active: this._activeTimers,
      types: {
        interval: Array.from(this.timers.values()).filter(t => t.type === 'interval').length,
        timeout: Array.from(this.timers.values()).filter(t => t.type === 'timeout').length,
        immediate: Array.from(this.timers.values()).filter(t => t.type === 'immediate').length
      }
    };
  }

  /**
   * Check if timer is active
   */
  isActive(timer) {
    const id = typeof timer === 'object' ? timer.id : timer;
    const timerObj = this.timers.get(id);
    return timerObj ? timerObj.isActive : false;
  }

  /**
   * Get timer by id
   */
  getTimer(id) {
    return this.timers.get(id) || null;
  }

  /**
   * Private: Start interval
   */
  _startInterval(timer) {
    timer._interval = setInterval(() => {
      if (!timer.paused) {
        this._executeInterval(timer);
      }
    }, timer.interval);
  }

  /**
   * Private: Execute interval
   */
  _executeInterval(timer) {
    if (!timer.isActive) return;
    
    timer.executions++;
    
    try {
      timer.callback({
        timerId: timer.id,
        executions: timer.executions,
        context: timer.options.context || {}
      });
    } catch (error) {
      this.emit('error', { timerId: timer.id, error });
    }

    if (timer.executions >= timer.maxExecutions) {
      this.clear(timer);
    }
  }

  /**
   * Private: Start timeout
   */
  _startTimeout(timer) {
    timer._timeout = setTimeout(() => {
      if (timer.isActive && !timer.executed) {
        timer.executed = true;
        try {
          timer.callback({
            timerId: timer.id,
            context: timer.options.context || {}
          });
        } catch (error) {
          this.emit('error', { timerId: timer.id, error });
        }
        this.clear(timer);
      }
    }, timer.delay);
  }

  /**
   * Private: Start immediate
   */
  _startImmediate(timer) {
    timer._immediate = setImmediate(() => {
      if (timer.isActive && !timer.executed) {
        timer.executed = true;
        try {
          timer.callback({
            timerId: timer.id,
            context: timer.options.context || {}
          });
        } catch (error) {
          this.emit('error', { timerId: timer.id, error });
        }
        this.clear(timer);
      }
    });
  }

  /**
   * Private: Clear timer
   */
  _clearTimer(timer) {
    if (timer._interval) {
      clearInterval(timer._interval);
      timer._interval = null;
    }
    if (timer._timeout) {
      clearTimeout(timer._timeout);
      timer._timeout = null;
    }
    if (timer._immediate) {
      clearImmediate(timer._immediate);
      timer._immediate = null;
    }
  }

  /**
   * Private: Check timer limit
   */
  _checkLimit() {
    if (this.timers.size >= this.options.maxTimers) {
      throw new Error(`Maximum timer limit (${this.options.maxTimers}) reached`);
    }
  }
}

module.exports = TimerManager;
