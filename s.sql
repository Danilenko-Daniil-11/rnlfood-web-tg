-- Создаем enum типы сначала
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('user', 'staff', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Создаем таблицы с проверкой существования
CREATE TABLE IF NOT EXISTS meal_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  ingredients text[],
  allergens text[],
  is_vegetarian boolean DEFAULT false,
  is_available boolean DEFAULT true,
  preparation_time integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promocodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_amount numeric,
  discount_percentage integer,
  max_uses integer,
  current_uses integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_amount numeric NOT NULL,
  discount_amount numeric DEFAULT 0.00,
  final_amount numeric NOT NULL,
  promocode_id uuid,
  status order_status DEFAULT 'pending',
  pickup_time timestamptz,
  qr_code text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  meal_id uuid,
  quantity integer DEFAULT 1,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  full_name text NOT NULL,
  class_name text,
  balance numeric DEFAULT 0.00,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  status payment_status DEFAULT 'pending',
  transaction_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Новые таблицы
CREATE TABLE IF NOT EXISTS achievements (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"description" text,
	"icon" text DEFAULT '🏆',
	"points_reward" integer DEFAULT 50
);

CREATE TABLE IF NOT EXISTS activity_log (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"action" text NOT NULL,
	"details" jsonb,
	"ip_address" inet,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS balance_transactions (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"profile_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"method" text NOT NULL,
	"status" payment_status DEFAULT 'completed',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "balance_transactions_method_check" CHECK ((method = ANY (ARRAY['crypto'::text, 'card'::text, 'cash'::text])))
);

CREATE TABLE IF NOT EXISTS favorite_meals (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"meal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "favorite_meals_user_id_meal_id_key" UNIQUE("user_id","meal_id")
);

CREATE TABLE IF NOT EXISTS loyalty_points (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"points" integer DEFAULT 0,
	"total_earned" integer DEFAULT 0,
	"total_spent" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"order_id" uuid,
	"points" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meal_reviews (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"meal_id" uuid,
	"order_item_id" uuid,
	"rating" smallint NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "meal_reviews_user_id_order_item_id_key" UNIQUE("user_id","order_item_id"),
	CONSTRAINT "meal_reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE IF NOT EXISTS parent_child (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"parent_user_id" uuid,
	"child_user_id" uuid,
	"relationship" text DEFAULT 'родитель',
	"can_topup" boolean DEFAULT true,
	"can_view_orders" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "parent_child_parent_user_id_child_user_id_key" UNIQUE("parent_user_id","child_user_id")
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"endpoint" text NOT NULL,
	"keys_auth" text NOT NULL,
	"keys_p256dh" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE("endpoint")
);

CREATE TABLE IF NOT EXISTS user_achievements (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"achievement_id" uuid,
	"unlocked_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_achievements_user_id_achievement_id_key" UNIQUE("user_id","achievement_id")
);

-- Добавляем новые колонки в существующие таблицы
ALTER TABLE meals ADD COLUMN IF NOT EXISTS calories integer;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS proteins numeric(5, 2);
ALTER TABLE meals ADD COLUMN IF NOT EXISTS fats numeric(5, 2);
ALTER TABLE meals ADD COLUMN IF NOT EXISTS carbs numeric(5, 2);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_date date DEFAULT CURRENT_DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS issued_at timestamp with time zone;

-- Добавляем дополнительные таблицы для улучшения функциональности

-- Таблица для хранения настроек приложения
CREATE TABLE IF NOT EXISTS app_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value jsonb,
    description text,
    updated_at timestamptz DEFAULT now()
);

-- Таблица для хранения уведомлений пользователей
CREATE TABLE IF NOT EXISTS user_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info', -- info, warning, success, error
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Таблица для хранения расписания работы столовой
CREATE TABLE IF NOT EXISTS cafeteria_schedule (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    opening_time time NOT NULL,
    closing_time time NOT NULL,
    is_closed boolean DEFAULT false,
    special_notes text,
    updated_at timestamptz DEFAULT now()
);

-- Таблица для хранения ингредиентов блюд
CREATE TABLE IF NOT EXISTS ingredients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    category text, -- meat, vegetable, dairy, etc.
    allergens text[], -- array of allergen names
    is_available boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Таблица связи блюд и ингредиентов
CREATE TABLE IF NOT EXISTS meal_ingredients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity numeric(8,2),
    unit text, -- grams, ml, pieces, etc.
    is_optional boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Таблица для хранения рецептов блюд
CREATE TABLE IF NOT EXISTS meal_recipes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id uuid NOT NULL,
    instructions text NOT NULL,
    preparation_time integer, -- in minutes
    cooking_time integer, -- in minutes
    difficulty text DEFAULT 'easy', -- easy, medium, hard
    servings integer DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

-- Таблица для хранения фотографий блюд
CREATE TABLE IF NOT EXISTS meal_photos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id uuid NOT NULL,
    photo_url text NOT NULL,
    is_primary boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    uploaded_at timestamptz DEFAULT now()
);

-- Таблица для хранения статистики просмотров блюд
CREATE TABLE IF NOT EXISTS meal_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id uuid NOT NULL,
    user_id uuid,
    viewed_at timestamptz DEFAULT now(),
    session_id text
);

