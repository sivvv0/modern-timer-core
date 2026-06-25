const ModernTimerCore = require('../src/index');

describe('ModernTimerCore', () => {
  let client;
  let timerCore;

  beforeEach(() => {
    // Mock Discord.js client
    client = {
      constructor: {
        version: '14.14.1',
        name: 'Client'
      },
      guilds: {
        fetch: jest.fn()
      },
      on: jest.fn(),
      once: jest.fn(),
      login: jest.fn()
    };
    
    timerCore = new ModernTimerCore(client, {
      enableLogging: false,
      enableMetrics: false,
      enablePersistence: false,
      enableGroups: true,
      maxTimers: 100
    });
    
    timerCore.initialize();
  });

  afterEach(() => {
    if (timerCore) {
      timerCore.destroy();
    }
    jest.clearAllTimers();
  });

  describe('Timer Creation', () => {
    test('should create a timeout timer', () => {
      const callback = jest.fn();
      const timer = timerCore.createTimeout(callback, 100);
      
      expect(timer).toBeDefined();
      expect(timer.id).toBeDefined();
      expect(timer.type).toBe('timeout');
      expect(timer.isActive).toBe(true);
    });

    test('should create an interval timer', () => {
      const callback = jest.fn();
      const timer = timerCore.createInterval(callback, 100);
      
      expect(timer).toBeDefined();
      expect(timer.id).toBeDefined();
      expect(timer.type).toBe('interval');
      expect(timer.isActive).toBe(true);
    });

    test('should create an immediate timer', () => {
      const callback = jest.fn();
      const timer = timerCore.createImmediate(callback);
      
      expect(timer).toBeDefined();
      expect(timer.id).toBeDefined();
      expect(timer.type).toBe('immediate');
      expect(timer.isActive).toBe(true);
    });

    test('should create a timer with metadata', () => {
      const callback = jest.fn();
      const metadata = { key: 'value', user: 'test' };
      const timer = timerCore.createTimeout(callback, 100, { metadata });
      
      expect(timer.metadata).toEqual(metadata);
    });

    test('should create a timer with tags', () => {
      const callback = jest.fn();
      const tags = ['test', 'important'];
      const timer = timerCore.createTimeout(callback, 100, { tags });
      
      expect(timer.tags).toEqual(tags);
    });

    test('should create a timer with group', () => {
      const callback = jest.fn();
      const group = 'test-group';
      const timer = timerCore.createTimeout(callback, 100, { group });
      
      expect(timer.group).toBe(group);
    });

    test('should create a timer with priority', () => {
      const callback = jest.fn();
      const timer = timerCore.createTimeout(callback, 100, { priority: 'high' });
      
      expect(timer.priority).toBe('high');
    });

    test('should create a timer with retry', () => {
      const callback = jest.fn();
      const timer = timerCore.createReliableTimer(callback, 100, 3);
      
      expect(timer.retry).toBe(true);
      expect(timer.retryCount).toBe(3);
    });
  });

  describe('Timer Management', () => {
    test('should clear a timer', () => {
      const callback = jest.fn();
      const timer = timerCore.createTimeout(callback, 1000);
      
      const result = timerCore.clearTimer(timer.id);
      expect(result).toBe(true);
      
      const timers = timerCore.getAllTimers();
      expect(timers).not.toContainEqual(expect.objectContaining({ id: timer.id }));
    });

    test('should clear all timers', () => {
      const callback = jest.fn();
      timerCore.createTimeout(callback, 1000);
      timerCore.createTimeout(callback, 2000);
      timerCore.createTimeout(callback, 3000);
      
      const count = timerCore.clearAllTimers();
      expect(count).toBe(3);
      
      const timers = timerCore.getAllTimers();
      expect(timers).toHaveLength(0);
    });

    test('should pause and resume a timer', () => {
      const callback = jest.fn();
      const timer = timerCore.createInterval(callback, 100);
      
      const paused = timerCore.pauseTimer(timer.id);
      expect(paused).toBe(true);
      
      const timers = timerCore.getAllTimers();
      const pausedTimer = timers.find(t => t.id === timer.id);
      expect(pausedTimer.isPaused).toBe(true);
      
      const resumed = timerCore.resumeTimer(timer.id);
      expect(resumed).toBe(true);
    });

    test('should clear timers by group', () => {
      const callback = jest.fn();
      timerCore.createTimeout(callback, 1000, { group: 'test1' });
      timerCore.createTimeout(callback, 2000, { group: 'test1' });
      timerCore.createTimeout(callback, 3000, { group: 'test2' });
      
      const count = timerCore.clearGroup('test1');
      expect(count).toBe(2);
      
      const timers = timerCore.getAllTimers();
      expect(timers).toHaveLength(1);
      expect(timers[0].group).toBe('test2');
    });

    test('should clear timers by tag', () => {
      const callback = jest.fn();
      timerCore.createTimeout(callback, 1000, { tags: ['tag1', 'common'] });
      timerCore.createTimeout(callback, 2000, { tags: ['tag2', 'common'] });
      timerCore.createTimeout(callback, 3000, { tags: ['tag3'] });
      
      const count = timerCore.clearByTag('common');
      expect(count).toBe(2);
      
      const timers = timerCore.getAllTimers();
      expect(timers).toHaveLength(1);
      expect(timers[0].tags).toEqual(['tag3']);
    });
  });

  describe('Timer Query', () => {
    test('should get all timers', () => {
      const callback = jest.fn();
      timerCore.createTimeout(callback, 1000);
      timerCore.createTimeout(callback, 2000);
      timerCore.createTimeout(callback, 3000);
      
      const timers = timerCore.getAllTimers();
      expect(timers).toHaveLength(3);
    });

    test('should get timers by group', () => {
      const callback = jest.fn();
      timerCore.createTimeout(callback, 1000, { group: 'test1' });
      timerCore.createTimeout(callback, 2000, { group: 'test1' });
      timerCore.createTimeout(callback, 3000, { group: 'test2' });
      
      const timers = timerCore.getTimersByGroup('test1');
      expect(timers).toHaveLength(2);
      timers.forEach(t => expect(t.group).toBe('test1'));
    });

    test('should get timers by tag', () => {
      const callback = jest.fn();
      timerCore.createTimeout(callback, 1000, { tags: ['tag1'] });
      timerCore.createTimeout(callback, 2000, { tags: ['tag1', 'tag2'] });
      timerCore.createTimeout(callback, 3000, { tags: ['tag2'] });
      
      const timers = timerCore.getTimersByTag('tag1');
      expect(timers).toHaveLength(2);
      timers.forEach(t => expect(t.tags).toContain('tag1'));
    });
  });

  describe('Statistics', () => {
    test('should get statistics', () => {
      const callback = jest.fn();
      timerCore.createTimeout(callback, 1000);
      timerCore.createTimeout(callback, 2000);
      timerCore.createTimeout(callback, 3000);
      
      const stats = timerCore.getStats();
      expect(stats.totalCreated).toBe(3);
      expect(stats.active).toBe(3);
      expect(stats.total).toBe(3);
    });

    test('should track execution statistics', () => {
      const callback = jest.fn();
      
      // Create timer with fake timers
      const timer = timerCore.createTimeout(() => {
        callback();
      }, 1000);
      
      // Ensure timer is active
      expect(timer.isActive).toBe(true);
      expect(timerCore.getAllTimers()).toHaveLength(1);
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      // Verify callback was called
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Check stats - the timer should have executed
      const stats = timerCore.getStats();
      expect(stats.totalExecuted).toBe(1);
    });
  });

  describe('Configuration', () => {
    test('should create timer with custom configuration', () => {
      const callback = jest.fn();
      const timer = timerCore.createTimer({
        callback,
        delay: 500,
        type: 'timeout',
        priority: 'high',
        group: 'custom',
        tags: ['config', 'test'],
        metadata: { version: '1.0.0' }
      });
      
      expect(timer.priority).toBe('high');
      expect(timer.group).toBe('custom');
      expect(timer.tags).toEqual(['config', 'test']);
      expect(timer.metadata).toEqual({ version: '1.0.0' });
    });

    test('should handle maximum timers limit', () => {
      const callback = jest.fn();
      const maxTimers = 5;
      
      const limitedCore = new ModernTimerCore(client, {
        maxTimers,
        enableLogging: false
      });
      limitedCore.initialize();
      
      for (let i = 0; i < maxTimers; i++) {
        limitedCore.createTimeout(callback, 1000);
      }
      
      expect(() => {
        limitedCore.createTimeout(callback, 1000);
      }).toThrow(`Maximum timer limit reached (${maxTimers})`);
      
      limitedCore.destroy();
    });
  });

  describe('Destroy', () => {
    test('should destroy timer core', () => {
      const callback = jest.fn();
      timerCore.createTimeout(callback, 1000);
      timerCore.createTimeout(callback, 2000);
      
      timerCore.destroy();
      
      const timers = timerCore.getAllTimers();
      expect(timers).toHaveLength(0);
    });
  });

  describe('Version Detection', () => {
    test('should detect Discord.js v14', () => {
      const v14Client = {
        constructor: {
          version: '14.14.1',
          name: 'Client'
        },
        guilds: {
          fetch: jest.fn()
        }
      };
      
      const core = new ModernTimerCore(v14Client);
      expect(core.discordVersion).toBe('v14');
      core.destroy();
    });

    test('should detect Discord.js v13', () => {
      const v13Client = {
        constructor: {
          version: '13.12.0',
          name: 'Client'
        },
        guilds: {
          array: jest.fn()
        }
      };
      
      const core = new ModernTimerCore(v13Client);
      expect(core.discordVersion).toBe('v13');
      core.destroy();
    });
  });
});
