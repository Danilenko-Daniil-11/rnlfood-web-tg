import express from 'express';
import pool from '../config/database.js';
import cache, { CACHE_KEYS, clearCachePattern } from '../config/cache.js';
import { authenticateToken, strictRateLimit } from '../middleware/auth.js';

const router = express.Router();

// Apply rate limiting to order operations
router.use(strictRateLimit);

// Create order
router.post('/', authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const { items, promocode_id, total_amount, discount_amount, final_amount } = req.body;
        const user_id = req.user.userId;

        // Validation
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                error: 'Корзина пуста',
                code: 'EMPTY_CART'
            });
        }

        if (!total_amount || !final_amount) {
            return res.status(400).json({
                error: 'Неверная сумма заказа',
                code: 'INVALID_AMOUNT'
            });
        }

        await client.query('BEGIN');

        // Check user balance
        const userResult = await client.query('SELECT balance FROM profiles WHERE user_id = $1', [user_id]);
        if (userResult.rows.length === 0 || parseFloat(userResult.rows[0].balance) < final_amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Недостаточно средств на балансе',
                code: 'INSUFFICIENT_BALANCE'
            });
        }

        // Create order
        const orderResult = await client.query(`
            INSERT INTO orders (user_id, total_amount, discount_amount, final_amount, promocode_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [user_id, total_amount, discount_amount, final_amount, promocode_id]);

        const order = orderResult.rows[0];

        // Add order items
        for (const item of items) {
            await client.query(`
                INSERT INTO order_items (order_id, meal_id, quantity, unit_price, total_price)
                VALUES ($1, $2, $3, $4, $5)
            `, [order.id, item.meal_id, item.quantity, item.unit_price, item.total_price]);
        }

        // Update user balance
        await client.query(`
            UPDATE profiles
            SET balance = balance - $1
            WHERE user_id = $2
        `, [final_amount, user_id]);

        // Update promo code usage
        if (promocode_id) {
            await client.query(`
                UPDATE promocodes
                SET current_uses = current_uses + 1
                WHERE id = $1
            `, [promocode_id]);
        }

        await client.query('COMMIT');

        // Clear user cache
        cache.del(CACHE_KEYS.USER_PROFILE(user_id));
        clearCachePattern('order_history');

        res.json({
            success: true,
            order: {
                id: order.id,
                total_amount: order.total_amount,
                discount_amount: order.discount_amount,
                final_amount: order.final_amount,
                created_at: order.created_at
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Order creation error:', error);
        res.status(500).json({
            error: error.message || 'Ошибка создания заказа',
            code: 'ORDER_CREATION_ERROR'
        });
    } finally {
        client.release();
    }
});

// Get order history
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        const user_id = req.user.userId;

        // Check cache first
        const cacheKey = CACHE_KEYS.ORDER_HISTORY(user_id);
        const cachedHistory = cache.get(cacheKey);
        if (cachedHistory) {
            return res.json(cachedHistory);
        }

        const result = await pool.query(`
            SELECT o.*,
                   json_agg(
                       json_build_object(
                           'name', m.name,
                           'quantity', oi.quantity,
                           'unit_price', oi.unit_price,
                           'total_price', oi.total_price
                       )
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN meals m ON oi.meal_id = m.id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT $2 OFFSET $3
        `, [user_id, limit, offset]);

        // Get total count for pagination
        const countResult = await pool.query(`
            SELECT COUNT(*) FROM orders WHERE user_id = $1
        `, [user_id]);

        const response = {
            orders: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        // Cache the result
        cache.set(cacheKey, response);

        res.json(response);

    } catch (error) {
        console.error('Order history fetch error:', error);
        res.status(500).json({
            error: 'Ошибка загрузки истории заказов',
            code: 'ORDER_HISTORY_ERROR'
        });
    }
});

// Get specific order details
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.userId;

        const result = await pool.query(`
            SELECT o.*,
                   json_agg(
                       json_build_object(
                           'name', m.name,
                           'quantity', oi.quantity,
                           'unit_price', oi.unit_price,
                           'total_price', oi.total_price
                       )
                   ) as items,
                   p.code as promocode
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN meals m ON oi.meal_id = m.id
            LEFT JOIN promocodes p ON o.promocode_id = p.id
            WHERE o.id = $1 AND o.user_id = $2
            GROUP BY o.id, p.code
        `, [id, user_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Заказ не найден',
                code: 'ORDER_NOT_FOUND'
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Order details fetch error:', error);
        res.status(500).json({
            error: 'Ошибка загрузки деталей заказа',
            code: 'ORDER_DETAILS_ERROR'
        });
    }
});

// Top up balance
router.post('/topup', authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const { amount, method } = req.body;
        const user_id = req.user.userId;

        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({
                error: 'Неверная сумма пополнения',
                code: 'INVALID_AMOUNT'
            });
        }

        if (amount > 1000) {
            return res.status(400).json({
                error: 'Максимальная сумма пополнения - 1000 ₴',
                code: 'AMOUNT_TOO_HIGH'
            });
        }

        await client.query('BEGIN');

        // Create payment record
        const paymentResult = await client.query(`
            INSERT INTO payments (user_id, amount, payment_method, status)
            VALUES ($1, $2, $3, 'completed')
            RETURNING *
        `, [user_id, amount, method]);

        // Update user balance
        await client.query(`
            UPDATE profiles
            SET balance = balance + $1
            WHERE user_id = $2
        `, [amount, user_id]);

        // Get updated balance
        const balanceResult = await client.query(`
            SELECT balance FROM profiles WHERE user_id = $1
        `, [user_id]);

        await client.query('COMMIT');

        // Clear user cache
        cache.del(CACHE_KEYS.USER_PROFILE(user_id));

        res.json({
            success: true,
            new_balance: parseFloat(balanceResult.rows[0].balance),
            payment: paymentResult.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Topup error:', error);
        res.status(500).json({
            error: 'Ошибка пополнения баланса',
            code: 'TOPUP_ERROR'
        });
    } finally {
        client.release();
    }
});

export default router;
