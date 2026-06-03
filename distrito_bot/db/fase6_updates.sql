-- ============================================================
-- EJECUTAR EN: Supabase -> SQL Editor -> New Query
-- Fase 6: Agregar campos dinámicos para mensajes y credenciales
-- ============================================================

-- Nuevos mensajes del bot
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS msg_ask_name TEXT DEFAULT 'Para tomar tu pedido, ¿Me regalas tu nombre y apellido? 📝';
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS msg_ask_delivery TEXT DEFAULT '¡Perfecto! ¿Tu pedido es para *Domicilio* 🛵 o pasas a *Recoger* 🏃?';
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS msg_ask_address TEXT DEFAULT 'Por favor, indícame tu *dirección exacta* 📍 (calle, carrera, número, conjunto/apto)';
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS msg_ask_neighborhood TEXT DEFAULT '¿En qué *barrio* te encuentras? 🏘️';
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS msg_ask_payment TEXT DEFAULT '¿Cómo deseas pagar? 💳💵';
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS msg_order_registered TEXT DEFAULT '¡Excelente! Tu pedido ha sido registrado y está a la espera de confirmación por nuestro equipo. ⏳';

-- Cambiar el mensaje de aceptación por defecto según solicitó el cliente
UPDATE bot_settings 
SET msg_order_accepted = 'Tu pedido esta en fila! 🎉🍔\n\nPronto preparamos tu orden y te avisamos. ⏳\n\nGracias por elegir Distrito Burger! 🔥'
WHERE id = 1;

-- Variables de entorno editables
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS ycloud_api_key TEXT DEFAULT '';
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS whatsapp_phone_id TEXT DEFAULT '';
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS whatsapp_token TEXT DEFAULT '';
