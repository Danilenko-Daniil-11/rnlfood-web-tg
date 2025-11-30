import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import modules
import logger from './utils/logger.js';
import pool from './config/database.js';
import cache from './config/cache.js';
import {
    securityHeaders,
    compressionMiddleware,
    apiRateLimit,
    requestLogger,
    errorHandler,
    notFoundHandler,
    healthCheck
} from './middleware/security.js';
import { authenticateToken } from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';

// Telegram bot (optional)
import { Telegraf, Markup, session } from 'telegraf';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for proper IP detection (important for Render)
app.set('trust proxy', 1);

// Security and performance middleware
app.use(securityHeaders);
app.use(compressionMiddleware);
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files with caching headers
app.use(express.static(path.join(__dirname), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    lastModified: true
}));

// API Routes with rate limiting
app.use('/api', apiRateLimit);

// Health check endpoint (no auth required)
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return notFoundHandler(req, res);
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);
app.use(notFoundHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    try {
        // Close database connections
        await pool.end();
        logger.info('✅ Database connections closed');

        // Close cache
        cache.close();
        logger.info('✅ Cache closed');

        process.exit(0);
    } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit in production, just log
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Don't exit in production, just log
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

// Start server
const server = app.listen(PORT, () => {
    logger.info('🚀 ==========================================');
    logger.info(`🚀 Server is running on port ${PORT}`);
    logger.info(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    logger.info(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Using fallback'}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📈 Cache TTL: ${process.env.CACHE_TTL || 300}s`);
    logger.info('🚀 ==========================================');
});

// Handle server errors
server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

    switch (error.code) {
        case 'EACCES':
            logger.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger.error(`${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
});

// Telegram Bot initialization (optional)
let bot = null;
if (process.env.BOT_TOKEN) {
    try {
        bot = new Telegraf(process.env.BOT_TOKEN);
        bot.use(session());

        // Bot states and functionality would go here
        // (Keeping it minimal for deployment focus)

        bot.launch()
            .then(() => {
                logger.info('🤖 Telegram Bot started successfully');
            })
            .catch((error) => {
                logger.error('❌ Failed to start Telegram Bot:', error);
            });

        // Graceful bot shutdown
        process.once('SIGINT', () => {
            if (bot) {
                logger.info('🛑 Stopping Telegram Bot...');
                bot.stop('SIGINT');
            }
        });

        process.once('SIGTERM', () => {
            if (bot) {
                logger.info('🛑 Stopping Telegram Bot...');
                bot.stop('SIGTERM');
            }
        });

    } catch (error) {
        logger.error('❌ Telegram Bot initialization failed:', error);
    }
} else {
    logger.info('🤖 Telegram Bot: Not configured (BOT_TOKEN missing)');
}

export default app;