-- Таблица для хранения корзин пользователей
CREATE TABLE IF NOT EXISTS user_carts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    meal_id uuid NOT NULL,
    quantity integer DEFAULT 1,
    added_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Таблица для хранения сессий пользователей
CREATE TABLE IF NOT EXISTS user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    session_token text UNIQUE NOT NULL,
    ip_address inet,
    user_agent text,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Таблица для хранения логов ошибок
CREATE TABLE IF NOT EXISTS error_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    error_type text NOT NULL,
    error_message text NOT NULL,
    stack_trace text,
    url text,
    user_agent text,
    ip_address inet,
    occurred_at timestamptz DEFAULT now()
);

-- Таблица для хранения обратной связи
CREATE TABLE IF NOT EXISTS feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    type text NOT NULL, -- bug, feature, general
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'new', -- new, in_progress, resolved, closed
    priority text DEFAULT 'normal', -- low, normal, high, urgent
    assigned_to uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Таблица для хранения ответов на обратную связь
CREATE TABLE IF NOT EXISTS feedback_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    is_internal boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Таблица для хранения новостей и объявлений
CREATE TABLE IF NOT EXISTS news (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    author_id uuid NOT NULL,
    is_published boolean DEFAULT false,
    published_at timestamptz,
    expires_at timestamptz,
    priority integer DEFAULT 0, -- higher number = higher priority
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Таблица для хранения просмотров новостей
CREATE TABLE IF NOT EXISTS news_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id uuid NOT NULL,
    user_id uuid,
    viewed_at timestamptz DEFAULT now()
);

-- Таблица для хранения меню на неделю
CREATE TABLE IF NOT EXISTS weekly_menus (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start date NOT NULL,
    week_end date NOT NULL,
    is_active boolean DEFAULT false,
    created_by uuid NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Таблица связи недельного меню и блюд
CREATE TABLE IF NOT EXISTS weekly_menu_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    weekly_menu_id uuid NOT NULL,
    meal_id uuid NOT NULL,
    day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    meal_type text NOT NULL, -- breakfast, lunch, dinner, snack
    created_at timestamptz DEFAULT now()
);

-- Таблица для хранения QR кодов заказов
CREATE TABLE IF NOT EXISTS order_qr_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL,
    qr_code text UNIQUE NOT NULL,
    is_used boolean DEFAULT false,
    used_at timestamptz,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Таблица для хранения логов действий администраторов
CREATE TABLE IF NOT EXISTS admin_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL,
    action text NOT NULL,
    target_type text, -- user, meal, order, etc.
    target_id uuid,
    details jsonb,
    ip_address inet,
    created_at timestamptz DEFAULT now()
);

