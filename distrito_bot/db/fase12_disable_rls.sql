-- ==============================================================================
-- FASE 12: DESACTIVACIÓN DE SEGURIDAD (RLS) PARA EL INVENTARIO
-- Ejecuta este script en Supabase SQL Editor para quitar cualquier bloqueo
-- ==============================================================================

-- 1. Desactivar RLS en Insumos
ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_items_policy" ON public.inventory_items;

-- 2. Desactivar RLS en Recetas
ALTER TABLE public.recipe_ingredients DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recipe_ingredients_policy" ON public.recipe_ingredients;

-- 3. Desactivar RLS en Compras
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchases_policy" ON public.purchases;

-- 4. Desactivar RLS en Transacciones
ALTER TABLE public.inventory_transactions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_transactions_policy" ON public.inventory_transactions;
