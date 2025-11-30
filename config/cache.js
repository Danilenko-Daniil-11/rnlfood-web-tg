import NodeCache from 'node-cache';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Cache');

// Cache configuration
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 300; // 5 minutes default
const CHECK_PERIOD = 60; // Check for expired keys every 60 seconds

// Create cache instance
const cache = new NodeCache({
    stdTTL: CACHE_TTL,
    checkperiod: CHECK_PERIOD,
    useClones: false,
    deleteOnExpire: true,
});

// Cache keys constants
export const CACHE_KEYS = {
    // Menu and products
    MENU_ALL: 'menu:all',
    MENU_CATEGORY: (category) => `menu:category:${category}`,
    PRODUCT_DETAILS: (id) => `product:details:${id}`,

    // User data
    USER_PROFILE: (userId) => `user:profile:${userId}`,
    USER_ORDERS: (userId) => `user:orders:${userId}`,

    // Admin data
    ADMIN_STATS: 'admin:stats',
    ADMIN_ORDERS: 'admin:orders',

    // Promocodes
    PROMOCODE: (code) => `promocode:${code}`,

    // Categories
    CATEGORIES: 'categories:all',
};

// Event handlers
cache.on('set', (key, value) => {
    logger.debug(`Cache set: ${key}`);
});

cache.on('del', (key, value) => {
    logger.debug(`Cache deleted: ${key}`);
});

cache.on('expired', (key, value) => {
    logger.debug(`Cache expired: ${key}`);
});

cache.on('flush', () => {
    logger.info('Cache flushed');
});

// Cache statistics
export const getStats = () => {
    const stats = cache.getStats();
    return {
        keys: stats.keys,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hits / (stats.hits + stats.misses) * 100 || 0,
        ksize: stats.ksize,
        vsize: stats.vsize,
    };
};

// Clear cache by pattern
export const clearCachePattern = (pattern) => {
    const keys = cache.keys();
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchingKeys = keys.filter(key => regex.test(key));

    if (matchingKeys.length > 0) {
        cache.del(matchingKeys);
        logger.info(`Cleared ${matchingKeys.length} cache entries matching pattern: ${pattern}`);
    }

    return matchingKeys.length;
};

// Health check
export const healthCheck = () => {
    try {
        // Test cache functionality
        const testKey = '__health_check__';
        const testValue = { timestamp: Date.now() };

        cache.set(testKey, testValue, 10); // 10 second TTL
        const retrieved = cache.get(testKey);
        cache.del(testKey);

        if (retrieved && retrieved.timestamp === testValue.timestamp) {
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } else {
            return { status: 'unhealthy', error: 'Cache read/write test failed', timestamp: new Date().toISOString() };
        }
    } catch (error) {
        logger.error('Cache health check failed:', error);
        return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
};

// Graceful shutdown
export const closeCache = () => {
    logger.info('Closing cache...');
    cache.flushAll();
    cache.close();
    logger.info('Cache closed');
};

export default cache;
