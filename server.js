import express from 'express';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rnl-food-fallback-secret';

// Подключение к Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен доступа отсутствует' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный токен' });
        }
        req.user = user;
        next();
    });
};

// Admin middleware
const requireAdmin = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT ur.role 
            FROM user_roles ur 
            WHERE ur.user_id = $1
        `, [req.user.userId]);
        
        if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Требуются права администратора' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'Ошибка проверки прав' });
    }
};

// API маршруты для аутентификации
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, full_name, class_name, age, parents } = req.body;
        
        if (!username || !password || !full_name) {
            return res.status(400).json({ error: 'Заполните все обязательные поля' });
        }

        // Проверяем существование пользователя
        const userExists = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Создаем пользователя
            const userResult = await client.query(
                'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
                [username, hashedPassword]
            );

            const user = userResult.rows[0];

            // Создаем профиль
            await client.query(
                'INSERT INTO profiles (user_id, full_name, class_name) VALUES ($1, $2, $3)',
                [user.id, full_name, class_name]
            );

            // Создаем роль
            await client.query(
                'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
                [user.id, 'user']
            );

            await client.query('COMMIT');

            // Генерируем JWT токен
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    full_name,
                    class_name,
                    age: age,
                    parents: parents,
                    balance: 0.00
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }

        // Находим пользователя
        const userResult = await pool.query(`
            SELECT u.*, p.full_name, p.class_name, p.balance, ur.role
            FROM users u 
            LEFT JOIN profiles p ON u.id = p.user_id 
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.username = $1
        `, [username]);

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Неверный логин или пароль' });
        }

        const user = userResult.rows[0];

        // Проверяем пароль
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Неверный логин или пароль' });
        }

        // Генерируем JWT токен
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

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
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

// API для получения меню
app.get('/api/menu', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, mc.name as category_name 
            FROM meals m 
            LEFT JOIN meal_categories mc ON m.category_id = mc.id 
            WHERE m.is_available = true 
            ORDER BY mc.sort_order, m.name
        `);
        
        const menu = result.rows.map(item => ({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            category: item.category_name,
            description: item.description,
            ingredients: item.ingredients || [],
            allergens: item.allergens || [],
            is_vegetarian: item.is_vegetarian,
            preparation_time: item.preparation_time
        }));
        
        res.json(menu);
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: 'Ошибка загрузки меню' });
    }
});

// API для получения категорий
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM meal_categories 
            WHERE is_active = true 
            ORDER BY sort_order
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Ошибка загрузки категорий' });
    }
});

// API для проверки промокода
app.post('/api/validate-promo', async (req, res) => {
    try {
        const { code } = req.body;
        const result = await pool.query(`
            SELECT * FROM promocodes 
            WHERE code = $1 
            AND is_active = true 
            AND (expires_at IS NULL OR expires_at > NOW())
            AND (max_uses IS NULL OR current_uses < max_uses)
        `, [code.toUpperCase()]);
        
        if (result.rows.length === 0) {
            return res.json({ valid: false, message: 'Промокод не найден или истек' });
        }
        
        res.json({ valid: true, promo: result.rows[0] });
    } catch (error) {
        console.error('Error validating promo:', error);
        res.status(500).json({ error: 'Ошибка проверки промокода' });
    }
});

// API для создания заказа
app.post('/api/orders', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { items, promocode_id, total_amount, discount_amount, final_amount } = req.body;
        const user_id = req.user.userId;
        
        // Проверяем баланс
        const userResult = await client.query('SELECT balance FROM profiles WHERE user_id = $1', [user_id]);
        if (userResult.rows.length === 0 || parseFloat(userResult.rows[0].balance) < final_amount) {
            throw new Error('Недостаточно средств на балансе');
        }
        
        // Создаем заказ
        const orderResult = await client.query(`
            INSERT INTO orders (user_id, total_amount, discount_amount, final_amount, promocode_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [user_id, total_amount, discount_amount, final_amount, promocode_id]);
        
        const order = orderResult.rows[0];
        
        // Добавляем элементы заказа
        for (const item of items) {
            await client.query(`
                INSERT INTO order_items (order_id, meal_id, quantity, unit_price, total_price)
                VALUES ($1, $2, $3, $4, $5)
            `, [order.id, item.meal_id, item.quantity, item.unit_price, item.total_price]);
        }
        
        // Обновляем баланс
        await client.query(`
            UPDATE profiles 
            SET balance = balance - $1 
            WHERE user_id = $2
        `, [final_amount, user_id]);
        
        // Обновляем использование промокода
        if (promocode_id) {
            await client.query(`
                UPDATE promocodes 
                SET current_uses = current_uses + 1 
                WHERE id = $1
            `, [promocode_id]);
        }
        
        await client.query('COMMIT');
        res.json({ success: true, order });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating order:', error);
        res.status(500).json({ error: error.message || 'Ошибка создания заказа' });
    } finally {
        client.release();
    }
});

// API для пополнения баланса
app.post('/api/topup', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { amount, method } = req.body;
        const user_id = req.user.userId;
        
        // Записываем платеж
        const paymentResult = await client.query(`
            INSERT INTO payments (user_id, amount, payment_method, status)
            VALUES ($1, $2, $3, 'completed')
            RETURNING *
        `, [user_id, amount, method]);
        
        // Обновляем баланс
        await client.query(`
            UPDATE profiles 
            SET balance = balance + $1 
            WHERE user_id = $2
        `, [amount, user_id]);
        
        // Получаем обновленный баланс
        const balanceResult = await client.query(`
            SELECT balance FROM profiles WHERE user_id = $1
        `, [user_id]);
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            new_balance: parseFloat(balanceResult.rows[0].balance),
            payment: paymentResult.rows[0]
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing topup:', error);
        res.status(500).json({ error: 'Ошибка пополнения баланса' });
    } finally {
        client.release();
    }
});

// API для получения истории заказов
app.get('/api/orders/history', authenticateToken, async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        
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
        `, [req.user.userId, limit, offset]);
        
        // Получаем общее количество для пагинации
        const countResult = await pool.query(`
            SELECT COUNT(*) FROM orders WHERE user_id = $1
        `, [req.user.userId]);
        
        res.json({
            orders: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ error: 'Ошибка загрузки истории заказов' });
    }
});

