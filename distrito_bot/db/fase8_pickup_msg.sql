-- db/fase8_pickup_msg.sql

-- Agregar la columna para el mensaje de "Listo para recoger" a la tabla bot_settings
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS msg_ready_pickup TEXT;

-- Actualizar el valor por defecto si está nulo
UPDATE bot_settings 
SET msg_ready_pickup = '🛍️ ¡Tu pedido ya está listo! Puedes pasar a recogerlo por nuestro local.'
WHERE msg_ready_pickup IS NULL AND id = 1;
