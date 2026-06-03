-- ============================================================
-- EJECUTAR EN: Supabase → SQL Editor → New Query
-- Creación de tablas para Catálogo e Inventario
-- ============================================================

-- 1. Tabla de Productos (Catálogo Dinámico)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    emoji TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar los combos actuales
INSERT INTO products (id, name, description, price, emoji) VALUES
('combo_personal', 'PERSONAL', '1 Burger + 1 Papa + Bebida', 12000, '✨'),
('combo_duo', 'DUO', '2 Burgers + 1 Papa + Gaseosa 1L', 20000, '✨'),
('combo_parche', 'PARCHE', '3 Burgers + 2 Papas + Gaseosa 1L', 30000, '✨'),
('combo_parche_xl', 'PARCHE XL', '4 Burgers + 3 Papas + Gaseosa 1L', 40000, '🏆')
ON CONFLICT (id) DO NOTHING;

-- 2. Tabla de Items de Inventario (Insumos)
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- ej: 'un' (unidades), 'gr' (gramos), 'ml' (mililitros)
    current_stock NUMERIC DEFAULT 0,
    cost_per_unit NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar algunos insumos básicos iniciales
INSERT INTO inventory_items (name, unit, current_stock, cost_per_unit) VALUES
('Pan de Hamburguesa', 'un', 100, 500),
('Carne Artesanal', 'un', 100, 2000),
('Queso', 'un', 100, 300),
('Porción de Papas', 'un', 50, 1000),
('Gaseosa Pequeña (Bebida)', 'un', 50, 1500),
('Gaseosa 1L', 'un', 50, 3000)
ON CONFLICT DO NOTHING;

-- 3. Tabla de Recetas (Qué insumos gasta cada combo)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity_required NUMERIC NOT NULL
);

-- Insertar recetas para el COMBO PERSONAL (ID: combo_personal)
-- Asumiendo IDs secuenciales de la inserción anterior: 1=Pan, 2=Carne, 3=Queso, 4=Papas, 5=Gaseosa Pequeña, 6=Gaseosa 1L
-- Personal: 1 pan, 1 carne, 1 queso, 1 papas, 1 gaseosa pequeña
INSERT INTO recipe_ingredients (product_id, inventory_item_id, quantity_required) VALUES
('combo_personal', 1, 1),
('combo_personal', 2, 1),
('combo_personal', 3, 1),
('combo_personal', 4, 1),
('combo_personal', 5, 1);

-- Duo: 2 panes, 2 carnes, 2 quesos, 1 papas, 1 gaseosa 1L
INSERT INTO recipe_ingredients (product_id, inventory_item_id, quantity_required) VALUES
('combo_duo', 1, 2),
('combo_duo', 2, 2),
('combo_duo', 3, 2),
('combo_duo', 4, 1),
('combo_duo', 6, 1);

-- Parche: 3 panes, 3 carnes, 3 quesos, 2 papas, 1 gaseosa 1L
INSERT INTO recipe_ingredients (product_id, inventory_item_id, quantity_required) VALUES
('combo_parche', 1, 3),
('combo_parche', 2, 3),
('combo_parche', 3, 3),
('combo_parche', 4, 2),
('combo_parche', 6, 1);

-- Parche XL: 4 panes, 4 carnes, 4 quesos, 3 papas, 1 gaseosa 1L
INSERT INTO recipe_ingredients (product_id, inventory_item_id, quantity_required) VALUES
('combo_parche_xl', 1, 4),
('combo_parche_xl', 2, 4),
('combo_parche_xl', 3, 4),
('combo_parche_xl', 4, 3),
('combo_parche_xl', 6, 1);

-- 4. Tabla de Transacciones de Inventario (Kardex)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity_change NUMERIC NOT NULL, -- Positivo = compra/ingreso, Negativo = venta/salida
    reason TEXT, -- 'venta', 'compra', 'ajuste'
    reference_id TEXT, -- Teléfono del cliente si es venta, o ID de factura si es compra
    created_at TIMESTAMPTZ DEFAULT NOW()
);
