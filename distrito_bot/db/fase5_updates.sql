-- 1. Agregar mensajes a bot_settings
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS msg_order_accepted TEXT DEFAULT '✅ ¡Hola! Tu pedido ha sido confirmado y ya está en preparación. 🍔👨‍🍳';
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS msg_order_dispatched TEXT DEFAULT '🛵 ¡Tu pedido acaba de salir de nuestra cocina! Nuestro domiciliario va en camino.';

-- 2. Agregar número de orden diario a sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS daily_order_number INTEGER;
