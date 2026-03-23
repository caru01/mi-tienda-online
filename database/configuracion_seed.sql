-- ═══════════════════════════════════════════════════════════════
-- GALU SHOP — Datos iniciales para la tabla configuracion
-- Ejecutar DESPUÉS de schema_v2.sql
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.configuracion (clave, valor, tipo, descripcion) VALUES

-- Información de la tienda
('tienda_nombre',              'GALU SHOP',                    'texto',    'Nombre público de la tienda'),
('tienda_whatsapp',            '573001234567',                 'texto',    'Número WhatsApp sin + (ej: 573001234567)'),
('tienda_email',               'hola@galushop.com',            'texto',    'Email de contacto de la tienda'),
('moneda',                     'COP',                          'texto',    'Moneda (COP, USD, EUR…)'),

-- Envíos
('envio_costo_local',          '8000',                         'numero',   'Costo envío en Valledupar (COP)'),
('envio_ciudad_local',         'Valledupar',                   'texto',    'Ciudad del envío local (costo especial)'),

-- Inventario
('stock_alerta_minimo',        '5',                            'numero',   'Unidades para disparar alerta de stock bajo'),

-- Checkout
('checkout_activo',            'true',                         'booleano', 'Si está en false, la tienda NO acepta nuevos pedidos'),
('mensaje_checkout_cerrado',   'Estamos tomando pedidos por WhatsApp. Escríbenos.',  'texto', 'Mensaje que ven los clientes cuando el checkout está cerrado'),
('pedido_horas_cancelacion',   '24',                           'numero',   'Horas máximas para cancelar un pedido'),

-- Redes sociales
('redes_instagram',            '',                             'texto',    'URL de Instagram (ej: https://instagram.com/galushop)'),
('redes_facebook',             '',                             'texto',    'URL de Facebook'),
('redes_tiktok',               '',                             'texto',    'URL de TikTok')

ON CONFLICT (clave) DO NOTHING;
