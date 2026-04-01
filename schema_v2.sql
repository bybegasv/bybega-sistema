-- ============================================================
-- BYBEGA · ACTUALIZACIÓN DE SCHEMA v2
-- Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1. Nuevas columnas en products
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS store TEXT DEFAULT 'ambas';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_total INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_t1 INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_t2 INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_alert INTEGER DEFAULT 3;

-- 2. Tabla de compras / entradas de inventario
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  supplier TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  total DECIMAL(10,2) DEFAULT 0,
  store TEXT DEFAULT 'ambas',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT DEFAULT '',
  qty INTEGER DEFAULT 1,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  store TEXT DEFAULT 'ambas',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS para nuevas tablas
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchases_all" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "purchase_items_all" ON purchase_items FOR ALL USING (true) WITH CHECK (true);

-- 4. Configuración de tiendas en settings
INSERT INTO settings (key, value) VALUES
  ('store1_name', 'Tienda 1'),
  ('store2_name', 'Tienda 2'),
  ('paypal_email', ''),
  ('stripe_link', '')
ON CONFLICT (key) DO NOTHING;

-- 5. Función para descontar stock al crear pedido
CREATE OR REPLACE FUNCTION decrease_stock_on_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item JSONB;
  prod_id UUID;
  qty INT;
  store_val TEXT;
BEGIN
  IF NEW.status = 'confirmado' AND (OLD.status IS NULL OR OLD.status != 'confirmado') THEN
    store_val := COALESCE(NEW.store, 'ambas');
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      prod_id := (item->>'product_id')::UUID;
      qty := (item->>'qty')::INT;
      IF prod_id IS NOT NULL AND qty > 0 THEN
        UPDATE products SET
          stock_total = GREATEST(0, stock_total - qty),
          stock_t1 = CASE WHEN store_val = 'tienda1' OR store_val = 'ambas' THEN GREATEST(0, stock_t1 - qty) ELSE stock_t1 END,
          stock_t2 = CASE WHEN store_val = 'tienda2' OR store_val = 'ambas' THEN GREATEST(0, stock_t2 - qty) ELSE stock_t2 END
        WHERE id = prod_id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_confirmed ON orders;
CREATE TRIGGER on_order_confirmed
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION decrease_stock_on_order();

-- 6. Función para aumentar stock al registrar compra
CREATE OR REPLACE FUNCTION increase_stock_on_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE products SET
      stock_total = stock_total + NEW.qty,
      stock_t1 = CASE WHEN NEW.store = 'tienda1' OR NEW.store = 'ambas' THEN stock_t1 + NEW.qty ELSE stock_t1 END,
      stock_t2 = CASE WHEN NEW.store = 'tienda2' OR NEW.store = 'ambas' THEN stock_t2 + NEW.qty ELSE stock_t2 END
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_purchase_item_added ON purchase_items;
CREATE TRIGGER on_purchase_item_added
  AFTER INSERT ON purchase_items
  FOR EACH ROW EXECUTE FUNCTION increase_stock_on_purchase();

-- 7. Verificación
SELECT 'products columns' as check, column_name
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('images','original_price','store','stock_total','stock_t1','stock_t2')
ORDER BY column_name;