// API для получения деталей заказа
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
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
        `, [id, req.user.userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ error: 'Ошибка загрузки деталей заказа' });
    }
});

// API для обновления профиля
app.post('/api/update-profile', authenticateToken, async (req, res) => {
    try {
        const { full_name, class_name } = req.body;
        const user_id = req.user.userId;
        
        await pool.query(`
            UPDATE profiles 
            SET full_name = $1, class_name = $2, updated_at = NOW()
            WHERE user_id = $3
        `, [full_name, class_name, user_id]);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Ошибка обновления профиля' });
    }
});

// АДМИН API

// Получение статистики
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
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
        
        res.json({
            users: parseInt(totalUsers.rows[0].count),
            total_orders: parseInt(totalOrders.rows[0].count),
            today_orders: parseInt(todayOrders.rows[0].count),
            total_revenue: parseFloat(totalRevenue.rows[0].total),
            today_revenue: parseFloat(todayRevenue.rows[0].total),
            popular_meals: popularMeals.rows
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Ошибка загрузки статистики' });
    }
});

// Получение всех заказов
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT o.*, u.username, p.full_name, p.class_name
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN profiles p ON u.id = p.user_id
        `;
        let params = [];
        let paramCount = 0;
        
        if (status) {
            query += ` WHERE o.status = $${++paramCount}`;
            params.push(status);
        }
        
        query += ` ORDER BY o.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching admin orders:', error);
        res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
});

// Обновление статуса заказа
app.put('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const result = await pool.query(`
            UPDATE orders 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Ошибка обновления статуса заказа' });
    }
});

// Управление меню
app.get('/api/admin/meals', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, mc.name as category_name
            FROM meals m
            LEFT JOIN meal_categories mc ON m.category_id = mc.id
            ORDER BY m.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching admin meals:', error);
        res.status(500).json({ error: 'Ошибка загрузки меню' });
    }
});

app.post('/api/admin/meals', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, price, category_id, description, is_available, preparation_time } = req.body;
        
        const result = await pool.query(`
            INSERT INTO meals (name, price, category_id, description, is_available, preparation_time)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name, price, category_id, description, is_available, preparation_time]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating meal:', error);
        res.status(500).json({ error: 'Ошибка создания блюда' });
    }
});

app.put('/api/admin/meals/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category_id, description, is_available, preparation_time } = req.body;
        
        const result = await pool.query(`
            UPDATE meals 
            SET name = $1, price = $2, category_id = $3, description = $4, 
                is_available = $5, preparation_time = $6, updated_at = NOW()
            WHERE id = $7
            RETURNING *
        `, [name, price, category_id, description, is_available, preparation_time, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Блюдо не найдено' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating meal:', error);
        res.status(500).json({ error: 'Ошибка обновления блюда' });
    }
});

// Управление промокодами
app.get('/api/admin/promocodes', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM promocodes 
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching promocodes:', error);
        res.status(500).json({ error: 'Ошибка загрузки промокодов' });
    }
});

app.post('/api/admin/promocodes', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { code, discount_percentage, max_uses, expires_at } = req.body;
        
        const result = await pool.query(`
            INSERT INTO promocodes (code, discount_percentage, max_uses, expires_at, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [code.toUpperCase(), discount_percentage, max_uses, expires_at, req.user.userId]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating promocode:', error);
        res.status(500).json({ error: 'Ошибка создания промокода' });
    }
});

// API для проверки соединения с базой
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        const categories = await pool.query('SELECT COUNT(*) FROM meal_categories');
        const meals = await pool.query('SELECT COUNT(*) FROM meals');
        const users = await pool.query('SELECT COUNT(*) FROM users');
        
        res.json({ 
            status: 'OK', 
            database: 'Neon PostgreSQL connected',
            data: {
                categories: parseInt(categories.rows[0].count),
                meals: parseInt(meals.rows[0].count),
                users: parseInt(users.rows[0].count)
            }
        });
    } catch (error) {
        console.error('Database health check failed:', error);
        res.status(500).json({ status: 'ERROR', database: 'Neon disconnected' });
    }
});

// Все остальные маршруты ведут на index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Neon Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`JWT Secret: ${JWT_SECRET ? 'Configured' : 'Using fallback'}`);
});
