-- ============================================================
-- EJECUTAR EN: Supabase → SQL Editor → New Query
-- Creación de tabla para configuración dinámica del bot
-- ============================================================

CREATE TABLE IF NOT EXISTS bot_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_open BOOLEAN DEFAULT TRUE,
    business_open_hour INTEGER DEFAULT 6,
    business_open_minute INTEGER DEFAULT 0,
    business_close_hour INTEGER DEFAULT 22,
    business_close_minute INTEGER DEFAULT 0,
    business_days TEXT DEFAULT '0,1,2,3,4,5,6',
    kitchen_phone TEXT DEFAULT '+573235989590',
    pickup_address TEXT DEFAULT 'Calle 7c #21-18 La Esperanza, Valledupar',
    welcome_message TEXT DEFAULT '¡Hola! 👋 Bienvenido a *Distrito Burger* 🍔🔥\n\nEstamos abiertos y listos para atenderte.\n¿Qué se te antoja hoy?',
    off_hours_message TEXT DEFAULT '¡Hola! 👋 Gracias por escribirnos a *Distrito Burger* 🍔\n\nEn este momento estamos fuera de horario.\n\n📅 *Horario de atención:*\nLunes a Domingo\n⏰ 6:00 AM – 10:00 PM\n\n¡Pronto abrimos! Te esperamos. 🔥\n\n_Mensaje automático._',
    backup_reply_message TEXT DEFAULT '¡Hola! 👋 Estamos en cocina preparando pedidos y tardaremos unos minutitos en responderte. 🍳\n\n¡Ya te atendemos! ✅',
    payment_transfer_text TEXT DEFAULT '*NUESTROS MEDIOS DE PAGO* ⬇️\n\n✅ *Llave Bre-B:* @BOJ841\n   A nombre: Camilo Andrés Rincones\n\n✅ *Nequi:* 3206375509\n   A nombre: Luzdanis Lara Severiche',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Restringir a 1 sola fila
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insertar valores iniciales si no existen
INSERT INTO bot_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
