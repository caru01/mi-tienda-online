-- Agregar configuración para el botón de Menú en el mensaje de bienvenida
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS menu_button_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS menu_button_content TEXT;

UPDATE bot_settings 
SET menu_button_content = '🍔 *NUESTRO MENÚ* 🍔\n\nAquí puedes ver todo nuestro menú detallado:\n[Inserta tu link al menú o texto aquí]'
WHERE menu_button_content IS NULL AND id = 1;
