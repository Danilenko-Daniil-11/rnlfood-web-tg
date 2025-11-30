import express from 'express';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { Telegraf, Markup, session } from 'telegraf';

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
app.use(cookieParser());
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const cookieToken = req.cookies.token;

    // Check both header and cookie for token
    const finalToken = token || cookieToken;

    if (!finalToken) {
        return res.status(401).json({ error: 'Токен доступа отсутствует' });
    }

    jwt.verify(finalToken, JWT_SECRET, (err, user) => {
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

        // Устанавливаем HTTP-only cookie для persistent login
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
            success: true,
            token, // Still send token for backward compatibility
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

// API для выхода из системы
app.post('/api/logout', (req, res) => {
    // Очищаем cookie с токеном
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    res.json({ success: true, message: 'Выход выполнен успешно' });
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
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { status } = req.body;

        // Получаем текущий заказ
        const orderResult = await client.query(`
            SELECT * FROM orders WHERE id = $1
        `, [id]);

        if (orderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const order = orderResult.rows[0];

        // Если статус меняется на "отменен" и заказ не был отменен ранее
        if (status === 'cancelled' && order.status !== 'cancelled') {
            // Возвращаем деньги пользователю
            await client.query(`
                UPDATE profiles
                SET balance = balance + $1
                WHERE user_id = $2
            `, [order.final_amount, order.user_id]);
        }
        // Если статус меняется с "отменен" на другой статус
        else if (order.status === 'cancelled' && status !== 'cancelled') {
            // Списываем деньги обратно (если заказ был отменен, но теперь восстанавливается)
            const userResult = await client.query('SELECT balance FROM profiles WHERE user_id = $1', [order.user_id]);
            if (userResult.rows.length === 0 || parseFloat(userResult.rows[0].balance) < order.final_amount) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Недостаточно средств на балансе пользователя для восстановления заказа' });
            }

            await client.query(`
                UPDATE profiles
                SET balance = balance - $1
                WHERE user_id = $2
            `, [order.final_amount, order.user_id]);
        }

        // Обновляем статус заказа
        const updateResult = await client.query(`
            UPDATE orders
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [status, id]);

        await client.query('COMMIT');
        res.json(updateResult.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Ошибка обновления статуса заказа' });
    } finally {
        client.release();
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

// TELEGRAM BOT FUNCTIONALITY

// Инициализация бота только если есть токен
let bot = null;
if (process.env.BOT_TOKEN) {
    bot = new Telegraf(process.env.BOT_TOKEN);

    // Сессии для хранения состояния пользователя
    bot.use(session());

    // Состояния бота
    const BOT_STATES = {
        START: 'start',
        LOGIN: 'login',
        MAIN_MENU: 'main_menu',
        PROFILE: 'profile',
        ASSORTMENT: 'assortment',
        CART: 'cart',
        PAYMENT: 'payment',
        ORDER_HISTORY: 'order_history'
    };

    // Инициализация сессии
    bot.use((ctx, next) => {
        if (!ctx.session) {
            ctx.session = {
                state: BOT_STATES.START,
                user: null,
                cart: {},
                tempData: {}
            };
        }
        return next();
    });

    // Команда /start
    bot.start(async (ctx) => {
        ctx.session.state = BOT_STATES.START;
        await showStartMenu(ctx);
    });

    // Главное меню
    async function showStartMenu(ctx) {
        const keyboard = Markup.keyboard([
            ['📱 Войти в систему', '📝 Зарегистрироваться'],
            ['ℹ️ О проекте', '🆘 Помощь']
        ]).resize();

        await ctx.reply(
            `🍽️ *РНЛ ЕДА - Официальный сервис питания*\n\n` +
            `Быстрый заказ еды без очередей для учащихся Ришельевского лицея\n\n` +
            `*MADE BY:*\n` +
            `DANYLENKO DANIIL\n` +
            `DMITRIEV KOLYA`,
            {
                parse_mode: 'Markdown',
                ...keyboard
            }
        );
    }

    // О проекте
    bot.hears('ℹ️ О проекте', async (ctx) => {
        await ctx.reply(
            `*О проекте РНЛ ЕДА*\n\n` +
            `🤖 Это официальный Telegram бот сервиса питания Ришельевского научного лицея\n\n` +
            `📱 *Возможности:*\n` +
            `• Просмотр меню столовой\n` +
            `• Быстрый заказ еды\n` +
            `• Пополнение баланса\n` +
            `• История заказов\n` +
            `• Промокоды и скидки\n\n` +
            `⚡ *Преимущества:*\n` +
            `• Без очередей\n` +
            `• Удобный интерфейс\n` +
            `• Мгновенные уведомления\n` +
            `• Безопасные платежи`,
            { parse_mode: 'Markdown' }
        );
    });

    // Помощь
    bot.hears('🆘 Помощь', async (ctx) => {
        await ctx.reply(
            `*Помощь по использованию бота*\n\n` +
            `🔐 *Регистрация и вход:*\n` +
            `1. Нажмите "Зарегистрироваться"\n` +
            `2. Введите данные по инструкции\n` +
            `3. Используйте логин/пароль для входа\n\n` +
            `🛒 *Как сделать заказ:*\n` +
            `1. Войдите в систему\n` +
            `2. Перейдите в "Ассортимент"\n` +
            `3. Добавьте товары в корзину\n` +
            `4. Оформите заказ\n\n` +
            `💳 *Пополнение баланса:*\n` +
            `• Криптовалюта (1% комиссия)\n` +
            `• Банковская карта (2.5% комиссия)\n` +
            `• Наличные (без комиссии)\n\n` +
            `📞 *Техподдержка:*\n` +
            `По вопросам работы бота обращайтесь к администрации лицея`,
            { parse_mode: 'Markdown' }
        );
    });

    // Регистрация
    bot.hears('📝 Зарегистрироваться', async (ctx) => {
        ctx.session.state = BOT_STATES.LOGIN;
        ctx.session.tempData = { registration: true, step: 0 };

        await ctx.reply(
            `*Регистрация нового пользователя*\n\n` +
            `Введите желаемый *логин* (минимум 3 символа):`,
            { parse_mode: 'Markdown' }
        );
    });

    // Вход в систему
    bot.hears('📱 Войти в систему', async (ctx) => {
        ctx.session.state = BOT_STATES.LOGIN;
        ctx.session.tempData = { registration: false, step: 0 };

        await ctx.reply(
            `*Вход в систему*\n\n` +
            `Введите ваш *логин*:`,
            { parse_mode: 'Markdown' }
        );
    });

    // Обработка текстовых сообщений для логина/регистрации
    bot.on('text', async (ctx) => {
        const message = ctx.message.text;
        const session = ctx.session;

        if (session.state === BOT_STATES.LOGIN && session.tempData) {
            await handleLoginFlow(ctx, message);
            return;
        }

        if (session.state === BOT_STATES.MAIN_MENU) {
            await handleMainMenuInput(ctx, message);
            return;
        }
    });

    // Обработка процесса логина/регистрации
    async function handleLoginFlow(ctx, message) {
        const { tempData } = ctx.session;

        if (tempData.registration) {
            await handleRegistration(ctx, message);
        } else {
            await handleLogin(ctx, message);
        }
    }

    // Процесс регистрации
    async function handleRegistration(ctx, message) {
        const { tempData } = ctx.session;

        switch (tempData.step) {
            case 0: // Логин
                if (message.length < 3) {
                    await ctx.reply('❌ Логин должен содержать минимум 3 символа. Попробуйте еще раз:');
                    return;
                }

                // Проверяем существование пользователя
                try {
                    const userExists = await pool.query('SELECT id FROM users WHERE username = $1', [message]);
                    if (userExists.rows.length > 0) {
                        await ctx.reply('❌ Этот логин уже занят. Введите другой логин:');
                        return;
                    }
                } catch (error) {
                    console.error('Error checking user:', error);
                    await ctx.reply('❌ Ошибка проверки логина. Попробуйте еще раз:');
                    return;
                }

                tempData.username = message;
                tempData.step = 1;
                await ctx.reply('🔐 Введите *пароль* (минимум 6 символов):', { parse_mode: 'Markdown' });
                break;

            case 1: // Пароль
                if (message.length < 6) {
                    await ctx.reply('❌ Пароль должен содержать минимум 6 символов. Попробуйте еще раз:');
                    return;
                }

                tempData.password = message;
                tempData.step = 2;

                await ctx.reply(
                    '👤 Введите ваше *имя и фамилию*:\n\n' +
                    'Пример: *Иван Иванов*',
                    { parse_mode: 'Markdown' }
                );
                break;

            case 2: // Имя и фамилия
                if (!message.trim()) {
                    await ctx.reply('❌ Введите корректные имя и фамилию:');
                    return;
                }

                tempData.full_name = message;
                tempData.step = 3;

                const classKeyboard = Markup.keyboard([
                    ['5-А', '5-Б', '5-В', '5-Г'],
                    ['6-А', '6-Б', '6-В', '6-Г'],
                    ['7-А', '7-Б', '7-В', '7-Г'],
                    ['8-А', '8-Б', '8-В', '8-Г'],
                    ['9-А', '9-Б', '9-В', '9-Г'],
                    ['10-А', '10-Б', '10-В', '10-Г'],
                    ['11-А', '11-Б', '11-В', '11-Г']
                ]).resize();

                await ctx.reply(
                    '🏫 Выберите ваш *класс*:',
                    { parse_mode: 'Markdown', ...classKeyboard }
                );
                break;

            case 3: // Класс
                tempData.class_name = message;
                tempData.step = 4;

                await ctx.reply(
                    '🎂 Введите ваш *возраст* (10-18 лет):',
                    { parse_mode: 'Markdown' },
                    Markup.keyboard([['10', '11', '12', '13', '14', '15', '16', '17', '18']]).resize()
                );
                break;

            case 4: // Возраст
                const age = parseInt(message);
                if (age < 10 || age > 18) {
                    await ctx.reply('❌ Возраст должен быть от 10 до 18 лет. Попробуйте еще раз:');
                    return;
                }

                tempData.age = age;
                tempData.step = 5;

                await ctx.reply(
                    '👨‍👩‍👧‍👦 Введите *ФИО родителей*:\n\n' +
                    'Пример: *Иванова Мария Петровна, Иванов Алексей Сергеевич*',
                    { parse_mode: 'Markdown' },
                    Markup.removeKeyboard()
                );
                break;

            case 5: // Родители
                if (!message.trim()) {
                    await ctx.reply('❌ Введите корректные данные родителей:');
                    return;
                }

                tempData.parents = message;

                // Завершаем регистрацию
                await completeRegistration(ctx);
                break;
        }
    }

    // Завершение регистрации
    async function completeRegistration(ctx) {
        const { tempData } = ctx.session;

        try {
            // Хешируем пароль
            const hashedPassword = await bcrypt.hash(tempData.password, 10);

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Создаем пользователя
                const userResult = await client.query(
                    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
                    [tempData.username, hashedPassword]
                );

                const user = userResult.rows[0];

                // Создаем профиль
                await client.query(
                    'INSERT INTO profiles (user_id, full_name, class_name) VALUES ($1, $2, $3)',
                    [user.id, tempData.full_name, tempData.class_name]
                );

                // Создаем роль
                await client.query(
                    'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
                    [user.id, 'user']
                );

                await client.query('COMMIT');

                // Сохраняем пользователя в сессии
                ctx.session.user = {
                    id: user.id,
                    username: user.username,
                    full_name: tempData.full_name,
                    class_name: tempData.class_name,
                    balance: 0.00,
                    role: 'user'
                };

                ctx.session.state = BOT_STATES.MAIN_MENU;

                await ctx.reply(
                    `✅ *Регистрация успешна!*\n\n` +
                    `👤 *Логин:* ${tempData.username}\n` +
                    `👤 *Имя:* ${tempData.full_name}\n` +
                    `🏫 *Класс:* ${tempData.class_name}\n` +
                    `🎂 *Возраст:* ${tempData.age}\n` +
                    `👨‍👩‍👧‍👦 *Родители:* ${tempData.parents}\n\n` +
                    `💰 *Начальный баланс:* 0.00 ₴\n\n` +
                    `Добро пожаловать в систему РНЛ ЕДА! 🍽️`,
                    { parse_mode: 'Markdown' }
                );

                await showMainMenu(ctx);

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            console.error('Registration error:', error);
            await ctx.reply(
                '❌ Ошибка регистрации. Пожалуйста, попробуйте позже или обратитесь в поддержку.'
            );
            ctx.session.state = BOT_STATES.START;
            await showStartMenu(ctx);
        }
    }

    // Процесс входа
    async function handleLogin(ctx, message) {
        const { tempData } = ctx.session;

        switch (tempData.step) {
            case 0: // Логин
                tempData.username = message;
                tempData.step = 1;
                await ctx.reply('🔐 Введите ваш *пароль*:', { parse_mode: 'Markdown' });
                break;

            case 1: // Пароль
                tempData.password = message;
                await completeLogin(ctx);
                break;
        }
    }

    // Завершение входа
    async function completeLogin(ctx) {
        const { tempData } = ctx.session;

        try {
            // Находим пользователя
            const userResult = await pool.query(`
                SELECT u.*, p.full_name, p.class_name, p.balance, ur.role
                FROM users u
                LEFT JOIN profiles p ON u.id = p.user_id
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                WHERE u.username = $1
            `, [tempData.username]);

            if (userResult.rows.length === 0) {
                await ctx.reply('❌ Пользователь не найден. Проверьте логин или зарегистрируйтесь.');
                ctx.session.state = BOT_STATES.START;
                await showStartMenu(ctx);
                return;
            }

            const user = userResult.rows[0];

            // Проверяем пароль
            const validPassword = await bcrypt.compare(tempData.password, user.password_hash);
            if (!validPassword) {
                await ctx.reply('❌ Неверный пароль. Попробуйте еще раз.');
                ctx.session.state = BOT_STATES.START;
                await showStartMenu(ctx);
                return;
            }

            // Сохраняем пользователя в сессии
            ctx.session.user = {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                class_name: user.class_name,
                balance: parseFloat(user.balance),
                role: user.role
            };

            ctx.session.state = BOT_STATES.MAIN_MENU;

            const hour = new Date().getHours();
            let greeting = 'ДОБРЫЙ ВЕЧЕР';
            if (hour < 12) greeting = 'ДОБРОЕ УТРО';
            else if (hour < 18) greeting = 'ДОБРЫЙ ДЕНЬ';

            await ctx.reply(
                `✅ *Вход выполнен успешно!*\n\n` +
                `${greeting}, *${user.username.toUpperCase()}*! 👋\n\n` +
                `💰 *Текущий баланс:* ${parseFloat(user.balance).toFixed(2)} ₴`,
                { parse_mode: 'Markdown' }
            );

            await showMainMenu(ctx);

        } catch (error) {
            console.error('Login error:', error);
            await ctx.reply('❌ Ошибка входа. Пожалуйста, попробуйте позже.');
            ctx.session.state = BOT_STATES.START;
            await showStartMenu(ctx);
        }
    }

    // Главное меню
    async function showMainMenu(ctx) {
        const keyboard = Markup.keyboard([
            ['👤 Профиль', '🍽️ Ассортимент'],
            ['🛒 Корзина', '📊 История заказов'],
            ['💳 Пополнить баланс', '🎁 Промокоды'],
            ['🚪 Выйти']
        ]).resize();

        if (ctx.session.user && ctx.session.user.role === 'admin') {
            keyboard.keyboard.push(['⚙️ Админ панель']);
        }

        await ctx.reply(
            `*Главное меню РНЛ ЕДА* 🍽️\n\n` +
            `Выберите нужный раздел:`,
            { parse_mode: 'Markdown', ...keyboard }
        );
    }

    // Обработка ввода в главном меню
    async function handleMainMenuInput(ctx, message) {
        switch (message) {
            case '👤 Профиль':
                await showProfile(ctx);
                break;
            case '🍽️ Ассортимент':
                await showAssortment(ctx);
                break;
            case '🛒 Корзина':
                await showCart(ctx);
                break;
            case '📊 История заказов':
                await showOrderHistory(ctx);
                break;
            case '💳 Пополнить баланс':
                await showPaymentMethods(ctx);
                break;
            case '🎁 Промокоды':
                await showPromoCodes(ctx);
                break;
            case '⚙️ Админ панель':
                if (ctx.session.user && ctx.session.user.role === 'admin') {
                    await showAdminPanel(ctx);
                }
                break;
            case '🚪 Выйти':
                await logout(ctx);
                break;
            default:
                await ctx.reply('Пожалуйста, используйте кнопки меню для навигации.');
        }
    }

    // Профиль пользователя
    async function showProfile(ctx) {
        const user = ctx.session.user;

        const profileText = `
*👤 ВАШ ПРОФИЛЬ*

*Имя и фамилия:* ${user.full_name || 'Не указано'}
*Логин:* ${user.username}
*Класс:* ${user.class_name || 'Не указан'}
*Баланс:* ${user.balance.toFixed(2)} ₴
*Роль:* ${user.role === 'admin' ? 'Администратор' : 'Пользователь'}
    `.trim();

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('✏️ Редактировать профиль', 'edit_profile')],
            [Markup.button.callback('💳 Пополнить баланс', 'topup_balance')],
            [Markup.button.callback('📊 История заказов', 'order_history')]
        ]);

        await ctx.reply(profileText, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    // Ассортимент
    async function showAssortment(ctx) {
        try {
            const result = await pool.query(`
                SELECT m.*, mc.name as category_name
                FROM meals m
                LEFT JOIN meal_categories mc ON m.category_id = mc.id
                WHERE m.is_available = true
                ORDER BY mc.sort_order, m.name
            `);

            if (result.rows.length === 0) {
                await ctx.reply('🍽️ *Ассортимент временно пуст*\n\nПопробуйте зайти позже.', { parse_mode: 'Markdown' });
                return;
            }

            const categories = {};
            result.rows.forEach(meal => {
                if (!categories[meal.category_name]) {
                    categories[meal.category_name] = [];
                }
                categories[meal.category_name].push(meal);
            });

            let message = `*🍽️ АССОРТИМЕНТ РНЛ ЕДА*\n\n`;

            for (const [category, meals] of Object.entries(categories)) {
                message += `*${category.toUpperCase()}*\n`;
                meals.forEach((meal, index) => {
                    const inCart = ctx.session.cart[meal.id] || 0;
                    message += `${index + 1}. ${meal.name} - ${meal.price} ₴`;
                    if (inCart > 0) {
                        message += ` (в корзине: ${inCart})`;
                    }
                    message += '\n';

                    if (meal.description) {
                        message += `   📝 ${meal.description}\n`;
                    }
                });
                message += '\n';
            }

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('🛒 Перейти в корзину', 'view_cart')],
                [Markup.button.callback('🔍 Поиск товаров', 'search_products')],
                [Markup.button.callback('📋 По категориям', 'view_categories')]
            ]);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });

            // Кнопки для добавления в корзину
            const cartKeyboard = [];
            result.rows.forEach(meal => {
                cartKeyboard.push([
                    Markup.button.callback(`➕ ${meal.name} - ${meal.price} ₴`, `add_to_cart_${meal.id}`)
                ]);
            });

            cartKeyboard.push([Markup.button.callback('🛒 Перейти в корзину', 'view_cart')]);

            await ctx.reply('*Добавить в корзину:*', {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(cartKeyboard)
            });

        } catch (error) {
            console.error('Error loading assortment:', error);
            await ctx.reply('❌ Ошибка загрузки ассортимента. Попробуйте позже.');
        }
    }

    // Корзина
    async function showCart(ctx) {
        const cart = ctx.session.cart;

        if (Object.keys(cart).length === 0) {
            await ctx.reply('🛒 *Ваша корзина пуста*\n\nПерейдите в ассортимент, чтобы добавить товары.', {
                parse_mode: 'Markdown'
            });
            return;
        }

        let total = 0;
        let message = `*🛒 ВАША КОРЗИНА*\n\n`;

        try {
            for (const [mealId, quantity] of Object.entries(cart)) {
                const mealResult = await pool.query('SELECT * FROM meals WHERE id = $1', [mealId]);
                if (mealResult.rows.length > 0) {
                    const meal = mealResult.rows[0];
                    const itemTotal = meal.price * quantity;
                    total += itemTotal;

                    message += `• ${meal.name}\n`;
                    message += `  Количество: ${quantity}\n`;
                    message += `  Цена: ${meal.price} ₴ x ${quantity} = ${itemTotal} ₴\n\n`;
                }
            }

            message += `*💰 ИТОГО: ${total.toFixed(2)} ₴*`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('➕ Добавить еще', 'add_more'), Markup.button.callback('➖ Удалить', 'remove_items')],
                [Markup.button.callback('🗑️ Очистить корзину', 'clear_cart')],
                [Markup.button.callback('🎁 Применить промокод', 'apply_promo')],
                [Markup.button.callback('✅ Оформить заказ', 'place_order')]
            ]);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });

        } catch (error) {
            console.error('Error showing cart:', error);
            await ctx.reply('❌ Ошибка загрузки корзины. Попробуйте позже.');
        }
    }

    // История заказов
    async function showOrderHistory(ctx) {
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
            `, [ctx.session.user.id]);

            if (result.rows.length === 0) {
                await ctx.reply('📊 *История заказов пуста*\n\nСовершите свой первый заказ!', {
                    parse_mode: 'Markdown'
                });
                return;
            }

            let message = `*📊 ИСТОРИЯ ВАШИХ ЗАКАЗОВ*\n\n`;

            result.rows.forEach((order, index) => {
                const orderDate = new Date(order.created_at);
                message += `*Заказ #${index + 1}*\n`;
                message += `📅 ${orderDate.toLocaleDateString('ru-RU')}\n`;
                message += `⏰ ${orderDate.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}\n`;
                message += `💰 Сумма: ${order.final_amount} ₴\n`;
                message += `📦 Статус: ${getOrderStatusText(order.status)}\n\n`;

                if (order.items && order.items.length > 0) {
                    message += `*Состав заказа:*\n`;
                    order.items.forEach(item => {
                        message += `• ${item.name} x${item.quantity} - ${item.total_price} ₴\n`;
                    });
                }
                message += '\n' + '─'.repeat(20) + '\n\n';
            });

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Обновить', 'refresh_history')],
                [Markup.button.callback('📋 Подробнее', 'detailed_history')]
            ]);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });

        } catch (error) {
            console.error('Error loading order history:', error);
            await ctx.reply('❌ Ошибка загрузки истории заказов. Попробуйте позже.');
        }
    }

    // Пополнение баланса
    async function showPaymentMethods(ctx) {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('₿ Криптовалюта (1% комиссия)', 'payment_crypto')],
            [Markup.button.callback('💳 Банковская карта (2.5% комиссия)', 'payment_card')],
            [Markup.button.callback('💵 Наличные (без комиссии)', 'payment_cash')],
            [Markup.button.callback('📊 Текущий баланс', 'check_balance')]
        ]);

        await ctx.reply(
            `*💳 ПОПОЛНЕНИЕ БАЛАНСА*\n\n` +
            `💰 *Текущий баланс:* ${ctx.session.user.balance.toFixed(2)} ₴\n\n` +
            `Выберите способ пополнения:\n\n` +
            `*₿ Криптовалюта* - 1% комиссия\n` +
            `*💳 Банковская карта* - 2.5% комиссия\n` +
            `*💵 Наличные* - без комиссии\n\n` +
            `💡 *Рекомендуем:* наличные - самый выгодный способ!`,
            {
                parse_mode: 'Markdown',
                ...keyboard
            }
        );
    }

    // Промокоды
    async function showPromoCodes(ctx) {
        try {
            const result = await pool.query(`
                SELECT * FROM promocodes
                WHERE is_active = true
                AND (expires_at IS NULL OR expires_at > NOW())
                AND (max_uses IS NULL OR current_uses < max_uses)
                ORDER BY created_at DESC
            `);

            let message = `*🎁 АКТИВНЫЕ ПРОМОКОДЫ*\n\n`;

            if (result.rows.length === 0) {
                message += `В данный момент нет активных промокодов.\n\nСледите за обновлениями!`;
            } else {
                result.rows.forEach(promo => {
                    message += `*${promo.code}*\n`;
                    if (promo.discount_percentage) {
                        message += `💰 Скидка: ${promo.discount_percentage}%\n`;
                    }
                    if (promo.discount_amount) {
                        message += `💰 Скидка: ${promo.discount_amount} ₴\n`;
                    }
                    if (promo.expires_at) {
                        const expires = new Date(promo.expires_at);
                        message += `⏰ Действует до: ${expires.toLocaleDateString('ru-RU')}\n`;
                    }
                    if (promo.max_uses) {
                        message += `📊 Использовано: ${promo.current_uses}/${promo.max_uses}\n`;
                    }
                    message += '\n';
                });
            }

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('🎫 Применить промокод', 'apply_promo_input')],
                [Markup.button.callback('🔄 Обновить список', 'refresh_promos')]
            ]);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });

        } catch (error) {
            console.error('Error loading promocodes:', error);
            await ctx.reply('❌ Ошибка загрузки промокодов. Попробуйте позже.');
        }
    }

    // Админ панель
    async function showAdminPanel(ctx) {
        if (ctx.session.user.role !== 'admin') {
            await ctx.reply('❌ У вас нет прав доступа к админ панели.');
            return;
        }

        try {
            const today = new Date().toISOString().split('T')[0];

            const [
                totalUsers,
                totalOrders,
                todayOrders,
                totalRevenue,
                todayRevenue
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

            const message = `
*⚙️ АДМИН ПАНЕЛЬ*

*📊 Статистика:*
👥 Пользователей: ${parseInt(totalUsers.rows[0].count)}
📦 Всего заказов: ${parseInt(totalOrders.rows[0].count)}
📈 Заказов сегодня: ${parseInt(todayOrders.rows[0].count)}
💰 Общая выручка: ${parseFloat(totalRevenue.rows[0].total).toFixed(2)} ₴
💵 Выручка сегодня: ${parseFloat(todayRevenue.rows[0].total).toFixed(2)} ₴
        `.trim();

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('📦 Управление заказами', 'admin_orders')],
                [Markup.button.callback('🍽️ Управление меню', 'admin_meals')],
                [Markup.button.callback('🎁 Управление промокодами', 'admin_promos')],
                [Markup.button.callback('👥 Управление пользователями', 'admin_users')],
                [Markup.button.callback('📊 Детальная статистика', 'admin_stats')]
            ]);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });

        } catch (error) {
            console.error('Error loading admin panel:', error);
            await ctx.reply('❌ Ошибка загрузки админ панели. Попробуйте позже.');
        }
    }

    // Выход из системы
    async function logout(ctx) {
        ctx.session.state = BOT_STATES.START;
        ctx.session.user = null;
        ctx.session.cart = {};
        ctx.session.tempData = {};

        await ctx.reply(
            '✅ Вы успешно вышли из системы.\n\n' +
            'Для входа используйте команду /start',
            Markup.removeKeyboard()
        );

        await showStartMenu(ctx);
    }

    // Вспомогательные функции
    function getOrderStatusText(status) {
        const statusTexts = {
            'pending': '⏳ Ожидание',
            'confirmed': '✅ Подтвержден',
            'preparing': '👨‍🍳 Готовится',
            'ready': '📦 Готов',
            'completed': '🎉 Завершен',
            'cancelled': '❌ Отменен'
        };
        return statusTexts[status] || status;
    }

    // Обработка callback запросов
    bot.on('callback_query', async (ctx) => {
        const callbackData = ctx.callbackQuery.data;

        try {
            if (callbackData.startsWith('add_to_cart_')) {
                const mealId = callbackData.replace('add_to_cart_', '');
                await addToCart(ctx, mealId);
            }
            else if (callbackData === 'view_cart') {
                await showCart(ctx);
            }
            else if (callbackData === 'clear_cart') {
                await clearCart(ctx);
            }
            else if (callbackData === 'place_order') {
                await placeOrder(ctx);
            }
            else if (callbackData === 'check_balance') {
                await ctx.answerCbQuery(`💰 Ваш баланс: ${ctx.session.user.balance.toFixed(2)} ₴`);
            }
            else if (callbackData === 'refresh_history') {
                await showOrderHistory(ctx);
            }
            else {
                await ctx.answerCbQuery('⏳ Функция в разработке...');
            }
        } catch (error) {
            console.error('Callback error:', error);
            await ctx.answerCbQuery('❌ Произошла ошибка');
        }
    });

    // Добавление в корзину
    async function addToCart(ctx, mealId) {
        try {
            const mealResult = await pool.query('SELECT * FROM meals WHERE id = $1', [mealId]);
            if (mealResult.rows.length === 0) {
                await ctx.answerCbQuery('❌ Товар не найден');
                return;
            }

            const meal = mealResult.rows[0];

            if (!ctx.session.cart[mealId]) {
                ctx.session.cart[mealId] = 0;
            }
            ctx.session.cart[mealId]++;

            await ctx.answerCbQuery(`✅ ${meal.name} добавлен в корзину!`);

            // Показываем обновленную корзину
            await showCart(ctx);

        } catch (error) {
            console.error('Error adding to cart:', error);
            await ctx.answerCbQuery('❌ Ошибка добавления в корзину');
        }
    }

    // Очистка корзины
    async function clearCart(ctx) {
        ctx.session.cart = {};
        await ctx.answerCbQuery('✅ Корзина очищена');
        await ctx.reply('🛒 Корзина успешно очищена!');
    }

    // Оформление заказа
    async function placeOrder(ctx) {
        const cart = ctx.session.cart;
        const user = ctx.session.user;

        if (Object.keys(cart).length === 0) {
            await ctx.answerCbQuery('❌ Корзина пуста');
            return;
        }

        try {
            let total = 0;
            const orderItems = [];

            // Рассчитываем сумму заказа
            for (const [mealId, quantity] of Object.entries(cart)) {
                const mealResult = await pool.query('SELECT * FROM meals WHERE id = $1', [mealId]);
                if (mealResult.rows.length > 0) {
                    const meal = mealResult.rows[0];
                    const itemTotal = meal.price * quantity;
                    total += itemTotal;

                    orderItems.push({
                        meal_id: mealId,
                        quantity: quantity,
                        unit_price: meal.price,
                        total_price: itemTotal
                    });
                }
            }

            // Проверяем баланс
            if (user.balance < total) {
                await ctx.answerCbQuery('❌ Недостаточно средств');
                await ctx.reply(
                    `❌ *Недостаточно средств на балансе!*\n\n` +
                    `💰 Нужно: ${total.toFixed(2)} ₴\n` +
                    `💳 На счету: ${user.balance.toFixed(2)} ₴\n\n` +
                    `Пополните баланс для оформления заказа.`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Создаем заказ
                const orderResult = await client.query(`
                    INSERT INTO orders (user_id, total_amount, discount_amount, final_amount)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                `, [user.id, total, 0, total]);

                const order = orderResult.rows[0];

                // Добавляем элементы заказа
                for (const item of orderItems) {
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
                `, [total, user.id]);

                await client.query('COMMIT');

                // Обновляем баланс в сессии
                user.balance -= total;

                // Очищаем корзину
                ctx.session.cart = {};

                await ctx.reply(
                    `✅ *ЗАКАЗ УСПЕШНО ОФОРМЛЕН!*\n\n` +
                    `📦 *Номер заказа:* #${order.id.slice(-8)}\n` +
                    `💰 *Сумма заказа:* ${total.toFixed(2)} ₴\n` +
                    `⏰ *Время готовности:* ~20 минут\n` +
                    `📍 *Место выдачи:* столовая\n\n` +
                    `🍽️ Приятного аппетита!`,
                    { parse_mode: 'Markdown' }
                );

                await ctx.answerCbQuery('✅ Заказ успешно оформлен!');

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            console.error('Error placing order:', error);
            await ctx.answerCbQuery('❌ Ошибка оформления заказа');
            await ctx.reply('❌ Произошла ошибка при оформлении заказа. Попробуйте позже.');
        }
    }

    // Обработка ошибок
    bot.catch((err, ctx) => {
        console.error('Bot error:', err);
        ctx.reply('❌ Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже.');
    });

    // Запуск бота
    bot.launch().then(() => {
        console.log('🤖 RNL FOOD Bot is running...');
    });

    // Graceful shutdown
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

// Все остальные маршруты ведут на index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Neon Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET ? 'Configured' : 'Using fallback'}`);
    if (bot) {
        console.log(`🤖 Telegram Bot: Configured`);
    } else {
        console.log(`🤖 Telegram Bot: Not configured (BOT_TOKEN missing)`);
    }
});
