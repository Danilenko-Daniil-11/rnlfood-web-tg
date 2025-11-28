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