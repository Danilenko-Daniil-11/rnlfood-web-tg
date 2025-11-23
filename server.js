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

// API маршруты для аутентификации
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, full_name, class_name } = req.body;
        
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
            SELECT u.*, p.full_name, p.class_name, p.balance 
            FROM users u 
            LEFT JOIN profiles p ON u.id = p.user_id 
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
                full_name: user.full_name,
                class_name: user.class_name,
                balance: parseFloat(user.balance)
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
            LIMIT 10
        `, [req.user.userId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ error: 'Ошибка загрузки истории заказов' });
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
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Neon Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET ? 'Configured' : 'Using fallback'}`);
});
