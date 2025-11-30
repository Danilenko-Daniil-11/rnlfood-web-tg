import express from 'express';
import pool from '../config/database.js';
import cache, { CACHE_KEYS, clearCachePattern } from '../config/cache.js';
import { authenticateToken, requireAdmin, strictRateLimit } from '../middleware/auth.js';

const router = express.Router();

// Apply admin middleware and rate limiting to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);
router.use(strictRateLimit);

// Get admin statistics
router.get('/stats', async (req, res) => {
    try {
        // Check cache first
        const cachedStats = cache.get(CACHE_KEYS.ADMIN_STATS);
        if (cachedStats) {
            return res.json(cachedStats);
        }

        const today = new Date().toISOString().split('T')[0];

        const [
            totalUsers,
            totalOrders,
            todayOrders,
            totalRevenue,
            todayRevenue,
            popularMeals
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users'),
            pool.query('SELECT COUNT(*) FROM orders'),
            pool.query('SELECT COUNT(*) FROM orders WHERE DATE(created_at) = $1', [today]),
            pool.query('SELECT COALESCE(SUM(final_amount), 0) as total FROM orders'),
            pool.query('SELECT COALESCE(SUM(final_amount), 0) as total FROM orders WHERE DATE(created_at) = $1', [today]),
            pool.query(`
                SELECT m.name, COUNT(oi.id) as order_count
                FROM order_items oi
                JOIN meals m ON oi.meal_id = m.id
                GROUP BY m.id, m.name
                ORDER BY order_count DESC
                LIMIT 5
            `)
        ]);

        const stats = {
            users: parseInt(totalUsers.rows[0].count),
            total_orders: parseInt(totalOrders.rows[0].count),
            today_orders: parseInt(todayOrders.rows[0].count),
            total_revenue: parseFloat(totalRevenue.rows[0].total),
            today_revenue: parseFloat(todayRevenue.rows[0].total),
            popular_meals: popularMeals.rows
        };

        // Cache the stats for 5 minutes
        cache.set(CACHE_KEYS.ADMIN_STATS, stats);

        res.json(stats);

    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({
            error: 'Ошибка загрузки статистики',
            code: 'ADMIN_STATS_ERROR'
        });
    }
});

