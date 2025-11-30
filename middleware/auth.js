import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

// Rate limiting for auth endpoints
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        error: 'Слишком много попыток входа. Попробуйте позже.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiting for sensitive operations
export const strictRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: {
        error: 'Слишком много запросов. Попробуйте позже.',
        code: 'STRICT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limiting
export const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: {
        error: 'Слишком много запросов к API. Попробуйте позже.',
        code: 'API_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Generate JWT token
export const generateToken = (user) => {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role || 'user'
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'rnl-food-service',
        audience: 'rnl-food-users'
    });
};

// Set HTTP-only cookie with JWT token
export const setAuthCookie = (res, token) => {
    const cookieOptions = {
        httpOnly: true, // Prevents JavaScript access (XSS protection)
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // CSRF protection
        maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 86400000, // 24 hours default
        path: '/'
    };

    res.cookie('auth_token', token, cookieOptions);
};

// Clear authentication cookie
export const clearAuthCookie = (res) => {
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
};

// Middleware to authenticate JWT token from cookie or Authorization header
export const authenticateToken = (req, res, next) => {
    try {
        // Try to get token from cookie first
        let token = req.cookies?.auth_token;

        // Fallback to Authorization header if no cookie
        if (!token) {
            const authHeader = req.headers['authorization'];
            token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        }

        if (!token) {
            return res.status(401).json({
                error: 'Требуется аутентификация',
                code: 'NO_TOKEN'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', {
            issuer: 'rnl-food-service',
            audience: 'rnl-food-users'
        });

        // Add user info to request
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            // Clear expired cookie
            clearAuthCookie(res);
            return res.status(401).json({
                error: 'Сессия истекла',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Неверный токен',
                code: 'INVALID_TOKEN'
            });
        }

        console.error('Token verification error:', error);
        return res.status(500).json({
            error: 'Ошибка аутентификации',
            code: 'AUTH_ERROR'
        });
    }
};

// Middleware to require admin role
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Требуется аутентификация',
            code: 'NO_AUTH'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Недостаточно прав доступа',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
    }

    next();
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = (req, res, next) => {
    try {
        // Try to get token from cookie first
        let token = req.cookies?.auth_token;

        // Fallback to Authorization header
        if (!token) {
            const authHeader = req.headers['authorization'];
            token = authHeader && authHeader.split(' ')[1];
        }

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', {
                issuer: 'rnl-food-service',
                audience: 'rnl-food-users'
            });

            req.user = {
                userId: decoded.userId,
                username: decoded.username,
                role: decoded.role
            };
        }
    } catch (error) {
        // Silently ignore auth errors for optional auth
        console.warn('Optional auth failed:', error.message);
    }

    next();
};

// Refresh token endpoint helper
export const refreshToken = (user) => {
    return generateToken(user);
};

// Validate token without middleware (utility function)
export const validateToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', {
            issuer: 'rnl-food-service',
            audience: 'rnl-food-users'
        });
    } catch (error) {
        return null;
    }
};
