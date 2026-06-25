class TimerHook {
    constructor(logger) {
        this.logger = logger;
        this.hooks = new Map();
        this.hookOrder = new Map();
        this.isEnabled = true;
    }

    /**
     * Register a hook
     */
    register(hookName, callback, order = 0) {
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
            this.hookOrder.set(hookName, []);
        }

        const hooks = this.hooks.get(hookName);
        const orders = this.hookOrder.get(hookName);
        
        hooks.push(callback);
        orders.push(order);

        // Sort by order
        const combined = hooks.map((hook, index) => ({ hook, order: orders[index] }));
        combined.sort((a, b) => a.order - b.order);
        
        this.hooks.set(hookName, combined.map(item => item.hook));
        this.hookOrder.set(hookName, combined.map(item => item.order));

        this.logger.debug(`Hook "${hookName}" registered with order ${order}`);
        return this;
    }

    /**
     * Trigger a hook
     */
    async trigger(hookName, data = {}) {
        if (!this.isEnabled) return;
        
        const hooks = this.hooks.get(hookName);
        if (!hooks || hooks.length === 0) return;

        this.logger.debug(`Triggering hook "${hookName}" with ${hooks.length} callbacks`);

        for (const hook of hooks) {
            try {
                await hook(data);
            } catch (error) {
                this.logger.error(`Error in hook "${hookName}"`, error);
            }
        }
    }

    /**
     * Remove a hook
     */
    remove(hookName, callback) {
        if (!this.hooks.has(hookName)) return false;

        const hooks = this.hooks.get(hookName);
        const index = hooks.indexOf(callback);
        
        if (index !== -1) {
            hooks.splice(index, 1);
            this.hookOrder.get(hookName).splice(index, 1);
            this.logger.debug(`Hook "${hookName}" removed`);
            return true;
        }
        
        return false;
    }

    /**
     * Remove all hooks with a name
     */
    removeAll(hookName) {
        const deleted = this.hooks.delete(hookName);
        if (deleted) {
            this.hookOrder.delete(hookName);
            this.logger.info(`All hooks "${hookName}" removed`);
        }
        return deleted;
    }

    /**
     * Clear all hooks
     */
    clearAll() {
        const count = this.hooks.size;
        this.hooks.clear();
        this.hookOrder.clear();
        this.logger.info(`Cleared ${count} hook types`);
        return count;
    }

    /**
     * Enable hooks
     */
    enable() {
        this.isEnabled = true;
        this.logger.info('Hooks enabled');
        return this;
    }

    /**
     * Disable hooks
     */
    disable() {
        this.isEnabled = false;
        this.logger.info('Hooks disabled');
        return this;
    }

    /**
     * Get all registered hooks
     */
    getAllHooks() {
        const result = {};
        for (const [name, hooks] of this.hooks) {
            result[name] = {
                count: hooks.length,
                hooks: hooks.map(h => h.name || 'anonymous')
            };
        }
        return result;
    }

    /**
     * Check if hook exists
     */
    hasHook(hookName) {
        return this.hooks.has(hookName) && this.hooks.get(hookName).length > 0;
    }
}

module.exports = TimerHook;
