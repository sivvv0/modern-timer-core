import { Client } from 'discord.js';

// Core Options
export interface ModernTimerCoreOptions {
    autoCleanup?: boolean;
    cleanupInterval?: number;
    maxTimers?: number;
    enableScheduler?: boolean;
    enablePersistence?: boolean;
    persistencePath?: string;
    enableMetrics?: boolean;
    metricsInterval?: number;
    enableRetry?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    enableGroups?: boolean;
    enableRateLimiting?: boolean;
    maxRateLimit?: number;
    rateLimitWindow?: number;
    enableQueue?: boolean;
    queueConcurrency?: number;
    enableWorkerPool?: boolean;
    workerPoolSize?: number;
    enableHooks?: boolean;
    enableLogging?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none';
}

// Timer Configuration
export interface TimerConfig {
    callback: Function;
    delay?: number;
    type?: 'interval' | 'timeout' | 'immediate' | 'cron' | 'conditional';
    args?: any[];
    metadata?: Record<string, any>;
    version?: string;
    client?: Client | null;
    priority?: 'high' | 'normal' | 'low';
    group?: string | null;
    retry?: boolean;
    retryCount?: number;
    timeout?: number | null;
    debounce?: number | false;
    throttle?: number | false;
    runImmediately?: boolean;
    cron?: string | null;
    condition?: Function | null;
    onSuccess?: Function | null;
    onError?: Function | null;
    onComplete?: Function | null;
    persistent?: boolean;
    tags?: string[];
    context?: Record<string, any>;
    concurrency?: number;
    rateLimit?: number | null;
    id?: number | null;
}

// Timer Data
export interface TimerData {
    id: number;
    type: string;
    delay: number;
    createdAt: number;
    metadata: Record<string, any>;
    version: string;
    client: Client | null;
    isActive: boolean;
    isPaused: boolean;
    args: any[];
    priority: string;
    group: string | null;
    retry: boolean;
    retryCount: number;
    timeout: number | null;
    debounce: number | false;
    throttle: number | false;
    runImmediately: boolean;
    cron: string | null;
    condition: Function | null;
    onSuccess: Function | null;
    onError: Function | null;
    onComplete: Function | null;
    persistent: boolean;
    tags: string[];
    context: Record<string, any>;
    concurrency: number;
    rateLimit: number | null;
    executions: number;
    lastExecution: number | null;
    nextExecution: number | null;
    errors: number;
    retries: number;
    startTime: number;
    totalExecutionTime: number;
    lastExecutionTime: number;
    executionHistory: ExecutionHistoryEntry[];
    timer?: NodeJS.Timeout | NodeJS.Immediate | any;
}

// Execution History
export interface ExecutionHistoryEntry {
    timestamp: number;
    executionTime: number;
    success: boolean;
    result?: any;
    error?: string;
}

// Timer Statistics
export interface TimerStats {
    totalCreated: number;
    totalCleared: number;
    totalExecuted: number;
    totalErrors: number;
    totalRetries: number;
    totalFailed: number;
    totalPaused: number;
    totalResumed: number;
    active: number;
    paused: number;
    intervals: number;
    timeouts: number;
    immediates: number;
    cron: number;
    conditional: number;
    byGroup: Map<string, number>;
    byPriority: Map<string, number>;
    executionTime: number[];
    memoryUsage: any[];
    uptime: number;
    startTime: number;
    total: number;
    versionStats: VersionStats;
    metrics: any | null;
    queue: any | null;
    workerPool: any | null;
}

// Version Statistics
export interface VersionStats {
    v13: number;
    v14: number;
}

// Group Statistics
export interface GroupStats {
    name: string;
    timerCount: number;
    executionCount: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    isPaused: boolean;
    createdAt: number;
    metadata: Record<string, any>;
    timers: number[];
}

// Main Class
declare class ModernTimerCore {
    constructor(client: Client, options?: ModernTimerCoreOptions);
    
    initialize(): this;
    
    createTimer(config: TimerConfig): TimerData;
    createInterval(callback: Function, delay: number, options?: Partial<TimerConfig>): TimerData;
    createTimeout(callback: Function, delay: number, options?: Partial<TimerConfig>): TimerData;
    createImmediate(callback: Function, options?: Partial<TimerConfig>): TimerData;
    createCron(callback: Function, cronExpression: string, options?: Partial<TimerConfig>): TimerData;
    createConditional(callback: Function, condition: Function, options?: Partial<TimerConfig>): TimerData;
    createReliableTimer(callback: Function, delay: number, retryCount?: number, options?: Partial<TimerConfig>): TimerData;
    createDebouncedTimer(callback: Function, delay: number, options?: Partial<TimerConfig>): TimerData;
    createThrottledTimer(callback: Function, delay: number, options?: Partial<TimerConfig>): TimerData;
    
    clearTimer(timerId: number): boolean;
    clearGroup(groupName: string): number;
    clearByTag(tag: string): number;
    clearAllTimers(): number;
    
    getAllTimers(): TimerData[];
    getTimersByGroup(groupName: string): TimerData[];
    getTimersByTag(tag: string): TimerData[];
    
    getStats(): TimerStats;
    getTimerHistory(timerId: number): ExecutionHistoryEntry[];
    
    pauseTimer(timerId: number): boolean;
    resumeTimer(timerId: number): boolean;
    
    updateTimer(timerId: number, config: Partial<TimerConfig>): boolean;
    
    exportTimers(): any;
    importTimers(timersData: any): number;
    
    destroy(): void;
}

export default ModernTimerCore;
export { TimerManager, helpers };
