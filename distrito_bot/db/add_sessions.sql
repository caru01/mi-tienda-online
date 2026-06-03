-- ============================================================
-- EJECUTAR EN: Supabase → SQL Editor → New Query
-- Agrega la tabla de sesiones de conversación
-- ============================================================

CREATE TABLE IF NOT EXISTS conversation_sessions (
    customer_phone  TEXT PRIMARY KEY,
    state           TEXT NOT NULL DEFAULT 'idle',
    selected_combo_id   TEXT,
    selected_combo_name TEXT,
    combo_price     INTEGER,
    combo_quantity  INTEGER,
    observations    TEXT,
    delivery_type   TEXT,       -- 'domicilio' o 'recoger'
    delivery_address TEXT,
    payment_method  TEXT,       -- 'efectivo' o 'transferencia'
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