-- Таблица для хранения резервных копий данных
CREATE TABLE IF NOT EXISTS data_backups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type text NOT NULL, -- full, incremental
    file_path text NOT NULL,
    file_size bigint,
    created_by uuid NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Создаем индексы для новых таблиц
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_cafeteria_schedule_day ON cafeteria_schedule (day_of_week);
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal ON meal_ingredients (meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_ingredient ON meal_ingredients (ingredient_id);
CREATE INDEX IF NOT EXISTS idx_meal_recipes_meal ON meal_recipes (meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_photos_meal ON meal_photos (meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_views_meal ON meal_views (meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_views_user ON meal_views (user_id);
CREATE INDEX IF NOT EXISTS idx_user_carts_user ON user_carts (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs (error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback (type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback (status);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_feedback ON feedback_responses (feedback_id);
CREATE INDEX IF NOT EXISTS idx_news_published ON news (is_published);
CREATE INDEX IF NOT EXISTS idx_news_priority ON news (priority DESC);
CREATE INDEX IF NOT EXISTS idx_news_views_news ON news_views (news_id);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_active ON weekly_menus (is_active);
CREATE INDEX IF NOT EXISTS idx_weekly_menu_items_menu ON weekly_menu_items (weekly_menu_id);
CREATE INDEX IF NOT EXISTS idx_order_qr_codes_order ON order_qr_codes (order_id);
CREATE INDEX IF NOT EXISTS idx_order_qr_codes_qr ON order_qr_codes (qr_code);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs (action);

-- Создаем триггеры для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Применяем триггер к таблицам
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'meal_categories', 'meals', 'promocodes', 'orders', 'profiles',
        'user_carts', 'feedback', 'news', 'weekly_menus'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;

-- Создаем функцию для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id, full_name, class_name)
    VALUES (NEW.id, '', '');
    
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    INSERT INTO loyalty_points (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_profile_on_user_insert
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Создаем функцию для обновления баланса при заказе
CREATE OR REPLACE FUNCTION update_balance_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Вычитаем сумму заказа из баланса
    UPDATE profiles
    SET balance = balance - NEW.final_amount
    WHERE user_id = NEW.user_id;
    
    -- Добавляем баллы лояльности (1 балл за каждые 10 гривен)
    INSERT INTO loyalty_transactions (user_id, order_id, points, reason)
    VALUES (NEW.user_id, NEW.id, floor(NEW.final_amount / 10), 'Заказ еды');
    
    UPDATE loyalty_points
    SET points = points + floor(NEW.final_amount / 10),
        total_earned = total_earned + floor(NEW.final_amount / 10)
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_balance_on_order_insert
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_on_order();

-- Создаем функцию для обновления использования промокода
CREATE OR REPLACE FUNCTION update_promocode_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.promocode_id IS NOT NULL THEN
        UPDATE promocodes
        SET current_uses = current_uses + 1
        WHERE id = NEW.promocode_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promocode_on_order_insert
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_promocode_usage();

-- Создаем функцию для проверки достижений
CREATE OR REPLACE FUNCTION check_achievements()
RETURNS TRIGGER AS $$
DECLARE
    user_orders_count integer;
    user_total_spent numeric;
    achievement_record record;
BEGIN
    -- Получаем статистику пользователя
    SELECT COUNT(*), COALESCE(SUM(final_amount), 0)
    INTO user_orders_count, user_total_spent
    FROM orders
    WHERE user_id = NEW.user_id;
    
    -- Проверяем достижения
    FOR achievement_record IN
        SELECT * FROM achievements
        WHERE id NOT IN (
            SELECT achievement_id FROM user_achievements WHERE user_id = NEW.user_id
        )
    LOOP
        -- Достижение "Первый заказ"
        IF achievement_record.name = 'Первый заказ' AND user_orders_count >= 1 THEN
            INSERT INTO user_achievements (user_id, achievement_id) VALUES (NEW.user_id, achievement_record.id);
            INSERT INTO user_notifications (user_id, title, message, type)
            VALUES (NEW.user_id, 'Новое достижение!', 'Вы получили достижение "' || achievement_record.name || '"', 'success');
        END IF;
        
        -- Достижение "10 заказов"
        IF achievement_record.name = '10 заказов' AND user_orders_count >= 10 THEN
            INSERT INTO user_achievements (user_id, achievement_id) VALUES (NEW.user_id, achievement_record.id);
            INSERT INTO user_notifications (user_id, title, message, type)
            VALUES (NEW.user_id, 'Новое достижение!', 'Вы получили достижение "' || achievement_record.name || '"', 'success');
        END IF;
        
        -- Достижение "Гурман" (потрачено 500+ гривен)
        IF achievement_record.name = 'Гурман' AND user_total_spent >= 500 THEN
            INSERT INTO user_achievements (user_id, achievement_id) VALUES (NEW.user_id, achievement_record.id);
            INSERT INTO user_notifications (user_id, title, message, type)
            VALUES (NEW.user_id, 'Новое достижение!', 'Вы получили достижение "' || achievement_record.name || '"', 'success');
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_achievements_on_order_insert
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION check_achievements();

-- Создаем функцию для очистки истекших сессий
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Создаем функцию для очистки старых логов
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    -- Удаляем логи активности старше 1 года
    DELETE FROM activity_log WHERE created_at < now() - interval '1 year';
    
    -- Удаляем логи ошибок старше 6 месяцев
    DELETE FROM error_logs WHERE occurred_at < now() - interval '6 months';
    
    -- Удаляем просмотры новостей старше 3 месяцев
    DELETE FROM news_views WHERE viewed_at < now() - interval '3 months';
END;
$$ LANGUAGE plpgsql;

-- Вставляем базовые данные
INSERT INTO meal_categories (name, description, sort_order) VALUES
('Горячие блюда', 'Основные горячие блюда', 1),
('Напитки', 'Чай, кофе, компоты', 2),
('Десерты', 'Сладости и выпечка', 3),
('Салаты', 'Холодные закуски', 4),
('Завтраки', 'Завтраки и каши', 5)
ON CONFLICT (name) DO NOTHING;

-- Вставляем достижения
INSERT INTO achievements (name, description, icon, points_reward) VALUES
('Первый заказ', 'Сделайте свой первый заказ в столовой', '🍽️', 10),
('10 заказов', 'Закажите еду 10 раз', '🔥', 50),
('Гурман', 'Потратьте в столовой 500 гривен', '👨‍🍳', 100),
('Отзывчивый', 'Оставьте 5 отзывов о блюдах', '⭐', 25),
('Экономный', 'Сэкономьте 100 гривен с промокодами', '💰', 30)
ON CONFLICT (name) DO NOTHING;

-- Вставляем настройки приложения
INSERT INTO app_settings (key, value, description) VALUES
('app_name', '"RNL FOOD"', 'Название приложения'),
('cafeteria_opening_time', '"08:00"', 'Время открытия столовой'),
('cafeteria_closing_time', '"18:00"', 'Время закрытия столовой'),
('max_order_advance_days', '7', 'Максимум дней вперед для заказа'),
('loyalty_points_per_10_uah', '1', 'Баллов лояльности за каждые 10 гривен'),
('min_balance_for_order', '0', 'Минимальный баланс для заказа'),
('max_daily_orders_per_user', '5', 'Максимум заказов в день на пользователя')
ON CONFLICT (key) DO NOTHING;

-- Вставляем расписание работы столовой (понедельник - пятница)
INSERT INTO cafeteria_schedule (day_of_week, opening_time, closing_time) VALUES
(1, '08:00', '18:00'), -- Понедельник
(2, '08:00', '18:00'), -- Вторник
(3, '08:00', '18:00'), -- Среда
(4, '08:00', '18:00'), -- Четверг
(5, '08:00', '18:00'), -- Пятница
(6, '09:00', '16:00'), -- Суббота
(0, '10:00', '15:00')  -- Воскресенье
ON CONFLICT (day_of_week) DO NOTHING;

-- Создаем представление для популярных блюд
CREATE OR REPLACE VIEW popular_meals AS
SELECT
    m.*,
    mc.name as category_name,
    COALESCE(AVG(mr.rating), 0) as avg_rating,
    COUNT(mr.id) as review_count,
    COUNT(oi.id) as order_count
FROM meals m
LEFT JOIN meal_categories mc ON m.category_id = mc.id
LEFT JOIN meal_reviews mr ON m.id = mr.meal_id
LEFT JOIN order_items oi ON m.id = oi.meal_id
WHERE m.is_available = true
GROUP BY m.id, mc.name
ORDER BY order_count DESC, avg_rating DESC;

-- Создаем представление для статистики пользователей
CREATE OR REPLACE VIEW user_statistics AS
SELECT
    u.id,
    u.username,
    p.full_name,
    p.class_name,
    p.balance,
    ur.role,
    COALESCE(lp.points, 0) as loyalty_points,
    COALESCE(order_stats.total_orders, 0) as total_orders,
    COALESCE(order_stats.total_spent, 0) as total_spent,
    COALESCE(order_stats.last_order_date, null) as last_order_date
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN loyalty_points lp ON u.id = lp.user_id
LEFT JOIN (
    SELECT
        user_id,
        COUNT(*) as total_orders,
        SUM(final_amount) as total_spent,
        MAX(created_at) as last_order_date
    FROM orders
    GROUP BY user_id
) order_stats ON u.id = order_stats.user_id;

-- Создаем представление для ежедневной статистики
CREATE OR REPLACE VIEW daily_statistics AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_orders,
    SUM(final_amount) as total_revenue,
    AVG(final_amount) as avg_order_value,
    COUNT(DISTINCT user_id) as unique_customers
FROM orders
WHERE status != 'cancelled'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Создаем представление для статистики блюд
CREATE OR REPLACE VIEW meal_statistics AS
SELECT
    m.id,
    m.name,
    mc.name as category,
    COUNT(oi.id) as total_orders,
    SUM(oi.total_price) as total_revenue,
    AVG(mr.rating) as avg_rating,
    COUNT(mr.id) as review_count,
    MAX(o.created_at) as last_ordered
FROM meals m
LEFT JOIN meal_categories mc ON m.category_id = mc.id
LEFT JOIN order_items oi ON m.id = oi.meal_id
LEFT JOIN orders o ON oi.order_id = o.id
LEFT JOIN meal_reviews mr ON m.id = mr.meal_id
GROUP BY m.id, m.name, mc.name;
CREATE UNIQUE INDEX "favorite_meals_user_id_meal_id_key" ON "favorite_meals" ("user_id","meal_id");
CREATE INDEX "idx_favorite_meals_user" ON "favorite_meals" ("user_id");
CREATE INDEX "idx_loyalty_points_user" ON "loyalty_points" ("user_id");
CREATE UNIQUE INDEX "loyalty_points_pkey" ON "loyalty_points" ("id");
CREATE UNIQUE INDEX "loyalty_transactions_pkey" ON "loyalty_transactions" ("id");
CREATE UNIQUE INDEX "meal_categories_pkey" ON "meal_categories" ("id");
CREATE INDEX "idx_meal_reviews_meal" ON "meal_reviews" ("meal_id");
CREATE UNIQUE INDEX "meal_reviews_pkey" ON "meal_reviews" ("id");
CREATE UNIQUE INDEX "meal_reviews_user_id_order_item_id_key" ON "meal_reviews" ("user_id","order_item_id");
CREATE INDEX "idx_meals_category_id" ON "meals" ("category_id");
CREATE INDEX "idx_meals_is_available" ON "meals" ("is_available");
CREATE UNIQUE INDEX "meals_pkey" ON "meals" ("id");
CREATE INDEX "idx_order_items_order_id" ON "order_items" ("order_id");
CREATE UNIQUE INDEX "order_items_pkey" ON "order_items" ("id");
CREATE INDEX "idx_orders_order_date" ON "orders" ("order_date");
CREATE INDEX "idx_orders_status" ON "orders" ("status");
CREATE INDEX "idx_orders_user_date" ON "orders" ("user_id","order_date");
CREATE INDEX "idx_orders_user_id" ON "orders" ("user_id");
CREATE UNIQUE INDEX "orders_pkey" ON "orders" ("id");
CREATE INDEX "idx_parent_child_child" ON "parent_child" ("child_user_id");
CREATE INDEX "idx_parent_child_parent" ON "parent_child" ("parent_user_id");
CREATE UNIQUE INDEX "parent_child_parent_user_id_child_user_id_key" ON "parent_child" ("parent_user_id","child_user_id");
CREATE UNIQUE INDEX "parent_child_pkey" ON "parent_child" ("id");
CREATE INDEX "idx_payments_user_id" ON "payments" ("user_id");
CREATE UNIQUE INDEX "payments_pkey" ON "payments" ("id");
CREATE INDEX "idx_profiles_user_id" ON "profiles" ("user_id");
CREATE UNIQUE INDEX "profiles_pkey" ON "profiles" ("id");
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles" ("user_id");
CREATE UNIQUE INDEX "promocodes_code_key" ON "promocodes" ("code");
CREATE UNIQUE INDEX "promocodes_pkey" ON "promocodes" ("id");
CREATE INDEX "idx_push_user" ON "push_subscriptions" ("user_id");
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions" ("endpoint");
CREATE UNIQUE INDEX "push_subscriptions_pkey" ON "push_subscriptions" ("id");
CREATE UNIQUE INDEX "user_achievements_pkey" ON "user_achievements" ("id");
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements" ("user_id","achievement_id");
CREATE UNIQUE INDEX "user_roles_pkey" ON "user_roles" ("id");
CREATE INDEX "idx_users_username" ON "users" ("username");
CREATE UNIQUE INDEX "idx_users_username_lower" ON "users" ("lower(username)");
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
CREATE UNIQUE INDEX "users_pkey" ON "users" ("id");
CREATE UNIQUE INDEX "users_username_key" ON "users" ("username");
