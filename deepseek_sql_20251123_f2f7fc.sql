-- Создаем enum типы сначала
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE app_role AS ENUM ('user', 'staff', 'admin');

-- Таблица категорий блюд
CREATE TABLE meal_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Таблица блюд
CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES meal_categories(id),
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  ingredients text[], -- Исправляем ARRAY на text[]
  allergens text[],   -- Исправляем ARRAY на text[]
  is_vegetarian boolean DEFAULT false,
  is_available boolean DEFAULT true,
  preparation_time integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица промокодов
CREATE TABLE promocodes (
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

-- Таблица заказов
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- Без foreign key к auth.users
  total_amount numeric NOT NULL,
  discount_amount numeric DEFAULT 0.00,
  final_amount numeric NOT NULL,
  promocode_id uuid REFERENCES promocodes(id),
  status order_status DEFAULT 'pending',
  pickup_time timestamptz,
  qr_code text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица элементов заказа
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  meal_id uuid REFERENCES meals(id),
  quantity integer DEFAULT 1,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Таблица профилей пользователей
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  full_name text NOT NULL,
  class_name text,
  balance numeric DEFAULT 0.00,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица платежей
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  status payment_status DEFAULT 'pending',
  transaction_id text,
  created_at timestamptz DEFAULT now()
);

-- Таблица ролей пользователей
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- Вставляем тестовые данные
INSERT INTO meal_categories (name, description, sort_order) VALUES
('Горячее', 'Основные горячие блюда', 1),
('Напитки', 'Напитки и соки', 2),
('Салаты', 'Свежие салаты', 3),
('Десерты', 'Сладости и выпечка', 4);

INSERT INTO meals (category_id, name, description, price, ingredients, allergens, is_vegetarian, preparation_time) VALUES
((SELECT id FROM meal_categories WHERE name = 'Горячее'), 'Куриный суп', 'Ароматный куриный суп с овощами', 25.00, '{"курица", "картофель", "морковь", "лук"}', '{}', false, 15),
((SELECT id FROM meal_categories WHERE name = 'Горячее'), 'Гречневая каша', 'Гречневая каша с маслом', 30.00, '{"гречка", "масло", "соль"}', '{}', true, 10),
((SELECT id FROM meal_categories WHERE name = 'Горячее'), 'Котлета с пюре', 'Котлета куриная с картофельным пюре', 40.00, '{"курица", "картофель", "молоко", "масло"}', '{"молоко"}', false, 20),
((SELECT id FROM meal_categories WHERE name = 'Напитки'), 'Чай', 'Черный или зеленый чай', 15.00, '{"чай", "вода", "сахар"}', '{}', true, 5),
((SELECT id FROM meal_categories WHERE name = 'Напитки'), 'Компот', 'Компот из сухофруктов', 12.00, '{"сухофрукты", "вода", "сахар"}', '{}', true, 5),
((SELECT id FROM meal_categories WHERE name = 'Салаты'), 'Салат овощной', 'Свежий овощной салат', 20.00, '{"помидоры", "огурцы", "лук", "масло"}', '{}', true, 10),
((SELECT id FROM meal_categories WHERE name = 'Десерты'), 'Шарлотка', 'Яблочная шарлотка', 18.00, '{"яблоки", "мука", "яйца", "сахар"}', '{"глютен", "яйца"}', true, 15);

INSERT INTO promocodes (code, discount_percentage, max_uses, expires_at) VALUES
('WELCOME10', 10, 100, '2025-12-31 23:59:59'),
('STUDENT15', 15, 200, '2025-12-31 23:59:59'),
('SUMMER20', 20, 50, '2025-08-31 23:59:59');

-- Создаем индексы для улучшения производительности
CREATE INDEX idx_meals_category_id ON meals(category_id);
CREATE INDEX idx_meals_is_available ON meals(is_available);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);