-- ============================================================
-- ESQUEMA DE BASE DE DATOS - DISTRITO BURGER BOT
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Habilitar la extensión UUID para generar IDs únicos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- TABLA 1: messages
-- Historial completo de todos los chats (entrantes y salientes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_phone      TEXT NOT NULL,
    direction           TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    body                TEXT,
    ycloud_message_id   TEXT UNIQUE,          -- Evita duplicados (idempotencia)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas rápidas por teléfono y fecha
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(customer_phone);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ------------------------------------------------------------
-- TABLA 2: sales
-- Registro de ventas detectadas automáticamente por el parser
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_phone      TEXT NOT NULL,
    order_detail        TEXT,                 -- Detalle completo del pedido
    total_amount        NUMERIC(10, 2),       -- Valor extraído de "TOTAL:"
    raw_message         TEXT,                 -- Mensaje original completo
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_phone ON sales(customer_phone);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);

-- ------------------------------------------------------------
-- TABLA 3: pending_replies
-- Cola para el asistente de respaldo por saturación
-- Registra mensajes entrantes que aún no han sido respondidos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_replies (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_phone      TEXT NOT NULL UNIQUE, -- Un registro activo por cliente
    last_message_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    auto_replied        BOOLEAN NOT NULL DEFAULT FALSE,
    resolved            BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_resolved ON pending_replies(resolved, auto_replied);

-- ------------------------------------------------------------
-- TABLA 4: auto_reply_log
-- Control anti-spam: evita enviar múltiples mensajes automáticos
-- al mismo cliente en un período corto
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auto_reply_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_phone      TEXT NOT NULL,
    reply_type          TEXT NOT NULL,        -- 'off_hours' o 'backup'
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_reply_log_phone ON auto_reply_log(customer_phone, sent_at DESC);

-- ============================================================
-- VISTAS ÚTILES PARA EL NEGOCIO
-- ============================================================

-- Vista: Ventas de hoy con resumen
CREATE OR REPLACE VIEW ventas_hoy AS
SELECT
    TO_CHAR(created_at AT TIME ZONE 'America/Bogota', 'HH12:MI AM') AS hora,
    customer_phone AS cliente,
    total_amount AS total,
    order_detail AS detalle
FROM sales
WHERE DATE(created_at AT TIME ZONE 'America/Bogota') = CURRENT_DATE
ORDER BY created_at DESC;

-- Vista: Resumen diario de ventas
CREATE OR REPLACE VIEW resumen_ventas_diario AS
SELECT
    DATE(created_at AT TIME ZONE 'America/Bogota') AS fecha,
    COUNT(*) AS num_pedidos,
    SUM(total_amount) AS total_ingresos,
    AVG(total_amount) AS ticket_promedio
FROM sales
GROUP BY DATE(created_at AT TIME ZONE 'America/Bogota')
ORDER BY fecha DESC;

-- ============================================================
-- MENSAJE INICIAL (comentado - descomentar si se quiere)
-- ============================================================
-- INSERT INTO messages (customer_phone, direction, body)
-- VALUES ('sistema', 'outbound', 'Base de datos inicializada correctamente ✅');
