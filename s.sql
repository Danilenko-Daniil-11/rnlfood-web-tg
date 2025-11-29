-- Упрощенная схема базы данных для приложения "РНЛ ЕДА"
-- Адаптирована под текущий код приложения

CREATE SCHEMA "public";

-- Перечисления
CREATE TYPE "order_status" AS ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
CREATE TYPE "app_role" AS ENUM('user', 'admin');

-- Основные таблицы
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"username" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"email" text UNIQUE,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id"),
	"full_name" text NOT NULL,
	"class_name" text,
	"balance" numeric(10, 2) DEFAULT 0.00,
	"role" app_role DEFAULT 'user',
	"parents" text,
	"age" smallint,
	"avatar" text,
	"allergens" text[] DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"category_name" text DEFAULT 'Горячее',
	"image_url" text,
	"calories" integer,
	"allergens" text[] DEFAULT '{}',
	"is_vegetarian" boolean DEFAULT false,
	"is_gluten_free" boolean DEFAULT false,
	"rating" numeric(3,1) DEFAULT 4.0,
	"is_new" boolean DEFAULT false,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL REFERENCES "users"("id"),
	"total_amount" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT 0.00,
	"final_amount" numeric(10, 2) NOT NULL,
	"promocode_id" uuid,
	"status" order_status DEFAULT 'pending',
	"items" jsonb, -- JSON с элементами заказа
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "promocodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" text NOT NULL UNIQUE,
	"discount_percentage" integer,
	"discount_percent" integer, -- для обратной совместимости
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"created_by" uuid REFERENCES "users"("id"),
	"created_at" timestamp with time zone DEFAULT now()
);

-- Дополнительные таблицы для расширенного функционала
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"description" text,
	"icon" text DEFAULT '🏆',
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"achievement_id" uuid NOT NULL REFERENCES "achievements"("id"),
	"unlocked_at" timestamp with time zone DEFAULT now(),
	UNIQUE("user_id", "achievement_id")
);

CREATE TABLE "favorite_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"meal_id" uuid NOT NULL REFERENCES "meals"("id") ON DELETE CASCADE,
	"created_at" timestamp with time zone DEFAULT now(),
	UNIQUE("user_id", "meal_id")
);

CREATE TABLE "user_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"meal_id" uuid NOT NULL REFERENCES "meals"("id") ON DELETE CASCADE,
	"quantity" integer DEFAULT 1,
	"added_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	UNIQUE("user_id", "meal_id")
);

CREATE TABLE "balance_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL REFERENCES "users"("id"),
	"amount" numeric(10, 2) NOT NULL,
	"method" text NOT NULL CHECK (method IN ('crypto', 'card', 'cash')),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "user_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info',
	"is_read" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"endpoint" text NOT NULL UNIQUE,
	"keys_auth" text NOT NULL,
	"keys_p256dh" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL REFERENCES "users"("id"),
	"session_token" text NOT NULL UNIQUE,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);

-- Индексы для оптимизации запросов
CREATE INDEX "idx_users_username" ON "users" ("username");
CREATE UNIQUE INDEX "users_username_key" ON "users" ("username");
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");

CREATE INDEX "idx_profiles_user_id" ON "profiles" ("user_id");

CREATE INDEX "idx_meals_category_name" ON "meals" ("category_name");
CREATE INDEX "idx_meals_is_available" ON "meals" ("is_available");
CREATE INDEX "idx_meals_rating" ON "meals" ("rating");

CREATE INDEX "idx_orders_user_id" ON "orders" ("user_id");
CREATE INDEX "idx_orders_status" ON "orders" ("status");
CREATE INDEX "idx_orders_created_at" ON "orders" ("created_at");

CREATE UNIQUE INDEX "promocodes_code_key" ON "promocodes" ("code");

CREATE INDEX "idx_user_achievements_user" ON "user_achievements" ("user_id");

CREATE INDEX "idx_favorite_meals_user" ON "favorite_meals" ("user_id");

CREATE INDEX "idx_user_carts_user" ON "user_carts" ("user_id");

CREATE INDEX "idx_balance_transactions_user" ON "balance_transactions" ("user_id");

CREATE INDEX "idx_user_notifications_user" ON "user_notifications" ("user_id");
CREATE INDEX "idx_user_notifications_read" ON "user_notifications" ("is_read");

CREATE INDEX "idx_user_sessions_token" ON "user_sessions" ("session_token");
CREATE INDEX "idx_user_sessions_user" ON "user_sessions" ("user_id");

-- Начальные данные для тестирования
INSERT INTO "achievements" ("name", "description", "icon") VALUES
('Первый заказ', 'Сделайте свой первый заказ в столовой', '🏆'),
('Гурман', 'Попробуйте 10 разных блюд', '🍕'),
('Здоровое питание', 'Закажите 5 салатов', '🥗'),
('Сладкоежка', 'Попробуйте все десерты', '🍰');

INSERT INTO "promocodes" ("code", "discount_percentage", "expires_at", "is_active") VALUES
('WELCOME10', 10, '2025-12-31 23:59:59+00', true),
('STUDENT15', 15, '2025-12-31 23:59:59+00', true),
('SUMMER20', 20, '2025-08-31 23:59:59+00', true);
