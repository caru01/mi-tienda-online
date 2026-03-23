-- ============================================================
--  GALU SHOP — PARCHE MAESTRO FINAL
--  Corrige TODOS los descuadres entre frontend y base de datos
--  Ejecutar completo en Supabase → SQL Editor
-- ============================================================

-- ══════════════════════════════════════════════════
-- 1. COLUMNAS FALTANTES
-- ══════════════════════════════════════════════════

-- productos: falta es_ropa
ALTER TABLE productos ADD COLUMN IF NOT EXISTS es_ropa boolean DEFAULT true;

-- admin_usuarios: falta ultimo_acceso
ALTER TABLE admin_usuarios ADD COLUMN IF NOT EXISTS ultimo_acceso timestamptz;

-- banners: TabBanners usa 'enlace' e 'imagen_movil', pero la tabla tiene 'link' y no tiene imagen_movil
ALTER TABLE banners ADD COLUMN IF NOT EXISTS imagen_movil text;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS enlace      text;
-- Migrar datos de 'link' a 'enlace' si hay datos
UPDATE banners SET enlace = link WHERE enlace IS NULL AND link IS NOT NULL;

-- puntos_cliente: TabClubGalu inserta 'saldo_anterior', falta en tabla
ALTER TABLE puntos_cliente ADD COLUMN IF NOT EXISTS saldo_anterior numeric(14,2) DEFAULT 0;

-- v_clientes_ltv: TabClientes usa 'segmento', 'puntos_disponibles', 'referidos_exitosos', 'departamento'
-- v_club_galu_clientes: TabClubGalu usa 'nivel', 'puntos_disponibles', 'referidos_exitosos'
-- Necesitamos recrear las vistas con esas columnas extras

-- ══════════════════════════════════════════════════
-- 2. ARREGLAR CONSTRAINT ROL admin_usuarios
-- ══════════════════════════════════════════════════
ALTER TABLE admin_usuarios DROP CONSTRAINT IF EXISTS admin_usuarios_rol_check;
ALTER TABLE admin_usuarios ADD CONSTRAINT admin_usuarios_rol_check
  CHECK (rol IN ('superadmin','admin','editor','viewer'));

-- ══════════════════════════════════════════════════
-- 3. RECREAR VISTAS CON TODAS LAS COLUMNAS
-- ══════════════════════════════════════════════════
DROP VIEW IF EXISTS v_club_galu_clientes;
DROP VIEW IF EXISTS v_clientes_ltv;

CREATE OR REPLACE VIEW v_clientes_ltv AS
SELECT
  c.id,
  c.email,
  c.nombre,
  c.telefono,
  c.ciudad,
  c.departamento,
  c.direccion,
  c.total_gastado,
  c.total_pedidos,
  c.created_at,
  -- Nivel Club GALU
  CASE
    WHEN c.total_gastado >= (SELECT valor::numeric FROM club_galu_config WHERE clave = 'umbral_oro'   LIMIT 1) THEN 'oro'
    WHEN c.total_gastado >= (SELECT valor::numeric FROM club_galu_config WHERE clave = 'umbral_plata' LIMIT 1) THEN 'plata'
    ELSE 'bronce'
  END AS nivel_club,
  -- Puntos disponibles (ganados - canjeados/expirados)
  COALESCE((
    SELECT SUM(CASE WHEN p.tipo = 'ganado' THEN p.puntos ELSE -ABS(p.puntos) END)
    FROM puntos_cliente p WHERE p.cliente_email = c.email
  ), 0) AS saldo_puntos,
  COALESCE((
    SELECT SUM(CASE WHEN p.tipo = 'ganado' THEN p.puntos ELSE -ABS(p.puntos) END)
    FROM puntos_cliente p WHERE p.cliente_email = c.email
  ), 0) AS puntos_disponibles,
  -- Referidos exitosos
  COALESCE((
    SELECT COUNT(*) FROM referidos r
    WHERE r.referente_email = c.email AND r.estado = 'completado'
  ), 0) AS referidos_exitosos,
  -- Segmento para TabClientes
  CASE
    WHEN c.total_pedidos >= 5 AND c.total_gastado >= 300000 THEN 'VIP'
    WHEN c.total_pedidos >= 3 THEN 'Frecuente'
    WHEN c.total_pedidos >= 2 THEN 'Recurrente'
    ELSE 'Nuevo'
  END AS segmento,
  -- nivel (alias de nivel_club para TabClubGalu)
  CASE
    WHEN c.total_gastado >= (SELECT valor::numeric FROM club_galu_config WHERE clave = 'umbral_oro'   LIMIT 1) THEN 'oro'
    WHEN c.total_gastado >= (SELECT valor::numeric FROM club_galu_config WHERE clave = 'umbral_plata' LIMIT 1) THEN 'plata'
    ELSE 'bronce'
  END AS nivel
FROM clientes c;

-- Vista Club GALU (ordenada por gasto)
CREATE OR REPLACE VIEW v_club_galu_clientes AS
SELECT * FROM v_clientes_ltv ORDER BY total_gastado DESC;

-- ══════════════════════════════════════════════════
-- 4. CONFIGURACIÓN: agregar claves que usa TabConfiguracion
-- ══════════════════════════════════════════════════
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('moneda',                    'COP',    'Moneda de la tienda'),
  ('envio_costo_local',         '0',      'Costo envío local (Valledupar)'),
  ('envio_ciudad_local',        'Valledupar', 'Ciudad de envío gratis'),
  ('stock_alerta_minimo',       '3',      'Alerta cuando stock baje de este número'),
  ('checkout_activo',           'true',   'Si el checkout está habilitado'),
  ('mensaje_checkout_cerrado',  'Tienda temporalmente cerrada', 'Mensaje cuando checkout está cerrado'),
  ('pedido_horas_cancelacion',  '2',      'Horas máximas para cancelar un pedido')
ON CONFLICT (clave) DO NOTHING;

-- ══════════════════════════════════════════════════
-- 5. PERMISOS COMPLETOS
-- ══════════════════════════════════════════════════
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT SELECT ON v_clientes_ltv       TO authenticated;
GRANT SELECT ON v_club_galu_clientes TO authenticated;

-- ══════════════════════════════════════════════════
-- 6. VINCULAR ADMIN CON auth.users
-- ══════════════════════════════════════════════════
INSERT INTO admin_usuarios (auth_id, email, nombre, rol, activo)
SELECT u.id, 'camilo01198@gmail.com', 'Camilo Rincones', 'superadmin', true
FROM auth.users u WHERE u.email = 'camilo01198@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  auth_id = EXCLUDED.auth_id,
  rol     = 'superadmin',
  activo  = true;

-- ══════════════════════════════════════════════════
-- 7. VERIFICACIÓN
-- ══════════════════════════════════════════════════
SELECT 'productos'       AS tabla, column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='productos' AND column_name IN ('es_ropa','stock','activo','destacado','precio_oferta')
UNION ALL
SELECT 'banners'         AS tabla, column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='banners' AND column_name IN ('imagen_url','imagen_movil','enlace','link','activo','orden')
UNION ALL
SELECT 'puntos_cliente'  AS tabla, column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='puntos_cliente' AND column_name IN ('saldo_anterior','saldo_nuevo','puntos','tipo')
UNION ALL
SELECT 'admin_usuarios'  AS tabla, column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_usuarios' AND column_name IN ('auth_id','rol','ultimo_acceso','activo')
ORDER BY tabla, column_name;
