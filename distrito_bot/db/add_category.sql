-- ============================================================
-- EJECUTAR EN: Supabase → SQL Editor → New Query
-- Agrega columna de categoría a productos y un par de ejemplos
-- ============================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Combos';

-- Para que el inventario se pueda modificar sin resetear todo,
-- actualizamos los productos existentes a 'Combos'.
UPDATE products SET category = 'Combos' WHERE category IS NULL;
