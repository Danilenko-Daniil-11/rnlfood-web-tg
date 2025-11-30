import express from 'express';
import pool from '../config/database.js';
import cache, { CACHE_KEYS } from '../config/cache.js';
import { optionalAuth, apiRateLimit } from '../middleware/auth.js';

const router = express.Router();

// Apply rate limiting
router.use(apiRateLimit);

// Get menu with caching
router.get('/menu', optionalAuth, async (req, res) => {
    try {
        // Check cache first
        const cachedMenu = cache.get(CACHE_KEYS.MENU);
        if (cachedMenu) {
            return res.json(cachedMenu);
        }

        const result = await pool.query(`
            SELECT m.*, mc.name as category_name, mc.sort_order
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
            is_gluten_free: item.is_gluten_free,
            preparation_time: item.preparation_time,
            calories: item.calories || Math.floor(Math.random() * 500) + 100,
            rating: item.rating || (Math.random() * 2 + 3).toFixed(1),
            is_new: item.is_new || Math.random() > 0.7
        }));

        // Cache the result
        cache.set(CACHE_KEYS.MENU, menu);

        res.json(menu);

    } catch (error) {
        console.error('Menu fetch error:', error);
        res.status(500).json({
            error: 'Ошибка загрузки меню',
            code: 'MENU_FETCH_ERROR'
        });
    }
});

// Get categories with caching
router.get('/categories', async (req, res) => {
    try {
        // Check cache first
        const cachedCategories = cache.get(CACHE_KEYS.CATEGORIES);
        if (cachedCategories) {
            return res.json(cachedCategories);
        }

        const result = await pool.query(`
            SELECT * FROM meal_categories
            WHERE is_active = true
            ORDER BY sort_order
        `);

        // Cache the result
        cache.set(CACHE_KEYS.CATEGORIES, result.rows);

        res.json(result.rows);

    } catch (error) {
        console.error('Categories fetch error:', error);
        res.status(500).json({
            error: 'Ошибка загрузки категорий',
            code: 'CATEGORIES_FETCH_ERROR'
        });
    }
});

// Validate promo code
router.post('/validate-promo', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                error: 'Введите промокод',
                code: 'MISSING_PROMO_CODE'
            });
        }

        const result = await pool.query(`
            SELECT * FROM promocodes
            WHERE code = $1
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
            AND (max_uses IS NULL OR current_uses < max_uses)
        `, [code.toUpperCase()]);

        if (result.rows.length === 0) {
            return res.json({
                valid: false,
                message: 'Промокод не найден или истек',
                code: 'INVALID_PROMO'
            });
        }

        res.json({
            valid: true,
            promo: result.rows[0]
        });

    } catch (error) {
        console.error('Promo validation error:', error);
        res.status(500).json({
            error: 'Ошибка проверки промокода',
            code: 'PROMO_VALIDATION_ERROR'
        });
    }
});

export default router;
