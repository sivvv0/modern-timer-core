modern-timer-core

Advanced timer management for Discord.js bots with full support for v13 and v14


A comprehensive, feature-rich timer management system designed specifically for Discord.js bots. With support for both v13 and v14, this package provides enterprise-grade timer functionality with advanced features like persistence, metrics, retry logic, and parallel execution.

✨ Features

Core Features

* ✅ Full Discord.js Support - Works seamlessly with v13 and v14
* ⏱️ All Timer Types - setInterval, setTimeout, setImmediate
* 🎯 Cron Scheduling - Advanced cron expression support
* 🔄 Conditional Timers - Execute when conditions are met
* 🧩 Timer Groups - Organize and manage timers in groups
* 🏷️ Tag System - Filter and manage timers by tags

Advanced Features

* 💾 Persistence - Save timers to disk and restore on restart
* 📊 Metrics & Monitoring - Track performance and execution statistics
* 🔁 Retry Logic - Automatic retry with exponential backoff
* 🚦 Rate Limiting - Control execution rates
* 📋 Queue System - Process timers with concurrency control
* ⚡ Worker Pool - Parallel execution for CPU-intensive tasks
* 🪝 Lifecycle Hooks - Hook into timer events
* 📝 Comprehensive Logging - Detailed logging with multiple levels

Performance Features

* 🔒 Thread-Safe - Safe for concurrent operations
* 💪 Memory Efficient - Optimized for long-running bots
* 🧹 Auto-Cleanup - Automatic cleanup of expired timers
* 📈 Performance Metrics - Track execution times and errors
* ⚡ High Performance - Optimized for thousands of timers

📦 Installation

```bash
npm install modern-timer-core
```

🚀 Quick Start

Basic Usage

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const ModernTimerCore = require('modern-timer-core');

// Create Discord client
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Initialize timer core
const timerCore = new ModernTimerCore(client, {
    enableLogging: true,
    enableMetrics: true,
    enablePersistence: true,
    persistencePath: './timer-data.json'
});

// Initialize
timerCore.initialize();

// Create a simple timer
timerCore.createTimeout(
    () => console.log('Timer executed!'),
    5000, // 5 seconds
    { tags: ['example'], group: 'test' }
);

// Create a repeating timer
timerCore.createInterval(
    () => console.log('Repeating timer!'),
    10000, // Every 10 seconds
    { priority: 'high', metadata: { purpose: 'monitoring' } }
);

// Create a cron timer
timerCore.createCron(
    () => console.log('Cron timer executed!'),
    '0 0 * * *', // Every day at midnight
    { persistent: true }
);

// Clean up when done
process.on('SIGINT', () => {
    timerCore.destroy();
    process.exit();
});
```

Discord.js Bot Example

```javascript
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const ModernTimerCore = require('modern-timer-core');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const timerCore = new ModernTimerCore(client, {
    enableLogging: true,
    enableMetrics: true,
    enablePersistence: true,
    persistencePath: './timer-data.json',
    enableQueue: true,
    queueConcurrency: 3
});

timerCore.initialize();

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content.startsWith('!remind')) {
        const args = message.content.split(' ');
        const time = parseInt(args[1]);
        const reminder = args.slice(2).join(' ');
        
        if (!time || !reminder) {
            return message.reply('Usage: !remind <seconds> <message>');
        }
        
        timerCore.createTimeout(
            async () => {
                const embed = new EmbedBuilder()
                    .setTitle('⏰ Reminder')
                    .setDescription(reminder)
                    .setColor(0x00ff00)
                    .setTimestamp();
                
                await message.author.send({ embeds: [embed] }).catch(() => {
                    message.channel.send(`<@${message.author.id}> Reminder: ${reminder}`);
                });
            },
            time * 1000,
            {
                metadata: {
                    author: message.author.id,
                    reminder: reminder,
                    channelId: message.channel.id
                },
                tags: ['reminder', message.author.id],
                group: `user_${message.author.id}`,
                persistent: true
            }
        );
        
        await message.reply(`✅ Reminder set for ${time} seconds!`);
    }
});

