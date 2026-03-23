-- ============================================================
--  GALU SHOP — PARCHE DEFINITIVO DE COLUMNAS Y PERMISOS
--  Ejecutar completo en Supabase → SQL Editor
-- ============================================================

-- ─── 1. COLUMNAS FALTANTES EN PRODUCTOS ───────────────────
ALTER TABLE productos ADD COLUMN IF NOT EXISTS es_ropa    boolean DEFAULT true;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_oferta numeric(12,2);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();

-- ─── 2. COLUMNAS FALTANTES EN CATEGORIAS ──────────────────
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS activa      boolean DEFAULT true;
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS orden       int DEFAULT 0;

-- ─── 3. COLUMNAS FALTANTES EN ADMIN_USUARIOS ──────────────
ALTER TABLE admin_usuarios ADD COLUMN IF NOT EXISTS ultimo_acceso timestamptz;

-- ─── 4. COLUMNAS FALTANTES EN PEDIDOS ─────────────────────
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS descuento_referido numeric(14,2) DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS codigo_referido     text;

-- ─── 5. ARREGLAR CONSTRAINT DE ROL EN ADMIN_USUARIOS ──────
ALTER TABLE admin_usuarios DROP CONSTRAINT IF EXISTS admin_usuarios_rol_check;
ALTER TABLE admin_usuarios ADD CONSTRAINT admin_usuarios_rol_check
  CHECK (rol IN ('superadmin','admin','editor','viewer'));

-- ─── 6. ACTUALIZAR O INSERTAR EL USUARIO ADMIN ─────────────
-- Busca el UUID real en auth.users y lo vincula
INSERT INTO admin_usuarios (auth_id, email, nombre, rol, activo)
SELECT 
  u.id,
  'camilo01198@gmail.com',
  'Camilo Rincones',
  'superadmin',
  true
FROM auth.users u
WHERE u.email = 'camilo01198@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  auth_id = EXCLUDED.auth_id,
  rol     = 'superadmin',
  activo  = true;

-- ─── 7. PERMISOS ────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Vistas
GRANT SELECT ON v_clientes_ltv       TO authenticated;
GRANT SELECT ON v_club_galu_clientes TO authenticated;

-- ─── 8. VERIFICACIÓN FINAL ────────────────────────────────
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('productos','categorias','pedidos','admin_usuarios')
ORDER BY table_name, ordinal_position;

-- Verificar que el admin quedó vinculado
SELECT au.email, au.rol, au.activo, au.auth_id,
       u.email as auth_email
FROM admin_usuarios au
LEFT JOIN auth.users u ON u.id = au.auth_id
WHERE au.email = 'camilo01198@gmail.com';
