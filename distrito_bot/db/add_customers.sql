-- ============================================================
-- EJECUTAR EN: Supabase → SQL Editor → New Query
-- ============================================================

-- 1. Agregar columnas nuevas a conversation_sessions
ALTER TABLE conversation_sessions
    ADD COLUMN IF NOT EXISTS customer_name    TEXT,
    ADD COLUMN IF NOT EXISTS delivery_barrio  TEXT,
    ADD COLUMN IF NOT EXISTS order_items_text TEXT,
    ADD COLUMN IF NOT EXISTS order_total      INTEGER DEFAULT 0;

-- 2. Tabla de clientes registrados
CREATE TABLE IF NOT EXISTS customers (
    customer_phone   TEXT PRIMARY KEY,
    customer_name    TEXT,
    delivery_address TEXT,
    delivery_barrio  TEXT,
    whatsapp_label   TEXT,
    first_order_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_order_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_orders     INTEGER NOT NULL DEFAULT 1
);
