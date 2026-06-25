declare module 'modern-timer-core' {
  import { Client } from 'discord.js';

  export interface TimerOptions {
    context?: any;
    immediate?: boolean;
    maxExecutions?: number;
    autoClear?: boolean;
  }

  export interface TimerConfig {
    type: 'interval' | 'timeout' | 'immediate';
    callback: Function;
    delay?: number;
    options?: TimerOptions;
  }

  export interface Timer {
    clear(): boolean;
    isActive(): boolean;
    getRemaining?(): number | null;
    getExecutions?(): number;
    pause?(): boolean;
    resume?(): boolean;
    _raw: any;
  }

  export interface TimerStats {
    total: number;
    active: number;
    types: {
      interval: number;
      timeout: number;
      immediate: number;
    };
  }

  export interface TimerManagerOptions {
    defaultInterval?: number;
    autoClear?: boolean;
    maxTimers?: number;
  }

  export class TimerManager {
    constructor(options?: TimerManagerOptions);
    createInterval(callback: Function, interval: number, options?: TimerOptions): any;
    createTimeout(callback: Function, delay: number, options?: TimerOptions): any;
    createImmediate(callback: Function, options?: TimerOptions): any;
    clear(timer: any): boolean;
    clearAll(): number;
    pause(timer: any): boolean;
    resume(timer: any): boolean;
    getStats(): TimerStats;
    isActive(timer: any): boolean;
    getTimer(id: number): any;
  }

  export class ModernTimerCore {
    constructor(options?: TimerManagerOptions);
    initialize(client: Client): ModernTimerCore;
    setInterval(callback: Function, interval: number, options?: TimerOptions): Timer;
    setTimeout(callback: Function, delay: number, options?: TimerOptions): Timer;
    setImmediate(callback: Function, options?: TimerOptions): Timer;
    createTimer(config: TimerConfig): Timer;
    clear(timer: Timer): boolean;
    clearAll(): number;
    getStats(): TimerStats;
  }

  export function createTimerManager(options?: TimerManagerOptions): ModernTimerCore;
  export default createTimerManager;
}
