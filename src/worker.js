const { parentPort, workerData } = require('worker_threads');

const workerIndex = workerData.index;

// Handle messages from parent
parentPort.on('message', async (message) => {
    const { type, taskId, fn, args } = message;

    if (type === 'execute') {
        try {
            // Execute the function
            const func = eval('(' + fn + ')');
            const result = await func(...args);
            
            // Send success result
            parentPort.postMessage({
                taskId,
                success: true,
                data: result
            });
        } catch (error) {
            // Send error
            parentPort.postMessage({
                taskId,
                success: false,
                error: error.message
            });
        }
    }
});

// Notify that worker is ready
parentPort.postMessage({
    type: 'ready',
    workerIndex
});

console.log(`Worker ${workerIndex} started`);