client.login('YOUR_BOT_TOKEN');
```

# 📚 API Reference

## Constructor

```js
new ModernTimerCore(client, options)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `client` | `Client` | Discord.js client instance |
| `options` | `Object` | Configuration options |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoCleanup` | `boolean` | `true` | Enable automatic cleanup |
| `cleanupInterval` | `number` | `60000` | Cleanup interval in ms |
| `maxTimers` | `number` | `1000` | Maximum number of timers |
| `enableScheduler` | `boolean` | `true` | Enable cron/conditional scheduling |
| `enablePersistence` | `boolean` | `false` | Enable timer persistence |
| `persistencePath` | `string` | `'./timers.json'` | Path for persistence file |
| `enableMetrics` | `boolean` | `true` | Enable performance metrics |
| `metricsInterval` | `number` | `60000` | Metrics collection interval |
| `enableRetry` | `boolean` | `true` | Enable retry mechanism |
| `maxRetries` | `number` | `3` | Maximum retry attempts |
| `retryDelay` | `number` | `1000` | Base retry delay in ms |
| `enableGroups` | `boolean` | `true` | Enable timer groups |
| `enableRateLimiting` | `boolean` | `false` | Enable rate limiting |
| `maxRateLimit` | `number` | `100` | Maximum requests per window |
| `rateLimitWindow` | `number` | `60000` | Rate limit window in ms |
| `enableQueue` | `boolean` | `false` | Enable queue system |
| `queueConcurrency` | `number` | `5` | Concurrent queue processing |
| `enableWorkerPool` | `boolean` | `false` | Enable worker pool |
| `workerPoolSize` | `number` | `4` | Number of workers |
| `enableHooks` | `boolean` | `true` | Enable lifecycle hooks |
| `enableLogging` | `boolean` | `true` | Enable logging |
| `logLevel` | `string` | `'info'` | Log level: debug, info, warn, error, none |

## Methods

### Timer Creation

| Method | Description |
|--------|-------------|
| `createTimer(config)` | Create a timer with full configuration |
| `createInterval(callback, delay, options)` | Create an interval timer |
| `createTimeout(callback, delay, options)` | Create a timeout timer |
| `createImmediate(callback, options)` | Create an immediate timer |
| `createCron(callback, cronExpression, options)` | Create a cron timer |
| `createConditional(callback, condition, options)` | Create a conditional timer |
| `createReliableTimer(callback, delay, retryCount, options)` | Create a timer with retry logic |
| `createDebouncedTimer(callback, delay, options)` | Create a debounced timer |
| `createThrottledTimer(callback, delay, options)` | Create a throttled timer |

### Timer Management

| Method | Description |
|--------|-------------|
| `clearTimer(timerId)` | Clear a specific timer |
| `clearGroup(groupName)` | Clear all timers in a group |
| `clearByTag(tag)` | Clear all timers with a tag |
| `clearAllTimers()` | Clear all timers |
| `pauseTimer(timerId)` | Pause a timer |
| `resumeTimer(timerId)` | Resume a paused timer |
| `updateTimer(timerId, config)` | Update timer configuration |

### Query Methods

| Method | Description |
|--------|-------------|
| `getAllTimers()` | Get all active timers |
| `getTimersByGroup(groupName)` | Get timers by group |
| `getTimersByTag(tag)` | Get timers by tag |
| `getTimerHistory(timerId)` | Get execution history |
| `getStats()` | Get timer statistics |

### Utility Methods

| Method | Description |
|--------|-------------|
| `exportTimers()` | Export timer configurations |
| `importTimers(timersData)` | Import timer configurations |
| `destroy()` | Clean up resources |

Timer Configuration

```javascript
const timerConfig = {
    // Required
    callback: Function,    // Function to execute
    
    // Basic Options
    delay: 5000,          // Delay in milliseconds
    type: 'timeout',      // 'interval', 'timeout', 'immediate', 'cron', 'conditional'
    args: [],             // Arguments for callback
    metadata: {},         // Custom metadata
    
    // Advanced Options
    priority: 'normal',   // 'high', 'normal', 'low'
    group: 'groupName',   // Timer group name
    retry: true,          // Enable retry
    retryCount: 3,        // Number of retries
    timeout: 10000,       // Max execution time
    debounce: false,      // Debounce delay in ms
    throttle: false,      // Throttle delay in ms
    runImmediately: false,// Run immediately on creation
    cron: '*/5 * * * *',  // Cron expression
    condition: () => true,// Condition function
    persistent: false,    // Persist across restarts
    tags: ['tag1'],       // Array of tags
    context: {},          // Execution context
    concurrency: 1,       // Max concurrent executions
    rateLimit: null,      // Custom rate limit
    
    // Callbacks
    onSuccess: (result, timer) => {},
    onError: (error, timer) => {},
    onComplete: (timer) => {}
};
```

Timer Object

```javascript
{
    id: 12345,                    // Unique timer ID
    type: 'timeout',              // Timer type
    delay: 5000,                  // Delay in ms
    createdAt: 1700000000000,    // Creation timestamp
    isActive: true,              // Is timer active
    isPaused: false,             // Is timer paused
    priority: 'normal',          // Priority level
    group: 'groupName',          // Group name
    tags: ['tag1'],              // Array of tags
    executions: 0,               // Execution count
    errors: 0,                   // Error count
    retries: 0,                  // Retry count
    lastExecution: null,         // Last execution timestamp
    totalExecutionTime: 0,       // Total execution time
    metadata: {},                // Custom metadata
    // ... more properties
}
```

Statistics

```javascript
{
    totalCreated: 100,           // Total timers created
    totalCleared: 50,            // Total timers cleared
    totalExecuted: 1000,         // Total executions
    totalErrors: 10,             // Total errors
    totalRetries: 5,             // Total retries
    totalFailed: 2,              // Total failures
    active: 20,                  // Active timers
    paused: 2,                   // Paused timers
    intervals: 5,                // Interval timers
    timeouts: 10,                // Timeout timers
    immediates: 2,               // Immediate timers
    cron: 2,                     // Cron timers
    conditional: 1,              // Conditional timers
    byGroup: {                   // Group distribution
        'group1': 5,
        'group2': 3
    },
    byPriority: {                // Priority distribution
        'high': 3,
        'normal': 10,
        'low': 7
    },
    versionStats: {              // Discord.js version distribution
        'v13': 5,
        'v14': 15
    },
    uptime: 3600000,             // Uptime in ms
    metrics: {                   // Performance metrics
        totalExecutionTime: 5000,
        averageExecutionTime: 5,
        minExecutionTime: 1,
        maxExecutionTime: 100
    }
}
```

🎯 Advanced Usage

Timer Groups

```javascript
// Create timers in a group
timerCore.createInterval(callback, 5000, { group: 'monitoring' });
timerCore.createTimeout(callback, 10000, { group: 'monitoring' });

