-- ============================================================
-- BYBEGA · SCHEMA COMPLETO PARA SUPABASE
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- PROFILES (vinculado a auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Usuario',
  role TEXT NOT NULL DEFAULT 'vendedor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SETTINGS (clave-valor)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'tg',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ref TEXT DEFAULT '',
  cat_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  price DECIMAL(10,2) DEFAULT 0,
  material TEXT DEFAULT '',
  description TEXT DEFAULT '',
  emoji TEXT DEFAULT '💍',
  status TEXT DEFAULT 'disponible',
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  surname TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  country TEXT DEFAULT 'El Salvador',
  nit TEXT DEFAULT '',
  dob DATE,
  ring_size TEXT DEFAULT '',
  prefs TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  shipping_addr TEXT DEFAULT '',
  segment TEXT DEFAULT 'nuevo',
  notes TEXT DEFAULT '',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OPPORTUNITIES
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value DECIMAL(10,2) DEFAULT 0,
  stage TEXT DEFAULT 'nueva',
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  opp_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(10,2) DEFAULT 0,
  iva_rate INTEGER DEFAULT 0,
  iva_amt DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'borrador',
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  client_id UUID REFERENCES clients(id),
  number TEXT UNIQUE NOT NULL,
  subtotal DECIMAL(10,2) DEFAULT 0,
  iva_rate INTEGER DEFAULT 0,
  iva_amt DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  paid BOOLEAN DEFAULT FALSE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DELIVERIES
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  invoice_id UUID REFERENCES invoices(id),
  client_id UUID REFERENCES clients(id),
  date DATE DEFAULT CURRENT_DATE,
  address TEXT DEFAULT '',
  items TEXT DEFAULT '',
  status TEXT DEFAULT 'pendiente',
  received TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DATOS POR DEFECTO
-- ============================================================
INSERT INTO settings (key, value) VALUES
  ('company', 'bybega'),
  ('nit', '0000-000000-000-0'),
  ('address', 'San Salvador, El Salvador'),
  ('phone', '+503 0000-0000'),
  ('email', 'contacto@bybega.com'),
  ('instagram', '@bybega_shop'),
  ('slogan', 'Joyas que cuentan tu historia'),
  ('web3forms_key', ''),
  ('notif_email', 'contacto@bybega.com'),
  ('inv_counter', '1')
ON CONFLICT (key) DO NOTHING;

INSERT INTO categories (name, color, sort_order) VALUES
  ('Anillos', 'tg', 1),
  ('Collares', 'tg-b', 2),
  ('Pendientes', 'tg-purple', 3),
  ('Pulseras', 'tg-g', 4),
  ('Sets', 'tg-gray', 5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Perfil: cada usuario ve solo el suyo
CREATE POLICY "profiles_self" ON profiles FOR ALL USING (auth.uid() = id);

-- Categorías y productos: lectura pública (para la web), escritura autenticada
CREATE POLICY "cats_public_read" ON categories FOR SELECT USING (true);
CREATE POLICY "cats_auth_write" ON categories FOR INSERT USING (auth.role() = 'authenticated');
CREATE POLICY "cats_auth_update" ON categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "cats_auth_delete" ON categories FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "products_public_read" ON products FOR SELECT USING (true);
CREATE POLICY "products_auth_write" ON products FOR INSERT USING (auth.role() = 'authenticated');
CREATE POLICY "products_auth_update" ON products FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "products_auth_delete" ON products FOR DELETE USING (auth.role() = 'authenticated');

-- Settings: lectura pública (web usa contacto/slogan), escritura autenticada
CREATE POLICY "settings_public_read" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_auth_write" ON settings FOR INSERT USING (auth.role() = 'authenticated');
CREATE POLICY "settings_auth_update" ON settings FOR UPDATE USING (auth.role() = 'authenticated');

-- Clientes: autenticados + INSERT anónimo (para formulario web)
CREATE POLICY "clients_auth_all" ON clients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "clients_anon_insert" ON clients FOR INSERT WITH CHECK (true);

-- Oportunidades: autenticados + INSERT anónimo (para formulario web)
CREATE POLICY "opps_auth_all" ON opportunities FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "opps_anon_insert" ON opportunities FOR INSERT WITH CHECK (true);

-- Resto: solo autenticados
CREATE POLICY "orders_auth" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "invoices_auth" ON invoices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "deliveries_auth" ON deliveries FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- TRIGGER: crear perfil al registrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
