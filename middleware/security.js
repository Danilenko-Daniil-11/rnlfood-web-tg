import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

// Security headers middleware
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.telegram.org"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});

// Compression middleware
export const compressionMiddleware = compression({
    level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
    threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
});

// Rate limiting configurations
export const createRateLimit = (options = {}) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
        max: options.max || 100, // limit each IP to 100 requests per windowMs
        message: {
            error: 'Слишком много запросов с этого IP, попробуйте позже.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/api/health' || req.path === '/health';
        }
    });
};

// Auth rate limiter (stricter)
export const authRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 auth attempts per 15 minutes
    message: {
        error: 'Слишком много попыток авторизации, попробуйте позже.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    }
});

// API rate limiter
export const apiRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requests per 15 minutes
});

// Strict rate limiter for sensitive operations
export const strictRateLimit = createRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 requests per 5 minutes
    message: {
        error: 'Слишком много запросов, попробуйте позже.',
        code: 'STRICT_RATE_LIMIT_EXCEEDED'
    }
});

// Request logging middleware
export const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            user: req.user ? req.user.username : 'anonymous'
        };

        if (res.statusCode >= 400) {
            console.error('❌ Request Error:', logData);
        } else if (process.env.NODE_ENV !== 'production') {
            console.log('📨 Request:', logData);
        }
    });

    next();
};

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
    console.error('Unhandled error:', err);

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';

    res.status(err.status || 500).json({
        error: isDevelopment ? err.message : 'Внутренняя ошибка сервера',
        code: err.code || 'INTERNAL_ERROR',
        ...(isDevelopment && { stack: err.stack })
    });
};

// 404 handler
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Маршрут не найден',
        code: 'NOT_FOUND',
        path: req.path
    });
};

// Health check middleware
export const healthCheck = (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
    });
};
