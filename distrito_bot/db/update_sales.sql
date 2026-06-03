-- ============================================================
-- EJECUTAR EN: Supabase → SQL Editor → New Query
-- Actualiza la tabla sales y conversation_sessions
-- ============================================================

-- Agregar columnas a sales
ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS combo_quantity  INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS customer_name   TEXT,
    ADD COLUMN IF NOT EXISTS payment_method  TEXT,
    ADD COLUMN IF NOT EXISTS delivery_type   TEXT,
    ADD COLUMN IF NOT EXISTS delivery_barrio TEXT;

-- Agregar columna para el timeout a conversation_sessions
ALTER TABLE conversation_sessions
    ADD COLUMN IF NOT EXISTS en_camino_at TIMESTAMPTZ;