// Get all orders for admin
router.get('/orders', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT o.*,
                   u.username,
                   p.full_name,
                   p.class_name,
                   json_agg(
                       json_build_object(
                           'name', m.name,
                           'quantity', oi.quantity,
                           'total_price', oi.total_price
                       )
                   ) as items
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN profiles p ON u.id = p.user_id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN meals m ON oi.meal_id = m.id
        `;
        let params = [];
        let paramCount = 0;

        if (status) {
            query += ` WHERE o.status = $${++paramCount}`;
            params.push(status);
        }

        query += ` GROUP BY o.id, u.username, p.full_name, p.class_name ORDER BY o.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (error) {
        console.error('Admin orders fetch error:', error);
        res.status(500).json({
            error: 'Ошибка загрузки заказов',
            code: 'ADMIN_ORDERS_ERROR'
        });
    }
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                error: 'Не указан статус',
                code: 'MISSING_STATUS'
            });
        }

        await client.query('BEGIN');

        // Get current order
        const orderResult = await client.query(`
            SELECT * FROM orders WHERE id = $1
        `, [id]);

        if (orderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: 'Заказ не найден',
                code: 'ORDER_NOT_FOUND'
            });
        }

        const order = orderResult.rows[0];

        // Handle balance adjustments based on status change
        if (status === 'cancelled' && order.status !== 'cancelled') {
            // Refund money to user
            await client.query(`
                UPDATE profiles
                SET balance = balance + $1
                WHERE user_id = $2
            `, [order.final_amount, order.user_id]);
        } else if (order.status === 'cancelled' && status !== 'cancelled') {
            // Deduct money back from user
            const userResult = await client.query('SELECT balance FROM profiles WHERE user_id = $1', [order.user_id]);
            if (userResult.rows.length === 0 || parseFloat(userResult.rows[0].balance) < order.final_amount) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'Недостаточно средств на балансе пользователя для восстановления заказа',
                    code: 'INSUFFICIENT_USER_BALANCE'
                });
            }

            await client.query(`
                UPDATE profiles
                SET balance = balance - $1
                WHERE user_id = $2
            `, [order.final_amount, order.user_id]);
        }

        // Update order status
        const updateResult = await client.query(`
            UPDATE orders
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [status, id]);

        await client.query('COMMIT');

        // Clear relevant caches
        clearCachePattern('order_history');
        cache.del(CACHE_KEYS.ADMIN_STATS);

        res.json(updateResult.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Order status update error:', error);
        res.status(500).json({
            error: 'Ошибка обновления статуса заказа',
            code: 'ORDER_STATUS_UPDATE_ERROR'
        });
    } finally {
        client.release();
    }
});

// Menu management
router.get('/meals', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, mc.name as category_name
            FROM meals m
            LEFT JOIN meal_categories mc ON m.category_id = mc.id
            ORDER BY m.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Admin meals fetch error:', error);
        res.status(500).json({
            error: 'Ошибка загрузки меню',
            code: 'ADMIN_MEALS_ERROR'
        });
    }
});

router.post('/meals', async (req, res) => {
    try {
        const { name, price, category_id, description, is_available, preparation_time, calories, is_vegetarian, is_gluten_free } = req.body;

        if (!name || !price || !category_id) {
            return res.status(400).json({
                error: 'Заполните обязательные поля',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        const result = await pool.query(`
            INSERT INTO meals (name, price, category_id, description, is_available, preparation_time, calories, is_vegetarian, is_gluten_free)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [name, price, category_id, description, is_available !== false, preparation_time, calories, is_vegetarian || false, is_gluten_free || false]);

        // Clear menu cache
        cache.del(CACHE_KEYS.MENU);

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Meal creation error:', error);
        res.status(500).json({
            error: 'Ошибка создания блюда',
            code: 'MEAL_CREATION_ERROR'
        });
    }
});

router.put('/meals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category_id, description, is_available, preparation_time, calories, is_vegetarian, is_gluten_free } = req.body;

        const result = await pool.query(`
            UPDATE meals
            SET name = $1, price = $2, category_id = $3, description = $4,
                is_available = $5, preparation_time = $6, calories = $7,
                is_vegetarian = $8, is_gluten_free = $9, updated_at = NOW()
            WHERE id = $10
            RETURNING *
        `, [name, price, category_id, description, is_available, preparation_time, calories, is_vegetarian, is_gluten_free, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Блюдо не найдено',
                code: 'MEAL_NOT_FOUND'
            });
        }

        // Clear menu cache
        cache.del(CACHE_KEYS.MENU);

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Meal update error:', error);
        res.status(500).json({
            error: 'Ошибка обновления блюда',
            code: 'MEAL_UPDATE_ERROR'
        });
    }
});

// Promo code management
router.get('/promocodes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM promocodes
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Promocodes fetch error:', error);
        res.status(500).json({
            error: 'Ошибка загрузки промокодов',
            code: 'PROMOCODES_FETCH_ERROR'
        });
    }
});

router.post('/promocodes', async (req, res) => {
    try {
        const { code, discount_percentage, discount_amount, max_uses, expires_at } = req.body;

        if (!code || (!discount_percentage && !discount_amount)) {
            return res.status(400).json({
                error: 'Заполните обязательные поля',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        const result = await pool.query(`
            INSERT INTO promocodes (code, discount_percentage, discount_amount, max_uses, expires_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [code.toUpperCase(), discount_percentage, discount_amount, max_uses, expires_at, req.user.userId]);

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Promocode creation error:', error);
        res.status(500).json({
            error: 'Ошибка создания промокода',
            code: 'PROMOCODE_CREATION_ERROR'
        });
    }
});

export default router;
