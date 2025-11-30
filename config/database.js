import pkg from 'pg';
import { createLogger } from '../utils/logger.js';

const { Pool } = pkg;
const logger = createLogger('Database');

// Database configuration
const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Event handlers
pool.on('connect', (client) => {
    logger.debug('New client connected to database');
});

pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

pool.on('remove', (client) => {
    logger.debug('Client removed from pool');
});

// Test database connection
export const testConnection = async () => {
    try {
        const client = await pool.connect();
        logger.info('Database connected successfully');
        client.release();
        return true;
    } catch (err) {
        logger.error('Database connection failed:', err);
        return false;
    }
};

// Graceful shutdown
export const closePool = async () => {
    logger.info('Closing database connection pool...');
    await pool.end();
    logger.info('Database connection pool closed');
};

// Health check
export const healthCheck = async () => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
        logger.error('Database health check failed:', error);
        return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
};

export default pool;
