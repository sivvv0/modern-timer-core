const ModernTimerCore = require('../src/index');

// Mock Discord.js client for example
const mockClient = {
    constructor: {
        version: '14.14.1',
        name: 'Client'
    },
    guilds: {
        fetch: () => {}
    }
};

// Create timer core
const timerCore = new ModernTimerCore(mockClient, {
    enableLogging: true,
    logLevel: 'debug',
    enableMetrics: true,
    enableGroups: true,
    enablePersistence: false,
    maxTimers: 100
});

// Initialize
timerCore.initialize();

console.log('=== Basic Timer Examples ===\n');

// 1. Simple interval
console.log('1. Creating interval timer...');
const intervalTimer = timerCore.createInterval(
    () => console.log('🔄 Interval timer executed!'),
    5000,
    { tags: ['example', 'interval'] }
);
console.log(`   Timer ID: ${intervalTimer.id}\n`);

// 2. Simple timeout
console.log('2. Creating timeout timer...');
const timeoutTimer = timerCore.createTimeout(
    () => console.log('⏰ Timeout timer executed!'),
    3000,
    { tags: ['example', 'timeout'] }
);
console.log(`   Timer ID: ${timeoutTimer.id}\n`);

// 3. Immediate timer
console.log('3. Creating immediate timer...');
const immediateTimer = timerCore.createImmediate(
    () => console.log('⚡ Immediate timer executed!'),
    { tags: ['example', 'immediate'] }
);
console.log(`   Timer ID: ${immediateTimer.id}\n`);

// 4. Timer with metadata and grouping
console.log('4. Creating timer with metadata and group...');
const metadataTimer = timerCore.createTimer({
    callback: (name) => console.log(`👋 Hello ${name}!`),
    delay: 2000,
    type: 'timeout',
    args: ['World'],
    group: 'greetings',
    tags: ['example', 'greeting'],
    metadata: {
        author: 'John Doe',
        version: '1.0.0'
    },
    priority: 'high'
});
console.log(`   Timer ID: ${metadataTimer.id}\n`);

// 5. Timer with retry
console.log('5. Creating timer with retry...');
const retryTimer = timerCore.createReliableTimer(
    () => {
        console.log('🔄 Retry timer executed!');
        // Simulate random failure
        if (Math.random() > 0.5) {
            throw new Error('Random failure');
        }
    },
    2000,
    3,
    { tags: ['example', 'retry'] }
);
console.log(`   Timer ID: ${retryTimer.id}\n`);

// 6. Cron timer
console.log('6. Creating cron timer (every 10 seconds)...');
const cronTimer = timerCore.createCron(
    () => console.log('🕐 Cron timer executed!'),
    '*/10 * * * * *',
    { tags: ['example', 'cron'] }
);
console.log(`   Timer ID: ${cronTimer.id}\n`);

// 7. Conditional timer
console.log('7. Creating conditional timer...');
let counter = 0;
const conditionalTimer = timerCore.createConditional(
    () => console.log('✅ Condition met! Timer executed!'),
    () => {
        counter++;
        console.log(`   Checking condition (${counter}/5)...`);
        return counter >= 5;
    },
    { tags: ['example', 'conditional'] }
);
console.log(`   Timer ID: ${conditionalTimer.id}\n`);

// 8. Debounced timer
console.log('8. Creating debounced timer...');
const debouncedTimer = timerCore.createDebouncedTimer(
    () => console.log('🔨 Debounced timer executed!'),
    2000,
    { tags: ['example', 'debounced'] }
);

// Simulate multiple calls
console.log('   Simulating multiple calls...');
debouncedTimer.callback();
setTimeout(() => debouncedTimer.callback(), 500);
setTimeout(() => debouncedTimer.callback(), 1000);
setTimeout(() => debouncedTimer.callback(), 1500);
console.log(`   Timer ID: ${debouncedTimer.id}\n`);

// 9. Throttled timer
console.log('9. Creating throttled timer...');
const throttledTimer = timerCore.createThrottledTimer(
    () => console.log('🚦 Throttled timer executed!'),
    3000,
    { tags: ['example', 'throttled'] }
);
console.log(`   Timer ID: ${throttledTimer.id}\n`);

// Get statistics
setTimeout(() => {
    console.log('\n=== Timer Statistics ===');
    const stats = timerCore.getStats();
    console.log(`Total Created: ${stats.totalCreated}`);
    console.log(`Active Timers: ${stats.active}`);
    console.log(`Total Executions: ${stats.totalExecuted}`);
    console.log(`Total Errors: ${stats.totalErrors}`);
    console.log(`Groups:`, Array.from(stats.byGroup.keys()));
    console.log(`Priority Distribution:`, Object.fromEntries(stats.byPriority));
    console.log(`Uptime: ${Math.floor(stats.uptime / 1000)}s\n`);
}, 8000);

// Clean up after 30 seconds
setTimeout(() => {
    console.log('\n=== Cleaning Up ===');
    console.log('Clearing all timers...');
    const cleared = timerCore.clearAllTimers();
    console.log(`Cleared ${cleared} timers`);
    
    console.log('Destroying timer core...');
    timerCore.destroy();
    console.log('Done!');
}, 30000);
