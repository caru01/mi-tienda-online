-- fase10_crm.sql
-- Ejecutar en el SQL Editor de Supabase

-- La tabla customers ya existe, pero vamos a asegurarnos de agregar la columna `notes` si no existe
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Tabla para el historial de mensajes masivos (Broadcasts)
CREATE TABLE IF NOT EXISTS crm_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    campaign_name TEXT NOT NULL,
    message_body TEXT NOT NULL,
    target_segment TEXT NOT NULL, -- ej: 'all', 'vip', 'dormant'
    sent_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed'
);