// Get all timers in a group
const groupTimers = timerCore.getTimersByGroup('monitoring');

// Clear all timers in a group
timerCore.clearGroup('monitoring');
```

Tags and Filtering

```javascript
// Create timers with tags
timerCore.createTimeout(callback, 5000, { 
    tags: ['user', 'reminder', 'high-priority'] 
});

// Get timers by tag
const reminders = timerCore.getTimersByTag('reminder');

// Clear timers by tag
timerCore.clearByTag('user');
```

Persistence

```javascript
// Enable persistence
const timerCore = new ModernTimerCore(client, {
    enablePersistence: true,
    persistencePath: './timer-data.json'
});

// Timers with persistent: true will survive restarts
timerCore.createTimeout(callback, 5000, {
    persistent: true,
    metadata: { important: true }
});

// Timer data is automatically saved and restored
```

Hooks and Events

```javascript
// Register lifecycle hooks
timerCore.manager.hooks.register('onTimerCreated', (timer) => {
    console.log(`Timer ${timer.id} created`);
}, 0);

timerCore.manager.hooks.register('onTimerExecuted', (timer) => {
    console.log(`Timer ${timer.id} executed`);
}, 0);

// Listen to events
timerCore.manager.on('timerCreated', (timer) => {
    // Handle timer creation
});

timerCore.manager.on('timerError', ({ id, error }) => {
    // Handle errors
});

// All available events:
// - timerCreated
// - timerExecuted
// - timerCleared
// - timerError
// - timerPaused
// - timerResumed
// - timerUpdated
```

Queue System

```javascript
// Enable queue
const timerCore = new ModernTimerCore(client, {
    enableQueue: true,
    queueConcurrency: 5
});

// Timers will be processed through the queue
timerCore.createTimeout(callback, 5000);
timerCore.createTimeout(callback, 10000);

// Queue events
timerCore.manager.queue.on('added', ({ timerId, queueLength }) => {
    console.log(`Timer ${timerId} added to queue (${queueLength} items)`);
});

timerCore.manager.queue.on('completed', ({ timerId, duration }) => {
    console.log(`Timer ${timerId} completed in ${duration}ms`);
});
```

Worker Pool

```javascript
// Enable worker pool for parallel execution
const timerCore = new ModernTimerCore(client, {
    enableWorkerPool: true,
    workerPoolSize: 4
});

// CPU-intensive tasks will be executed in workers
timerCore.createTimeout(async () => {
    // This runs in a worker thread
    const result = await heavyComputation();
    return result;
}, 5000);
```

🔧 Configuration Examples

Minimal Configuration

```javascript
const timerCore = new ModernTimerCore(client);
timerCore.initialize();
```

Production Configuration

```javascript
const timerCore = new ModernTimerCore(client, {
    autoCleanup: true,
    cleanupInterval: 300000, // 5 minutes
    maxTimers: 5000,
    enablePersistence: true,
    persistencePath: './data/timers.json',
    enableMetrics: true,
    metricsInterval: 300000,
    enableRetry: true,
    maxRetries: 5,
    retryDelay: 1000,
    enableRateLimiting: true,
    maxRateLimit: 100,
    rateLimitWindow: 60000,
    enableQueue: true,
    queueConcurrency: 10,
    enableWorkerPool: true,
    workerPoolSize: 8,
    enableLogging: true,
    logLevel: 'info'
});
```

Development Configuration

```javascript
const timerCore = new ModernTimerCore(client, {
    enableLogging: true,
    logLevel: 'debug',
    enableMetrics: true,
    metricsInterval: 60000,
    enablePersistence: false,
    maxTimers: 100
});
```

📊 Performance Considerations

· Memory: The package is optimized for memory efficiency. Each timer uses minimal memory overhead.
· CPU: Worker pool can be used for CPU-intensive tasks to avoid blocking the event loop.
· Scalability: Supports thousands of simultaneous timers with proper resource management.
· Cleanup: Auto-cleanup prevents memory leaks from expired timers.
