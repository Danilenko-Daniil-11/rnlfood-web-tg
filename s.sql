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
CREATE TABLE "admin_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"details" jsonb,
	"ip_address" inet,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key" text NOT NULL CONSTRAINT "app_settings_key_key" UNIQUE,
	"value" jsonb,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now()
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
CREATE TABLE "cafeteria_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"day_of_week" integer NOT NULL,
	"opening_time" time NOT NULL,
	"closing_time" time NOT NULL,
	"is_closed" boolean DEFAULT false,
	"special_notes" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cafeteria_schedule_day_of_week_check" CHECK (CHECK (((day_of_week >= 0) AND (day_of_week <= 6))))
);
CREATE TABLE "data_backups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"backup_type" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" bigint,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "error_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"error_type" text NOT NULL,
	"error_message" text NOT NULL,
	"stack_trace" text,
	"url" text,
	"user_agent" text,
	"ip_address" inet,
	"occurred_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "favorite_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid UNIQUE,
	"meal_id" uuid UNIQUE,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "favorite_meals_user_id_meal_id_key" UNIQUE("user_id","meal_id")
);
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'new',
	"priority" text DEFAULT 'normal',
	"assigned_to" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "feedback_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"feedback_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL CONSTRAINT "ingredients_name_key" UNIQUE,
	"category" text,
	"allergens" text[],
	"is_available" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
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
CREATE TABLE "meal_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"meal_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"quantity" numeric(8, 2),
	"unit" text,
	"is_optional" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "meal_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"meal_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"is_primary" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"uploaded_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "meal_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"meal_id" uuid NOT NULL,
	"instructions" text NOT NULL,
	"preparation_time" integer,
	"cooking_time" integer,
	"difficulty" text DEFAULT 'easy',
	"servings" integer DEFAULT 1,
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
CREATE TABLE "meal_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"meal_id" uuid NOT NULL,
	"user_id" uuid,
	"viewed_at" timestamp with time zone DEFAULT now(),
	"session_id" text
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
CREATE TABLE "news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" text NOT NULL,
	"content" text NOT NULL,
	"author_id" uuid NOT NULL,
	"is_published" boolean DEFAULT false,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"priority" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "news_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"news_id" uuid NOT NULL,
	"user_id" uuid,
	"viewed_at" timestamp with time zone DEFAULT now()
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
CREATE TABLE "order_qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"order_id" uuid NOT NULL,
	"qr_code" text NOT NULL CONSTRAINT "order_qr_codes_qr_code_key" UNIQUE,
	"is_used" boolean DEFAULT false,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
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
CREATE TABLE "user_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"meal_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1,
	"added_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "user_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info',
	"is_read" boolean DEFAULT false,
	"order_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"role" app_role DEFAULT 'user',
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"session_token" text NOT NULL CONSTRAINT "user_sessions_session_token_key" UNIQUE,
	"ip_address" inet,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
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
CREATE TABLE "weekly_menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"weekly_menu_id" uuid NOT NULL,
	"meal_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"meal_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "weekly_menu_items_day_of_week_check" CHECK (CHECK (((day_of_week >= 0) AND (day_of_week <= 6))))
);
CREATE TABLE "weekly_menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"week_start" date NOT NULL,
	"week_end" date NOT NULL,
	"is_active" boolean DEFAULT false,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
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
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
CREATE UNIQUE INDEX "achievements_pkey" ON "achievements" ("id");
CREATE UNIQUE INDEX "activity_log_pkey" ON "activity_log" ("id");
CREATE INDEX "idx_activity_log_action" ON "activity_log" ("action");
CREATE INDEX "idx_activity_log_user" ON "activity_log" ("user_id");
CREATE UNIQUE INDEX "admin_logs_pkey" ON "admin_logs" ("id");
CREATE INDEX "idx_admin_logs_action" ON "admin_logs" ("action");
CREATE INDEX "idx_admin_logs_admin" ON "admin_logs" ("admin_id");
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings" ("key");
CREATE UNIQUE INDEX "app_settings_pkey" ON "app_settings" ("id");
CREATE UNIQUE INDEX "balance_transactions_pkey" ON "balance_transactions" ("id");
CREATE UNIQUE INDEX "cafeteria_schedule_pkey" ON "cafeteria_schedule" ("id");
CREATE INDEX "idx_cafeteria_schedule_day" ON "cafeteria_schedule" ("day_of_week");
CREATE UNIQUE INDEX "data_backups_pkey" ON "data_backups" ("id");
CREATE UNIQUE INDEX "error_logs_pkey" ON "error_logs" ("id");
CREATE INDEX "idx_error_logs_type" ON "error_logs" ("error_type");
CREATE INDEX "idx_error_logs_user" ON "error_logs" ("user_id");
CREATE UNIQUE INDEX "favorite_meals_pkey" ON "favorite_meals" ("id");
CREATE UNIQUE INDEX "favorite_meals_user_id_meal_id_key" ON "favorite_meals" ("user_id","meal_id");
CREATE INDEX "idx_favorite_meals_user" ON "favorite_meals" ("user_id");
CREATE UNIQUE INDEX "feedback_pkey" ON "feedback" ("id");
CREATE INDEX "idx_feedback_status" ON "feedback" ("status");
CREATE INDEX "idx_feedback_type" ON "feedback" ("type");
CREATE UNIQUE INDEX "feedback_responses_pkey" ON "feedback_responses" ("id");
CREATE INDEX "idx_feedback_responses_feedback" ON "feedback_responses" ("feedback_id");
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients" ("name");
CREATE UNIQUE INDEX "ingredients_pkey" ON "ingredients" ("id");
CREATE INDEX "idx_loyalty_points_user" ON "loyalty_points" ("user_id");
CREATE UNIQUE INDEX "loyalty_points_pkey" ON "loyalty_points" ("id");
CREATE UNIQUE INDEX "loyalty_transactions_pkey" ON "loyalty_transactions" ("id");
CREATE UNIQUE INDEX "meal_categories_pkey" ON "meal_categories" ("id");
CREATE INDEX "idx_meal_ingredients_ingredient" ON "meal_ingredients" ("ingredient_id");
CREATE INDEX "idx_meal_ingredients_meal" ON "meal_ingredients" ("meal_id");
CREATE UNIQUE INDEX "meal_ingredients_pkey" ON "meal_ingredients" ("id");
CREATE INDEX "idx_meal_photos_meal" ON "meal_photos" ("meal_id");
CREATE UNIQUE INDEX "meal_photos_pkey" ON "meal_photos" ("id");
CREATE INDEX "idx_meal_recipes_meal" ON "meal_recipes" ("meal_id");
CREATE UNIQUE INDEX "meal_recipes_pkey" ON "meal_recipes" ("id");
CREATE INDEX "idx_meal_reviews_meal" ON "meal_reviews" ("meal_id");
CREATE UNIQUE INDEX "meal_reviews_pkey" ON "meal_reviews" ("id");
CREATE UNIQUE INDEX "meal_reviews_user_id_order_item_id_key" ON "meal_reviews" ("user_id","order_item_id");
CREATE INDEX "idx_meal_views_meal" ON "meal_views" ("meal_id");
CREATE INDEX "idx_meal_views_user" ON "meal_views" ("user_id");
CREATE UNIQUE INDEX "meal_views_pkey" ON "meal_views" ("id");
CREATE INDEX "idx_meals_category_id" ON "meals" ("category_id");
CREATE INDEX "idx_meals_is_available" ON "meals" ("is_available");
CREATE UNIQUE INDEX "meals_pkey" ON "meals" ("id");
CREATE INDEX "idx_news_priority" ON "news" ("priority");
CREATE INDEX "idx_news_published" ON "news" ("is_published");
CREATE UNIQUE INDEX "news_pkey" ON "news" ("id");
CREATE INDEX "idx_news_views_news" ON "news_views" ("news_id");
CREATE UNIQUE INDEX "news_views_pkey" ON "news_views" ("id");
CREATE INDEX "idx_order_items_order_id" ON "order_items" ("order_id");
CREATE UNIQUE INDEX "order_items_pkey" ON "order_items" ("id");
CREATE INDEX "idx_order_qr_codes_order" ON "order_qr_codes" ("order_id");
CREATE INDEX "idx_order_qr_codes_qr" ON "order_qr_codes" ("qr_code");
CREATE UNIQUE INDEX "order_qr_codes_pkey" ON "order_qr_codes" ("id");
CREATE UNIQUE INDEX "order_qr_codes_qr_code_key" ON "order_qr_codes" ("qr_code");
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
CREATE INDEX "idx_user_carts_user" ON "user_carts" ("user_id");
CREATE UNIQUE INDEX "user_carts_pkey" ON "user_carts" ("id");
CREATE INDEX "idx_user_notifications_read" ON "user_notifications" ("is_read");
CREATE INDEX "idx_user_notifications_user" ON "user_notifications" ("user_id");
CREATE INDEX "idx_user_notifications_order" ON "user_notifications" ("order_id");
CREATE UNIQUE INDEX "user_notifications_pkey" ON "user_notifications" ("id");
CREATE UNIQUE INDEX "user_roles_pkey" ON "user_roles" ("id");
CREATE INDEX "idx_user_sessions_token" ON "user_sessions" ("session_token");
CREATE INDEX "idx_user_sessions_user" ON "user_sessions" ("user_id");
CREATE UNIQUE INDEX "user_sessions_pkey" ON "user_sessions" ("id");
CREATE UNIQUE INDEX "user_sessions_session_token_key" ON "user_sessions" ("session_token");
CREATE INDEX "idx_users_username" ON "users" ("username");
CREATE UNIQUE INDEX "idx_users_username_lower" ON "users" ("lower(username)");
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
CREATE UNIQUE INDEX "users_pkey" ON "users" ("id");
CREATE UNIQUE INDEX "users_username_key" ON "users" ("username");
CREATE INDEX "idx_weekly_menu_items_menu" ON "weekly_menu_items" ("weekly_menu_id");
CREATE UNIQUE INDEX "weekly_menu_items_pkey" ON "weekly_menu_items" ("id");
CREATE INDEX "idx_weekly_menus_active" ON "weekly_menus" ("is_active");
CREATE UNIQUE INDEX "weekly_menus_pkey" ON "weekly_menus" ("id");
