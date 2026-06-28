-- ═══════════════════════════════════════════════════════════
-- BB ENTERPRISE — SUPABASE DATABASE SETUP
-- ═══════════════════════════════════════════════════════════
-- Copy this entire file and paste into Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → paste → Run)
-- ═══════════════════════════════════════════════════════════

-- ── PRODUCTS TABLE ──
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  gender TEXT NOT NULL,
  size TEXT,
  sizes TEXT[] DEFAULT ARRAY[]::TEXT[],
  fit TEXT NOT NULL,
  mrp INTEGER NOT NULL,
  price INTEGER NOT NULL,
  tag TEXT NOT NULL,
  image TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORDERS TABLE ──
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  customer TEXT NOT NULL,
  product TEXT NOT NULL,
  gender TEXT,
  qty INTEGER DEFAULT 1,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'Pending',
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SETTINGS TABLE (hero image, etc) ──
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES ('hero_image', '');

-- ── STORAGE BUCKET for product images ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- SECURITY POLICIES (Row Level Security)
-- ═══════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ── PRODUCTS: anyone can read; only authenticated admins can write ──
CREATE POLICY "Public read products"  ON products FOR SELECT USING (true);
CREATE POLICY "Admin write products"  ON products FOR ALL    USING (auth.role() = 'authenticated');

-- ── ORDERS: anyone can read for live status sync, only admin can write ──
CREATE POLICY "Public read orders"    ON orders   FOR SELECT USING (true);
CREATE POLICY "Public insert orders"  ON orders   FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update orders"   ON orders   FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin delete orders"   ON orders   FOR DELETE USING (auth.role() = 'authenticated');

-- ── SETTINGS: read public, write admin ──
CREATE POLICY "Public read settings"  ON settings FOR SELECT USING (true);
CREATE POLICY "Admin write settings"  ON settings FOR ALL    USING (auth.role() = 'authenticated');

-- ── STORAGE: public can read product images, admins can upload ──
CREATE POLICY "Public read images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Admin delete images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════
-- REALTIME — enables live sync between admin and storefront
-- ═══════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- ═══════════════════════════════════════════════════════════
-- SEED DATA — initial sample products
-- ═══════════════════════════════════════════════════════════

INSERT INTO products (name, type, gender, size, fit, mrp, price, tag, image, images, stock) VALUES
('Oversized Acid Wash Tee', 'T-Shirts', 'MEN', 'L', 'Oversized', 2499, 599, 'HOT DROP', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', '["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80","https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&q=80","https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80"]'::jsonb, 25),
('Drop Shoulder Hoodie', 'Hoodies', 'MEN', 'XL', 'Boxy', 3499, 799, 'NEW DROP', 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800&q=80', '["https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800&q=80","https://images.unsplash.com/photo-1509942774463-acf339cf87d5?w=800&q=80"]'::jsonb, 18),
('Cargo Trousers', 'Trousers', 'MEN', 'M', 'Standard Fit', 2999, 699, 'LIMITED', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80', '["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80","https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80"]'::jsonb, 15),
('Linen Oversized Shirt', 'Shirts', 'MEN', 'L', 'Oversized', 1999, 499, 'HOT DROP', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', '["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80","https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80"]'::jsonb, 22),
('Puff Sleeve Crop Top', 'Tops', 'WOMEN', 'S', 'True to Size', 1799, 449, 'NEW DROP', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80', '["https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80","https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=800&q=80"]'::jsonb, 30),
('Ribbed Oversized Tee', 'Oversized Tees', 'WOMEN', 'M', 'Oversized', 1999, 499, 'HOT DROP', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', '["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80","https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&q=80"]'::jsonb, 28),
('Fleece Zip Hoodie', 'Hoodies', 'WOMEN', 'L', 'Boxy', 2999, 699, 'LIMITED', 'https://images.unsplash.com/photo-1551163943-3f7253a97842?w=800&q=80', '["https://images.unsplash.com/photo-1551163943-3f7253a97842?w=800&q=80"]'::jsonb, 12),
('Kids Winter Puffer', 'Winterwear', 'KIDS', 'S', 'Standard Fit', 2999, 699, 'HOT DROP', 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80', '["https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80"]'::jsonb, 20),
('Boys Graphic Tee', 'Basics', 'KIDS', 'S', 'True to Size', 999, 249, 'NEW DROP', 'https://images.unsplash.com/photo-1567113463300-102a7eb3cb26?w=800&q=80', '["https://images.unsplash.com/photo-1567113463300-102a7eb3cb26?w=800&q=80"]'::jsonb, 35),
('Unisex Logo Hoodie', 'Hoodies', 'UNISEX', 'XL', 'Oversized', 3299, 749, 'LIMITED', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80","https://images.unsplash.com/photo-1572495532056-8583af1cbae0?w=800&q=80"]'::jsonb, 16);

-- Sample orders
INSERT INTO orders (customer, product, gender, qty, amount, status) VALUES
('Arjun Sharma', 'Oversized Acid Wash Tee', 'MEN', 2, 1198, 'Delivered'),
('Priya Mehta', 'Puff Sleeve Crop Top', 'WOMEN', 1, 449, 'Shipped'),
('Rohan Singh', 'Drop Shoulder Hoodie', 'MEN', 1, 799, 'Packed'),
('Sneha Rao', 'Kids Winter Puffer', 'KIDS', 3, 2097, 'Pending');

-- ═══════════════════════════════════════════════════════════
-- DONE! Now create an admin user:
-- Dashboard → Authentication → Users → Add user → "Create new user"
-- Use your email + a strong password
-- ═══════════════════════════════════════════════════════════
