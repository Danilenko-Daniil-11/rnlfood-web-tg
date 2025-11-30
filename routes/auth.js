import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import cache, { CACHE_KEYS, clearCachePattern } from '../config/cache.js';
import { authenticateToken, generateToken, setAuthCookie, clearAuthCookie, authRateLimit } from '../middleware/auth.js';

const router = express.Router();

// Apply rate limiting to auth routes
router.use('/login', authRateLimit);
router.use('/register', authRateLimit);

// Registration endpoint
router.post('/register', async (req, res) => {
    const client = await pool.connect();

    try {
        const { username, password, full_name, class_name, age, parents } = req.body;

        // Validation
        if (!username || !password || !full_name) {
            return res.status(400).json({
                error: 'Заполните все обязательные поля',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                error: 'Логин должен содержать минимум 3 символа',
                code: 'USERNAME_TOO_SHORT'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Пароль должен содержать минимум 6 символов',
                code: 'PASSWORD_TOO_SHORT'
            });
        }

        await client.query('BEGIN');

        // Check if user exists
        const userExists = await client.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userExists.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Пользователь уже существует',
                code: 'USER_EXISTS'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const userResult = await client.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
            [username, hashedPassword]
        );

        const user = userResult.rows[0];

        // Create profile
        await client.query(
            'INSERT INTO profiles (user_id, full_name, class_name, age, parents) VALUES ($1, $2, $3, $4, $5)',
            [user.id, full_name, class_name, age, parents]
        );

        // Create role
        await client.query(
            'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
            [user.id, 'user']
        );

        await client.query('COMMIT');

        // Generate token
        const token = generateToken(user);

        // Set cookie
        setAuthCookie(res, token);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name,
                class_name,
                age,
                parents,
                balance: 0.00
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Ошибка регистрации',
            code: 'REGISTRATION_ERROR'
        });
    } finally {
        client.release();
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: 'Заполните все поля',
                code: 'MISSING_CREDENTIALS'
            });
        }

        // Find user
        const userResult = await pool.query(`
            SELECT u.*, p.full_name, p.class_name, p.balance, p.age, p.parents, ur.role
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.username = $1
        `, [username]);

        if (userResult.rows.length === 0) {
            return res.status(400).json({
                error: 'Неверный логин или пароль',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const user = userResult.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({
                error: 'Неверный логин или пароль',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Generate token
        const token = generateToken(user);

        // Set cookie
        setAuthCookie(res, token);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                class_name: user.class_name,
                balance: parseFloat(user.balance),
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Ошибка входа',
            code: 'LOGIN_ERROR'
        });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({
        success: true,
        message: 'Выход выполнен успешно'
    });
});

// Get current user info endpoint
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query(`
            SELECT u.*, p.full_name, p.class_name, p.balance, p.age, p.parents, ur.role
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.id = $1
        `, [req.user.userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Пользователь не найден',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                class_name: user.class_name,
                balance: parseFloat(user.balance),
                role: user.role
            }
        });

    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({
            error: 'Ошибка получения данных пользователя',
            code: 'GET_USER_ERROR'
        });
    }
});

// Update profile endpoint
router.post('/update-profile', authenticateToken, async (req, res) => {
    try {
        const { full_name, class_name } = req.body;
        const user_id = req.user.userId;

        if (!full_name || !class_name) {
            return res.status(400).json({
                error: 'Заполните все поля',
                code: 'MISSING_FIELDS'
            });
        }

        await pool.query(`
            UPDATE profiles
            SET full_name = $1, class_name = $2, updated_at = NOW()
            WHERE user_id = $3
        `, [full_name, class_name, user_id]);

        // Clear user cache
        cache.del(CACHE_KEYS.USER_PROFILE(user_id));

        res.json({ success: true });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            error: 'Ошибка обновления профиля',
            code: 'PROFILE_UPDATE_ERROR'
        });
    }
});

export default router;
