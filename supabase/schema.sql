-- Cawnpore Opticals — Supabase (PostgreSQL) schema
-- Run this in Supabase Dashboard → SQL Editor → New query → Run

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'eyeglasses',
  brand TEXT DEFAULT 'Cawnpore',
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC DEFAULT 0,
  rating NUMERIC DEFAULT 4.5,
  reviews INTEGER DEFAULT 0,
  badge TEXT,
  colors JSONB DEFAULT '[]'::jsonb,
  sizes JSONB DEFAULT '[]'::jsonb,
  description TEXT DEFAULT '',
  features JSONB DEFAULT '[]'::jsonb,
  image TEXT DEFAULT 'aviator',
  gender TEXT DEFAULT 'unisex',
  stock INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_email TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  payment TEXT DEFAULT 'cod',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  shipping NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- ---------------------------------------------------------------------------
-- Auto-update updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- NOTE: Policies below match the current open admin model (client-side login).
-- For production, replace with Supabase Auth + role-based policies.
-- ---------------------------------------------------------------------------

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;

CREATE POLICY "products_select" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "products_update" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "products_delete" ON products FOR DELETE USING (true);

CREATE POLICY "orders_select" ON orders FOR SELECT USING (true);
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "orders_delete" ON orders FOR DELETE USING (true);

-- ---------------------------------------------------------------------------
-- Seed catalog (skip if products already exist)
-- ---------------------------------------------------------------------------

INSERT INTO products (
  id, name, category, brand, price, original_price, rating, reviews,
  badge, colors, sizes, description, features, image, gender, stock
)
SELECT * FROM (VALUES
  ('co-001', 'Awadh Classic Aviator', 'sunglasses', 'Cawnpore', 2499, 3499, 4.8, 124, 'Bestseller', '["Gold", "Silver", "Black"]'::jsonb, '["Free Size"]'::jsonb, 'Timeless aviator frames with UV400 protection and lightweight metal build. Inspired by classic Kanpur craftsmanship.', '["UV400 Protection", "Polarized Lenses", "Metal Frame", "Adjustable Nose Pads"]'::jsonb, 'aviator', 'unisex', 50),
  ('co-002', 'Ganga Blue Blocker', 'eyeglasses', 'Cawnpore', 1899, 2599, 4.7, 89, 'New', '["Black", "Tortoise", "Transparent"]'::jsonb, '["S", "M", "L"]'::jsonb, 'Premium blue-light blocking eyeglasses for long screen hours. Anti-glare coating keeps eyes fresh all day.', '["Blue Light Filter", "Anti-Glare", "Lightweight TR90", "Spring Hinges"]'::jsonb, 'blueblocker', 'unisex', 50),
  ('co-003', 'Kanpur Round Vintage', 'eyeglasses', 'Cawnpore', 1599, 2199, 4.6, 67, NULL::text, '["Gold", "Black", "Rose Gold"]'::jsonb, '["S", "M"]'::jsonb, 'Vintage round frames with a modern fit. Perfect everyday style for work and weekends.', '["Acetate Frame", "Comfort Nose Pads", "Scratch Resistant", "Prescription Ready"]'::jsonb, 'round', 'unisex', 50),
  ('co-004', 'Rajwada Cat-Eye', 'sunglasses', 'Cawnpore', 2799, 3999, 4.9, 156, 'Hot', '["Black", "Tortoise", "Red"]'::jsonb, '["Free Size"]'::jsonb, 'Bold cat-eye sunglasses with gradient lenses. A regal look for sunny days and evening outings.', '["Gradient Lenses", "UV400", "Acetate Frame", "Case Included"]'::jsonb, 'cateye', 'women', 40),
  ('co-005', 'Metro Square Pro', 'eyeglasses', 'Cawnpore', 2199, 2999, 4.5, 43, NULL::text, '["Matte Black", "Gunmetal", "Navy"]'::jsonb, '["M", "L"]'::jsonb, 'Sharp square frames for a professional look. Durable, lightweight, and prescription-ready.', '["TR90 Frame", "Blue Light Option", "Flexible Arms", "Anti-Scratch"]'::jsonb, 'square', 'men', 45),
  ('co-006', 'Sunrise Wayfarer', 'sunglasses', 'Cawnpore', 1999, 2799, 4.7, 98, 'Sale', '["Black", "Tortoise", "Clear"]'::jsonb, '["Free Size"]'::jsonb, 'Iconic wayfarer silhouette with polarized lenses. Everyday comfort with all-day UV protection.', '["Polarized", "UV400", "Impact Resistant", "Soft Pouch"]'::jsonb, 'wayfarer', 'unisex', 55),
  ('co-007', 'Kids Sparkle Frame', 'kids', 'Cawnpore', 999, 1499, 4.8, 52, 'Kids', '["Blue", "Pink", "Green"]'::jsonb, '["XS", "S"]'::jsonb, 'Fun, durable frames for kids with flexible hinges and shatter-resistant lenses.', '["Flexible Hinges", "Lightweight", "Hypoallergenic", "Safe Lenses"]'::jsonb, 'kids', 'kids', 30),
  ('co-008', 'Night Drive Clip-On', 'accessories', 'Cawnpore', 799, 1199, 4.4, 31, NULL::text, '["Yellow", "Grey"]'::jsonb, '["Universal"]'::jsonb, 'Magnetic clip-on lenses for night driving and glare reduction. Fits most prescription frames.', '["Magnetic Clip", "Anti-Glare", "Easy Attach", "Portable Case"]'::jsonb, 'clipon', 'unisex', 80),
  ('co-009', 'Silk Route Rimless', 'eyeglasses', 'Cawnpore', 3299, 4499, 4.9, 78, 'Premium', '["Silver", "Gold", "Titanium Grey"]'::jsonb, '["M", "L"]'::jsonb, 'Ultra-light rimless titanium frames. Barely-there comfort with a refined professional finish.', '["Titanium", "Rimless", "Hypoallergenic", "Screw-Lock"]'::jsonb, 'rimless', 'unisex', 25),
  ('co-010', 'Monsoon Sport Shield', 'sunglasses', 'Cawnpore', 2499, 3299, 4.6, 41, NULL::text, '["Black", "Neon Blue", "Red"]'::jsonb, '["Free Size"]'::jsonb, 'Wraparound sport sunglasses built for cycling, running, and outdoor adventure.', '["Wraparound Fit", "Polarized", "Sweat Resistant", "Interchangeable Lenses"]'::jsonb, 'sport', 'unisex', 35),
  ('co-011', 'Heritage Half-Rim', 'eyeglasses', 'Cawnpore', 1799, 2499, 4.5, 55, NULL::text, '["Black/Silver", "Brown/Gold"]'::jsonb, '["M", "L"]'::jsonb, 'Semi-rimless design combining classic form with modern materials. Ideal for daily wear.', '["Half-Rim", "Metal Temple", "Comfort Bridge", "Prescription Ready"]'::jsonb, 'halfrim', 'men', 40),
  ('co-012', 'Lens Cleaning Kit Pro', 'accessories', 'Cawnpore', 399, 599, 4.7, 210, 'Essential', '["Black"]'::jsonb, '["One Size"]'::jsonb, 'Complete care kit: microfiber cloth, spray cleaner, and hard case for your frames.', '["Spray Cleaner", "Microfiber Cloth", "Hard Case", "Travel Friendly"]'::jsonb, 'kit', 'unisex', 100)
) AS v(
  id, name, category, brand, price, original_price, rating, reviews,
  badge, colors, sizes, description, features, image, gender, stock
)
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);
