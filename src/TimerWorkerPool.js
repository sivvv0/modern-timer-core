const { Worker } = require('worker_threads');
const EventEmitter = require('events');
const path = require('path');

class TimerWorkerPool extends EventEmitter {
    constructor(size = 4, logger) {
        super();
        this.size = size;
        this.logger = logger;
        this.workers = [];
        this.tasks = new Map();
        this.taskQueue = [];
        this.availableWorkers = [];
        this.isInitialized = false;
        this.stats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            activeTasks: 0,
            queueLength: 0
        };
    }

    /**
     * Initialize worker pool
     */
    initialize() {
        if (this.isInitialized) return this;

        for (let i = 0; i < this.size; i++) {
            this._createWorker(i);
        }

        this.isInitialized = true;
        this.logger.info(`Worker pool initialized with ${this.size} workers`);
        return this;
    }

    /**
     * Create a worker
     */
    _createWorker(index) {
        // Create worker
        const worker = new Worker(path.join(__dirname, 'worker.js'), {
            workerData: { index }
        });

        worker.on('message', (result) => {
            this._handleWorkerResult(worker, result);
        });

        worker.on('error', (error) => {
            this.logger.error(`Worker ${index} error`, error);
            this.emit('workerError', { index, error });
            this._restartWorker(worker, index);
        });

        worker.on('exit', (code) => {
            this.logger.warn(`Worker ${index} exited with code ${code}`);
            this.emit('workerExit', { index, code });
            this._restartWorker(worker, index);
        });

        this.workers.push(worker);
        this.availableWorkers.push(worker);
        return worker;
    }

    /**
     * Restart a worker
     */
    _restartWorker(worker, index) {
        const workerIndex = this.workers.indexOf(worker);
        if (workerIndex !== -1) {
            this.workers.splice(workerIndex, 1);
        }

        const availIndex = this.availableWorkers.indexOf(worker);
        if (availIndex !== -1) {
            this.availableWorkers.splice(availIndex, 1);
        }

        // Remove from tasks
        for (const [id, task] of this.tasks) {
            if (task.worker === worker) {
                this.tasks.delete(id);
                this._requeueTask(id);
            }
        }

        // Create new worker
        setTimeout(() => {
            this._createWorker(index);
            this.logger.info(`Worker ${index} restarted`);
        }, 1000);
    }

    /**
     * Execute a task in a worker
     */
    async execute(fn, args = []) {
        if (!this.isInitialized) {
            throw new Error('Worker pool not initialized');
        }

        const taskId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Check if worker available
        if (this.availableWorkers.length > 0) {
            return this._assignTask(taskId, fn, args);
        } else {
            // Queue the task
            return new Promise((resolve, reject) => {
                this.taskQueue.push({
                    id: taskId,
                    fn: fn.toString(),
                    args,
                    resolve,
                    reject,
                    queuedAt: Date.now()
                });
                this.stats.queueLength = this.taskQueue.length;
                this.logger.debug(`Task ${taskId} queued (queue length: ${this.taskQueue.length})`);
            });
        }
    }

    /**
     * Assign a task to a worker
     */
    _assignTask(taskId, fn, args) {
        return new Promise((resolve, reject) => {
            const worker = this.availableWorkers.pop();
            if (!worker) {
                throw new Error('No workers available');
            }

            const task = {
                id: taskId,
                fn: fn.toString(),
                args,
                worker,
                resolve,
                reject,
                startedAt: Date.now()
            };

            this.tasks.set(taskId, task);
            this.stats.totalTasks++;
            this.stats.activeTasks++;
            this.stats.queueLength = this.taskQueue.length;

            // Send to worker
            worker.postMessage({
                type: 'execute',
                taskId,
                fn: fn.toString(),
                args
            });

            this.logger.debug(`Task ${taskId} assigned to worker`);
            this.emit('taskAssigned', { taskId, workerId: this.workers.indexOf(worker) });
        });
    }

    /**
     * Handle worker result
     */
    _handleWorkerResult(worker, result) {
        const { taskId, success, data, error } = result;
        const task = this.tasks.get(taskId);

        if (!task) {
            this.logger.warn(`Task ${taskId} not found`);
            return;
        }

        // Remove task
        this.tasks.delete(taskId);
        this.stats.activeTasks--;

        // Add worker back to available pool
        this.availableWorkers.push(worker);

        if (success) {
            this.stats.completedTasks++;
            task.resolve(data);
            this.emit('taskCompleted', { taskId, data });
            this.logger.debug(`Task ${taskId} completed successfully`);
        } else {
            this.stats.failedTasks++;
            task.reject(new Error(error));
            this.emit('taskFailed', { taskId, error });
            this.logger.error(`Task ${taskId} failed: ${error}`);
        }

        // Process next queued task
        if (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
            const nextTask = this.taskQueue.shift();
            this.stats.queueLength = this.taskQueue.length;
            
            this._assignTask(
                nextTask.id,
                eval('(' + nextTask.fn + ')'), // Reconstruct function
                nextTask.args
            ).then(nextTask.resolve).catch(nextTask.reject);
        }
    }

    /**
     * Requeue a task
     */
    _requeueTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) return;

        this.tasks.delete(taskId);
        this.stats.activeTasks--;

        // Add back to queue
        this.taskQueue.unshift({
            id: taskId,
            fn: task.fn,
            args: task.args,
            resolve: task.resolve,
            reject: task.reject,
            queuedAt: Date.now(),
            requeued: true
        });
        this.stats.queueLength = this.taskQueue.length;
        
        this.logger.warn(`Task ${taskId} requeued`);
        this.emit('taskRequeued', { taskId });
    }

    /**
     * Get pool statistics
     */
    getStats() {
        return {
            ...this.stats,
            workerCount: this.workers.length,
            availableWorkers: this.availableWorkers.length,
            activeTasks: this.tasks.size,
            queueLength: this.taskQueue.length,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Check if pool is enabled
     */
    isEnabled() {
        return this.isInitialized && this.workers.length > 0;
    }

    /**
     * Clear the task queue
     */
    clearQueue() {
        const count = this.taskQueue.length;
        this.taskQueue = [];
        this.stats.queueLength = 0;
        
        // Reject all queued tasks
        for (const task of this.taskQueue) {
            task.reject(new Error('Queue cleared'));
        }
        
        this.logger.info(`Cleared ${count} queued tasks`);
        return count;
    }

    /**
     * Destroy worker pool
     */
    destroy() {
        this.isInitialized = false;
        
        // Terminate all workers
        for (const worker of this.workers) {
            worker.terminate();
        }
        
        this.workers = [];
        this.availableWorkers = [];
        this.tasks.clear();
        this.taskQueue = [];
        
        this.logger.info('Worker pool destroyed');
        this.removeAllListeners();
    }
}

module.exports = TimerWorkerPool;
