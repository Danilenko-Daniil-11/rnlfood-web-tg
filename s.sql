CREATE SCHEMA "public";
CREATE TYPE "order_status" AS ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
CREATE TYPE "payment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE "app_role" AS ENUM('user', 'staff', 'admin');
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"description" text,
	"icon" text DEFAULT '🏆',
	"points_reward" integer DEFAULT 50
);
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"action" text NOT NULL,
	"details" jsonb,
	"ip_address" inet,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "balance_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"profile_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"method" text NOT NULL,
	"status" payment_status DEFAULT 'completed',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "balance_transactions_method_check" CHECK (CHECK ((method = ANY (ARRAY['crypto'::text, 'card'::text, 'cash'::text]))))
);
CREATE TABLE "favorite_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid UNIQUE,
	"meal_id" uuid UNIQUE,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "favorite_meals_user_id_meal_id_key" UNIQUE("user_id","meal_id")
);
CREATE TABLE "loyalty_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"points" integer DEFAULT 0,
	"total_earned" integer DEFAULT 0,
	"total_spent" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "loyalty_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"order_id" uuid,
	"points" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "meal_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "meal_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid UNIQUE,
	"meal_id" uuid,
	"order_item_id" uuid UNIQUE,
	"rating" smallint NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "meal_reviews_user_id_order_item_id_key" UNIQUE("user_id","order_item_id"),
	CONSTRAINT "meal_reviews_rating_check" CHECK (CHECK (((rating >= 1) AND (rating <= 5))))
);
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"category_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"image_url" text,
	"ingredients" text[],
	"allergens" text[],
	"is_vegetarian" boolean DEFAULT false,
	"is_available" boolean DEFAULT true,
	"preparation_time" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"calories" integer,
	"proteins" numeric(5, 2),
	"fats" numeric(5, 2),
	"carbs" numeric(5, 2)
);
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"order_id" uuid,
	"meal_id" uuid,
	"quantity" integer DEFAULT 1,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0.00',
	"final_amount" numeric(10, 2) NOT NULL,
	"promocode_id" uuid,
	"status" text DEFAULT 'pending',
	"pickup_time" timestamp with time zone,
	"qr_code" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"order_date" date DEFAULT CURRENT_DATE,
	"issued_at" timestamp with time zone,
	"issued_by" uuid
);
CREATE TABLE "parent_child" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"parent_user_id" uuid UNIQUE,
	"child_user_id" uuid UNIQUE,
	"relationship" text DEFAULT 'родитель',
	"can_topup" boolean DEFAULT true,
	"can_view_orders" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "parent_child_parent_user_id_child_user_id_key" UNIQUE("parent_user_id","child_user_id")
);
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"status" payment_status DEFAULT 'pending',
	"transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL CONSTRAINT "profiles_user_id_key" UNIQUE,
	"full_name" text NOT NULL,
	"class_name" text,
	"balance" numeric(10, 2) DEFAULT '0.00',
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"role" app_role DEFAULT 'user',
	"parents" text,
	"age" smallint,
	"allergens" text[] DEFAULT '{}',
	CONSTRAINT "profiles_age_check" CHECK (CHECK (((age >= 10) AND (age <= 18))))
);
CREATE TABLE "promocodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" text NOT NULL CONSTRAINT "promocodes_code_key" UNIQUE,
	"discount_amount" numeric(10, 2),
	"discount_percentage" integer,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"endpoint" text NOT NULL CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE,
	"keys_auth" text NOT NULL,
	"keys_p256dh" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid UNIQUE,
	"achievement_id" uuid UNIQUE,
	"unlocked_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_achievements_user_id_achievement_id_key" UNIQUE("user_id","achievement_id")
);
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"role" app_role DEFAULT 'user',
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"username" text NOT NULL CONSTRAINT "users_username_key" UNIQUE,
	"email" text CONSTRAINT "users_email_key" UNIQUE,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id");
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "favorite_meals" ADD CONSTRAINT "favorite_meals_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE;
ALTER TABLE "favorite_meals" ADD CONSTRAINT "favorite_meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id");
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "meal_reviews" ADD CONSTRAINT "meal_reviews_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE;
ALTER TABLE "meal_reviews" ADD CONSTRAINT "meal_reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id");
ALTER TABLE "meal_reviews" ADD CONSTRAINT "meal_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "meals" ADD CONSTRAINT "meals_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "meal_categories"("id");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id");
ALTER TABLE "orders" ADD CONSTRAINT "orders_promocode_id_fkey" FOREIGN KEY ("promocode_id") REFERENCES "promocodes"("id");
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "parent_child" ADD CONSTRAINT "parent_child_child_user_id_fkey" FOREIGN KEY ("child_user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "parent_child" ADD CONSTRAINT "parent_child_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "promocodes" ADD CONSTRAINT "promocodes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id");
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
CREATE UNIQUE INDEX "achievements_pkey" ON "achievements" ("id");
CREATE UNIQUE INDEX "activity_log_pkey" ON "activity_log" ("id");
CREATE INDEX "idx_activity_log_action" ON "activity_log" ("action");
CREATE INDEX "idx_activity_log_user" ON "activity_log" ("user_id");
CREATE UNIQUE INDEX "balance_transactions_pkey" ON "balance_transactions" ("id");
CREATE UNIQUE INDEX "favorite_meals_pkey" ON "favorite_meals" ("id");
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